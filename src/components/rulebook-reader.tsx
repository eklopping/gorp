"use client";

import { BookOpen, Star } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MarkdownView } from "@/components/markdown-view";
import { TitleRule } from "@/components/ui";
import {
  importRulebookMarkdownAction,
  toggleRulebookBookmarkAction,
} from "@/lib/rulebook-actions";

type Section = {
  id: string;
  number: string;
  title: string;
  chapterNumber: string;
  chapterTitle: string;
  body: string;
  sortOrder: number;
};

type QuickRef = {
  id: string;
  title: string;
  summary: string;
};

type Bookmark = {
  id: string;
  sectionId: string;
  number: string;
  title: string;
};

export function RulebookReader({
  campaignId,
  isGm,
  bookTitle,
  bookVersion,
  sections,
  quickRefs,
  bookmarks,
  initialSectionId,
}: {
  campaignId: string;
  isGm: boolean;
  bookTitle: string | null;
  bookVersion: string | null;
  sections: Section[];
  quickRefs: QuickRef[];
  bookmarks: Bookmark[];
  initialSectionId?: string | null;
}) {
  const router = useRouter();
  const [sectionId, setSectionId] = useState(
    initialSectionId && sections.some((s) => s.id === initialSectionId)
      ? initialSectionId
      : sections[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [bookmarkIds, setBookmarkIds] = useState(
    () => new Set(bookmarks.map((b) => b.sectionId)),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.number.includes(q) ||
        s.body.toLowerCase().includes(q) ||
        s.chapterTitle.toLowerCase().includes(q),
    );
  }, [sections, query]);

  const chapters = useMemo(() => {
    const map = new Map<string, { title: string; sections: Section[] }>();
    for (const section of filtered) {
      const key = section.chapterNumber;
      const entry = map.get(key) ?? {
        title: section.chapterTitle,
        sections: [],
      };
      entry.sections.push(section);
      map.set(key, entry);
    }
    return [...map.entries()];
  }, [filtered]);

  const active = sections.find((s) => s.id === sectionId) ?? null;

  function onImport(formData: FormData) {
    startTransition(async () => {
      const result = await importRulebookMarkdownAction(campaignId, formData);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(`Imported ${result.sections} sections.`);
      router.refresh();
    });
  }

  function toggleBookmark() {
    if (!active) return;
    startTransition(async () => {
      const result = await toggleRulebookBookmarkAction(active.id);
      setBookmarkIds((prev) => {
        const next = new Set(prev);
        if (result.bookmarked) next.add(active.id);
        else next.delete(active.id);
        return next;
      });
    });
  }

  return (
    <div className="space-y-6">
      <TitleRule
        title={bookTitle ?? "Rule book"}
        meta={
          bookVersion
            ? `${bookVersion} · shared across campaigns`
            : "Empty shell · import markdown when ready"
        }
        action={
          isGm ? (
            <form action={onImport} className="flex items-center gap-2">
              <input
                type="file"
                name="file"
                accept=".md,.markdown,text/markdown,text/plain"
                className="max-w-[12rem] text-[11px] text-muted"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-[var(--radius-md)] border border-[rgba(225,173,102,0.5)] px-[13px] py-1.5 text-[12.5px] text-accent transition hover:bg-[var(--accent-tint-11)] disabled:opacity-50"
              >
                Import .md
              </button>
            </form>
          ) : (
            <span className="text-[12.5px] text-muted">Read-only</span>
          )
        }
      />

      {message ? <p className="text-sm text-muted">{message}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[236px_1fr_268px]">
        <aside className="rounded-[var(--radius-lg)] border border-line bg-surface px-2 py-4">
          <p className="kicker px-2">Contents</p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the book…"
            className="mx-2 mt-3 w-[calc(100%-1rem)] rounded-[var(--radius-md)] border border-line-strong bg-transparent px-2.5 py-1.5 text-[12.5px] text-text outline-none placeholder:text-muted"
          />
          <div className="mt-3 max-h-[520px] space-y-3 overflow-y-auto">
            {chapters.length === 0 ? (
              <p className="px-2 text-[12.5px] text-muted">No sections yet.</p>
            ) : (
              chapters.map(([num, chapter]) => (
                <div key={num}>
                  <p className="px-2 text-[13px] text-text-3">
                    <span className="mr-2 tabular text-[10.5px] text-muted-2">
                      {num}
                    </span>
                    {chapter.title}
                  </p>
                  <ul className="mt-1">
                    {chapter.sections.map((section) => (
                      <li key={section.id}>
                        <button
                          type="button"
                          onClick={() => setSectionId(section.id)}
                          className={`w-full border-l px-2 py-1 pl-[30px] text-left text-[12.5px] transition ${
                            section.id === sectionId
                              ? "border-accent text-accent"
                              : "border-transparent text-text-4 hover:text-text-2"
                          }`}
                        >
                          <span className="tabular text-[10px] text-muted">
                            §{section.number}
                          </span>{" "}
                          {section.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
          <div className="my-3 h-px bg-[var(--line-soft)]" />
          <p className="kicker px-2">Your marks</p>
          <ul className="mt-2 space-y-1 px-2">
            {bookmarks.length === 0 ? (
              <li className="text-[12.5px] text-muted">None saved.</li>
            ) : (
              bookmarks.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setSectionId(b.sectionId)}
                    className="inline-flex items-center gap-1.5 text-[12.5px] text-text-3 hover:text-accent"
                  >
                    <Star className="size-3 text-accent" strokeWidth={1.5} />
                    §{b.number} {b.title}
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <section className="min-h-[420px] rounded-[var(--radius-lg)] border border-line bg-surface/50 px-8 py-8">
          {!active ? (
            <div className="flex flex-col items-start gap-4">
              <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-accent-line text-accent">
                <BookOpen className="size-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="kicker">Empty shell</p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-[28px] font-normal text-text">
                  Core Rules
                </h2>
                <p className="mt-3 max-w-[60ch] text-[14.5px] leading-[1.85] text-text-2">
                  Import a markdown rulebook (## / ### headings) to populate
                  this reader. PDF import stays best-effort for a later pass —
                  the corrected Savage Root PDF is still pending.
                </p>
              </div>
            </div>
          ) : (
            <article className="max-w-[700px]">
              <p className="kicker">
                <span className="text-accent">§ {active.number}</span>
                <span className="mx-2 text-faint">·</span>
                <span>{active.chapterTitle}</span>
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-heading)] text-[42px] font-normal leading-[1.1] text-text">
                {active.title}
              </h1>
              <div className="my-5 h-px w-full bg-[var(--line)]" />
              <div className="prose-classical">
                <MarkdownView content={active.body} />
              </div>
              <div className="mt-8 flex gap-2">
                <button
                  type="button"
                  onClick={toggleBookmark}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-line px-3 py-1.5 text-[12.5px] text-text-3 hover:border-accent-line hover:text-accent"
                >
                  <Star
                    className={`size-3.5 ${bookmarkIds.has(active.id) ? "fill-accent text-accent" : ""}`}
                    strokeWidth={1.5}
                  />
                  {bookmarkIds.has(active.id) ? "Bookmarked" : "Bookmark"}
                </button>
              </div>
            </article>
          )}
        </section>

        <aside className="rounded-[var(--radius-lg)] border border-line bg-surface px-3 py-4">
          <p className="kicker px-1">Quick reference</p>
          <div className="mt-3 space-y-2">
            {quickRefs.length === 0 ? (
              <p className="px-1 text-[12.5px] leading-relaxed text-muted">
                GM-authored cards (Trait test, Raise, Bennies, Wear) will sit
                here after import tooling grows.
              </p>
            ) : (
              quickRefs.map((ref) => (
                <div
                  key={ref.id}
                  className="rounded-[var(--radius-panel)] border border-line px-3 py-2.5"
                >
                  <p className="font-[family-name:var(--font-heading)] text-[17px] text-text">
                    {ref.title}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-[1.6] text-text-3">
                    {ref.summary}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="my-4 h-px bg-[var(--line-soft)]" />
          <p className="kicker px-1">Cited in your notes</p>
          <p className="mt-3 px-1 text-[12.5px] text-muted">
            Citations appear when you link a rule from a session note.
          </p>
        </aside>
      </div>
    </div>
  );
}
