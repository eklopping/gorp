"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createId } from "@/lib/ids";
import {
  rulebookBookmarks,
  rulebookQuickRefs,
  rulebookSections,
  rulebooks,
  ruleCitations,
} from "@/lib/schema";
import {
  indexRuleSectionDoc,
  rebuildRuleSearchIndex,
  removeSearchDoc,
} from "@/lib/search";
import { requireCampaignGm, requireCampaignMember, requireSession } from "@/lib/session";
import { saveRulebookUpload } from "@/lib/uploads";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export type ParsedSection = {
  number: string;
  title: string;
  chapterNumber: string;
  chapterTitle: string;
  body: string;
};

/** Split markdown on ## / ###; leading N.M in heading → number. */
export function parseRulebookMarkdown(markdown: string): ParsedSection[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections: ParsedSection[] = [];
  let chapterNumber = "1";
  let chapterTitle = "General";
  let current: ParsedSection | null = null;

  const flush = () => {
    if (!current) return;
    current.body = current.body.trim();
    sections.push(current);
    current = null;
  };

  for (const line of lines) {
    const h2 = /^##\s+(.+)$/.exec(line);
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h2) {
      flush();
      const heading = h2[1]!.trim();
      const numbered = /^(\d+(?:\.\d+)*)\s*[.—:\-–]?\s*(.+)$/.exec(heading);
      if (numbered) {
        chapterNumber = numbered[1]!;
        chapterTitle = numbered[2]!;
      } else {
        chapterNumber = String(sections.length + 1);
        chapterTitle = heading;
      }
      continue;
    }
    if (h3) {
      flush();
      const heading = h3[1]!.trim();
      const numbered = /^(\d+(?:\.\d+)*)\s*[.—:\-–]?\s*(.+)$/.exec(heading);
      const number = numbered?.[1] ?? `${chapterNumber}.${sections.length + 1}`;
      const title = numbered?.[2] ?? heading;
      current = {
        number,
        title,
        chapterNumber: number.split(".")[0] ?? chapterNumber,
        chapterTitle,
        body: "",
      };
      continue;
    }
    if (!current) {
      // Lead-in before first heading becomes a preface section.
      if (line.trim()) {
        current = {
          number: "0",
          title: "Preface",
          chapterNumber: "0",
          chapterTitle: "Preface",
          body: `${line}\n`,
        };
      }
      continue;
    }
    current.body += `${line}\n`;
  }
  flush();
  return sections;
}

export async function getActiveRulebook() {
  const [book] = await db.select().from(rulebooks).limit(1);
  if (!book) return null;
  const sections = await db
    .select()
    .from(rulebookSections)
    .where(eq(rulebookSections.rulebookId, book.id))
    .orderBy(asc(rulebookSections.sortOrder));
  const quickRefs = await db
    .select()
    .from(rulebookQuickRefs)
    .where(eq(rulebookQuickRefs.rulebookId, book.id))
    .orderBy(asc(rulebookQuickRefs.sortOrder));
  return { book, sections, quickRefs };
}

export async function listUserBookmarks(userId: string) {
  return db
    .select({
      id: rulebookBookmarks.id,
      sectionId: rulebookBookmarks.sectionId,
      number: rulebookSections.number,
      title: rulebookSections.title,
    })
    .from(rulebookBookmarks)
    .innerJoin(
      rulebookSections,
      eq(rulebookSections.id, rulebookBookmarks.sectionId),
    )
    .where(eq(rulebookBookmarks.userId, userId));
}

export async function listCitationsForSection(
  campaignId: string,
  sectionId: string,
) {
  return db
    .select()
    .from(ruleCitations)
    .where(
      and(
        eq(ruleCitations.campaignId, campaignId),
        eq(ruleCitations.sectionId, sectionId),
      ),
    );
}

