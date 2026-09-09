import { notFound } from "next/navigation";
import { ItemCostCalculator } from "@/components/item-cost-calculator";
import { VaultItemList } from "@/components/vault-item-list";
import { listCampaignTags, listActiveCampaignPlayers, listVaultItems } from "@/lib/vault-actions";
import {
  CampaignChrome,
  loadCampaignChrome,
} from "@/components/campaign-chrome";

export default async function VaultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, membership, campaign, counts } =
    await loadCampaignChrome(id);

  const [tags, items, players] = await Promise.all([
    listCampaignTags(id),
    listVaultItems(id, session.user.id),
    listActiveCampaignPlayers(id),
  ]);

  return (
    <CampaignChrome
      campaignId={id}
      campaignName={campaign.name}
      userName={session.user.name}
      userRole={membership.role}
      active="vault"
      counts={counts}
    >
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 pb-16">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
            {campaign.name}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight">
            Gear
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Craftsman commissions or Tinker Unique Creation, assigned to a
            creator player, with in-progress / finished tracking for the table.
          </p>
        </div>

        <section className="mt-8">
          <ItemCostCalculator
            campaignId={id}
            campaignTags={tags}
            players={players}
            currentUserId={session.user.id}
          />
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
    </CampaignChrome>
  );
}
