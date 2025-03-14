"use client";

import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { MetamaskButton } from "./metamask-button";
import { Button } from "./ui/button";

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

export function Faucet({
  network,
  setNetwork,
}: {
  network: NetworkType;
  setNetwork: React.Dispatch<React.SetStateAction<NetworkType>>;
}) {
  // Local states for user actions
  const [evmAddress, setEvmAddress] = useState("");
  const [followedTwitter, setFollowedTwitter] = useState(false);
  const [joinedDiscord, setJoinedDiscord] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waitTime, setWaitTime] = useState(0);

  // Socket.io states for tracking transaction
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTx, setActiveTx] = useState<TxStatus | null>(null);

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
        setActiveTx(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: data.status ?? prev.status,
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
      alert("Please follow on X and join Discord first.");
      return;
    }

    if (!evmAddress.startsWith("0x") || evmAddress.length < 10) {
      alert("Please enter a valid EVM address (starting with 0x).");
      return;
    }

    setLoading(true);
    setWaitTime(15); // e.g., 15 seconds

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

      // If you like, you can do a quick toast or alert here
      // to say "Faucet TX started!"
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

  // The Transaction Status Modal
  function TransactionStatusModal() {
    // If there's no active transaction, hide the modal
    if (!activeTx) return null;

    // A simple check to see if bridging is done or not
    const isBridging = !activeTx.destinationTxHash && activeTx.status !== "Failed" && activeTx.status !== "Arrived" && activeTx.status !== "Timeout";

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
        <div className="bg-white rounded-md p-6 w-[900px] text-black">
          <h2 className="text-xl font-bold mb-4">Transaction Status</h2>

          <p className="mb-2">
            <strong>Transaction ID:</strong> {activeTx.id}
          </p>
          <p className="mb-2">
            <strong>Current Status:</strong> {activeTx.status}
          </p>

          {isBridging && (
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <div className="w-4 h-4 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
              <p>Bridging in progress...</p>
            </div>
          )}

          {activeTx.destinationTxHash && (
            <p className="mb-2">
              <strong>Destination Tx Hash:</strong> {activeTx.destinationTxHash}
            </p>
          )}
          {activeTx.bridgingTimeMs && (
            <p className="mb-2">
              <strong>Bridging time:</strong> {activeTx.bridgingTimeMs} ms
            </p>
          )}

          <button
            className="bg-purple-600 text-white px-4 py-2 rounded-md mt-4"
            onClick={() => setActiveTx(null)}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="flex flex-col items-center justify-center gap-4 px-4 py-8">
        <h2 className="text-2xl font-bold text-center">
          XRPL EVM {network} Faucet
        </h2>

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
            <option value="Devnet">XRPL EVM Devnet</option>
            <option value="Testnet">XRPL EVM Testnet</option>
          </select>
        </div>

        {/* MetaMask Button (adds the chosen network) */}
        <div>
          <MetamaskButton className="mt-2" network={network} />
        </div>

        {/* EVM Address input */}
        <div className="flex flex-col items-start gap-1">
          <label htmlFor="evmAddress" className="font-semibold">
            Your EVM Account Address
          </label>
          <input
            id="evmAddress"
            type="text"
            value={evmAddress}
            onChange={(e) => setEvmAddress(e.target.value)}
            placeholder="0x123..."
            className="border border-white/20 rounded-md px-3 py-2 w-[280px] bg-background text-foreground"
          />
        </div>

        {/* Required steps funnel */}
        <p className="text-center font-medium mt-4">
          Before requesting, please complete the following:
        </p>
        <ul className="flex flex-col items-start gap-2">
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
          {loading ? `Waiting ~${waitTime}s...` : "Request XRP"}
        </Button>
      </section>

      {/* Render the Transaction Status Modal if we have an active transaction */}
      <TransactionStatusModal />
    </>
  );
}
