const Camera = require('raspberry-pi-camera-native');
const jsQR = require('jsqr');
const { createCanvas, loadImage } = require('canvas');
const escpos = require('escpos');

// Initialize camera
const camera = new Camera({
  width: 640,  // Image width
  height: 480, // Image height
  fps: 10      // Frame rate
});

// Setup printer (replace with your printer's USB device or IP address)
const device = new escpos.USB(); // For USB printers
// const device = new escpos.Network('192.168.1.x'); // For network printers
const printer = new escpos.Printer(device);

// Function to decode the QR code from an image
const decodeQR = async (imageBuffer) => {
  // Create a canvas to draw the image
  const image = await loadImage(imageBuffer);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  // Draw the image on the canvas
  ctx.drawImage(image, 0, 0, image.width, image.height);

  // Get image data
  const imageData = ctx.getImageData(0, 0, image.width, image.height);

  // Decode the QR code using jsQR
  const qrCode = jsQR(imageData.data, image.width, image.height);

  if (qrCode) {
    console.log("QR Code Detected: ", qrCode.data);
    return qrCode.data; // Return QR code data
  } else {
    console.log("No QR Code found in this image.");
    return null;
  }
};

// Function to print the QR code information
const printQRData = (qrData) => {
  if (!qrData) {
    console.log("No data to print.");
    return;
  }

  printer
    .text('QR Code Information:')  // Title on the label
    .text('-----------------------')
    .text(qrData)  // The QR code content
    .cut()  // Cut the label after printing
    .close();  // Close the connection to the printer

  console.log("Printed QR Code info.");
};

// Function to capture image and process it every 10 seconds
const captureAndDecodeQR = () => {
  setInterval(() => {
    console.log("Capturing image and decoding QR...");

    camera.takePicture()
      .then(async (imageBuffer) => {
        console.log("Image captured.");

        // Decode the QR code from the captured image
        const qrData = await decodeQR(imageBuffer);

        // Print the decoded QR code data to the Brother label printer
        printQRData(qrData);
      })
      .catch((err) => {
        console.error("Error capturing image:", err);
      });
  }, 10000);  // 10 seconds interval
};

// Start capturing and decoding QR codes
captureAndDecodeQR();
