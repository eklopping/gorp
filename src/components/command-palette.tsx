"use client";

import { useRouter } from "next/navigation";
import {
  CornerDownLeft,
  Search,
} from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import { searchCampaignAction } from "@/lib/search-actions";
import type { SearchDocType, SearchHit } from "@/lib/search";

const OPEN_EVENT = "gorp:open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const TYPE_TABS: { id: SearchDocType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "session", label: "Sessions" },
  { id: "entity", label: "ID cards" },
  { id: "rule", label: "Rules" },
  { id: "map", label: "Maps" },
];

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const parts = text.split(
    new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"),
  );
  return parts.map((part, i) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <span key={i} className="text-accent">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function CommandPalette({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchDocType | "all">("all");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState(0);
  const [pending, startTransition] = useTransition();

  const runSearch = useEffectEvent((q: string, type: SearchDocType | "all") => {
    startTransition(async () => {
      const result = await searchCampaignAction({
        campaignId,
        query: q,
        types: type === "all" ? undefined : [type],
      });
      if (result.ok) {
        setHits(result.hits);
        setSelected(0);
      }
    });
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => runSearch(query, tab), 180);
    return () => window.clearTimeout(handle);
  }, [open, query, tab, runSearch]);

  useEffect(() => {
    if (!open) return;
    function onNav(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((i) => Math.min(hits.length - 1, i + 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((i) => Math.max(0, i - 1));
      } else if (event.key === "Enter") {
        const hit = hits[selected];
        if (hit) {
          event.preventDefault();
          setOpen(false);
          router.push(hit.href);
        }
      }
    }
    window.addEventListener("keydown", onNav);
    return () => window.removeEventListener("keydown", onNav);
  }, [open, hits, selected, router]);

  const grouped = useMemo(() => {
    const order: SearchDocType[] = ["session", "entity", "rule", "map"];
    return order
      .map((type) => ({
        type,
        label:
          type === "session"
            ? "Sessions"
            : type === "entity"
              ? "ID cards"
              : type === "rule"
                ? "Rule book"
                : "Maps",
        items: hits.filter((h) => h.docType === type),
      }))
      .filter((g) => g.items.length > 0);
  }, [hits]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(12,11,9,0.72)] px-4 pt-[104px]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-[600px] overflow-hidden rounded-[var(--radius-lg)] border border-[rgba(225,173,102,0.4)] bg-surface-2 shadow-[var(--shadow-popover)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line-soft px-5 py-4">
          <Search className="size-4 shrink-0 text-accent" strokeWidth={1.5} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions, cards, rules…"
            className="min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted"
          />
          <span className="tabular text-[11px] text-muted">
            {pending ? "…" : hits.length}
          </span>
        </div>

        <div className="flex gap-1 border-b border-line-soft px-3 py-2">
          {TYPE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-[11.5px] transition ${
                tab === t.id
                  ? "bg-[var(--accent-tint-11)] text-accent"
                  : "text-text-4 hover:text-text-2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[420px] overflow-y-auto py-2">
          {query.trim() && hits.length === 0 && !pending ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              No matches for “{query}”.
            </p>
          ) : null}
          {!query.trim() ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              Type to search this campaign and the shared rule book.
            </p>
          ) : null}
          {grouped.map((group) => (
            <div key={group.type} className="mb-2">
              <p className="kicker px-5 py-1.5">{group.label}</p>
              {group.items.map((hit) => {
                flatIndex += 1;
                const index = flatIndex;
                const active = index === selected;
                return (
                  <button
                    key={hit.docId}
                    type="button"
                    onMouseEnter={() => setSelected(index)}
                    onClick={() => {
                      setOpen(false);
                      router.push(hit.href);
                    }}
                    className={`flex w-full items-center gap-3 px-5 py-[9px] text-left transition ${
                      active
                        ? "border-l-2 border-accent bg-[var(--accent-tint-11)] pl-[18px]"
                        : "border-l-2 border-transparent"
                    }`}
                  >
                    <span className="w-10 shrink-0 tabular text-[10px] text-muted">
                      {hit.tag}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-text">
                      {highlight(hit.title, query)}
                    </span>
                    <span className="hidden max-w-[40%] truncate text-[11px] text-muted sm:inline">
                      {hit.body.slice(0, 80)}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line-soft px-5 py-2.5 text-[10.5px] text-muted">
          <span>↑↓ move</span>
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="size-3" strokeWidth={1.5} /> open
          </span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

export function SearchTrigger({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => openCommandPalette()}
      className={`inline-flex min-w-[230px] items-center gap-2 rounded-[var(--radius-md)] border border-line-strong px-3 py-[7px] text-left text-[12.5px] text-muted transition hover:border-accent-line hover:bg-[var(--accent-tint-04)] ${className}`}
    >
      <Search className="size-3.5 shrink-0" strokeWidth={1.5} />
      <span className="flex-1 truncate">Search sessions, cards, rules…</span>
      <kbd className="rounded-[3px] border border-line px-1.5 py-0.5 text-[10px] tabular text-muted-2">
        ⌘K
      </kbd>
    </button>
  );
}
