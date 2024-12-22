// createImage.js

const { createCanvas, loadImage, registerFont, ImageData } = require('@napi-rs/canvas'); // Corrected import
const QRCode = require('qrcode');
const fs = require('fs');

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
    const canvasWidth = 500;
    const canvasHeight = 500;

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
    const textX = 50; // X-coordinate for text
    let textY = 50; // Starting Y-coordinate for text
    const lineHeight = 40; // Space between lines
    const font = '20px Arial'; // Font style
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
    const qrText = 'https://www.example.com';
    const qrSize = 150; // QR code size in pixels
    const qrDataURL = await generateQRCode(qrText, qrSize);

    // 7. Load QR Code Image
    const qrImage = await loadImage(qrDataURL);

    // 8. Draw QR Code onto Canvas
    const qrX = 50; // X-coordinate for QR code
    const qrY = textY + 20; // Y-coordinate for QR code (below text)
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    // 9. Export Canvas to PNG Buffer
    const pngBuffer = canvas.toBuffer('image/png');

    // 10. Save PNG to File (Optional)
    // fs.writeFileSync('output.png', pngBuffer);
    console.log('PNG file saved as output.png');

    return pngBuffer

    // 11. Extract Pixel Data (ImageData-like)
    // Use getImageData to retrieve raw pixel data
    const rawImageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const imageDataObject = {
      width: rawImageData.width,
      height: rawImageData.height,
      data: rawImageData.data, // Uint8ClampedArray containing RGBA values
    };

    console.log('ImageData:', {
      width: imageDataObject.width,
      height: imageDataObject.height,
      dataLength: imageDataObject.data.length, // Total number of bytes
    });

    // 12. Accessing Specific Pixels
    const getPixelRGBA = (x, y, imgData) => {
      const { width, data } = imgData;
      const index = (y * width + x) * 4;
      return {
        r: data[index],
        g: data[index + 1],
        b: data[index + 2],
        a: data[index + 3],
      };
    };

    // Example: Get RGBA of the first pixel (0,0)
    const firstPixel = getPixelRGBA(0, 0, imageDataObject);
    console.log('First Pixel RGBA:', firstPixel);

    // Example: Get RGBA of pixel at (100, 100)
    const pixelAt100_100 = getPixelRGBA(100, 100, imageDataObject);
    console.log('Pixel at (100,100):', pixelAt100_100);

    // 13. (Optional) Manipulate Pixel Data
    // Example: Invert Colors
    for (let i = 0; i < imageDataObject.data.length; i += 4) {
      imageDataObject.data[i] = 255 - imageDataObject.data[i];       // Red
      imageDataObject.data[i + 1] = 255 - imageDataObject.data[i + 1]; // Green
      imageDataObject.data[i + 2] = 255 - imageDataObject.data[i + 2]; // Blue
      // Alpha (imageDataObject.data[i + 3]) remains unchanged
    }

    // 14. Create a New Canvas for the Inverted Image
    const invertedCanvas = createCanvas(imageDataObject.width, imageDataObject.height);
    const invertedCtx = invertedCanvas.getContext('2d');

    // 15. Create ImageData from Modified Data
    const invertedImageData = new ImageData(
      new Uint8ClampedArray(imageDataObject.data),
      imageDataObject.width,
      imageDataObject.height
    );

    // 16. Put ImageData onto the New Canvas
    invertedCtx.putImageData(invertedImageData, 0, 0);

    // 17. Export Inverted Canvas to PNG Buffer
    const invertedPngBuffer = invertedCanvas.toBuffer('image/png');

    // 18. Save Inverted Image to File (Optional)
    fs.writeFileSync('output_inverted.png', invertedPngBuffer);
    console.log('Inverted PNG file saved as output_inverted.png');
  } catch (error) {
    console.error('Error:', error);
  }
}

module.exports = {createImage};