const fs = require('fs');

const EVENT_SIZE = 24; // 24 bytes for 64-bit systems
let leftover = Buffer.alloc(0);

const eventPath = '/dev/input/event7'; // Replace with your device's event file

// Key code mappings (extend based on your logs)
const keyCodeMap = {
  // Lowercase letters
  16: 'q', 17: 'w', 18: 'e', 19: 'r', 20: 't',
  21: 'y', 22: 'u', 23: 'i', 24: 'o', 25: 'p',
  30: 'a', 31: 's', 32: 'd', 33: 'f', 34: 'g',
  35: 'h', 36: 'j', 37: 'k', 38: 'l',
  44: 'z', 45: 'x', 46: 'c', 47: 'v', 48: 'b',
  49: 'n', 50: 'm',
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5',
  7: '6', 8: '7', 9: '8', 10: '9', 11: '0',
  12: '-',  // Example: Dash
  13: '=',  // Example: Equal
  14: '[',  // Example: Left Bracket
  15: ']',  // Example: Right Bracket
  28: '\n', // Enter
  57: ' ',   // Space
  // Add more key codes as per your logs
};

const keyCodeMapShift = {
  // Uppercase letters and shifted symbols
  16: 'Q', 17: 'W', 18: 'E', 19: 'R', 20: 'T',
  21: 'Y', 22: 'U', 23: 'I', 24: 'O', 25: 'P',
  30: 'A', 31: 'S', 32: 'D', 33: 'F', 34: 'G',
  35: 'H', 36: 'J', 37: 'K', 38: 'L',
  44: 'Z', 45: 'X', 46: 'C', 47: 'V', 48: 'B',
  49: 'N', 50: 'M',
  2: '!', 3: '@', 4: '#', 5: '$', 6: '%',
  7: '^', 8: '&', 9: '*', 10: '(', 11: ')',
  12: '_',  // Shift + Dash
  13: '+',  // Shift + Equal
  14: '{',  // Shift + Left Bracket
  15: '}',  // Shift + Right Bracket
  28: '\n', // Enter remains the same
  57: ' ',   // Space remains the same
  // Add more shifted key codes as per your logs
};

let isShiftPressed = false;
let barcode = '';

function handleEvent(event) {
  const { type, code, value } = event;

  if (type === 1) { // EV_KEY
    // Handle Shift keys
    if (code === 42 || code === 54) { // Left Shift or Right Shift
      if (value === 1 || value === 2) { // Pressed or held
        isShiftPressed = true;
      } else if (value === 0) { // Released
        isShiftPressed = false;
      }
      return; // Don't process Shift as a character
    }

    if (value === 1) { // Key Press
      let char = isShiftPressed ? keyCodeMapShift[code] : keyCodeMap[code];
      if (char) {
        barcode += char;

        if (code === 28) { // Enter key signifies end of barcode
          console.log('Scanned Barcode:', barcode.trim());
          barcode = ''; // Reset for next scan
        }
      }
    }
  }
}

// Create a read stream for the input device
const stream = fs.createReadStream(eventPath);

stream.on('data', (chunk) => {
  leftover = Buffer.concat([leftover, chunk]);

  while (leftover.length >= EVENT_SIZE) {
    const eventBuf = leftover.slice(0, EVENT_SIZE);
    leftover = leftover.slice(EVENT_SIZE);

    const timeSec = Number(eventBuf.readBigInt64LE(0));
    const timeUsec = Number(eventBuf.readBigInt64LE(8));
    const type = eventBuf.readUInt16LE(16);
    const code = eventBuf.readUInt16LE(18);
    const value = eventBuf.readInt32LE(20);

    handleEvent({ type, code, value });
  }
});

stream.on('error', (err) => {
  console.error('Error reading input:', err);
});

console.log(`Listening to ${eventPath}. Scan a barcode...`);
