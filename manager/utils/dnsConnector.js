import net from 'net';
import os from 'os';

import { fileURLToPath } from 'url';
import path from 'path';

import {getBlockedDomains} from './fileHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOCKET_PATH = os.platform() === 'win32'
    ? '\\\\.\\pipe\\dns-control'
    : path.join(__dirname, 'dns-control.sock');

let dnsClient = null;
let buffer = '';
let commandQueue = [];

function connectToDnsServer() {
    dnsClient = net.createConnection(SOCKET_PATH, () => {
        console.log('Connected to DNS server');
        buffer = '';

        while (commandQueue.length) {
            dnsClient.write(JSON.stringify(commandQueue.shift()) + '\n');
        }
    });

    dnsClient.on('data', async data => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
            if (!line) continue;
            try {
                const msg = JSON.parse(line);
                if (msg.status === 'up') {
                    const domains = (await getBlockedDomains()).map(d => d.domain);
                    sendCommand({ action: 'sync', domains });
                }
            } catch (err) {
                console.error('Bad DNS message:', err);
            }
        }
    });

    dnsClient.on('close', () => {
        console.log('DNS server disconnected — retrying...');
        dnsClient = null;
        setTimeout(connectToDnsServer, 2000);
    });

    dnsClient.on('error', err => {
        console.log('DNS socket error:', err.message);
    });
}

connectToDnsServer();

export function sendCommand(cmd) {
    if (dnsClient && dnsClient.writable) {
        dnsClient.write(JSON.stringify(cmd) + '\n');
    } else {
        commandQueue.push(cmd);
    }
}
