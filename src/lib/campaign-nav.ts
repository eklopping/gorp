export type CampaignNavKey =
  | "sessions"
  | "fate"
  | "vault"
  | "travel"
  | "entities"
  | "maps"
  | "members"
  | "rulebook";

export type CampaignNavGroupId = "story" | "world" | "table" | "rules";

export type CampaignNavItem = {
  key: CampaignNavKey;
  label: string;
  suffix: string;
  countKey?: keyof CampaignNavCounts;
};

export type CampaignNavCounts = {
  sessions?: number;
  entities?: number;
  maps?: number;
  threads?: number;
};

export type CampaignNavGroup = {
  id: CampaignNavGroupId;
  label: string;
  countKey?: keyof CampaignNavCounts;
  items: CampaignNavItem[];
};

export const CAMPAIGN_NAV_GROUPS: CampaignNavGroup[] = [
  {
    id: "story",
    label: "Story",
    countKey: "sessions",
    items: [
      { key: "sessions", label: "Session notes", suffix: "", countKey: "sessions" },
      { key: "fate", label: "Fate river", suffix: "/fate" },
    ],
  },
  {
    id: "world",
    label: "World",
    countKey: "entities",
    items: [
      { key: "entities", label: "ID cards", suffix: "/entities", countKey: "entities" },
      { key: "maps", label: "Maps", suffix: "/maps", countKey: "maps" },
    ],
  },
  {
    id: "table",
    label: "Table",
    items: [
      { key: "vault", label: "Gear", suffix: "/vault" },
      { key: "travel", label: "Travel", suffix: "/travel" },
      { key: "members", label: "Members", suffix: "/members" },
    ],
  },
  {
    id: "rules",
    label: "Rules",
    items: [
      { key: "rulebook", label: "Rule book", suffix: "/rulebook" },
    ],
  },
];

export function groupForNavKey(key: CampaignNavKey): CampaignNavGroup {
  const group = CAMPAIGN_NAV_GROUPS.find((g) =>
    g.items.some((item) => item.key === key),
  );
  return group ?? CAMPAIGN_NAV_GROUPS[0];
}

export function primaryActionForNavKey(
  campaignId: string,
  key: CampaignNavKey,
): { href: string; label: string } | null {
  switch (key) {
    case "sessions":
    case "fate":
      return {
        href: `/campaigns/${campaignId}/sessions/new`,
        label: "New session",
      };
    case "entities":
      return {
        href: `/campaigns/${campaignId}/entities/new`,
        label: "New card",
      };
    case "maps":
      return {
        href: `/campaigns/${campaignId}/maps/new`,
        label: "New map",
      };
    case "rulebook":
      return null;
    default:
      return null;
  }
}
