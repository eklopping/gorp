"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FateRiverCanvas } from "@/components/fate-river-canvas";
import type { FateEntityPlacement, FateSession } from "@/lib/fate-timeline";
import { uploadUrl } from "@/lib/upload-url";

const SESSION_GAP = 460;
const PAD_X = 160;
const HEIGHT = 640;
const MAIN_Y = 320;

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
  const [zoomedSessionId, setZoomedSessionId] = useState<string | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(1200);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const syncView = () => {
      viewRef.current = { left: node.scrollLeft, width: node.clientWidth };
      setViewportWidth(node.clientWidth);
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

  if (sessions.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-ink">
            Thread of fate
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Add a session to begin the thread of fate. ID cards will appear on
            the strand between the session they enter and the next.
          </p>
        </div>
        <div className="rounded-2xl border border-[#c49a55]/40 bg-[#0a0806] px-6 py-10 text-sm text-[#d9c6a5] shadow-[0_20px_50px_-36px_rgba(20,32,28,0.55)]">
          No sessions yet — create one to open the river.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-ink">
            Thread of fate
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Scroll the golden river. Session filaments branch from the current.
            ID cards rest between the session they were created or referenced
            and the next.
          </p>
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

      <div className="relative overflow-hidden rounded-2xl border border-[#c49a55]/45 bg-[#070504] shadow-[0_22px_55px_-34px_rgba(20,32,28,0.6),0_0_40px_-28px_rgba(196,154,85,0.35)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-30 h-6 bg-gradient-to-b from-[#1a120a]/70 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-6 bg-gradient-to-t from-[#1a120a]/70 to-transparent"
          aria-hidden
        />

        <div
          ref={scrollerRef}
          className="fate-scroll relative w-full overflow-x-scroll overflow-y-hidden"
          style={{ height: HEIGHT }}
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
              <Link
                key={`${placement.entityId}-${placement.fromSessionId}`}
                href={`/campaigns/${campaignId}/entities/${placement.entityId}`}
                className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: x, top: y }}
                onMouseEnter={() => setHoveredEntityId(placement.entityId)}
                onMouseLeave={() => setHoveredEntityId(null)}
              >
                <div
                  className={`w-36 overflow-hidden rounded-xl border shadow-[0_0_20px_-10px_rgba(255,180,70,0.7)] transition duration-200 ${
                    hoveredEntityId === placement.entityId
                      ? "-translate-y-1 border-[#f0c56d] bg-[#2a1c10]"
                      : "border-[#c49a55]/40 bg-[#17100b]/95"
                  }`}
                >
                  <div className="flex gap-2 p-2">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#2b1d12]">
                      {placement.imagePath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={uploadUrl(placement.imagePath)}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
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
                  </div>
                </div>
              </Link>
            ))}

            {sessionNodes.map((node) => {
              const isZoomed = zoomedSessionId === node.session.id;
              return (
                <div
                  key={node.session.id}
                  className={`absolute z-20 w-48 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-4 py-3 text-left shadow-[0_0_34px_-14px_rgba(255,170,60,0.8)] transition duration-300 ${
                    isZoomed
                      ? "border-[#f0c56d] bg-[#24180f]"
                      : "border-[#c49a55]/40 bg-[#17100b]/95 hover:-translate-y-1 hover:border-[#e2b56a]"
                  }`}
                  style={{ left: node.tipX, top: node.tipY }}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() =>
                      setZoomedSessionId(isZoomed ? null : node.session.id)
                    }
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
                  {isZoomed ? (
                    <Link
                      href={`/campaigns/${campaignId}/sessions/${node.session.id}`}
                      className="mt-3 inline-block text-xs font-medium text-[#f0c56d] underline-offset-2 hover:underline"
                    >
                      Open session notes →
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
