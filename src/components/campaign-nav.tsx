import Link from "next/link";
import type { CampaignNavKey } from "@/lib/campaign-nav";

/**
 * @deprecated Prefer CampaignShell for campaign pages.
 * Kept for any leftover call sites during the phased revamp.
 */
export function CampaignNav({
  campaignId,
  active,
}: {
  campaignId: string;
  active: CampaignNavKey;
}) {
  const links = [
    { suffix: "", label: "Sessions", key: "sessions" },
    { suffix: "/fate", label: "Fate", key: "fate" },
    { suffix: "/vault", label: "Gear", key: "vault" },
    { suffix: "/travel", label: "Travel", key: "travel" },
    { suffix: "/entities", label: "ID cards", key: "entities" },
    { suffix: "/maps", label: "Maps", key: "maps" },
    { suffix: "/members", label: "Members", key: "members" },
    { suffix: "/rulebook", label: "Rules", key: "rulebook" },
  ] as const;

  return (
    <nav className="mt-5 flex flex-wrap gap-2">
      {links.map((link) => {
        const href = `/campaigns/${campaignId}${link.suffix}`;
        const isActive = link.key === active;

        return (
          <Link
            key={link.label}
            href={href}
            className={`rounded-[var(--radius-md)] px-3 py-1.5 text-[12.5px] transition ${
              isActive
                ? "border border-accent bg-[var(--accent-tint-11)] text-accent"
                : "border border-line text-text-3 hover:border-accent-line hover:text-accent"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
