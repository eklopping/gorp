import { notFound } from "next/navigation";
import { CampaignNav } from "@/components/campaign-nav";
import { ItemCostCalculator } from "@/components/item-cost-calculator";
import { SiteHeader } from "@/components/site-header";
import { VaultItemList } from "@/components/vault-item-list";
import { getCampaignById } from "@/lib/actions";
import { requireCampaignMember } from "@/lib/session";
import { listCampaignTags, listVaultItems } from "@/lib/vault-actions";

export default async function VaultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, membership } = await requireCampaignMember(id);
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const [tags, items] = await Promise.all([
    listCampaignTags(id),
    listVaultItems(id, session.user.id),
  ]);

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
            {campaign.name}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight">
            Gear
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Campaign item calculator and shared vault. Builds and custom tags
            stay with this table so everyone can use them.
          </p>
        </div>

        <CampaignNav campaignId={id} active="vault" />

        <section className="mt-8">
          <ItemCostCalculator campaignId={id} campaignTags={tags} />
        </section>

        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Shared vault
          </h2>
          <p className="mt-1 mb-4 text-sm text-ink-soft">
            {tags.length} campaign tag{tags.length === 1 ? "" : "s"} ·{" "}
            {items.length} vault entr{items.length === 1 ? "y" : "ies"}. Save a
            copy of anyone&apos;s published item for your own use.
          </p>
          <VaultItemList
            campaignId={id}
            items={items}
            currentUserId={session.user.id}
            isGm={membership.role === "gm"}
          />
        </section>
      </main>
    </>
  );
}
