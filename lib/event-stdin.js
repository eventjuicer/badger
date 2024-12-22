const fs = require('fs');

const eventPath = '/dev/input/event7'; // for example
const stream = fs.createReadStream(eventPath);

stream.on('data', (chunk) => {
  // You'd parse the binary data according to the input_event struct
  // Typically 24 bytes on 64-bit systems:
  //   struct input_event {
  //     struct timeval time;  // 16 bytes
  //     unsigned short type;  // 2 bytes
  //     unsigned short code;  // 2 bytes
  //     unsigned int value;   // 4 bytes
  //   }

	console.log(chunk)
});

stream.on('error', (err) => {
  console.error('Error reading input:', err);
});
