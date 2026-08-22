/** Savage Root Rules Vol.2 — Travel & Clearings reference data. */

export type DestinationLength = "short" | "medium" | "long" | "journey" | "roaming";
export type TravelStyle = "paced" | "rushed" | "cautious" | "recoup" | "sponsored";
export type Season = "spring" | "summer" | "fall" | "winter";
export type Terrain =
  | "coldlands"
  | "wetlands"
  | "forest"
  | "desert"
  | "plains"
  | "mountains"
  | "seas"
  | "places";
export type WeatherKind = "wind" | "rain" | "extremeTemp";

export type DestinationInfo = {
  id: DestinationLength;
  label: string;
  days: string;
  sequences: number | null;
  fixedEncounters: number | null;
  finalEncounters: number;
  notes: string;
};

export type TravelStyleInfo = {
  id: TravelStyle;
  label: string;
  summary: string;
  chanceEncounterDelta: number;
  attritionBonus: number;
  drainPerMember: number;
  travelDiceBonus: number;
  travelDiceMultiplier: number;
  sponsored: boolean;
};

export type TerrainInfo = {
  id: Terrain;
  label: string;
  resourceGainLimit: number;
  baseAttrition: number;
  vehicleLimits: string;
  weatherCaps: Record<WeatherKind, number>;
  scenarioOccurrence: number;
};

export type SeasonInfo = {
  id: Season;
  label: string;
  resourceLimitModifier: number;
  /** Additive to terrain base attrition for listed terrains. */
  terrainAttritionMods: Partial<Record<Terrain, number>>;
};

export type TransportKind = "beast" | "vehicle";

export type TransportInfo = {
  id: string;
  kind: TransportKind;
  label: string;
  coinMin: number;
  coinMax: number;
  wounds?: number;
  wear?: number;
  pace?: string;
  size: number;
  parry: number;
  toughness: string;
  carryLoad: number;
  passengerLimit: number;
  resourceCapacity: number;
  maxDrivingBugs?: number;
  drainDie: string;
  bonusTravelDice: string;
  traits: string[];
};

export type TravelArchetypeInfo = {
  id: string;
  label: string;
  limit: number | null;
  skill: string;
  summary: string;
  usesTravelDie: boolean;
};

export const DESTINATIONS: DestinationInfo[] = [
  {
    id: "short",
    label: "Short",
    days: "~1–7 days",
    sequences: 2,
    fixedEncounters: 0,
    finalEncounters: 1,
    notes: "Typically a week or less to your destination.",
  },
  {
    id: "medium",
    label: "Medium",
    days: "~8–14 days",
    sequences: 5,
    fixedEncounters: 2,
    finalEncounters: 1,
    notes: "Around a week to a fortnight; includes starting set encounters.",
  },
  {
    id: "long",
    label: "Long",
    days: "~15–30 days",
    sequences: 8,
    fixedEncounters: 3,
    finalEncounters: 1,
    notes: "Over a fortnight to a month.",
  },
  {
    id: "journey",
    label: "Journey",
    days: "Beyond a month",
    sequences: null,
    fixedEncounters: null,
    finalEncounters: 1,
    notes: "Treat as a combination of shorter destination lengths.",
  },
  {
    id: "roaming",
    label: "Roaming",
    days: "GM clock",
    sequences: null,
    fixedEncounters: null,
    finalEncounters: 1,
    notes: "GM sets a clock with stipulations to achieve the goal.",
  },
];

