import type { ItemSlot, TagDefinition, TagType } from "@/lib/srr/types";

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

/** Display order matching the PDF Tag Type Table. */
export const TAG_TYPE_ORDER: TagType[] = [
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

/**
 * Color coordination aligned with SRR Vol.3 conventions:
 * Basic bronze, Ingredient green, Material teal, Craftsman steel,
 * Magical violet, Negative orange, Potent Negative crimson,
 * Narrative slate, Legendary gold, Unique indigo.
 */
export const TAG_TYPE_META: Record<
  TagType,
  {
    label: string;
    symbol: string;
    coin: string;
    /** Filter chip / section header */
    chipClass: string;
    /** Compact [B] style badge */
    badgeClass: string;
    /** Left accent on list rows */
    rowAccentClass: string;
  }
> = {
  B: {
    label: "Basic",
    symbol: "B",
    coin: "1c",
    chipClass:
      "border-[#c49a55]/55 bg-[#f3e6c8] text-[#5c4318] data-[active=true]:bg-[#c49a55] data-[active=true]:text-[#1a1208]",
    badgeClass: "border-[#c49a55]/60 bg-[#f3e6c8] text-[#5c4318]",
    rowAccentClass: "border-l-[#c49a55]",
  },
  I: {
    label: "Ingredient",
    symbol: "I",
    coin: "2c",
    chipClass:
      "border-[#5a8f4a]/55 bg-[#e4f0d8] text-[#2f4f24] data-[active=true]:bg-[#5a8f4a] data-[active=true]:text-white",
    badgeClass: "border-[#5a8f4a]/60 bg-[#e4f0d8] text-[#2f4f24]",
    rowAccentClass: "border-l-[#5a8f4a]",
  },
  MI: {
    label: "Material Ingredient",
    symbol: "MI",
    coin: "2c",
    chipClass:
      "border-[#2f8f8a]/55 bg-[#d8f0ee] text-[#1a524e] data-[active=true]:bg-[#2f8f8a] data-[active=true]:text-white",
    badgeClass: "border-[#2f8f8a]/60 bg-[#d8f0ee] text-[#1a524e]",
    rowAccentClass: "border-l-[#2f8f8a]",
  },
  C: {
    label: "Craftsman",
    symbol: "C",
    coin: "3c",
    chipClass:
      "border-[#4a6fa5]/55 bg-[#dce6f5] text-[#243f66] data-[active=true]:bg-[#4a6fa5] data-[active=true]:text-white",
    badgeClass: "border-[#4a6fa5]/60 bg-[#dce6f5] text-[#243f66]",
    rowAccentClass: "border-l-[#4a6fa5]",
  },
  M: {
    label: "Magical",
    symbol: "M",
    coin: "2c",
    chipClass:
      "border-[#7a4ea8]/55 bg-[#eadcf5] text-[#3d2460] data-[active=true]:bg-[#7a4ea8] data-[active=true]:text-white",
    badgeClass: "border-[#7a4ea8]/60 bg-[#eadcf5] text-[#3d2460]",
    rowAccentClass: "border-l-[#7a4ea8]",
  },
  N: {
    label: "Negative",
    symbol: "N",
    coin: "−1c",
    chipClass:
      "border-[#d17a3a]/55 bg-[#f8e4d4] text-[#6b3410] data-[active=true]:bg-[#d17a3a] data-[active=true]:text-white",
    badgeClass: "border-[#d17a3a]/60 bg-[#f8e4d4] text-[#6b3410]",
    rowAccentClass: "border-l-[#d17a3a]",
  },
  PN: {
    label: "Potent Negative",
    symbol: "PN",
    coin: "−2c",
    chipClass:
      "border-[#a33a2e]/55 bg-[#f5d8d4] text-[#5c1812] data-[active=true]:bg-[#a33a2e] data-[active=true]:text-white",
    badgeClass: "border-[#a33a2e]/60 bg-[#f5d8d4] text-[#5c1812]",
    rowAccentClass: "border-l-[#a33a2e]",
  },
  NA: {
    label: "Narrative",
    symbol: "NA",
    coin: "—",
    chipClass:
      "border-[#6b7280]/55 bg-[#e8eaed] text-[#374151] data-[active=true]:bg-[#6b7280] data-[active=true]:text-white",
    badgeClass: "border-[#6b7280]/60 bg-[#e8eaed] text-[#374151]",
    rowAccentClass: "border-l-[#6b7280]",
  },
  Legendary: {
    label: "Legendary",
    symbol: "L",
    coin: "—",
    chipClass:
      "border-[#b8860b]/55 bg-[#f7ecc8] text-[#5c4508] data-[active=true]:bg-[#b8860b] data-[active=true]:text-[#1a1208]",
    badgeClass: "border-[#b8860b]/60 bg-[#f7ecc8] text-[#5c4508]",
    rowAccentClass: "border-l-[#b8860b]",
  },
  Unique: {
    label: "Unique",
    symbol: "U",
    coin: "—",
    chipClass:
      "border-[#4338ca]/55 bg-[#e0e7ff] text-[#312e81] data-[active=true]:bg-[#4338ca] data-[active=true]:text-white",
    badgeClass: "border-[#4338ca]/60 bg-[#e0e7ff] text-[#312e81]",
    rowAccentClass: "border-l-[#4338ca]",
  },
};

/** Most specific type for grouping multi-typed tags. */
const PRIMARY_PRIORITY: TagType[] = [
  "PN",
  "N",
  "Legendary",
  "Unique",
  "MI",
  "C",
  "M",
  "I",
  "B",
  "NA",
];

export function primaryTagType(types: TagType[]): TagType {
  for (const type of PRIMARY_PRIORITY) {
    if (types.includes(type)) return type;
  }
  return types[0] ?? "B";
}

export function tagMatchesTypeFilter(
  tag: TagDefinition,
  typeFilter: TagType | "all",
) {
  if (typeFilter === "all") return true;
  return tag.types.includes(typeFilter);
}

const MELEE: ItemSlot[] = ["melee-1h", "melee-2h"];
const RANGED: ItemSlot[] = ["ranged-simple", "ranged-advanced"];
const WEAPON: ItemSlot[] = [...MELEE, ...RANGED];
const ARMOR: ItemSlot[] = ["armor-light", "armor-medium", "armor-heavy"];
const LIGHT_MED_ARMOR: ItemSlot[] = ["armor-light", "armor-medium", "clothing"];
const FIREARMS = ["rifle", "shotgun", "pistol"] as const;

/**
 * Built-in SRR Vol.3 Gear tags.
 * Tags with no `compatibleSlots` are general-use and available on every profile
 * unless a profile/tag forbid list says otherwise.
 */
export const BUILTIN_TAGS: TagDefinition[] = [
  // ── Material ──────────────────────────────────────────────
  {
    id: "catfolk-steel",
    name: "Catfolk Steel",
    types: ["MI"],
    description:
      "Hit-and-run material. Mark Wear for Fighting/Athletics bonuses or Extraction as Free Action on armor. −1 Coin; −1 Damage / Toughness.",
    coinModFlat: -1,
    compatibleSlots: ["armor-light", "armor-medium", "melee-1h"],
  },
  {
    id: "foxfolk-steel",
    name: "Foxfolk Steel",
    types: ["MI"],
    description: "Any item. +2 Temporary Wear. +1 Wear, −1 Coin, +1 Load.",
    coinModFlat: -1,
    wearMod: 1,
    loadMod: 1,
    // *Any Item — general use
  },
  {
    id: "mousefolk-steel",
    name: "Mousefolk Steel",
    types: ["MI"],
    description:
      "Melee: damage uses Smarts instead of Strength. Ranged: Mark 2 Wear to Aim. −2 Load, −1 Coin, −1 Wear.",
    coinModFlat: -1,
    wearMod: -1,
    loadMod: -2,
    compatibleSlots: WEAPON,
  },
  {
    id: "rabbitfolk-steel",
    name: "Rabbitfolk Steel",
    types: ["MI"],
    description:
      "Melee: damage uses Agility. Armor: +1 Pace / Mark Wear for +2 Pace. −1 Coin; −1 Damage or Toughness.",
    coinModFlat: -1,
    compatibleSlots: [...MELEE, ...ARMOR],
  },
  {
    id: "corvian-bronze",
    name: "Corvian Bronze",
    types: ["MI", "NA"],
    description:
      "Mark Wear to inflict Drained. Hated by the Eyre. Ranged needs Special Ammunition accessory. −1 Load.",
    loadMod: -1,
    compatibleSlots: [...MELEE, "accessory"],
  },
  {
    id: "wolven-bonesteel",
    name: "Wolven Bonesteel",
    types: ["MI", "NA"],
    description:
      "Team Attack: Mark Wear to ignore penalty; +1 SAP with Team Attack. +1 Parry.",
    compatibleSlots: WEAPON,
  },
  {
    id: "bearclaw-iron",
    name: "Bearclaw Iron",
    types: ["MI", "NA", "C"],
    description:
      "Mark Wear to inflict Vulnerable until end of next turn. Ranged via Special Ammunition. +2 Wear, +1 Load.",
    wearMod: 2,
    loadMod: 1,
    compatibleSlots: [...MELEE, "accessory"],
  },
  {
    id: "wurmshell-chitin",
    name: "Wurmshell Chitin",
    types: ["M", "MI", "NA", "C"],
    description:
      "Mark 2 Wear for power points. Comes with Charged [M](1) and Unstable [PN]. Not for firearms. +1 Wear, +1 Coin.",
    wearMod: 1,
    coinModFlat: 1,
    forbiddenProfileIds: [...FIREARMS],
  },
  {
    id: "wild-iron",
    name: "Wild Iron",
    types: ["MI"],
    description:
      "Mark 1 Wear before melee/throw for +1 Fighting/Athletics and damage. Armor/shields +1 Toughness. −1 Coin, +1 Load.",
    coinModFlat: -1,
    loadMod: 1,
    compatibleSlots: [...MELEE, ...ARMOR, "shield"],
  },
  {
    id: "keepers-steel",
    name: "Keepers Steel",
    types: ["MI", "C", "NA"],
    description:
      "Mark 1 Wear instead of 2 for Sundering Soak. +2 Repair rolls. +1 Coin.",
    coinModFlat: 1,
    compatibleSlots: [...WEAPON, ...ARMOR, "shield"],
  },
  {
    id: "taln-gold",
    name: "Taln Gold",
    types: ["MI", "C"],
    description:
      "Value +4 Coin or ×2 (whichever higher). Social/Rep bonuses when displayed. −1 Wear.",
    coinModFlat: 4,
    wearMod: -1,
    compatibleSlots: [...WEAPON, ...ARMOR, "accessory", "clothing"],
  },
  {
    id: "boloran-fire-bronze",
    name: "Boloran Fire Bronze",
    types: ["MI", "C", "M", "NA"],
    description:
      "Resist storm/Dangerous travel / Attrition; Sundering Soak vs electrical fills Charged. Charged[M](1). −1 Wear, −1 Toughness, +2 Coin.",
    wearMod: -1,
    coinModFlat: 2,
    compatibleSlots: [...WEAPON, ...ARMOR, "accessory"],
  },
  {
    id: "wolven-sparksteel",
    name: "Wolven Sparksteel",
    types: ["M", "MI", "NA"],
    description:
      "Electrical surge on hit; AP 2 vs metal. Charged[M](1). Armor/shields resist metal-tipped ranged. Vigor or Shaken.",
    compatibleSlots: [...WEAPON, ...ARMOR, "shield"],
  },

  // ── Melee / Ranged ────────────────────────────────────────
  {
    id: "arrow-proof",
    name: "Arrow-proof",
    types: ["B"],
    description:
      "Mark Wear to ignore 2 AP from ranged until next turn. Not affected by Sturdy. Needs Large [B] on two-handed weapons.",
    compatibleSlots: [...ARMOR, "shield", "melee-2h"],
  },
  {
    id: "brutal",
    name: "Brutal",
    types: ["B"],
    description: "Increase the weapon’s damage die by one step.",
    stackableMax: 2,
    compatibleSlots: WEAPON,
  },
  {
    id: "concussive",
    name: "Concussive",
    types: ["B"],
    description:
      "No Non-Lethal penalties. Mark 2 Wear if damage exceeds Toughness to force Vigor or Stunned. Blunt weapons.",
    compatibleSlots: MELEE,
  },
  {
    id: "deflecting",
    name: "Deflecting",
    types: ["B"],
    description:
      "+1 Parry; Mark Wear for +3 Parry for your turn. Melee weapons or shields.",
    compatibleSlots: [...MELEE, "shield"],
  },
  {
    id: "free-ammo",
    name: "Free Ammo",
    types: ["B"],
    description:
      "Ammo is freely available; ignore Ammunition keyword. Inherent on Slings; can be taken on Blunderbuss.",
    compatibleSlots: ["ranged-advanced", "ranged-simple"],
    forbiddenProfileIds: ["bow", "crossbow", "rifle", "pistol", "sling"],
  },
  {
    id: "hair-trigger",
    name: "Hair Trigger",
    types: ["B"],
    description:
      "Mark 1 Wear to Counterattack without the additional penalty. Firearms and crossbows.",
    compatibleSlots: RANGED,
    forbiddenProfileIds: ["bow", "sling"],
  },
  {
    id: "heavy-bludgeon",
    name: "Heavy Bludgeon",
    types: ["B"],
    description:
      "Mark 2 Wear for +AP and Strength contest or Prone. Two-handed blunt, shotgun/blunderbuss, or shield. Not with Small. Not affected by Sturdy.",
    compatibleSlots: ["melee-2h", "ranged-advanced", "shield"],
    forbiddenProfileIds: ["rifle", "pistol", "bow", "crossbow", "sling"],
  },
  {
    id: "heavy-draw-weight",
    name: "Heavy Draw Weight",
    types: ["B"],
    description:
      "Add half Strength die to damage, or Mark Wear for full Strength die. Bow or sling only.",
    compatibleSlots: ["ranged-simple"],
    forbiddenProfileIds: ["crossbow"],
  },
  {
    id: "large",
    name: "Large",
    types: ["B"],
    description: "Mark Wear to add +3 damage. Two-handed weapons. Not with Small.",
    compatibleSlots: ["melee-2h"],
  },
  {
    id: "lengthened",
    name: "Lengthened",
    types: ["B"],
    description:
      "Gains Reach; Vulnerable to foes in The Fray. Two-handed. Not with Small.",
    compatibleSlots: ["melee-2h"],
  },
  {
    id: "longshot",
    name: "Longshot",
    types: ["B"],
    description: "Increase Range/Zone by one step per stack.",
    stackableMax: 3,
    compatibleSlots: RANGED,
    forbiddenProfileIds: ["shotgun"],
  },
  {
    id: "nasty",
    name: "Nasty",
    types: ["B"],
    description:
      "When Crushing, Mark Wear to use weapon damage (Heavy Armor adds Toughness bonus).",
    compatibleSlots: ["melee-1h", "armor-heavy"],
  },
  {
    id: "piercing",
    name: "Piercing",
    types: ["B"],
    description:
      "+1 AP; Mark Wear for +2 AP this turn. Stabbing weapons and bows. Inherent to Crossbows.",
    compatibleSlots: [...MELEE, "ranged-simple"],
    forbiddenProfileIds: [...FIREARMS],
  },
  {
    id: "precise",
    name: "Precise",
    types: ["B"],
    description: "Mark 1 Wear to reduce Called Shot penalty by 2 (once per action).",
    compatibleSlots: RANGED,
  },
  {
    id: "short-limbs-barrel",
    name: "Short Limbs/Barrel",
    types: ["B"],
    description:
      "Reduce Range one step; fire in melee / The Fray with no penalty.",
    compatibleSlots: RANGED,
  },
  {
    id: "throwable",
    name: "Throwable",
    types: ["B"],
    description:
      "Athletics attack at The Crossroads with weapon damage. Stackable.",
    stackableMax: 2,
    compatibleSlots: ["melee-1h"],
  },
  {
    id: "versatile",
    name: "Versatile",
    types: ["B"],
    description: "One-handed weapon options. Not with Small.",
    stackableMax: 2,
    compatibleSlots: ["melee-1h"],
  },
  {
    id: "destructive",
    name: "Destructive",
    types: ["I"],
    description:
      "Mark 2 Wear on hit vs objects / structures for extra Wear damage.",
    stackableMax: 2,
    compatibleSlots: [...MELEE, ...RANGED],
  },
  {
    id: "magazine",
    name: "Magazine",
    types: ["I"],
    description:
      "Extra shots before Reloading equal to stacks + 1. Rifles, pistols, crossbows (any Reload weapon).",
    stackableMax: 4,
    compatibleSlots: RANGED,
    requiresInherent: ["reload"],
  },
  {
    id: "oiled-string",
    name: "Oiled String",
    types: ["I"],
    description: "Mark 2 Wear to fire once per round as a Free Attack. Bows only.",
    compatibleSlots: ["ranged-simple"],
    forbiddenProfileIds: ["crossbow", "sling"],
  },
  {
    id: "balanced-grip",
    name: "Balanced Grip",
    types: ["C"],
    description:
      "Lose Unwieldy when used one-handed; treated as one-handed but keeps two-hand benefits. Needs Small[N] or Lightweight[I].",
    compatibleSlots: ["melee-2h", "ranged-simple", "ranged-advanced"],
    forbiddenProfileIds: ["bow", "sling", "pistol"],
  },
  {
    id: "disguised",
    name: "Disguised",
    types: ["C"],
    description: "Concealed as another object. One-handed weapons.",
    compatibleSlots: ["melee-1h"],
  },
  {
    id: "quick-load",
    name: "Quick Load",
    types: ["C"],
    description:
      "Mark Wear to ignore Reload penalty for this attack. Does not stack with Magazine benefit that turn.",
    compatibleSlots: RANGED,
    requiresInherent: ["reload"],
  },

  // ── Armor / Shield ────────────────────────────────────────
  {
    id: "bash",
    name: "Bash",
    types: ["B"],
    description:
      "Shield or heavy armor gains Strength+d6 damage and counts as a weapon for weapon tags.",
    compatibleSlots: ["shield", "armor-heavy"],
  },
  {
    id: "comfortable",
    name: "Comfortable",
    types: ["B"],
    description:
      "Reduce Load from base trait and positive tags that add Load by 2.",
    loadMod: -2,
    compatibleSlots: ARMOR,
  },
  {
    id: "extra-plating",
    name: "Extra Plating",
    types: ["B", "I", "C"],
    description:
      "+1 Toughness per stack (B→I→C costs). Clothing, armor, shields. Not with Lightweight.",
    stackableMax: 3,
    compatibleSlots: [...ARMOR, "clothing", "shield"],
  },
  {
    id: "reinforced",
    name: "Reinforced",
    types: ["B", "I", "C"],
    description:
      "Sundering Soak +1 Wound soaked per stack. Inherent to Shields. Armor only when purchased.",
    stackableMax: 3,
    compatibleSlots: ARMOR,
  },
  {
    id: "tightly-woven",
    name: "Tightly Woven",
    types: ["B"],
    description:
      "After combat, repair 2 most recent Wear uses for free if you spent Wear this Scene.",
    compatibleSlots: LIGHT_MED_ARMOR,
  },
  {
    id: "flexible",
    name: "Flexible",
    types: ["I"],
    description:
      "Mark Wear in a Grapple to ignore Entangled/Bound penalties.",
    compatibleSlots: ["armor-light", "armor-medium"],
  },
  {
    id: "ergonomics",
    name: "Ergonomics",
    types: ["C"],
    description:
      "Always count as Light Load; if Broken/Destroyed, lose all held Resource.",
    compatibleSlots: [...ARMOR, "clothing", "accessory"],
  },
  {
    id: "escape-mechanism",
    name: "Escape Mechanism",
    types: ["C"],
    description: "Mark Wear to unequip this armor as a Free Action.",
    compatibleSlots: ARMOR,
  },

  // ── Universal / Misc (general use unless noted) ───────────
  {
    id: "always-ready",
    name: "Always Ready",
    types: ["B"],
    description:
      "Always equipped; Ready as a Free Action. General use (*Any Item).",
  },
  {
    id: "bagage",
    name: "Bagage",
    types: ["B"],
    description:
      "Carry +2 Resource per stack per Wear. May specialize for Consumable or Ammunition storage.",
    stackableMax: 2,
  },
  {
    id: "common",
    name: "Common",
    types: ["B"],
    description:
      "Common folk can repair (1 Resource per Wear). Cannot combine with [I], [M], or [C] tags.",
  },
  {
    id: "custom-made",
    name: "Custom Made",
    types: ["B"],
    description:
      "Mark Wear for +2 to a chosen non-Fighting/Shooting skill; Mark 3 for an extra Wild Die.",
  },
  {
    id: "fast",
    name: "Fast",
    types: ["B"],
    description:
      "Mark Wear to suffer only half Multi-Action / Reaction penalties with this item.",
  },
  {
    id: "hidden",
    name: "Hidden",
    types: ["B"],
    description:
      "Mark Wear when searched to stay unnoticed. Requires Small; not two-handed or armor.",
    compatibleSlots: [
      "melee-1h",
      "ranged-simple",
      "ranged-advanced",
      "accessory",
      "shield",
    ],
    forbiddenProfileIds: [
      "two-handed",
      "bow",
      "crossbow",
      "rifle",
      "shotgun",
      "light-armor",
      "medium-armor",
      "heavy-armor",
    ],
  },
  {
    id: "inspiring",
    name: "Inspiring",
    types: ["B"],
    description:
      "Mark Wear for temporary SAP on Support or Rallying Call.",
  },
  {
    id: "intimidating",
    name: "Intimidating",
    types: ["B"],
    description:
      "Mark Wear while flaunting to inflict 2 Morale Damage (+2 per extra stack).",
    stackableMax: 2,
  },
  {
    id: "pull-back",
    name: "Pull Back",
    types: ["B", "C", "NA"],
    description:
      "Return thrown items (needs Throwable at [B]). Higher stacks unlock Latch / Self Propelled / Retractable.",
    stackableMax: 3,
  },
  {
    id: "simple",
    name: "Simple",
    types: ["B"],
    description:
      "Anyone can fix when Broken at half Value. Cannot combine with [I], [M], or [C] tags.",
  },
  {
    id: "sturdy",
    name: "Sturdy",
    types: ["B"],
    description:
      "Mark Willpower instead of Wear when using a Tag (not Sundering Soak). Not for refillables.",
  },
  {
    id: "tricky",
    name: "Tricky",
    types: ["B"],
    description:
      "Mark Wear on a contest to remove the opponent’s Wild Die.",
  },
  {
    id: "unassuming",
    name: "Unassuming",
    types: ["B"],
    description:
      "Until you harm someone, foes won’t prioritize you. Mark Wear for +2 Thievery to hide items.",
  },
  {
    id: "charged",
    name: "Charged",
    types: ["M"],
    description:
      "Store 5 Power Points per stack (spend Wear to charge). General use (*Any Item).",
    stackableMax: 4,
    wearMod: 0,
  },
  {
    id: "durable",
    name: "Durable",
    types: ["I"],
    description: "+3 Temporary Wear (combine with other temp Wear). Not for refillables.",
  },
  {
    id: "lightweight",
    name: "Lightweight",
    types: ["I"],
    description:
      "First stack −3 Load (min 1); further stacks −1 each (min 1). Not for accessories.",
    loadMod: -1,
    stackableMax: 3,
    forbiddenProfileIds: ["accessory"],
  },
  {
    id: "attach",
    name: "Attach",
    types: ["C"],
    description:
      "Link items (Primary/Secondary) or a whole class at (2). May impose Unwieldy if Load exceeds.",
    stackableMax: 2,
  },
  {
    id: "hands-free",
    name: "Hands-Free",
    types: ["C"],
    description:
      "Use without holding; treated as Always Ready. One-handed weapons, shields, or Balanced Grip weapons.",
    compatibleSlots: ["melee-1h", "shield", "ranged-advanced"],
    forbiddenProfileIds: ["rifle", "shotgun", "two-handed", "bow", "crossbow"],
  },
  {
    id: "hidden-compartment",
    name: "Hidden Compartment",
    types: ["C"],
    description:
      "Secret storage (TN8 Notice / TN4 Thievery). Works with refillables such as poison.",
  },
  {
    id: "luxury",
    name: "Luxury",
    types: ["C"],
    description: "+2 Value; +1 Rep when Bartering. Great trade goods.",
    coinModFlat: 2,
  },
  {
    id: "enchanted",
    name: "Enchanted",
    types: ["C", "M"],
    description:
      "Imbue elemental damage and/or a Worldwaker/Stargazer power (Willpower cost). Stackable options.",
    stackableMax: 2,
  },
  {
    id: "memorable",
    name: "Memorable",
    types: ["NA"],
    description:
      "At session start, Refresh 1 Willpower (once per session). Talk with GM.",
  },
  {
    id: "legendary",
    name: "Legendary",
    types: ["Legendary", "NA"],
    description:
      "Special history; +20 Value. Pick a Legendary Trait (Unbreakable, Pristine, Alloyed, Powerful, …).",
  },

  // ── Accessory / consumable-style (soft) ───────────────────
  {
    id: "cathartic",
    name: "Cathartic",
    types: ["B"],
    description:
      "Recreational use with another Vagabond to refresh Willpower. Accessories (cards, cigars, etc.).",
    compatibleSlots: ["accessory"],
  },
  {
    id: "medicinal",
    name: "Medicinal",
    types: ["B"],
    description: "First Aid / wound treatment via Supply Wear. Medical kit accessories.",
    compatibleSlots: ["accessory"],
  },
  {
    id: "poison",
    name: "Poison",
    types: ["MI"],
    description:
      "Vessel poison effects; auto-gains Immoral; no Sturdy. Vials or ammunition accessories.",
    stackableMax: 4,
    compatibleSlots: ["accessory"],
  },
  {
    id: "invigorating",
    name: "Invigorating",
    types: ["MI"],
    description:
      "Mark Supply Wear to surge Willpower; crash afterward. Stim accessory.",
    stackableMax: 4,
    compatibleSlots: ["accessory"],
  },

  // ── Negative / Potent Negative ────────────────────────────
  {
    id: "small",
    name: "Small",
    types: ["N"],
    description: "Negative size tag. Enables Hidden; blocks Large / Lengthened / etc.",
  },
  {
    id: "weighty",
    name: "Weighty",
    types: ["N"],
    description: "Add +2 Load per stack. Not with Lightweight.",
    loadMod: 2,
    stackableMax: 2,
  },
  {
    id: "bulky",
    name: "Bulky",
    types: ["N"],
    description: "Bulk negative. Not with Hidden.",
  },
  {
    id: "conspicuous",
    name: "Conspicuous",
    types: ["N"],
    description: "Hard to hide / draws attention.",
  },
  {
    id: "cumbersome",
    name: "Cumbersome",
    types: ["PN"],
    description:
      "Encumbered while worn/wielded. Not with Fast. Counts as potent negative.",
  },
  {
    id: "complex",
    name: "Complex",
    types: ["PN"],
    description: "Not with Common or Simple.",
  },
  {
    id: "dangerous",
    name: "Dangerous",
    types: ["N"],
    description: "Become Drained on Crit-Fail with this weapon.",
    compatibleSlots: WEAPON,
  },
  {
    id: "fragile",
    name: "Fragile",
    types: ["PN"],
    description: "Sundering Soak destroys the item. Not with Durable.",
  },
  {
    id: "hard-to-hold",
    name: "Hard to Hold",
    types: ["N"],
    description: "Not with Always Ready or Hands-Free.",
    compatibleSlots: [...WEAPON, "accessory"],
  },
  {
    id: "immoral",
    name: "Immoral",
    types: ["N"],
    description: "Narrative/reputation negative. General use (*Any item).",
  },
  {
    id: "limited",
    name: "Limited",
    types: ["PN"],
    description: "Cannot be repaired; Broken becomes Destroyed. Not with Sturdy/Durable.",
  },
  {
    id: "noisy",
    name: "Noisy",
    types: ["PN"],
    description: "Hard to stay quiet. Not with Hidden.",
  },
  {
    id: "rare-parts",
    name: "Rare Parts",
    types: ["N"],
    description: "Not with Common or Simple.",
  },
  {
    id: "shoddy",
    name: "Shoddy",
    types: ["PN"],
    description: "Poor construction. Not with Sturdy or Durable.",
  },
  {
    id: "slow",
    name: "Slow",
    types: ["N"],
    description:
      "Two-handed, crossbow, rifle, blunderbuss, medium/heavy armor. Not with Fast.",
    compatibleSlots: [
      "melee-2h",
      "ranged-simple",
      "ranged-advanced",
      "armor-medium",
      "armor-heavy",
    ],
    forbiddenProfileIds: ["bow", "sling", "pistol"],
  },
  {
    id: "ugly",
    name: "Ugly",
    types: ["N"],
    description: "−2 Persuasion while displayed.",
  },
  {
    id: "unwieldy-1h",
    name: "Unwieldy (when one-handed)",
    types: ["N"],
    description: "Inherent on many two-handed profiles.",
    inherent: true,
  },
  {
    id: "unwieldy",
    name: "Unwieldy",
    types: ["N"],
    description: "−2 to Action Rolls when this weapon is used.",
    compatibleSlots: WEAPON,
  },
  {
    id: "wicked",
    name: "Wicked",
    types: ["N"],
    description: "Nasty reputation on weapons.",
    compatibleSlots: WEAPON,
  },
  {
    id: "unstable",
    name: "Unstable",
    types: ["PN"],
    description:
      "Potent negative. Magical broken items often gain this; Wurmshell comes with it.",
  },
  {
    id: "cursed",
    name: "Cursed",
    types: ["PN", "NA"],
    description:
      "Allied NPCs take Morale Damage; GM Fate may force worse reroll.",
  },
  {
    id: "hated",
    name: "Hated",
    types: ["N", "NA"],
    description: "−2 Persuasion vs hated Pillars/Powers while displayed.",
    stackableMax: 3,
  },
  {
    id: "identifiable",
    name: "Identifiable",
    types: ["N", "NA"],
    description: "Known association with a person or group.",
    stackableMax: 3,
  },
  {
    id: "reload",
    name: "Reload",
    types: ["N"],
    description: "Reload penalty. Inherent on firearms and crossbows.",
    inherent: true,
    compatibleSlots: RANGED,
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
