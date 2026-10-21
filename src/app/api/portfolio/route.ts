import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SHARE_KEY = process.env.IMMICH_SHARE_KEY ?? "";
const ALBUM_ID = "1c39edf6-9b96-45f1-b77b-99b25dc135c5";
const IMMICH_URL = "https://immich.mx11.org";

export async function GET() {
  try {
    const res = await fetch(
      `${IMMICH_URL}/api/albums/${ALBUM_ID}?key=${SHARE_KEY}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return NextResponse.json({ assets: [] });

    const data = await res.json();
    const assets = (data.assets || []).map((a: any) => ({
      id: a.id,
      type: a.type,
      filename: a.originalFileName,
      thumb: `${IMMICH_URL}/api/assets/${a.id}/thumbnail?key=${SHARE_KEY}&size=thumbnail`,
      preview: `${IMMICH_URL}/api/assets/${a.id}/thumbnail?key=${SHARE_KEY}&size=preview`,
    }));

    return NextResponse.json({ assets }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json({ assets: [] });
  }
}
