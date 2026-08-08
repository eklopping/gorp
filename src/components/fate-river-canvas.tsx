"use client";

import { useEffect, useRef } from "react";

type BranchSpec = {
  x: number;
  upward: boolean;
  tipX: number;
  tipY: number;
};

type FateRiverCanvasProps = {
  width: number;
  height: number;
  mainY: number;
  branches: BranchSpec[];
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

function riverY(
  x: number,
  mainY: number,
  time: number,
  filament: Filament,
) {
  return (
    mainY +
    filament.offsetY +
    Math.sin(x * filament.freq + time * 0.00055 + filament.phase) *
      filament.amp +
    Math.sin(x * filament.freq * 0.37 + time * 0.00028 + filament.phase * 1.7) *
      (filament.amp * 0.45)
  );
}

export function FateRiverCanvas({
  width,
  height,
  mainY,
  branches,
}: FateRiverCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filamentsRef = useRef<Filament[]>([]);
  const branchFilamentsRef = useRef<BranchFilament[]>([]);
  const sparksRef = useRef<{ x: number; yBias: number; phase: number }[]>([]);

  useEffect(() => {
    const filaments: Filament[] = [];
    for (let i = 0; i < 96; i += 1) {
      const t = i / 96;
      const kind: Filament["kind"] =
        t < 0.18 ? "core" : t < 0.55 ? "halo" : "wispy";
      filaments.push({
        amp: kind === "core" ? 10 + Math.random() * 8 : 16 + Math.random() * 28,
        freq: 0.008 + Math.random() * 0.012,
        phase: Math.random() * Math.PI * 2,
        thickness:
          kind === "core"
            ? 1.4 + Math.random() * 1.8
            : kind === "halo"
              ? 0.7 + Math.random() * 1.4
              : 0.35 + Math.random() * 0.7,
        brightness:
          kind === "core"
            ? 0.55 + Math.random() * 0.45
            : kind === "halo"
              ? 0.22 + Math.random() * 0.35
              : 0.08 + Math.random() * 0.18,
        offsetY:
          (Math.random() - 0.5) *
          (kind === "core" ? 18 : kind === "halo" ? 42 : 70),
        kind,
      });
    }
    filamentsRef.current = filaments;

    const branchFilaments: BranchFilament[] = [];
    branches.forEach((_, branchIndex) => {
      for (let i = 0; i < 14; i += 1) {
        branchFilaments.push({
          branchIndex,
          sway: 8 + Math.random() * 18,
          phase: Math.random() * Math.PI * 2,
          thickness: 0.4 + Math.random() * 1.3,
          brightness: 0.2 + Math.random() * 0.55,
          fan: (Math.random() - 0.5) * 50,
        });
      }
    });
    branchFilamentsRef.current = branchFilaments;

    const sparks = Array.from({ length: 48 }, () => ({
      x: Math.random() * width,
      yBias: (Math.random() - 0.5) * 50,
      phase: Math.random() * Math.PI * 2,
    }));
    sparksRef.current = sparks;
  }, [branches, width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const strokeFilament = (
      points: { x: number; y: number }[],
      thickness: number,
      brightness: number,
      core = false,
    ) => {
      if (points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        const prev = points[i - 1];
        const curr = points[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);

      ctx.strokeStyle = core
        ? `rgba(255, 236, 180, ${0.35 + brightness * 0.55})`
        : `rgba(255, 170, 60, ${0.08 + brightness * 0.5})`;
      ctx.lineWidth = core ? thickness * 0.55 : thickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      if (core) {
        ctx.strokeStyle = `rgba(255, 248, 220, ${0.15 + brightness * 0.4})`;
        ctx.lineWidth = Math.max(0.4, thickness * 0.22);
        ctx.stroke();
      }
    };

    const draw = (time: number) => {
      frame = time;
      ctx.clearRect(0, 0, width, height);

      // Void backdrop with soft vignette glow in the river band
      const voidGrad = ctx.createLinearGradient(0, 0, 0, height);
      voidGrad.addColorStop(0, "#040303");
      voidGrad.addColorStop(0.45, "#090706");
      voidGrad.addColorStop(0.5, "#120c07");
      voidGrad.addColorStop(0.55, "#090706");
      voidGrad.addColorStop(1, "#040303");
      ctx.fillStyle = voidGrad;
      ctx.fillRect(0, 0, width, height);

      const bloom = ctx.createRadialGradient(
        width * 0.5,
        mainY,
        20,
        width * 0.5,
        mainY,
        height * 0.55,
      );
      bloom.addColorStop(0, "rgba(255, 140, 40, 0.14)");
      bloom.addColorStop(0.45, "rgba(180, 80, 20, 0.05)");
      bloom.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      const step = 18;
      for (const filament of filamentsRef.current) {
        const points: { x: number; y: number }[] = [];
        for (let x = -40; x <= width + 40; x += step) {
          points.push({
            x,
            y: riverY(x, mainY, time, filament),
          });
        }
        strokeFilament(
          points,
          filament.thickness * (filament.kind === "wispy" ? 1.6 : 2.4),
          filament.brightness * 0.45,
          false,
        );
        if (filament.kind !== "wispy") {
          strokeFilament(points, filament.thickness, filament.brightness, true);
        }
      }

      branches.forEach((branch, branchIndex) => {
        const related = branchFilamentsRef.current.filter(
          (item) => item.branchIndex === branchIndex,
        );
        for (const filament of related) {
          const points: { x: number; y: number }[] = [];
          const samples = 28;
          for (let i = 0; i <= samples; i += 1) {
            const t = i / samples;
            const ease = t * t * (3 - 2 * t);
            const startY = riverY(
              branch.x,
              mainY,
              time,
              filamentsRef.current[branchIndex % filamentsRef.current.length] ??
                filamentsRef.current[0],
            );
            const x =
              branch.x +
              (branch.tipX - branch.x) * ease +
              Math.sin(time * 0.0008 + filament.phase + t * 4) *
                filament.sway *
                t;
            const y =
              startY +
              (branch.tipY - startY) * ease +
              Math.sin(time * 0.001 + filament.phase) * 4 * t +
              filament.fan * t * t;
            points.push({ x, y });

            // Fan / root tips near the end
            if (t > 0.82 && i % 3 === 0) {
              const tipPoints = [
                { x, y },
                {
                  x: x + (branch.upward ? 10 : 8) + filament.fan * 0.15,
                  y:
                    y +
                    (branch.upward ? -18 : 18) +
                    Math.sin(filament.phase + time * 0.002) * 4,
                },
              ];
              strokeFilament(
                tipPoints,
                filament.thickness * 0.7,
                filament.brightness * 0.7,
                true,
              );
            }
          }
          strokeFilament(
            points,
            filament.thickness * 2.2,
            filament.brightness * 0.35,
            false,
          );
          strokeFilament(
            points,
            filament.thickness,
            filament.brightness,
            true,
          );
        }
      });

      for (const spark of sparksRef.current) {
        const y =
          riverY(
            spark.x,
            mainY,
            time,
            filamentsRef.current[0] ?? {
              amp: 12,
              freq: 0.01,
              phase: 0,
              thickness: 1,
              brightness: 1,
              offsetY: 0,
              kind: "core",
            },
          ) + spark.yBias;
        const pulse =
          0.35 +
          0.65 *
            (0.5 +
              0.5 * Math.sin(time * 0.0025 + spark.phase));
        const radius = 1.2 + pulse * 2.2;
        const glow = ctx.createRadialGradient(spark.x, y, 0, spark.x, y, radius * 6);
        glow.addColorStop(0, `rgba(255, 240, 180, ${0.55 * pulse})`);
        glow.addColorStop(0.35, `rgba(255, 170, 60, ${0.22 * pulse})`);
        glow.addColorStop(1, "rgba(255, 120, 20, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(spark.x, y, radius * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 248, 220, ${0.65 * pulse})`;
        ctx.beginPath();
        ctx.arc(spark.x, y, radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      void frame;
    };
  }, [branches, height, mainY, width]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden
    />
  );
}
