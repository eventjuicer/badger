// server.js
const printPngFile = require("./lib/labelPrinter.js");
const net = require('net');
import('node-fetch').then(({ default: fetch }) => {
    // Define the port and host
    const PORT = 12346;
    const HOST = '127.0.0.1';

    // Create a server instance
    const server = net.createServer((socket) => {
        // Enable keep-alive on the socket
        socket.setKeepAlive(true);
        
        console.log('Client connected:', socket.remoteAddress + ':' + socket.remotePort);

        // Handle incoming data
        socket.on('data', async (data) => {
            const receivedData = data.toString().trim();
            console.log('Received URL:', receivedData);
            
            // Extract code after /p/
            const match = receivedData.match(/\/p\/([^\/\s]+)$/);
            if (match && match[1]) {
                const code = match[1];
                console.log('Extracted code:', code);
                
                try {
                    const response = await fetch(`https://ecomm.berlin/api/terminal/${code}`);
                    const data = await response.json();
                    
                    if (data?.external_id) {
                        console.log('PDF fetched successfully');
                        
                        printPngFile({
                            imageData: {
                                fname: data.fname,
                                lname: data.lname,
                                cname: data.cname,
                                qrText: `https://ecomm.berlin/p/${data.code}`,
                            },
                            vendorId: 0x04f9,
                            productId: 0x2029,
                            options: { landscape: true, labelWidth: "62-mm-wide continuous" }, //"102-mm-wide continuous"
                            compression: { enable: true },
                        });
                        
                    } else {
                        console.error('Failed to fetch PDF:', response.status);
                    }
                } catch (error) {
                    console.error('Error fetching PDF:', error);
                }
            } else {
                console.error('Invalid URL format:', receivedData);
            }
        });
        

        // Handle client disconnection
        socket.on('end', () => {
            console.log('Client disconnected');
        });

        // Handle errors
        socket.on('error', (err) => {
            console.error('Socket error:', err);
        });
    });

    // Handle server errors with retry
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log('Address in use, retrying...');
            setTimeout(() => {
                server.close();
                server.listen(PORT, HOST);
            }, 1000);
        } else {
            console.error('Server error:', err);
        }
    });

    // Enable port reuse
    server.on('listening', () => {
        console.log(`Socket server listening on ${HOST}:${PORT}`);
    });

    // Start listening on the specified port and host
    server.listen(PORT, HOST, () => {
        console.log(`Socket server listening on ${HOST}:${PORT}`);
    });
});
