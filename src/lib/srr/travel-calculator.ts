import {
  DESTINATIONS,
  SEASONS,
  SEASON_WEATHER_CAPS,
  TERRAINS,
  TRAVEL_STYLES,
  TRANSPORTS,
  type DestinationLength,
  type Season,
  type Terrain,
  type TravelStyle,
  type WeatherKind,
} from "@/data/srr/travel";

export type WeatherIntensities = Record<WeatherKind, number>;

export type TravelCalcInput = {
  pcCount: number;
  bobCount: number;
  destination: DestinationLength;
  style: TravelStyle;
  season: Season;
  terrain: Terrain;
  weather: WeatherIntensities;
  openTravel: boolean;
  halfOrMoreSlowed: boolean;
  /** Journey / roaming: override sequence count when known. */
  customSequences: number | null;
  sponsoredCoinCost: number;
  transportQty: Record<string, number>;
};

export type TravelCalcResult = {
  sequences: number | null;
  fixedEncounters: number | null;
  finalEncounters: number;
  chanceEncounterNote: string;
  terrainAttrition: number;
  styleAttrition: number;
  weatherAttritionPerPc: number;
  openTravelAttrition: number;
  estimatedAttritionPerPcPerSequence: number;
  drainDice: string;
  avgDrainDice: number;
  styleDrainFlat: number;
  weatherExtraDrainDice: string[];
  avgWeatherExtraDrain: number;
  slowedDrainPerPc: number;
  estimatedAvgDrainPerSequence: number;
  resourceGainCap: number;
  weatherCaps: Record<WeatherKind, number>;
  weatherClamped: WeatherIntensities;
  warnings: string[];
  transportLines: {
    id: string;
    label: string;
    qty: number;
    coinMin: number;
    coinMax: number;
    carryLoad: number;
    resourceCapacity: number;
    passengerLimit: number;
    bonusTravelDice: string;
  }[];
  transportCoinMin: number;
  transportCoinMax: number;
  transportCarryLoad: number;
  transportResourceCapacity: number;
  transportPassengers: number;
  sponsoredCoinCost: number;
};

const dieAvg: Record<string, number> = {
  d4: 2.5,
  d6: 3.5,
  d8: 4.5,
  d10: 5.5,
  d12: 6.5,
};

function avgForDie(label: string): number {
  const key = label.toLowerCase().replace(/^\d+/, "");
  return dieAvg[key] ?? 0;
}

function weatherAttrition(weather: WeatherIntensities): number {
  let n = 0;
  // Wind 2+: +1; Wind 4: +2 (replaces/stacks as "2 Attritions")
  if (weather.wind >= 4) n += 2;
  else if (weather.wind >= 2) n += 1;
  // Rain 2+: +1; Rain 4: +2
  if (weather.rain >= 4) n += 2;
  else if (weather.rain >= 2) n += 1;
  // Extreme temp: level = attrition count at 1–2; higher at 3–4
  if (weather.extremeTemp >= 4) n += 5;
  else if (weather.extremeTemp >= 3) n += 3;
  else if (weather.extremeTemp >= 2) n += 2;
  else if (weather.extremeTemp >= 1) n += 1;
  return n;
}

function weatherDrainDice(weather: WeatherIntensities): string[] {
  const dice: string[] = [];
  if (weather.wind >= 4) dice.push("3d6");
  else if (weather.wind >= 3) dice.push("1d6");
  if (weather.rain >= 4) dice.push("4d6");
  else if (weather.rain >= 3) dice.push("2d6");
  else if (weather.rain >= 1) dice.push("1d6");
  return dice;
}

function avgFromDiceList(list: string[]): number {
  let total = 0;
  for (const entry of list) {
    const m = entry.match(/^(\d*)d(\d+)$/i);
    if (!m) continue;
    const count = m[1] ? Number(m[1]) : 1;
    const faces = Number(m[2]);
    total += count * ((faces + 1) / 2);
  }
  return total;
}

export function clampWeather(
  season: Season,
  terrain: Terrain,
  weather: WeatherIntensities,
): WeatherIntensities {
  const caps = SEASON_WEATHER_CAPS[season][terrain];
  return {
    wind: Math.min(Math.max(0, weather.wind), caps.wind),
    rain: Math.min(Math.max(0, weather.rain), caps.rain),
    extremeTemp: Math.min(Math.max(0, weather.extremeTemp), caps.extremeTemp),
  };
}

