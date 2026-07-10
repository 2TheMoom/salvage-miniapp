# Salvage — Base App Mini App

**The Salvage stranded-asset recovery scanner and claim flow, native to the Base App.**

![Base App](https://img.shields.io/badge/Base%20App-Mini%20App-627EEA)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![License MIT](https://img.shields.io/badge/license-MIT-blue)

[**Open in Base App**](https://salvage-miniapp.vercel.app) · [**Main app**](https://usesalvage.xyz) · [**Protocol repo**](https://github.com/2TheMoom/Salvage)

This is the Base App Mini App companion to [Salvage](https://usesalvage.xyz) — a non-custodial recovery protocol for ERC-20 tokens stranded in smart contracts. It brings the "Did I Lose Tokens?" wallet scan directly into the Base App: your wallet is already connected, so a single tap checks it — across both Ethereum and Base — for tokens mistakenly sent to token-contract addresses.

Recovery doesn't mean leaving Base App either. Signing the EIP-712 claim, registering it on-chain, and settling once the receiver is funded all happen natively here — the same trustless flow the main app uses, without the handoff to a website.

## What it does

- **Multi-chain auto-scan** — reads the connected wallet from MiniKit context and scans Ethereum and Base in parallel for tokens mistakenly sent to token-contract addresses; each finding is labeled with the chain it was found on
- **Native on-chain recovery** — sign the EIP-712 `RecoveryClaim`, register it on `SalvageRecoveryRouter`, get the deterministic deposit address, and settle once funded — no redirect to the main site
- **Finder-aware payouts** — looks up whether a finder already registered against a given loss before the victim signs, so a registered finder's 7% cut actually routes on settlement rather than silently defaulting to a victim-only split
- **Notification opt-in** — captures the wallet address (and Farcaster fid, if present) so a user can be alerted when a finder registers a recovery against it. The enabled/disabled state updates live via Base's webhook; actual push *delivery* is still pending Base's wallet-address notifications API supplying a real token/url — right now that field is saved empty

## How it fits the protocol

The scan calls the main Salvage API (`/api/victim-scan`) once per chain, and the claim flow calls `/api/finds` (finder lookup) and `/api/claims` (claim registry) directly from here — both routes on `usesalvage.xyz` allow cross-origin requests specifically from this Mini App's origin. Notification opt-ins live in the same shared Supabase project as `salvage_claims` and `salvage_finds` (table: `miniapp_notifications`).

The on-chain claim logic — contract ABI, router addresses, EIP-712 types — is duplicated from the [protocol repo](https://github.com/2TheMoom/Salvage)'s `src/lib/contracts.ts` into `app/lib/contracts.ts` here, on purpose: there's no shared package between the two repos yet. **If the router address, ABI, or EIP-712 types ever change in the protocol repo, this copy has to be updated by hand** — nothing here will warn you if they drift.

Scope is deliberately narrower than the main app: this Mini App only covers the personal wallet-loss recovery flow ("Did I lose tokens?"). The Contract Scanner (paste any address) and the owner-side recovery panel (for project teams recovering their own contract's funds) stay web-app-only — neither fits a quick mobile interaction, and Mini App traffic isn't really the audience for either.

## Stack

- **Next.js 16.2** · TypeScript · wagmi 2 / viem 2
- **MiniKit / OnchainKit** — Base App Mini App runtime, wallet auto-connect
- **@farcaster/miniapp-sdk** — Farcaster-hosted Mini App support alongside Base App
- **Base Dashboard** (formerly Base.dev) — app registration (`base:app_id` meta tag)
- **Supabase** — shared claims/finds registry and notification opt-in table (`miniapp_notifications`)

## Running locally

```bash
npm install
npm run dev
```

Environment variables (`.env`):

```
NEXT_PUBLIC_PROJECT_NAME
NEXT_PUBLIC_ONCHAINKIT_API_KEY
NEXT_PUBLIC_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ALCHEMY_API_PUBLIC_KEY
```

Note: Mini App features (wallet auto-connect, notification opt-in) require the Base App or Farcaster runtime and won't fully work in a plain browser. To test the on-chain claim flow's UI outside those runtimes, connect a standard injected wallet manually instead.

## Migration note

Originally scaffolded with the Farcaster mini-app spec. After Base's April 2026 move to a standard-web-app model, the deprecated `addFrame` / FID-token flow was removed in favor of wallet-address opt-in and Base Dashboard registration.

---

**Built by [Abu Olumi](https://x.com/Olumi441)** · Builder · Researcher · Content Creator · On-chain Contributor
