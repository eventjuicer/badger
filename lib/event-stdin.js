const fs = require('fs');

const eventPath = '/dev/input/event7'; // for example
const stream = fs.createReadStream(eventPath);


const EVENT_SIZE = 24; // For 64-bit systems

let leftover = Buffer.alloc(0);

stream.on('data', (chunk) => {
  // Combine leftover data with new incoming chunk
  leftover = Buffer.concat([leftover, chunk]);

  // While we have enough bytes for an entire input_event:
  while (leftover.length >= EVENT_SIZE) {
    // Extract one event (24 bytes) from the front
    const eventBuf = leftover.slice(0, EVENT_SIZE);
    leftover = leftover.slice(EVENT_SIZE);

    // Parse the struct fields:

    // time.tv_sec (8 bytes, 64-bit)
    const timeSec = eventBuf.readBigInt64LE(0);

    // time.tv_usec (8 bytes, 64-bit)
    const timeUsec = eventBuf.readBigInt64LE(8);

    // type (2 bytes)
    const type = eventBuf.readUInt16LE(16);

    // code (2 bytes)
    const code = eventBuf.readUInt16LE(18);

    // value (4 bytes, signed)
    const value = eventBuf.readInt32LE(20);

    // Now you have a fully decoded event
    console.log({
      timeSec,
      timeUsec,
      type,
      code,
      value
    });
  }
});

stream.on('end', () => {
  console.log('No more data on stdin.');
});



stream.on('error', (err) => {
  console.error('Error reading input:', err);
});
