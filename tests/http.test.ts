import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchJson, serviceUrl } from "../src/lib/http";

test("upstream calls have a timeout and HTTP errors omit credentials", async t => {
  t.mock.method(globalThis, "fetch", async (_url: unknown, options?: RequestInit) => {
    assert.ok(options?.signal);
    return new Response("sensitive upstream body", { status: 401 });
  });
  await assert.rejects(fetchJson("https://example.invalid/?key=private-value"),
    error => error instanceof Error && error.message === "Upstream returned HTTP 401");
});
test("fetch failures never include a secret-bearing URL", async t => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("URL contained sensitive input"); });
  await assert.rejects(fetchJson("https://example.invalid/"), /Upstream service unavailable/);
});
test("only HTTP service URLs without embedded credentials are accepted", () => {
  process.env.MX11_TEST_URL = "file:///tmp/example";
  try { assert.throws(() => serviceUrl("MX11_TEST_URL", "https://example.invalid")); }
  finally { delete process.env.MX11_TEST_URL; }
  assert.equal(serviceUrl("MX11_TEST_URL", "https://example.invalid/"), "https://example.invalid");
});
