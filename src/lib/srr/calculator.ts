import { ITEM_PROFILES } from "@/data/srr/profiles";
import { BUILTIN_TAGS, TAG_TYPE_COIN, baseTagCoin } from "@/data/srr/tags";
import type {
  CalculatorMode,
  ItemProfile,
  SelectedTag,
  TagDefinition,
  TagType,
} from "@/lib/srr/types";

export function halfMin1(n: number) {
  if (n <= 0) return 0;
  return Math.max(1, Math.floor(n / 2));
}

/** Stackable coin cost: base + 2*base + 4*base... = base * (2^stacks - 1) */
export function stackableCoinCost(base: number, stacks: number) {
  const safeStacks = Math.max(1, stacks);
  if (base <= 0) return base * safeStacks;
  return base * (2 ** safeStacks - 1);
}

/**
 * Coin cost for a tag at N stacks (Vol.3 Gear).
 * Tiered tags (Reinforced B→I→C): each stack uses that tier's base × 2^(prior stacks).
 * Other tags: sum multi-rarity bases, then double per additional stack.
 */
export function tagStackCoinCost(tag: TagDefinition, stacks: number) {
  const n = Math.max(1, stacks);
  const flat = (tag.coinModFlat ?? 0) * n;

  if (tag.stackTiers?.length) {
    let total = 0;
    for (let i = 0; i < n; i += 1) {
      const tier =
        tag.stackTiers[Math.min(i, tag.stackTiers.length - 1)] ?? "B";
      const base = TAG_TYPE_COIN[tier];
      if (base === null || base === undefined) continue;
      total += base * 2 ** i;
    }
    return total + flat;
  }

  const typeBase = baseTagCoin(tag.types);
  if (typeBase < 0) return typeBase * n + flat;
  return stackableCoinCost(typeBase, n) + flat;
}

function stackTypeAt(tag: TagDefinition, stackIndex: number): TagType {
  if (tag.stackTiers?.length) {
    return (
      tag.stackTiers[Math.min(stackIndex, tag.stackTiers.length - 1)] ?? "B"
    );
  }
  // Prefer the “highest” crafting rarity for non-tiered multi-type tags.
  const order: TagType[] = ["M", "MI", "I", "C", "B"];
  for (const type of order) {
    if (tag.types.includes(type)) return type;
  }
  return tag.types[0] ?? "B";
}

function resourcePointsForType(type: TagType): number {
  if (type === "I" || type === "MI" || type === "M") return 2;
  if (type === "B" || type === "C") return 1;
  return 0;
}

/** Vol.1 Unique Creation resource contribution for one tag (counts each stack). */
export function tagResourceCost(tag: TagDefinition, stacks: number) {
  const n = Math.max(1, stacks);
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    total += resourcePointsForType(stackTypeAt(tag, i));
  }
  return total;
}

function segmentBaseForType(type: TagType): number {
  if (type === "B") return 1;
  if (type === "I" || type === "MI" || type === "C" || type === "M") return 2;
  return 0;
}

/**
 * Vol.1 Unique Creation clock segments + BP for one tag.
 * Additional stacks cost (normal + 1) segments; multi-type I/C stacks get +1 more.
 * Stackable ranks do not multiply BP — BP is once per tag (not per stack).
 */
export function tagClockCost(
  tag: TagDefinition,
  stacks: number,
  uniqueSegments = 1,
  uniqueBp = 1,
): { segments: number; bp: number } {
  const n = Math.max(1, stacks);
  const isLegendary = tag.types.includes("Legendary");
  const isUnique = tag.types.includes("Unique");

  if (isLegendary) {
    return { segments: 20 * n, bp: 5 };
  }
  if (isUnique) {
    return {
      segments: uniqueSegments * n,
      bp: Math.max(1, uniqueBp),
    };
  }

  const multiTyped =
    (tag.stackTiers?.length ?? 0) > 1 ||
    tag.types.filter((type) =>
      ["B", "I", "MI", "C", "M"].includes(type),
    ).length > 1;

  let segments = 0;
  for (let i = 0; i < n; i += 1) {
    const type = stackTypeAt(tag, i);
    const base = segmentBaseForType(type);
    let seg = i === 0 ? base : base + 1;
    if (
      multiTyped &&
      (type === "I" || type === "MI" || type === "C")
    ) {
      seg += 1;
    }
    segments += seg;
  }

  const grantsBp = tag.types.some((type) =>
    ["I", "MI", "C", "M"].includes(type),
  );
  return { segments, bp: grantsBp ? 1 : 0 };
}

