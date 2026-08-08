import { ITEM_PROFILES } from "@/data/srr/profiles";
import { BUILTIN_TAGS, baseTagCoin } from "@/data/srr/tags";
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
  let basicOrCraftCount = 0;
  let ingredientOrMagicCount = 0;
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
    const typeBase = baseTagCoin(tag.types);
    const flat = tag.coinModFlat ?? 0;
    const finalCoin =
      typeBase < 0
        ? typeBase * stacks + flat * stacks
        : stackableCoinCost(typeBase, stacks) + flat * stacks;

    tagCoins += finalCoin;
    loadMod += (tag.loadMod ?? 0) * stacks;

    const neg = negativeSlotWeight(tag.types);
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

    // Tinker segment/BP accounting
    const isBasic = tag.types.includes("B");
    const isIng = tag.types.includes("I") || tag.types.includes("MI");
    const isCraft = tag.types.includes("C");
    const isMagic = tag.types.includes("M");
    const isLegendary = tag.types.includes("Legendary");
    const isUnique = tag.types.includes("Unique");
    if (isLegendary || isUnique) hasUniqueOrLegendary = true;
    if (isCraft) hasCraftsmanTag = true;

    if (isLegendary) {
      segments += 20 * stacks;
      countedBpFromTags += 5 * stacks;
      lines.push({
        label: `${tag.name} ×${stacks} (Legendary)`,
        coins: finalCoin,
        segments: 20 * stacks,
        bp: 5 * stacks,
      });
    } else if (isUnique) {
      const seg = (input.customUniqueSegments ?? 1) * stacks;
      const uniqueBp = (input.customUniqueBp ?? 1) * stacks;
      segments += seg;
      countedBpFromTags += uniqueBp;
      lines.push({
        label: `${tag.name} ×${stacks} (Unique)`,
        coins: finalCoin,
        segments: seg,
        bp: uniqueBp,
      });
    } else if (isMagic) {
      segments += 2 * stacks;
      countedBpFromTags += stacks;
      ingredientOrMagicCount += stacks;
      lines.push({
        label: `${tag.name} ×${stacks} [M]`,
        coins: finalCoin,
        segments: 2 * stacks,
        bp: stacks,
      });
    } else if (isIng || isCraft) {
      let seg = 2 * stacks;
      const pricedTypes = tag.types.filter((t) =>
        ["I", "MI", "C", "M", "B"].includes(t),
      );
      if (pricedTypes.length > 1) seg += stacks;
      segments += seg;
      countedBpFromTags += stacks;
      if (isIng || isMagic) ingredientOrMagicCount += stacks;
      else basicOrCraftCount += stacks;
      lines.push({
        label: `${tag.name} ×${stacks} [${tag.types.join("/")}]`,
        coins: finalCoin,
        segments: seg,
        bp: stacks,
      });
    } else if (isBasic) {
      const seg = 1 + (stacks - 1) * 2;
      segments += seg;
      basicOrCraftCount += stacks;
      lines.push({
        label: `${tag.name} ×${stacks} [B]`,
        coins: finalCoin,
        segments: seg,
      });
    } else {
      lines.push({
        label: `${tag.name} [${tag.types.join("/")}]`,
        coins: finalCoin,
      });
    }

    void neg;
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

  const resource =
    halfMin1(profile.startingWear) +
    halfMin1(addedWear) +
    basicOrCraftCount +
    ingredientOrMagicCount * 2 +
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
  for (const tag of BUILTIN_TAGS) map.set(tag.id, tag);
  for (const tag of custom) map.set(tag.id, { ...tag, custom: true });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
