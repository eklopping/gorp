"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ITEM_PROFILES } from "@/data/srr/profiles";
import { BUILTIN_TAGS } from "@/data/srr/tags";
import {
  calculateItem,
  isTagCompatibleWithProfile,
  mergeTagRepos,
} from "@/lib/srr/calculator";
import type {
  ItemSlot,
  SelectedTag,
  TagDefinition,
  TagType,
} from "@/lib/srr/types";
import {
  publishVaultItemAction,
  upsertCampaignTagAction,
} from "@/lib/vault-actions";

const CUSTOM_KEY = "gorp-srr-custom-tags";
const BUILD_KEY = "gorp-srr-last-build";

const ALL_TYPES: TagType[] = [
  "B",
  "I",
  "MI",
  "C",
  "M",
  "N",
  "PN",
  "NA",
  "Legendary",
  "Unique",
];

const ALL_SLOTS: { id: ItemSlot; label: string }[] = [
  { id: "melee-1h", label: "Melee 1H" },
  { id: "melee-2h", label: "Melee 2H" },
  { id: "ranged-simple", label: "Simple ranged" },
  { id: "ranged-advanced", label: "Advanced ranged" },
  { id: "armor-light", label: "Light armor" },
  { id: "armor-medium", label: "Medium armor" },
  { id: "armor-heavy", label: "Heavy armor" },
  { id: "shield", label: "Shield" },
  { id: "accessory", label: "Accessory" },
  { id: "clothing", label: "Clothing" },
];

function loadCustomTags(): TagDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TagDefinition[];
  } catch {
    return [];
  }
}

type Props = {
  campaignId?: string;
  campaignTags?: TagDefinition[];
};

