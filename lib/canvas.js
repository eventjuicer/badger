// createImage.js

const { createCanvas, loadImage, registerFont } = require('@napi-rs/canvas'); // Corrected import
const QRCode = require('qrcode');


/**
 * Function to generate a QR code as a data URL.
 * @param {string} text - The data to encode in the QR code.
 * @param {number} size - The width and height of the QR code in pixels.
 * @returns {Promise<string>} - A promise that resolves to a data URL of the QR code.
 */
async function generateQRCode(text, size) {
  try {
    const qrDataURL = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: size,
      margin: 1,
    });
    return qrDataURL;
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

/**
 * Function to create an image with text and a QR code.
 */
async function createImage() {
  try {
    // 1. Define Canvas Dimensions
    const canvasWidth = 1000;
    const canvasHeight = 620;

    // 2. Create Canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // 3. Fill Background with White Color
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 4. Define Text Properties
    const textLines = [
      'First Line of Text',
      'Second Line of Text',
      'Third Line of Text',
    ];
    const textX = 20; // X-coordinate for text
    let textY = 20; // Starting Y-coordinate for text
    const lineHeight = 40; // Space between lines
    const font = '30px Arial'; // Font style
    const textColor = '#000000'; // Text color

    // Optional: Register a custom font if needed
    // registerFont('path/to/font.ttf', { family: 'CustomFont' });
    // ctx.font = '20px CustomFont';

    // 5. Draw Text Lines
    ctx.fillStyle = textColor;
    ctx.font = font;
    ctx.textBaseline = 'top'; // Align text from the top
    textLines.forEach((line) => {
      ctx.fillText(line, textX, textY);
      textY += lineHeight;
    });

    // 6. Generate QR Code
    const qrText = 'https://expojuicer.com/p/';
    const qrSize = 150; // QR code size in pixels
    const qrDataURL = await generateQRCode(qrText, qrSize);

    // 7. Load QR Code Image
    const qrImage = await loadImage(qrDataURL);

    // 8. Draw QR Code onto Canvas
    const qrX = 500; // X-coordinate for QR code
    const qrY = textY + 20; // Y-coordinate for QR code (below text)
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    const pngBuffer = canvas.toBuffer('image/png');

    return pngBuffer

  } catch (error) {
    console.error('Error:', error);
  }
}

module.exports = {createImage};