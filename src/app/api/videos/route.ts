import { cachedLoader } from "@/lib/cache";
import { fetchJson, requiredEnv } from "@/lib/http";
export const dynamic = "force-dynamic";
interface PlaylistItem {
  snippet: { title: string; description: string; position: number;
    resourceId: { videoId: string };
    thumbnails: Partial<Record<"maxres" | "high" | "medium", { url: string }>>;
  };
}
const load = cachedLoader(async () => {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("maxResults", "50");
  url.searchParams.set("playlistId", requiredEnv("YOUTUBE_PLAYLIST_ID"));
  url.searchParams.set("key", requiredEnv("YOUTUBE_API_KEY"));
  const videos: { id: string; title: string; description: string; thumbnail: string; position: number }[] = [];
  let pageToken: string | undefined;
  const seen = new Set<string>();
  do {
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await fetchJson<{ items?: PlaylistItem[]; nextPageToken?: string }>(url);
    if (!Array.isArray(data.items)) throw new Error("Invalid playlist response");
    for (const { snippet } of data.items) {
      videos.push({ id: snippet.resourceId.videoId, title: snippet.title, description: snippet.description,
        thumbnail: snippet.thumbnails.maxres?.url || snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || "",
        position: snippet.position });
    }
    pageToken = data.nextPageToken;
    if (pageToken && seen.has(pageToken)) throw new Error("Repeated playlist page");
    if (pageToken) seen.add(pageToken);
  } while (pageToken && seen.size < 100);
  return videos;
}, 300_000);
export async function GET() {
  try { return Response.json({ videos: await load() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ videos: [], error: "Video portfolio unavailable or not configured" }, { status: 503 }); }
}
