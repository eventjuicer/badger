const { spawn } = require('child_process');
const jsQR = require('jsqr');

// Set desired capture resolution
const width = 640;
const height = 480;

// Each frame in RGB24 is width*height*3 bytes
const frameSize = width * height * 3;

// Spawn ffmpeg to read raw frames from /dev/video0
const ffmpeg = spawn('ffmpeg', [
  '-framerate', '30',          // capture at 30 frames per second
  '-f', 'v4l2',               // use V4L2 capture
  '-video_size', `${width}x${height}`, 
  '-i', '/dev/video0',        // input device
  '-f', 'rawvideo',           // output format as raw video
  '-pix_fmt', 'rgb24',         // pixel format: RGB24
//   '-vf', 'eq=contrast=1.5:brightness=0.05', // example EQ filter
 // '-vf', 'hqdn3d=1.5:1.5:1.5:1.5' ,
  'pipe:1'                    // write to stdout
]);

let frameBuffer = Buffer.alloc(0);

// Listen for data (video frames) from ffmpeg
ffmpeg.stdout.on('data', (chunk) => {
  frameBuffer = Buffer.concat([frameBuffer, chunk]);

  // If we have at least one full frame of data, process it
  while (frameBuffer.length >= frameSize) {
    const frameData = frameBuffer.slice(0, frameSize);
    frameBuffer = frameBuffer.slice(frameSize);

    // Convert RGB24 frame to RGBA
    const rgbaBuffer = rgb24toRgba(frameData, width, height);

    // Run QR code detection on the RGBA data
    const code = jsQR(rgbaBuffer, width, height);
    if (code) {
      console.log('QR code detected:', code.data);
      // If needed, handle the frame where QR code was found (save it, etc.)
      // This code continuously reads frames, so it will keep detecting if new QRs appear.
    }
  }
});

ffmpeg.stderr.on('data', (data) => {
  console.error('ffmpeg error:', data.toString());
});

ffmpeg.on('close', (code) => {
  console.log(`ffmpeg process exited with code ${code}`);
});

// Utility function: convert RGB24 buffer to RGBA (jsQR expects RGBA)
function rgb24toRgba(rgbBuffer, width, height) {
  const rgbaBuffer = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgbaBuffer[i * 4] = rgbBuffer[i * 3];     // R
    rgbaBuffer[i * 4 + 1] = rgbBuffer[i * 3 + 1]; // G
    rgbaBuffer[i * 4 + 2] = rgbBuffer[i * 3 + 2]; // B
    rgbaBuffer[i * 4 + 3] = 255;              // A (fully opaque)
  }
  return rgbaBuffer;
}
