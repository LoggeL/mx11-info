import { NextRequest, NextResponse } from "next/server";
import { getAdminToken, setAdminToken, getAnnouncement, setAnnouncement } from "@/lib/adminStore";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const COOKIE = "mx11_admin";

function isAuthed(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  return token && token === getAdminToken();
}

// GET → get current announcement (public) + auth status
export async function GET(req: NextRequest) {
  return NextResponse.json({
    announcement: getAnnouncement(),
    authed: isAuthed(req),
  });
}

// POST → login or set announcement
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // Login
  if (body.action === "login") {
    const pw = process.env.ADMIN_PASSWORD;
    if (!pw) return NextResponse.json({ error: "No admin password configured" }, { status: 503 });
    if (body.password !== pw) return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    const token = randomBytes(32).toString("hex");
    setAdminToken(token);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "strict", maxAge: 60 * 60 * 8 });
    return res;
  }

  // Announcement (requires auth)
  if (body.action === "announcement") {
    if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!body.message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });
    setAnnouncement({ message: body.message.trim(), type: body.type ?? "info", createdAt: Date.now() });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// DELETE → clear announcement or logout
export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);

  if (searchParams.get("action") === "logout") {
    setAdminToken(null);
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(COOKIE);
    return res;
  }

  setAnnouncement(null);
  return NextResponse.json({ ok: true });
}
