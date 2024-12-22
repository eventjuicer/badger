const fs = require('fs');

// Key code mappings
const keyCodeMap = {
  // Lowercase letters
  30: 'a', 31: 's', 32: 'd', 33: 'f', 34: 'g', 35: 'h', 36: 'j',
  37: 'k', 38: 'l', 39: ';', 40: "'", 41: '`', 42: 'Shift', // 42 is Shift
  43: '\\', 44: 'z', 45: 'x', 46: 'c', 47: 'v', 48: 'b', 49: 'n',
  50: 'm', 51: ',', 52: '.', 53: '/', 2: '1', 3: '2', 4: '3',
  5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '0',
  28: '\n', // Enter
  57: ' ',   // Space
  // Add more as needed
};

const keyCodeMapShift = {
  // Uppercase letters
  30: 'A', 31: 'S', 32: 'D', 33: 'F', 34: 'G', 35: 'H', 36: 'J',
  37: 'K', 38: 'L', 39: ':', 40: '"', 41: '~', 42: 'Shift', // 42 is Shift
  43: '|', 44: 'Z', 45: 'X', 46: 'C', 47: 'V', 48: 'B', 49: 'N',
  50: 'M', 51: '<', 52: '>', 53: '?', 2: '!', 3: '@', 4: '#',
  5: '$', 6: '%', 7: '^', 8: '&', 9: '*', 10: '(', 11: ')',
  28: '\n', // Enter remains the same
  57: ' ',   // Space remains the same
  // Add more as needed
};

let isShiftPressed = false;
let barcode = '';

const EVENT_SIZE = 24; // 24 bytes for 64-bit systems
let leftover = Buffer.alloc(0);

// Path to your device's event file
const eventPath = '/dev/input/event7';

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

    // Handle only EV_KEY events
    if (type === 1) {
      if (code === 42 || code === 54) { // Shift keys
        isShiftPressed = value === 1 || value === 2;
        continue;
      }

      if (value === 1) { // Key Press
        let char = isShiftPressed ? keyCodeMapShift[code] : keyCodeMap[code];
        if (char) {
          if (char !== 'Shift') { // Avoid appending 'Shift' as a character
            barcode += char;

            if (code === 28) { // Enter key signifies end of barcode
              console.log('Scanned Barcode:', barcode.trim());
              barcode = ''; // Reset for next scan
            }
          }
        }
      }
    }
  }
});

stream.on('error', (err) => {
  console.error('Error reading input:', err);
});
