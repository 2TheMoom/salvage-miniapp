"use client";
import { ReactNode } from "react";
import {
  WagmiProvider,
  createConfig,
  http,
  createStorage,
  cookieStorage,
} from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { defineChain } from "viem";
import { baseAccount } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";
import { minikitConfig } from "@/minikit.config";

// Arc is too new to be in viem/chains yet — mirrors src/lib/chains.ts in the
// main Salvage repo exactly (same "no shared package" situation as
// app/lib/contracts.ts). Mainnet values confirmed against Circle's own docs
// (docs.arc.io/arc/references/connect-to-arc.md).
const arc = defineChain({
  id: 5042,
  name: "Arc",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.arc.io"] },
  },
  blockExplorers: {
    default: { name: "Arc Etherscan", url: "https://arc.etherscan.io" },
  },
  testnet: false,
});

// OnchainKit's own default wagmi config (createWagmiConfig, used whenever no
// wagmiConfig is supplied) only ever registers `base`/`baseSepolia` — Ethereum
// mainnet isn't in it. Any wagmi hook called with chainId 1 (registerClaim /
// settle / claim reads for a stranded-token finding on Ethereum, see
// ClaimPanel.tsx) then throws ChainNotConfiguredError. Supplying our own
// WagmiProvider ancestor is what makes OnchainKitProvider skip building its
// default one (it detects an existing wagmi Config via context) — the only
// way to add a chain OnchainKit doesn't ship with.
//
// farcasterMiniApp() must stay first in `connectors`: OnchainKit's own
// AutoConnect component picks `connectors[0]` to decide whether to attempt a
// Farcaster auto-connect, and this app's manual "Connect" button
// (app/page.tsx) does the same.
const wagmiConfig = createConfig({
  chains: [base, mainnet, arc],
  connectors: [
    farcasterMiniApp(),
    baseAccount({
      appName: minikitConfig.miniapp.name,
      appLogoUrl: minikitConfig.miniapp.iconUrl,
    }),
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY
      ? http(
          `https://api.developer.coinbase.com/rpc/v1/base/${process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}`
        )
      : http(),
    // No Coinbase Developer Platform key path confirmed for mainnet — public
    // RPC is an acceptable fallback for this app's read/claim volume.
    [mainnet.id]: http(),
    // Same reasoning as mainnet above — public RPC fallback via defineChain's
    // own rpcUrls.default.
    [arc.id]: http(),
  },
});

const queryClient = new QueryClient();

export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          config={{
            appearance: {
              mode: "auto",
            },
            wallet: {
              display: "modal",
              preference: "all",
            },
          }}
          miniKit={{
            enabled: true,
            autoConnect: true,
            notificationProxyUrl: undefined,
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
