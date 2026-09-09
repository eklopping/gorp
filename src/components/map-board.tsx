"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMapMarkerAction,
  placeMapMarkerAction,
} from "@/lib/entity-actions";
import { uploadUrl } from "@/lib/upload-url";

type EntityOption = {
  id: string;
  name: string;
  type: "person" | "place";
  role: string;
  allegiance: string;
  description: string;
  imagePath: string | null;
};

type SessionOption = {
  id: string;
  title: string;
  sessionDate: string | null;
};

type Marker = {
  id: string;
  entityId: string;
  gameSessionId: string | null;
  xPercent: number;
  yPercent: number;
  note: string;
  entityName: string;
  entityType: "person" | "place";
  entityRole: string;
  entityAllegiance: string;
  entityDescription: string;
  entityImagePath: string | null;
  sessionTitle: string | null;
  sessionDate: string | null;
};

type PinState = "arc" | "earlier" | "unvisited";

function pinState(
  marker: Marker,
  range: { from: number; to: number },
  sessionIndex: Map<string, number>,
): PinState {
  if (!marker.gameSessionId) return "unvisited";
  const idx = sessionIndex.get(marker.gameSessionId);
  if (idx == null) return "unvisited";
  if (idx >= range.from && idx <= range.to) return "arc";
  if (idx < range.from) return "earlier";
  return "unvisited";
}

