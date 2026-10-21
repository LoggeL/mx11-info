import { cachedLoader } from "./cache.js";
import { fetchJson, requiredEnv, serviceUrl, UpstreamError } from "./http.js";
const number = (value) => typeof value === "number" && Number.isFinite(value) ? value : 0;
async function fetchPelicanServers() {
    const url = serviceUrl("PELICAN_URL", "https://pelican.mx11.org");
    const appKey = requiredEnv("PELICAN_APP_KEY");
    const clientKey = requiredEnv("PELICAN_CLIENT_KEY");
    const headers = { Authorization: `Bearer ${appKey}`, Accept: "application/json" };
    const [list, nodes] = await Promise.all([
        fetchJson(`${url}/api/application/servers?include=allocations`, { headers }),
        fetchJson(`${url}/api/application/nodes`, { headers }),
    ]);
    if (!Array.isArray(list.data))
        throw new UpstreamError();
    const nodeMap = new Map((nodes.data ?? []).map(n => [n.attributes.id, n.attributes.name]));
    return Promise.all(list.data.map(async ({ attributes: server }) => {
        const env = server.container?.environment ?? {};
        const allocation = server.relationships?.allocations?.data?.[0]?.attributes;
        const map = env.MAP?.match(/\/levels\/([^/]+)\//)?.[1].replace(/_/g, " ") ?? null;
        let state = "unknown", cpu = 0, ram = 0, uptime = 0;
        try {
            const response = await fetchJson(`${url}/api/client/servers/${encodeURIComponent(server.identifier)}/resources`, {
                headers: { Authorization: `Bearer ${clientKey}`, Accept: "application/json" },
            });
            state = response.attributes?.current_state ?? "unknown";
            cpu = number(response.attributes?.resources?.cpu_absolute);
            ram = number(response.attributes?.resources?.memory_bytes);
            uptime = number(response.attributes?.resources?.uptime);
        }
        catch { /* A single server failure must not hide the remaining servers. */ }
        return {
            id: server.uuid, name: server.name, node: nodeMap.get(server.node) ?? `Node ${server.node}`,
            status: state, running: state === "running", cpu: Number(cpu.toFixed(2)),
            ram: ram > 0 ? `${(ram / 1024 / 1024).toFixed(0)}MB` : null, uptime,
            maxPlayers: env.MAX_PLAYERS ? Number.parseInt(env.MAX_PLAYERS, 10) || null : null,
            address: allocation?.port ? `${allocation.alias || "mx11.org"}:${allocation.port}` : null,
            map, memoryLimit: server.limits?.memory ?? null, cpuLimit: server.limits?.cpu ?? null,
            panelUrl: `${url}/server/${encodeURIComponent(server.identifier)}`,
        };
    }));
}
async function fetchCraftyServers() {
    const url = serviceUrl("CRAFTY_URL", "https://crafty.mx11.org");
    const headers = { Authorization: `Bearer ${requiredEnv("CRAFTY_KEY")}` };
    const list = await fetchJson(`${url}/api/v2/servers/`, { headers });
    if (!Array.isArray(list.data))
        throw new UpstreamError();
    return Promise.all(list.data.map(async (server) => {
        const base = {
            id: server.server_id, name: server.server_name, address: `mx11.org:${server.server_port}`,
            panelUrl: `${url}/panel/server/${encodeURIComponent(server.server_id)}/dashboard`,
        };
        try {
            const { data: stats = {} } = await fetchJson(`${url}/api/v2/servers/${encodeURIComponent(server.server_id)}/stats/`, { headers });
            return { ...base, running: stats.running ?? false, players: number(stats.online),
                maxPlayers: number(stats.max), cpu: number(stats.cpu), ram: String(stats.mem ?? "0"), version: stats.version ?? "" };
        }
        catch {
            return { ...base, running: false, players: 0, maxPlayers: 0, cpu: 0, ram: "0" };
        }
    }));
}
async function readPanels() {
    const [pelican, crafty] = await Promise.allSettled([fetchPelicanServers(), fetchCraftyServers()]);
    const errors = {};
    if (pelican.status === "rejected")
        errors.pelican = "Pelican unavailable or not configured";
    if (crafty.status === "rejected")
        errors.crafty = "Crafty unavailable or not configured";
    return {
        pelican: pelican.status === "fulfilled" ? pelican.value : [],
        crafty: crafty.status === "fulfilled" ? crafty.value : [],
        ...(Object.keys(errors).length ? { errors } : {}),
    };
}
export const getPanels = cachedLoader(readPanels, 15_000);
