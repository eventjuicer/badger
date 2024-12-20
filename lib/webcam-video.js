const { spawn } = require('child_process');
const sharp = require('sharp');
const jsQR = require('jsqr');
const fs = require('fs');

// ffmpeg command to capture raw video from webcam and output MJPEG frames to stdout
// Adjust -r (framerate), resolution, and format as needed.
const ffmpeg = spawn('ffmpeg', [
  '-f', 'v4l2',
  '-framerate', '10', // 10 fps, adjust as needed
  '-video_size', '640x480',
  '-i', '/dev/video0',
  '-f', 'image2pipe',
  '-vcodec', 'mjpeg',
  'pipe:1'
]);

let buffer = Buffer.alloc(0);

// JPEG start and end markers
const JPEG_START = Buffer.from([0xFF, 0xD8]);
const JPEG_END = Buffer.from([0xFF, 0xD9]);

ffmpeg.stdout.on('data', (chunk) => {
  // Append new data chunk to our buffer
  buffer = Buffer.concat([buffer, chunk]);

  // Try to find complete JPEG frames in the buffer
  let startIndex = buffer.indexOf(JPEG_START);
  
  while (startIndex !== -1) {
    let endIndex = buffer.indexOf(JPEG_END, startIndex);
    if (endIndex !== -1) {
      // We found a complete JPEG frame
      const frame = buffer.slice(startIndex, endIndex + JPEG_END.length);

      // Remove this frame from the buffer
      buffer = buffer.slice(endIndex + JPEG_END.length);

      // Process this frame asynchronously
      processFrame(frame);

      // Check if there's another frame in the remainder
      startIndex = buffer.indexOf(JPEG_START);
    } else {
      // No complete frame found yet, wait for more data
      break;
    }
  }
});

// Process one frame (Buffer) for QR code detection asynchronously
async function processFrame(frame) {
  try {
    // Convert the JPEG frame to raw RGBA
    const { data, info } = await sharp(frame)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    
    // Detect QR code
    const code = jsQR(data, info.width, info.height);
    if (code) {
      console.log('QR code detected:', code.data);
      
      // Save the frame if desired
      const timestamp = Date.now();
      const filename = `qr_detected_${timestamp}.jpg`;
      fs.writeFileSync(filename, frame);
      console.log(`Frame saved as ${filename}`);
    }
  } catch (err) {
    console.error('Error processing frame:', err);
  }
}

ffmpeg.stderr.on('data', (data) => {
  console.error('ffmpeg error:', data.toString());
});

ffmpeg.on('close', (code) => {
  console.log(`ffmpeg process exited with code ${code}`);
});
