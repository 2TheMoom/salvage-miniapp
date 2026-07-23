import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonFarcasterSignatureHeaderSchema } from "@farcaster/miniapp-core/dist/schemas/shared";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface JfsEnvelope {
  header: string;
  payload: string;
  signature: string;
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf-8");
}

// Base/Farcaster send this as a JSON Farcaster Signature envelope:
// { header, payload, signature }, each base64url — header decodes to
// { fid, type: 'app_key', key }, payload decodes to the actual event.
//
// KNOWN GAP: this only decodes and shape-validates the header; it does not
// cryptographically verify `signature` against `key`, nor confirm `key` is
// a currently-valid signer for `fid` (that needs an ed25519 check plus an
// on-chain read against Farcaster's KeyRegistry, or a third-party verifier
// like Neynar — neither is wired up here). Acceptable for now only because
// this route's one effect (flipping `enabled` on miniapp_notifications) is
// inert: push delivery isn't implemented yet, so nothing currently acts on
// that flag. Add real signature verification before that changes.
function parseEnvelope(body: unknown): { fid: number; event: string } | null {
  const envelope = body as Partial<JfsEnvelope>;
  if (!envelope?.header || !envelope?.payload) return null;

  let header: unknown;
  let payload: unknown;
  try {
    header = JSON.parse(decodeBase64Url(envelope.header));
    payload = JSON.parse(decodeBase64Url(envelope.payload));
  } catch {
    return null;
  }

  const parsedHeader = jsonFarcasterSignatureHeaderSchema.safeParse(header);
  if (!parsedHeader.success) return null;

  const event = (payload as { event?: string })?.event;
  if (!event) return null;

  return { fid: parsedHeader.data.fid, event };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseEnvelope(body);

    if (!parsed) {
      // Nothing actionable without a well-formed, fid-bearing envelope.
      return NextResponse.json({ success: true });
    }
    const { fid, event } = parsed;

    if (event === "frame_removed" || event === "notifications_disabled") {
      await supabase
        .from("miniapp_notifications")
        .update({ enabled: false })
        .eq("fid", fid);
    }

    if (event === "frame_added" || event === "notifications_enabled") {
      await supabase
        .from("miniapp_notifications")
        .update({ enabled: true })
        .eq("fid", fid);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[webhook] error:", err);
    return NextResponse.json({ success: true });
  }
}