export async function importRulebookMarkdownAction(
  campaignId: string,
  formData: FormData,
) {
  const { session } = await requireCampaignGm(campaignId);
  const title = formString(formData, "title") || "Savage Root · Core Rules";
  const version = formString(formData, "version") || "imported";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Choose a markdown file." };
  }

  const text = await file.text();
  const parsed = parseRulebookMarkdown(text);
  if (parsed.length === 0) {
    return {
      ok: false as const,
      error: "No ## / ### headings found to split into sections.",
    };
  }

  const sourcePath = await saveRulebookUpload(file);
  const bookId = createId("rbk");

  // Replace prior shared rulebook (one system book).
  const existing = await db.select({ id: rulebooks.id }).from(rulebooks);
  for (const row of existing) {
    const oldSections = await db
      .select({ id: rulebookSections.id })
      .from(rulebookSections)
      .where(eq(rulebookSections.rulebookId, row.id));
    for (const section of oldSections) removeSearchDoc(section.id);
    await db.delete(rulebooks).where(eq(rulebooks.id, row.id));
  }

  await db.insert(rulebooks).values({
    id: bookId,
    title,
    version,
    sourceType: "markdown",
    sourcePath,
    importedAt: new Date(),
    importedBy: session.user.id,
  });

  let order = 0;
  for (const section of parsed) {
    const id = createId("rbs");
    await db.insert(rulebookSections).values({
      id,
      rulebookId: bookId,
      number: section.number,
      title: section.title,
      chapterNumber: section.chapterNumber,
      chapterTitle: section.chapterTitle,
      body: section.body,
      sortOrder: order++,
    });
    indexRuleSectionDoc({
      id,
      number: section.number,
      title: section.title,
      chapterTitle: section.chapterTitle,
      body: section.body,
    });
  }

  await rebuildRuleSearchIndex();
  revalidatePath(`/campaigns/${campaignId}/rulebook`);
  return { ok: true as const, sections: parsed.length };
}

export async function toggleRulebookBookmarkAction(sectionId: string) {
  const session = await requireSession();
  const [existing] = await db
    .select()
    .from(rulebookBookmarks)
    .where(
      and(
        eq(rulebookBookmarks.sectionId, sectionId),
        eq(rulebookBookmarks.userId, session.user.id),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(rulebookBookmarks)
      .where(eq(rulebookBookmarks.id, existing.id));
    return { bookmarked: false };
  }

  await db.insert(rulebookBookmarks).values({
    id: createId("rbm"),
    sectionId,
    userId: session.user.id,
  });
  return { bookmarked: true };
}

export async function citeRuleInSessionAction(input: {
  campaignId: string;
  sectionId: string;
  gameSessionId?: string;
  entityId?: string;
  excerpt?: string;
}) {
  await requireCampaignMember(input.campaignId);
  const id = createId("cit");
  await db.insert(ruleCitations).values({
    id,
    sectionId: input.sectionId,
    campaignId: input.campaignId,
    gameSessionId: input.gameSessionId ?? null,
    entityId: input.entityId ?? null,
    excerpt: input.excerpt ?? "",
  });
  return { ok: true as const, id };
}

export async function upsertQuickRefAction(
  campaignId: string,
  formData: FormData,
) {
  await requireCampaignGm(campaignId);
  const title = formString(formData, "title");
  const summary = formString(formData, "summary");
  if (!title) return { ok: false as const, error: "Title required." };

  const [book] = await db.select().from(rulebooks).limit(1);
  if (!book) return { ok: false as const, error: "Import a rulebook first." };

  const [maxRow] = await db
    .select()
    .from(rulebookQuickRefs)
    .where(eq(rulebookQuickRefs.rulebookId, book.id));

  await db.insert(rulebookQuickRefs).values({
    id: createId("qref"),
    rulebookId: book.id,
    title,
    summary,
    sortOrder: maxRow ? 99 : 0,
  });
  revalidatePath(`/campaigns/${campaignId}/rulebook`);
  return { ok: true as const };
}
