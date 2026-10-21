import { NextRequest } from "next/server";
import { getPortfolioImage } from "@/lib/portfolio";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const size = req.nextUrl.searchParams.get("size") || "thumbnail";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["thumbnail", "preview"].includes(size)) {
    return Response.json({ error: "Invalid image request" }, { status: 400 });
  }
  try {
    const image = await getPortfolioImage(id, size as "thumbnail" | "preview");
    if (!image) return Response.json({ error: "Image not found" }, { status: 404 });
    return new Response(image.body, { headers: {
      "Content-Type": image.headers.get("content-type")!,
      "Cache-Control": "public, max-age=60",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch { return Response.json({ error: "Image unavailable" }, { status: 503 }); }
}