export function ItemCostCalculator({
  campaignId,
  campaignTags = [],
}: Props) {
  const [customTags, setCustomTags] = useState<TagDefinition[]>([]);
  const [sharedTags, setSharedTags] = useState<TagDefinition[]>(campaignTags);
  const [profileId, setProfileId] = useState(ITEM_PROFILES[0].id);
  const [totalWear, setTotalWear] = useState(ITEM_PROFILES[0].startingWear);
  const [selected, setSelected] = useState<SelectedTag[]>([]);
  const [filter, setFilter] = useState("");
  const [uniqueSeg, setUniqueSeg] = useState(1);
  const [uniqueBp, setUniqueBp] = useState(1);
  const [itemName, setItemName] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // New custom tag form
  const [newName, setNewName] = useState("");
  const [newTypes, setNewTypes] = useState<TagType[]>(["B"]);
  const [newDesc, setNewDesc] = useState("");
  const [newStack, setNewStack] = useState(1);
  const [newLoad, setNewLoad] = useState(0);
  const [newSlots, setNewSlots] = useState<ItemSlot[]>([]);

  useEffect(() => {
    setSharedTags(campaignTags);
  }, [campaignTags]);

  useEffect(() => {
    setCustomTags(loadCustomTags());
    try {
      const raw = localStorage.getItem(BUILD_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        profileId: string;
        totalWear: number;
        selected: SelectedTag[];
      };
      if (saved.profileId) setProfileId(saved.profileId);
      if (saved.totalWear) setTotalWear(saved.totalWear);
      if (saved.selected) setSelected(saved.selected);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      BUILD_KEY,
      JSON.stringify({ profileId, totalWear, selected }),
    );
  }, [profileId, totalWear, selected]);

  const repo = useMemo(
    () => mergeTagRepos([...sharedTags, ...customTags]),
    [sharedTags, customTags],
  );
  const profile = ITEM_PROFILES.find((row) => row.id === profileId)!;

  useEffect(() => {
    setTotalWear((wear) => Math.max(wear, profile.startingWear));
  }, [profile.startingWear]);

  useEffect(() => {
    setSelected((prev) => {
      const next = prev.filter((row) => {
        const tag = repo.find((item) => item.id === row.tagId);
        if (!tag) return false;
        return isTagCompatibleWithProfile(profile, tag);
      });
      if (
        next.length === prev.length &&
        next.every((row, index) => row.tagId === prev[index]?.tagId)
      ) {
        return prev;
      }
      return next;
    });
  }, [profile, repo]);

  const result = useMemo(
    () =>
      calculateItem({
        profileId,
        totalWear,
        selected,
        tags: repo,
        customUniqueSegments: uniqueSeg,
        customUniqueBp: uniqueBp,
      }),
    [profileId, totalWear, selected, repo, uniqueSeg, uniqueBp],
  );

  const compatibleTags = useMemo(
    () => repo.filter((tag) => isTagCompatibleWithProfile(profile, tag)),
    [repo, profile],
  );

  const filtered = compatibleTags.filter((tag) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (
      tag.name.toLowerCase().includes(q) ||
      tag.types.join(" ").toLowerCase().includes(q) ||
      tag.description.toLowerCase().includes(q)
    );
  });

  function persistCustom(next: TagDefinition[]) {
    setCustomTags(next);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  }

  function addTag(tagId: string) {
    const tag = repo.find((item) => item.id === tagId);
    if (!tag || !isTagCompatibleWithProfile(profile, tag)) return;
    setSelected((prev) => {
      if (prev.some((row) => row.tagId === tagId)) return prev;
      return [...prev, { tagId, stacks: 1 }];
    });
  }

  function removeTag(tagId: string) {
    setSelected((prev) => prev.filter((row) => row.tagId !== tagId));
  }

  function setStacks(tagId: string, stacks: number) {
    setSelected((prev) =>
      prev.map((row) => (row.tagId === tagId ? { ...row, stacks } : row)),
    );
  }

  function createCustomTag() {
    if (!newName.trim() || newTypes.length === 0) return;
    const id = `custom_${newName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}`;
    const tag: TagDefinition = {
      id,
      name: newName.trim(),
      types: newTypes,
      description: newDesc.trim() || "Custom tag",
      stackableMax: newStack > 1 ? newStack : undefined,
      loadMod: newLoad || undefined,
      compatibleSlots: newSlots.length > 0 ? newSlots : undefined,
      custom: true,
    };
    persistCustom([...customTags.filter((row) => row.id !== id), tag]);
    setNewName("");
    setNewDesc("");
    setNewTypes(["B"]);
    setNewStack(1);
    setNewLoad(0);
    setNewSlots([]);
    addTag(id);

    if (campaignId) {
      startTransition(async () => {
        const result = await upsertCampaignTagAction(campaignId, tag);
        if ("error" in result && result.error) {
          setMessage(result.error);
          return;
        }
        setSharedTags((prev) => [
          ...prev.filter((row) => row.id !== tag.id),
          { ...tag, custom: true },
        ]);
        setMessage(`Shared “${tag.name}” with the campaign vault.`);
      });
    }
  }

  function publishToVault() {
    if (!campaignId) return;
    setMessage(null);
    startTransition(async () => {
      const result = await publishVaultItemAction(campaignId, {
        name: itemName,
        notes: itemNotes,
        profileId,
        totalWear,
        selected,
        customTags,
      });
      if ("error" in result && result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(`Published “${itemName.trim()}” to the campaign vault.`);
      setItemName("");
      setItemNotes("");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-4 rounded-2xl border border-line bg-paper/70 p-5">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Build item
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            SRR Vol.3 item creation value + Vol.1 Tinker Unique Creation resource
            / clock.
            {campaignId
              ? " Custom tags can be shared to this campaign; publish builds to the vault."
              : " Custom tags save in this browser."}
          </p>
        </div>

        {campaignId ? (
          <div className="space-y-3 rounded-xl border border-dashed border-line p-3">
            <label className="block text-sm">
              <span className="font-medium">Item name</span>
              <input
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="e.g. Emberpike"
                className="mt-1.5 w-full rounded-lg border border-line bg-paper-deep/40 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Notes (optional)</span>
              <textarea
                value={itemNotes}
                onChange={(event) => setItemNotes(event.target.value)}
                rows={2}
                placeholder="Origin, quirks, who found it…"
                className="mt-1.5 w-full rounded-lg border border-line bg-paper-deep/40 px-3 py-2"
              />
            </label>
            <button
              type="button"
              disabled={pending || !itemName.trim()}
              onClick={publishToVault}
              className="rounded-lg bg-accent px-3 py-2 text-sm text-paper hover:bg-accent-deep disabled:opacity-50"
            >
              {pending ? "Publishing…" : "Publish to campaign vault"}
            </button>
            {message ? (
              <p className="text-xs text-ink-soft">{message}</p>
            ) : null}
          </div>
        ) : null}

        <label className="block text-sm">
          <span className="font-medium">Item profile</span>
          <select
            value={profileId}
            onChange={(event) => setProfileId(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper-deep/40 px-3 py-2"
          >
            {ITEM_PROFILES.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} · {row.coin}c · Wear {row.startingWear}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-soft">{profile.notes}</p>
        </label>

        <label className="block text-sm">
          <span className="font-medium">
            Total Wear (starts at {profile.startingWear}
            {profile.maxWear ? `, max ${profile.maxWear}` : ""})
          </span>
          <input
            type="number"
            min={profile.startingWear}
            max={profile.maxWear ?? 20}
            value={totalWear}
            onChange={(event) => setTotalWear(Number(event.target.value))}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper-deep/40 px-3 py-2"
          />
        </label>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              Selected tags
            </h3>
            <p className="text-xs text-ink-soft">
              Slots {result.tagSlotsUsed}/{result.tagSlotsMax} · Neg{" "}
              {result.negativeSlotsUsed}/2
            </p>
          </div>
          <ul className="mt-3 space-y-2">
            {selected.length === 0 ? (
              <li className="text-sm text-ink-soft">No tags yet.</li>
            ) : (
              selected.map((row) => {
                const tag = repo.find((item) => item.id === row.tagId);
                if (!tag) return null;
                return (
                  <li
                    key={row.tagId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper-deep/30 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">
                        {tag.name}{" "}
                        <span className="text-xs text-ink-soft">
                          [{tag.types.join("/")}]
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {tag.stackableMax && tag.stackableMax > 1 ? (
                        <input
                          type="number"
                          min={1}
                          max={tag.stackableMax}
                          value={row.stacks}
                          onChange={(event) =>
                            setStacks(row.tagId, Number(event.target.value))
                          }
                          className="w-16 rounded border border-line bg-paper px-2 py-1 text-sm"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeTag(row.tagId)}
                        className="rounded border border-line px-2 py-1 text-xs hover:border-warn hover:text-warn"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-dashed border-line p-3">
          <h3 className="font-medium">Add custom Unique tag costs</h3>
          <p className="text-xs text-ink-soft">
            For Tinker Unique tags, GM sets segments/BP.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="text-xs">
              Segments
              <input
                type="number"
                min={1}
                value={uniqueSeg}
                onChange={(event) => setUniqueSeg(Number(event.target.value))}
                className="ml-2 w-16 rounded border border-line px-2 py-1"
              />
            </label>
            <label className="text-xs">
              BP
              <input
                type="number"
                min={1}
                value={uniqueBp}
                onChange={(event) => setUniqueBp(Number(event.target.value))}
                className="ml-2 w-16 rounded border border-line px-2 py-1"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-line bg-paper/70 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Results
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Market Value" value={`${result.marketValue}c`} />
            <Stat label="Load" value={`${result.load}`} />
            <Stat label="Tinker Resource" value={`${result.tinkerResource}`} />
            <Stat
              label="UC Clock"
              value={`${result.tinkerSegments} seg / ${result.tinkerBp} BP`}
            />
          </div>
          {result.warnings.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-warn">
              {result.warnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          ) : null}
          <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto text-sm">
            {result.lines.map((line, index) => (
              <li
                key={`${line.label}-${index}`}
                className="flex justify-between gap-3 border-b border-line/60 py-1"
              >
                <span>{line.label}</span>
                <span className="shrink-0 text-ink-soft">
                  {[
                    line.coins !== undefined ? `${line.coins}c` : null,
                    line.resource !== undefined ? `${line.resource}R` : null,
                    line.segments !== undefined ? `${line.segments}s` : null,
                    line.bp !== undefined ? `${line.bp}BP` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-soft">
            Market buy custom: often ~2× value. Stock goods cheaper. Resource
            usually 2c each when converting coin→resource.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-paper/70 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Tag repository
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            Showing tags compatible with{" "}
            <span className="font-medium text-ink">{profile.name}</span> (
            {filtered.length} available).
          </p>
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search compatible tags…"
            className="mt-3 w-full rounded-lg border border-line bg-paper-deep/40 px-3 py-2 text-sm"
          />
          <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="text-sm text-ink-soft">
                No compatible tags match this profile/search.
              </li>
            ) : (
              filtered.map((tag) => (
                <li
                  key={tag.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-line px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {tag.name}{" "}
                      <span className="text-xs text-ink-soft">
                        [{tag.types.join("/")}]{tag.custom ? " · custom" : ""}
                      </span>
                    </p>
                    <p className="text-xs text-ink-soft">{tag.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addTag(tag.id)}
                    className="shrink-0 rounded-lg bg-accent px-2 py-1 text-xs text-paper hover:bg-accent-deep"
                  >
                    Add
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="mt-5 border-t border-line pt-4">
            <h3 className="font-medium">Create custom tag</h3>
            <div className="mt-2 space-y-2">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Tag name"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
              <textarea
                value={newDesc}
                onChange={(event) => setNewDesc(event.target.value)}
                placeholder="Description / effect"
                rows={2}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                {ALL_TYPES.map((type) => {
                  const on = newTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setNewTypes((prev) =>
                          on
                            ? prev.filter((row) => row !== type)
                            : [...prev, type],
                        )
                      }
                      className={`rounded-md px-2 py-1 text-xs ${
                        on
                          ? "bg-accent text-paper"
                          : "border border-line text-ink-soft"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-ink-soft">
                Compatible item slots (leave empty = all profiles)
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_SLOTS.map((slot) => {
                  const on = newSlots.includes(slot.id);
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() =>
                        setNewSlots((prev) =>
                          on
                            ? prev.filter((row) => row !== slot.id)
                            : [...prev, slot.id],
                        )
                      }
                      className={`rounded-md px-2 py-1 text-xs ${
                        on
                          ? "bg-accent text-paper"
                          : "border border-line text-ink-soft"
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <label>
                  Stack max
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={newStack}
                    onChange={(event) => setNewStack(Number(event.target.value))}
                    className="ml-2 w-14 rounded border border-line px-2 py-1"
                  />
                </label>
                <label>
                  Load mod
                  <input
                    type="number"
                    value={newLoad}
                    onChange={(event) => setNewLoad(Number(event.target.value))}
                    className="ml-2 w-14 rounded border border-line px-2 py-1"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={createCustomTag}
                className="rounded-lg bg-accent px-3 py-2 text-sm text-paper hover:bg-accent-deep"
              >
                {campaignId
                  ? "Save tag locally & share to campaign"
                  : "Save tag to repository"}
              </button>
              <p className="text-[11px] text-ink-soft">
                Built-in seed: {BUILTIN_TAGS.length} tags.
                {campaignId
                  ? ` Campaign vault has ${sharedTags.length} shared custom tag${sharedTags.length === 1 ? "" : "s"}.`
                  : " Customs stay local to this browser."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper-deep/35 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-ink-soft">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-xl">
        {value}
      </p>
    </div>
  );
}
