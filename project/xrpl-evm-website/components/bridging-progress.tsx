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

