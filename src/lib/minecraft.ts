import { createConnection } from "node:net";
import { createSocket } from "node:dgram";
import { randomBytes } from "node:crypto";

interface ServerStatus { players: { online: number; max: number }; }
interface Options { timeout?: number; }
const MAX_RESPONSE = 1024 * 1024;
const MAGIC = Buffer.from("00ffff00fefefefefdfdfdfd12345678", "hex");
function counts(online: unknown, max: unknown): ServerStatus {
  if (!Number.isSafeInteger(online) || !Number.isSafeInteger(max) || Number(online) < 0 || Number(max) < 0) {
    throw new Error("Invalid player counts");
  }
  return { players: { online: Number(online), max: Number(max) } };
}
function playerCount(value: string | undefined) {
  if (!/^\d+$/.test(value ?? "")) throw new Error("Invalid player count");
  return Number(value);
}
function varInt(value: number) {
  const bytes: number[] = [];
  do { const byte = value & 0x7f; value >>>= 7; bytes.push(byte | (value ? 0x80 : 0)); } while (value);
  return Buffer.from(bytes);
}
function readVarInt(buffer: Buffer, offset = 0): { value: number; next: number } | undefined {
  let value = 0;
  for (let index = 0; index < 5; index++) {
    const byte = buffer[offset + index];
    if (byte === undefined) return;
    value += (byte & 0x7f) * 2 ** (index * 7);
    if (!(byte & 0x80)) {
      if (value > 0x7fffffff) throw new Error("Oversized VarInt");
      return { value, next: offset + index + 1 };
    }
  }
  throw new Error("Invalid VarInt");
}
function tcpStatus(host: string, port: number, request: Buffer,
  parse: (buffer: Buffer) => ServerStatus | undefined, timeout = 5_000): Promise<ServerStatus> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    let buffer = Buffer.alloc(0), settled = false;
    const finish = (error?: Error, value?: ServerStatus) => {
      if (settled) return;
      settled = true; clearTimeout(timer); socket.destroy();
      if (error) reject(error); else resolve(value!);
    };
    const timer = setTimeout(() => finish(new Error("Server timed out")), timeout);
    socket.on("connect", () => socket.write(request));
    socket.on("error", error => finish(error));
    socket.on("end", () => finish(new Error("Incomplete server response")));
    socket.on("data", chunk => {
      if (buffer.length + chunk.length > MAX_RESPONSE) return finish(new Error("Oversized server response"));
      buffer = Buffer.concat([buffer, chunk]);
      try { const result = parse(buffer); if (result) finish(undefined, result); }
      catch { finish(new Error("Invalid server response")); }
    });
  });
}
/** Java Server List Ping: only status/player counts, with bounded TCP framing. */
export function statusJava(host: string, port: number, options: Options = {}) {
  const name = Buffer.from(host, "utf8"), encodedPort = Buffer.alloc(2);
  encodedPort.writeUInt16BE(port);
  const handshake = Buffer.concat([Buffer.from([0, 47]), varInt(name.length), name, encodedPort, Buffer.from([1])]);
  const request = Buffer.concat([varInt(handshake.length), handshake, Buffer.from([1, 0])]);
  return tcpStatus(host, port, request, buffer => {
    const frame = readVarInt(buffer);
    if (!frame) return;
    if (frame.value > MAX_RESPONSE) throw new Error("Oversized frame");
    if (buffer.length < frame.next + frame.value) return;
    const packet = readVarInt(buffer, frame.next);
    if (!packet || packet.value !== 0) throw new Error("Unexpected packet");
    const text = readVarInt(buffer, packet.next);
    if (!text || text.next + text.value !== frame.next + frame.value) throw new Error("Invalid status payload");
    const data = JSON.parse(buffer.subarray(text.next, text.next + text.value).toString("utf8")) as {
      players?: { online?: unknown; max?: unknown };
    };
    return counts(data.players?.online, data.players?.max);
  }, options.timeout);
}
/** Legacy 1.6 status response, encoded as a length-prefixed UTF-16BE string. */
export function statusLegacy(host: string, port: number, options: Options = {}) {
  return tcpStatus(host, port, Buffer.from([0xfe, 0x01]), buffer => {
    if (buffer.length < 3) return;
    if (buffer[0] !== 0xff) throw new Error("Unexpected packet");
    const length = 3 + buffer.readUInt16BE(1) * 2;
    if (buffer.length < length) return;
    const fields = Buffer.from(buffer.subarray(3, length)).swap16().toString("utf16le").split("\0");
    if (fields[0] !== "§1" || fields.length < 6) throw new Error("Invalid legacy status");
    return counts(playerCount(fields.at(-2)), playerCount(fields.at(-1)));
  }, options.timeout);
}
/** Bedrock RakNet unconnected ping; no MOTD rendering, query or RCON dependency. */
export function statusBedrock(host: string, port: number, options: Options = {}): Promise<ServerStatus> {
  return new Promise((resolve, reject) => {
    const socket = createSocket(host.includes(":") ? "udp6" : "udp4");
    const request = Buffer.alloc(33);
    request[0] = 0x01;
    request.writeBigInt64BE(BigInt(Date.now()), 1);
    MAGIC.copy(request, 9); randomBytes(8).copy(request, 25);
    let settled = false;
    const finish = (error?: Error, result?: ServerStatus) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      try { socket.close(); } catch { /* The socket may not have bound after a DNS error. */ }
      if (error) reject(error); else resolve(result!);
    };
    const timer = setTimeout(() => finish(new Error("Server timed out")), options.timeout ?? 5_000);
    socket.on("error", error => finish(error));
    socket.on("message", message => {
      try {
        if (message.length < 35 || message[0] !== 0x1c || !message.subarray(17, 33).equals(MAGIC)
          || !message.subarray(1, 9).equals(request.subarray(1, 9))) throw new Error("Unexpected pong");
        const length = message.readUInt16BE(33);
        if (message.length < 35 + length) throw new Error("Incomplete pong");
        const fields = message.subarray(35, 35 + length).toString("utf8").split(";");
        if (fields[0] !== "MCPE" && fields[0] !== "MCEE") throw new Error("Invalid edition");
        finish(undefined, counts(playerCount(fields[4]), playerCount(fields[5])));
      } catch { finish(new Error("Invalid server response")); }
    });
    socket.connect(port, host, () => socket.send(request));
  });
}
