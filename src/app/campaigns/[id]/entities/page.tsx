import Link from "next/link";
import {
  CampaignChrome,
  loadCampaignChrome,
} from "@/components/campaign-chrome";
import { EntityCard } from "@/components/entity-card";
import { Panel, TitleRule } from "@/components/ui";
import { listCampaignEntities } from "@/lib/entity-actions";
import { db } from "@/lib/db";
import { entities as entitiesTable, entityAppearances } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export default async function EntitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    type?: string;
    allegiance?: string;
    facet?: string;
  }>;
}) {
  const { id } = await params;
  const { q, type, allegiance, facet } = await searchParams;
  const { session, membership, campaign, counts } =
    await loadCampaignChrome(id);

  const selectedType =
    type === "person" || type === "place" ? type : ("all" as const);
  const entities = await listCampaignEntities(id, q, selectedType);

  const allegianceRows = await db
    .select({
      allegiance: entitiesTable.allegiance,
      count: sql<number>`count(*)`,
    })
    .from(entitiesTable)
    .where(eq(entitiesTable.campaignId, id))
    .groupBy(entitiesTable.allegiance);

  const allegianceFacets = allegianceRows
    .map((row) => ({
      name: row.allegiance.trim() || "Unaligned",
      count: Number(row.count),
    }))
    .sort((a, b) => b.count - a.count);

  const appearanceCounts = await db
    .select({
      entityId: entityAppearances.entityId,
      count: sql<number>`count(*)`,
    })
    .from(entityAppearances)
    .innerJoin(entitiesTable, eq(entitiesTable.id, entityAppearances.entityId))
    .where(eq(entitiesTable.campaignId, id))
    .groupBy(entityAppearances.entityId);

  const appearanceMap = new Map(
    appearanceCounts.map((row) => [row.entityId, Number(row.count)]),
  );

  let filtered = entities;
  if (allegiance) {
    if (allegiance === "Unaligned") {
      filtered = filtered.filter((e) => !e.allegiance.trim());
    } else {
      filtered = filtered.filter((e) => e.allegiance.trim() === allegiance);
    }
  }
  if (facet === "pinned") {
    filtered = filtered.filter((e) => (appearanceMap.get(e.id) ?? 0) > 0);
  } else if (facet === "never") {
    filtered = filtered.filter((e) => (appearanceMap.get(e.id) ?? 0) <= 1);
  }

  const people = filtered.filter((e) => e.type === "person").length;
  const places = filtered.filter((e) => e.type === "place").length;

  const groups = new Map<string, typeof filtered>();
  for (const entity of filtered) {
    const key = entity.allegiance.trim() || "Unaligned";
    const list = groups.get(key) ?? [];
    list.push(entity);
    groups.set(key, list);
  }

  const hrefFor = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const next = {
      q: q ?? "",
      type: selectedType === "all" ? "" : selectedType,
      allegiance: allegiance ?? "",
      facet: facet ?? "",
      ...patch,
    };
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return `/campaigns/${id}/entities${qs ? `?${qs}` : ""}`;
  };

  return (
    <CampaignChrome
      campaignId={id}
      campaignName={campaign.name}
      userName={session.user.name}
      userRole={membership.role}
      active="entities"
      counts={counts}
    >
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 pb-16">
        <TitleRule
          title="ID cards"
          meta={`${filtered.length} · ${people} people · ${places} places`}
          action={
            <Link
              href={`/campaigns/${id}/entities/new`}
              className="rounded-[var(--radius-md)] border border-[rgba(225,173,102,0.5)] px-[13px] py-1.5 text-[12.5px] text-accent transition hover:bg-[var(--accent-tint-11)]"
            >
              New card
            </Link>
          }
        />

        <form className="mt-6 flex flex-wrap gap-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, role, allegiance, anything in the dossier…"
            className="min-w-[16rem] flex-1 rounded-[var(--radius-md)] border border-line-strong bg-transparent px-3 py-[9px] text-[13px] outline-none focus:border-accent"
          />
          <div className="inline-flex overflow-hidden rounded-[var(--radius-md)] border border-line">
            {(
              [
                ["all", "All"],
                ["person", "People"],
                ["place", "Places"],
              ] as const
            ).map(([value, label], index) => (
              <Link
                key={value}
                href={hrefFor({ type: value === "all" ? "" : value })}
                className={`px-3 py-2 text-[12.5px] ${
                  index > 0 ? "border-l border-line" : ""
                } ${
                  selectedType === value
                    ? "bg-[var(--accent-tint-11)] text-accent"
                    : "text-text-3 hover:text-text"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <button
            type="submit"
            className="rounded-[var(--radius-md)] border border-line px-4 py-2 text-[12.5px] text-text-3 hover:border-accent-line hover:text-accent"
          >
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="kicker mr-1">Allegiance</span>
          {allegianceFacets.map((facetRow) => {
            const on = allegiance === facetRow.name;
            return (
              <Link
                key={facetRow.name}
                href={hrefFor({
                  allegiance: on ? "" : facetRow.name,
                })}
                className={`rounded-[3px] border px-2.5 py-1 text-[11.5px] ${
                  on
                    ? "border-accent text-accent"
                    : "border-line-strong text-text-3 hover:border-accent-line"
                }`}
              >
                {facetRow.name}{" "}
                <span className="tabular text-muted">{facetRow.count}</span>
              </Link>
            );
          })}
          <span className="mx-2 h-4 w-px bg-[var(--line)]" />
          <Link
            href={hrefFor({ facet: facet === "pinned" ? "" : "pinned" })}
            className={`rounded-[3px] border px-2.5 py-1 text-[11.5px] ${
              facet === "pinned"
                ? "border-accent text-accent"
                : "border-line-strong text-text-3"
            }`}
          >
            Has appearances
          </Link>
          <Link
            href={hrefFor({ facet: facet === "never" ? "" : "never" })}
            className={`rounded-[3px] border px-2.5 py-1 text-[11.5px] ${
              facet === "never"
                ? "border-accent text-accent"
                : "border-line-strong text-text-3"
            }`}
          >
            Seldom revisited
          </Link>
        </div>

        <div className="mt-8 space-y-8">
          {filtered.length === 0 ? (
            <Panel>
              <p className="text-sm text-text-3">
                No ID cards match. Create a person or place when someone new
                enters the story.
              </p>
            </Panel>
          ) : (
            [...groups.entries()].map(([groupName, list], groupIndex) => (
              <section key={groupName}>
                <p className="kicker mb-3">
                  {groupName} · {list.length} cards
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((entity, index) => (
                    <EntityCard
                      key={entity.id}
                      campaignId={id}
                      entity={entity}
                      highlight={groupIndex === 0 && index === 0}
                      meta={`${appearanceMap.get(entity.id) ?? 0} mentions`}
                    />
                  ))}
                  {groupIndex === groups.size - 1 ? (
                    <Link
                      href={`/campaigns/${id}/entities/new`}
                      className="flex min-h-[120px] items-center justify-center rounded-[6px] border border-dashed border-line text-[13px] text-muted transition hover:border-accent-line hover:text-accent"
                    >
                      + Name someone new
                    </Link>
                  ) : null}
                </div>
              </section>
            ))
          )}
        </div>
      </main>
    </CampaignChrome>
  );
}
