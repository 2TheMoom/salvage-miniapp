"use client";

import { useEffect, useState } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount, useConnect } from "wagmi";

interface VictimFinding {
  txHash: string;
  timestamp?: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  amount: string;
  valueUsd: number;
  recipientContract: string;
}

type Screen = "scanning" | "results" | "empty" | "error";

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
};

// ── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { setMiniAppReady, isMiniAppReady, context } = useMiniKit();
  const { address } = useAccount();
  const { connect, connectors } = useConnect();

  const [screen, setScreen] = useState<Screen>("scanning");
  const [results, setResults] = useState<VictimFinding[]>([]);
  const [totalUsd, setTotalUsd] = useState<string>("0");
  const [error, setError] = useState<string>("");
  const [frameSaved, setFrameSaved] = useState(false);

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
      const res = await fetch(`https://www.usesalvage.xyz/api/victim-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet, chain: "base" }),
      });
      if (!res.ok) throw new Error("Scan failed");
      const data = await res.json();

      if (!data.success || !data.result) {
        throw new Error(data.error ?? "Scan failed");
      }

      const findings: VictimFinding[] = data.result.findings ?? [];

      if (findings.length === 0) {
        setScreen("empty");
        return;
      }

      setResults(findings);
      setTotalUsd(data.result.totalLostUsd.toFixed(2));
      setScreen("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setScreen("error");
    }
  }

  async function handleSaveFrame() {
    setError("");
    if (!wallet) {
      setError("Connect a wallet first");
      return;
    }
    try {
      const res = await fetch(`/api/notify/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          fid: context?.user?.fid ?? null,
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
        </div>
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
                  <span style={s.symbol}>{t.tokenSymbol}</span>
                  <span style={s.usd}>${t.valueUsd.toFixed(2)}</span>
                </div>
                <div style={s.cardMid}>
                  <span style={s.contractName}>{t.tokenName}</span>
                </div>
                <div style={s.cardBot}>
                  <span style={s.balance}>
                    {parseFloat(t.amount).toLocaleString()} {t.tokenSymbol}
                  </span>
                  <a
                    href={`https://www.usesalvage.xyz?lossTx=${t.txHash}&token=${t.tokenAddress}&contract=${t.recipientContract}`}
                    target="_blank"
                    rel="noreferrer"
                    style={s.recoverBtn}
                  >
                    Recover
                  </a>
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

      {/* Footer */}
      <div style={s.footer}>
        <span style={s.footerText}>What the EVM left behind.</span>
      </div>
    </div>
  );
}