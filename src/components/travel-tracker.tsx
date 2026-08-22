"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ATTRITION_OPTIONS,
  DESTINATIONS,
  SEASONS,
  TERRAINS,
  TRAVEL_ARCHETYPES,
  TRAVEL_STYLES,
  TRANSPORTS,
  WEATHER_EFFECTS,
  type DestinationLength,
  type Season,
  type Terrain,
  type TravelStyle,
  type WeatherKind,
} from "@/data/srr/travel";
import {
  calculateTravel,
  defaultTravelInput,
  type TravelCalcInput,
} from "@/lib/srr/travel-calculator";

const STORAGE_KEY = "gorp-srr-travel";

const WEATHER_KEYS: WeatherKind[] = ["wind", "rain", "extremeTemp"];

function loadSaved(): TravelCalcInput | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...defaultTravelInput(), ...JSON.parse(raw) } as TravelCalcInput;
  } catch {
    return null;
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper-deep/35 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </p>
      <p className="mt-0.5 font-[family-name:var(--font-display)] text-xl leading-tight">
        {value}
      </p>
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      data-active={active}
      onClick={onClick}
      className="rounded-md border border-line bg-paper-deep/40 px-2.5 py-1 text-[11px] font-medium text-ink transition data-[active=true]:border-accent data-[active=true]:bg-accent data-[active=true]:text-paper"
    >
      {children}
    </button>
  );
}

function NumberField({
  label,
  value,
  min = 0,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isNaN(n)) return;
          let next = n;
          if (min != null) next = Math.max(min, next);
          if (max != null) next = Math.min(max, next);
          onChange(next);
        }}
        className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}

