"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useSignTypedData,
  useWriteContract,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import { keccak256, encodeAbiParameters, zeroAddress } from "viem";
import {
  RECOVERY_ROUTER_ADDRESS,
  ROUTER_ABI,
  ROUTER_EIP712_TYPES,
  routerDomain,
  ERC20_ABI,
} from "@/app/lib/contracts";
import { VictimFinding, Chain } from "@/app/lib/types";

// Same origin the rest of this mini app already talks to for scanning.
const SALVAGE_API_BASE = "https://www.usesalvage.xyz";

const CHAIN_IDS: Record<Chain, number> = { eth: 1, base: 8453 };

interface ClaimPanelProps {
  finding: VictimFinding;
  victimWallet: string;
  chain: Chain;
}

type PanelState =
  | "idle"
  | "signing"
  | "registering"
  | "registered"
  | "settling"
  | "settled"
  | "error";

const s: Record<string, React.CSSProperties> = {
  wrap: {
    marginTop: "10px",
    padding: "14px",
    borderRadius: "12px",
    background: "#16161A",
    border: "1px solid #1E1E24",
  },
  eyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#5A5A60",
    marginBottom: "10px",
  },
  body: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    color: "#8A8A90",
    lineHeight: 1.7,
  },
  btn: {
    marginTop: "10px",
    background: "#627EEA",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 18px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  btnSecondary: {
    marginTop: "10px",
    marginRight: "8px",
    background: "transparent",
    color: "#627EEA",
    border: "1px solid rgba(98,126,234,0.4)",
    borderRadius: "10px",
    padding: "10px 18px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  addressBox: {
    marginTop: "8px",
    padding: "9px 11px",
    borderRadius: "8px",
    background: "#0F0F11",
    border: "1px solid #1E1E24",
    color: "#E9E6DF",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    wordBreak: "break-all",
  },
  success: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    color: "#3de8a0",
    lineHeight: 1.7,
  },
  error: {
    marginTop: "8px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    color: "#e85d5d",
  },
  txLink: {
    display: "inline-block",
    marginTop: "8px",
    marginRight: "12px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    color: "#627EEA",
  },
};

