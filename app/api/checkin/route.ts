// /app/api/checkin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { qr_token } = await req.json();
    if (!qr_token) {
      return NextResponse.json({ message: "No QR token" }, { status: 400 });
    }

    // 1. Find gym by qr_token
    const { data: gym, error: gymError } = await supabase
      .from("gyms")
      .select("*")
      .eq("qr_token", qr_token)
      .single();
    if (gymError || !gym) {
      return NextResponse.json({ message: "Invalid QR code." }, { status: 404 });
    }

    // 2. Get member id from cookie/session (for demo, random UUID or similar)
    // You should replace this with your real authentication logic!
    // const member_id = getMemberIdFromSession(req);
    const member_id = "demo-member-123"; // TODO: Use actual auth/session

    // 3. Check if member is already checked-in (look for a record with gym_id, member_id, and no checkout_time)
    const { data: checkins, error: checkinError } = await supabase
      .from("checkins")
      .select("*")
      .eq("gym_id", gym.id)
      .eq("member_id", member_id)
      .is("checkout_time", null);

    if (checkinError) {
      return NextResponse.json({ message: "Check-in lookup error." }, { status: 500 });
    }

    let action, message;
    if (checkins.length > 0) {
      // If found, check-out: set checkout_time to now
      const checkin = checkins[0];
      await supabase
        .from("checkins")
        .update({ checkout_time: new Date().toISOString() })
        .eq("id", checkin.id);
      action = "checkout";
      message = "Checked out successfully!";
    } else {
      // Else, check-in: insert new row
      await supabase.from("checkins").insert({
        gym_id: gym.id,
        member_id,
        checkin_time: new Date().toISOString(),
        checkout_time: null,
      });
      action = "checkin";
      message = "Checked in successfully!";
    }

    return NextResponse.json({ message, action });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || "Unknown error." }, { status: 500 });
  }
}
