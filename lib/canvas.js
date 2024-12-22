// createImage.js

const { createCanvas, loadImage } = require('canvas');
const QRCode = require('qrcode');
const fs = require('fs');

(async () => {
  try {
    // Canvas dimensions
    const canvasWidth = 500;
    const canvasHeight = 500;

    // Create a canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Set background to white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Define text properties
    const textLines = [
      'First Line of Text',
      'Second Line of Text',
      'Third Line of Text'
    ];
    const textX = 50; // X-coordinate for text
    let textY = 50;   // Starting Y-coordinate for text
    const lineHeight = 30; // Space between lines
    const font = '20px Arial';
    const textColor = '#000000';

    // Draw text lines
    ctx.fillStyle = textColor;
    ctx.font = font;
    textLines.forEach(line => {
      ctx.fillText(line, textX, textY);
      textY += lineHeight;
    });

    // Generate QR code as Data URL
    const qrText = 'https://www.example.com';
    const qrSize = 150; // QR code size in pixels

    const qrDataURL = await QRCode.toDataURL(qrText, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: qrSize,
      margin: 1
    });

    // Load QR code image
    const qrImage = await loadImage(qrDataURL);

    // Define QR code position
    const qrX = 50;
    const qrY = textY + 20; // Position below the text

    // Draw QR code onto the canvas
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    // Export canvas to PNG buffer
    const buffer = canvas.toBuffer('image/png');

    // Save PNG to file (optional)
    fs.writeFileSync('./output.png', buffer);
    console.log('PNG file saved as output.png');

    // Obtain ImageData-like object
    // Note: The canvas package does not support the exact ImageData interface,
    // but you can access pixel data using getImageData.
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

    // Example: Log the ImageData properties
    console.log('ImageData:', {
      width: imageData.width,
      height: imageData.height,
      data: imageData.data // This is a Uint8ClampedArray containing RGBA values
    });

    // If you need to work with the pixel data, you can manipulate imageData.data
    // For example, to access the first pixel's RGBA values:
    /*
    const firstPixel = {
      r: imageData.data[0],
      g: imageData.data[1],
      b: imageData.data[2],
      a: imageData.data[3]
    };
    console.log('First Pixel:', firstPixel);
    */
  } catch (error) {
    console.error('Error:', error);
  }
})();
