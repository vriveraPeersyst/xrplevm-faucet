// pollTxStatus.ts

import { Client } from "xrpl";
import { Server as SocketServer } from "socket.io";
import axios, { AxiosError } from "axios";

const SOURCE_POLL_INTERVAL = 5000; // 5 seconds
const DEST_POLL_INTERVAL = 5000;   // 5 seconds
const MAX_POLL_ATTEMPTS = 300;

/**
 * pollSourceTxStatus
 * 
 * - Returns a Promise that resolves with the XRPL close_time_iso 
 *   once the transaction is "tesSUCCESS".
 * - If it fails or times out, the promise rejects.
 */

function getTransactionResult(meta: any): string | null {
  return meta && typeof meta === "object" && "TransactionResult" in meta
    ? meta.TransactionResult
    : null;
}


export function pollSourceTxStatus(
  xrplUrl: string,
  txHash: string,
  io: SocketServer
): Promise<string> {
  return new Promise(async (resolve, reject) => {
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
          const closeTimeIso = response.result.close_time_iso as string;
          
          // Let the front-end know the XRPL side is settled
          io.emit("transactionUpdated", {
            id: txHash,
            sourceStatus: "Settled",
            sourceTxTime: closeTimeIso,
          });

          clearInterval(intervalId);
          await xrplClient.disconnect();

          // *** We RESOLVE with the actual close_time_iso ***
          return resolve(closeTimeIso);
        }
        else if (transactionResult !== null) {
          // Some other code: tec, tef, etc. => mark as fail
          io.emit("transactionUpdated", { id: txHash, sourceStatus: "Failed" });

          clearInterval(intervalId);
          await xrplClient.disconnect();
          return reject(new Error(`XRPL tx failed with code: ${transactionResult}`));
        }
      } catch (err) {
        console.error("Error polling source tx status:", err);
        // We can keep retrying unless attempts is max
      }

      if (attempts >= MAX_POLL_ATTEMPTS) {
        clearInterval(intervalId);
        await xrplClient.disconnect();

        io.emit("transactionUpdated", {
          id: txHash,
          sourceStatus: "Timeout",
        });
        return reject(new Error("XRPL tx polling timed out"));
      }
    }, SOURCE_POLL_INTERVAL);
  });
}

/**
 * pollDestinationTxStatus
 * 
 * - Once we have the XRPL close_time_iso, we pass it to this function.
 * - We filter for token transfers >= that time + matching amount = 90.00589, etc.
 */
export function pollDestinationTxStatus(
  destinationAddress: string,
  sourceCloseTimeIso: string,
  txHash: string,
  io: SocketServer,
  network: "Devnet" | "Testnet"
): void {
  let attempts = 0;

  // Our known faucet amount
  const faucetAmount = 90.00589; // e.g. 90.00589
  const intervalId = setInterval(async () => {
    attempts++;

    try {
      // 1) Construct the explorer API URL
      let explorerBaseUrl: string;
      let xrperc20address: string;

      if (network === "Devnet") {
        explorerBaseUrl = "https://explorer.xrplevm.org/api/v2/addresses";
        xrperc20address = "0xD4949664cD82660AaE99bEdc034a0deA8A0bd517";
      } else {
        explorerBaseUrl = "https://explorer.testnet.xrplevm.org/api/v2/addresses";
        xrperc20address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
      }

      const url =
        `${explorerBaseUrl}/${destinationAddress}/token-transfers` +
        `?type=ERC-20` +
        `&filter=${destinationAddress}%20|%200x0000000000000000000000000000000000000000` +
        `&token=${xrperc20address}`;

      // 2) Fetch transfers
      // 2) Fetch transfers
      let items: any[] = [];
      try {
        const resp = await axios.get(url);
        items = resp.data.items as any[];
      } catch (error) {
        // If the explorer returns 404, treat it as "no items found" => continue polling
        if (axios.isAxiosError(error)) {
          const axErr = error as AxiosError;
          if (axErr.response?.status === 404) {
            console.log("[pollDestinationTxStatus] Explorer returned 404, no items found yet.");
            // We do NOT throw; just keep polling
            items = [];
          } else {
            // Some other error code => log and keep polling
            console.error("Error polling destination tx status:", error);
          }
        } else {
          // Non-Axios error, log it
          console.error("Error polling destination tx status:", error);
        }
      }

      // 3) We parse each item, looking for:
      //    - "to" address = destinationAddress
      //    - amount = 90.00589
      //    - item.timestamp > sourceCloseTimeIso
      for (const item of items) {
        if (!item?.to?.hash) continue;

        const toAddr = item.to.hash.toLowerCase();
        if (toAddr !== destinationAddress.toLowerCase()) continue;

        // Compare amounts
        const rawValueStr = item?.total?.value ?? "0";
        const decimals = parseInt(item?.total?.decimals ?? "18", 10);
        const floatVal = parseFloat(rawValueStr) / 10 ** decimals;

        // Compare to 90.00589
        if (Math.abs(floatVal - faucetAmount) > 1e-9) {
          continue; // not the faucet deposit
        }

        // Compare timestamps
        const evmTimestampIso = item.timestamp; // e.g. "2023-07-03T20:09:59.000000Z"
        const evmTimeMs = new Date(evmTimestampIso).getTime();
        const sourceTxMs = new Date(sourceCloseTimeIso).getTime();

        // We only consider items that happened after the XRPL close_time_iso
        if (evmTimeMs <= sourceTxMs) {
          continue;
        }

        // => We found a match!
        const bridgingTimeMs = evmTimeMs - sourceTxMs;
        const bridgingTimeSec = Math.floor(bridgingTimeMs / 1000);

        console.log(
          `[pollDestinationTxStatus] Found inbound deposit for XRPL tx=${txHash}, EVM tx=${item.transaction_hash}`
        );

        // Let the UI know bridging is done
        io.emit("transactionUpdated", {
          id: txHash,
          destinationTxStatus: "Arrived",
          bridgingTimeMs: bridgingTimeSec,
          destinationTxHash: item.transaction_hash,
        });

        // Cleanup
        clearInterval(intervalId);
        return;
      }
    } catch (err) {
      console.error("Error polling destination tx status:", err);
      // We'll keep trying unless attempts is max
    }

    if (attempts >= MAX_POLL_ATTEMPTS) {
      clearInterval(intervalId);
      io.emit("transactionUpdated", {
        id: txHash,
        destinationTxStatus: "Timeout",
      });
    }
  }, DEST_POLL_INTERVAL);
}
