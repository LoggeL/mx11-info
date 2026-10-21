import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import { getPortfolio, getPortfolioImage } from "../src/lib/portfolio";

test("public portfolio metadata and image delivery never reveal the sharing key", async () => {
  const key = randomUUID(), id = randomUUID();
  let requests = 0;
  const server = createServer((req, res) => {
    requests++;
    const url = new URL(req.url!, "http://localhost");
    assert.equal(url.searchParams.get("key"), key);
    if (url.pathname.startsWith("/api/albums/")) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ assets: [{ id, type: "IMAGE", originalFileName: "photo.jpg" }] }));
    } else { res.setHeader("Content-Type", "image/jpeg"); res.end("test-image"); }
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  Object.assign(process.env, { IMMICH_URL: `http://127.0.0.1:${address.port}`, IMMICH_ALBUM_ID: randomUUID(), IMMICH_SHARE_KEY: key });
  try {
    const assets = await getPortfolio();
    assert.equal(JSON.stringify(assets).includes(key), false);
    assert.ok(assets[0].preview.startsWith("/api/portfolio/asset/"));
    assert.equal(await getPortfolioImage(randomUUID(), "preview"), null);
    const image = await getPortfolioImage(id, "preview");
    assert.equal(await image?.text(), "test-image");
    assert.equal(requests, 2);
  } finally {
    server.closeAllConnections(); server.close();
    for (const name of ["IMMICH_URL", "IMMICH_ALBUM_ID", "IMMICH_SHARE_KEY"]) delete process.env[name];
  }
});
