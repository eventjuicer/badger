const v4l2camera = require('v4l2camera');
const jsQR = require('jsqr');

// Open the camera
const cam = new v4l2camera.Camera("/dev/video0");
if (!cam.open()) {
  console.error("Failed to open camera.");
  process.exit(1);
}

const width = cam.width;
const height = cam.height;

// The camera typically provides data in YUYV (YUV) format. We need to convert it to RGBA for jsQR.
function yuyvToRgb(yuyvBuffer, width, height) {
  const rgbBuffer = Buffer.alloc(width * height * 3);
  
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j += 2) {
      let index = (i * width + j) * 2;

      // YUYV is in pairs: Y0 U Y1 V
      let y0 = yuyvBuffer[index];
      let u = yuyvBuffer[index + 1];
      let y1 = yuyvBuffer[index + 2];
      let v = yuyvBuffer[index + 3];

      // Convert YUV to RGB
      const [r0, g0, b0] = yuvToRgb(y0, u, v);
      const [r1, g1, b1] = yuvToRgb(y1, u, v);

      const baseRgbIndex = (i * width + j) * 3;
      rgbBuffer[baseRgbIndex] = r0;
      rgbBuffer[baseRgbIndex + 1] = g0;
      rgbBuffer[baseRgbIndex + 2] = b0;

      rgbBuffer[baseRgbIndex + 3] = r1;
      rgbBuffer[baseRgbIndex + 4] = g1;
      rgbBuffer[baseRgbIndex + 5] = b1;
    }
  }

  return rgbBuffer;
}

function yuvToRgb(y, u, v) {
  // Convert YUV to RGB using standard formula
  const Y = y;
  const U = u - 128;
  const V = v - 128;

  let R = Y + 1.370705 * V;
  let G = Y - 0.337633 * U - 0.698001 * V;
  let B = Y + 1.732446 * U;

  // Clamp to 0–255
  R = Math.max(0, Math.min(255, R));
  G = Math.max(0, Math.min(255, G));
  B = Math.max(0, Math.min(255, B));

  return [R, G, B];
}

// Start capturing frames
cam.start();

// On each frame, attempt to detect a QR code
cam.on('frame', (frame) => {
  // frame is YUYV data
  const rgbBuffer = yuyvToRgb(frame, width, height);

  // jsQR needs RGBA
  const rgbaBuffer = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgbaBuffer[i * 4] = rgbBuffer[i * 3];
    rgbaBuffer[i * 4 + 1] = rgbBuffer[i * 3 + 1];
    rgbaBuffer[i * 4 + 2] = rgbBuffer[i * 3 + 2];
    rgbaBuffer[i * 4 + 3] = 255;
  }

  const code = jsQR(new Uint8ClampedArray(rgbaBuffer), width, height);
  if (code) {
    console.log("QR code detected:", code.data);
    // If you want to stop after detection:
    // cam.stop();
    // cam.close();
  } else {
    console.log("No QR code found in this frame.");
  }
});