export function calculateTravel(input: TravelCalcInput): TravelCalcResult {
  const dest = DESTINATIONS.find((d) => d.id === input.destination)!;
  const style = TRAVEL_STYLES.find((s) => s.id === input.style)!;
  const season = SEASONS.find((s) => s.id === input.season)!;
  const terrain = TERRAINS.find((t) => t.id === input.terrain)!;
  const weatherClamped = clampWeather(input.season, input.terrain, input.weather);
  const weatherCaps = SEASON_WEATHER_CAPS[input.season][input.terrain];

  const warnings: string[] = [];
  const pcs = Math.max(0, Math.floor(input.pcCount));
  const bobs = Math.max(0, Math.floor(input.bobCount));
  const members = pcs + bobs;

  let sequences = dest.sequences;
  if (
    (input.destination === "journey" || input.destination === "roaming") &&
    input.customSequences != null &&
    input.customSequences > 0
  ) {
    sequences = Math.floor(input.customSequences);
  }

  const seasonMod = season.terrainAttritionMods[input.terrain] ?? 0;
  const terrainAttrition = Math.max(0, terrain.baseAttrition + seasonMod);

  const styleAttrition = style.sponsored ? 0 : style.attritionBonus;
  const openTravelAttrition = input.openTravel ? 1 : 0;
  const weatherAttritionPerPc = style.sponsored
    ? 0
    : weatherAttrition(weatherClamped);

  const estimatedAttritionPerPcPerSequence = style.sponsored
    ? 0
    : terrainAttrition +
      styleAttrition +
      weatherAttritionPerPc +
      openTravelAttrition;

  const drainDiceParts: string[] = [];
  if (pcs > 0) drainDiceParts.push(`${pcs}d4 (PCs)`);
  if (bobs > 0) drainDiceParts.push(`${bobs}d6 (BoBs)`);
  const drainDice =
    drainDiceParts.length > 0 ? drainDiceParts.join(" + ") : "none";

  const avgDrainDice = pcs * avgForDie("d4") + bobs * avgForDie("d6");
  const styleDrainFlat = style.sponsored ? 0 : style.drainPerMember * members;
  const weatherExtraDrainDice = style.sponsored
    ? []
    : weatherDrainDice(weatherClamped);
  const avgWeatherExtraDrain = avgFromDiceList(weatherExtraDrainDice);
  const slowedDrainPerPc =
    !style.sponsored && input.halfOrMoreSlowed ? pcs * 1 : 0;

  const estimatedAvgDrainPerSequence = style.sponsored
    ? 0
    : avgDrainDice + styleDrainFlat + avgWeatherExtraDrain + slowedDrainPerPc;

  if (style.id === "rushed" && bobs > 0) {
    const haulers = input.transportQty["hauler-bug"] ?? 0;
    if (haulers > 0) {
      warnings.push(
        "Hauler Bugs are Lumbering and cannot use the Rushed travel style.",
      );
    }
  }

  if (input.openTravel) {
    warnings.push("Open Travel: gain Attrition after every Travel Sequence.");
  }

  if (input.halfOrMoreSlowed) {
    warnings.push(
      "Half or more of the group is Slowed: +1 Resource Drain per PC per day.",
    );
  }

  if (weatherClamped.wind >= 4 && style.id !== "recoup") {
    warnings.push(
      "Cataclysmic wind: unless Recoup, each PC & BoB takes 4d4 damage each sequence.",
    );
  }

  const chanceBits: string[] = [];
  if (style.chanceEncounterDelta < 0) {
    chanceBits.push(`style removes ${Math.abs(style.chanceEncounterDelta)} Chance Encounter`);
  } else if (style.chanceEncounterDelta > 0) {
    chanceBits.push(`style adds ${style.chanceEncounterDelta} Chance Encounter`);
  }
  if (chanceBits.length === 0) {
    chanceBits.push("Chance Encounters resolved per terrain tables");
  }

  const transportLines = TRANSPORTS.filter(
    (t) => (input.transportQty[t.id] ?? 0) > 0,
  ).map((t) => {
    const qty = input.transportQty[t.id] ?? 0;
    return {
      id: t.id,
      label: t.label,
      qty,
      coinMin: t.coinMin * qty,
      coinMax: t.coinMax * qty,
      carryLoad: t.carryLoad * qty,
      resourceCapacity: t.resourceCapacity * qty,
      passengerLimit: t.passengerLimit * qty,
      bonusTravelDice: t.bonusTravelDice,
    };
  });

  const transportCoinMin = transportLines.reduce((s, l) => s + l.coinMin, 0);
  const transportCoinMax = transportLines.reduce((s, l) => s + l.coinMax, 0);
  const transportCarryLoad = transportLines.reduce((s, l) => s + l.carryLoad, 0);
  const transportResourceCapacity = transportLines.reduce(
    (s, l) => s + l.resourceCapacity,
    0,
  );
  const transportPassengers = transportLines.reduce(
    (s, l) => s + l.passengerLimit,
    0,
  );

  const resourceGainCap = Math.max(
    0,
    terrain.resourceGainLimit + season.resourceLimitModifier,
  );

  return {
    sequences,
    fixedEncounters: dest.fixedEncounters,
    finalEncounters: dest.finalEncounters,
    chanceEncounterNote: chanceBits.join("; "),
    terrainAttrition,
    styleAttrition,
    weatherAttritionPerPc,
    openTravelAttrition,
    estimatedAttritionPerPcPerSequence,
    drainDice,
    avgDrainDice,
    styleDrainFlat,
    weatherExtraDrainDice,
    avgWeatherExtraDrain,
    slowedDrainPerPc,
    estimatedAvgDrainPerSequence,
    resourceGainCap,
    weatherCaps,
    weatherClamped,
    warnings,
    transportLines,
    transportCoinMin,
    transportCoinMax,
    transportCarryLoad,
    transportResourceCapacity,
    transportPassengers,
    sponsoredCoinCost: style.sponsored
      ? Math.max(0, input.sponsoredCoinCost)
      : 0,
  };
}

export function defaultTravelInput(): TravelCalcInput {
  return {
    pcCount: 4,
    bobCount: 0,
    destination: "medium",
    style: "paced",
    season: "spring",
    terrain: "plains",
    weather: { wind: 0, rain: 0, extremeTemp: 0 },
    openTravel: false,
    halfOrMoreSlowed: false,
    customSequences: null,
    sponsoredCoinCost: 0,
    transportQty: Object.fromEntries(TRANSPORTS.map((t) => [t.id, 0])),
  };
}
