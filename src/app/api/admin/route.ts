import { NextRequest, NextResponse } from "next/server";
import { adminStore, isAnnouncement, loginLimiter, secretsEqual, SESSION_SECONDS } from "@/lib/adminStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const COOKIE = "mx11_admin";
const json = (data: unknown, status = 200) => NextResponse.json(data, {
  status, headers: { "Cache-Control": "no-store" },
});
const isAuthed = (req: NextRequest) => adminStore.isAuthed(req.cookies.get(COOKIE)?.value);
const sameOrigin = (req: NextRequest) => {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  if (process.env.APP_ORIGIN) return origin === process.env.APP_ORIGIN;
  try { return new URL(origin).host === (req.headers.get("host") || req.nextUrl.host); }
  catch { return false; }
};

export async function GET(req: NextRequest) {
  try { return json({ announcement: await adminStore.getAnnouncement(), authed: isAuthed(req) }); }
  catch { return json({ error: "Announcement store unavailable" }, 503); }
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Invalid origin" }, 403);
  let body: Record<string, unknown>;
  try {
    const value: unknown = await req.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    body = value as Record<string, unknown>;
  } catch { return json({ error: "Invalid request" }, 400); }
  if (body.action === "login") {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return json({ error: "Admin login is not configured" }, 503);
    if (!loginLimiter.allow()) return json({ error: "Too many login attempts. Try again later." }, 429);
    if (typeof body.password !== "string" || body.password.length > 1_024
      || !secretsEqual(body.password, password)) return json({ error: "Wrong password" }, 401);
    loginLimiter.reset();
    const response = json({ ok: true });
    response.cookies.set(COOKIE, adminStore.login(), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict",
      path: "/", maxAge: SESSION_SECONDS,
    });
    return response;
  }
  if (body.action !== "announcement") return json({ error: "Unknown action" }, 400);
  if (!isAuthed(req)) return json({ error: "Unauthorized" }, 401);
  const announcement = {
    message: typeof body.message === "string" ? body.message.trim() : "",
    type: body.type ?? "info", createdAt: Date.now(),
  };
  if (!isAnnouncement(announcement)) return json({ error: "Invalid announcement" }, 400);
  try { await adminStore.setAnnouncement(announcement); return json({ ok: true }); }
  catch { return json({ error: "Announcement could not be saved" }, 503); }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Invalid origin" }, 403);
  if (!isAuthed(req)) return json({ error: "Unauthorized" }, 401);
  if (req.nextUrl.searchParams.get("action") === "logout") {
    adminStore.logout();
    const response = json({ ok: true });
    response.cookies.delete(COOKIE);
    return response;
  }
  try { await adminStore.setAnnouncement(null); return json({ ok: true }); }
  catch { return json({ error: "Announcement could not be cleared" }, 503); }
}
