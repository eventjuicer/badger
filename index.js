
// const jsQR = require('jsqr');
// const { createCanvas, loadImage } = require('canvas');
import escpos from 'escpos';
// USB module must be imported separately
import USB from 'escpos-usb';
// Initialize escpos
escpos.USB = USB;

// Setup printer (replace with your printer's USB device or IP address)
const device = new escpos.USB(); // For USB printers
// const device = new escpos.Network('192.168.1.x'); // For network printers
const printer = new escpos.Printer(device);


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

// Start capturing and decoding QR codes
printQRData("Hello, World!");  // Print a test message
