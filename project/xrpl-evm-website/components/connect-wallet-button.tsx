"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Icons } from "./icons";
import { cn } from "@/lib/utils";

type NetworkType = "Devnet" | "Testnet";

interface ConnectWalletButtonProps {
  className?: string;
  onConnected?: (address: string) => void;
  onDisconnected?: () => void;
  network?: NetworkType; // optional, if you want to pass the network in
}

/**
 * A small button that connects to MetaMask and displays
 * the connected address. Clicking it when connected shows a small menu to disconnect.
 */
export function ConnectWalletButton({
  className,
  onConnected,
  onDisconnected,
}: ConnectWalletButtonProps) {
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasMetaMask = typeof window !== "undefined" && (window as any).ethereum;

  useEffect(() => {
    if (!hasMetaMask) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ethereum = (window as any).ethereum;

    // Check if user is already connected
    ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setConnectedAccount(accounts[0]);
        onConnected?.(accounts[0]);
      }
    });

    // Listen for account changes
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setConnectedAccount(null);
        onConnected?.("");
      } else {
        setConnectedAccount(accounts[0]);
        onConnected?.(accounts[0]);
      }
    };

    ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [hasMetaMask, onConnected]);

  async function connectWallet() {
    if (!hasMetaMask) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ethereum = (window as any).ethereum;
      const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setConnectedAccount(accounts[0]);
        onConnected?.(accounts[0]);
      }
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  }

  function handleDisconnect() {
    setConnectedAccount(null);
    onConnected?.("");
    onDisconnected?.();
    setShowMenu(false);
  }

  // If no MetaMask installed
  if (!hasMetaMask) {
    return (
      <Button
        variant="outline"
        size="lg"
        className={cn("cursor-pointer gap-2 bg-white/[0.04] border-white/[0.08]", className)}
        disabled
      >
        <Icons.Metamask className="size-6" />
        <span>No MetaMask</span>
      </Button>
    );
  }

  // If already connected, show short address + green dot
  if (connectedAccount) {
    const shortAddr = `${connectedAccount.slice(0, 6)}...${connectedAccount.slice(-4)}`;

    return (
      <div className="relative">
        <Button
          variant="outline"
          size="lg"
          className={cn("cursor-pointer gap-2 bg-white/[0.04] border-white/[0.08]", className)}
          onClick={() => setShowMenu(!showMenu)}
        >
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-semibold">{shortAddr}</span>
        </Button>

        {/* Simple dropdown menu for "Disconnect" */}
        {showMenu && (
          <div className="absolute top-full right-0 mt-2 w-[140px] bg-[#1E1E1E] border border-white/10 rounded-md shadow-lg p-2 z-50">
            <button
              className="w-full text-left px-2 py-1 hover:bg-white/10 rounded-md"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // If not connected yet
  return (
    <Button
      onClick={connectWallet}
      variant="outline"
      size="lg"
      className={cn("cursor-pointer gap-2 bg-white/[0.04] border-white/[0.08]", className)}
    >
      <Icons.Metamask className="size-6" />
      <span className="font-semibold">Connect Wallet</span>
    </Button>
  );
}
