// project/faucet-backend/src/transactionTypes.ts
import { Client, Wallet, Payment } from "xrpl";
import { Server as SocketServer } from "socket.io";

/**
 * Submits an XRPL Payment using an ephemeral wallet.
 *
 * @param params - XRPL transaction parameters.
 * @param io - Socket.IO server instance for broadcasting events.
 * @returns The XRPL transaction hash.
 */
export async function sendEphemeralXRP(
  params: {
    xrplClient: Client;
    wallet: Wallet;
    amountDrops: string; // Amount in drops (1 XRP = 1,000,000 drops)
    destination: string; // Gateway XRPL address (e.g. your bridge gateway)
    evmAddress: string; // The user's 0x address (for bridging identification)
    memos: Array<{ Memo: { MemoType: string; MemoData: string } }>;
  },
  io: SocketServer
): Promise<string> {
  const { xrplClient, wallet, amountDrops, destination, evmAddress, memos } =
    params;

  const payment: Payment = {
    TransactionType: "Payment",
    Account: wallet.address,
    Amount: amountDrops,
    Destination: destination,
    Memos: memos,
  };

  try {
    const prepared = await xrplClient.autofill(payment);
    const signed = wallet.sign(prepared);
    const result = await xrplClient.submitAndWait(signed.tx_blob);
    const txHash = result.result.hash;

    // Emit a transactionCreated event so the frontend is updated.
    io.emit("transactionCreated", {
      result: {
        id: txHash,
        type: "sendXRPFromXRPL",
        sourceChain: "XRPL",
        destinationChain: "XRPL-EVM",
        // Convert drops back to XRP for logging
        amount: (parseFloat(amountDrops) / 1_000_000).toFixed(6),
        sourceAddress: wallet.address,
        destinationAddress: evmAddress,
        status: "Executed",
        xrplTxTime: Date.now(),
        xrplevmTxTime: null,
      },
    });

    return txHash;
  } catch (err) {
    console.error("Error in sendEphemeralXRP:", err);
    io.emit("transactionUpdated", { id: "unknown", status: "Failed" });
    throw err;
  }
}
