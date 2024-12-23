// server.js

const net = require('net');

// Define the port and host
const PORT = 12345;
const HOST = '127.0.0.1';

// Create a server instance
const server = net.createServer((socket) => {
    console.log('Client connected:', socket.remoteAddress + ':' + socket.remotePort);

    // Handle incoming data
    socket.on('data', (data) => {
        const receivedData = data.toString().trim();
        try {
            const json = JSON.parse(receivedData);
            if (json.url) {
                console.log('Received URL:', json.url);
                // Further processing...
            } else {
                console.log('Received data:', json);
            }
            socket.write('ACK\n');
            
        } catch (err) {
            console.log('Received non-JSON data:', receivedData);
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

// Start listening on the specified port and host
server.listen(PORT, HOST, () => {
    console.log(`Socket server listening on ${HOST}:${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
    console.error('Server error:', err);
});
