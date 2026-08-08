"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { FateEntityPlacement, FateSession } from "@/lib/fate-timeline";
import { uploadUrl } from "@/lib/upload-url";

const SESSION_GAP = 460;
const PAD_X = 160;
const HEIGHT = 620;
const MAIN_Y = 310;

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

function buildRiverPath(width: number, phase = 0) {
  const steps = Math.max(24, Math.ceil(width / 40));
  let d = `M 40 ${waveY(40, phase)}`;
  for (let i = 1; i <= steps; i += 1) {
    const x = 40 + ((width - 80) * i) / steps;
    const y = waveY(x, phase);
    const prevX = 40 + ((width - 80) * (i - 1)) / steps;
    const midX = (prevX + x) / 2;
    const prevY = waveY(prevX, phase);
    d += ` Q ${midX} ${(prevY + y) / 2} ${x} ${y}`;
  }
  return d;
}

function branchPath(x: number, upward: boolean) {
  const tipX = x + 110;
  const tipY = upward ? MAIN_Y - 150 : MAIN_Y + 150;
  const midX = x + 48;
  const midY = upward ? MAIN_Y - 70 : MAIN_Y + 70;
  const startY = waveY(x);
  return {
    d: `M ${x} ${startY} Q ${midX} ${midY} ${tipX} ${tipY}`,
    tipX,
    tipY,
  };
}

export function FateTimeline({ campaignId, sessions, placements }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [zoomedSessionId, setZoomedSessionId] = useState<string | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);

  const width = Math.max(
    900,
    PAD_X + Math.max(sessions.length, 1) * SESSION_GAP + 280,
  );

  const river = useMemo(() => buildRiverPath(width, 0), [width]);
  const riverGhost = useMemo(() => buildRiverPath(width, 1.2), [width]);

  const sessionNodes = sessions.map((session, index) => {
    const x = PAD_X + index * SESSION_GAP;
    const upward = index % 2 === 0;
    const branch = branchPath(x, upward);
    return { session, index, x, upward, ...branch };
  });

  const entityNodes = placements.map((placement, order) => {
    const from = sessionNodes[placement.fromSessionIndex];
    const next = sessionNodes[placement.fromSessionIndex + 1];
    const startX = from?.x ?? PAD_X;
    const endX = next?.x ?? startX + SESSION_GAP * 0.75;
    const siblings = placements.filter(
      (other) => other.fromSessionIndex === placement.fromSessionIndex,
    );
    const siblingIndex = siblings.findIndex(
      (other) =>
        other.entityId === placement.entityId &&
        other.fromSessionId === placement.fromSessionId,
    );
    const t = (siblingIndex + 1) / (siblings.length + 1);
    const x = startX + (endX - startX) * t;
    const y =
      waveY(x) +
      ((order % 2 === 0 ? -1 : 1) * 36 + (siblingIndex % 3) * 8);
    return { placement, x, y };
  });

  const zoomed = sessionNodes.find(
    (node) => node.session.id === zoomedSessionId,
  );

  const canvasStyle = zoomed
    ? {
        transform: `translate(${420 - zoomed.tipX}px, ${300 - zoomed.tipY}px) scale(1.65)`,
        transformOrigin: `${zoomed.tipX}px ${zoomed.tipY}px`,
      }
    : {
        transform: "translate(0px, 0px) scale(1)",
        transformOrigin: "center center",
      };

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-paper/70 p-8 text-sm text-ink-soft">
        Add a session to begin the thread of fate. ID cards will appear on the
        strand between the session they enter and the next.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
            Thread of fate
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Scroll sideways along the river. Session strands branch from the
            main thread. ID cards sit between the session they were created or
            referenced and the next.
          </p>
        </div>
        {zoomedSessionId ? (
          <button
            type="button"
            onClick={() => setZoomedSessionId(null)}
            className="rounded-lg border border-line px-4 py-2 text-sm hover:border-accent"
          >
            Zoom out
          </button>
        ) : null}
      </div>

      <div
        ref={scrollerRef}
        className="fate-scroll relative overflow-x-scroll overflow-y-hidden rounded-2xl border border-line bg-[linear-gradient(180deg,#e7ebe4_0%,#d5ddd4_55%,#cfd8cf_100%)]"
        style={{ height: HEIGHT }}
      >
        <div
          className="fate-canvas relative transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width, height: HEIGHT, ...canvasStyle }}
        >
          <svg
            width={width}
            height={HEIGHT}
            className="absolute inset-0"
            aria-hidden
          >
            <defs>
              <linearGradient id="fate-strand" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7a5a32" stopOpacity="0.25" />
                <stop offset="35%" stopColor="#9a7340" stopOpacity="0.9" />
                <stop offset="70%" stopColor="#6e4f2c" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#8a6840" stopOpacity="0.35" />
              </linearGradient>
              <filter id="fate-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              d={riverGhost}
              fill="none"
              stroke="url(#fate-strand)"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.35"
              className="fate-flow-slow"
              filter="url(#fate-glow)"
            />
            <path
              d={river}
              fill="none"
              stroke="url(#fate-strand)"
              strokeWidth="7"
              strokeLinecap="round"
              className="fate-flow"
              filter="url(#fate-glow)"
            />
            <path
              d={river}
              fill="none"
              stroke="#c4a574"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.55"
              className="fate-flow-shimmer"
            />

            {sessionNodes.map((node) => (
              <path
                key={`branch-${node.session.id}`}
                d={node.d}
                fill="none"
                stroke="url(#fate-strand)"
                strokeWidth="5"
                strokeLinecap="round"
                className="fate-flow"
                filter="url(#fate-glow)"
              />
            ))}
          </svg>

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
                className={`w-36 overflow-hidden rounded-xl border bg-paper/90 shadow-[0_10px_30px_-18px_rgba(40,30,10,0.55)] backdrop-blur-sm transition duration-300 ${
                  hoveredEntityId === placement.entityId
                    ? "-translate-y-1 border-accent"
                    : "border-line"
                }`}
              >
                <div className="flex gap-2 p-2">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-paper-deep/70">
                    {placement.imagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={uploadUrl(placement.imagePath)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[9px] uppercase tracking-wider text-ink-soft">
                        {placement.type}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-[family-name:var(--font-display)] text-sm leading-tight">
                      {placement.name}
                    </p>
                    <p className="truncate text-[10px] text-ink-soft">
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
                className={`absolute z-20 w-48 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-4 py-3 text-left shadow-[0_18px_40px_-28px_rgba(40,30,10,0.65)] transition duration-500 ${
                  isZoomed
                    ? "border-accent bg-paper"
                    : "border-line bg-paper/85 hover:-translate-y-1 hover:border-accent"
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
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                    Session strand
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-lg leading-tight">
                    {node.session.title}
                  </p>
                  {node.session.sessionDate ? (
                    <p className="mt-1 text-xs text-ink-soft">
                      {node.session.sessionDate}
                    </p>
                  ) : null}
                  {!isZoomed ? (
                    <p className="mt-2 text-[11px] text-ink-soft">
                      Click to zoom into this thread
                    </p>
                  ) : null}
                </button>
                {isZoomed ? (
                  <Link
                    href={`/campaigns/${campaignId}/sessions/${node.session.id}`}
                    className="mt-3 inline-block text-xs font-medium text-accent-deep underline-offset-2 hover:underline"
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
  );
}
