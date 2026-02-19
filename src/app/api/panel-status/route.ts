export const dynamic = "force-dynamic";

const PELICAN_URL = "https://pelican.mx11.org";
const PELICAN_APP_KEY = "papp_g1pgQEEaVPSlwo2odhJDdJYC4XJuSaZbBl7s0ohxhPa";
const PELICAN_CLIENT_KEY = "pacc_xhRZrOc8p1cZvYHDbsg3X8Vw6cvFSiwEFJGGudPK375";

const CRAFTY_URL = "https://crafty.mx11.org";
const CRAFTY_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJpYXQiOjE3NzE1MzE0NjEsInRva2VuX2lkIjoxfQ.lyYa8NHp-HTuYhSq6ISrGnXlvmuzo-jJbBGSmBYQY8s";

async function fetchPelicanServers() {
  try {
    // Get server list from application API
    const res = await fetch(`${PELICAN_URL}/api/application/servers?include=allocations`, {
      headers: { Authorization: `Bearer ${PELICAN_APP_KEY}`, Accept: "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    const servers = data.data ?? [];

    // Fetch node name for each server
    const nodeRes = await fetch(`${PELICAN_URL}/api/application/nodes`, {
      headers: { Authorization: `Bearer ${PELICAN_APP_KEY}`, Accept: "application/json" },
      cache: "no-store",
    }).catch(() => null);
    const nodeData = nodeRes ? await nodeRes.json().catch(() => ({})) : {};
    const nodeMap: Record<number, string> = {};
    for (const n of nodeData.data ?? []) {
      nodeMap[n.attributes.id] = n.attributes.name;
    }

    return Promise.all(servers.map(async (s: any) => {
      const env = s.attributes.container?.environment ?? {};
      const allocs = s.attributes.relationships?.allocations?.data ?? [];
      const primaryAlloc = allocs[0]?.attributes;
      const port = primaryAlloc?.port;
      const alias = primaryAlloc?.alias ?? "mx11.org";

      // Extract map name from path like /levels/east_coast_usa/info.json
      const mapPath: string = env.MAP ?? "";
      const mapMatch = mapPath.match(/\/levels\/([^/]+)\//);
      const mapName = mapMatch ? mapMatch[1].replace(/_/g, " ") : null;

      // Fetch live resources via client API
      let liveState = "unknown";
      let liveCpu = 0;
      let liveRamBytes = 0;
      let liveUptime = 0;
      try {
        const resRes = await fetch(`${PELICAN_URL}/api/client/servers/${s.attributes.identifier}/resources`, {
          headers: { Authorization: `Bearer ${PELICAN_CLIENT_KEY}`, Accept: "application/json" },
          cache: "no-store",
        });
        const resData = await resRes.json();
        const attrs = resData.attributes ?? {};
        liveState = attrs.current_state ?? "unknown";
        liveCpu = attrs.resources?.cpu_absolute ?? 0;
        liveRamBytes = attrs.resources?.memory_bytes ?? 0;
        liveUptime = attrs.resources?.uptime ?? 0;
      } catch { /* ignore */ }

      return {
        id: s.attributes.uuid,
        name: s.attributes.name,
        node: nodeMap[s.attributes.node] ?? `Node ${s.attributes.node}`,
        status: liveState,
        running: liveState === "running",
        cpu: parseFloat(liveCpu.toFixed(2)),
        ram: liveRamBytes > 0 ? `${(liveRamBytes / 1024 / 1024).toFixed(0)}MB` : null,
        uptime: liveUptime,
        maxPlayers: env.MAX_PLAYERS ? parseInt(env.MAX_PLAYERS) : null,
        address: port ? `${alias}:${port}` : null,
        map: mapName,
        memoryLimit: s.attributes.limits?.memory ?? null,
        cpuLimit: s.attributes.limits?.cpu ?? null,
      };
    }));
  } catch {
    return [];
  }
}

async function fetchCraftyServers() {
  try {
    const res = await fetch(`${CRAFTY_URL}/api/v2/servers/`, {
      headers: { Authorization: `Bearer ${CRAFTY_KEY}` },
      cache: "no-store",
    });
    const data = await res.json();
    const servers = data.data ?? [];

    // Fetch stats for each server
    const withStats = await Promise.all(
      servers.map(async (s: any) => {
        try {
          const statsRes = await fetch(`${CRAFTY_URL}/api/v2/servers/${s.server_id}/stats/`, {
            headers: { Authorization: `Bearer ${CRAFTY_KEY}` },
            cache: "no-store",
          });
          const stats = await statsRes.json();
          const d = stats.data ?? {};
          return {
            id: s.server_id,
            name: s.server_name,
            running: d.running ?? false,
            players: d.online ?? 0,
            maxPlayers: d.max ?? 0,
            cpu: d.cpu ?? 0,
            ram: d.mem ?? "0",
            version: d.version ?? "",
            address: `mx11.org:${s.server_port}`,
          };
        } catch {
          return { id: s.server_id, name: s.server_name, running: false, players: 0, maxPlayers: 0, cpu: 0, ram: "0", address: `mx11.org:${s.server_port}` };
        }
      })
    );
    return withStats;
  } catch {
    return [];
  }
}

export async function GET() {
  const [pelican, crafty] = await Promise.all([fetchPelicanServers(), fetchCraftyServers()]);
  return Response.json({ pelican, crafty }, { headers: { "Cache-Control": "no-cache" } });
}