export function resolveTag(
  tagId: string,
  repo: TagDefinition[],
): TagDefinition | undefined {
  return (
    repo.find((tag) => tag.id === tagId) ??
    BUILTIN_TAGS.find((tag) => tag.id === tagId)
  );
}

/** Whether a tag can be offered/added for the given item profile. */
export function isTagCompatibleWithProfile(
  profile: ItemProfile,
  tag: TagDefinition,
) {
  if (tag.inherent) return false;
  if (profile.forbiddenTagIds?.includes(tag.id)) return false;
  if (tag.forbiddenProfileIds?.includes(profile.id)) return false;

  if (tag.requiresInherent?.length) {
    const inherent = new Set(profile.inherentTags ?? []);
    if (!tag.requiresInherent.every((id) => inherent.has(id))) return false;
  }

  if (tag.compatibleSlots?.length) {
    const slots = new Set(profile.slots);
    if (!tag.compatibleSlots.some((slot) => slots.has(slot))) return false;
  }

  return true;
}

export function maxPositiveTagSlots(totalWear: number, negativeSlotsUsed: number) {
  const base = 1 + Math.floor(totalWear / 2);
  // Up to 2 negative tags (or 1 potent) grant +2 additional positive slots
  const bonus = Math.min(2, negativeSlotsUsed) > 0 ? 2 : 0;
  return base + bonus;
}

export function negativeSlotWeight(types: TagType[]) {
  if (types.includes("PN")) return 2;
  if (types.includes("N")) return 1;
  return 0;
}

export function wearCoinCost(totalWear: number) {
  if (totalWear > 5) return totalWear * 2;
  return totalWear;
}

export type CalcInput = {
  profileId: string;
  totalWear: number;
  selected: SelectedTag[];
  tags: TagDefinition[];
  crafterType?: CalculatorMode;
  customUniqueSegments?: number;
  customUniqueBp?: number;
};

export type CalcBreakdownLine = {
  label: string;
  coins?: number;
  resource?: number;
  segments?: number;
  bp?: number;
};

export type CalcResult = {
  profile: ItemProfile;
  totalWear: number;
  addedWear: number;
  load: number;
  marketValue: number;
  /** Custom craftsman commission — typically ~2× market value (SRR). */
  craftsmanCost: number;
  tagSlotsUsed: number;
  tagSlotsMax: number;
  negativeSlotsUsed: number;
  overLimitTags: number;
  tinkerResource: number;
  tinkerSegments: number;
  tinkerBp: number;
  crafterType: CalculatorMode;
  warnings: string[];
  lines: CalcBreakdownLine[];
};

