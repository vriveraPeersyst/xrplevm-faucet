import express, { RequestHandler } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { Client } from "xrpl";
import dotenv from "dotenv";
import path from "path";
import { ParsedQs } from "qs";
import { ParamsDictionary } from "express-serve-static-core";

import { sendEphemeralXRP } from "./transactionTypes";
import { pollSourceTxStatus, pollDestinationTxStatus } from "./pollTxStatus";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const BASE_AMOUNT = 90.00589;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new SocketServer(httpServer, { cors: { origin: "*" } });

const faucetHandler: RequestHandler<ParamsDictionary, any, any, ParsedQs> = async (req, res, next) => {
  try {
    const { evmAddress, network } = req.body as {
      evmAddress: string;
      network: "Testnet" | "Devnet";
    };

    // Basic validation
    if (!evmAddress || !evmAddress.startsWith("0x")) {
      res.status(400).json({ success: false, error: "Invalid EVM address" });
      return;
    }
    if (network !== "Testnet" && network !== "Devnet") {
      res.status(400).json({ success: false, error: "Network must be 'Testnet' or 'Devnet'" });
      return;
    }

    const xrplUrl =
      network === "Testnet"
        ? process.env.XRPL_TESTNET_URL
        : process.env.XRPL_DEVNET_URL;
    const gatewayAddress =
      network === "Testnet"
        ? process.env.TESTNET_GATEWAY_ADDRESS
        : process.env.DEVNET_GATEWAY_ADDRESS;

    if (!xrplUrl || !gatewayAddress) {
      res.status(500).json({ success: false, error: "Missing XRPL config" });
      return;
    }

    const amountDrops = (BASE_AMOUNT * 1_000_000).toFixed(0);

    // Construct memos
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

    // XRPL ephemeral wallet
    const xrplClient = new Client(xrplUrl);
    await xrplClient.connect();
    const fundResult = await xrplClient.fundWallet();
    const wallet = fundResult.wallet;

    // Send ephemeral XRP
    const txHash = await sendEphemeralXRP({
      xrplClient,
      wallet,
      amountDrops,
      destination: gatewayAddress,
      evmAddress,
      memos,
    }, io);

    // Wait for XRPL to settle => get close_time_iso
    const closeTimeIso = await pollSourceTxStatus(xrplUrl, txHash, io);

    // Poll EVM side (async)
    pollDestinationTxStatus(evmAddress, closeTimeIso, txHash, io, network);

    // Return result to client
    res.json({ success: true, txHash });
  } catch (err) {
    console.error("Faucet error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
    return;
  }
};

app.post("/api/faucet", faucetHandler);

const PORT = process.env.PORT || 5005;
httpServer.listen(PORT, () => {
  console.log(`Faucet backend listening on http://localhost:${PORT}`);
});
