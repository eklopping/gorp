"use client";

import { useEffect, useRef } from "react";

export type BranchSpec = {
  x: number;
  upward: boolean;
  tipX: number;
  tipY: number;
};

export type FateQuality = "high" | "balanced" | "low";

type FateRiverCanvasProps = {
  width: number;
  height: number;
  mainY: number;
  branches: BranchSpec[];
  quality?: FateQuality;
  viewRef: React.MutableRefObject<{ left: number; width: number }>;
};

type Filament = {
  amp: number;
  freq: number;
  phase: number;
  thickness: number;
  brightness: number;
  offsetY: number;
  kind: "core" | "halo" | "wispy";
};

type BranchFilament = {
  branchIndex: number;
  sway: number;
  phase: number;
  thickness: number;
  brightness: number;
  fan: number;
};

const QUALITY = {
  high: { filaments: 42, branchStrands: 7, sparks: 22, step: 22, fps: 30, dpr: 1.5 },
  balanced: { filaments: 28, branchStrands: 5, sparks: 14, step: 28, fps: 24, dpr: 1.25 },
  low: { filaments: 16, branchStrands: 3, sparks: 8, step: 36, fps: 20, dpr: 1 },
} as const;

function riverY(x: number, mainY: number, time: number, filament: Filament) {
  return (
    mainY +
    filament.offsetY +
    Math.sin(x * filament.freq + time * 0.0005 + filament.phase) * filament.amp +
    Math.sin(x * filament.freq * 0.4 + time * 0.00022 + filament.phase) *
      filament.amp *
      0.35
  );
}

function createFilaments(count: number): Filament[] {
  const filaments: Filament[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    const kind: Filament["kind"] =
      t < 0.22 ? "core" : t < 0.62 ? "halo" : "wispy";
    filaments.push({
      amp: kind === "core" ? 9 + (i % 5) : 14 + (i % 9) * 1.6,
      freq: 0.008 + (i % 7) * 0.0011,
      phase: i * 0.73,
      thickness:
        kind === "core" ? 1.6 + (i % 3) * 0.35 : kind === "halo" ? 1 + (i % 4) * 0.2 : 0.55,
      brightness:
        kind === "core" ? 0.7 : kind === "halo" ? 0.32 : 0.14,
      offsetY:
        ((i % 11) - 5) * (kind === "core" ? 2.2 : kind === "halo" ? 4.4 : 6.2),
      kind,
    });
  }
  return filaments;
}

function createBranchFilaments(
  branchCount: number,
  strandsPerBranch: number,
): BranchFilament[] {
  const items: BranchFilament[] = [];
  for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
    for (let i = 0; i < strandsPerBranch; i += 1) {
      items.push({
        branchIndex,
        sway: 6 + i * 1.8,
        phase: branchIndex * 1.1 + i * 0.8,
        thickness: 0.55 + (i % 3) * 0.25,
        brightness: 0.28 + (i % 4) * 0.1,
        fan: ((i % 5) - 2) * 9,
      });
    }
  }
  return items;
}

