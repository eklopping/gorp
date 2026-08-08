import type { TagDefinition, TagType } from "@/lib/srr/types";

/** Base coin cost by tag type (SRR Vol.3). Multi-type tags sum these. */
export const TAG_TYPE_COIN: Record<TagType, number | null> = {
  B: 1,
  I: 2,
  MI: 2,
  C: 3,
  M: 2,
  N: -1,
  PN: -2,
  NA: null,
  Legendary: null,
  Unique: null,
};

export const BUILTIN_TAGS: TagDefinition[] = [
  {
    id: "reinforced",
    name: "Reinforced",
    types: ["B"],
    description: "Common durability tag. Stackable.",
    stackableMax: 3,
  },
  {
    id: "brutal",
    name: "Brutal",
    types: ["B"],
    description: "Melee damage die upgrade style tag.",
    stackableMax: 2,
    appliesTo: "Melee weapons",
  },
  {
    id: "piercing",
    name: "Piercing",
    types: ["B"],
    description: "Armor piercing style tag.",
  },
  {
    id: "arrow-proof",
    name: "Arrow-proof",
    types: ["B"],
    description: "Mark Wear to ignore 2 AP from ranged until next turn.",
  },
  {
    id: "comfortable",
    name: "Comfortable",
    types: ["B"],
    description: "Reduce Load from base trait and positive tags.",
    loadMod: -1,
  },
  {
    id: "lightweight",
    name: "Lightweight",
    types: ["I"],
    description: "Reduces carried burden.",
    loadMod: -1,
  },
  {
    id: "extra-plating",
    name: "Extra Plating",
    types: ["B", "I", "C"],
    description: "Add +1 Toughness. Stackable ranks use B/I/C costs.",
    stackableMax: 3,
    appliesTo: "Clothing, armor, shields",
  },
  {
    id: "magazine",
    name: "Magazine",
    types: ["I"],
    description: "Avoid Reload penalty equal to stacks. Stackable.",
    stackableMax: 4,
    appliesTo: "Ranged with Reload",
  },
  {
    id: "quick-load",
    name: "Quick Load",
    types: ["C"],
    description: "Mark Wear to ignore Reload penalty for this attack.",
    appliesTo: "Ranged with Reload",
  },
  {
    id: "sturdy",
    name: "Sturdy",
    types: ["B"],
    description: "Durability support tag. Conflicts with some refillable rules.",
  },
  {
    id: "catfolk-steel",
    name: "Catfolk Steel",
    types: ["MI"],
    description: "Material. Hit-and-run focused. Often -1 Coin / -1 Wear-like tradeoffs in text.",
    coinModFlat: -1,
    wearMod: 0,
    appliesTo: "Light/Medium armor, one-handed melee/thrown",
  },
  {
    id: "foxfolk-steel",
    name: "Foxfolk Steel",
    types: ["MI"],
    description: "Gives temporary Wear (tracked narratively).",
  },
  {
    id: "taln-gold",
    name: "Taln Gold",
    types: ["MI", "C"],
    description: "Opulent material. Value increased (+4 or ×2 — apply as +4 flat here).",
    coinModFlat: 4,
    wearMod: -1,
  },
  {
    id: "small",
    name: "Small",
    types: ["N"],
    description: "Negative size tag.",
  },
  {
    id: "weighty",
    name: "Weighty",
    types: ["N"],
    description: "Negative bulk tag.",
    loadMod: 1,
  },
  {
    id: "conspicuous",
    name: "Conspicuous",
    types: ["N"],
    description: "Hard to hide / draw attention.",
  },
  {
    id: "cumbersome",
    name: "Cumbersome",
    types: ["N"],
    description: "Awkward to handle.",
  },
  {
    id: "shoddy",
    name: "Shoddy",
    types: ["N"],
    description: "Poor construction. Blocks some rules interactions.",
  },
  {
    id: "noisy",
    name: "Noisy",
    types: ["N"],
    description: "Hard to stay quiet with this item.",
  },
  {
    id: "unwieldy-1h",
    name: "Unwieldy (when one-handed)",
    types: ["N"],
    description: "Often inherent on two-handed profiles.",
    inherent: true,
  },
  {
    id: "reload",
    name: "Reload",
    types: ["N"],
    description: "Reload penalty tag. Often inherent on firearms/crossbows.",
    inherent: true,
  },
  {
    id: "unstable",
    name: "Unstable",
    types: ["PN"],
    description: "Potent negative. Magical broken items often gain this.",
  },
  {
    id: "immoral",
    name: "Immoral",
    types: ["N"],
    description: "Narrative/negative reputation style tag.",
  },
  {
    id: "memorable",
    name: "Memorable",
    types: ["NA"],
    description: "Narrative reputation tag. Talk with GM.",
  },
  {
    id: "charged",
    name: "Charged",
    types: ["M"],
    description: "Magical charge. Often paired with Unstable.",
    stackableMax: 1,
    wearMod: 1,
    coinModFlat: 1,
  },
];

export function baseTagCoin(types: TagType[]): number {
  let total = 0;
  let anyPriced = false;
  for (const type of types) {
    const value = TAG_TYPE_COIN[type];
    if (value !== null && value !== undefined) {
      total += value;
      anyPriced = true;
    }
  }
  return anyPriced ? total : 0;
}
