# Custom Node.js DNS Server with Web Management

A lightweight, Raspberry Pi–compatible DNS server with a web interface for managing blocked hosts. It blocks ads and malware using a Bloom filter with a configurable false positive rate and supports dynamic host updates via Unix sockets or named pipes.

## Features

- **Ad & Malware Blocking**  
  Blocks hosts specified in `hosts.txt` from sources like StevenBlack, OISD, Hageiz.

- **Bloom Filter Implementation**  
  Efficient host lookup with a 0.1 false positive rate.

- **Dynamic Host Management**  
  Add, update, or remove hosts via web interface or API. Changes are reflected in the DNS server in real-time.

- **Persistence**  
  Dynamic hosts stored in `dynamic_hosts.json` for restart resilience.

- **Cross-Platform Socket Communication**  
  Uses Unix sockets on Linux and named pipes on Windows to synchronize host changes between webserver and DNS server.

- **Raspberry Pi–Friendly**  
  Lightweight and easily deployable on Raspberry Pi, suitable for home network ad-blocking.

## Flow

1. DNS server loads static hosts and Bloom filter on startup.
2. Webserver provides REST API / UI to manage hosts.
3. Dynamic host changes are persisted in JSON and sent to DNS server via socket.
4. DNS server updates Bloom filter dynamically and resolves queries, blocking matched hosts.

## Architeture

![architecture](.\DNServer\assets\architecture.png)

## DNS Header (12 bytes)

![img](.\DNServer\assets\dns_header.png)

### 1. ID (16 bits)

- A transaction identifier chosen by the client.
- The server copies this value into the response.
- Purpose: match responses to outstanding queries.

### 2. Flags (16 bits total)

This row is subdivided into several bit fields:

#### a. QR (1 bit)

- 0 = Query
- 1 = Response

Indicates whether the message is a query or a reply.

#### b. Opcode (4 bits)

Specifies the type of query:

| Value | Meaning |
|-------|---------|
| 0 | Standard query |
| 1 | Inverse query (obsolete) |
| 2 | Server status request |
| 3–15 | Reserved |

#### c. AA – Authoritative Answer (1 bit)

Set to 1 in responses when the server is authoritative for the queried domain. Meaningful only in responses.

#### d. TC – Truncated (1 bit)

Set to 1 if the message was truncated due to length limits (commonly with UDP). Indicates the client should retry using TCP.

#### e. RD – Recursion Desired (1 bit)

Set by the client to request recursive resolution. Commonly 1 for stub resolvers.

#### f. RA – Recursion Available (1 bit)

Set by the server if it supports recursion. Meaningful only in responses.

#### g. Z (3 bits)

Reserved for future use. Must be 0 in all standard DNS messages. Sometimes repurposed by extensions (e.g., DNSSEC).

#### h. RCODE – Response Code (4 bits)

Indicates the result of the query:

| Value | Meaning |
|-------|---------|
| 0 | No error |
| 1 | Format error |
| 2 | Server failure |
| 3 | Name Error (NXDOMAIN) |
| 4 | Not implemented |
| 5 | Refused |

### 3. QDCOUNT – Question Count (16 bits)

Number of entries in the Question Section. Typically 1 for standard queries.

### 4. ANCOUNT – Answer Record Count (16 bits)

Number of resource records in the Answer Section. Zero in most queries; nonzero in responses.

### 5. NSCOUNT – Authority Record Count (16 bits)

Number of resource records in the Authority Section. Used to indicate authoritative name servers.

### 6. ARCOUNT – Additional Record Count (16 bits)

Number of resource records in the Additional Section. Often used for glue records or OPT records (EDNS).

## DNS Question

![img](.\DNServer\assets\dns_question.png)

### a. QNAME (variable length)

The domain name being queried. Encoded as a sequence of labels:

```
<length><label><length><label>...<0>
```

Example: www.example.com
```
03 'w''w''w' 07 'e''x''a''m''p''l''e' 03 'c''o''m' 00
```

### b. QTYPE (16 bits)

Specifies the type of record requested.

| Value | Meaning |
|-------|---------|
| 1 | A (IPv4 address) |
| 28 | AAAA (IPv6 address) |
| 5 | CNAME |
| 15 | MX |
| 2 | NS |
| 12 | PTR |
| 255 | ANY |

### c. QCLASS (16 bits)

Specifies the class of the query.

| Value | Meaning |
|-------|---------|
| 1 | IN (Internet) |

In practice, almost always IN.



## DNS Answer

![img](.\DNServer\assets\dns_answer.png)

### a. NAME (variable length)

Domain name to which this record applies. Usually compressed using pointers (RFC 1035 name compression).

### b. TYPE (16 bits)

Record type (same values as QTYPE).

### c. CLASS (16 bits)

Usually IN (Internet).

### d. TTL (32 bits)

Time (in seconds) the record may be cached. Example: 300 = 5 minutes.

### e. RDLENGTH (16 bits)

Length (in bytes) of the RDATA field.

### f. RDATA (variable length)

Actual record data; format depends on TYPE.

### Common RDATA formats

| TYPE | RDATA Contents |
|------|----------------|
| A | 32-bit IPv4 address |
| AAAA | 128-bit IPv6 address |
| CNAME | Domain name |
| NS | Domain name |
| MX | Preference (16 bits) + domain name |
| SOA | Multiple fields (MNAME, RNAME, SERIAL, etc.) |


## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/custom-dns.git
cd custom-dns
```

2. Install dependencies for both server and webserver:

```bash
cd DNServer && npm install
cd ../manager && npm install
```

3. Prepare hosts.txt with static hosts from your preferred sources.

4. Start the DNS server:

```bash
cd DNServer
node main.js
```

5. Start the webserver:

```bash
cd manager
node index.js
```

6. Configure your router or devices to use the Raspberry Pi IP as the DNS server.

## Usage

- Access the web interface or REST API to add, update, or remove hosts.
- Changes are automatically synced to the DNS server in real-time.
- All dynamic hosts are saved in `dynamic_hosts.json`.

## File Structure

```
/dns
│
├── DNServer/
│   ├── main.js
│   ├── hosts/
│   │   ├── hosts.txt
│   │   ├── hagezi.txt
│   │   ├── oisd.txt
│   │   ├── oneHosts.txt
│   │   ├── stevenHosts.txt
│   │   └── urlhausHosts.txt
│   ├── util/
│   │   ├── bloomFilter.js
│   │   └── dynamicHosts.js
│   └── package.json
│
├── manager/
│   ├── index.js
│   ├── hosts.json
│   ├── public/
│   │   ├── index.html
│   │   ├── script.js
│   │   └── styles.css
│   ├── utils/
│   │   ├── dnsConnector.js
│   │   └── fileHandler.js
│   └── package.json
│
└── README.md
```

## Dependencies

- **Node.js 18+**
- **dns2** – DNS server handling
- **bloom-filters** – Bloom filter implementation
- **express** – Web server
- **net** – Built-in module for socket communication

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