export function FateRiverCanvas({
  width,
  height,
  mainY,
  branches,
  quality = "balanced",
  viewRef,
}: FateRiverCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", {
      alpha: true,
      desynchronized: true,
    });
    if (!ctx) return;

    const settings = QUALITY[quality];
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const filaments = createFilaments(settings.filaments);
    const branchFilaments = createBranchFilaments(
      branches.length,
      settings.branchStrands,
    );
    const sparks = Array.from({ length: settings.sparks }, (_, i) => ({
      x: ((i + 1) / (settings.sparks + 1)) * width,
      yBias: ((i % 5) - 2) * 10,
      phase: i * 1.3,
    }));

    const byBranch: BranchFilament[][] = branches.map(() => []);
    for (const item of branchFilaments) {
      byBranch[item.branchIndex]?.push(item);
    }

    // Reusable point buffers to avoid per-frame allocations
    const riverPointsX = new Float32Array(Math.ceil(width / settings.step) + 8);
    const riverPointsY = new Float32Array(riverPointsX.length);

    let raf = 0;
    let running = true;
    let visible = true;
    let lastDraw = 0;
    const frameMs = 1000 / (reduceMotion ? 12 : settings.fps);
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      reduceMotion ? 1 : settings.dpr,
    );

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const strokePolyline = (
      count: number,
      xs: Float32Array | number[],
      ys: Float32Array | number[],
      thickness: number,
      color: string,
    ) => {
      if (count < 2) return;
      ctx.beginPath();
      ctx.moveTo(xs[0], ys[0]);
      for (let i = 1; i < count; i += 1) ctx.lineTo(xs[i], ys[i]);
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    };

    const drawStaticFrame = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      const viewLeft = viewRef.current.left - 120;
      const viewRight = viewRef.current.left + viewRef.current.width + 120;
      const step = settings.step;

      for (const filament of filaments) {
        let count = 0;
        const startX = Math.max(-20, Math.floor(viewLeft / step) * step);
        const endX = Math.min(width + 20, Math.ceil(viewRight / step) * step);
        for (let x = startX; x <= endX; x += step) {
          riverPointsX[count] = x;
          riverPointsY[count] = riverY(x, mainY, time, filament);
          count += 1;
        }

        const glow =
          filament.kind === "wispy"
            ? `rgba(255, 160, 55, ${0.07 + filament.brightness * 0.2})`
            : `rgba(255, 175, 70, ${0.1 + filament.brightness * 0.28})`;
        strokePolyline(
          count,
          riverPointsX,
          riverPointsY,
          filament.thickness * (filament.kind === "core" ? 2.2 : 1.7),
          glow,
        );

        if (filament.kind !== "wispy") {
          strokePolyline(
            count,
            riverPointsX,
            riverPointsY,
            Math.max(0.7, filament.thickness * 0.55),
            `rgba(255, 236, 185, ${0.28 + filament.brightness * 0.4})`,
          );
        }
      }

      branches.forEach((branch, branchIndex) => {
        if (branch.tipX < viewLeft - 80 || branch.x > viewRight + 80) return;
        const strands = byBranch[branchIndex] ?? [];
        const base = filaments[branchIndex % filaments.length] ?? filaments[0];
        if (!base) return;

        for (const filament of strands) {
          const samples = quality === "low" ? 12 : 18;
          const xs: number[] = [];
          const ys: number[] = [];
          const startY = riverY(branch.x, mainY, time, base);

          for (let i = 0; i <= samples; i += 1) {
            const t = i / samples;
            const ease = t * t * (3 - 2 * t);
            xs.push(
              branch.x +
                (branch.tipX - branch.x) * ease +
                Math.sin(time * 0.0007 + filament.phase + t * 3) *
                  filament.sway *
                  t *
                  0.65,
            );
            ys.push(
              startY +
                (branch.tipY - startY) * ease +
                filament.fan * t * t * 0.85,
            );
          }

          strokePolyline(
            xs.length,
            xs,
            ys,
            filament.thickness * 1.8,
            `rgba(255, 170, 60, ${0.12 + filament.brightness * 0.25})`,
          );
          strokePolyline(
            xs.length,
            xs,
            ys,
            Math.max(0.6, filament.thickness * 0.55),
            `rgba(255, 236, 185, ${0.22 + filament.brightness * 0.35})`,
          );

          // Single fan tip instead of many
          const tipX = xs[xs.length - 1];
          const tipY = ys[ys.length - 1];
          strokePolyline(
            2,
            [tipX, tipX + filament.fan * 0.2 + (branch.upward ? 8 : 6)],
            [
              tipY,
              tipY +
                (branch.upward ? -14 : 14) +
                Math.sin(filament.phase + time * 0.0015) * 2,
            ],
            filament.thickness * 0.7,
            `rgba(255, 230, 170, ${0.25 + filament.brightness * 0.3})`,
          );
        }
      });

      for (const spark of sparks) {
        if (spark.x < viewLeft || spark.x > viewRight) continue;
        const base = filaments[0];
        if (!base) continue;
        const y = riverY(spark.x, mainY, time, base) + spark.yBias;
        const pulse =
          0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 0.0022 + spark.phase));
        const r = 1.1 + pulse * 1.6;
        ctx.fillStyle = `rgba(255, 200, 90, ${0.16 * pulse})`;
        ctx.beginPath();
        ctx.arc(spark.x, y, r * 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 245, 210, ${0.55 * pulse})`;
        ctx.beginPath();
        ctx.arc(spark.x, y, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const tick = (time: number) => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      if (time - lastDraw < frameMs) return;
      lastDraw = time;
      drawStaticFrame(reduceMotion ? 0 : time);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (visible && !document.hidden) {
          lastDraw = 0;
        }
      },
      { root: null, threshold: 0.05 },
    );
    io.observe(canvas);

    const onVisibility = () => {
      if (!document.hidden) lastDraw = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Initial paint + loop
    drawStaticFrame(0);
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [branches, height, mainY, quality, viewRef, width]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden
    />
  );
}
