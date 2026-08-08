import Link from "next/link";

const links = [
  { suffix: "", label: "Sessions" },
  { suffix: "/entities", label: "ID cards" },
  { suffix: "/maps", label: "Maps" },
  { suffix: "/members", label: "Members" },
] as const;

export function CampaignNav({
  campaignId,
  active,
}: {
  campaignId: string;
  active: "sessions" | "entities" | "maps" | "members";
}) {
  return (
    <nav className="mt-5 flex flex-wrap gap-2">
      {links.map((link) => {
        const key =
          link.suffix === ""
            ? "sessions"
            : (link.suffix.slice(1) as typeof active);
        const href = `/campaigns/${campaignId}${link.suffix}`;
        const isActive = key === active;

        return (
          <Link
            key={link.label}
            href={href}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              isActive
                ? "bg-accent text-paper"
                : "border border-line hover:border-accent"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
