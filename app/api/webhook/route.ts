import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Base App sends an event with a signed payload. The event type tells
    // us whether the user added the frame (with notification details),
    // removed it, enabled, or disabled notifications.
    // We decode the fid from the payload header.
    const event = body?.event ?? body;

    // frame_removed / notifications_disabled -> mark disabled
    // frame_added / notifications_enabled -> we rely on the save route for
    // the actual token, but keep enabled state fresh here by fid if present.
    const fid = body?.fid ?? event?.fid ?? null;

    if (!fid) {
      // Nothing actionable without an fid to key on.
      return NextResponse.json({ success: true });
    }

    const eventType = event?.event ?? body?.eventType ?? "";

    if (
      eventType === "frame_removed" ||
      eventType === "notifications_disabled"
    ) {
      await supabase
        .from("miniapp_notifications")
        .update({ enabled: false })
        .eq("fid", fid);
    }

    if (
      eventType === "frame_added" ||
      eventType === "notifications_enabled"
    ) {
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