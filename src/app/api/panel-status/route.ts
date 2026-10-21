import { getPanels } from "@/lib/panels";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const data = await getPanels();
  return Response.json(data, {
    status: data.errors?.pelican && data.errors?.crafty ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
