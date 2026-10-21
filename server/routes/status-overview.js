import { getStatusOverview } from "../lib/statusOverview.js";
export async function GET() {
    try {
        return Response.json(await getStatusOverview(), { headers: { "Cache-Control": "no-store" } });
    }
    catch {
        return Response.json({ monitors: [], error: "Status overview unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
}
