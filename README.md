# Betacrew Exchange Server

### Table of Contents

1. Project Overview
2. Features
3. Usage


#### 1. Project Overview

The Betacrew Exchange Server project simulates a client-server interaction where the server streams packets of financial data, and the client handles these packets, ensuring data integrity through validation and missing packet requests. The client generates a final JSON output containing all the packet data once the communication completes successfully.


#### 2. Features

* **Data streaming over TCP:** The client connects to the server and streams packet data sequentially.
* **Packet validation:** Each received packet is validated for its size and structure, ensuring data integrity.
* **Missing packet detection:** If packets are received out of order or skipped, the client detects the missing packets and reconnects to the server to request the missing data.
* **Reconnection support:** Graceful reconnection and error handling ensure that missing packets are requested and received.
* **JSON generation:** Once all packets are received, a JSON file is generated with the packet data.
* **Graceful error handling:** Handles network errors, disconnections, and incorrect packet formats gracefully.


#### 3. Usage


1. Start the main server by running the script:

   ```
   node main.js
   ```
2. Start the client server by running the script:

   ```
   node client.js
   ```

3. The client will:

* Connect to the server on`127.0.0.1:3000`.
* Request packets from the server.
* Detect and log any missing packets.
* Reconnect to the server if necessary to request missing packets.
* Generate a JSON file (`packets.json`) with all the received packet data.
