"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react"; // Assuming you're using lucide-react icons
import { cn } from "@/lib/utils";

const FACTS = [
  "XRP on XRPL has 1 million drops, on XRPLEVM it has 18 decimals. Or shall we say dropVMs?",
  "XRPLEVM Testnet chain id is 1449000.",
  "XRPL Testnet's chain id in Axelar is xrpl-test-1.",
  "All OpenZeppelin contracts can be used and deployed on the XRPLEVM.",
  "XRPLEVM's current EVM Version is Paris.",
  "XRPLEVM is a Cosmos-SDK blockchain with an EVM module by Evmos.",
  "XRPLEVM is fully interoperable with IBC.",
  "Smart contracts on XRPLEVM are developed using Solidity.",
  "Transactions on XRPLEVM finalize in under 4 seconds.",
  "The native currency for XRPLEVM transactions is XRP.",
  "Cross-chain communication is facilitated by the General Message Passing (GMP) protocol.",
  "Valid transactions on XRPLEVM require confirmation by XRPL validators.",
  "Developers can deploy ERC20 tokens on the XRPLEVM with ease.",
  "The Axelar multisig account is essential for secure cross-chain asset transfers.",
  "Gas fees on XRPLEVM transactions are settled in XRP to minimize costs.",
  "Each smart contract on XRPLEVM can include customizable gas limits.",
  "Liquidity provision across chains enhances decentralized finance (DeFi) applications on XRPLEVM.",
  "Users can connect wallets like MetaMask to XRPLEVM via specified RPC URLs.",
  "Developers can utilize Truffle or Hardhat frameworks for smart contract testing.",
  "The XRPLEVM supports both fungible and non-fungible tokens (NFTs) natively.",
  "Developers can create DAOs using XRPLEVM's smart contract capabilities.",
  "The platform allows for contract upgrades utilizing a proxy pattern for seamless updates.",
  "Event logging is built into XRPLEVM, enabling tracking of contract executions.",
  "The EVM sidechain architecture is designed for optimal transaction throughput.",
  "Smart contracts on XRPLEVM can implement pausable functionality for emergency scenarios.",
  "The platform integrates seamlessly with Ethereum dApps with minimal configuration required.",
  "Each cross-chain operation utilizes ABI-encoded payloads for efficient communication.",
  "Gas consumption for transactions is automatically estimated based on current network load.",
  "XRPLEVM enables developers to leverage familiar JavaScript libraries and tools.",
  "Scripts for testing can be created in the same environment as production deployment.",
  "Assets can be locked in contracts using escrow features unique to XRPLEVM.",
  "The XRPLEVM community actively maintains detailed documentation for developers.",
  "Cross-chain asset swaps are made possible using Axelar's secure infrastructure.",
  "Hyper-parameter tuning is possible to adjust performance metrics for smart contracts."
];

export function BridgingProgress({ className }: { className?: string }) {
  const [showFact, setShowFact] = useState(false);
  const [currentFact, setCurrentFact] = useState<string>("");

  useEffect(() => {
    const toggleInterval = setInterval(() => {
      setShowFact((prev) => !prev); // Toggle between progress and fact
      if (!showFact) {
        const randomIndex = Math.floor(Math.random() * FACTS.length);
        setCurrentFact(FACTS[randomIndex]);
      }
    }, 10_000); // Switch every 10 seconds

    return () => clearInterval(toggleInterval);
  }, [showFact]);

  return (
    <div
      className={cn(
        "flex items-center justify-center flex-col gap-2 mt-4 min-h-[40px]",
        className
      )}
    >
      {!showFact ? (
        <div className="flex items-center gap-2 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-green-500" />
          <span className="text-sm text-muted-foreground">
            Bridging in progress...
          </span>
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground animate-pulse italic max-w-[90%]">
          {currentFact}
        </div>
      )}
    </div>
  );
}

