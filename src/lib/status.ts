import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cachedLoader } from "./cache";
import type { StatusMap } from "./contracts";
import { status as statusJava, statusBedrock } from "minecraft-server-util";
import { createConnection } from "net";

const execute = promisify(execFile);
const primaryHost = process.env.MX11_PRIMARY_HOST || "100.94.173.108";
const secondaryHost = process.env.MX11_SECONDARY_HOST || "100.110.39.105";

const HTTP_SERVICES = [
  "immich.mx11.org",
  "map.mx11.org",
  "crafty.mx11.org",
  "jellyfin.mx11.org",
  "paperless.mx11.org",
];

const MC_SERVERS = [
  { host: "bedrock.mx11.org", type: "bedrock" as const, ip: primaryHost, port: 19132 },
  { host: "create.mx11.org", type: "java" as const, ip: primaryHost, port: 25565 },
  { host: "java.mx11.org", type: "java" as const, ip: primaryHost, port: 25570 },
  { host: "modpack.mx11.org", type: "legacy" as const, ip: primaryHost, port: 25590 },
];

const MAX_HISTORY = 20;
const pingHistory: Record<string, number[]> = {};

async function checkICMP(ip: string): Promise<{ online: boolean; ping: number | null }> {
  try {
    const { stdout } = await execute("ping", ["-c", "1", "-W", process.platform === "darwin" ? "2000" : "2", ip], { timeout: 3_000 });
    const match = stdout.match(/time=(\d+\.?\d*)\s*ms/);
    return { online: true, ping: match ? Math.round(Number(match[1])) : null };
  } catch { return { online: false, ping: null }; }
}

async function checkTailscale(): Promise<{ online: boolean; ping: number | null }> {
  return checkICMP(primaryHost);
}

async function checkHttp(host: string) {
  const start = performance.now();
  try {
    const res = await fetch(`https://${host}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
      redirect: "follow",
    });
    const ping = Math.round(performance.now() - start);
    const online = res.ok || res.status < 500;
    return { online, ping: online ? ping : null };
  } catch {
    return { online: false, ping: null };
  }
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

async function readStatus() {
  const [httpResults, mcResults, tsResult, ts2Result] = await Promise.all([
    Promise.all(HTTP_SERVICES.map(async (host) => [host, await checkHttp(host)] as const)),
    Promise.all(MC_SERVERS.map(async (srv) => [srv.host, await checkMc(srv)] as const)),
    checkTailscale(),
    checkICMP(secondaryHost),
  ]);

  const status: StatusMap = {};

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

  recordPing("tailscale2", ts2Result.ping);
  status["tailscale2"] = { ...ts2Result, history: [...pingHistory["tailscale2"]] };

  return status;
}

export const getStatus = cachedLoader(readStatus, 15_000);
