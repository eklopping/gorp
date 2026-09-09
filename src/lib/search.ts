import { eq } from "drizzle-orm";
import { db, sqliteDb } from "@/lib/db";
import {
  campaignMaps,
  entities,
  gameSessions,
  rulebookSections,
} from "@/lib/schema";

export type SearchDocType = "session" | "entity" | "map" | "rule";

export type SearchHit = {
  docId: string;
  campaignId: string;
  docType: SearchDocType;
  title: string;
  body: string;
  href: string;
  tag: string;
};

function upsertDoc(doc: SearchHit) {
  sqliteDb
    .prepare(`DELETE FROM search_docs WHERE doc_id = ?`)
    .run(doc.docId);
  sqliteDb
    .prepare(
      `INSERT INTO search_docs (doc_id, campaign_id, doc_type, title, body, href, tag)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      doc.docId,
      doc.campaignId,
      doc.docType,
      doc.title,
      doc.body,
      doc.href,
      doc.tag,
    );
}

export function removeSearchDoc(docId: string) {
  try {
    sqliteDb.prepare(`DELETE FROM search_docs WHERE doc_id = ?`).run(docId);
  } catch {
    /* table may not exist yet */
  }
}

export function indexSessionDoc(input: {
  id: string;
  campaignId: string;
  title: string;
  outline: string;
  sessionDate: string | null;
  sortOrder: number;
}) {
  const n = input.sortOrder > 0 ? input.sortOrder : 0;
  upsertDoc({
    docId: input.id,
    campaignId: input.campaignId,
    docType: "session",
    title: input.title,
    body: input.outline,
    href: `/campaigns/${input.campaignId}/sessions/${input.id}`,
    tag: n > 0 ? `S${n}` : input.sessionDate?.slice(0, 10) || "SES",
  });
}

export function indexEntityDoc(input: {
  id: string;
  campaignId: string;
  type: "person" | "place";
  name: string;
  role: string;
  allegiance: string;
  description: string;
  itemsOfInterest: string;
}) {
  upsertDoc({
    docId: input.id,
    campaignId: input.campaignId,
    docType: "entity",
    title: input.name,
    body: [input.role, input.allegiance, input.description, input.itemsOfInterest]
      .filter(Boolean)
      .join("\n"),
    href: `/campaigns/${input.campaignId}/entities/${input.id}`,
    tag: input.type === "person" ? "PER" : "PLC",
  });
}

export function indexMapDoc(input: {
  id: string;
  campaignId: string;
  name: string;
}) {
  upsertDoc({
    docId: input.id,
    campaignId: input.campaignId,
    docType: "map",
    title: input.name,
    body: "",
    href: `/campaigns/${input.campaignId}/maps/${input.id}`,
    tag: "MAP",
  });
}

export function indexRuleSectionDoc(input: {
  id: string;
  number: string;
  title: string;
  chapterTitle: string;
  body: string;
}) {
  // Rules are shared across campaigns; campaign_id stored as "*" for global match.
  upsertDoc({
    docId: input.id,
    campaignId: "*",
    docType: "rule",
    title: `${input.number} ${input.title}`.trim(),
    body: `${input.chapterTitle}\n${input.body}`,
    href: `/rulebook?section=${input.id}`,
    tag: input.number ? `§${input.number}` : "RULE",
  });
}

export async function rebuildCampaignSearchIndex(campaignId: string) {
  sqliteDb
    .prepare(`DELETE FROM search_docs WHERE campaign_id = ?`)
    .run(campaignId);

  const sessions = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.campaignId, campaignId));
  for (const row of sessions) {
    indexSessionDoc(row);
  }

  const entityRows = await db
    .select()
    .from(entities)
    .where(eq(entities.campaignId, campaignId));
  for (const row of entityRows) {
    indexEntityDoc(row);
  }

  const maps = await db
    .select()
    .from(campaignMaps)
    .where(eq(campaignMaps.campaignId, campaignId));
  for (const row of maps) {
    indexMapDoc(row);
  }
}

export async function rebuildRuleSearchIndex() {
  sqliteDb
    .prepare(`DELETE FROM search_docs WHERE doc_type = 'rule'`)
    .run();
  const sections = await db.select().from(rulebookSections);
  for (const row of sections) {
    indexRuleSectionDoc(row);
  }
}

function escapeFts(query: string) {
  return query
    .replace(/["']/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `"${token}"*`)
    .join(" ");
}

export function searchCampaignDocs(input: {
  campaignId: string;
  query: string;
  limit?: number;
  types?: SearchDocType[];
}): SearchHit[] {
  const q = input.query.trim();
  if (!q) return [];
  const match = escapeFts(q);
  if (!match) return [];

  const types = input.types?.length
    ? input.types
    : (["session", "entity", "map", "rule"] as SearchDocType[]);
  const placeholders = types.map(() => "?").join(",");
  const limit = input.limit ?? 40;

  try {
    const rows = sqliteDb
      .prepare(
        `SELECT doc_id as docId, campaign_id as campaignId, doc_type as docType,
                title, body, href, tag
         FROM search_docs
         WHERE search_docs MATCH ?
           AND doc_type IN (${placeholders})
           AND (campaign_id = ? OR campaign_id = '*')
         ORDER BY rank
         LIMIT ?`,
      )
      .all(match, ...types, input.campaignId, limit) as SearchHit[];

    return rows.map((row) =>
      row.docType === "rule"
        ? {
            ...row,
            href: `/campaigns/${input.campaignId}/rulebook?section=${row.docId}`,
          }
        : row,
    );
  } catch {
    return [];
  }
}