export default function ClaimPanel({
  finding,
  victimWallet,
  chain,
}: ClaimPanelProps) {
  const chainId = CHAIN_IDS[chain];
  const routerAddress = RECOVERY_ROUTER_ADDRESS[chainId];

  const { address, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();

  const [state, setState] = useState<PanelState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registerTx, setRegisterTx] = useState<string | null>(null);
  const [settleTx, setSettleTx] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // The off-chain-registered finder for this find, if any. `null` until the
  // lookup resolves (or there is none), which is treated as "no finder" —
  // the common case for a wallet scanning its own losses.
  const [registeredFinder, setRegisteredFinder] = useState<string | null>(
    null
  );

  useEffect(() => {
    const findKey = `${chain}:${finding.tokenAddress.toLowerCase()}:${finding.txHash.toLowerCase()}`;
    fetch(
      `${SALVAGE_API_BASE}/api/finds?findKey=${encodeURIComponent(findKey)}`
    )
      .then((r) => r.json())
      .then((d) => {
        const registered = d?.find?.finder_address as string | undefined;
        // A finder equal to the victim can never settle on-chain (the
        // router reverts on finder === victim) — never trust a stored value
        // blindly, treat that case as no finder.
        if (
          registered &&
          registered.toLowerCase() !== victimWallet.toLowerCase()
        ) {
          setRegisteredFinder(registered);
        }
      })
      .catch(() => {});
  }, [chain, finding.tokenAddress, finding.txHash, victimWallet]);

  const isVictimWallet =
    isConnected && address?.toLowerCase() === victimWallet.toLowerCase();

  // The finder actually used on-chain: the registered finder if one exists,
  // otherwise zeroAddress (a standard victim-initiated claim, 95/5 split).
  // This must never be hardcoded to zeroAddress regardless of the lookup —
  // that would silently break payouts to a legitimate finder.
  const finderForClaim = (registeredFinder ?? zeroAddress) as `0x${string}`;
  const hasFinder = finderForClaim !== zeroAddress;

  // claimId is deterministic: keccak256(abi.encode(token, victim, finder, lossTxHash))
  const claimId = useMemo(() => {
    try {
      return keccak256(
        encodeAbiParameters(
          [
            { type: "address" },
            { type: "address" },
            { type: "address" },
            { type: "bytes32" },
          ],
          [
            finding.tokenAddress as `0x${string}`,
            victimWallet as `0x${string}`,
            finderForClaim,
            finding.txHash as `0x${string}`,
          ]
        )
      );
    } catch {
      return undefined;
    }
  }, [finding.tokenAddress, finding.txHash, victimWallet, finderForClaim]);

  const { data: existingClaim, refetch: refetchClaim } = useReadContract({
    address: routerAddress,
    abi: ROUTER_ABI,
    functionName: "claims",
    args: claimId ? [claimId] : undefined,
    chainId,
    query: { enabled: !!claimId },
  });
  const alreadyRegistered = existingClaim && existingClaim[1] !== zeroAddress;

  // totalSettled is the 6th field of the Claim struct (index 5). Non-zero
  // means this claim already settled on-chain, so an empty receiver balance
  // means "done", not "awaiting deposit".
  const alreadySettledOnChain =
    !!existingClaim && (existingClaim[5] as bigint) > 0n;
  const isSettled = alreadySettledOnChain || state === "settled";

  const { data: receiver } = useReadContract({
    address: routerAddress,
    abi: ROUTER_ABI,
    functionName: "claimReceiver",
    args: claimId ? [claimId] : undefined,
    chainId,
    query: { enabled: !!claimId },
  });

  const isRegistered =
    alreadyRegistered || state === "registered" || state === "settled";

  const { data: receiverBalance, refetch: refetchBalance } = useReadContract({
    address: finding.tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: receiver ? [receiver] : undefined,
    chainId,
    query: {
      enabled: !!receiver && isRegistered && !isSettled,
      refetchInterval: 6000,
    },
  });
  const funded = (receiverBalance ?? 0n) > 0n;

  const handleStartRecovery = async () => {
    if (!isVictimWallet || !claimId) return;
    setErrorMsg(null);
    try {
      await switchChainAsync({ chainId }).catch(() => {});

      setState("signing");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const signature = await signTypedDataAsync({
        domain: routerDomain(chainId),
        types: ROUTER_EIP712_TYPES,
        primaryType: "RecoveryClaim",
        message: {
          token: finding.tokenAddress as `0x${string}`,
          victim: victimWallet as `0x${string}`,
          finder: finderForClaim,
          lossTxHash: finding.txHash as `0x${string}`,
          deadline,
        },
      });

      setState("registering");
      const txHash = await writeContractAsync({
        address: routerAddress,
        abi: ROUTER_ABI,
        functionName: "registerClaim",
        args: [
          finding.tokenAddress as `0x${string}`,
          victimWallet as `0x${string}`,
          finderForClaim,
          finding.txHash as `0x${string}`,
          deadline,
          signature,
        ],
        chainId,
      });

      // Record in Salvage's claim registry — non-blocking for the user.
      fetch(`${SALVAGE_API_BASE}/api/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          chain,
          tokenAddress: finding.tokenAddress,
          tokenSymbol: finding.tokenSymbol,
          victimAddress: victimWallet,
          finderAddress: hasFinder ? finderForClaim : null,
          lossTxHash: finding.txHash,
          receiverAddress: receiver,
          valueUsd: finding.valueUsd,
          registerTx: txHash,
        }),
      }).catch(() => {});

      setRegisterTx(txHash);
      setState("registered");
      refetchClaim();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setErrorMsg(
        msg.includes("rejected") || msg.includes("denied")
          ? "Signature or transaction rejected."
          : "Claim registration failed. Please try again."
      );
      setState("error");
    }
  };

  const handleSettle = async () => {
    if (!claimId) return;
    setErrorMsg(null);
    try {
      await switchChainAsync({ chainId }).catch(() => {});
      setState("settling");
      const settleHash = await writeContractAsync({
        address: routerAddress,
        abi: ROUTER_ABI,
        functionName: "settle",
        args: [claimId],
        chainId,
      });
      setSettleTx(settleHash);
      fetch(`${SALVAGE_API_BASE}/api/claims`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          status: "settled",
          settleTx: settleHash,
        }),
      }).catch(() => {});
      setState("settled");
      refetchBalance();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setErrorMsg(
        msg.includes("rejected") || msg.includes("denied")
          ? "Transaction rejected."
          : msg.includes("nothing to settle")
          ? "Nothing to settle yet — the receiver has no tokens."
          : "Settlement failed. Please try again."
      );
      setState("error");
    }
  };

  const copyOwnerInstructions = async () => {
    if (!receiver) return;
    const chainName = chain === "eth" ? "Ethereum" : "Base";
    const explorer = chain === "eth" ? "etherscan.io" : "basescan.org";
    const text = `Recovery deposit address (Salvage claim ${claimId?.slice(
      0,
      10
    )}…):

${receiver}

Rescue the stranded ${finding.tokenSymbol} to this exact address on ${chainName}. Settlement is automatic and fully on-chain — ${
      hasFinder
        ? "90% routes to the verified victim, 7% to the finder, 3% to the protocol"
        : "95% routes to the verified victim, 5% to the protocol"
    }. You never have to trust a claimed wallet address.

Verify the settlement contract yourself: https://${explorer}/address/${routerAddress}#code`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const explorerBase = chain === "eth" ? "https://etherscan.io" : "https://basescan.org";

  return (
    <div style={s.wrap}>
      <div style={s.eyebrow}>
        On-chain Recovery ·{" "}
        {hasFinder ? "90% you / 7% finder / 3% protocol" : "95% you / 5% protocol"}
      </div>

      {!isRegistered && (
        <>
          {!isConnected ? (
            <div style={s.body}>Connect the wallet that sent this transfer to start recovery.</div>
          ) : !isVictimWallet ? (
            <div style={s.body}>
              This claim can only be started by the wallet that sent the
              transfer ({victimWallet.slice(0, 6)}…{victimWallet.slice(-4)}).
            </div>
          ) : (
            <>
              {hasFinder && (
                <div style={{ ...s.body, marginBottom: "4px" }}>
                  A finder ({finderForClaim.slice(0, 6)}…
                  {finderForClaim.slice(-4)}) registered this find first.
                  Signing routes 90% to you, 7% to them, 3% to the protocol.
                </div>
              )}
              <button
                style={s.btn}
                onClick={handleStartRecovery}
                disabled={state === "signing" || state === "registering"}
              >
                {state === "signing"
                  ? "Sign the claim in your wallet…"
                  : state === "registering"
                  ? "Registering on-chain…"
                  : "Start Recovery — Sign Claim"}
              </button>
            </>
          )}
        </>
      )}

      {isRegistered && isSettled && (
        <div style={s.success}>
          <div>✓ Recovery complete — this claim has been settled on-chain.</div>
          <div style={{ color: "#8A8A90", marginTop: "4px" }}>
            {hasFinder
              ? "90% routed to the victim, 7% to the finder, 3% to the protocol. Nothing further to do."
              : "95% routed to the victim, 5% to the protocol. Nothing further to do."}
          </div>
        </div>
      )}

      {isRegistered && !isSettled && receiver && (
        <div style={s.body}>
          <div>✓ Claim registered on-chain. Recovery deposit address:</div>
          <div style={s.addressBox}>{receiver}</div>
          <div style={{ marginBottom: "4px" }}>
            {funded ? (
              <span style={{ color: "#3de8a0" }}>● Receiver funded — ready to settle</span>
            ) : (
              "Share this with the contract owner. Once they rescue the tokens here, anyone can settle."
            )}
          </div>
          <div>
            <button style={s.btnSecondary} onClick={copyOwnerInstructions}>
              {copied ? "✓ Copied" : "Copy Owner Instructions"}
            </button>
            {funded && (
              <button
                style={{ ...s.btn, marginTop: "10px", background: "#3de8a0", color: "#0F0F11" }}
                onClick={handleSettle}
                disabled={state === "settling"}
              >
                {state === "settling" ? "Settling…" : "Settle Recovery"}
              </button>
            )}
          </div>
        </div>
      )}

      {(registerTx || settleTx) && (
        <div>
          {registerTx && (
            <a
              href={`${explorerBase}/tx/${registerTx}`}
              target="_blank"
              rel="noopener noreferrer"
              style={s.txLink}
            >
              Registration tx ↗
            </a>
          )}
          {settleTx && (
            <a
              href={`${explorerBase}/tx/${settleTx}`}
              target="_blank"
              rel="noopener noreferrer"
              style={s.txLink}
            >
              Settlement tx ↗
            </a>
          )}
        </div>
      )}

      {errorMsg && <div style={s.error}>{errorMsg}</div>}
    </div>
  );
}
