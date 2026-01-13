import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { getBlockedDomains } from './utils/fileHandler.js';
import { addBlockedDomainToFile, updateBlockedDomainInFile, deleteBlockedDomainFromFile } from './utils/fileHandler.js';

// __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.join(__dirname, '..', '.env')
});


const app = express();
const PORT = process.env.MANAGER_PORT || 3000;
const HOST = process.env.MANAGER_HOST || "localhost";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));



app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// GET all domains
app.get('/domains', async (req, res) => {
    try {
        const domains = await getBlockedDomains();
        res.json(domains);
    } catch {
        res.status(500).json({ error: 'Failed to fetch domains' });
    }
});

// POST new domain
app.post('/domains', async (req, res) => {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });

    try {
        const domains = await addBlockedDomainToFile(domain);
        res.json(domains);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT update domain
app.put('/domains/:id', async (req, res) => {
    const { id } = req.params;
    const { domain } = req.body;
    console.log("Updating id:", id, " to domain:", domain);
    if (!domain) return res.status(400).json({ error: 'Domain required' });

    try {
        const domains = await updateBlockedDomainInFile(id, domain);
        res.json(domains);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

// DELETE domain
app.delete('/domains/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const domains = await deleteBlockedDomainFromFile(id);
        res.json(domains);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------- Start server -------------------
//listen on host  0.0.0.0 and port from env or 3000
app.listen(PORT, HOST, () => {
    console.log(`DNS Manager running at http://${HOST}:${PORT}`);
})