export function calculateItem(input: CalcInput): CalcResult {
  const crafterType: CalculatorMode = input.crafterType ?? "craftsman";
  const profile =
    ITEM_PROFILES.find((row) => row.id === input.profileId) ?? ITEM_PROFILES[0];
  const totalWear = Math.max(
    profile.startingWear,
    Math.min(input.totalWear, profile.maxWear ?? 99),
  );
  const addedWear = Math.max(0, totalWear - profile.startingWear);
  const warnings: string[] = [];
  const lines: CalcBreakdownLine[] = [];

  let tagCoins = 0;
  let loadMod = profile.loadMod;
  let positiveCount = 0;
  let negativeSlotsUsed = 0;
  let tagResource = 0;
  let segments = profile.startingWear + Math.ceil(addedWear / 2);
  let countedBpFromTags = 0;
  let hasUniqueOrLegendary = false;
  let hasCraftsmanTag = false;

  lines.push({
    label: `Profile: ${profile.name}`,
    coins: profile.coin,
    segments: profile.startingWear,
  });
  if (addedWear > 0) {
    lines.push({
      label: `Added Wear (${addedWear})`,
      segments: Math.ceil(addedWear / 2),
    });
  }

  for (const selected of input.selected) {
    const tag = resolveTag(selected.tagId, input.tags);
    if (!tag) {
      warnings.push(`Unknown tag: ${selected.tagId}`);
      continue;
    }
    if (tag.inherent) continue;

    const stacks = Math.max(
      1,
      Math.min(selected.stacks, tag.stackableMax ?? selected.stacks),
    );
    const finalCoin = tagStackCoinCost(tag, stacks);
    const resourcePts = tagResourceCost(tag, stacks);
    const clock = tagClockCost(
      tag,
      stacks,
      input.customUniqueSegments,
      input.customUniqueBp,
    );

    tagCoins += finalCoin;
    tagResource += resourcePts;
    loadMod += (tag.loadMod ?? 0) * stacks;
    segments += clock.segments;
    countedBpFromTags += clock.bp;

    if (tag.types.includes("PN")) {
      negativeSlotsUsed += 2;
    } else if (tag.types.includes("N") && !tag.inherent) {
      negativeSlotsUsed += 1;
    } else if (
      !tag.types.includes("NA") &&
      !tag.types.includes("Legendary") &&
      !tag.types.includes("Unique")
    ) {
      positiveCount += 1; // stackable still one slot
    }

    if (tag.types.includes("Legendary") || tag.types.includes("Unique")) {
      hasUniqueOrLegendary = true;
    }
    if (tag.types.includes("C")) hasCraftsmanTag = true;

    lines.push({
      label: `${tag.name} ×${stacks} [${tag.types.join("/")}]`,
      coins: finalCoin,
      resource: resourcePts || undefined,
      segments: clock.segments || undefined,
      bp: clock.bp || undefined,
    });
  }

  // Normalize negative slots: max 2
  if (negativeSlotsUsed > 2) {
    warnings.push("Only 2 Negative tags or 1 Potent Negative are allowed.");
    negativeSlotsUsed = 2;
  }

  const freeTags = profile.freeStartingTags ?? 0;
  const tagSlotsMax = maxPositiveTagSlots(totalWear, negativeSlotsUsed) + freeTags;
  const tagSlotsUsed = positiveCount;
  const overLimitTags = Math.max(0, tagSlotsUsed - tagSlotsMax);
  if (overLimitTags > 0) {
    if (crafterType === "tinker") {
      warnings.push(
        `${overLimitTags} tag(s) over Wear limit — Unique Creation adds +5 Resource & +1 BP each.`,
      );
    } else {
      warnings.push(
        `${overLimitTags} tag(s) over Wear limit — a regular craftsman usually cannot exceed Wear tag caps; use a Tinker.`,
      );
    }
  }

  if (crafterType === "craftsman" && hasUniqueOrLegendary) {
    warnings.push(
      "Unique/Legendary tags are Tinker work — a regular craftsman cannot finish this build.",
    );
  }
  if (crafterType === "tinker" && hasCraftsmanTag) {
    warnings.push(
      "Craftsman [C] tags still apply; Unique Creation pays their Resource/clock cost.",
    );
  }

  // Vol.1: over-limit tags add +1 BP each on top of the tag's normal cost.
  const bp = Math.max(1, countedBpFromTags + overLimitTags);

  const wearCoins = wearCoinCost(totalWear);
  lines.push({
    label: `Wear total (${totalWear})${totalWear > 5 ? " @ 2/box" : " @ 1/box"}`,
    coins: wearCoins,
  });

  const marketValue = profile.coin + tagCoins + wearCoins;
  const craftsmanCost = marketValue * 2;

  const minLoad = profile.minLoad ?? 1;
  let load = Math.ceil(totalWear / 2) + loadMod;
  if (profile.id !== "accessory") {
    load = Math.max(minLoad, load);
  } else {
    load = Math.max(0, Math.min(2, load));
  }

  // Vol.1 Unique Creation Resource:
  // ½ starting Wear (min 1) + ½ added Wear (min 1) + tag stack points + 5× over-limit
  const resource =
    halfMin1(profile.startingWear) +
    halfMin1(addedWear) +
    tagResource +
    overLimitTags * 5;

  if (crafterType === "craftsman") {
    lines.push({
      label: "Market value (stock reference)",
      coins: marketValue,
    });
    lines.push({
      label: "Craftsman custom commission (~2× value)",
      coins: craftsmanCost,
    });
  } else {
    lines.push({
      label: "Tinker Resource (Unique Creation)",
      resource,
    });
    lines.push({
      label: "Tinker Clock",
      segments,
      bp,
    });
    lines.push({
      label: "Market value (if sold later)",
      coins: marketValue,
    });
  }

  return {
    profile,
    totalWear,
    addedWear,
    load,
    marketValue,
    craftsmanCost,
    tagSlotsUsed,
    tagSlotsMax,
    negativeSlotsUsed,
    overLimitTags,
    tinkerResource: resource,
    tinkerSegments: segments,
    tinkerBp: bp,
    crafterType,
    warnings,
    lines,
  };
}

export function mergeTagRepos(custom: TagDefinition[]): TagDefinition[] {
  const map = new Map<string, TagDefinition>();
  const builtinIds = new Set<string>();
  for (const tag of BUILTIN_TAGS) {
    map.set(tag.id, tag);
    builtinIds.add(tag.id);
  }
  for (const tag of custom) {
    // Never let a campaign/local copy override built-in slot rules (e.g. Durable).
    if (builtinIds.has(tag.id)) continue;
    map.set(tag.id, { ...tag, custom: true });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
