const net = require('net');
const fs = require('fs');

let client = new net.Socket();
let missingPackets = []; 
let receivedSequences = new Set(); 
let packetDataMap = {}; 
let expectedSeq = 1; 

function connectToServer() {
    client.connect(3000, '127.0.0.1', () => {
        console.log('Connected to server');
        sendInitialRequest();
    });
}

function sendInitialRequest() {
    const buffer = Buffer.alloc(2); 
    buffer.writeUInt8(1, 0); 
    buffer.writeUInt8(0, 1); 

    console.log('Sending request to stream all packets.');
    client.write(buffer);
}

client.on('data', (data) => {
    for (let offset = 0; offset < data.length; offset += 17) {
        const packet = Buffer.alloc(17);
        data.copy(packet, 0, offset, offset + 17);
        const seq = packet.readUInt32BE(13); 
        console.log(`Packet received with sequence: ${seq}`);
        // Packet size validation
        if (packet.length !== 17) {
            console.error(`Invalid packet size: ${packet.length} bytes. Expected 17 bytes.`);
            continue; 
        }

        if (!validatePacket(packet, seq)) {
            console.error(`Packet validation failed for sequence ${seq}.`);
            continue; 
        }

        if (seq !== expectedSeq) {
            for (let i = expectedSeq; i < seq; i++) {
                console.log(`Missing sequence: ${i}`);
                missingPackets.push(i);
            }
        }

        receivedSequences.add(seq);
        expectedSeq = seq + 1; 

        storePacketData(packet, seq);
    }
});

client.on('end', () => {
    if (missingPackets.length > 0) {
        requestMissingPackets();
    } else {
        console.log('All packets received. Generating JSON output file.');
        generateJSONFile();
        client.end(); 
    }
});

// Packet Data Validation
function validatePacket(packet, sequence) {
    const symbol = packet.slice(0, 4).toString('ascii').trim(); 
    const buySell = packet.slice(4, 5).toString('ascii');  
    const quantity = packet.readInt32BE(5);  
    const price = packet.readInt32BE(9);  

    // Validate symbol (ASCII characters, non-empty)
    if (!symbol.match(/^[A-Za-z0-9]+$/) || symbol.length === 0) {
        console.error(`Invalid symbol '${symbol}' for sequence ${sequence}.`);
        return false;
    }

    // Validate buy/sell flag (should be 'B' or 'S')
    if (buySell !== 'B' && buySell !== 'S') {
        console.error(`Invalid buy/sell flag '${buySell}' for sequence ${sequence}.`);
        return false;
    }

    // Validate quantity (should be a positive number)
    if (quantity <= 0) {
        console.error(`Invalid quantity '${quantity}' for sequence ${sequence}.`);
        return false;
    }

    // Validate price (should be a positive number)
    if (price <= 0) {
        console.error(`Invalid price '${price}' for sequence ${sequence}.`);
        return false;
    }

    return true;
}

// Function to store the individual packet data
function storePacketData(packet, sequence) {
    const symbol = packet.slice(0, 4).toString('ascii').trim();  
    const buySell = packet.slice(4, 5).toString('ascii');  
    const quantity = packet.readInt32BE(5);  
    const price = packet.readInt32BE(9);  

    packetDataMap[sequence] = {
        symbol: symbol,
        buySell: buySell,
        quantity: quantity,
        price: price,
        sequence: sequence
    };
}

// Function to request missing packets
function requestMissingPackets() {
    let reconnectClient = new net.Socket();
    
    reconnectClient.connect(3000, '127.0.0.1', () => {
        console.log('Reconnected to server to request missing packets.');
        missingPackets.forEach((seq) => {
            const buffer = Buffer.alloc(2);
            buffer.writeUInt8(2, 0); 
            buffer.writeUInt8(seq, 1); 

            console.log(`Requesting for sequence: ${seq}`);
            reconnectClient.write(buffer);  
        });
    });

    reconnectClient.on('data', (data) => {
        for (let offset = 0; offset < data.length; offset += 17) {
            const packet = Buffer.alloc(17);
            data.copy(packet, 0, offset, offset + 17);
            const seq = packet.readUInt32BE(13);
            
            if (validatePacket(packet, seq)) {
                storePacketData(packet, seq);
                missingPackets = missingPackets.filter(item => item !== seq);
            }
        }

        if (missingPackets.length === 0) {
            console.log('All missing packets have been received.');
            generateJSONFile();
            reconnectClient.end(); 
            client.end(); 
        }
    });

    reconnectClient.on('end', () => {
        console.log('Reconnection closed.');
    });

    reconnectClient.on('error', (err) => {
        console.error(`Error during reconnection: ${err.message}`);
        reconnectClient.end();
    });
}

// Generate the JSON output file
function generateJSONFile() {
    const packetList = [];

    Object.keys(packetDataMap).sort((a, b) => a - b).forEach(seq => {
        packetList.push(packetDataMap[seq]);
    });

    const jsonOutput = JSON.stringify(packetList, null, 2);
    fs.writeFileSync('packets.json', jsonOutput, 'utf8');
    console.log('JSON file generated: packets.json');
}

client.on('error', (err) => {
    console.error(`Error: ${err.message}`);
});

connectToServer();

process.on('SIGINT', () => {
    console.log('Closing client connection.');
    client.end();
    process.exit();
});
