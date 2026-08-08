export type TagType =
  | "B"
  | "I"
  | "MI"
  | "C"
  | "M"
  | "N"
  | "PN"
  | "NA"
  | "Legendary"
  | "Unique";

/** Soft slots used to match tags to item profiles. */
export type ItemSlot =
  | "melee-1h"
  | "melee-2h"
  | "ranged-simple"
  | "ranged-advanced"
  | "armor-light"
  | "armor-medium"
  | "armor-heavy"
  | "shield"
  | "accessory"
  | "clothing";

export type ItemProfile = {
  id: string;
  name: string;
  category: string;
  slots: ItemSlot[];
  startingWear: number;
  coin: number;
  loadMod: number;
  notes: string;
  inherentTags?: string[];
  /** Tags that cannot be taken on this profile (SRR soft locks). */
  forbiddenTagIds?: string[];
  maxWear?: number;
  minLoad?: number;
  freeStartingTags?: number;
};

export type TagDefinition = {
  id: string;
  name: string;
  types: TagType[];
  description: string;
  stackableMax?: number;
  loadMod?: number;
  wearMod?: number;
  coinModFlat?: number;
  inherent?: boolean;
  refillable?: boolean;
  /**
   * If set, tag only appears for profiles that share at least one slot.
   * If omitted, tag is treated as generally compatible.
   */
  compatibleSlots?: ItemSlot[];
  /** Profile ids this tag can never be added to. */
  forbiddenProfileIds?: string[];
  /** Profile must already include these inherent tags (e.g. reload). */
  requiresInherent?: string[];
  custom?: boolean;
};

export type SelectedTag = {
  tagId: string;
  stacks: number;
};

export type CalculatorMode = "market" | "tinker";
