import Link from "next/link";
import { uploadUrl } from "@/lib/upload-url";

export function EntityCard({
  campaignId,
  entity,
  compact = false,
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
}) {
  return (
    <Link
      href={`/campaigns/${campaignId}/entities/${entity.id}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-paper/70 transition hover:-translate-y-0.5 hover:border-accent"
    >
      <div className={`flex ${compact ? "gap-3 p-3" : "gap-4 p-4"}`}>
        <div
          className={`shrink-0 overflow-hidden rounded-xl border border-line bg-paper-deep/60 ${
            compact ? "h-16 w-16" : "h-24 w-24"
          }`}
        >
          {entity.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={uploadUrl(entity.imagePath)}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wider text-ink-soft">
              {entity.type}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`font-[family-name:var(--font-display)] tracking-tight ${
                compact ? "text-lg" : "text-2xl"
              }`}
            >
              {entity.name}
            </h3>
            <span className="rounded-md border border-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-soft">
              {entity.type}
            </span>
          </div>
          {(entity.role || entity.allegiance) && (
            <p className="mt-1 text-sm text-ink-soft">
              {[entity.role, entity.allegiance].filter(Boolean).join(" · ")}
            </p>
          )}
          {!compact && entity.description ? (
            <p className="mt-2 line-clamp-2 text-sm text-ink-soft/90">
              {entity.description}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
