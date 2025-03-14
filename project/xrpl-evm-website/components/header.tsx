"use client";

import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import React from "react";

import { Logo } from "./logo";
import { HeaderNavigationMenu } from "./header-navigation-menu";
import { ExternalLinkWithArrow } from "./external-link";
import { MetamaskHeaderButton } from "./metamask-button";

export function Header({
  network,
}: {
  // Accept network as a prop
  network: "Devnet" | "Testnet";
}) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <header
      className={cn(
        "flex flex-col md:flex-row justify-between items-center px-4 pt-4 md:px-0 md:pt-0 md:pb-4 md:mt-6 relative w-full z-50 max-w-4xl mx-auto",
        isMenuOpen ? "md:border-b-0" : "md:border-b"
      )}
    >
      <div className="flex justify-between items-center w-full md:w-auto">
        <Logo />
        <div className="z-50 md:hidden">
          <ExternalLinkWithArrow
            className={buttonVariants({ variant: "default" })}
            label="Get started"
            href="https://docs.xrplevm.org/pages/users"
            external
          />
        </div>
      </div>

      <div className="w-full border-t md:border-0 mt-4 md:mt-0 md:absolute md:left-0 md:right-0 md:mx-auto md:justify-center">
        <HeaderNavigationMenu onOpenChange={setIsMenuOpen} />
      </div>

      <div className="hidden z-50 md:flex md:items-center md:gap-2">
        {/* Use the same network the parent passed in */}
        <MetamaskHeaderButton network={network} />

        <ExternalLinkWithArrow
          className={buttonVariants({ variant: "default", size: "lg" })}
          label="Get started"
          href="https://docs.xrplevm.org/pages/users"
          external
        />
      </div>
    </header>
  );
}
