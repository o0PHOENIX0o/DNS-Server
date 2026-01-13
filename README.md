# Custom Node.js DNS Server with Web Management

A lightweight, Raspberry Pi–compatible DNS server with a web interface for managing blocked hosts.  
It blocks ads and malware using a Bloom filter with a configurable false positive rate and supports dynamic host updates via Unix sockets or named pipes.

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



**Flow:**
1. DNS server loads static hosts and Bloom filter on startup.
2. Webserver provides REST API / UI to manage hosts.
3. Dynamic host changes are persisted in JSON and sent to DNS server via socket.
4. DNS server updates Bloom filter dynamically and resolves queries, blocking matched hosts.

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
