"use client";

import { Link2, Search } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import { searchCampaignAction } from "@/lib/search-actions";
import type { SearchDocType, SearchHit } from "@/lib/search";

export type LinkInsertStyle = "underline" | "chip" | "margin";

type Props = {
  campaignId: string;
  open: boolean;
  onClose: () => void;
  /** Prefill from selected editor text */
  initialQuery?: string;
  onInsert: (hit: SearchHit, style: LinkInsertStyle) => void;
  /** Show Insert-as control (2b) */
  showInsertStyles?: boolean;
  anchorLabel?: string;
};

const TABS: { id: SearchDocType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "entity", label: "Cards" },
  { id: "rule", label: "Rules" },
  { id: "session", label: "Sessions" },
  { id: "map", label: "Maps" },
];

export function LinkPicker({
  campaignId,
  open,
  onClose,
  initialQuery = "",
  onInsert,
  showInsertStyles = true,
  anchorLabel,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<SearchDocType | "all">("all");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState(0);
  const [style, setStyle] = useState<LinkInsertStyle>("underline");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setQuery(initialQuery);
  }, [open, initialQuery]);

  const runSearch = useEffectEvent((q: string, type: SearchDocType | "all") => {
    startTransition(async () => {
      const result = await searchCampaignAction({
        campaignId,
        query: q || "a",
        types: type === "all" ? undefined : [type],
      });
      // Empty query: still allow browsing via broad rebuild; use short token soft fail
      if (!q.trim()) {
        setHits([]);
        return;
      }
      if (result.ok) {
        setHits(result.hits);
        setSelected(0);
      }
    });
  });

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => runSearch(query, tab), 160);
    return () => window.clearTimeout(t);
  }, [open, query, tab, runSearch]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((i) => Math.min(hits.length - 1, i + 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((i) => Math.max(0, i - 1));
      } else if (event.key === "Enter") {
        const hit = hits[selected];
        if (hit) {
          event.preventDefault();
          onInsert(hit, style);
        }
      } else if (event.key === "Tab") {
        event.preventDefault();
        const idx = TABS.findIndex((t) => t.id === tab);
        const next = TABS[(idx + 1) % TABS.length]!;
        setTab(next.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hits, selected, style, tab, onClose, onInsert]);

  const label = useMemo(() => anchorLabel ?? "Link picker", [anchorLabel]);

  if (!open) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-40 mt-1 w-full max-w-[400px] overflow-hidden rounded-[var(--radius-lg)] border border-[rgba(225,173,102,0.45)] bg-surface-2 shadow-[var(--shadow-popover)]">
      <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2.5">
        <Link2 className="size-3.5 text-accent" strokeWidth={1.5} />
        <span className="kicker">{label}</span>
        <span className="ml-auto text-[10px] text-muted">⇥ to switch</span>
      </div>
      <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2">
        <Search className="size-3.5 text-muted" strokeWidth={1.5} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a card, rule, session…"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-muted"
        />
      </div>
      <div className="flex gap-1 border-b border-line-soft px-2 py-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] ${
              tab === t.id
                ? "bg-[var(--accent-tint-11)] text-accent"
                : "text-text-4"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="max-h-56 overflow-y-auto py-1">
        {pending ? (
          <p className="px-3 py-4 text-[12px] text-muted">Searching…</p>
        ) : hits.length === 0 ? (
          <p className="px-3 py-4 text-[12px] text-muted">
            {query.trim() ? "No matches." : "Start typing to search."}
          </p>
        ) : (
          hits.map((hit, index) => (
            <button
              key={hit.docId}
              type="button"
              onMouseEnter={() => setSelected(index)}
              onClick={() => onInsert(hit, style)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] ${
                index === selected
                  ? "border-l-2 border-accent bg-[var(--accent-tint-11)]"
                  : "border-l-2 border-transparent"
              }`}
            >
              <span className="w-9 tabular text-[10px] text-muted">{hit.tag}</span>
              <span className="truncate text-text">{hit.title}</span>
            </button>
          ))
        )}
      </div>
      {showInsertStyles ? (
        <div className="flex items-center gap-2 border-t border-line-soft px-3 py-2">
          <span className="text-[10.5px] text-muted">Insert as</span>
          {(
            [
              ["underline", "Underlined"],
              ["chip", "Chip"],
              ["margin", "Margin"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStyle(id)}
              className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] ${
                style === id
                  ? "border border-accent text-accent"
                  : "border border-line text-text-4"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-[11px] text-muted hover:text-text"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="border-t border-line-soft px-3 py-1.5 text-[10.5px] text-muted">
          ↑↓ move · ↵ insert · esc cancel
        </div>
      )}
    </div>
  );
}

/** Build markdown snippet for an inserted campaign link. */
export function formatLinkMarkdown(
  hit: SearchHit,
  style: LinkInsertStyle,
): string {
  const href = hit.href;
  if (hit.docType === "rule") {
    const label = hit.tag.startsWith("§") ? hit.tag : `§${hit.title}`;
    if (style === "chip") return `\`${label}\`(${href})`;
    return `[${label}](${href})`;
  }
  if (style === "chip") return `«${hit.title}»(${href})`;
  if (style === "margin") return `[^${hit.title}]: ${href}`;
  return `[${hit.title}](${href})`;
}

/** Detect `<l/>` trigger at caret for notation linking (2a). */
export function detectLinkTrigger(
  value: string,
  caret: number,
): { start: number; query: string } | null {
  const before = value.slice(0, caret);
  const match = /<l\/>([^<\n]*)$/.exec(before);
  if (!match) return null;
  return {
    start: caret - match[0].length,
    query: match[1] ?? "",
  };
}
