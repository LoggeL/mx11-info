import { cachedLoader } from "./cache.js";
import { fetchJson, serviceUrl, UpstreamError } from "./http.js";
const HISTORY = 24;
// Uptime Kuma codes: 0 down, 1 up, 2 pending, 3 maintenance.
const code = (value) => [0, 1, 2, 3].includes(value) ? value : null;
async function readOverview() {
    const base = serviceUrl("STATUS_URL", "https://status.mx11.org");
    const slug = encodeURIComponent(process.env.STATUS_PAGE_SLUG || "service");
    const [page, beats] = await Promise.all([
        fetchJson(`${base}/api/status-page/${slug}`),
        fetchJson(`${base}/api/status-page/heartbeat/${slug}`),
    ]);
    if (!Array.isArray(page?.publicGroupList) || !beats?.heartbeatList || typeof beats.heartbeatList !== "object")
        throw new UpstreamError();
    const monitors = page.publicGroupList.flatMap(group => Array.isArray(group.monitorList) ? group.monitorList : [])
        .filter(monitor => Number.isSafeInteger(monitor?.id) && typeof monitor.name === "string")
        .map(monitor => {
        const list = Array.isArray(beats.heartbeatList[monitor.id]) ? beats.heartbeatList[monitor.id] : [];
        const history = list.slice(-HISTORY).map(beat => code(beat?.status));
        const uptime = beats.uptimeList?.[`${monitor.id}_24`];
        return {
            id: monitor.id, name: monitor.name, status: history.at(-1) ?? null,
            uptime: typeof uptime === "number" && Number.isFinite(uptime) ? uptime : null, history,
        };
    });
    return { monitors, updatedAt: new Date().toISOString() };
}
export const getStatusOverview = cachedLoader(readOverview, 30_000);
