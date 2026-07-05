const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";

export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjMzOTIxOSwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDA5NWU3NTliQWY5NkIwNjI2OTZGQTZBODkwNDBDODEyMTRhMWFiYzUifQ",
    payload: "eyJkb21haW4iOiJzYWx2YWdlLW1pbmlhcHAudmVyY2VsLmFwcCJ9",
    signature: "MHgwMWUyMGI2NTEzNjVkMTUzZjI4MDEzNzg5NDczY2RhZGI4NmNlMGVhNmE1YTYzM2Y4OTFlYjVkOWQxNTA2NDNkM2JmMjgxZTIwMTllNTE2MzI3NzA1NmUzZWQ1MTYyOGUxOWM3NjZkMTlkYWM0YjFhZjk2MTJhOTk5YjZkZDg3NjFi",
  },
  baseBuilder: {
    allowedAddresses: [],
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