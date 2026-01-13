import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { sendCommand } from './dnsConnector.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateId() {
    return crypto.randomUUID();
}

const HOSTS_FILE = path.join(__dirname, '../hosts.json');

export async function getBlockedDomains() {
    try {
        const data = await fs.promises.readFile(HOSTS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

export async function writeBlockedDomains(domains) {
    await fs.promises.writeFile(HOSTS_FILE, JSON.stringify(domains, null, 2));
}

// Add domain
export async function addBlockedDomainToFile(domain) {
    const domains = await getBlockedDomains();
    if (domains.some(d => d.domain === domain)) throw new Error('Domain already exists');

    const newDomain = { id: generateId(), domain };
    sendCommand({ action: 'add', domain });
    domains.push(newDomain);
    await writeBlockedDomains(domains);
    return domains;
}

// Update domain
export async function updateBlockedDomainInFile(id, newDomain) {
    const domains = await getBlockedDomains();
    const item = domains.find(d => d.id === id);
    if (!item) throw new Error('Domain not found');

    // Remove old, add new in Bloom filter
    sendCommand({ action: 'remove', domain: item.domain });
    sendCommand({ action: 'add', domain: newDomain });

    item.domain = newDomain;
    await writeBlockedDomains(domains);
    return domains;
}

// Delete domain
export async function deleteBlockedDomainFromFile(id) {
    const domains = await getBlockedDomains();
    const item = domains.find(d => d.id === id);
    if (!item) throw new Error('Domain not found');

    sendCommand({ action: 'remove', domain: item.domain });
    const newDomains = domains.filter(d => d.id !== id);
    await writeBlockedDomains(newDomains);
    return newDomains;
}