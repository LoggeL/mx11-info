import assert from "node:assert/strict";
import { createServer } from "node:net";
import { createSocket } from "node:dgram";
import { once } from "node:events";
import { test } from "node:test";
import { statusJava, statusLegacy, statusBedrock } from "../src/lib/minecraft";

const encode = (n: number) => { const a: number[] = []; do { a.push((n & 127) | (n > 127 ? 128 : 0)); n >>>= 7; } while (n); return Buffer.from(a); };
test("Java status reads fragmented UTF-8 JSON and keeps player counts", async () => {
  const text = Buffer.from(JSON.stringify({ description: "Test ü", players: { online: 3, max: 20 } }));
  const body = Buffer.concat([Buffer.from([0]), encode(text.length), text]), frame = Buffer.concat([encode(body.length), body]);
  const server = createServer(socket => socket.once("data", () => {
    socket.write(frame.subarray(0, 2)); setImmediate(() => socket.end(frame.subarray(2)));
  }));
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  try { assert.deepEqual(await statusJava("127.0.0.1", address.port), { players: { online: 3, max: 20 } }); }
  finally { server.close(); }
});
test("Legacy status handles UTF-16BE without waiting indefinitely for socket close", async () => {
  const text = ["§1", "x", "1.6", "Test", "2", "10"].join("\0"), payload = Buffer.from(text, "utf16le").swap16();
  const response = Buffer.alloc(3 + payload.length); response[0] = 255; response.writeUInt16BE(text.length, 1); payload.copy(response, 3);
  const server = createServer(socket => socket.once("data", () => socket.write(response)));
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  try { assert.deepEqual(await statusLegacy("127.0.0.1", address.port), { players: { online: 2, max: 10 } }); }
  finally { server.close(); }
});
test("Bedrock validates the matching pong and decodes player counts", async () => {
  const server = createSocket("udp4");
  server.on("message", (request, peer) => {
    const text = Buffer.from("MCPE;Test;1;1.0;4;12;");
    const response = Buffer.alloc(35 + text.length); response[0] = 0x1c;
    request.copy(response, 1, 1, 9); request.copy(response, 17, 9, 25); response.writeUInt16BE(text.length, 33); text.copy(response, 35);
    server.send(response, peer.port, peer.address);
  });
  server.bind(0, "127.0.0.1"); await once(server, "listening");
  try { assert.deepEqual(await statusBedrock("127.0.0.1", server.address().port), { players: { online: 4, max: 12 } }); }
  finally { server.close(); }
});
test("malformed or oversized TCP frames are rejected", async () => {
  const server = createServer(socket => socket.once("data", () => socket.end(Buffer.from([255, 255, 255, 255, 255, 1]))));
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  try { await assert.rejects(statusJava("127.0.0.1", address.port, { timeout: 100 })); }
  finally { server.close(); }
});
test("silent TCP servers respect the deadline", async () => {
  const server = createServer();
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  try { await assert.rejects(statusJava("127.0.0.1", address.port, { timeout: 30 }), /timed out/); }
  finally { server.close(); }
});

test("silent Bedrock servers time out and release the UDP socket", async () => {
  const server = createSocket("udp4");
  server.bind(0, "127.0.0.1"); await once(server, "listening");
  try { await assert.rejects(statusBedrock("127.0.0.1", server.address().port, { timeout: 30 }), /timed out/); }
  finally { server.close(); }
});
test("unrelated Bedrock datagrams are rejected", async () => {
  const server = createSocket("udp4");
  server.on("message", (_request, peer) => server.send(Buffer.from("invalid"), peer.port, peer.address));
  server.bind(0, "127.0.0.1"); await once(server, "listening");
  try { await assert.rejects(statusBedrock("127.0.0.1", server.address().port, { timeout: 100 }), /Invalid server response/); }
  finally { server.close(); }
});
