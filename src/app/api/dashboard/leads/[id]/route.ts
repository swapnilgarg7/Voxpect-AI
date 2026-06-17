import { getLeadDetails } from "@/lib/dashboard/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await getLeadDetails(id);
    if (!lead) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(lead);
  } catch (err) {
    console.error("[/api/dashboard/leads/[id]]", err);
    return Response.json({ error: "Failed to load lead" }, { status: 500 });
  }
}
