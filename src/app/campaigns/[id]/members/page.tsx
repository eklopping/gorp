import Link from "next/link";
import { headers } from "next/headers";
import {
  getActiveInvite,
  listCampaignMembers,
} from "@/lib/actions";
import { MembersManager } from "@/components/members-manager";
import {
  CampaignChrome,
  loadCampaignChrome,
} from "@/components/campaign-chrome";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, membership, campaign, counts } =
    await loadCampaignChrome(id);

  const members = await listCampaignMembers(id);
  const invite = await getActiveInvite(id);
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "http://localhost:3000";

  return (
    <CampaignChrome
      campaignId={id}
      campaignName={campaign.name}
      userName={session.user.name}
      userRole={membership.role}
      active="members"
      counts={counts}
    >
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 pb-16">
        <Link
          href={`/campaigns/${id}`}
          className="text-sm text-ink-soft hover:text-accent-deep"
        >
          ← Back to {campaign.name}
        </Link>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          Members & invites
        </h1>
        <div className="mt-6">
          <MembersManager
            campaignId={id}
            isGm={membership.role === "gm"}
            inviteToken={invite?.token ?? null}
            origin={origin}
            members={members.map((member) => ({
              id: member.id,
              role: member.role,
              status: member.status,
              user: {
                id: member.user.id,
                name: member.user.name,
                email: member.user.email,
              },
            }))}
          />
        </div>
      </main>
    </CampaignChrome>
  );
}
