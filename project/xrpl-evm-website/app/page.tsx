"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Faucet } from "@/components/faucet";
import { Footer } from "@/components/footer";

export default function Home() {
  const [network, setNetwork] = useState<"Devnet" | "Testnet">("Testnet");
  const [evmAddress, setEvmAddress] = useState("");

  return (
    <main className="flex flex-col gap-[72px] w-full">
      <Header
        network={network}
        onAddressConnected={(addr) => {
          // store the address so we can pass it to the faucet
          setEvmAddress(addr);
        }}
      />
      <div className="relative -mt-[589px]">
        <Hero />
        <div className="absolute top-75 left-0 w-full h-full flex items-center justify-center">
          <Faucet
            network={network}
            setNetwork={setNetwork}
            // Pass the address we got from the header
            // so the user doesn't have to type it
            evmAddressFromHeader={evmAddress}
          />
        </div>
      </div>
      <Footer network={network} />
    </main>
  );
}
