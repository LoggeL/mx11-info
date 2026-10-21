import assert from "node:assert/strict";
import { test } from "node:test";
import { cachedLoader } from "../src/lib/cache";

test("concurrent visitors share one request, then refresh after expiry", async () => {
  let calls = 0, time = 0;
  const read = cachedLoader(async () => ++calls, 100, () => time);
  assert.deepEqual(await Promise.all([read(), read(), read()]), [1, 1, 1]);
  assert.equal(await read(), 1);
  time = 100;
  assert.equal(await read(), 2);
});
test("upstream errors are not cached and a later request can recover", async () => {
  let calls = 0;
  const read = cachedLoader(async () => { if (++calls === 1) throw new Error("offline"); return "ok"; }, 100);
  await assert.rejects(read());
  assert.equal(await read(), "ok");
});
