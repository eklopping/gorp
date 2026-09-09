"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import {
  CommandPaletteStub,
  SearchTrigger,
} from "@/components/command-palette-stub";
import {
  CAMPAIGN_NAV_GROUPS,
  groupForNavKey,
  primaryActionForNavKey,
  type CampaignNavCounts,
  type CampaignNavGroupId,
  type CampaignNavKey,
} from "@/lib/campaign-nav";

function initial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : "?";
}

function NavCount({
  counts,
  countKey,
}: {
  counts?: CampaignNavCounts;
  countKey?: keyof CampaignNavCounts;
}) {
  if (!counts || !countKey) return null;
  const value = counts[countKey];
  if (value == null) return null;
  return <span className="tabular text-[10px] text-muted">{value}</span>;
}

export function CampaignShell({
  campaignId,
  campaignName,
  userName,
  userRole,
  active,
  counts,
  children,
}: {
  campaignId: string;
  campaignName: string;
  userName: string;
  userRole?: "gm" | "player";
  active: CampaignNavKey;
  counts?: CampaignNavCounts;
  children: ReactNode;
}) {
  const activeGroup = groupForNavKey(active);
  const primary = primaryActionForNavKey(campaignId, active);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <CommandPaletteStub />

      {/* Brand bar — always present */}
      <header className="flex h-[58px] shrink-0 items-center gap-[22px] border-b border-line-soft px-6">
        <Link
          href="/dashboard"
          className="shrink-0"
          aria-label="Savage Root home"
        >
          <Image
            src="/savage-root-logo.png"
            alt="Savage Root"
            width={681}
            height={155}
            priority
            className="h-[30px] w-auto"
          />
        </Link>
        <div className="h-[26px] w-px shrink-0 bg-[var(--line)]" />
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-[family-name:var(--font-heading)] text-[20px] leading-none text-text">
            {campaignName}
          </span>
          <ChevronDown
            className="size-[11px] shrink-0 text-muted"
            strokeWidth={1.5}
          />
        </div>
        <div className="flex-1" />
        <SearchTrigger className="hidden md:inline-flex" />
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[rgba(225,173,102,0.5)] font-[family-name:var(--font-heading)] text-[14px] text-accent"
          title={userName}
        >
          {initial(userName)}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Rail — wide screens (hybrid 1b) */}
        <aside className="hidden w-[236px] shrink-0 flex-col border-r border-line-soft bg-surface lg:flex">
          <div className="border-b border-line-soft px-3 py-3">
            <p className="kicker">Campaign</p>
            <p className="mt-1 truncate font-[family-name:var(--font-heading)] text-[18px] text-text">
              {campaignName}
            </p>
          </div>
          <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
            {CAMPAIGN_NAV_GROUPS.map((group) => (
              <div key={group.id}>
                <div className="mb-1.5 flex items-center justify-between px-2">
                  <p className="kicker">{group.label}</p>
                  <NavCount counts={counts} countKey={group.countKey} />
                </div>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const href = `/campaigns/${campaignId}${item.suffix}`;
                    const isActive = item.key === active;
                    return (
                      <li key={item.key}>
                        <Link
                          href={href}
                          className={`flex items-center justify-between rounded-[var(--radius-md)] px-2.5 py-[7px] text-[13.5px] transition ${
                            isActive
                              ? "border-l-2 border-accent bg-[var(--accent-tint-11)] pl-2 text-text"
                              : "border-l-2 border-transparent text-text-3 hover:bg-[var(--accent-tint-04)] hover:text-text"
                          }`}
                        >
                          <span>{item.label}</span>
                          <NavCount counts={counts} countKey={item.countKey} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-2.5 border-t border-line-soft px-3 py-3">
            <div className="flex size-6 items-center justify-center rounded-full border border-[rgba(225,173,102,0.5)] font-[family-name:var(--font-heading)] text-[12px] text-accent">
              {initial(userName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] text-text">{userName}</p>
              {userRole ? (
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted">
                  {userRole}
                </p>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Group bar — compact / hybrid top (1a), also on large as secondary strip */}
          <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line-soft bg-surface px-4 lg:px-6">
            <div className="flex items-center lg:hidden">
              {(
                [
                  "story",
                  "world",
                  "table",
                  "rules",
                ] as CampaignNavGroupId[]
              ).map((id) => {
                const group = CAMPAIGN_NAV_GROUPS.find((g) => g.id === id)!;
                const isActive = activeGroup.id === id;
                const first = group.items[0]!;
                return (
                  <Link
                    key={id}
                    href={`/campaigns/${campaignId}${first.suffix}`}
                    className={`px-3.5 py-3 text-[12.5px] transition ${
                      isActive
                        ? "border-b border-accent text-text"
                        : "border-b border-transparent text-text-4 hover:text-text-2"
                    }`}
                  >
                    {group.label}
                  </Link>
                );
              })}
              <div className="mx-4 h-5 w-px bg-[var(--line)]" />
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
              {activeGroup.items.map((item) => {
                const href = `/campaigns/${campaignId}${item.suffix}`;
                const isActive = item.key === active;
                return (
                  <Link
                    key={item.key}
                    href={href}
                    className={`shrink-0 whitespace-nowrap text-[12.5px] transition ${
                      isActive
                        ? "text-accent"
                        : "text-text-4 hover:text-text-2"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {primary ? (
              <Link
                href={primary.href}
                className="ml-2 shrink-0 rounded-[var(--radius-md)] border border-[rgba(225,173,102,0.5)] px-[13px] py-1.5 text-[12.5px] text-accent transition hover:border-accent-300 hover:bg-[var(--accent-tint-11)]"
              >
                {primary.label}
              </Link>
            ) : null}
          </div>

          <div className="min-h-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
