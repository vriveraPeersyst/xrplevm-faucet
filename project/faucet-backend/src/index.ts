import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { Client } from 'xrpl';
import dotenv from 'dotenv';
import path from 'path';
import { initDb, getDb } from './db';
import { sendEphemeralXRP } from './transactionTypes';
import { pollSourceTxStatus, pollDestinationTxStatus } from "./pollTxStatus";

// Load .env variables from the project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Base faucet amount (in XRP)
const BASE_AMOUNT = 90;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new SocketServer(httpServer, { cors: { origin: '*' } });

// Initialize database
initDb().then(() => {
  console.log("Database initialized.");
}).catch(err => {
  console.error("DB Initialization Error:", err);
  process.exit(1);
});

/**
 * POST /api/faucet
 * Expects a JSON payload:
 * {
 *   "evmAddress": "0xYourAddress",
 *   "network": "Testnet" // or "Devnet"
 * }
 *
 * This handler is written as an async function that returns Promise<void>.
 */
app.post('/api/faucet', async (req: Request, res: Response): Promise<void> => {
  try {
    const { evmAddress, network } = req.body as { evmAddress: string; network: "Testnet" | "Devnet" };

    if (!evmAddress || !evmAddress.startsWith("0x")) {
      res.status(400).json({ success: false, error: "Invalid EVM address" });
      return;
    }
    if (!network || (network !== "Testnet" && network !== "Devnet")) {
      res.status(400).json({ success: false, error: "Network must be 'Testnet' or 'Devnet'" });
      return;
    }

    // Select XRPL endpoint and gateway address based on the provided network.
    const xrplUrl = network === "Testnet" 
      ? process.env.XRPL_TESTNET_URL 
      : process.env.XRPL_DEVNET_URL;
    const gatewayAddress = network === "Testnet" 
      ? process.env.TESTNET_GATEWAY_ADDRESS 
      : process.env.DEVNET_GATEWAY_ADDRESS;

    if (!xrplUrl || !gatewayAddress) {
      res.status(500).json({ success: false, error: "Missing XRPL configuration" });
      return;
    }

    // Query the database to count previous requests for this evmAddress.
    const db = getDb();
    const row = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM transactions WHERE evmAddress = ?",
      evmAddress
    );
    const requestCount = row ? row.count : 0;

    // Compute unique fraction and total amount.
    const fraction = (requestCount + 1) * 0.0001;  // e.g. 0.0001, 0.0002, ...
    const amountId = BASE_AMOUNT + fraction;        // e.g. 90.0001, 90.0002, ...
    const amountDrops = (amountId * 1_000_000).toFixed(0); // Convert XRP to drops

    // Construct memos based on network.
    let memos;
    if (network === "Testnet") {
      memos = [
        {
          Memo: {
            MemoData: evmAddress.slice(2).toUpperCase(),
            MemoType: Buffer.from("destination_address").toString("hex").toUpperCase(),
          },
        },
        {
          Memo: {
            MemoData: Buffer.from("xrpl-evm-test-1").toString("hex").toUpperCase(),
            MemoType: Buffer.from("destination_chain").toString("hex").toUpperCase(),
          },
        },
        {
          Memo: {
            MemoData: "00",
            MemoType: Buffer.from("gas_fee_amount").toString("hex").toUpperCase(),
          },
        },
      ];
    } else {
      // Devnet memos
      memos = [
        {
          Memo: {
            MemoData: evmAddress.slice(2).toUpperCase(),
            MemoType: Buffer.from("destination_address").toString("hex").toUpperCase(),
          },
        },
        {
          Memo: {
            MemoData: Buffer.from("xrpl-evm-devnet").toString("hex").toUpperCase(),
            MemoType: Buffer.from("destination_chain").toString("hex").toUpperCase(),
          },
        },
      ];
    }

    // Connect to XRPL and fund an ephemeral wallet.
    const xrplClient = new Client(xrplUrl);
    await xrplClient.connect();
    const fundResult = await xrplClient.fundWallet();
    const wallet = fundResult.wallet; // Ephemeral wallet

    // ... inside your /api/faucet handler after getting txHash
    const txHash = await sendEphemeralXRP({
      xrplClient,
      wallet,
      amountDrops,
      destination: gatewayAddress,
      evmAddress,
      memos,
    }, io);

    // Record current timestamp for polling
    const startedAt = Date.now();

    // Start polling the XRPL (source) transaction status:
    void pollSourceTxStatus(xrplUrl, txHash, io);

    // Start polling the XRPL-EVM (destination) transaction status.
    // Note: Pass all five arguments: destinationAddress, fraction, sourceTxHash, startedAt, and io.
    void pollDestinationTxStatus(evmAddress, amountId, txHash, startedAt, io);

    // Record the transaction in the database.
    const now = Date.now();
    await db.run(
      `INSERT INTO transactions
         (evmAddress, fractionId, xrplTxHash, amountId, xrplTxTime, xrplevmTxTime, status, bridgingTimeMs, destinationTxHash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      evmAddress,
      fraction,
      txHash,
      amountId,
      now,
      null,          // initially no EVM tx time
      "Bridging",    // or whatever status you want
      null,          // bridgingTimeMs
      null           // destinationTxHash
    );

    res.json({ success: true, txHash });
  } catch (err: unknown) {
    console.error("Faucet error:", err);
    let message = "Unknown error";
    if (err instanceof Error) message = err.message;
    res.status(500).json({ success: false, error: message });
  }
});

// Start the backend server.
const PORT = process.env.PORT || 3003;
httpServer.listen(PORT, () => {
  console.log(`Faucet backend listening on http://localhost:${PORT}`);
});