export const TRAVEL_STYLES: TravelStyleInfo[] = [
  {
    id: "paced",
    label: "Paced",
    summary: "Standard travel.",
    chanceEncounterDelta: 0,
    attritionBonus: 0,
    drainPerMember: 0,
    travelDiceBonus: 0,
    travelDiceMultiplier: 1,
    sponsored: false,
  },
  {
    id: "rushed",
    label: "Rushed",
    summary: "Remove one Chance Encounter; +1 Attrition for all PCs and BoBs.",
    chanceEncounterDelta: -1,
    attritionBonus: 1,
    drainPerMember: 0,
    travelDiceBonus: 0,
    travelDiceMultiplier: 1,
    sponsored: false,
  },
  {
    id: "cautious",
    label: "Cautious",
    summary: "+2 to Travel Dice; +1 Drain per group member.",
    chanceEncounterDelta: 0,
    attritionBonus: 0,
    drainPerMember: 1,
    travelDiceBonus: 2,
    travelDiceMultiplier: 1,
    sponsored: false,
  },
  {
    id: "recoup",
    label: "Recoup",
    summary:
      "Double Travel Dice values; +1 Chance Encounter; next weather roll treated as Clear Skies.",
    chanceEncounterDelta: 1,
    attritionBonus: 0,
    drainPerMember: 0,
    travelDiceBonus: 0,
    travelDiceMultiplier: 2,
    sponsored: false,
  },
  {
    id: "sponsored",
    label: "Sponsored",
    summary:
      "No Drain or Attrition from travel itself (encounters may still apply). Steep Coin cost.",
    chanceEncounterDelta: 0,
    attritionBonus: 0,
    drainPerMember: 0,
    travelDiceBonus: 0,
    travelDiceMultiplier: 1,
    sponsored: true,
  },
];

export const SEASONS: SeasonInfo[] = [
  {
    id: "spring",
    label: "Spring",
    resourceLimitModifier: 10,
    terrainAttritionMods: {},
  },
  {
    id: "summer",
    label: "Summer",
    resourceLimitModifier: 5,
    terrainAttritionMods: {
      coldlands: -1,
      mountains: -1,
      wetlands: 1,
      desert: 1,
    },
  },
  {
    id: "fall",
    label: "Fall",
    resourceLimitModifier: -5,
    terrainAttritionMods: { seas: 1 },
  },
  {
    id: "winter",
    label: "Winter",
    resourceLimitModifier: -10,
    terrainAttritionMods: {
      coldlands: 1,
      wetlands: 1,
      mountains: 1,
      seas: 1,
      desert: -1,
    },
  },
];

export const TERRAINS: TerrainInfo[] = [
  {
    id: "coldlands",
    label: "Coldlands",
    resourceGainLimit: 10,
    baseAttrition: 1,
    vehicleLimits: "Land",
    weatherCaps: { wind: 3, rain: 3, extremeTemp: 2 },
    scenarioOccurrence: 2,
  },
  {
    id: "wetlands",
    label: "Wetlands",
    resourceGainLimit: 30,
    baseAttrition: 0,
    vehicleLimits: "Only Beast & Boats",
    weatherCaps: { wind: 1, rain: 4, extremeTemp: 2 },
    scenarioOccurrence: 2,
  },
  {
    id: "forest",
    label: "Forest",
    resourceGainLimit: 50,
    baseAttrition: 0,
    vehicleLimits: "Land",
    weatherCaps: { wind: 1, rain: 3, extremeTemp: 2 },
    scenarioOccurrence: 3,
  },
  {
    id: "desert",
    label: "Desert",
    resourceGainLimit: 15,
    baseAttrition: 1,
    vehicleLimits: "Land",
    weatherCaps: { wind: 2, rain: 1, extremeTemp: 4 },
    scenarioOccurrence: 2,
  },
  {
    id: "plains",
    label: "Plains",
    resourceGainLimit: 40,
    baseAttrition: 0,
    vehicleLimits: "Land",
    weatherCaps: { wind: 3, rain: 2, extremeTemp: 1 },
    scenarioOccurrence: 3,
  },
  {
    id: "mountains",
    label: "Mountains",
    resourceGainLimit: 10,
    baseAttrition: 1,
    vehicleLimits: "Only Beast",
    weatherCaps: { wind: 2, rain: 3, extremeTemp: 3 },
    scenarioOccurrence: 1,
  },
  {
    id: "seas",
    label: "Seas",
    resourceGainLimit: 99,
    baseAttrition: 0,
    vehicleLimits: "Water",
    weatherCaps: { wind: 3, rain: 3, extremeTemp: 2 },
    scenarioOccurrence: 1,
  },
  {
    id: "places",
    label: "Places",
    resourceGainLimit: 20,
    baseAttrition: 0,
    vehicleLimits: "Land",
    weatherCaps: { wind: 1, rain: 1, extremeTemp: 1 },
    scenarioOccurrence: 6,
  },
];

/** Season weather intensity caps override base terrain caps (Vol.2 season table). */
export const SEASON_WEATHER_CAPS: Record<
  Season,
  Record<Terrain, Record<WeatherKind, number>>
