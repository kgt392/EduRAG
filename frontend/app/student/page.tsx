// frontend/app/student/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BooksBackground from "../components/BooksBackground";

const API = "http://127.0.0.1:8000";

export default function StudentDashboard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/sessions/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          join_code: code.trim().toUpperCase(),
          student_name: name.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Unable to join session.");
        return;
      }

      localStorage.setItem("studentSession", JSON.stringify(data));
      router.push("/student/session");
    } catch {
      setError("Backend is not reachable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate min-h-screen text-white overflow-hidden">
      <BooksBackground />

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-emerald-200/80">
              STUDENT PORTAL
            </p>
            <h1 className="mt-2 text-4xl font-bold">
              <span className="bg-gradient-to-r from-emerald-200 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Student Dashboard
              </span>
            </h1>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-slate-950/60 backdrop-blur px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-300/40 hover:text-white"
          >
            ← Home
          </Link>
        </div>

        {/* Join a session */}
        <h2 className="mb-4 text-sm font-bold tracking-[0.25em]">
          <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]">
            JOIN A SESSION
          </span>
        </h2>

        <div className="relative rounded-2xl p-[1px] mb-10">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-600 opacity-25 blur-sm" />
          <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur p-8">
            <h3 className="text-xl font-semibold">Open-Book Session</h3>
            <p className="mt-2 text-slate-400">
              Enter your name and the class code from your teacher to access the
              permitted textbook material.
            </p>

            <form onSubmit={join} className="mt-6 flex flex-col sm:flex-row gap-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full sm:w-56 rounded-xl border border-white/10 bg-slate-900/70 px-5 py-3 text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
              />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                maxLength={6}
                className="w-full sm:w-44 rounded-xl border border-white/10 bg-slate-900/70 px-5 py-3 font-mono text-lg tracking-[0.25em] text-emerald-200 placeholder:text-slate-600 placeholder:tracking-[0.2em] outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 uppercase"
              />
              <button
                type="submit"
                disabled={!name.trim() || !code.trim() || loading}
                className="group relative rounded-xl p-[1px] transition-transform duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0"
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-600 opacity-60 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative flex items-center justify-center rounded-xl border border-white/10 bg-slate-950/80 px-8 py-3 font-semibold whitespace-nowrap">
                  {loading ? "Joining..." : "Join Session →"}
                </span>
              </button>
            </form>

            {error && (
              <p className="mt-4 text-sm text-rose-400">{error}</p>
            )}

            <p className="mt-4 text-xs text-slate-500">
              No code yet? Ask your teacher — they'll share it when the session opens.
            </p>
          </div>
        </div>

        {/* How it works */}
        <h2 className="mb-4 text-sm font-bold tracking-[0.25em]">
          <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]">
            HOW IT WORKS
          </span>
        </h2>

        <div className="grid gap-5 md:grid-cols-3">
          <InfoCard
            icon="🔑"
            title="Join with a code"
            description="Your teacher gives you a session code when class starts."
          />
          <InfoCard
            icon="📖"
            title="Ask the book"
            description="Ask questions and get answers only from the approved chapters."
          />
          <InfoCard
            icon="🛡️"
            title="Stay in bounds"
            description="Material outside the teacher's selection is locked during the session."
          />
        </div>
      </div>
    </main>
  );
}

function InfoCard({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-2xl p-[1px]">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-15 blur-sm" />
      <div className="relative h-full rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur p-6">
        <span className="text-2xl">{icon}</span>
        <h3 className="mt-3 font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}
