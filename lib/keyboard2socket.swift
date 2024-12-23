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

// MARK: - Local Socket Sender

class LocalSocketSender {
    let socketPath: String
    var outputStream: OutputStream?
    
    init(socketPath: String) {
        self.socketPath = socketPath
        setupStream()
    }
    
    private func setupStream() {
        var readStream: Unmanaged<CFReadStream>?
        var writeStream: Unmanaged<CFWriteStream>?
        CFStreamCreatePairWithSocketToHost(nil, "localhost" as CFString, 12345, &readStream, &writeStream)
        
        if let writeStream = writeStream?.takeRetainedValue() {
            outputStream = writeStream
            outputStream?.open()
        }
    }
    
   func send(url: String) {
    guard let outputStream = outputStream else { return }
    let json: [String: String] = ["url": url]
    if let jsonData = try? JSONSerialization.data(withJSONObject: json, options: []),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        if let data = (jsonString + "\n").data(using: .utf8) {
            data.withUnsafeBytes { (buffer: UnsafeRawBufferPointer) in
                if let baseAddress = buffer.baseAddress?.assumingMemoryBound(to: UInt8.self) {
                    outputStream.write(baseAddress, maxLength: data.count)
                }
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
        
        // **Fix 1:** Safely unwrap the optional 'manager'
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
        
        // **Fix 2:** Correct closure to accept four parameters
        IOHIDManagerRegisterInputValueCallback(manager, { context, result, sender, value in
            // **Fix 3:** Ensure 'context' is not nil
            guard let context = context else { return }
            let monitor = Unmanaged<KeyboardMonitor>.fromOpaque(context).takeUnretainedValue()
            // **Fix 4:** Pass the correct 'value' parameter
            monitor.handleHIDValue(IOHIDValue: value)
        }, UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque()))
        
        IOHIDManagerScheduleWithRunLoop(manager, CFRunLoopGetCurrent(), CFRunLoopMode.defaultMode.rawValue)
        IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeNone))
    }
    
    private func handleHIDValue(IOHIDValue: IOHIDValue) {
        // **Fix 5:** Remove 'guard let' since 'IOHIDValueGetElement' returns non-optional
        let element = IOHIDValueGetElement(IOHIDValue)
        let usage = IOHIDElementGetUsage(element)
        let usagePage = IOHIDElementGetUsagePage(element)
        
        // We're interested in keyboard keys
        if usagePage != kHIDPage_KeyboardOrKeypad {
            return
        }
        
        let keyCode = IOHIDValueGetIntegerValue(IOHIDValue)
        
        // **Fix 6:** Cast 'keyCode' from 'UInt32' to 'Int'
        if keyCode == 1 { // Assuming '1' signifies a key press event; adjust as needed
            if let character = keyCodeToCharacter(keyCode: Int(keyCode)) {
                inputBuffer.append(character)
                checkForURL()
            }
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

let socketPath = "/tmp/url_socket" // Update if needed
let sender = LocalSocketSender(socketPath: socketPath)
let monitor = KeyboardMonitor(sender: sender)
print("Starting Keyboard Monitor...")
monitor.start()