> = {
  spring: {
    coldlands: { wind: 3, rain: 3, extremeTemp: 2 },
    wetlands: { wind: 2, rain: 3, extremeTemp: 2 },
    forest: { wind: 1, rain: 2, extremeTemp: 2 },
    desert: { wind: 3, rain: 2, extremeTemp: 3 },
    plains: { wind: 3, rain: 2, extremeTemp: 2 },
    mountains: { wind: 2, rain: 3, extremeTemp: 3 },
    seas: { wind: 2, rain: 3, extremeTemp: 2 },
    places: { wind: 1, rain: 1, extremeTemp: 1 },
  },
  summer: {
    coldlands: { wind: 2, rain: 2, extremeTemp: 2 },
    wetlands: { wind: 1, rain: 4, extremeTemp: 3 },
    forest: { wind: 1, rain: 3, extremeTemp: 3 },
    desert: { wind: 2, rain: 2, extremeTemp: 4 },
    plains: { wind: 3, rain: 4, extremeTemp: 4 },
    mountains: { wind: 2, rain: 4, extremeTemp: 3 },
    seas: { wind: 2, rain: 4, extremeTemp: 3 },
    places: { wind: 1, rain: 1, extremeTemp: 1 },
  },
  fall: {
    coldlands: { wind: 3, rain: 4, extremeTemp: 3 },
    wetlands: { wind: 2, rain: 4, extremeTemp: 2 },
    forest: { wind: 2, rain: 3, extremeTemp: 2 },
    desert: { wind: 3, rain: 3, extremeTemp: 2 },
    plains: { wind: 4, rain: 4, extremeTemp: 3 },
    mountains: { wind: 3, rain: 4, extremeTemp: 3 },
    seas: { wind: 3, rain: 4, extremeTemp: 3 },
    places: { wind: 1, rain: 1, extremeTemp: 1 },
  },
  winter: {
    coldlands: { wind: 3, rain: 4, extremeTemp: 4 },
    wetlands: { wind: 1, rain: 4, extremeTemp: 3 },
    forest: { wind: 1, rain: 3, extremeTemp: 3 },
    desert: { wind: 2, rain: 2, extremeTemp: 2 },
    plains: { wind: 3, rain: 4, extremeTemp: 4 },
    mountains: { wind: 2, rain: 4, extremeTemp: 4 },
    seas: { wind: 3, rain: 4, extremeTemp: 3 },
    places: { wind: 1, rain: 1, extremeTemp: 1 },
  },
};

export const TRANSPORTS: TransportInfo[] = [
  {
    id: "hauler-bug",
    kind: "beast",
    label: "Hauler Bug",
    coinMin: 4,
    coinMax: 7,
    wounds: 6,
    pace: "1 Zone",
    size: 2,
    parry: 3,
    toughness: "12 (2A)",
    carryLoad: 40,
    passengerLimit: 2,
    resourceCapacity: 80,
    drainDie: "d6",
    bonusTravelDice: "1d8",
    traits: ["Lumbering — cannot use Rushed"],
  },
  {
    id: "riding-bug",
    kind: "beast",
    label: "Riding Bug",
    coinMin: 18,
    coinMax: 25,
    wounds: 4,
    pace: "2 Zones",
    size: 2,
    parry: 5,
    toughness: "8 (2A)",
    carryLoad: 20,
    passengerLimit: 1,
    resourceCapacity: 40,
    drainDie: "d6",
    bonusTravelDice: "1d6",
    traits: [
      "Fast Traveler — Travel Length one step lower if every member rides Fast Traveler or Pace 2 Zones",
    ],
  },
  {
    id: "basic-cart",
    kind: "vehicle",
    label: "Basic Cart",
    coinMin: 3,
    coinMax: 6,
    wear: 5,
    size: 2,
    parry: 2,
    toughness: "6 (6A)",
    carryLoad: 80,
    passengerLimit: 2,
    resourceCapacity: 150,
    maxDrivingBugs: 1,
    drainDie: "—",
    bonusTravelDice: "0",
    traits: ["Basic — cannot benefit from Fast Traveler"],
  },
  {
    id: "heavy-cart",
    kind: "vehicle",
    label: "Heavy Cart",
    coinMin: 12,
    coinMax: 20,
    wear: 15,
    size: 3,
    parry: 0,
    toughness: "10 (10A)",
    carryLoad: 150,
    passengerLimit: 2,
    resourceCapacity: 290,
    maxDrivingBugs: 2,
    drainDie: "—",
    bonusTravelDice: "1d8",
    traits: ["Heavy — only Hauler Bugs"],
  },
  {
    id: "uncovered-wagon",
    kind: "vehicle",
    label: "Uncovered Wagon",
    coinMin: 25,
    coinMax: 30,
    wear: 10,
    size: 3,
    parry: 0,
    toughness: "8 (8A)",
    carryLoad: 120,
    passengerLimit: 6,
    resourceCapacity: 230,
    maxDrivingBugs: 2,
    drainDie: "—",
    bonusTravelDice: "1d10",
    traits: ["Distance Designed — can benefit from Fast Traveler"],
  },
  {
    id: "covered-wagon",
    kind: "vehicle",
    label: "Covered Wagon",
    coinMin: 45,
    coinMax: 60,
    wear: 10,
    size: 3,
    parry: 0,
    toughness: "8 (8A)",
    carryLoad: 110,
    passengerLimit: 6,
    resourceCapacity: 210,
    maxDrivingBugs: 2,
    drainDie: "—",
    bonusTravelDice: "2d10",
    traits: ["Distance Designed — can benefit from Fast Traveler"],
  },
];

