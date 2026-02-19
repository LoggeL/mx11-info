export const dynamic = "force-dynamic";

const YOUTUBE_API_KEY = "AIzaSyA5w2XJqi2gFO0t3Azs0j2oF8ABxPbeWFI";
const PLAYLIST_ID = "PLk1k729BAyP8BTpDR4vCQYX81njLWVlgT";

interface PlaylistItem {
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      maxres?: { url: string };
      high?: { url: string };
      medium?: { url: string };
    };
    resourceId: { videoId: string };
    position: number;
  };
}

export async function GET() {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${PLAYLIST_ID}&key=${YOUTUBE_API_KEY}`,
      { cache: "no-store" }
    );
    const data = await res.json();

    if (!data.items) {
      return Response.json({ videos: [] }, { headers: { "Cache-Control": "no-cache" } });
    }

    const videos = data.items.map((item: PlaylistItem) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail:
        item.snippet.thumbnails.maxres?.url ||
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.medium?.url ||
        "",
      position: item.snippet.position,
    }));

    return Response.json({ videos }, { headers: { "Cache-Control": "no-cache" } });
  } catch (e) {
    return Response.json({ videos: [], error: "Failed to fetch playlist" }, { status: 500 });
  }
}
