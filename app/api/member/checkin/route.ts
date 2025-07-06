import { NextRequest, NextResponse } from "next/server";

type CheckInState = {
  time: string;
  type: "checkin" | "checkout";
  qrToken: string;
};

const checkins: Record<string, CheckInState> = {}; // Use your DB in production

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, qrToken }: { userId?: string; qrToken?: string } = body;

    if (!userId || !qrToken) {
      return NextResponse.json(
        { error: "Missing userId or qrToken" },
        { status: 400 }
      );
    }

    // Simulate check-in/check-out toggle
    const lastCheckin = checkins[userId];
    const now = new Date().toISOString();

    if (!lastCheckin || lastCheckin.type === "checkout") {
      checkins[userId] = { time: now, type: "checkin", qrToken };
      return NextResponse.json({
        message: "Checked in!",
        checkedIn: true,
        time: now,
      });
    } else {
      checkins[userId] = { time: now, type: "checkout", qrToken };
      return NextResponse.json({
        message: "Checked out!",
        checkedIn: false,
        time: now,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
