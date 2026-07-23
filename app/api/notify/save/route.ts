import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage } from "viem";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
// Matches the signed message built in app/page.tsx — keep both in sync.
const MESSAGE_MAX_AGE_MS = 5 * 60 * 1000;

function buildMessage(wallet: string, timestamp: number): string {
  return `Enable Salvage recovery notifications for ${wallet.toLowerCase()}\n\nTimestamp: ${timestamp}`;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { wallet, fid, timestamp, signature } = await req.json();

    if (!wallet || !ADDRESS_RE.test(wallet)) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address" },
        { status: 400, headers: corsHeaders }
      );
    }
    if (!timestamp || !signature) {
      return NextResponse.json(
        { success: false, error: "Missing signature" },
        { status: 400, headers: corsHeaders }
      );
    }
    if (Math.abs(Date.now() - timestamp) > MESSAGE_MAX_AGE_MS) {
      return NextResponse.json(
        { success: false, error: "Signature expired — please try again" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Proves the caller actually controls `wallet` before we write an
    // opt-in record for it — without this, anyone could enable/disable
    // notifications for, or reassign the fid tied to, an arbitrary wallet
    // they don't control. verifyMessage throws on a malformed signature
    // rather than resolving false, so treat any failure here as invalid.
    let valid = false;
    try {
      valid = await verifyMessage({
        address: wallet as `0x${string}`,
        message: buildMessage(wallet, timestamp),
        signature,
      });
    } catch {
      valid = false;
    }
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Signature verification failed" },
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from("miniapp_notifications").upsert(
      {
        wallet: wallet.toLowerCase(),
        fid: fid ?? null,
        token: "",
        url: "",
        enabled: true,
      },
      { onConflict: "wallet" }
    );

    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err) {
    console.error("[notify/save] error:", err);
    return NextResponse.json(
      { success: false, error: "Save failed" },
      { status: 500, headers: corsHeaders }
    );
  }
}
