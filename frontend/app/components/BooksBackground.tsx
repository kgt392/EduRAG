// frontend/app/components/BooksBackground.tsx
"use client";

import { useEffect, useRef } from "react";

type Book = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  hue: number;
  depth: number;
};

export default function BooksBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    const onLeave = () => {
      mouse.current.x = -9999;
      mouse.current.y = -9999;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    const count = Math.min(28, Math.floor(window.innerWidth / 55));
    const books: Book[] = Array.from({ length: count }, () => {
      const depth = 0.3 + Math.random() * 0.7;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        w: 26 * depth + Math.random() * 14,
        h: 36 * depth + Math.random() * 18,
        vx: (Math.random() - 0.5) * 0.35 * depth,
        vy: (Math.random() - 0.5) * 0.35 * depth,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.004,
        hue: [28, 200, 160, 340, 260][Math.floor(Math.random() * 5)],
        depth,
      };
    });

    const drawBook = (b: Book) => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      const alpha = 0.14 + b.depth * 0.22;

      ctx.fillStyle = `hsla(${b.hue}, 55%, 55%, ${alpha})`;
      ctx.beginPath();
      ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 3);
      ctx.fill();

      ctx.fillStyle = `hsla(${b.hue}, 60%, 35%, ${alpha + 0.08})`;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w * 0.16, b.h);

      ctx.fillStyle = `rgba(240, 236, 220, ${alpha * 0.9})`;
      ctx.fillRect(b.w / 2 - b.w * 0.1, -b.h / 2 + 2, b.w * 0.08, b.h - 4);

      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`;
      ctx.fillRect(-b.w * 0.14, -b.h * 0.28, b.w * 0.42, 2);
      ctx.restore();
    };

    const step = () => {
      const w = canvas.width;
      const h = canvas.height;

      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0b1c2c");
      g.addColorStop(0.6, "#071522");
      g.addColorStop(1, "#040d16");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const glow = ctx.createRadialGradient(w * 0.3, h * 0.45, 0, w * 0.3, h * 0.45, Math.min(w, h) * 0.6);
      glow.addColorStop(0, "rgba(255, 180, 90, 0.05)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      for (const b of books) {
        const dx = b.x - mouse.current.x;
        const dy = b.y - mouse.current.y;
        const d2 = dx * dx + dy * dy;
        const radius = 160;
        if (d2 < radius * radius && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = ((radius - d) / radius) * 0.6 * b.depth;
          b.vx += (dx / d) * f;
          b.vy += (dy / d) * f;
          b.vrot += (dx / d) * 0.001;
        }

        b.vx = Math.max(-1.5, Math.min(1.5, b.vx)) * 0.985;
        b.vy = Math.max(-1.5, Math.min(1.5, b.vy)) * 0.985;
        b.vrot *= 0.99;

        b.x += b.vx;
        b.y += b.vy - 0.08 * b.depth;
        b.rot += b.vrot + 0.0015;

        if (b.x < -60) b.x = w + 60;
        if (b.x > w + 60) b.x = -60;
        if (b.y < -60) b.y = h + 60;
        if (b.y > h + 60) b.y = -60;

        drawBook(b);
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas ref={ref} className="fixed inset-0 -z-10 h-full w-full" aria-hidden />
  );
}
