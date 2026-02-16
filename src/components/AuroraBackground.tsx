"use client";

import { useEffect, useRef, useCallback } from "react";

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cellSize = 48; // square cells
  const ripples = useRef<{ cx: number; cy: number; t: number }[]>([]);
  const mouse = useRef<{ x: number; y: number }>({ x: -1, y: -1 });
  const raf = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cols = Math.ceil(w / cellSize);
    const rows = Math.ceil(h / cellSize);
    const now = performance.now();

    ctx.clearRect(0, 0, w, h);

    // Draw grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const x = c * cellSize;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let r = 0; r <= rows; r++) {
      const y = r * cellSize;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Hover highlight
    const mx = mouse.current.x;
    const my = mouse.current.y;
    if (mx >= 0 && my >= 0) {
      const hc = Math.floor(mx / cellSize);
      const hr = Math.floor(my / cellSize);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(hc * cellSize, hr * cellSize, cellSize, cellSize);
    }

    // Ripples
    ripples.current = ripples.current.filter((r) => now - r.t < 1200);
    for (const ripple of ripples.current) {
      const elapsed = now - ripple.t;
      const maxDist = 12; // cells
      const speed = 0.012; // cells per ms

      const rcCol = Math.floor(ripple.cx / cellSize);
      const rcRow = Math.floor(ripple.cy / cellSize);

      const radius = elapsed * speed;

      for (let dr = -maxDist; dr <= maxDist; dr++) {
        for (let dc = -maxDist; dc <= maxDist; dc++) {
          const dist = Math.sqrt(dr * dr + dc * dc);
          if (dist > radius || dist < radius - 2) continue;
          const alpha = Math.max(0, 0.25 - dist * 0.02) * (1 - elapsed / 1200);
          if (alpha <= 0) continue;
          const cr = rcRow + dr;
          const cc = rcCol + dc;
          if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue;
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fillRect(cc * cellSize, cr * cellSize, cellSize, cellSize);
        }
      }
    }

    raf.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      mouse.current = { x: -1, y: -1 };
    };
    const onClick = (e: MouseEvent) => {
      ripples.current.push({ cx: e.clientX, cy: e.clientY, t: performance.now() });
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("click", onClick);

    raf.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("click", onClick);
      cancelAnimationFrame(raf.current);
    };
  }, [draw]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-pointer" />

      {/* Fade overlays */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, #0a0a0a)" }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: "linear-gradient(to top, transparent, #0a0a0a)" }}
      />
      <div
        className="absolute inset-y-0 left-0 w-24 pointer-events-none"
        style={{ background: "linear-gradient(to left, transparent, #0a0a0a)" }}
      />
      <div
        className="absolute inset-y-0 right-0 w-24 pointer-events-none"
        style={{ background: "linear-gradient(to right, transparent, #0a0a0a)" }}
      />
    </div>
  );
}
