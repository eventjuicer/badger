const NodeWebcam = require('node-webcam');
const fs = require('fs');
const Jimp = require('jimp');
const jsQR = require('jsqr');
const sharp = require("sharp");

// Webcam options
const opts = {
  width: 640,
  height: 480,
  quality: 100,
  frames: 1,
  delay: 0,
  saveShots: false,
  device: '/dev/video0',
  callbackReturn: 'buffer',  // Return image as buffer instead of a file path
  verbose: false
};

//const Webcam = NodeWebcam.create(opts);

// Function to capture a single frame, check for QR, and optionally save
async function captureAndCheckQR() {
  return new Promise((resolve, reject) => {

    const Webcam = NodeWebcam.create(opts);

    Webcam.capture("temp", async (err, imageBuffer) => {
      if (err) {
        return reject("Error capturing image: " + err);
      }

	console.log("callback fired");
      try {
        // Read the image buffer with Jimp


  const { data, info } = await sharp(imageBuffer)
          .raw()          // get raw pixel data
          .ensureAlpha()   // ensure there is an alpha channel
          .toBuffer({ resolveWithObject: true });

        // data now contains raw pixel data in RGBA format
        // info.width and info.height contain the image dimensions

        const qrCode = jsQR(data, info.width, info.height);


        //if (qrCode) {
          console.log("QR code detected:", qrCode?.data);

          // Save the image now that we know a QR is detected
          fs.writeFileSync('./detected_qr.jpg', imageBuffer);
          console.log("Image saved as detected_qr.jpg");

          resolve(qrCode?.data);
//        } else {
  //        console.log("No QR code found in this image.");
    //      resolve(null);
      //  }
      } catch (processErr) {
        reject("Error processing image: " + processErr);
      }
    });
  });
}

async function scanForQRCodesForever() {
  while (true) {
    try {
      const result = await captureAndCheckQR();

      if (result && result.qrData) {
        console.log("QR code detected:", result.qrData);
        // Save the image at the moment QR is detected
        const timestamp = Date.now();
        const filename = `qr_detected_${timestamp}.jpg`;
        fs.writeFileSync(filename, result.imageBuffer);
        console.log(`Image saved as ${filename}`);
      } else {
        console.log("No QR code found in this image, continuing...");
      }

      // Optionally, add a small delay to avoid overloading CPU
      await new Promise(res => setTimeout(res, 5000));
    } catch (error) {
      console.error('Error in scanning loop:', error);
      // Decide how to handle errors:
      // break the loop, or just continue after delay
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}

module.exports = scanForQRCodesForever;


// Example usage:
// You can call this function when a trigger occurs (e.g., a button press).
// If a QR code is detected in the captured frame, the image is saved.
// If not, nothing is saved.
/**
captureAndCheckQR()
  .then(data => {
    if (data) {
      console.log("Done. Detected QR data: ", data);
    } else {
      console.log("Done. No QR code detected.");
    }
  })
  .catch(err => console.error(err));
*/
