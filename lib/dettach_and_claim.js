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