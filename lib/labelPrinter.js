const util = require('util'); // Utility module for promisifying functions
const pngparse = require('pngparse'); // Module for parsing PNG files
var usb = require('usb'); // Module for interacting with USB devices
const { convert } = require('./imageProcessing.js'); // Custom module for image processing
const fs = require('fs');
const {createImage} = require('./canvas.js');



// Function to print a label
function printLabel(data, vendorId, productId) {
    var printer = usb.findByIds(vendorId, productId);

    if (!printer) {
        console.log('Printer not found');
        return;
    }

    printer.open();

    var outputEndpoint = null;
    var interfaceIndex = 0;
    var interfaceClaimed = false;

    try {
        for (var iface of printer.interfaces) {
            try {
                // On macOS, skip kernel driver detachment
                if (process.platform !== 'darwin') {
                    if (iface.isKernelDriverActive()) {
                        iface.detachKernelDriver();
                    }
                }
                
                iface.claim();
                interfaceClaimed = true;

                for (var endpoint of iface.endpoints) {
                    if (endpoint.direction === 'out') {
                        outputEndpoint = endpoint;
                        break;
                    }
                }
                if (outputEndpoint) {
                    interfaceIndex = iface.interfaceNumber;
                    break;
                }
                
                iface.release();
                interfaceClaimed = false;
            } catch (ifaceError) {
                console.log(`Interface error, trying next one: ${ifaceError.message}`);
                continue;
            }
        }

        if (outputEndpoint) {
            outputEndpoint.transfer(data, function (err) {
                if (err) {
                    console.log('Error sending data:', err);
                } else {
                    console.log('Data sent');
                }
            });
        } else {
            console.log('No valid output endpoint found');
            if (interfaceClaimed) {
                printer.interfaces[interfaceIndex].release();
            }
        }
    } catch (error) {
        console.error('An error occurred:', error);
        if (interfaceClaimed) {
            printer.interfaces[interfaceIndex].release();
        }
    }
}

// Asynchronous function to print a PNG file
async function printPngFile({ imageData, vendorId, productId, options, compression }) {

        let parseBuffer = util.promisify(pngparse.parse);  
        let imgBuffer = await createImage(imageData);
        let img = await parseBuffer(imgBuffer); 
        let printData = await convert(img, options, compression); // Convert the image data
        return printLabel(printData, vendorId, productId); // Print the label using the converted data

}


module.exports = printPngFile;