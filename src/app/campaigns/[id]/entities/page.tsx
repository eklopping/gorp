import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignNav } from "@/components/campaign-nav";
import { EntityCard } from "@/components/entity-card";
import { SiteHeader } from "@/components/site-header";
import { Panel } from "@/components/ui";
import { listCampaignEntities } from "@/lib/entity-actions";
import { getCampaignById } from "@/lib/actions";
import { requireCampaignMember } from "@/lib/session";

export default async function EntitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { id } = await params;
  const { q, type } = await searchParams;
  const { session } = await requireCampaignMember(id);
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const selectedType =
    type === "person" || type === "place" ? type : ("all" as const);
  const entities = await listCampaignEntities(id, q, selectedType);

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
              {campaign.name}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight">
              ID cards
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              People and places of interest. Pin them on maps when the party
              meets them.
            </p>
          </div>
          <Link
            href={`/campaigns/${id}/entities/new`}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent-deep"
          >
            New ID card
          </Link>
        </div>

        <CampaignNav campaignId={id} active="entities" />

        <form className="mt-6 flex flex-wrap gap-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, role, allegiance…"
            className="min-w-[16rem] flex-1 rounded-lg border border-line bg-paper/70 px-3 py-2 text-sm"
          />
          <select
            name="type"
            defaultValue={selectedType}
            className="rounded-lg border border-line bg-paper/70 px-3 py-2 text-sm"
          >
            <option value="all">All types</option>
            <option value="person">People</option>
            <option value="place">Places</option>
          </select>
          <button
            type="submit"
            className="rounded-lg border border-line px-4 py-2 text-sm hover:border-accent"
          >
            Search
          </button>
        </form>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {entities.length === 0 ? (
            <Panel className="sm:col-span-2">
              <p className="text-sm text-ink-soft">
                No ID cards yet. Create a person or place when someone new
                enters the story.
              </p>
            </Panel>
          ) : (
            entities.map((entity) => (
              <EntityCard key={entity.id} campaignId={id} entity={entity} />
            ))
          )}
        </div>
      </main>
    </>
  );
}
