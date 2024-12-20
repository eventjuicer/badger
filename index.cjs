
/**
 * https://www.npmjs.com/package/node-brother-label-printer
 * sudo apt-get install build-essential libudev-dev
 * Bus 001 Device 003: ID 04f9:2029 Brother Industries, Ltd QL-580N
*/


const { printPngFile } = require("node-brother-label-printer");

printPngFile({
  vendorId: 0x04f9,
  productId: 0x2029,
  filename: "./sample.png",
  options: { landscape: false, labelWidth: "62-mm-wide continuous" }, //"102-mm-wide continuous"
  compression: { enable: true },
});