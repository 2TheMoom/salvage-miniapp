// Mirrors the SalvageRecoveryRouter section of `src/lib/contracts.ts` in the
// main Salvage repo (usesalvage.xyz). This claim flow now exists in two
// repos on purpose (mini app vs. full web app) — there is no shared package
// between them. If the router address, ABI, or EIP-712 types ever change,
// update both copies by hand; nothing here will warn you if they drift.

export const RECOVERY_ROUTER_ADDRESS: Record<number, `0x${string}`> = {
  1: "0xD9A5f1Fcf39F99152d6443132B21C1D8f7fAAC25", // ETH mainnet
  8453: "0x2240792d1A9D964d238bD693fCb09586B10faEdf", // Base mainnet
};

export const ROUTER_ABI = [
  {
    name: "registerClaim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "victim", type: "address" },
      { name: "finder", type: "address" },
      { name: "lossTxHash", type: "bytes32" },
      { name: "deadline", type: "uint256" },
      { name: "victimSignature", type: "bytes" },
    ],
    outputs: [
      { name: "claimId", type: "bytes32" },
      { name: "receiver", type: "address" },
    ],
  },
  {
    name: "claimReceiver",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "claimId", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "settle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "claimId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "claims",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "token", type: "address" },
      { name: "victim", type: "address" },
      { name: "finder", type: "address" },
      { name: "lossTxHash", type: "bytes32" },
      { name: "createdAt", type: "uint64" },
      { name: "totalSettled", type: "uint256" },
    ],
  },
  {
    name: "ClaimRegistered",
    type: "event",
    inputs: [
      { name: "claimId", type: "bytes32", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "victim", type: "address", indexed: true },
      { name: "finder", type: "address", indexed: false },
      { name: "lossTxHash", type: "bytes32", indexed: false },
      { name: "receiver", type: "address", indexed: false },
    ],
  },
  {
    name: "ClaimSettled",
    type: "event",
    inputs: [
      { name: "claimId", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "victimPayout", type: "uint256", indexed: false },
      { name: "finderPayout", type: "uint256", indexed: false },
      { name: "protocolPayout", type: "uint256", indexed: false },
    ],
  },
] as const;

// EIP-712 typed-data shape for RecoveryClaim signatures
export const ROUTER_EIP712_TYPES = {
  RecoveryClaim: [
    { name: "token", type: "address" },
    { name: "victim", type: "address" },
    { name: "finder", type: "address" },
    { name: "lossTxHash", type: "bytes32" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export function routerDomain(chainId: number) {
  return {
    name: "SalvageRecoveryRouter",
    version: "1",
    chainId,
    verifyingContract: RECOVERY_ROUTER_ADDRESS[chainId],
  } as const;
}

// Minimal ERC-20 read ABI — just enough to poll receiver funding.
export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
