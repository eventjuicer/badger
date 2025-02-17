import Foundation
import IOKit.hid
import IOKit
import Cocoa

// MARK: - URL Detection

struct URLDetector {
    static let urlRegex: NSRegularExpression = {
        let pattern = #"https?://[^\s/$.?#].[^\s]*"#
        return try! NSRegularExpression(pattern: pattern, options: [.caseInsensitive])
    }()
    
    static func extractURLs(from text: String) -> [String] {
        let range = NSRange(location: 0, length: text.utf16.count)
        let matches = urlRegex.matches(in: text, options: [], range: range)
        return matches.map {
            (text as NSString).substring(with: $0.range)
        }
    }
}

// MARK: - Local TCP Socket Sender

class LocalSocketSender: NSObject, StreamDelegate {
    let host: String
    let port: Int
    var inputStream: InputStream?
    var outputStream: OutputStream?
    
    override init() {
        self.host = "localhost"
        let arguments = CommandLine.arguments
        self.port = arguments.count > 1 ? Int(arguments[1]) ?? 12345 : 12345  
        super.init()
        setupStreams()
    }
    
    private func setupStreams() {
        var readStream: Unmanaged<CFReadStream>?
        var writeStream: Unmanaged<CFWriteStream>?
        
        // Create TCP connection to the specified host and port
        CFStreamCreatePairWithSocketToHost(nil, host as CFString, UInt32(port), &readStream, &writeStream)
        
        guard let inputCFStream = readStream?.takeRetainedValue(),
              let outputCFStream = writeStream?.takeRetainedValue() else {
            print("Failed to create streams")
            return
        }
        
        // Bridge CFReadStream and CFWriteStream to InputStream and OutputStream
        inputStream = inputCFStream as InputStream
        outputStream = outputCFStream as OutputStream
        
        guard let inputStream = inputStream, let outputStream = outputStream else {
            print("Failed to bridge streams")
            return
        }
        
        // Set delegate and schedule streams in the run loop
        inputStream.delegate = self
        outputStream.delegate = self
        
        inputStream.schedule(in: .current, forMode: .default)
        outputStream.schedule(in: .current, forMode: .default)
        
        // Open the streams
        inputStream.open()
        outputStream.open()
    }
    
    func send(url: String) {
        guard let outputStream = outputStream else {
            print("Output stream is not available")
            return
        }
        
        // Prepare the data to send
        let message = url + "\n"
        guard let data = message.data(using: .utf8) else {
            print("Failed to encode URL to data")
            return
        }
        
        // Write data to the output stream
        data.withUnsafeBytes { (buffer: UnsafeRawBufferPointer) in
            if let baseAddress = buffer.baseAddress?.assumingMemoryBound(to: UInt8.self) {
                let bytesWritten = outputStream.write(baseAddress, maxLength: data.count)
                if bytesWritten < 0 {
                    if let error = outputStream.streamError {
                        print("Error writing to stream: \(error.localizedDescription)")
                    }
                }
            }
        }
    }
    
    // MARK: - StreamDelegate
    
    func stream(_ aStream: Stream, handle eventCode: Stream.Event) {
        switch eventCode {
        case .openCompleted:
            print("Stream opened: \(aStream === inputStream ? "Input" : "Output")")
        case .hasBytesAvailable:
            if aStream === inputStream {
                readAvailableBytes(stream: inputStream!)
            }
        case .errorOccurred:
            if let error = aStream.streamError {
                print("Stream error: \(error.localizedDescription)")
            }
        case .endEncountered:
            print("Stream ended")
            aStream.close()
            aStream.remove(from: .current, forMode: .default)
        default:
            break
        }
    }
    
    private func readAvailableBytes(stream: InputStream) {
        let bufferSize = 1024
        var buffer = Array<UInt8>(repeating: 0, count: bufferSize)
        
        while stream.hasBytesAvailable {
            let numberOfBytesRead = stream.read(&buffer, maxLength: bufferSize)
            
            if numberOfBytesRead < 0, let error = stream.streamError {
                print("Stream read error: \(error.localizedDescription)")
                break
            }
            
            if numberOfBytesRead > 0 {
                let data = Data(buffer[0..<numberOfBytesRead])
                if let output = String(data: data, encoding: .utf8) {
                    print("Received from server: \(output)")
                }
            }
        }
    }
}

// MARK: - Keyboard Monitor

class KeyboardMonitor {
    private var manager: IOHIDManager?
    private let sender: LocalSocketSender
    private var inputBuffer: String = ""
    
    init(sender: LocalSocketSender) {
        self.sender = sender
        setupHIDManager()
    }
    
