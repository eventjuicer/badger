const fs = require('fs');



const EVENT_SIZE = 24; // 24 bytes for 64-bit systems
let leftover = Buffer.alloc(0);

const eventPath = '/dev/input/event7'; // Replace with your device's event file

// Lowercase key code mapping
const keyCodeMap = {
  // Letters
  16: 'q', 17: 'w', 18: 'e', 19: 'r', 20: 't',
  21: 'y', 22: 'u', 23: 'i', 24: 'o', 25: 'p',
  30: 'a', 31: 's', 32: 'd', 33: 'f', 34: 'g',
  35: 'h', 36: 'j', 37: 'k', 38: 'l',
  44: 'z', 45: 'x', 46: 'c', 47: 'v', 48: 'b',
  49: 'n', 50: 'm',
  // Numbers
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5',
  7: '6', 8: '7', 9: '8', 10: '9', 11: '0',
  // Symbols
  12: '-', 13: '=', 14: '[', 15: ']',
  43: '\\', 51: ',', 52: '.', 53: '/', // Added '/' here
  39: ';', 40: "'", 41: '`',
  // Space and Enter
  57: ' ', 28: '\n',
  // Add more key codes as needed
};

// Shifted key code mapping
const keyCodeMapShift = {
  // Letters
  16: 'Q', 17: 'W', 18: 'E', 19: 'R', 20: 'T',
  21: 'Y', 22: 'U', 23: 'I', 24: 'O', 25: 'P',
  30: 'A', 31: 'S', 32: 'D', 33: 'F', 34: 'G',
  35: 'H', 36: 'J', 37: 'K', 38: 'L',
  44: 'Z', 45: 'X', 46: 'C', 47: 'V', 48: 'B',
  49: 'N', 50: 'M',
  // Numbers with Shift
  2: '!', 3: '@', 4: '#', 5: '$', 6: '%',
  7: '^', 8: '&', 9: '*', 10: '(', 11: ')',
  // Symbols with Shift
  12: '_', 13: '+', 14: '{', 15: '}',
  43: '|', 51: '<', 52: '>', 53: '?', // Shifted '/' to '?'
  39: ':', 40: '"', 41: '~',
  // Space and Enter remain the same
  57: ' ', 28: '\n',
  // Add more shifted key codes as needed
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


        console.log(`mapping of: ${event.type} ${event.code} ${event.value} mapped to ${char}`);

          // Rest of the logic...
        
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
