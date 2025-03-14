"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Faucet } from "@/components/faucet"; // <--- your faucet
import { Footer } from "@/components/footer";

export default function Home() {

    // Moved the network state to the parent page
    const [network, setNetwork] = useState<"Devnet" | "Testnet">("Testnet");

  return (
    <main className="flex flex-col gap-[72px] w-full">
      <Header network={network} />
      {/* This container allows stacking the Hero and Faucet */}
      <div className="relative -mt-[589px]">
        {/* Hero is in the background */}
        <Hero />
        {/* Faucet is absolutely positioned on top of Hero */}
        <div className="absolute top-75 left-0 w-full h-full flex items-center justify-center">
        <Faucet network={network} setNetwork={setNetwork} />
        </div>
      </div>
      <Footer network={network}/>
    </main>
  );
}