    private func setupHIDManager() {
        manager = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
        
        // Safely unwrap the optional 'manager'
        guard let manager = manager else {
            print("Failed to create HID Manager")
            return
        }
        
        // Define the matching dictionary for keyboards
        let matchingDict: [String: Any] = [
            kIOHIDDeviceUsagePageKey as String: kHIDPage_GenericDesktop,
            kIOHIDDeviceUsageKey as String: kHIDUsage_GD_Keyboard
        ]
        
        let cfMatchingDict = matchingDict as CFDictionary
        IOHIDManagerSetDeviceMatching(manager, cfMatchingDict)
        
        // Register callback with correct closure signature (4 parameters)
        IOHIDManagerRegisterInputValueCallback(manager, { (context: UnsafeMutableRawPointer?, result: IOReturn, sender: UnsafeMutableRawPointer?, value: IOHIDValue) in
            guard let context = context else { return }
            let monitor = Unmanaged<KeyboardMonitor>.fromOpaque(context).takeUnretainedValue()
            monitor.handleHIDValue(IOHIDValue: value)
        }, UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque()))
        
        // Schedule the manager with the current run loop
        IOHIDManagerScheduleWithRunLoop(manager, CFRunLoopGetCurrent(), CFRunLoopMode.defaultMode.rawValue)
        
        // Open the HID manager
        let openResult = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeNone))
        if openResult != kIOReturnSuccess {
            print("Failed to open HID Manager: \(openResult)")
            return
        }
    }
    
    private func handleHIDValue(IOHIDValue: IOHIDValue) {
        let element = IOHIDValueGetElement(IOHIDValue)
        let value = IOHIDValueGetIntegerValue(IOHIDValue)
        let usage = IOHIDElementGetUsage(element)
        
        // Only process key down events (value = 1) and ignore special keys
        if value == 1 && usage < 0xE0 {
            print("Raw keycode: 0x\(String(format: "%02X", usage))")
            if let character = keyCodeToCharacter(keyCode: Int(usage)) {
                print("Keycode 0x\(String(format: "%02X", usage)) -> '\(character)'")
                inputBuffer.append(character)
                
                if character == "\n" {
                    print("Raw scan: \(inputBuffer)")
                    processBuffer()
                }
            }
        }
    }
    
    private func keyCodeToCharacter(keyCode: Int) -> String? {
        let keyMap: [Int: String] = [
            // Letters (these are correct)
            0x04: "a", 0x05: "b", 0x06: "c", 0x07: "d",
            0x08: "e", 0x09: "f", 0x0A: "g", 0x0B: "h",
            0x0C: "i", 0x0D: "j", 0x0E: "k", 0x0F: "l",
            0x10: "m", 0x11: "n", 0x12: "o", 0x13: "p",
            0x14: "q", 0x15: "r", 0x16: "s", 0x17: "t",
            0x18: "u", 0x19: "v", 0x1A: "w", 0x1B: "x",
            0x1C: "y", 0x1D: "z",
            
            // Numbers (these are correct)
            0x1E: "1", 0x1F: "2", 0x20: "3", 0x21: "4",
            0x22: "5", 0x23: "6", 0x24: "7", 0x25: "8",
            0x26: "9", 0x27: "0",
            
            // Special characters - updated mapping
            0x38: "/",  // Keep as slash (for path separators)
            0x37: ".",  // Changed to dot (for domain separator)
            0x33: ":",  // Keep as colon (for https:)
            0x2D: "-",  // Keep as hyphen
            
            // Control
            0x28: "\n"  // Enter/Return
        ]
        
        return keyMap[keyCode]
    }
    
    private func checkForURL() {
        let urls = URLDetector.extractURLs(from: inputBuffer)
        for url in urls {
            sender.send(url: url)
            // Optionally, remove the sent URL from the buffer
            if let range = inputBuffer.range(of: url) {
                inputBuffer.removeSubrange(range)
            }
        }
        
        // Limit buffer size to prevent unlimited growth
        if inputBuffer.count > 1000 {
            inputBuffer = String(inputBuffer.suffix(500))
        }
    }
    
    private func processBuffer() {
        if !inputBuffer.isEmpty {
            let scannedText = inputBuffer.trimmingCharacters(in: .whitespacesAndNewlines)
            print("Scanned text: \(scannedText)")
            
            // Check if it matches our expected URL patterns
            if scannedText.hasPrefix("https://ecomm.berlin/p/") || 
               scannedText.hasPrefix("https://expojuicer.com/p/") {
                print("Valid URL found: \(scannedText)")
                sender.send(url: scannedText)
            }
            
            inputBuffer.removeAll()
        }
    }
    
    func start() {
        RunLoop.current.run()
    }
}

// MARK: - Main Execution

let sender = LocalSocketSender()
let monitor = KeyboardMonitor(sender: sender)
print("Starting Keyboard Monitor...")
monitor.start()
