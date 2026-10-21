import { adminStore, isAnnouncement, loginLimiter, secretsEqual, SESSION_SECONDS } from '../lib/adminStore.js';

const COOKIE = 'mx11_admin';
const json = (data, status = 200, headers = {}) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', ...headers },
});
const isAuthed = req => {
  const cookie = (req.headers.get('cookie') || '').split(';').find(v => v.trim().startsWith(`${COOKIE}=`));
  return adminStore.isAuthed(cookie?.trim().slice(COOKIE.length + 1));
};
const sameOrigin = req => {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  if (process.env.APP_ORIGIN) return origin === process.env.APP_ORIGIN;
  try { return new URL(origin).host === (req.headers.get('host') || new URL(req.url).host); }
  catch { return false; }
};
const cookie = (value, seconds) => `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

export async function GET(req) {
  try { return json({ announcement: await adminStore.getAnnouncement(), authed: isAuthed(req) }); }
  catch { return json({ error: 'Announcement store unavailable' }, 503); }
}
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'Invalid origin' }, 403);
  let body;
  try {
    body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch { return json({ error: 'Invalid request' }, 400); }
  if (body.action === 'login') {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return json({ error: 'Admin login is not configured' }, 503);
    if (!loginLimiter.allow()) return json({ error: 'Too many login attempts. Try again later.' }, 429);
    if (typeof body.password !== 'string' || body.password.length > 1024 || !secretsEqual(body.password, password)) return json({ error: 'Wrong password' }, 401);
    loginLimiter.reset();
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(adminStore.login(), SESSION_SECONDS) });
  }
  if (body.action !== 'announcement') return json({ error: 'Unknown action' }, 400);
  if (!isAuthed(req)) return json({ error: 'Unauthorized' }, 401);
  const announcement = { message: typeof body.message === 'string' ? body.message.trim() : '', type: body.type ?? 'info', createdAt: Date.now() };
  if (!isAnnouncement(announcement)) return json({ error: 'Invalid announcement' }, 400);
  try { await adminStore.setAnnouncement(announcement); return json({ ok: true }); }
  catch { return json({ error: 'Announcement could not be saved' }, 503); }
}
export async function DELETE(req) {
  if (!sameOrigin(req)) return json({ error: 'Invalid origin' }, 403);
  if (!isAuthed(req)) return json({ error: 'Unauthorized' }, 401);
  if (new URL(req.url).searchParams.get('action') === 'logout') {
    adminStore.logout();
    return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
  }
  try { await adminStore.setAnnouncement(null); return json({ ok: true }); }
  catch { return json({ error: 'Announcement could not be cleared' }, 503); }
}
