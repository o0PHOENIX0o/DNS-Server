const { BloomFilter } = require('bloom-filters');
const fs = require('fs');
const net = require('net');
const path = require('path');
const os = require('os');

const { userBlockList } = require('./dynamicHosts');

// ------------------- Bloom Filter -------------------
const filter = BloomFilter.create(
  500_000,   // expected elements
  0.001      // false positive rate
);

const loadBlocklist = (file) => {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) filter.add(trimmed.toLowerCase());
    }
    console.log(`Loaded blocklist with ${filter.size} entries`);
};

const isBlocked = (domain) => {
    if(userBlockList.has(domain.toLowerCase())) {
        return true;
    }
    return filter.has(domain.toLowerCase());
};

module.exports = { loadBlocklist, isBlocked };
