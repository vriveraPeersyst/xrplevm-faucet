"use client";

import { MetaMaskInpageProvider } from "@metamask/providers";
import { Button } from "./ui/button";
import { Icons } from "./icons";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

// Quick config references:
const DEVNET_CONFIG = {
  chainId: "0x" + Number(1440002).toString(16),
  chainName: "XRPL EVM Sidechain Devnet",
  nativeCurrency: {
    name: "XRP",
    symbol: "XRP",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.xrplevm.org/"],
  blockExplorerUrls: ["https://explorer.xrplevm.org"],
};

const TESTNET_CONFIG = {
  chainId: "0x" + Number(1449000).toString(16),
  chainName: "XRPL EVM Sidechain Testnet",
  nativeCurrency: {
    name: "XRP",
    symbol: "XRP",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.testnet.xrplevm.org/"],
  blockExplorerUrls: ["https://explorer.testnet.xrplevm.org"],
};

type NetworkType = "Devnet" | "Testnet";

/** 
 * Common logic for requesting a network add/switch in MetaMask
 */
async function addNetworkToMetamask(network: NetworkType) {
  if (!window.ethereum) return;

  const selectedConfig = network === "Devnet" ? DEVNET_CONFIG : TESTNET_CONFIG;

  try {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [selectedConfig],
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {}
}

/**
 * Regular full-labeled button
 */
export function MetamaskButton({
  className,
  network,
}: {
  className?: string;
  network: NetworkType;
}) {
  async function handleClick() {
    await addNetworkToMetamask(network);
  }

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className={cn("cursor-pointer gap-2", className)}
      size="lg"
    >
      <Icons.Metamask className="size-6" />
      <span className="font-bold">Add XRPL EVM Sidechain {network}</span>
    </Button>
  );
}

/**
 * Smaller icon-only button used in header, etc.
 */
export function MetamaskHeaderButton({
  className,
  network,
}: {
  className?: string;
  network: NetworkType;
}) {
  async function handleClick() {
    await addNetworkToMetamask(network);
  }

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className={cn("cursor-pointer gap-2 bg-white/[0.04] border-white/[0.08]", className)}
      size="lg"
    >
      <Icons.Metamask className="size-6" />
    </Button>
  );
}
