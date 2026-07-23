"use client";

import { useEffect, useState } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount, useConnect, useSignMessage } from "wagmi";
import ClaimPanel from "@/app/components/ClaimPanel";
import { VictimFinding, Chain } from "@/app/lib/types";

const SCAN_CHAINS: Chain[] = ["eth", "base"];
const CHAIN_LABEL: Record<Chain, string> = { eth: "Ethereum", base: "Base" };

type Screen = "scanning" | "results" | "empty" | "error" | "claim";

// Some Farcaster mini app hosts attach a wallet address to the user context
// even though it isn't part of the official @farcaster/miniapp-sdk type.
type ContextUserWithAddress = { address?: string };

// ── Styles ──────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100dvh",
    background: "#0F0F11",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Space Grotesk', sans-serif",
    color: "#E9E6DF",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #1E1E24",
  },
  logo: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: "18px",
    letterSpacing: "0.08em",
    color: "#E9E6DF",
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textDecoration: "none",
  },
  walletChip: {
    fontSize: "11px",
    fontFamily: "'JetBrains Mono', monospace",
    color: "#627EEA",
    background: "rgba(98,126,234,0.1)",
    border: "1px solid rgba(98,126,234,0.3)",
    borderRadius: "20px",
    padding: "4px 10px",
  },
  connectBtn: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#627EEA",
    background: "rgba(98,126,234,0.1)",
    border: "1px solid rgba(98,126,234,0.3)",
    borderRadius: "20px",
    padding: "5px 14px",
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "32px 20px",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "3px solid rgba(98,126,234,0.2)",
    borderTop: "3px solid #627EEA",
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
  },
  scanText: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#E9E6DF",
    textAlign: "center",
  },
  muted: {
    fontSize: "12px",
    color: "#5A5A60",
    fontFamily: "'JetBrains Mono', monospace",
    textAlign: "center",
  },
  emptyIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "rgba(26,107,60,0.15)",
    border: "1px solid rgba(26,107,60,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    color: "#3de8a0",
  },
  btn: {
    marginTop: "8px",
    background: "#627EEA",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  ghostBtn: {
    margin: "16px 20px 0",
    background: "transparent",
    color: "#627EEA",
    border: "1px solid rgba(98,126,234,0.4)",
    borderRadius: "10px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    width: "calc(100% - 40px)",
  },
  savedText: {
    fontSize: "13px",
    color: "#3de8a0",
    textAlign: "center",
    padding: "8px 20px",
  },
  resultsWrap: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    paddingBottom: "16px",
  },
  totalBanner: {
    background: "rgba(98,126,234,0.08)",
    borderBottom: "1px solid rgba(98,126,234,0.2)",
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: "12px",
    color: "#5A5A60",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: "'JetBrains Mono', monospace",
  },
  totalAmount: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#627EEA",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  card: {
    background: "#16161A",
    border: "1px solid #1E1E24",
    borderRadius: "12px",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  symbol: {
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700,
    fontSize: "14px",
    color: "#E9E6DF",
  },
  chainBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#627EEA",
    background: "rgba(98,126,234,0.1)",
    border: "1px solid rgba(98,126,234,0.3)",
    borderRadius: "6px",
    padding: "2px 6px",
    marginLeft: "8px",
  },
  usd: {
    fontWeight: 700,
    fontSize: "15px",
    color: "#627EEA",
  },
  cardMid: {},
  contractName: {
    fontSize: "12px",
    color: "#5A5A60",
  },
  cardBot: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "4px",
  },
  balance: {
    fontSize: "12px",
    fontFamily: "'JetBrains Mono', monospace",
    color: "#5A5A60",
  },
  recoverBtn: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#627EEA",
    textDecoration: "none",
    background: "rgba(98,126,234,0.1)",
    border: "1px solid rgba(98,126,234,0.3)",
    borderRadius: "8px",
    padding: "5px 12px",
  },
  footer: {
    padding: "12px 20px",
    borderTop: "1px solid #1E1E24",
    textAlign: "center",
  },
  footerText: {
    fontSize: "11px",
    color: "#5A5A60",
    fontFamily: "'JetBrains Mono', monospace",
  },
  footerLink: {
    display: "block",
    fontSize: "11px",
    color: "#627EEA",
    fontFamily: "'JetBrains Mono', monospace",
    textDecoration: "none",
    marginTop: "4px",
  },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { setMiniAppReady, isMiniAppReady, context } = useMiniKit();
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const { signMessageAsync } = useSignMessage();

  const [screen, setScreen] = useState<Screen>("scanning");
  const [prevScreen, setPrevScreen] = useState<Screen>("results");
  const [results, setResults] = useState<VictimFinding[]>([]);
  const [totalUsd, setTotalUsd] = useState<string>("0");
  const [error, setError] = useState<string>("");
  const [frameSaved, setFrameSaved] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<VictimFinding | null>(null);

  useEffect(() => {
    if (!isMiniAppReady) setMiniAppReady();
  }, [setMiniAppReady, isMiniAppReady]);

  useEffect(() => {
    const wallet = address || (context?.user as ContextUserWithAddress | undefined)?.address;
    if (!wallet) return;
    runScan(wallet);
  }, [address, context]);

  async function runScan(wallet: string) {
    setScreen("scanning");
    try {
      // Scan both chains in parallel — a hardcoded single chain would silently
      // miss stranded tokens on whichever chain wasn't checked. Each chain's
      // failure is independent: one failing shouldn't hide results from the
      // other, only both failing is a real scan failure.
      const outcomes = await Promise.allSettled(
        SCAN_CHAINS.map(async (chain) => {
          const res = await fetch(`https://www.usesalvage.xyz/api/victim-scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: wallet, chain }),
          });
          const data = await res.json();
          if (!res.ok || !data.success || !data.result) {
            throw new Error(data.error ?? "Scan failed");
          }
          return { chain, result: data.result };
        })
      );

      let combined: VictimFinding[] = [];
      let total = 0;
      let anySucceeded = false;

      for (const outcome of outcomes) {
        if (outcome.status !== "fulfilled") continue;
        anySucceeded = true;
        const { chain, result } = outcome.value;
        const tagged: VictimFinding[] = (result.findings ?? []).map(
          (f: Omit<VictimFinding, "chain">) => ({ ...f, chain })
        );
        combined = combined.concat(tagged);
        total += result.totalLostUsd ?? 0;
      }

      if (!anySucceeded) {
        throw new Error("Scan failed");
      }

      if (combined.length === 0) {
        setScreen("empty");
        return;
      }

      combined.sort((a, b) => b.valueUsd - a.valueUsd);
      setResults(combined);
      setTotalUsd(total.toFixed(2));
      setScreen("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setScreen("error");
    }
  }

  async function handleSaveFrame() {
    setError("");
    // Needs the actual wagmi-connected account, not just whatever address
    // the Farcaster context reports — the request below has to be signed by
    // that same wallet, and we can only sign with an account wagmi has
    // actually connected.
    if (!address) {
      setError("Connect a wallet first");
      return;
    }
    try {
      const timestamp = Date.now();
      // Must match the message the server reconstructs in
      // app/api/notify/save/route.ts's buildMessage() exactly.
      const message = `Enable Salvage recovery notifications for ${address.toLowerCase()}\n\nTimestamp: ${timestamp}`;
      const signature = await signMessageAsync({ message });

      const res = await fetch(`/api/notify/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          fid: context?.user?.fid ?? null,
          timestamp,
          signature,
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setFrameSaved(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not enable notifications"
      );
    }
  }

  const wallet = address || (context?.user as ContextUserWithAddress | undefined)?.address;
  const shortWallet = wallet
    ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
    : "Not connected";

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <a
          href="https://www.usesalvage.xyz"
          target="_blank"
          rel="noreferrer"
          style={s.logoLink}
          aria-label="Go to usesalvage.xyz"
        >
          <svg
            width={28}
            height={28}
            viewBox="0 0 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Salvage sonar mark"
          >
            <path d="M 8 44 A 26 26 0 0 1 44 8" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.18" />
            <path d="M 13 44 A 21 21 0 0 1 44 13" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.45" />
            <path d="M 19 44 A 15 15 0 0 1 44 19" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.82" />
            <circle cx="44" cy="44" r="4.5" fill="#ffffff" />
            <circle cx="44" cy="44" r="8" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.25" />
          </svg>
          <span style={s.logo}>SALVAGE</span>
        </a>
        {wallet ? (
          <span style={s.walletChip}>{shortWallet}</span>
        ) : (
          <button
            style={s.connectBtn}
            onClick={() => connectors[0] && connect({ connector: connectors[0] })}
          >
            Connect
          </button>
        )}
      </div>

      {/* Scanning */}
      {screen === "scanning" && (
        <div style={s.center}>
          <div style={s.spinner} />
          <p style={s.scanText}>Scanning for stranded tokens...</p>
          <p style={s.muted}>{shortWallet}</p>
        </div>
      )}

      {/* Empty */}
      {screen === "empty" && (
        <div style={s.center}>
          <div style={s.emptyIcon}>✓</div>
          <p style={s.scanText}>No stranded tokens found</p>
          <p style={s.muted}>Your wallet looks clean.</p>
          <p style={s.muted}>
            Salvage checks for tokens accidentally sent to contracts that
            can&apos;t move them back out.
          </p>
          {!frameSaved ? (
            <button style={s.btn} onClick={handleSaveFrame}>
              Get notified if that changes
            </button>
          ) : (
            <p style={s.savedText}>Notifications enabled ✓</p>
          )}
          {error && <p style={s.muted}>{error}</p>}
        </div>
      )}

      {/* Error */}
      {screen === "error" && (
        <div style={s.center}>
          <p style={s.scanText}>Scan failed</p>
          <p style={s.muted}>{error}</p>
          <button style={s.btn} onClick={() => wallet && runScan(wallet)}>
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {screen === "results" && (
        <div style={s.resultsWrap}>
          <div style={s.totalBanner}>
            <span style={s.totalLabel}>Recoverable Value</span>
            <span style={s.totalAmount}>${totalUsd}</span>
          </div>

          <div style={s.list}>
            {results.map((t, i) => (
              <div key={i} style={s.card}>
                <div style={s.cardTop}>
                  <span>
                    <span style={s.symbol}>{t.tokenSymbol}</span>
                    <span style={s.chainBadge}>{CHAIN_LABEL[t.chain]}</span>
                  </span>
                  <span style={s.usd}>${t.valueUsd.toFixed(2)}</span>
                </div>
                <div style={s.cardMid}>
                  <span style={s.contractName}>{t.tokenName}</span>
                </div>
                <div style={s.cardBot}>
                  <span style={s.balance}>
                    {parseFloat(t.amount).toLocaleString()} {t.tokenSymbol}
                  </span>
                  <button
                    style={{
                      ...s.recoverBtn,
                      cursor: "pointer",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                    onClick={() => {
                      setSelectedFinding(t);
                      setPrevScreen(screen);
                      setScreen("claim");
                    }}
                  >
                    Recover
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!frameSaved ? (
            <button style={s.ghostBtn} onClick={handleSaveFrame}>
              Save app + enable notifications
            </button>
          ) : (
            <p style={s.savedText}>Notifications enabled ✓</p>
          )}
        </div>
      )}

      {/* Claim */}
      {screen === "claim" && selectedFinding && wallet && (
        <div style={s.resultsWrap}>
          <div style={{ padding: "12px 16px 0" }}>
            <button
              style={{
                background: "transparent",
                border: "none",
                color: "#627EEA",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                cursor: "pointer",
                padding: 0,
              }}
              onClick={() => setScreen(prevScreen)}
            >
              ← Back
            </button>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <div style={s.card}>
              <div style={s.cardTop}>
                <span>
                  <span style={s.symbol}>{selectedFinding.tokenSymbol}</span>
                  <span style={s.chainBadge}>
                    {CHAIN_LABEL[selectedFinding.chain]}
                  </span>
                </span>
                <span style={s.usd}>${selectedFinding.valueUsd.toFixed(2)}</span>
              </div>
              <div style={s.cardMid}>
                <span style={s.contractName}>{selectedFinding.tokenName}</span>
              </div>
              <ClaimPanel
                finding={selectedFinding}
                victimWallet={wallet}
                chain={selectedFinding.chain}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={s.footer}>
        <span style={s.footerText}>What the EVM left behind.</span>
        <a
          href="https://www.usesalvage.xyz"
          target="_blank"
          rel="noreferrer"
          style={s.footerLink}
        >
          Scan contracts & owner recovery → usesalvage.xyz
        </a>
      </div>
    </div>
  );
}