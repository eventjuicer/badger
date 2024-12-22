const HID = require('node-hid');
console.log(HID.devices());


try {
    const device = new HID.HID(1409, 277);
  
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