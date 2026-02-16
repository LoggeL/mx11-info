import { NextResponse } from "next/server";
import { status as statusJava, statusBedrock } from "minecraft-server-util";
import { createConnection } from "net";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HTTP_SERVICES = [
  "immich.mx11.org",
  "map.mx11.org",
  "crafty.mx11.org",
  "jellyfin.mx11.org",
];

const MC_SERVERS = [
  { host: "bedrock.mx11.org", type: "bedrock" as const, ip: "100.94.173.108", port: 19132 },
  { host: "create.mx11.org", type: "java" as const, ip: "100.94.173.108", port: 25565 },
  { host: "java.mx11.org", type: "java" as const, ip: "100.94.173.108", port: 25570 },
  { host: "modpack.mx11.org", type: "legacy" as const, ip: "100.94.173.108", port: 25590 },
];

const MAX_HISTORY = 20;
const pingHistory: Record<string, number[]> = {};

async function checkTailscale(): Promise<{ online: boolean; ping: number | null }> {
  // TCP connect to a known open port to measure tunnel latency
  // Container can't reach Tailscale IPs directly, so use HTTP timing to immich as proxy
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("http://100.94.173.108:8080", {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual",
    });
    clearTimeout(timeout);
    const ping = Math.round(performance.now() - start);
    return { online: true, ping };
  } catch {
    // Fallback: try via hostname (goes through Traefik → Tailscale)
    const start2 = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch("https://immich.mx11.org", { method: "HEAD", signal: controller.signal, redirect: "manual" });
      clearTimeout(timeout);
      const ping = Math.round(performance.now() - start2);
      return { online: true, ping };
    } catch {
      return { online: false, ping: null };
    }
  }
}

async function checkHttp(host: string) {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://${host}`, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    const ping = Math.round(performance.now() - start);
    const online = res.ok || res.status < 500;
    return { online, ping: online ? ping : null };
  } catch {
    return { online: false, ping: null };
  }
}

function checkTcp(ip: string, port: number, timeout = 5000): Promise<{ online: boolean; ping: number | null }> {
  return new Promise((resolve) => {
    const start = performance.now();
    const sock = createConnection({ host: ip, port, timeout }, () => {
      const ping = Math.round(performance.now() - start);
      sock.destroy();
      resolve({ online: true, ping });
    });
    sock.on("error", () => { sock.destroy(); resolve({ online: false, ping: null }); });
    sock.on("timeout", () => { sock.destroy(); resolve({ online: false, ping: null }); });
  });
}

function checkLegacyPing(ip: string, port: number): Promise<{ online: boolean; ping: number | null; players?: { current: number; max: number } }> {
  return new Promise((resolve) => {
    const start = performance.now();
    const chunks: Buffer[] = [];
    const sock = createConnection({ host: ip, port, timeout: 5000 }, () => {
      sock.write(Buffer.from([0xFE, 0x01]));
    });
    sock.on("data", (data) => chunks.push(data));
    sock.on("end", () => {
      const ping = Math.round(performance.now() - start);
      try {
        const buf = Buffer.concat(chunks);
        // Skip first 3 bytes (0xFF + uint16BE length), payload is UTF-16BE
        const payload = buf.slice(3).swap16().toString("utf16le");
        const parts = payload.split("\0");
        // Format: §1\0PROTOCOL\0VERSION\0MOTD\0CURRENT\0MAX
        const current = parseInt(parts[parts.length - 2]) || 0;
        const max = parseInt(parts[parts.length - 1]) || 0;
        resolve({ online: true, ping, players: { current, max } });
      } catch {
        resolve({ online: true, ping });
      }
    });
    sock.on("error", () => { sock.destroy(); resolve({ online: false, ping: null }); });
    sock.on("timeout", () => { sock.destroy(); resolve({ online: false, ping: null }); });
  });
}

async function checkMc(server: (typeof MC_SERVERS)[number]) {
  const start = performance.now();
  try {
    if (server.type === "legacy") {
      return await checkLegacyPing(server.ip, server.port);
    } else if (server.type === "bedrock") {
      const res = await statusBedrock(server.ip, server.port, { timeout: 5000 });
      const ping = Math.round(performance.now() - start);
      return { online: true, ping, players: { current: res.players.online, max: res.players.max } };
    } else {
      const res = await statusJava(server.ip, server.port, { timeout: 5000 });
      const ping = Math.round(performance.now() - start);
      return { online: true, ping, players: { current: res.players.online, max: res.players.max } };
    }
  } catch {
    return { online: false, ping: null };
  }
}

function recordPing(host: string, ping: number | null) {
  if (!pingHistory[host]) pingHistory[host] = [];
  pingHistory[host].push(ping ?? 0);
  if (pingHistory[host].length > MAX_HISTORY) pingHistory[host].shift();
}

export async function GET() {
  const [httpResults, mcResults, tsResult] = await Promise.all([
    Promise.all(HTTP_SERVICES.map(async (host) => [host, await checkHttp(host)] as const)),
    Promise.all(MC_SERVERS.map(async (srv) => [srv.host, await checkMc(srv)] as const)),
    checkTailscale(),
  ]);

  const status: Record<string, { online: boolean; ping: number | null; players?: { current: number; max: number }; history: number[] }> = {};

  for (const [host, data] of httpResults) {
    recordPing(host, data.ping);
    status[host] = { ...data, history: [...pingHistory[host]] };
  }
  for (const [host, data] of mcResults) {
    recordPing(host, data.ping);
    status[host] = { ...data, history: [...pingHistory[host]] };
  }

  recordPing("tailscale", tsResult.ping);
  status["tailscale"] = { ...tsResult, history: [...pingHistory["tailscale"]] };

  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
  });
}
