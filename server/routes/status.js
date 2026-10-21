import { getStatus } from "../lib/status.js";
export async function GET() {
    return Response.json(await getStatus(), { headers: { "Cache-Control": "no-store" } });
}
