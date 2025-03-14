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
        io.emit("transactionUpdated", {
          id: txHash,
          sourceStatus: "Settled",
          sourceTxTime: Date.now(),
        });

        // Update DB with new status
        const db = getDb();
        await db.run(
          `UPDATE transactions SET status = ? WHERE xrplTxHash = ?`,
          "XRPL Settled",
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
 * Compare the inbound deposit to the entire bridging amount (e.g. 90.0002), not just the fraction.
 */
export async function pollDestinationTxStatus(
  destinationAddress: string,
  expectedTotal: number, // e.g. 90.0002 (Base + fraction)
  sourceTxHash: string,
  startedAt: number,
  io: SocketServer
): Promise<void> {
  let attempts = 0;

  const intervalId = setInterval(async () => {
    attempts++;
    try {
      // Construct the explorer API URL.
      const url =
        `https://explorer.testnet.xrplevm.org/api/v2/addresses/${destinationAddress}/token-transfers` +
        `?type=ERC-20` +
        `&filter=${destinationAddress}%20|%200x0000000000000000000000000000000000000000` +
        `&token=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`;

      // Debug: Log the request URL
      console.log(`[pollDestinationTxStatus] GET => ${url}`);

      const resp = await axios.get(url);

      // Debug: Log the status and the entire response data
      console.log(
        `[pollDestinationTxStatus] Explorer responded with status ${resp.status}:`,
        JSON.stringify(resp.data, null, 2)
      );

      const items = resp.data.items as any[];

      for (const item of items) {
        // Ensure the inbound transfer's "to" address matches (case-insensitive)
        if (item.to?.hash?.toLowerCase() !== destinationAddress.toLowerCase()) {
          continue;
        }
        const rawValueStr = item.total.value;
        const decimals = parseInt(item.total.decimals, 10);
        const floatVal = parseFloat(rawValueStr) / 10 ** decimals;

        // Compare to the entire bridging amount (using a small threshold).
        if (Math.abs(floatVal - expectedTotal) < 1e-9) {
          const bridgingTime = Date.now() - startedAt;
          console.log(
            `[pollDestinationTxStatus] Found inbound deposit for XRPL tx=${sourceTxHash}, EVM tx=${item.transaction_hash}`
          );

          io.emit("transactionUpdated", {
            id: sourceTxHash,
            destinationTxStatus: "Arrived",
            bridgingTimeMs: bridgingTime,
            destinationTxHash: item.transaction_hash,
          });

          // Update DB with final status
          const db = getDb();
          await db.run(
            `UPDATE transactions
             SET status = ?, bridgingTimeMs = ?, destinationTxHash = ?, xrplevmTxTime = ?
             WHERE xrplTxHash = ?`,
            "Arrived",
            bridgingTime,
            item.transaction_hash,
            Date.now(),
            sourceTxHash
          );

          clearInterval(intervalId);
          return;
        }
      }
    } catch (err) {
      // Debug: Log the entire error
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
