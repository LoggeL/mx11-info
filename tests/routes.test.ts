import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { GET as panels } from "../src/app/api/panel-status/route";
import { GET as videos } from "../src/app/api/videos/route";
import { GET as photos } from "../src/app/api/portfolio/route";
import { POST as admin } from "../src/app/api/admin/route";

test("missing integration credentials return 503 without upstream calls", async t => {
  for (const name of ["PELICAN_APP_KEY", "PELICAN_CLIENT_KEY", "CRAFTY_KEY", "YOUTUBE_API_KEY", "YOUTUBE_PLAYLIST_ID", "IMMICH_SHARE_KEY", "IMMICH_ALBUM_ID"]) delete process.env[name];
  let upstreamCalls = 0;
  t.mock.method(globalThis, "fetch", async () => { upstreamCalls++; throw new Error("Unexpected upstream request"); });
  for (const call of [panels, videos, photos]) assert.equal((await call()).status, 503);
  assert.equal(upstreamCalls, 0);
});
test("malformed admin requests and cross-origin mutations are rejected", async () => {
  const request = (body: unknown, origin?: string) => new NextRequest("http://localhost/api/admin", {
    method: "POST", headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body),
  });
  assert.equal((await admin(request(null))).status, 400);
  assert.equal((await admin(request([]))).status, 400);
  assert.equal((await admin(request({ action: "announcement", message: 123 }))).status, 401);
  assert.equal((await admin(request({ action: "login" }, "https://other.invalid"))).status, 403);
});
