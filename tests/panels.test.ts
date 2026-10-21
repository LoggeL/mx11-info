import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import { getPanels } from "../src/lib/panels";

test("panel mapping and shared cache work against isolated local upstreams", async () => {
  let requests = 0;
  const server = createServer((req, res) => {
    requests++;
    assert.ok(req.headers.authorization);
    res.setHeader("Content-Type", "application/json");
    const body = req.url?.includes("/nodes") ? { data: [{ attributes: { id: 1, name: "Node" } }] }
      : req.url?.includes("/resources") ? { attributes: { current_state: "running", resources: { cpu_absolute: 12.25, memory_bytes: 1048576, uptime: 1000 } } }
      : req.url?.includes("/stats/") ? { data: { running: true, online: 2, max: 10, cpu: 4, mem: "42", version: "test" } }
      : req.url?.startsWith("/api/v2/") ? { data: [{ server_id: "crafty-id", server_name: "Crafty", server_port: 25565 }] }
      : { data: [{ attributes: { uuid: "pelican-id", identifier: "short-id", name: "Game", node: 1, limits: { memory: 1024 } } }] };
    res.end(JSON.stringify(body));
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  Object.assign(process.env, { PELICAN_URL: base, CRAFTY_URL: base,
    PELICAN_APP_KEY: randomUUID(), PELICAN_CLIENT_KEY: randomUUID(), CRAFTY_KEY: randomUUID() });
  try {
    const [a, b] = await Promise.all([getPanels(), getPanels()]);
    assert.deepEqual(a, b);
    assert.equal(a.pelican[0].running, true);
    assert.equal(a.pelican[0].ram, "1MB");
    assert.equal(a.crafty[0].players, 2);
    assert.equal(a.errors, undefined);
    assert.equal(requests, 5);
  } finally {
    server.closeAllConnections(); server.close();
    for (const name of ["PELICAN_URL", "CRAFTY_URL", "PELICAN_APP_KEY", "PELICAN_CLIENT_KEY", "CRAFTY_KEY"]) delete process.env[name];
  }
});
