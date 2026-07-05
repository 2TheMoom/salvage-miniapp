import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { wallet, fid } = await req.json();

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "Missing wallet" },
        { status: 400, headers: corsHeaders }
      );
    }

    const { error } = await supabase
      .from("miniapp_notifications")
      .upsert(
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