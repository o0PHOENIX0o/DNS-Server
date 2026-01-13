const fs = require('fs');
const net = require('net');
const path = require('path');
const os = require('os');

const dotenv = require('dotenv');
dotenv.config();

const userBlockList = new Set();

const SOCKET_PATH = os.platform() === 'win32'
    ? `\\\\.\\pipe\\${process.env.DNS_SOCKET_NAME}`             
    : path.join(__dirname, `${process.env.DNS_SOCKET_NAME}.sock`);

    
if (os.platform() !== 'win32' && fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
}


const webServer = net.createServer(socket => {
    if (socket.writable) {
        console.log('sending status up');
        socket.write(JSON.stringify({ status: 'up' }) + '\n', err => {
            if (err) console.log('Initial write failed:', err.message);
        });
    }

    let buffer = '';
    socket.on('data', data => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
            if (!line) continue;
            try {
                const cmd = JSON.parse(line);

                if (cmd.action === 'sync' && Array.isArray(cmd.domains)) {
                    userBlockList.clear();
                    cmd.domains.forEach(d => userBlockList.add(d.toLowerCase()));
                    console.log(`Synced ${cmd.domains.length} domains`);
                    console.log(userBlockList);

                }

                else if (cmd.action === 'add') {
                    userBlockList.add(cmd.domain.toLowerCase());
                }

                else if (cmd.action === 'remove') {
                    userBlockList.delete(cmd.domain.toLowerCase());
                }
            } catch (err) {
                console.error('Invalid command:', err);
            }
        }
    });

    socket.on('error', err => {
        if (err.code === 'EPIPE') {
            console.log('Client disconnected before write');
        } else {
            console.error('Socket error:', err);
        }
    });
});


webServer.listen(SOCKET_PATH, () => {
    console.log(`Control socket listening on ${SOCKET_PATH}`);
});


module.exports = { userBlockList };