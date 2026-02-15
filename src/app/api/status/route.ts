import { NextResponse } from "next/server";

const SERVICES = [
  "immich.mx11.org",
  "map.mx11.org",
  "crafty.mx11.org",
  "jellyfin.mx11.org",
  "bedrock.mx11.org",
  "create.mx11.org",
  "java.mx11.org",
  "modpack.mx11.org",
  "mx11.org",
];

async function checkService(host: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://${host}`, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

export async function GET() {
  const results = await Promise.all(
    SERVICES.map(async (host) => [host, await checkService(host)] as const)
  );
  const status: Record<string, boolean> = {};
  for (const [host, ok] of results) status[host] = ok;
  return NextResponse.json(status, {
    headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=20" },
  });
}
