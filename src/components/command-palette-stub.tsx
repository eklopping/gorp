"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

const OPEN_EVENT = "gorp:open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/**
 * Phase 1 stub — visual shell + keyboard affordance.
 * Full FTS5 search index ships in the next chunk.
 */
export function CommandPaletteStub() {
  const [open, setOpen] = useState(false);

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

  if (!open) return null;

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
          <div className="flex min-w-0 flex-1 items-center gap-1 text-base text-muted">
            <span>Search sessions, cards, rules…</span>
            <span
              className="caret-blink inline-block h-[18px] w-px bg-accent"
              aria-hidden
            />
          </div>
          <span className="tabular text-[11px] text-muted">0</span>
        </div>
        <div className="px-5 py-8 text-center text-sm text-text-3">
          <p className="font-[family-name:var(--font-heading)] text-xl text-text">
            Search index next
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            The ⌘K shell is live. Full search across sessions, ID cards, maps,
            and the rule book lands in the next chunk.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-line-soft px-5 py-2.5 text-[10.5px] text-muted">
          <span>↑↓ move</span>
          <span>↵ open</span>
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
