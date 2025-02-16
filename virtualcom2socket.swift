#!/usr/bin/env swift
import Foundation
import Darwin

// Configuration
let SERIAL_PORT = "/dev/tty.Bluetooth-Incoming-Port"
let URL_PATTERN = #"^https://[\w\-\.]+/p/[\w]+$"#
let SOCKET_PORT: UInt16 = 12345

// Initialize regex
guard let regex = try? NSRegularExpression(pattern: URL_PATTERN) else {
    print("Failed to create regex")
    exit(1)
}

func sendToSocket(_ message: String) {
    let sock = socket(AF_INET, SOCK_STREAM, 0)
    guard sock >= 0 else {
        print("Socket creation failed")
        return
    }
    defer { close(sock) }

    var addr = sockaddr_in()
    addr.sin_family = sa_family_t(AF_INET)
    addr.sin_port = SOCKET_PORT.bigEndian
    addr.sin_addr.s_addr = inet_addr("127.0.0.1")

    let connectResult = withUnsafePointer(to: &addr) {
        $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
            connect(sock, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
        }
    }
    
    guard connectResult >= 0 else {
        print("Connection failed")
        return
    }

    _ = message.withCString { ptr in
        send(sock, ptr, strlen(ptr), 0)
    }
    print("Sent to socket: \(message)")
}

// Open serial port
let fd = open(SERIAL_PORT, O_RDWR | O_NOCTTY | O_NONBLOCK)
guard fd >= 0 else {
    print("Failed to open \(SERIAL_PORT)")
    exit(1)
}

// Configure serial port
var options = termios()
tcgetattr(fd, &options)
cfsetspeed(&options, speed_t(B9600))
options.c_cflag |= tcflag_t(CLOCAL | CREAD)
options.c_lflag &= ~tcflag_t(ICANON | ECHO | ECHOE | ISIG)

// For c_cc, we need to modify specific indices using a var copy
var cc = options.c_cc
cc.0 = UInt8(1)  // VMIN
cc.1 = UInt8(0)  // VTIME
options.c_cc = cc

tcsetattr(fd, TCSANOW, &options)

// Switch to blocking mode - store result to silence warning
let _ = fcntl(fd, F_SETFL, 0)

print("Listening on \(SERIAL_PORT)...")

// Read loop
var buffer = [UInt8](repeating: 0, count: 1024)
var accumulator = ""

while true {
    let bytesRead = read(fd, &buffer, buffer.count)
    
    if bytesRead > 0 {
        if let chunk = String(bytes: buffer[0..<bytesRead], encoding: .utf8) {
            accumulator += chunk
            
            while let newlineRange = accumulator.range(of: "\n") {
                let line = accumulator[..<newlineRange.lowerBound].trimmingCharacters(in: .whitespacesAndNewlines)
                accumulator = String(accumulator[newlineRange.upperBound...])
                
                let range = NSRange(location: 0, length: line.utf16.count)
                if regex.firstMatch(in: line, range: range) != nil {
                    print("Valid URL found: \(line)")
                    sendToSocket(line)
                }
            }
        }
    }
} 