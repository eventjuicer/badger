const usb = require('usb');

// Find the device by vendorId and productId
const device = usb.findByIds(0x0581, 0x0115);

if (!device) {
  console.log("Device not found");
  process.exit(1);
}

// Open the device
device.open();

// For each interface, detach the kernel driver if needed
device.interfaces.forEach(iface => {
  if (iface.isKernelDriverActive()) {
    try {
      iface.detachKernelDriver();
      console.log("Detached kernel driver");
    } catch (err) {
      console.error("Error detaching driver:", err);
    }
  }
  iface.claim();
});




const HID = require('node-hid');
console.log(HID.devices());


try {
    const device = new HID.HID(0x0581, 0x0115);
  
    device.on('data', (data) => {
      // data is a Buffer. You ^`^yll need to parse it according to
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

