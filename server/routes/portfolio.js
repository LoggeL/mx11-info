import { getPortfolio } from "../lib/portfolio.js";
export async function GET() {
    try {
        return Response.json({ assets: await getPortfolio() }, { headers: { "Cache-Control": "no-store" } });
    }
    catch {
        return Response.json({ assets: [], error: "Photo portfolio unavailable or not configured" }, { status: 503 });
    }
}
