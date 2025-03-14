import { Client } from "xrpl";
import { Server as SocketServer } from "socket.io";
import axios from "axios";
import { getDb } from "./db";

const SOURCE_POLL_INTERVAL = 5000; // 5 seconds
const DEST_POLL_INTERVAL = 5000;   // 5 seconds
const MAX_POLL_ATTEMPTS = 300;

/**
 * Safely accesses TransactionResult property
 */
function getTransactionResult(meta: any): string | null {
  return meta && typeof meta === "object" && "TransactionResult" in meta
    ? meta.TransactionResult
    : null;
}

/**
 * Poll the source chain (XRPL) for transaction status.
 * - On success, store sourceTxTime in DB using close_time_iso.
 */
export async function pollSourceTxStatus(
  xrplUrl: string,
  txHash: string,
  io: SocketServer
): Promise<void> {
  const xrplClient = new Client(xrplUrl);
  await xrplClient.connect();

  let attempts = 0;
  const intervalId = setInterval(async () => {
    attempts++;
    try {
      const response = await xrplClient.request({
        command: "tx",
        transaction: txHash,
        binary: false,
      });

      const transactionResult = getTransactionResult(response.result.meta);

      if (transactionResult === "tesSUCCESS") {
        // Extract the official XRPL close time (ISO string)
        const closeTimeIso = response.result.close_time_iso as string;
        const sourceTxMs = new Date(closeTimeIso).getTime();

        // Broadcast that the source TX is settled
        io.emit("transactionUpdated", {
          id: txHash,
          sourceStatus: "Settled",
          // You could also pass the ISO string if the UI wants to show it
          sourceTxTime: closeTimeIso,
        });

        // Update DB with new status + store the sourceTxTime in ms
        const db = getDb();
        await db.run(
          `UPDATE transactions 
             SET status = ?, 
                 xrplTxTime = ?
           WHERE xrplTxHash = ?`,
          "XRPL Settled",
          sourceTxMs,   // store as a number
          txHash
        );

        clearInterval(intervalId);
        await xrplClient.disconnect();
      } else if (transactionResult !== null) {
        // Means it was some other status (tec, tef, etc.)
        io.emit("transactionUpdated", {
          id: txHash,
          sourceStatus: "Failed",
        });
        clearInterval(intervalId);
        await xrplClient.disconnect();
      }
    } catch (err) {
      console.error("Error polling source tx status:", err);
    }

    if (attempts >= MAX_POLL_ATTEMPTS) {
      clearInterval(intervalId);
      io.emit("transactionUpdated", {
        id: txHash,
        sourceStatus: "Timeout",
      });
      await xrplClient.disconnect();
    }
  }, SOURCE_POLL_INTERVAL);
}

/**
 * Poll the destination chain (EVM sidechain) for transaction status.
 * - On success, extract `timestamp` from the inbound transaction item.
 * - Then fetch `xrplTxTime` from DB, compute bridgingTime = EVMtime - XRPLtime in **seconds**.
 */
export async function pollDestinationTxStatus(
  destinationAddress: string,
  expectedTotal: number,
  sourceTxHash: string,
  startedAt: number,
  io: SocketServer,
  network: "Devnet" | "Testnet" // <-- Add this
): Promise<void> {
  let attempts = 0;

  const intervalId = setInterval(async () => {
    attempts++;
    try {
      // Construct the explorer API URL.
      let explorerBaseUrl: string;

      if (network === "Devnet") {
        explorerBaseUrl = "https://explorer.devnet.xrplevm.org/api/v2/addresses";
      } else {
        explorerBaseUrl = "https://explorer.testnet.xrplevm.org/api/v2/addresses";
      }

      const url =
        `${explorerBaseUrl}/${destinationAddress}/token-transfers` +
        `?type=ERC-20` +
        `&filter=${destinationAddress}%20|%200x0000000000000000000000000000000000000000` +
        `&token=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`;

      const resp = await axios.get(url);
      const items = resp.data.items as any[];

      // We need the sourceTxTime from DB to compute bridging time
      const db = getDb();
      // Retrieve the row from DB to get the XRPL settle time
      const row = await db.get<{
        xrplTxTime: number | null;
      }>(
        `SELECT xrplTxTime 
           FROM transactions
          WHERE xrplTxHash = ?`,
        sourceTxHash
      );
      const sourceTxMs = row?.xrplTxTime || 0;

      for (const item of items) {
        // Ensure the inbound transfer's "to" address matches (case-insensitive)
        if (item.to?.hash?.toLowerCase() !== destinationAddress.toLowerCase()) {
          continue;
        }
        const rawValueStr = item.total.value;
        const decimals = parseInt(item.total.decimals, 10);
        const floatVal = parseFloat(rawValueStr) / 10 ** decimals;

        // If you are bridging e.g. 0.0002, make sure expectedTotal is also 0.0002, not 90.0002
        if (Math.abs(floatVal - expectedTotal) < 1e-9) {
          // We found the inbound deposit.
          // Now parse the item.timestamp (like "2025-03-14T15:19:36.000000Z")
          const evmTimeMs = new Date(item.timestamp).getTime();

          // bridgingTime in ms
          let bridgingTimeMs = 0;
          if (sourceTxMs > 0) {
            bridgingTimeMs = evmTimeMs - sourceTxMs;
          }
          // Convert to seconds
          const bridgingTimeSec = Math.floor(bridgingTimeMs / 1000);

          console.log(
            `[pollDestinationTxStatus] Found inbound deposit for XRPL tx=${sourceTxHash}, EVM tx=${item.transaction_hash}`
          );

          // Emit an event so the frontend sees "Arrived"
          // and bridging time in seconds
          io.emit("transactionUpdated", {
            id: sourceTxHash,
            destinationTxStatus: "Arrived",
            bridgingTimeMs: bridgingTimeSec,  // <--- now in seconds
            destinationTxHash: item.transaction_hash,
          });

          // Update DB with final status + store the EVM timestamp + bridgingTime
          await db.run(
            `UPDATE transactions
               SET status = ?, 
                   bridgingTimeMs = ?, 
                   destinationTxHash = ?, 
                   xrplevmTxTime = ?
             WHERE xrplTxHash = ?`,
            "Arrived",
            bridgingTimeSec,   // store bridging time in seconds
            item.transaction_hash,
            evmTimeMs,
            sourceTxHash
          );

          clearInterval(intervalId);
          return;
        }
      }
    } catch (err) {
      console.error("Error polling destination tx status:", err);
    }

    if (attempts >= MAX_POLL_ATTEMPTS) {
      clearInterval(intervalId);
      io.emit("transactionUpdated", {
        id: sourceTxHash,
        destinationTxStatus: "Timeout",
      });
    }
  }, DEST_POLL_INTERVAL);
}
