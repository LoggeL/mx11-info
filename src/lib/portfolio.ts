import { cachedLoader } from "./cache";
import { fetchJson, requiredEnv, serviceUrl } from "./http";
interface Asset { id: string; type: string; originalFileName: string; }
export const getPortfolio = cachedLoader(async () => {
  const key = requiredEnv("IMMICH_SHARE_KEY");
  const albumId = requiredEnv("IMMICH_ALBUM_ID");
  const base = serviceUrl("IMMICH_URL", "https://immich.mx11.org");
  const url = new URL(`${base}/api/albums/${encodeURIComponent(albumId)}`);
  url.searchParams.set("key", key);
  const data = await fetchJson<{ assets?: Asset[] }>(url);
  if (!Array.isArray(data.assets)) throw new Error("Invalid album response");
  return data.assets.map(asset => ({
    id: asset.id, type: asset.type, filename: asset.originalFileName,
    // The shared-link credential stays on the server.
    thumb: `/api/portfolio/asset/${encodeURIComponent(asset.id)}?size=thumbnail`,
    preview: `/api/portfolio/asset/${encodeURIComponent(asset.id)}?size=preview`,
  }));
}, 60_000);
export async function getPortfolioImage(id: string, size: "thumbnail" | "preview") {
  if (!(await getPortfolio()).some(asset => asset.id === id)) return null;
  const url = new URL(`${serviceUrl("IMMICH_URL", "https://immich.mx11.org")}/api/assets/${encodeURIComponent(id)}/thumbnail`);
  url.searchParams.set("key", requiredEnv("IMMICH_SHARE_KEY"));
  url.searchParams.set("size", size);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("Image unavailable");
  return response;
}
