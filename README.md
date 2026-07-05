@'
# Salvage — Base App Mini App

**The Salvage stranded-asset recovery scanner, native to the Base App.**

![Base App](https://img.shields.io/badge/Base%20App-Mini%20App-627EEA)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![License MIT](https://img.shields.io/badge/license-MIT-blue)

[**Open in Base App**](https://salvage-miniapp.vercel.app) · [**Main app**](https://usesalvage.xyz) · [**Protocol repo**](https://github.com/2TheMoom/Salvage)

This is the Base App Mini App companion to [Salvage](https://usesalvage.xyz) — a non-custodial recovery protocol for ERC-20 tokens stranded in smart contracts. It brings the "Did I Lose Tokens?" wallet scan directly into the Base App: your wallet is already connected, so a single tap checks it for recoverable tokens with no site navigation or copy-paste.

Findings link back to the full recovery flow on the main app, where the on-chain settlement (EIP-712 claim → CREATE2 deposit address → permissionless `settle()`) happens.

## What it does

- **Auto-scan** — reads the connected wallet from MiniKit context and scans it for tokens mistakenly sent to token-contract addresses on Base
- **Recoverable value** — shows each finding with USD value and a link to recover it on `usesalvage.xyz`
- **Notification opt-in** — captures the wallet address so it can be alerted when a finder registers a recovery against it (delivery pending Base's wallet-address notifications API)

## How it fits the protocol

The scan calls the main Salvage API (`/api/victim-scan`) and stores notification opt-ins in the shared Supabase project alongside `salvage_claims` and `salvage_finds`. When a finder registers a claim against a wallet, the main app looks up that wallet's opt-in here to notify the victim. The Mini App is a distribution surface — all settlement logic lives in the [protocol repo](https://github.com/2TheMoom/Salvage).

## Stack

- **Next.js 16** · TypeScript · wagmi / viem
- **MiniKit / OnchainKit** — Base App Mini App runtime, wallet auto-connect
- **Base.dev** — app registration (`base:app_id` meta tag)
- **Supabase** — shared notification opt-in table (`miniapp_notifications`)

## Running locally

```bash
npm install
npm run dev
```

Environment variables (`.env`):

NEXT_PUBLIC_PROJECT_NAME
NEXT_PUBLIC_ONCHAINKIT_API_KEY
NEXT_PUBLIC_URL
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

Note: Mini App features (wallet auto-connect, notification opt-in) require the Base App runtime and won't fully work in a plain browser.

## Migration note

Originally scaffolded with the Farcaster mini-app spec. After Base's April 2026 move to a standard-web-app model, the deprecated `addFrame` / FID-token flow was removed in favor of wallet-address opt-in and Base.dev registration.

---

**Built by [Abu Olumi](https://x.com/Olumi441)** · Builder · Researcher · Content Creator · On-chain Contributor
'@ | Set-Content -Encoding UTF8 README.md