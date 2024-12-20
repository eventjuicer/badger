
/**
 * https://www.npmjs.com/package/node-brother-label-printer
 * sudo apt-get install build-essential libudev-dev
*/


import pkg from 'node-brother-label-printer';
const { printPngFile } = pkg;


printPngFile({
  vendorId: 0x04f9,
  productId: 0x209d,
  filename: "./sample.png",
  options: { landscape: false, labelWidth: "62-mm-wide continuous" }, //"102-mm-wide continuous"
  compression: { enable: true },
});