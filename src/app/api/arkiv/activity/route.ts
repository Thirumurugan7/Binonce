import { getActivity, EXPLORER } from "@/lib/arkiv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Reads the Arkiv-recorded history (attacks, mints) and the sweeper registry. */
export async function GET() {
  const activity = await getActivity();
  return Response.json({ ...activity, explorer: EXPLORER });
}
