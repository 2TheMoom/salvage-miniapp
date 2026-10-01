export type Chain = "eth" | "base" | "arc";

export interface VictimFinding {
  txHash: string;
  timestamp?: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  amount: string;
  valueUsd: number;
  recipientContract: string;
  chain: Chain;
}
