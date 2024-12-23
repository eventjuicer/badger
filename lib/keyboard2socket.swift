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
        self.port = 12345
        super.init()
        setupStreams()
    }
    
    private func setupStreams() {
        var readStream: Unmanaged<CFReadStream>?
        var writeStream: Unmanaged<CFWriteStream>?
        
        // Create TCP connection to the specified host and port
        CFStreamCreatePairWithSocketToHost(nil, host as CFString, UInt32(port), &readStream, &writeStream)
        
        guard let inputStream = readStream?.takeRetainedValue(),
              let outputStream = writeStream?.takeRetainedValue() else {
            print("Failed to create streams")
            return
        }
        
        self.inputStream = inputStream
        self.outputStream = outputStream
        
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
                if let output = String(bytes: buffer, encoding: .utf8) {
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
        
        // Register callback with correct closure signature
        IOHIDManagerRegisterInputValueCallback(manager, { context, result, senderIOHIDValue in
            guard let context = context else { return }
            let monitor = Unmanaged<KeyboardMonitor>.fromOpaque(context).takeUnretainedValue()
            monitor.handleHIDValue(IOHIDValue: senderIOHIDValue)
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
        let usage = IOHIDElementGetUsage(element)
        let usagePage = IOHIDElementGetUsagePage(element)
        
        // We're interested in keyboard keys
        if usagePage != kHIDPage_KeyboardOrKeypad {
            return
        }
        
        let keyCode = IOHIDValueGetIntegerValue(IOHIDValue)
        
        // In HID, a key event consists of key code and usage flags.
        // Here, we check if the key is pressed (value == 1)
        // However, depending on the keyboard, you might need to adjust this logic.
        // For simplification, we'll assume that any key code received is a key press.
        
        if let character = keyCodeToCharacter(keyCode: Int(keyCode)) {
            inputBuffer.append(character)
            checkForURL()
        }
    }
    
    private func keyCodeToCharacter(keyCode: Int) -> String? {
        // Map keycodes to characters. This is simplified and may not handle all cases or keyboard layouts.
        let keyMap: [Int: String] = [
            0x00: "a", 0x01: "s", 0x02: "d", 0x03: "f",
            0x04: "h", 0x05: "g", 0x06: "z", 0x07: "x",
            0x08: "c", 0x09: "v", 0x0B: "b", 0x0C: "q",
            0x0D: "w", 0x0E: "e", 0x0F: "r", 0x10: "y",
            0x11: "t", 0x12: "1", 0x13: "2", 0x14: "3",
            0x15: "4", 0x16: "6", 0x17: "5", 0x18: "=",
            0x19: "9", 0x1A: "7", 0x1B: "-", 0x1C: "8",
            0x1D: "0", 0x1E: "]", 0x1F: "o", 0x20: "u",
            0x21: "[", 0x22: "i", 0x23: "p", 0x24: "l",
            0x25: "j", 0x26: "k", 0x27: ";", 0x28: "\\",
            0x29: ",", 0x2A: "/", 0x2B: "n", 0x2C: "m",
            0x2D: ".", 0x2E: "`", 0x2F: " ",
            // Add more key mappings as needed
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
    
    func start() {
        RunLoop.current.run()
    }
}

// MARK: - Main Execution

let sender = LocalSocketSender()
let monitor = KeyboardMonitor(sender: sender)
print("Starting Keyboard Monitor...")
monitor.start()
