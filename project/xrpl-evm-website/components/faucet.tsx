"use client";

import { useState } from "react";
import { MetamaskButton } from "./metamask-button";
import { Button } from "./ui/button";

// For clarity, define a type for the two possible networks
export type NetworkType = "Devnet" | "Testnet";

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

  // Function to handle the faucet request
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

      // Show success notification with the XRPL transaction hash
      alert(`Faucet TX started. XRPL Hash: ${data.txHash}`);
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

  return (
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
  );
}
