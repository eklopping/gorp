"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FateRiverCanvas } from "@/components/fate-river-canvas";
import type { FateEntityPlacement, FateSession } from "@/lib/fate-timeline";
import {
  deleteEntityFromFateAction,
  deleteGameSessionFromFateAction,
  moveEntityOnRiverAction,
  moveGameSessionAction,
} from "@/lib/fate-actions";
import { uploadUrl } from "@/lib/upload-url";

const SESSION_GAP = 460;
const PAD_X = 160;
const HEIGHT = 640;
const MAIN_Y = 320;
const DRAG_THRESHOLD = 6;

type Props = {
  campaignId: string;
  sessions: FateSession[];
  placements: FateEntityPlacement[];
};

function waveY(x: number, phase = 0) {
  return (
    MAIN_Y +
    Math.sin(x / 70 + phase) * 18 +
    Math.sin(x / 140 + phase * 0.6) * 10
  );
}

function branchGeometry(x: number, upward: boolean) {
  const tipX = x + 118;
  const tipY = upward ? MAIN_Y - 158 : MAIN_Y + 158;
  return { tipX, tipY, upward, x };
}

export function FateTimeline({ campaignId, sessions, placements }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef({ left: 0, width: 900 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [zoomedSessionId, setZoomedSessionId] = useState<string | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [dragging, setDragging] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const syncView = () => {
      viewRef.current = { left: node.scrollLeft, width: node.clientWidth };
      setViewportWidth(Math.max(node.clientWidth, window.innerWidth));
    };

    syncView();
    const ro = new ResizeObserver(syncView);
    ro.observe(node);
    window.addEventListener("resize", syncView);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncView);
    };
  }, [sessions.length]);

  const contentWidth =
    PAD_X + Math.max(sessions.length, 1) * SESSION_GAP + 300;
  const width = Math.max(viewportWidth, contentWidth);

  const sessionNodes = useMemo(
    () =>
      sessions.map((session, index) => {
        const x = PAD_X + index * SESSION_GAP;
        const upward = index % 2 === 0;
        const branch = branchGeometry(x, upward);
        return { session, index, ...branch };
      }),
    [sessions],
  );

  const branches = useMemo(
    () =>
      sessionNodes.map((node) => ({
        x: node.x,
        upward: node.upward,
        tipX: node.tipX,
        tipY: node.tipY,
      })),
    [sessionNodes],
  );

  const entityNodes = useMemo(() => {
    const siblingCounts = new Map<number, FateEntityPlacement[]>();
    for (const placement of placements) {
      const list = siblingCounts.get(placement.fromSessionIndex) ?? [];
      list.push(placement);
      siblingCounts.set(placement.fromSessionIndex, list);
    }

    return placements.map((placement, order) => {
      const from = sessionNodes[placement.fromSessionIndex];
      const next = sessionNodes[placement.fromSessionIndex + 1];
      const startX = from?.x ?? PAD_X;
      const endX = next?.x ?? startX + SESSION_GAP * 0.75;
      const siblings = siblingCounts.get(placement.fromSessionIndex) ?? [];
      const siblingIndex = siblings.findIndex(
        (other) =>
          other.entityId === placement.entityId &&
          other.fromSessionId === placement.fromSessionId,
      );
      const t = (siblingIndex + 1) / (siblings.length + 1);
      const x = startX + (endX - startX) * t;
      const y =
        waveY(x) + ((order % 2 === 0 ? -1 : 1) * 42 + (siblingIndex % 3) * 10);
      return { placement, x, y };
    });
  }, [placements, sessionNodes]);

  const zoomed = sessionNodes.find(
    (node) => node.session.id === zoomedSessionId,
  );

  const canvasStyle = zoomed
    ? {
        transform: `translate(${440 - zoomed.tipX}px, ${310 - zoomed.tipY}px) scale(1.55)`,
        transformOrigin: `${zoomed.tipX}px ${zoomed.tipY}px`,
      }
    : {
        transform: "translate(0px, 0px) scale(1)",
        transformOrigin: "center center",
      };

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    // Don't capture/drag when interacting with cards/controls — that breaks zoom clicks
    if (
      target?.closest(
        "button, a, input, textarea, select, label, [data-no-drag]",
      )
    ) {
      return;
    }
    const node = scrollerRef.current;
    if (!node) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: node.scrollLeft,
      moved: false,
    };
    suppressClickRef.current = false;
    node.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const node = scrollerRef.current;
    if (!drag || !node || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) < DRAG_THRESHOLD) return;

    if (!drag.moved) {
      drag.moved = true;
      suppressClickRef.current = true;
      setDragging(true);
    }

    node.scrollLeft = drag.startScroll - dx;
    viewRef.current = {
      left: node.scrollLeft,
      width: node.clientWidth,
    };
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const node = scrollerRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (node?.hasPointerCapture(event.pointerId)) {
      node.releasePointerCapture(event.pointerId);
    }
  }

  function guardClick(event: React.SyntheticEvent) {
    if (!suppressClickRef.current) return false;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
    return true;
  }

  function runRiverAction(
    action: () => Promise<{ ok?: boolean; error?: string }>,
  ) {
    setActionMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setActionMessage(result.error);
    });
  }

  function confirmDelete(label: string) {
    return window.confirm(`Delete ${label}? This cannot be undone.`);
  }

  if (sessions.length === 0) {
    return (
      <div className="w-full space-y-4">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-ink">
            Thread of fate
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Add a session to begin the thread of fate. ID cards will appear on
            the strand between the session they enter and the next.
          </p>
        </div>
        <div className="w-full border-y-[6px] border-[#c49a55]/65 bg-[#0a0806] px-6 py-10 text-sm text-[#d9c6a5] shadow-[inset_0_1px_0_rgba(255,220,160,0.22),inset_0_-1px_0_rgba(255,220,160,0.22)]">
          No sessions yet — create one to open the river.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-10">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-3 px-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-ink">
            Thread of fate
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Click and drag to travel the golden river. Use ← → on cards to
            reorder sessions and ID cards; delete removes them from the
            campaign.
          </p>
          {actionMessage ? (
            <p className="mt-2 text-xs text-warn">{actionMessage}</p>
          ) : null}
        </div>
        {zoomedSessionId ? (
          <button
            type="button"
            onClick={() => setZoomedSessionId(null)}
            className="rounded-lg border border-line bg-paper/70 px-4 py-2 text-sm hover:border-accent"
          >
            Zoom out
          </button>
        ) : null}
      </div>

      <div className="relative w-full overflow-hidden border-y-[6px] border-[#c49a55]/70 bg-[#070504] shadow-[0_22px_55px_-34px_rgba(20,32,28,0.55),inset_0_1px_0_rgba(255,220,160,0.28),inset_0_-1px_0_rgba(255,220,160,0.28)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-30 h-5 bg-gradient-to-b from-[#1a120a]/55 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-5 bg-gradient-to-t from-[#1a120a]/55 to-transparent"
          aria-hidden
        />

        <div
          ref={scrollerRef}
          className={`fate-scroll relative w-full overflow-x-auto overflow-y-hidden select-none ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ height: HEIGHT, touchAction: "pan-y" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onScroll={(event) => {
            const node = event.currentTarget;
            viewRef.current = {
              left: node.scrollLeft,
              width: node.clientWidth,
            };
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,140,40,0.1),transparent_62%)]"
            aria-hidden
          />
          <div
            className="fate-canvas relative min-w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
            style={{ width, height: HEIGHT, ...canvasStyle }}
          >
            <FateRiverCanvas
              width={width}
              height={HEIGHT}
              mainY={MAIN_Y}
              branches={branches}
              quality="balanced"
              viewRef={viewRef}
            />

            {entityNodes.map(({ placement, x, y }) => (
              <div
                key={`${placement.entityId}-${placement.fromSessionId}`}
                data-no-drag
                className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: x, top: y }}
                onPointerDown={(event) => event.stopPropagation()}
                onMouseEnter={() => setHoveredEntityId(placement.entityId)}
                onMouseLeave={() => setHoveredEntityId(null)}
              >
                <div
                  className={`w-40 overflow-hidden rounded-xl border shadow-[0_0_20px_-10px_rgba(255,180,70,0.7)] transition duration-200 ${
                    hoveredEntityId === placement.entityId
                      ? "scale-105 border-[#f0c56d] bg-[#2a1c10]"
                      : "border-[#c49a55]/40 bg-[#17100b]/95"
                  }`}
                >
                  <Link
                    href={`/campaigns/${campaignId}/entities/${placement.entityId}`}
                    className="flex gap-2 p-2"
                    draggable={false}
                    onClick={(event) => {
                      if (guardClick(event)) return;
                    }}
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#2b1d12]">
                      {placement.imagePath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={uploadUrl(placement.imagePath)}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[9px] uppercase tracking-wider text-[#c9ae7d]">
                          {placement.type}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-[family-name:var(--font-display)] text-sm leading-tight text-[#f6e7c4]">
                        {placement.name}
                      </p>
                      <p className="truncate text-[10px] text-[#b89a6c]">
                        {placement.role || placement.type}
                      </p>
                    </div>
                  </Link>
                  <div
                    className="flex items-center gap-1 border-t border-[#c49a55]/20 px-2 py-1.5"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <RiverControl
                      label="Move left"
                      disabled={pending}
                      onClick={() =>
                        runRiverAction(() =>
                          moveEntityOnRiverAction(
                            campaignId,
                            placement.entityId,
                            "left",
                          ),
                        )
                      }
                    >
                      ←
                    </RiverControl>
                    <RiverControl
                      label="Move right"
                      disabled={pending}
                      onClick={() =>
                        runRiverAction(() =>
                          moveEntityOnRiverAction(
                            campaignId,
                            placement.entityId,
                            "right",
                          ),
                        )
                      }
                    >
                      →
                    </RiverControl>
                    <RiverControl
                      label="Delete ID card"
                      danger
                      disabled={pending}
                      onClick={() => {
                        if (!confirmDelete(`ID card “${placement.name}”`)) return;
                        runRiverAction(() =>
                          deleteEntityFromFateAction(
                            campaignId,
                            placement.entityId,
                          ),
                        );
                      }}
                    >
                      ⌫
                    </RiverControl>
                  </div>
                </div>
              </div>
            ))}

            {sessionNodes.map((node) => {
              const isZoomed = zoomedSessionId === node.session.id;
              return (
                <div
                  key={node.session.id}
                  data-no-drag
                  className={`absolute z-20 w-52 origin-center -translate-x-1/2 -translate-y-1/2 rounded-2xl border text-left shadow-[0_0_34px_-14px_rgba(255,170,60,0.8)] transition duration-300 ${
                    isZoomed
                      ? "scale-105 border-[#f0c56d] bg-[#24180f]"
                      : "border-[#c49a55]/40 bg-[#17100b]/95 hover:scale-105 hover:border-[#e2b56a]"
                  }`}
                  style={{ left: node.tipX, top: node.tipY }}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="w-full px-4 pt-3 pb-2 text-left"
                    onClick={(event) => {
                      if (guardClick(event)) return;
                      setZoomedSessionId(isZoomed ? null : node.session.id);
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#c9ae7d]">
                      Session strand
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-lg leading-tight text-[#f6e7c4]">
                      {node.session.title}
                    </p>
                    {node.session.sessionDate ? (
                      <p className="mt-1 text-xs text-[#b89a6c]">
                        {node.session.sessionDate}
                      </p>
                    ) : null}
                    {!isZoomed ? (
                      <p className="mt-2 text-[11px] text-[#a88c5e]">
                        Click to zoom into this thread
                      </p>
                    ) : null}
                  </button>
                  <div
                    className="flex items-center gap-1 border-t border-[#c49a55]/20 px-3 py-2"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <RiverControl
                      label="Move left"
                      disabled={pending}
                      onClick={() =>
                        runRiverAction(() =>
                          moveGameSessionAction(
                            campaignId,
                            node.session.id,
                            "left",
                          ),
                        )
                      }
                    >
                      ←
                    </RiverControl>
                    <RiverControl
                      label="Move right"
                      disabled={pending}
                      onClick={() =>
                        runRiverAction(() =>
                          moveGameSessionAction(
                            campaignId,
                            node.session.id,
                            "right",
                          ),
                        )
                      }
                    >
                      →
                    </RiverControl>
                    <RiverControl
                      label="Delete session"
                      danger
                      disabled={pending}
                      onClick={() => {
                        if (!confirmDelete(`session “${node.session.title}”`)) {
                          return;
                        }
                        runRiverAction(() =>
                          deleteGameSessionFromFateAction(
                            campaignId,
                            node.session.id,
                          ),
                        );
                      }}
                    >
                      ⌫
                    </RiverControl>
                    {isZoomed ? (
                      <Link
                        href={`/campaigns/${campaignId}/sessions/${node.session.id}`}
                        className="ml-auto text-[11px] font-medium text-[#f0c56d] underline-offset-2 hover:underline"
                        onClick={(event) => {
                          if (guardClick(event)) return;
                        }}
                      >
                        Open →
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function RiverControl({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`rounded-md px-2 py-1 text-xs disabled:opacity-40 ${
        danger
          ? "border border-[#8a3b2b]/50 text-[#e8a090] hover:border-[#c45a45]"
          : "border border-[#c49a55]/35 text-[#f0d9a8] hover:border-[#e2b56a]"
      }`}
    >
      {children}
    </button>
  );
}
