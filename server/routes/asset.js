import { getPortfolioImage } from "../lib/portfolio.js";
export async function GET(req, context) {
    const { id } = await context.params;
    const size = new URL(req.url).searchParams.get("size") || "thumbnail";
    if (!/^[0-9a-f-]{36}$/i.test(id) || !["thumbnail", "preview"].includes(size)) {
        return Response.json({ error: "Invalid image request" }, { status: 400 });
    }
    try {
        const image = await getPortfolioImage(id, size);
        if (!image)
            return Response.json({ error: "Image not found" }, { status: 404 });
        return new Response(image.body, { headers: {
                "Content-Type": image.headers.get("content-type"),
                "Cache-Control": "public, max-age=60",
                "X-Content-Type-Options": "nosniff",
            } });
    }
    catch {
        return Response.json({ error: "Image unavailable" }, { status: 503 });
    }
}
