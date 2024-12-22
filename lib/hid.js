






const HID = require('node-hid');
console.log(HID.devices());




// list-hid-devices.js

const devices = HID.devices();

console.log('Connected HID Devices:');
devices.forEach((device, index) => {
  console.log(`${index + 1}:`);
  console.log(`  Vendor ID: ${device.vendorId.toString(16)}`);
  console.log(`  Product ID: ${device.productId.toString(16)}`);
  console.log(`  Path: ${device.path}`);
  console.log(`  Manufacturer: ${device.manufacturer}`);
  console.log(`  Product: ${device.product}`);
  console.log(`  Serial Number: ${device.serialNumber}`);
  console.log('---------------------------');
});





try {
    const device = new HID.HID(0x0581, 0x0115);
  
    device.on('data', (data) => {
      // data is a Buffer. You’ll need to parse it according to
      // how your scanner sends its barcode data (often HID usage pages).
      console.log('Raw data buffer:', data);
  
      // Possibly convert bytes to readable string if the scanner sends ASCII codes
      // Example: console.log('Scanned data:', data.toString('ascii'));
    });
  
    device.on('error', (err) => {
      console.error('Error from HID device:', err);
    });
  
  } catch (err) {
    console.error('Could not open HID device:', err);
  }
