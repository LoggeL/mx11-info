import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';

const directory = await mkdtemp(join(tmpdir(), 'mx11-http-'));
process.env.MX11_DATA_DIR = directory;
process.env.ADMIN_PASSWORD = randomUUID();
process.env.NODE_ENV = 'production';
const { createApplicationServer } = await import('../server/index.js');

test('native HTTP server preserves pages, compression, routing and protected admin operations', async t => {
  const server = await createApplicationServer();
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await t.test('all three static pages and local module imports are served without framework payloads', async () => {
      for (const path of ['/', '/portfolio/photos', '/portfolio/videos/']) {
        const response = await fetch(base + path);
        assert.equal(response.status, 200);
        const body = await response.text();
        assert.match(body, /<html lang="en">/);
        assert.match(body, /type="module" src="\/js\/app.js"/);
        assert.doesNotMatch(body, /__next|_next\/|react-dom|next\/link/);
        assert.equal(response.headers.get('content-encoding'), 'gzip');
      }
      const response = await fetch(base + '/js/app.js');
      assert.match(response.headers.get('content-type'), /javascript/);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    });
    await t.test('HEAD, ETags and compression negotiation behave correctly', async () => {
      const response = await fetch(base + '/design.css', { method: 'HEAD', headers: { 'Accept-Encoding': 'br' } });
      assert.equal(response.status, 200); assert.equal(await response.text(), '');
      assert.equal(response.headers.get('content-encoding'), 'br');
      assert.equal((await fetch(base + '/design.css', { headers: { 'If-None-Match': response.headers.get('etag') } })).status, 304);
      const raw = await fetch(base + '/design.css', { headers: { 'Accept-Encoding': 'br;q=0, gzip;q=0' } });
      assert.equal(raw.headers.get('content-encoding'), null);
    });
    await t.test('private files, unknown paths and unsupported methods are rejected', async () => {
      for (const path of ['/package.json', '/server/index.js', '/.env.local', '/data/announcement.json', '/no-such-page', '/api/no-such-route']) assert.equal((await fetch(base + path)).status, 404);
      assert.equal((await fetch(base + '/api/admin', { method: 'PUT' })).status, 405);
      assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
      assert.equal((await fetch(base + '/api/portfolio/asset/invalid')).status, 400);
    });
    await t.test('body size, CSRF and authentication checks survive the migration', async () => {
      const post = body => fetch(base + '/api/admin', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
      assert.equal((await post({ action: 'login', password: 'x'.repeat(17000) })).status, 413);
      assert.equal((await fetch(base + '/api/admin', { method: 'POST', headers: { Origin: 'https://other.invalid' }, body: '{}' })).status, 403);
      assert.equal((await post({ action: 'announcement', message: 'Unauthorized' })).status, 401);
      assert.equal((await post({ action: 'login', password: 'wrong' })).status, 401);
      const login = await post({ action: 'login', password: process.env.ADMIN_PASSWORD });
      assert.equal(login.status, 200);
      const setCookie = login.headers.get('set-cookie');
      assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Strict/); assert.match(setCookie, /Secure/); assert.match(setCookie, /Max-Age=28800/);
      const cookie = setCookie.split(';')[0], headers = { Cookie: cookie, 'Content-Type': 'application/json' };
      assert.equal((await (await fetch(base + '/api/admin', { headers })).json()).authed, true);
      assert.equal((await fetch(base + '/api/admin', { method: 'POST', headers, body: JSON.stringify({ action: 'announcement', message: '<b>literal</b>', type: 'info' }) })).status, 200);
      assert.equal((await (await fetch(base + '/api/admin')).json()).announcement.message, '<b>literal</b>');
      assert.equal((await fetch(base + '/api/admin', { method: 'DELETE', headers })).status, 200);
      assert.equal((await fetch(base + '/api/admin?action=logout', { method: 'DELETE', headers })).status, 200);
      assert.equal((await (await fetch(base + '/api/admin', { headers })).json()).authed, false);
      assert.equal((await fetch(base + '/api/admin', { method: 'DELETE', headers })).status, 401);
    });
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
