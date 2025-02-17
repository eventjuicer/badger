
/**
 * https://www.npmjs.com/package/node-brother-label-printer
 * sudo apt-get install build-essential libudev-dev
 * vendor and product command: lsusb
 * Bus 001 Device 003: ID 04f9:2029 Brother Industries, Ltd QL-580N
 * access problem?
 * sudo chmod -R 777 /dev/bus/usb
 * MAC
 * sudo killall -HUP usbd
 * 
*/

// QL-700:
// Product ID: 0x2042
// Vendor ID: 0x04f9  (Brother International Corporation)
//QL-570:
// Product ID: 0x2028
// Vendor ID: 0x04f9  (Brother International Corporation)

const printPngFile = require("./lib/labelPrinter.js");
//QL-580:
//vendorId: 0x04f9,
//productId: 0x2029,

//printPngFile();



printPngFile({
  vendorId: 0x04f9,
  productId: 0x2028,
  filename: "./sample.png",
  options: { landscape: true, labelWidth: "62-mm-wide continuous" }, //"102-mm-wide continuous"
  compression: { enable: true },
});