export const TRAVEL_ARCHETYPES: TravelArchetypeInfo[] = [
  {
    id: "leader",
    label: "Leader",
    limit: 1,
    skill: "Tactics",
    summary:
      "Roll Travel Die ÷ 2 (round up): that many group members remove an Attrition.",
    usesTravelDie: true,
  },
  {
    id: "trailblazer",
    label: "Trailblazer",
    limit: 1,
    skill: "Notice",
    summary:
      "If ≥ Encounter roll (d20), ignore the encounter; may also set weather to Clear Skies.",
    usesTravelDie: true,
  },
  {
    id: "hunter-gather",
    label: "Hunter/Gather",
    limit: 2,
    skill: "Survival",
    summary: "Gain Resource equal to the Travel Die roll.",
    usesTravelDie: true,
  },
  {
    id: "helmsman",
    label: "Helmsman",
    limit: 1,
    skill: "Piloting",
    summary:
      "Vehicle only. If total > remaining encounters, reduce Chance Encounters by 1.",
    usesTravelDie: true,
  },
  {
    id: "quartermaster",
    label: "Quartermaster",
    limit: 1,
    skill: "Repair",
    summary:
      "Repair that much Wear; spend half the repaired Wear in Resource.",
    usesTravelDie: true,
  },
  {
    id: "cook",
    label: "Cook",
    limit: 1,
    skill: "Survival",
    summary:
      "Roll ÷ 2 (round up): that many members gain an extra Travel Die; spend 2× Resource per die gained.",
    usesTravelDie: true,
  },
  {
    id: "crew",
    label: "Crew",
    limit: null,
    skill: "—",
    summary:
      "Assist (+1/+2), Recovery (heal / spend die to drop Wound or Attrition), or Repair (2 Wear for 1R).",
    usesTravelDie: false,
  },
];

export const ATTRITION_OPTIONS = [
  "Fatigued",
  "Slowed",
  "Distracted",
  "Vulnerable",
  "Drained (1–5)",
] as const;

export const WEATHER_EFFECTS: Record<
  WeatherKind,
  { label: string; levels: string[] }
> = {
  wind: {
    label: "Wind",
    levels: [
      "Clear / none",
      "Notice −2, Stealth +2",
      "+ Attrition per PC each sequence",
      "+1d6 Drain; Notice −4, Stealth +4",
      "Unless Recoup: 4d4 dmg to PC & BoB; +3d6 Drain; 2 Attritions/PC",
    ],
  },
  rain: {
    label: "Rain",
    levels: [
      "Clear / none",
      "+1d6 Drain (Desert Summer: Cathartic tag)",
      "+ Attrition per PC each sequence",
      "+2d6 Drain",
      "+4d6 Drain; 2 Attritions/PC each sequence",
    ],
  },
  extremeTemp: {
    label: "Extreme Temp",
    levels: [
      "Clear / none",
      "1 Attrition/PC each sequence",
      "2 Attritions/PC each sequence",
      "BoBs +1 Drained; 3 Attritions/PC",
      "BoBs +1 Wound; 5 Attritions/PC",
    ],
  },
};
