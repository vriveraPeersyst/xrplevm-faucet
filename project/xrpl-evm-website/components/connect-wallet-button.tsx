"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Icons } from "./icons";
import { cn } from "@/lib/utils";

interface ConnectWalletButtonProps {
  className?: string;
  onConnected?: (address: string) => void;
  onDisconnected?: () => void;
}

export function ConnectWalletButton({
  className,
  onConnected,
  onDisconnected,
}: ConnectWalletButtonProps) {
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(true);

  // Check MetaMask presence
  const hasMetaMask =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof window !== "undefined" && (window as any).ethereum;

  // Load returning user status on mount
  useEffect(() => {
    const stored = localStorage.getItem("isReturningUser");
    if (stored === null) setIsReturningUser(false);
    else setIsReturningUser(stored === "true");

    if (!hasMetaMask) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ethereum = (window as any).ethereum;

    // Check if already connected
    ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setConnectedAccount(accounts[0]);
        onConnected?.(accounts[0]);
      }
    });

    // Listen to account changes (disconnect handling)
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setConnectedAccount(null);
        onDisconnected?.();
        localStorage.setItem("isReturningUser", "false");
      } else {
        setConnectedAccount(accounts[0]);
        onConnected?.(accounts[0]);
      }
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    return () => ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, [hasMetaMask, onConnected, onDisconnected]);

  // ✅ Connect flow
  async function connectWallet() {
    if (!hasMetaMask) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ethereum = (window as any).ethereum;

    try {
      // Request connection (accounts access)
      const accounts: string[] = await ethereum.request({
        method: "eth_requestAccounts",
      });

      // Prompt for permissions if it's a new user or after disconnect
      if (!isReturningUser) {
        await ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      }

      // Handle connection
      if (accounts.length > 0) {
        setConnectedAccount(accounts[0]);
        onConnected?.(accounts[0]);
        setIsReturningUser(true);
        localStorage.setItem("isReturningUser", "true");
      }
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  }

  // ✅ Disconnect flow (simulated + permissions revoke)
  async function handleDisconnect() {
    setShowMenu(false);
    setConnectedAccount(null);
    onDisconnected?.();
    onConnected?.("");

    // Mark as non-returning to force permissions next time
    setIsReturningUser(false);
    localStorage.setItem("isReturningUser", "false");

    // Revoke permissions (user will have to confirm)
    if (typeof window !== "undefined" && window.ethereum) {
        try {
          await window.ethereum.request({
            method: "wallet_revokePermissions",
            params: [{ eth_accounts: {} }],
          });
        } catch (error) {
          console.error("Error revoking permissions:", error);
        }
      } else {
        console.warn("Ethereum provider is not available.");
      }
  }

  // Render based on state

  // 🚫 No MetaMask
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

  // ✅ Connected state
  if (connectedAccount) {
    const shortAddr = `${connectedAccount.slice(0, 6)}...${connectedAccount.slice(-4)}`;
    return (
      <div className="relative inline-block">
        <Button
          variant="outline"
          size="lg"
          className={cn("cursor-pointer gap-2 bg-white/[0.04] border-white/[0.08]", className)}
          onClick={() => setShowMenu(!showMenu)}
        >
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-semibold">{shortAddr}</span>
        </Button>

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

  // 🟢 Not connected
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
