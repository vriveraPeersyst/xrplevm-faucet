"use client";

import { useState } from "react";
// Header import removed
import { Faucet } from "@/components/faucet";
import { Footer } from "@/components/footer";

export default function Home() {
  const [network, setNetwork] = useState<"Devnet" | "Testnet">("Testnet");

  return (
    <main className="flex flex-col min-h-screen w-full">
      <div className="flex-grow flex items-center justify-center my-37">
        <Faucet
          network={network}
          setNetwork={setNetwork}
        />
      </div>
      <Footer network={network} />
    </main>
  );
}
