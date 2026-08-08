import { redirect } from "next/navigation";
import { listUserCampaigns } from "@/lib/actions";
import { getSession } from "@/lib/session";

/** Legacy global calculator — gear tools are per-campaign now. */
export default async function ItemCostRedirectPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const campaigns = await listUserCampaigns(session.user.id);
  if (campaigns.length === 1) {
    redirect(`/campaigns/${campaigns[0].id}/vault`);
  }

  redirect("/dashboard");
}
