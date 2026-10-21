import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import { getStatusOverview } from "../server/lib/statusOverview.js";
import { GET } from "../server/routes/status-overview.js";
test("status overview maps Uptime Kuma heartbeats against an isolated local upstream", async (t) => {
    const paths = [];
    const server = createServer((req, res) => {
        paths.push(req.url);
        res.setHeader("Content-Type", "application/json");
        const body = req.url === "/api/status-page/heartbeat/test" ? {
            heartbeatList: { 1: Array.from({ length: 30 }, (_, i) => ({ status: i === 29 ? 0 : 1 })), 2: [{ status: 7 }] },
            uptimeList: { "1_24": 0.95 },
        } : { publicGroupList: [{ monitorList: [{ id: 1, name: "Jellyfin" }, { id: 2, name: "Odd" }, { id: "x", name: "Invalid" }] }] };
        res.end(JSON.stringify(body));
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    Object.assign(process.env, { STATUS_URL: `http://127.0.0.1:${address.port}`, STATUS_PAGE_SLUG: "test" });
    t.after(() => { server.closeAllConnections(); server.close(); delete process.env.STATUS_URL; delete process.env.STATUS_PAGE_SLUG; });
    const [a, b] = await Promise.all([getStatusOverview(), getStatusOverview()]);
    assert.deepEqual(a, b);
    assert.deepEqual(a.monitors.map(m => m.name), ["Jellyfin", "Odd"]);
    assert.equal(a.monitors[0].history.length, 24);
    assert.equal(a.monitors[0].status, 0);
    assert.equal(a.monitors[0].uptime, 0.95);
    assert.deepEqual(a.monitors[1], { id: 2, name: "Odd", status: null, uptime: null, history: [null] });
    assert.deepEqual(paths.sort(), ["/api/status-page/heartbeat/test", "/api/status-page/test"]);
    assert.equal((await GET()).status, 200);
});
