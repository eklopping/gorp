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

export type ItemProfile = {
  id: string;
  name: string;
  category: string;
  startingWear: number;
  coin: number;
  loadMod: number;
  notes: string;
  inherentTags?: string[];
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
  appliesTo?: string;
  custom?: boolean;
};

export type SelectedTag = {
  tagId: string;
  stacks: number;
};

export type CalculatorMode = "market" | "tinker";