export function MapBoard({
  campaignId,
  mapId,
  imagePath,
  markers,
  entities,
  sessions,
}: {
  campaignId: string;
  mapId: string;
  imagePath: string;
  markers: Marker[];
  entities: EntityOption[];
  sessions: SessionOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    markers[0]?.id ?? null,
  );
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [gameSessionId, setGameSessionId] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [alwaysShowLabels, setAlwaysShowLabels] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [rangeFrom, setRangeFrom] = useState(0);
  const [rangeTo, setRangeTo] = useState(Math.max(0, sessions.length - 1));
  const [pinQuery, setPinQuery] = useState("");

  const sessionIndex = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((session, index) => map.set(session.id, index));
    return map;
  }, [sessions]);

  const range = useMemo(
    () => ({
      from: Math.min(rangeFrom, rangeTo),
      to: Math.max(rangeFrom, rangeTo),
    }),
    [rangeFrom, rangeTo],
  );

  const visibleMarkers = useMemo(() => {
    const q = pinQuery.trim().toLowerCase();
    return markers.filter((marker) => {
      if (q && !marker.entityName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [markers, pinQuery]);

  const selected = useMemo(
    () => markers.find((marker) => marker.id === selectedId) ?? null,
    [markers, selectedId],
  );

  function onMapClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setDraft({
      x: Math.min(100, Math.max(0, Number(x.toFixed(2)))),
      y: Math.min(100, Math.max(0, Number(y.toFixed(2)))),
    });
    setMessage("Choose an ID card for this pin, then save.");
  }

  const fromLabel = sessions[range.from]?.title ?? "—";
  const toLabel = sessions[range.to]?.title ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex h-[52px] flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface px-4">
        <p className="font-[family-name:var(--font-heading)] text-[22px] text-text">
          Map
        </p>
        <span className="tabular text-[11px] text-muted">
          {sessions.length} sessions
        </span>
        <div className="h-5 w-px bg-[var(--line)]" />
        <span className="text-[12.5px] text-text-3">Showing pins from</span>
        <span className="rounded-[var(--radius-md)] border border-[rgba(225,173,102,0.5)] px-2.5 py-1 text-[12px] text-accent">
          {fromLabel} – {toLabel}
        </span>
        {sessions.length > 0 ? (
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <label className="flex items-center gap-1">
              From
              <input
                type="range"
                min={0}
                max={Math.max(0, sessions.length - 1)}
                value={rangeFrom}
                onChange={(e) => setRangeFrom(Number(e.target.value))}
              />
            </label>
            <label className="flex items-center gap-1">
              To
              <input
                type="range"
                min={0}
                max={Math.max(0, sessions.length - 1)}
                value={rangeTo}
                onChange={(e) => setRangeTo(Number(e.target.value))}
              />
            </label>
          </div>
        ) : null}
        <label className="ml-auto inline-flex items-center gap-2 text-[12px] text-text-3">
          <input
            type="checkbox"
            checked={alwaysShowLabels}
            onChange={(e) => setAlwaysShowLabels(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Always show labels
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_272px]">
        <div className="relative">
          <div
            role="presentation"
            onClick={onMapClick}
            className="relative w-full cursor-crosshair overflow-hidden rounded-[var(--radius-lg)] border border-line bg-[repeating-linear-gradient(135deg,#221e17_0_10px,#1c1914_10px_20px)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={uploadUrl(imagePath)}
              alt="Campaign map"
              className="pointer-events-none block max-h-[70vh] w-full object-contain"
            />
            {visibleMarkers.map((marker) => {
              const state = pinState(marker, range, sessionIndex);
              const showLabel =
                alwaysShowLabels ||
                hoveredId === marker.id ||
                selectedId === marker.id;
              return (
                <button
                  key={marker.id}
                  type="button"
                  aria-label={`Pin for ${marker.entityName}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${marker.xPercent}%`,
                    top: `${marker.yPercent}%`,
                  }}
                  onMouseEnter={() => setHoveredId(marker.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedId(marker.id);
                    setDraft(null);
                  }}
                >
                  <span
                    className={`block rounded-full transition ${
                      selectedId === marker.id || hoveredId === marker.id
                        ? "h-[14px] w-[14px] bg-accent shadow-[0_0_0_7px_rgba(225,173,102,0.18)]"
                        : state === "arc"
                          ? "h-3 w-3 bg-accent shadow-[0_0_0_5px_rgba(225,173,102,0.18)]"
                          : state === "earlier"
                            ? "h-3 w-3 border-[1.5px] border-accent bg-page"
                            : "h-[11px] w-[11px] border-[1.5px] border-[rgba(225,173,102,0.5)] bg-transparent"
                    }`}
                  />
                  {showLabel ? (
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-[3px] border border-line bg-[rgba(26,24,21,0.92)] px-2 py-0.5 text-[11.5px] text-text">
                      {marker.entityName}
                    </span>
                  ) : null}
                </button>
              );
            })}
            {draft ? (
              <span
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent bg-warn"
                style={{ left: `${draft.x}%`, top: `${draft.y}%` }}
              />
            ) : null}
          </div>

          <div className="absolute bottom-3 left-3 rounded-[var(--radius-md)] border border-line bg-[rgba(20,18,14,0.78)] px-3 py-2 text-[11px] text-text-3">
            <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted">
              Legend
            </p>
            <p>
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-accent" />{" "}
              Seen this arc
            </p>
            <p>
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full border border-accent" />{" "}
              Earlier
            </p>
            <p>
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full border border-[rgba(225,173,102,0.5)]" />{" "}
              Unvisited
            </p>
          </div>
        </div>

        <aside className="space-y-4 rounded-[var(--radius-lg)] border border-line bg-surface p-3">
          <input
            value={pinQuery}
            onChange={(e) => setPinQuery(e.target.value)}
            placeholder="Find a pin…"
            className="w-full rounded-[var(--radius-md)] border border-line-strong bg-transparent px-2.5 py-2 text-[12.5px] outline-none focus:border-accent"
          />

          <ul className="max-h-56 space-y-0.5 overflow-y-auto">
            {visibleMarkers.map((marker) => {
              const state = pinState(marker, range, sessionIndex);
              return (
                <li key={marker.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(marker.id)}
                    className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12.5px] ${
                      selectedId === marker.id
                        ? "border-l-2 border-accent bg-[var(--accent-tint-11)]"
                        : "border-l-2 border-transparent text-text-3 hover:bg-[var(--accent-tint-04)]"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        state === "arc"
                          ? "bg-accent"
                          : state === "earlier"
                            ? "border border-accent"
                            : "border border-[rgba(225,173,102,0.5)]"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-text">
                      {marker.entityName}
                    </span>
                    <span className="truncate text-[10.5px] text-muted">
                      {marker.sessionTitle ?? "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {draft ? (
            <section className="border-t border-line-soft pt-3">
              <p className="kicker">Drop a pin</p>
              <p className="mt-1 text-[11px] text-muted">
                {draft.x.toFixed(1)}%, {draft.y.toFixed(1)}%
              </p>
              {entities.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Create an ID card first.</p>
              ) : (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData();
                    formData.set("entityId", entityId);
                    formData.set("gameSessionId", gameSessionId);
                    formData.set("note", note);
                    formData.set("xPercent", String(draft.x));
                    formData.set("yPercent", String(draft.y));
                    startTransition(async () => {
                      await placeMapMarkerAction(campaignId, mapId, formData);
                      setDraft(null);
                      setNote("");
                      setMessage("Pin saved.");
                      router.refresh();
                    });
                  }}
                >
                  <select
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-line-strong bg-transparent px-2 py-1.5 text-[12.5px]"
                    required
                  >
                    {entities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={gameSessionId}
                    onChange={(e) => setGameSessionId(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-line-strong bg-transparent px-2 py-1.5 text-[12.5px]"
                  >
                    <option value="">No session</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.title}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Note…"
                    className="w-full rounded-[var(--radius-md)] border border-line-strong bg-transparent px-2 py-1.5 text-[12.5px]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={pending || !entityId}
                      className="rounded-[var(--radius-md)] border border-[rgba(225,173,102,0.5)] px-3 py-1.5 text-[12px] text-accent disabled:opacity-50"
                    >
                      Save pin
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft(null)}
                      className="rounded-[var(--radius-md)] border border-line px-3 py-1.5 text-[12px] text-text-3"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>
          ) : null}

          {selected ? (
            <section className="border-t border-line-soft pt-3">
              <p className="font-[family-name:var(--font-heading)] text-[18px] text-text">
                {selected.entityName}
              </p>
              <p className="text-[11.5px] text-muted">
                {selected.entityType}
                {selected.sessionTitle ? ` · ${selected.sessionTitle}` : ""}
              </p>
              {selected.note ? (
                <p className="mt-2 text-[12.5px] text-text-3">{selected.note}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`/campaigns/${campaignId}/entities/${selected.entityId}`}
                  className="rounded-[var(--radius-md)] border border-[rgba(225,173,102,0.5)] px-2.5 py-1 text-[12px] text-accent"
                >
                  Open card
                </a>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteMapMarkerAction(
                        campaignId,
                        mapId,
                        selected.id,
                      );
                      setSelectedId(null);
                      router.refresh();
                    })
                  }
                  className="rounded-[var(--radius-md)] border border-warn/50 px-2.5 py-1 text-[12px] text-warn"
                >
                  Remove
                </button>
              </div>
            </section>
          ) : null}

          {message ? <p className="text-[12px] text-accent">{message}</p> : null}
        </aside>
      </div>
    </div>
  );
}
