"use client";

import { useState } from "react";
import { Header } from "@/components/header";
// Remove Hero import since we no longer need it
import { Faucet } from "@/components/faucet";
import { Footer } from "@/components/footer";

export default function Home() {
  const [network, setNetwork] = useState<"Devnet" | "Testnet">("Testnet");
  const [evmAddress, setEvmAddress] = useState("");

  return (
    <main className="flex flex-col min-h-screen w-full">
      <Header
        network={network}
        onAddressConnected={(addr) => setEvmAddress(addr)}
      />
      <div className="flex-grow flex items-center justify-center my-37">
        <Faucet
          network={network}
          setNetwork={setNetwork}
          evmAddressFromHeader={evmAddress}
        />
      </div>
      <Footer network={network} />
    </main>
  );
}
