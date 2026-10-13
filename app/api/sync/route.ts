import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    return NextResponse.json({ ok: true, payload, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Sync route failed:", error);
    return NextResponse.json({ error: "Invalid sync payload" }, { status: 400 });
  }
}
