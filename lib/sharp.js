// createImage.js

const sharp = require('sharp');
const QRCode = require('qrcode');

/**
 * Function to create an SVG containing three lines of text.
 * @param {Array<string>} lines - The lines of text to include.
 * @param {number} width - Width of the SVG.
 * @param {number} height - Height of the SVG.
 * @param {number} x - X-coordinate for text placement.
 * @param {number} y - Starting Y-coordinate for text placement.
 * @param {number} lineHeight - Space between lines.
 * @param {string} font - Font style.
 * @param {string} color - Text color.
 * @returns {string} SVG string.
 */
function createTextSVG(lines, width, height, x, y, lineHeight, font, color) {
  const svgLines = lines
    .map(
      (line, index) => `<text x="${x}" y="${y + index * lineHeight}" font-family="${font}" font-size="20" fill="${color}">${line}</text>`
    )
    .join('\n');

  return `
    <svg width="${width}" height="${height}">
      <style>
        text {
          dominant-baseline: middle;
        }
      </style>
      ${svgLines}
    </svg>
  `;
}

(async () => {
  try {
    // 1. Define Image Dimensions
    const canvasWidth = 500;
    const canvasHeight = 500;

    // 2. Define Text Properties
    const textLines = [
      'First Line of Text',
      'Second Line of Text',
      'Third Line of Text'
    ];
    const textX = 50; // X-coordinate for text
    const textY = 50; // Starting Y-coordinate for text
    const lineHeight = 30; // Space between lines
    const font = 'Arial'; // Font family
    const textColor = '#000000'; // Text color

    // 3. Create Text SVG
    const textSVG = createTextSVG(
      textLines,
      canvasWidth,
      canvasHeight,
      textX,
      textY,
      lineHeight,
      font,
      textColor
    );

    // 4. Generate QR Code as Buffer
    const qrText = 'https://www.example.com'; // Content for QR code
    const qrSize = 150; // QR code size in pixels

    const qrBuffer = await QRCode.toBuffer(qrText, {
      errorCorrectionLevel: 'H', // High error correction
      type: 'png', // PNG format
      width: qrSize, // Width of QR code
      margin: 1 // Margin around QR code
    });

    // 5. Create Base Image (White Background)
    const baseImage = sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });

    // 6. Composite Text SVG and QR Code onto Base Image
    const finalImage = await baseImage
      .composite([
        {
          input: Buffer.from(textSVG),
          top: 0,
          left: 0
        },
        {
          input: qrBuffer,
          top: textY + textLines.length * lineHeight + 20, // Position QR code below the text
          left: 50
        }
      ])
      .png()
      .toBuffer();

    // 7. Save Final Image to File
    await sharp(finalImage).toFile('output.png');
    console.log('PNG file saved as output.png');

    // 8. Extract Pixel Data
    // To get ImageData-like pixel data, we need the raw RGBA buffer
    const { data, info } = await sharp(finalImage)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Convert the raw buffer to a Uint8ClampedArray
    const imageData = {
      width: info.width,
      height: info.height,
      data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length)
    };

    // Example: Log ImageData properties
    console.log('ImageData:', {
      width: imageData.width,
      height: imageData.height,
      dataLength: imageData.data.length // Total number of bytes
    });

    // 9. (Optional) Manipulate Pixel Data
    // Example: Invert colors
    /*
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 255 - imageData.data[i];       // Red
      imageData.data[i + 1] = 255 - imageData.data[i + 1]; // Green
      imageData.data[i + 2] = 255 - imageData.data[i + 2]; // Blue
      // Alpha remains unchanged
    }

    // Create a new image from modified pixel data
    const invertedImageBuffer = await sharp(imageData.data, {
      raw: {
        width: imageData.width,
        height: imageData.height,
        channels: 4
      }
    })
      .png()
      .toBuffer();

    // Save the inverted image
    await sharp(invertedImageBuffer).toFile('output_inverted.png');
    console.log('Inverted PNG file saved as output_inverted.png');
    */

    // 10. (Optional) Access Specific Pixel Data
    // Get RGBA values of the first pixel
    const firstPixel = {
      r: imageData.data[0],
      g: imageData.data[1],
      b: imageData.data[2],
      a: imageData.data[3]
    };
    console.log('First Pixel RGBA:', firstPixel);
  } catch (error) {
    console.error('Error:', error);
  }
})();
