import { Client } from "xrpl";
import { Server as SocketServer } from "socket.io";
import axios from "axios";

const SOURCE_POLL_INTERVAL = 5000; // 5 seconds
const DEST_POLL_INTERVAL = 5000;   // 5 seconds
const MAX_POLL_ATTEMPTS = 20;

/**
 * Safely accesses TransactionResult property
 */
function getTransactionResult(meta: any): string | null {
  return meta && typeof meta === 'object' && 'TransactionResult' in meta ? meta.TransactionResult : null;
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
        clearInterval(intervalId);
        await xrplClient.disconnect();
      } else if (transactionResult !== null) {
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
 */
export async function pollDestinationTxStatus(
  destinationAddress: string,
  fraction: number,
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

      const resp = await axios.get(url);
      const items = resp.data.items as any[];

      for (const item of items) {
        // Ensure the inbound transfer's "to" address matches (case-insensitive)
        if (item.to?.hash?.toLowerCase() !== destinationAddress.toLowerCase()) {
          continue;
        }
        const rawValueStr = item.total.value;
        const decimals = parseInt(item.total.decimals, 10);
        const floatVal = parseFloat(rawValueStr) / (10 ** decimals);

        // Compare to bridging fraction (using a small threshold)
        if (Math.abs(floatVal - fraction) < 1e-9) {
          const bridgingTime = Date.now() - startedAt;
          console.log(
            `[pollExplorerForInboundEvm] Found inbound deposit for XRPL tx=${sourceTxHash}, EVM tx=${item.transaction_hash}`
          );
          io.emit("transactionUpdated", {
            id: sourceTxHash,
            destinationTxStatus: "Arrived",
            bridgingTimeMs: bridgingTime,
            destinationTxHash: item.transaction_hash,
          });
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
