// frontend/app/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import BooksBackground from "./components/BooksBackground";

/* ---------- Draggable open book (right side) ---------- */

function DraggableBook() {
  // 0 = fully closed, 1 = fully open
  const [open, setOpen] = useState(0.12);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startOpen = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startOpen.current = open;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [open]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = (startX.current - e.clientX) / 220; // drag left = open
    setOpen(Math.max(0, Math.min(1, startOpen.current + delta)));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    // snap toward the nearer state
    setOpen((o) => (o > 0.5 ? 1 : o < 0.15 ? 0.12 : o));
  }, []);

  const coverAngle = -open * 165; // degrees the front cover rotates
  const pageAngle = -open * 150;
  const flipTransition = "transform 0.5s cubic-bezier(.2,.8,.3,1)";

  return (
    <div
      className="select-none touch-none cursor-grab active:cursor-grabbing"
      style={{ perspective: "1400px" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="relative"
        style={{
          width: 260,
          height: 360,
          transformStyle: "preserve-3d",
          transform: `translateX(${open * 130}px) rotateX(10deg) rotateY(-14deg)`,
          transition: dragging.current
            ? "none"
            : "transform 0.5s cubic-bezier(.2,.8,.3,1)",
        }}
      >
        {/* back cover + page block */}
        <div
          className="absolute inset-0 rounded-r-lg rounded-l-sm"
          style={{
            background: "linear-gradient(135deg, #7c2d12, #9a3412)",
            boxShadow: "0 30px 60px rgba(0,0,0,0.55)",
            transform: "translateZ(-14px)",
          }}
        />
        <div
          className="absolute rounded-r-md"
          style={{
            inset: "6px 6px 6px 10px",
            background:
              "repeating-linear-gradient(90deg, #f5efe0 0px, #e8e0cc 2px, #f5efe0 4px)",
            transform: "translateZ(-7px)",
          }}
        />

        {/* open right page (visible once the book opens) */}
        <div
          className="absolute flex flex-col gap-3 p-6 rounded-r-md"
          style={{
            inset: "6px 6px 6px 10px",
            background: "#faf6ea",
            transform: "translateZ(-6px)",
            opacity: open > 0.25 ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        >
          <div className="h-3 w-3/4 rounded bg-amber-900/20" />
          <div className="h-2 w-full rounded bg-slate-400/30" />
          <div className="h-2 w-full rounded bg-slate-400/30" />
          <div className="h-2 w-5/6 rounded bg-slate-400/30" />
          <div className="h-2 w-full rounded bg-slate-400/30" />
          <div className="h-2 w-2/3 rounded bg-slate-400/30" />
          <div className="mt-auto text-center text-[10px] tracking-widest text-amber-900/40">
            APPROVED MATERIAL ONLY
          </div>
        </div>

        {/* turning inner page — two-sided so it stays visible past 90° */}
        <div
          className="absolute"
          style={{
            inset: "6px 6px 6px 10px",
            transformOrigin: "left center",
            transformStyle: "preserve-3d",
            transform: `rotateY(${pageAngle}deg)`,
            transition: dragging.current ? "none" : flipTransition,
          }}
        >
          {/* front of the page (faces right while closed) */}
          <div
            className="absolute inset-0 rounded-r-md"
            style={{
              background: "#fdf9ee",
              backfaceVisibility: "hidden",
              boxShadow: open > 0.05 ? "8px 0 18px rgba(0,0,0,0.15)" : "none",
            }}
          />
          {/* back of the page (becomes the LEFT page when flipped) */}
          <div
            className="absolute inset-0 rounded-l-md flex flex-col gap-3 p-6"
            style={{
              background: "#f7f2e3",
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
            }}
          >
            <div className="h-3 w-2/3 rounded bg-amber-900/20" />
            <div className="h-2 w-full rounded bg-slate-400/30" />
            <div className="h-2 w-5/6 rounded bg-slate-400/30" />
            <div className="h-2 w-full rounded bg-slate-400/30" />
            <div className="h-2 w-3/4 rounded bg-slate-400/30" />
            <div className="h-2 w-full rounded bg-slate-400/30" />
            <div className="h-2 w-1/2 rounded bg-slate-400/30" />
          </div>
        </div>

        {/* front cover — two-sided so its inside shows when opened */}
        <div
          className="absolute inset-0"
          style={{
            transformOrigin: "left center",
            transformStyle: "preserve-3d",
            transform: `rotateY(${coverAngle}deg)`,
            transition: dragging.current ? "none" : flipTransition,
          }}
        >
          {/* outside of the cover */}
          <div
            className="absolute inset-0 rounded-r-lg rounded-l-sm flex flex-col items-center justify-center gap-3"
            style={{
              background: "linear-gradient(135deg, #b45309, #92400e 60%, #7c2d12)",
              backfaceVisibility: "hidden",
              boxShadow:
                "inset 0 0 40px rgba(0,0,0,0.35), 10px 10px 30px rgba(0,0,0,0.4)",
            }}
          >
            <div className="rounded border border-amber-200/40 px-5 py-4 text-center">
              <div className="text-amber-100 font-bold text-2xl tracking-wide">EduRag</div>
            </div>
          </div>
          {/* inside of the cover (visible on the left once opened) */}
          <div
            className="absolute inset-0 rounded-l-lg rounded-r-sm"
            style={{
              background: "linear-gradient(225deg, #8a3a12, #6d2810 60%, #571f0d)",
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.4)",
            }}
          >
            <div
              className="absolute rounded-md"
              style={{
                inset: "10px",
                background:
                  "repeating-linear-gradient(45deg, #f1ead6 0px, #ece3cb 6px, #f1ead6 12px)",
                opacity: 0.9,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function Home() {
  return (
    <main className="relative isolate min-h-screen text-white overflow-hidden">
      <BooksBackground />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row items-center justify-center gap-12 px-6 py-16">
        {/* Left: heading + role buttons — all centered */}
        <div className="flex w-full max-w-2xl flex-col items-center text-center">
          <p className="whitespace-nowrap text-base md:text-lg lg:text-xl font-semibold tracking-[0.3em] text-amber-100/90 drop-shadow-[0_0_12px_rgba(255,200,120,0.25)]">
            CONTROLLED OPEN-BOOK LEARNING
          </p>

          <h1 className="text-6xl md:text-7xl font-bold mt-5 leading-tight">
            <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-rose-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,170,90,0.3)]">
              EduRag
            </span>
          </h1>

          <div className="flex flex-col sm:flex-row gap-5 items-center justify-center mt-12">
            <PopButton
              href="/teacher"
              title="I'm a Teacher"
              description="Upload books, manage chapters, run sessions"
              accent="from-cyan-500 to-blue-600"
            />
            <PopButton
              href="/student"
              title="I'm a Student"
              description="Join a session with your class code"
              accent="from-emerald-400 to-teal-600"
            />
          </div>
        </div>

        {/* Right: interactive book */}
        <div className="hidden md:flex w-[560px] shrink-0 items-center justify-center pl-24">
          <DraggableBook />
        </div>
      </div>
    </main>
  );
}

function PopButton({ href, title, description, accent }: {
  href: string;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group relative w-full sm:w-64 rounded-2xl p-[1px] transition-transform duration-300 ease-out hover:-translate-y-2 hover:scale-[1.03] active:scale-95"
    >
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${accent} opacity-40 blur-sm transition-opacity duration-300 group-hover:opacity-100 group-hover:blur-md`}
      />
      <div className="relative rounded-2xl bg-slate-950/80 backdrop-blur border border-white/10 p-6 text-left">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-slate-400 text-sm mt-2">{description}</p>
        <span className="inline-block mt-4 text-sm text-cyan-300 transition-transform duration-300 group-hover:translate-x-1">
          Enter →
        </span>
      </div>
    </Link>
  );
}
