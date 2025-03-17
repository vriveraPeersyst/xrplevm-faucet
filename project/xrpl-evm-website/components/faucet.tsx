"use client";

import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { MetamaskButton } from "./metamask-button";
import { Button } from "./ui/button";
import { BridgingProgress } from "./bridging-progress";
import { Logo } from "@/components/logo";


export type NetworkType = "Devnet" | "Testnet";

// Optional: define a type for transaction updates
type TxStatus = {
  id: string;
  status?: string;
  bridgingTimeMs?: number;
  destinationTxHash?: string;
};

interface TransactionCreatedEvent {
  result: {
    id: string;
    status: string;
    // add other fields if needed
  };
}

interface TransactionUpdatedEvent {
  id: string;
  status?: string;
  bridgingTimeMs?: number;
  destinationTxHash?: string;
}

interface FaucetProps {
  network: NetworkType;
  setNetwork: React.Dispatch<React.SetStateAction<NetworkType>>;
  evmAddressFromHeader?: string; // <--- NEW optional prop
}

export function Faucet({
  network,
  setNetwork,
  evmAddressFromHeader,
}: FaucetProps) {
  // Local states for user actions
  const [evmAddress, setEvmAddress] = useState(evmAddressFromHeader || "");
  const [followedTwitter, setFollowedTwitter] = useState(false);
  const [joinedDiscord, setJoinedDiscord] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waitTime, setWaitTime] = useState(0);

  // Socket.io states for tracking transaction
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTx, setActiveTx] = useState<TxStatus | null>(null);

  const [showMissingRequirementsModal, setShowMissingRequirementsModal] = useState(false);

    // Whenever evmAddressFromHeader changes, update our local evmAddress
    useEffect(() => {
      if (evmAddressFromHeader) {
        setEvmAddress(evmAddressFromHeader);
      } else {
        // If disconnected or no address from the header, let them type
        setEvmAddress("");
      }
    }, [evmAddressFromHeader]);
  

  // Connect to Socket.IO once on mount
  useEffect(() => {
    const newSocket = io("http://localhost:3003"); // or your server's URL
    setSocket(newSocket);

    // Listen for transactionCreated
    newSocket.on("transactionCreated", (data: TransactionCreatedEvent) => {
      setActiveTx({
        id: data.result.id,
        status: data.result.status,
      });
    });

    // Listen for transactionUpdated
    newSocket.on("transactionUpdated", (data: TransactionUpdatedEvent) => {
      if (data.id === activeTx?.id) {
        setActiveTx((prev) => {
          if (!prev) return null;

          let newStatus = prev.status;
          // If we see a destinationTxHash + bridgingTime, mark it as "Arrived"
          if (data.destinationTxHash && data.bridgingTimeMs) {
            newStatus = "Arrived";
          }

          return {
            ...prev,
            status: newStatus,
            bridgingTimeMs: data.bridgingTimeMs ?? prev.bridgingTimeMs,
            destinationTxHash: data.destinationTxHash ?? prev.destinationTxHash,
          };
        });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [activeTx?.id]);

  // Handle faucet request
  const handleRequestXRP = async () => {
    if (!followedTwitter || !joinedDiscord) {
      setShowMissingRequirementsModal(true);
      return;
    }

    if (!evmAddress.startsWith("0x") || evmAddress.length < 10) {
      alert("Please enter a valid EVM address (starting with 0x).");
      return;
    }

    setLoading(true);
    setWaitTime(10); // e.g., 10 seconds

    try {
      const resp = await fetch("http://localhost:3003/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network, evmAddress }),
      });
      const data = await resp.json();

      if (!data.success) {
        throw new Error(data.error || "Faucet failed");
      }

      console.log("Faucet TX started. XRPL Hash:", data.txHash);
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        alert("Error requesting faucet: " + error.message);
      } else {
        alert("Error requesting faucet: " + String(error));
      }
    } finally {
      setLoading(false);
      setWaitTime(0);
    }
  };

  // Enhanced Transaction Status Modal
  function TransactionStatusModal() {
    if (!activeTx) return null;

    // Convert bridgingTime from ms to seconds
    const bridgingTimeSec = activeTx.bridgingTimeMs
      ? Math.floor(activeTx.bridgingTimeMs / 1000)
      : 0;

    // Determine if bridging is still in progress
    const isBridging =
      !activeTx.destinationTxHash &&
      activeTx.status !== "Failed" &&
      activeTx.status !== "Arrived" &&
      activeTx.status !== "Timeout";

    // Build XRPL Explorer URL
    const xrplTxUrl =
      network === "Testnet"
        ? `https://testnet.xrpl.org/transactions/${activeTx.id}`
        : `https://devnet.xrpl.org/transactions/${activeTx.id}`;

    // Build EVM Explorer URL
    let evmTxUrl: string | null = null;
    if (activeTx.destinationTxHash) {
      evmTxUrl =
        network === "Testnet"
          ? `https://explorer.testnet.xrplevm.org/tx/${activeTx.destinationTxHash}`
          : `https://explorer.xrplevm.org/tx/${activeTx.destinationTxHash}`;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        {/* Modal Card */}
        <div className="bg-[#1E1E1E] w-[500px] max-w-[90%] p-6 rounded-xl shadow-xl relative text-white">
          {/* Title */}
          <h2 className="text-2xl font-bold mb-6 text-center">
            Your Transaction has been sent
          </h2>

          {/* Transaction details */}
          <div className="space-y-4">
            {/* XRPL Tx Hash */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-400">Transaction ID (XRPL)</span>
              <a
                href={xrplTxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 underline break-all hover:text-green-300"
              >
                {activeTx.id}
              </a>
            </div>

            {/* Current Status */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-400">Current Status</span>
              <span className="font-medium">
                {activeTx.status === "Arrived" ? "Arrived" : activeTx.status}
              </span>
            </div>

            {/* Bridging spinner if bridging */}
            {isBridging && (
              <BridgingProgress />
            )}

            {/* Destination Tx Hash (if present) */}
            {evmTxUrl && (
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-400">Destination Tx Hash</span>
                <a
                  href={evmTxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 underline break-all hover:text-green-300"
                >
                  {activeTx.destinationTxHash}
                </a>
              </div>
            )}

            {/* Bridging Time (in seconds) */}
            {bridgingTimeSec > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-400">Bridging time</span>
                <span className="font-medium">{bridgingTimeSec} sec</span>
              </div>
            )}
          </div>

          {/* Action button */}
          <button
            className="mt-8 w-full py-3 rounded-md bg-green-600 hover:bg-green-500 font-semibold text-white"
            onClick={() => setActiveTx(null)}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Missing Requirements Modal
  function MissingRequirementsModal() {
    if (!showMissingRequirementsModal) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
        <div className="bg-white rounded-md p-6 w-[500px] text-black">
          <h2 className="text-xl font-bold mb-4">Almost there!</h2>
          <p className="mb-4">
            Please make sure you follow us on 𝕏 and join our Discord 👾 before
            requesting test XRP.
          </p>
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded-md"
            onClick={() => setShowMissingRequirementsModal(false)}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="flex flex-col items-center justify-center gap-5 px-4 py-8">
      <div
        className="mb-8"
        style={{ transform: "scale(3)", transformOrigin: "center" }}
      >
        <Logo />
      </div>

        {/* Network Selector */}
        <div className="flex flex-col items-center gap-2">
          <label htmlFor="network" className="font-semibold">
            Select Network
          </label>
          <select
            id="network"
            className="border rounded-md px-3 py-2 bg-background text-foreground"
            value={network}
            onChange={(e) => setNetwork(e.target.value as NetworkType)}
          >
            <option value="Devnet">Devnet</option>
            <option value="Testnet">Testnet</option>
          </select>
        </div>

        {/* MetaMask Button (adds the chosen network) */}
        <div>
          <MetamaskButton className="mt-3" network={network} />
        </div>

        {/* EVM Address input */}
        <div className="flex flex-col items-start gap-1">
          <label htmlFor="evmAddress" className="font-semibold">
            Your Address
          </label>
          <input
            id="evmAddress"
            type="text"
            value={evmAddress}
            onChange={(e) => setEvmAddress(e.target.value)}
            placeholder="0x5l8r9m..."
            className="border border-white/20 rounded-md px-3 py-2 w-[459px] bg-background text-foreground focus:placeholder-transparent"
            disabled={!!evmAddressFromHeader}
          />
        </div>

        {/* Required steps funnel */}
        <p className="text-center font-medium mt-4">
          Before requesting, please complete the following:
        </p>
        <ul className="flex flex-col items-center gap-2 text-center">
          <li>
            <a
              href="https://x.com/Peersyst"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setFollowedTwitter(true)}
              className="underline text-blue-400 hover:text-blue-300"
            >
              Follow @Peersyst on X
            </a>{" "}
            {followedTwitter && "✓"}
          </li>
          <li>
            <a
              href="https://discord.com/invite/xrplevm"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setJoinedDiscord(true)}
              className="underline text-blue-400 hover:text-blue-300"
            >
              Join our Discord
            </a>{" "}
            {joinedDiscord && "✓"}
          </li>
        </ul>

        {/* Request XRP button */}
        <Button
          variant="default"
          size="lg"
          className="mt-4"
          onClick={handleRequestXRP}
          disabled={loading}
        >
          {loading ? `Waiting ~${waitTime}s...` : "Request 90 XRP"}
        </Button>
      </section>

      {/* Render the Transaction Status Modal if we have an active transaction */}
      <TransactionStatusModal />

      {/* Missing Requirements Modal */}
      <MissingRequirementsModal />
    </>
  );
}
