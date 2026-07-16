const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";

export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjMzOTIxOSwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDA5NWU3NTliQWY5NkIwNjI2OTZGQTZBODkwNDBDODEyMTRhMWFiYzUifQ",
    payload: "eyJkb21haW4iOiJtaW5pYXBwLnVzZXNhbHZhZ2UueHl6In0",
    signature: "MHg4YjljOTU4NjdlMDZjMmNhODFiNzU5ZTFkM2MzZWE2MDc1ZjIyNmUzOGVmMDExM2QyMTZmODU5MjM1ZTMwNzc3Mzg1ZjNjMTRhYmFmYmQ2ZjNiMTI1YjYyMGYzMDc1OTY0NDBmY2I1NWQ0ZjRmNWVmNjlkZjI1MjAwZTQyN2M0OTFj",
  },
  baseBuilder: {
    allowedAddresses: ["0x095e759bAf96B062696FA6A89040C81214a1abc5"],
  },
  miniapp: {
    version: "1",
    name: "Salvage",
    subtitle: "Recover stranded tokens",
    description: "Find and recover ERC-20 tokens trapped in smart contracts. What the EVM left behind.",
    screenshotUrls: [],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/splash.png`,
    splashBackgroundColor: "#0F0F11",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "utility",
    tags: ["recovery", "defi", "tools", "base"],
    heroImageUrl: `${ROOT_URL}/hero.png`,
    tagline: "What the EVM left behind.",
    ogTitle: "Salvage — Recover Stranded Tokens",
    ogDescription: "Find ERC-20 tokens trapped in smart contracts and recover them.",
    ogImageUrl: `${ROOT_URL}/hero.png`,
  },
} as const;