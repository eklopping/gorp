import Link from "next/link";

const links = [
  { suffix: "", label: "Sessions", key: "sessions" },
  { suffix: "/fate", label: "Fate", key: "fate" },
  { suffix: "/vault", label: "Gear", key: "vault" },
  { suffix: "/travel", label: "Travel", key: "travel" },
  { suffix: "/entities", label: "ID cards", key: "entities" },
  { suffix: "/maps", label: "Maps", key: "maps" },
  { suffix: "/members", label: "Members", key: "members" },
] as const;

export function CampaignNav({
  campaignId,
  active,
}: {
  campaignId: string;
  active:
    | "sessions"
    | "fate"
    | "vault"
    | "travel"
    | "entities"
    | "maps"
    | "members";
}) {
  return (
    <nav className="mt-5 flex flex-wrap gap-2">
      {links.map((link) => {
        const href = `/campaigns/${campaignId}${link.suffix}`;
        const isActive = link.key === active;

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
