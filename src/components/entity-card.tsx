import Link from "next/link";
import { MarkdownView } from "@/components/markdown-view";
import { uploadUrl } from "@/lib/upload-url";

export function EntityCard({
  campaignId,
  entity,
  compact = false,
  highlight = false,
  meta,
}: {
  campaignId: string;
  entity: {
    id: string;
    type: "person" | "place";
    name: string;
    allegiance: string;
    role: string;
    description: string;
    itemsOfInterest?: string;
    imagePath: string | null;
  };
  compact?: boolean;
  highlight?: boolean;
  meta?: string;
}) {
  return (
    <Link
      href={`/campaigns/${campaignId}/entities/${entity.id}`}
      className={`group flex gap-[13px] overflow-hidden rounded-[6px] border p-[14px] transition hover:border-[var(--accent-line)] ${
        highlight
          ? "border-[var(--accent-line)] bg-[linear-gradient(180deg,var(--accent-tint-04),transparent)]"
          : "border-line bg-transparent"
      }`}
    >
      <div
        className={`shrink-0 overflow-hidden rounded-[3px] border border-line bg-[repeating-linear-gradient(135deg,#262219_0_6px,#201d17_6px_12px)] ${
          compact ? "h-[64px] w-[48px]" : "h-24 w-[76px]"
        }`}
      >
        {entity.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={uploadUrl(entity.imagePath)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.14em] text-muted">
            {entity.type === "person" ? "PER" : "PLC"}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3
          className={`font-[family-name:var(--font-heading)] font-normal leading-[1.1] tracking-tight text-text ${
            compact ? "text-[18px]" : "text-[22px]"
          }`}
        >
          {entity.name}
        </h3>
        {(entity.role || entity.allegiance) && (
          <p className="mt-1 text-[11.5px] text-muted">
            {[entity.role, entity.allegiance].filter(Boolean).join(" · ")}
          </p>
        )}
        {!compact && entity.description ? (
          <div className="mt-2 line-clamp-2 text-[12px] leading-[1.6] text-text-3">
            <MarkdownView content={entity.description} clamp />
          </div>
        ) : null}
        <div className="mt-auto pt-3">
          {meta ? (
            <p className="tabular text-[10.5px] text-muted">{meta}</p>
          ) : (
            <p className="tabular text-[10.5px] text-muted">
              {entity.type === "person" ? "Person" : "Place"}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Parse `**Name** — definition` lines from itemsOfInterest markdown. */
export function parseItemsOfInterest(raw: string): { term: string; def: string }[] {
  const rows: { term: string; def: string }[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const match =
      /^\s*(?:\*\*|__)(.+?)(?:\*\*|__)\s*[—–\-:]\s*(.+)\s*$/.exec(line) ||
      /^\s*[-*]\s*(?:\*\*|__)(.+?)(?:\*\*|__)\s*[—–\-:]\s*(.+)\s*$/.exec(line);
    if (match) {
      rows.push({ term: match[1]!.trim(), def: match[2]!.trim() });
    }
  }
  return rows;
}
