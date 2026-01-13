
/*
DNS Request format
[ HEADER ]
AA BB 01 00 00 01 00 00 00 00 00 00

[ QUESTION ]
06 67 6f 6f 67 6c 65 03 63 6f 6d 00 : 06:length , 67 6f 6f 67 6c 65 → google, 03->length, 63 6f 6d → com, 00: null byte (end)
00 01 : QTYPE: A (host address)
00 01 : QCLASS: IN (internet)

DNS Response format
[ HEADER ]
AA BB 81 80 00 01 00 01 00 00 00 00: AA BB: ID, 81 80: Flags, 00 01: QDCOUNT, 00 01: ANCOUNT, 00 00: NSCOUNT, 00 00: ARCOUNT

[ QUESTION ]
06 67 6f 6f 67 6c 65 03 63 6f 6d 00
00 01
00 01

[ ANSWER ]
C0 0C : NAME: pointer to offset 0x0c (the domain name in the question section)
00 01 : TYPE: A (host address)
00 01 : CLASS: IN (internet)
00 00 00 3C : TTL: 60 seconds
00 04 : RDLENGTH: 4 bytes
D8 3A D3 8E : RDATA: resource data (IPv4 address)
*/

const dotenv = require("dotenv");
const path = require("path");
dotenv.config({
   path: path.join(__dirname, '..', '.env')
});

const dgram = require("dgram");
const packet = require("dns-packet");

const { loadBlocklist, isBlocked } = require("./util/bloomFilter.js");

/* =========================
   Logging Utilities
========================= */

function logSection(title) {
    console.log("\n" + "=".repeat(70));
    console.log(` ${title}`);
    console.log("=".repeat(70));
}

function logKey(label, value) {
    console.log(`  ${label.padEnd(15)}: ${value}`);
}

function logDivider() {
    console.log("-".repeat(70));
}

/* =========================
   Server Setup
========================= */

const udpSocket = dgram.createSocket("udp4");
const upstream = dgram.createSocket("udp4");

const PORT = process.env.DNS_PORT || 5353;
const HOST = process.env.DNS_HOST || "0.0.0.0";


const adminPage = "dnsmanager.test";
const ADMIN_IP = "192.168.1.83";

const pending = new Map();

udpSocket.bind(PORT, HOST);

/* =========================
   Incoming DNS Requests
========================= */

udpSocket.on("message", (msg, rinfo) => {
    let query;

    try {
        query = packet.decode(msg);
    } catch (err) {
        logSection("DNS PACKET DECODE ERROR");
        console.error(err);
        return;
    }

    if (!query.questions || query.questions.length === 0) return;

    const q = query.questions[0];
    const domain = q.name;

    logSection("DNS QUERY RECEIVED");
    logKey("Domain", domain);
    logKey("Client IP", rinfo.address);
    logKey("Client Port", rinfo.port);
    logKey("Query ID", query.id);

    /* =========================
       Admin Page Handling
    ========================= */

    if (domain === adminPage) {
        logSection("ADMIN PAGE REQUEST");
        logKey("Domain", adminPage);
        logKey("Response IP", ADMIN_IP);
        logDivider();
        console.log(" Authoritative admin response sent");

        const response = packet.encode({
            type: "response",
            id: query.id,
            flags: packet.RESPONSE | packet.AUTHORITATIVE_ANSWER,
            questions: query.questions,
            answers: [{
                type: "A",
                name: adminPage,
                ttl: 300,
                data: ADMIN_IP
            }]
        });

        udpSocket.send(response, rinfo.port, rinfo.address);
        return;
    }

    /* =========================
       Blocked Domains
    ========================= */

    if (isBlocked(domain)) {
        logSection("BLOCKED DOMAIN");
        logKey("Domain", domain);
        logKey("Action", "NXDOMAIN");
        logDivider();
        console.log(" Blocked by Bloom filter");

        const response = packet.encode({
            type: "response",
            id: query.id,
            flags: packet.AUTHORITATIVE_ANSWER,
            questions: query.questions,
            answers: [],
            rcode: "NXDOMAIN"
        });

        udpSocket.send(response, rinfo.port, rinfo.address);
        return;
    }

    /* =========================
       Forward to Upstream DNS
    ========================= */

    logSection("FORWARDING TO UPSTREAM DNS");
    logKey("Domain", domain);
    logKey("Upstream", "8.8.8.8:53");
    logKey("Query ID", query.id);

    pending.set(query.id, rinfo);
    upstream.send(msg, 53, "8.8.8.8");
});

/* =========================
   Upstream DNS Responses
========================= */

upstream.on("message", (res) => {
    let decoded;

    try {
        decoded = packet.decode(res);
    } catch {
        return;
    }

    const rinfo = pending.get(decoded.id);
    if (!rinfo) return;

    logSection("UPSTREAM RESPONSE RECEIVED");
    logKey("Query ID", decoded.id);
    logKey("Client IP", rinfo.address);
    logKey("Client Port", rinfo.port);
    logDivider();
    console.log(" Response forwarded to client");

    udpSocket.send(res, rinfo.port, rinfo.address);
    pending.delete(decoded.id);
});

/* =========================
   Server Startup
========================= */

udpSocket.on("listening", () => {
    loadBlocklist("./hosts/hosts.txt");

    const address = udpSocket.address();

    logSection("DNS SERVER STARTED");
    logKey("Bind Address", address.address);
    logKey("Bind Port", address.port);
    logKey("Admin Page", adminPage);
    logKey("Blocklist", "hosts/hosts.txt loaded");
});

/* =========================
   Error Handling
========================= */

udpSocket.on("error", (err) => {
    logSection("UDP SOCKET ERROR");
    console.error(err);
});