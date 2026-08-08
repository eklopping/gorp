import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  getActiveInvite,
  getCampaignById,
  listCampaignMembers,
} from "@/lib/actions";
import { requireCampaignMember } from "@/lib/session";
import { MembersManager } from "@/components/members-manager";
import { SiteHeader } from "@/components/site-header";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, membership } = await requireCampaignMember(id);
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const members = await listCampaignMembers(id);
  const invite = await getActiveInvite(id);
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "http://localhost:3000";

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
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
    </>
  );
}