export function TravelTracker() {
  const [input, setInput] = useState<TravelCalcInput>(defaultTravelInput);
  const [hydrated, setHydrated] = useState(false);
  const [completedSequences, setCompletedSequences] = useState(0);
  const [partyNotes, setPartyNotes] = useState("");

  useEffect(() => {
    const saved = loadSaved();
    if (saved) setInput(saved);
    try {
      const seq = localStorage.getItem(`${STORAGE_KEY}-seq`);
      if (seq) setCompletedSequences(Number(seq) || 0);
      const notes = localStorage.getItem(`${STORAGE_KEY}-notes`);
      if (notes) setPartyNotes(notes);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
      localStorage.setItem(`${STORAGE_KEY}-seq`, String(completedSequences));
      localStorage.setItem(`${STORAGE_KEY}-notes`, partyNotes);
    } catch {
      /* ignore */
    }
  }, [input, completedSequences, partyNotes, hydrated]);

  const result = useMemo(() => calculateTravel(input), [input]);

  const patch = (partial: Partial<TravelCalcInput>) =>
    setInput((prev) => ({ ...prev, ...partial }));

  const setWeather = (kind: WeatherKind, level: number) => {
    const capped = Math.min(level, result.weatherCaps[kind]);
    patch({
      weather: { ...input.weather, [kind]: capped },
    });
  };

  const setTransportQty = (id: string, qty: number) => {
    patch({
      transportQty: {
        ...input.transportQty,
        [id]: Math.max(0, Math.floor(qty)),
      },
    });
  };

  const sequenceTotal = result.sequences;
  const progressPct =
    sequenceTotal && sequenceTotal > 0
      ? Math.min(100, Math.round((completedSequences / sequenceTotal) * 100))
      : null;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-line bg-paper/70 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Travel tracker
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Vol.2 Travel Sequence: Destination → Style → Encounter → Drain &
            Attrition.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <NumberField
              label="PCs in group"
              value={input.pcCount}
              min={0}
              max={20}
              onChange={(pcCount) => patch({ pcCount })}
            />
            <NumberField
              label="Beasts of Burden"
              value={input.bobCount}
              min={0}
              max={20}
              onChange={(bobCount) => patch({ bobCount })}
            />
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">
              Destination length
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DESTINATIONS.map((d) => (
                <ChipButton
                  key={d.id}
                  active={input.destination === d.id}
                  title={`${d.days} · ${d.notes}`}
                  onClick={() =>
                    patch({ destination: d.id as DestinationLength })
                  }
                >
                  {d.label}
                </ChipButton>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              {
                DESTINATIONS.find((d) => d.id === input.destination)?.days
              }{" "}
              ·{" "}
              {
                DESTINATIONS.find((d) => d.id === input.destination)?.notes
              }
            </p>
            {(input.destination === "journey" ||
              input.destination === "roaming") && (
              <div className="mt-3 max-w-xs">
                <NumberField
                  label="Custom sequences (optional)"
                  value={input.customSequences ?? 0}
                  min={0}
                  max={40}
                  onChange={(n) =>
                    patch({ customSequences: n > 0 ? n : null })
                  }
                />
              </div>
            )}
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">
              Travel style
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TRAVEL_STYLES.map((s) => (
                <ChipButton
                  key={s.id}
                  active={input.style === s.id}
                  title={s.summary}
                  onClick={() => patch({ style: s.id as TravelStyle })}
                >
                  {s.label}
                </ChipButton>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              {TRAVEL_STYLES.find((s) => s.id === input.style)?.summary}
            </p>
            {input.style === "sponsored" ? (
              <div className="mt-3 max-w-xs">
                <NumberField
                  label="Sponsored coin cost"
                  value={input.sponsoredCoinCost}
                  min={0}
                  onChange={(sponsoredCoinCost) =>
                    patch({ sponsoredCoinCost })
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">
                Season
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SEASONS.map((s) => (
                  <ChipButton
                    key={s.id}
                    active={input.season === s.id}
                    onClick={() => patch({ season: s.id as Season })}
                  >
                    {s.label}
                  </ChipButton>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">
                Terrain
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TERRAINS.map((t) => (
                  <ChipButton
                    key={t.id}
                    active={input.terrain === t.id}
                    title={`Resource gain limit ${t.resourceGainLimit} · Base attrition ${t.baseAttrition} · ${t.vehicleLimits}`}
                    onClick={() => patch({ terrain: t.id as Terrain })}
                  >
                    {t.label}
                  </ChipButton>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">
              Weather intensity (capped by season + terrain)
            </p>
            {WEATHER_KEYS.map((kind) => {
              const meta = WEATHER_EFFECTS[kind];
              const cap = result.weatherCaps[kind];
              const level = result.weatherClamped[kind];
              return (
                <div key={kind}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{meta.label}</span>
                    <span className="text-xs text-ink-soft">
                      Cap {cap} · now {level}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Array.from({ length: cap + 1 }, (_, i) => (
                      <ChipButton
                        key={i}
                        active={level === i}
                        title={meta.levels[i] ?? `Intensity ${i}`}
                        onClick={() => setWeather(kind, i)}
                      >
                        {i}
                      </ChipButton>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {meta.levels[level] ?? "—"}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={input.openTravel}
                onChange={(e) => patch({ openTravel: e.target.checked })}
                className="accent-[var(--accent)]"
              />
              Open Travel (+1 Attrition / sequence)
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={input.halfOrMoreSlowed}
                onChange={(e) =>
                  patch({ halfOrMoreSlowed: e.target.checked })
                }
                className="accent-[var(--accent)]"
              />
              Half+ Slowed (+1 Drain / PC / day)
            </label>
          </div>

          {sequenceTotal != null ? (
            <div className="mt-6 rounded-xl border border-line bg-paper-deep/30 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">
                    Sequence progress
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                    {completedSequences} / {sequenceTotal}
                    {progressPct != null ? (
                      <span className="ml-2 text-base text-ink-soft">
                        ({progressPct}%)
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent"
                    onClick={() =>
                      setCompletedSequences((n) => Math.max(0, n - 1))
                    }
                  >
                    − Sequence
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-paper hover:bg-accent-deep"
                    onClick={() =>
                      setCompletedSequences((n) =>
                        Math.min(sequenceTotal, n + 1),
                      )
                    }
                  >
                    + Sequence
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent"
                    onClick={() => setCompletedSequences(0)}
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-deep">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${progressPct ?? 0}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Array.from({ length: sequenceTotal }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    title={`Sequence ${i + 1}`}
                    onClick={() => setCompletedSequences(i + 1)}
                    className={`h-7 w-7 rounded-md text-xs font-medium ${
                      i < completedSequences
                        ? "bg-accent text-paper"
                        : "border border-line bg-paper/80 text-ink-soft"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-ink-soft">
              Set a custom sequence count for Journey / Roaming to track
              progress.
            </p>
          )}

          <label className="mt-5 block text-sm">
            <span className="text-xs uppercase tracking-[0.12em] text-ink-soft">
              Party / attrition notes
            </span>
            <textarea
              value={partyNotes}
              onChange={(e) => setPartyNotes(e.target.value)}
              rows={3}
              placeholder="Who is Fatigued, Slowed, Drained… Crew Recovery plans…"
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <p className="mt-2 text-xs text-ink-soft">
            Attrition picks (once each, except Drained):{" "}
            {ATTRITION_OPTIONS.join(" · ")}
          </p>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-line bg-paper/70 p-5">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Costs & drain
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Estimated averages for planning — roll dice at the table for
              real Drain.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat
                label="Sequences"
                value={
                  result.sequences != null ? String(result.sequences) : "—"
                }
              />
              <Stat
                label="Set + final"
                value={
                  result.fixedEncounters != null
                    ? `${result.fixedEncounters} + ${result.finalEncounters}`
                    : `? + ${result.finalEncounters}`
                }
              />
              <Stat
                label="Attrition / PC / seq"
                value={`~${result.estimatedAttritionPerPcPerSequence}`}
              />
              <Stat
                label="Avg Drain / seq"
                value={
                  input.style === "sponsored"
                    ? "0*"
                    : `~${result.estimatedAvgDrainPerSequence.toFixed(1)}`
                }
              />
              <Stat
                label="Resource gain cap"
                value={`${result.resourceGainCap}/seq`}
              />
              <Stat
                label="Sponsored coin"
                value={
                  result.sponsoredCoinCost > 0
                    ? `${result.sponsoredCoinCost}c`
                    : "—"
                }
              />
            </div>

            <ul className="mt-4 space-y-1.5 text-sm">
              <li className="flex justify-between gap-3 border-b border-line/60 py-1">
                <span>Base Drain dice</span>
                <span className="text-ink-soft">{result.drainDice}</span>
              </li>
              <li className="flex justify-between gap-3 border-b border-line/60 py-1">
                <span>Avg dice Drain</span>
                <span className="text-ink-soft">
                  ~{result.avgDrainDice.toFixed(1)}
                </span>
              </li>
              {result.styleDrainFlat > 0 ? (
                <li className="flex justify-between gap-3 border-b border-line/60 py-1">
                  <span>Cautious flat Drain</span>
                  <span className="text-ink-soft">
                    +{result.styleDrainFlat}
                  </span>
                </li>
              ) : null}
              {result.weatherExtraDrainDice.length > 0 ? (
                <li className="flex justify-between gap-3 border-b border-line/60 py-1">
                  <span>Weather Drain</span>
                  <span className="text-ink-soft">
                    {result.weatherExtraDrainDice.join(" + ")} (~
                    {result.avgWeatherExtraDrain.toFixed(1)})
                  </span>
                </li>
              ) : null}
              {result.slowedDrainPerPc > 0 ? (
                <li className="flex justify-between gap-3 border-b border-line/60 py-1">
                  <span>Slowed Drain</span>
                  <span className="text-ink-soft">
                    +{result.slowedDrainPerPc}
                  </span>
                </li>
              ) : null}
              <li className="flex justify-between gap-3 border-b border-line/60 py-1">
                <span>Chance encounters</span>
                <span className="max-w-[55%] text-right text-ink-soft">
                  {result.chanceEncounterNote}
                </span>
              </li>
              <li className="flex justify-between gap-3 border-b border-line/60 py-1">
                <span>Terrain attrition</span>
                <span className="text-ink-soft">
                  {result.terrainAttrition}
                  {result.styleAttrition
                    ? ` + style ${result.styleAttrition}`
                    : ""}
                  {result.weatherAttritionPerPc
                    ? ` + weather ${result.weatherAttritionPerPc}`
                    : ""}
                  {result.openTravelAttrition
                    ? ` + open ${result.openTravelAttrition}`
                    : ""}
                </span>
              </li>
            </ul>

            {input.style === "sponsored" ? (
              <p className="mt-3 text-xs text-ink-soft">
                * Sponsored travel skips travel Drain/Attrition; encounters may
                still apply.
              </p>
            ) : null}

            {result.warnings.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-warn">
                {result.warnings.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            ) : null}

            {result.sequences != null && result.sequences > 0 ? (
              <p className="mt-4 text-xs text-ink-soft">
                Rough trip total Drain (avg × sequences): ~
                {(
                  result.estimatedAvgDrainPerSequence * result.sequences
                ).toFixed(0)}{" "}
                Resource / Wear / WP to resolve across the group.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-line bg-paper/70 p-5">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Transport costs
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Beasts & vehicles — coin ranges, load, and bonus Travel Dice
              (Vol.2).
            </p>

            <ul className="mt-4 space-y-3">
              {TRANSPORTS.map((t) => {
                const qty = input.transportQty[t.id] ?? 0;
                return (
                  <li
                    key={t.id}
                    className="rounded-xl border border-line/70 bg-paper-deep/25 px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-xs text-ink-soft">
                          {t.coinMin}–{t.coinMax}c · Load {t.carryLoad} · Res{" "}
                          {t.resourceCapacity} · Pax {t.passengerLimit}
                          {t.bonusTravelDice !== "0"
                            ? ` · Bonus ${t.bonusTravelDice}`
                            : ""}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-soft">
                          {t.traits.join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="h-7 w-7 rounded-md border border-line text-sm hover:border-accent"
                          onClick={() => setTransportQty(t.id, qty - 1)}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-medium">
                          {qty}
                        </span>
                        <button
                          type="button"
                          className="h-7 w-7 rounded-md border border-line text-sm hover:border-accent"
                          onClick={() => setTransportQty(t.id, qty + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat
                label="Fleet coin"
                value={
                  result.transportCoinMin > 0
                    ? `${result.transportCoinMin}–${result.transportCoinMax}c`
                    : "—"
                }
              />
              <Stat
                label="Carry load"
                value={
                  result.transportCarryLoad > 0
                    ? String(result.transportCarryLoad)
                    : "—"
                }
              />
              <Stat
                label="Resource capacity"
                value={
                  result.transportResourceCapacity > 0
                    ? String(result.transportResourceCapacity)
                    : "—"
                }
              />
              <Stat
                label="Passenger seats"
                value={
                  result.transportPassengers > 0
                    ? String(result.transportPassengers)
                    : "—"
                }
              />
            </div>
            {result.transportLines.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-ink-soft">
                {result.transportLines.map((l) => (
                  <li key={l.id}>
                    {l.qty}× {l.label}: {l.coinMin}–{l.coinMax}c
                    {l.bonusTravelDice !== "0"
                      ? ` · ${l.bonusTravelDice} each`
                      : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-paper/70 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">
          Travel archetypes
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Travel Dice = Character Tier (+ talents / mounts / vehicles). Spend 2
          WP before rolling for max skill die. Archetypes lock until Recoup.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRAVEL_ARCHETYPES.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-line bg-paper-deep/30 px-3 py-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium">{a.label}</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                  {a.limit == null ? "∞" : `Limit ${a.limit}`}
                  {a.usesTravelDie ? " · die" : ""}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-ink-soft">{a.skill}</p>
              <p className="mt-2 text-sm leading-snug">{a.summary}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
