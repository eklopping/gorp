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

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="space-y-3">
        <p className="text-sm text-ink-soft">
          Click the map to drop a pin, link an ID card, and optionally the
          session when you met them there.
        </p>
        <div
          role="presentation"
          onClick={onMapClick}
          className="relative w-full cursor-crosshair overflow-hidden rounded-2xl border border-line bg-paper-deep/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={uploadUrl(imagePath)}
            alt="Campaign map"
            className="pointer-events-none block max-h-[70vh] w-full object-contain"
          />
          {markers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              aria-label={`Pin for ${marker.entityName}`}
              className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper shadow ${
                selectedId === marker.id ? "scale-125 bg-warn" : "bg-accent"
              }`}
              style={{ left: `${marker.xPercent}%`, top: `${marker.yPercent}%` }}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedId(marker.id);
                setDraft(null);
              }}
            />
          ))}
          {draft ? (
            <span
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-warn"
              style={{ left: `${draft.x}%`, top: `${draft.y}%` }}
            />
          ) : null}
        </div>
      </div>

      <aside className="space-y-4">
        {draft ? (
          <section className="rounded-2xl border border-line bg-paper/70 p-4">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Place ID card
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              Pin at {draft.x.toFixed(1)}%, {draft.y.toFixed(1)}%
            </p>

            {entities.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">
                Create an ID card first, then come back to pin it here.
              </p>
            ) : (
              <form
                className="mt-4 space-y-3"
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
                <label className="block text-sm">
                  <span className="font-medium">ID card</span>
                  <select
                    value={entityId}
                    onChange={(event) => setEntityId(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-line bg-paper-deep/40 px-3 py-2"
                    required
                  >
                    {entities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name} ({entity.type})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="font-medium">Session met (optional)</span>
                  <select
                    value={gameSessionId}
                    onChange={(event) => setGameSessionId(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-line bg-paper-deep/40 px-3 py-2"
                  >
                    <option value="">Not tied to a session yet</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.title}
                        {session.sessionDate ? ` · ${session.sessionDate}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="font-medium">Note</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    className="mt-1.5 w-full rounded-lg border border-line bg-paper-deep/40 px-3 py-2"
                    placeholder="Met in the market square after the raid…"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={pending || !entityId}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent-deep disabled:opacity-60"
                  >
                    {pending ? "Saving…" : "Save pin"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="rounded-lg border border-line px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        ) : null}

        <section className="rounded-2xl border border-line bg-paper/70 p-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Selected pin
          </h2>
          {!selected ? (
            <p className="mt-2 text-sm text-ink-soft">
              Click an existing pin on the map to inspect it.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-xl border border-line bg-paper-deep/50">
                  {selected.entityImagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={uploadUrl(selected.entityImagePath)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-xl">
                    {selected.entityName}
                  </p>
                  <p className="text-xs uppercase tracking-wider text-ink-soft">
                    {selected.entityType}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {[selected.entityRole, selected.entityAllegiance]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
              {selected.entityDescription ? (
                <p className="text-sm text-ink-soft">{selected.entityDescription}</p>
              ) : null}
              {selected.sessionTitle ? (
                <p className="text-sm">
                  Met during{" "}
                  <span className="font-medium">{selected.sessionTitle}</span>
                  {selected.sessionDate ? ` (${selected.sessionDate})` : ""}
                </p>
              ) : (
                <p className="text-sm text-ink-soft">No session linked.</p>
              )}
              {selected.note ? (
                <p className="rounded-lg border border-line bg-paper-deep/40 px-3 py-2 text-sm">
                  {selected.note}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/campaigns/${campaignId}/entities/${selected.entityId}`}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent"
                >
                  Open ID card
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
                  className="rounded-lg bg-warn/90 px-3 py-1.5 text-sm text-paper hover:bg-warn disabled:opacity-60"
                >
                  Remove pin
                </button>
              </div>
            </div>
          )}
        </section>

        {message ? (
          <p className="text-sm text-accent-deep">{message}</p>
        ) : null}
      </aside>
    </div>
  );
}
