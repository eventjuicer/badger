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
        self.port = 12346
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
                inputBuffer.append(character)
                
                if character == "\n" {
                    print("Raw scan: \(inputBuffer)")
                    processBuffer()
                }
            }
        }
    }
    
    private func keyCodeToCharacter(keyCode: Int) -> String? {
        // Map based on observed scanner output
        let keyMap: [Int: String] = [
            0x59: "1",  // Most common digit
            0x5A: "2",
            0x5B: "3",
            0x5C: "4",
            0x5D: "5",
            0x5E: "6",
            0x5F: "7",
            0x60: "8",
            0x61: "9",
            0x62: "0",
            0x28: "\n"  // Enter key
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
            let scannedCode = inputBuffer.trimmingCharacters(in: .whitespacesAndNewlines)
            print("Raw numeric code: \(scannedCode)")
            
            // Map numeric sequences to actual characters
            let numericToChar: [String: String] = [
                // Letters (a-z)
                "97": "a", "98": "b", "99": "c", "100": "d",
                "101": "e", "102": "f", "103": "g", "104": "h",
                "105": "i", "106": "j", "107": "k", "108": "l",
                "109": "m", "110": "n", "111": "o", "112": "p",
                "113": "q", "114": "r", "115": "s", "116": "t",
                "117": "u", "118": "v", "119": "w", "120": "x",
                "121": "y", "122": "z",
                
                // Numbers (0-9)
                "48": "0", "49": "1", "50": "2", "51": "3", "52": "4",
                "53": "5", "54": "6", "55": "7", "56": "8", "57": "9",
                
                // Special characters
                "45": "-", "46": ".", "43": "+", "95": "_",
                "58": ":", "47": "/"
            ]
            
            // Split the numeric code into groups of 2-3 digits and translate
            var result = ""
            var current = ""
            
            for char in scannedCode {
                current += String(char)
                if let letter = numericToChar[current] {
                    result += letter
                    current = ""
                } else if current.count >= 3 {
                    // Reset if we don't find a match after 3 digits
                    current = String(char)
                }
            }
            
            print("Decoded text: \(result)")
            
            // Extract just the code part (after /p/)
            if let range = result.range(of: "/p/") {
                let code = String(result[range.upperBound...])
                print("Extracted code: \(code)")
                sender.send(url: code)  // Send the complete decoded URL
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
