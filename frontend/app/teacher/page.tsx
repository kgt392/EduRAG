"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BooksBackground from "../components/BooksBackground";

const API = "http://localhost:8000";

type SessionInfo = {
  id: number;
  name: string;
  subject: string;
  join_code: string;
  locked: boolean;
  student_count: number;
};

export default function TeacherDashboard() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [books, setBooks] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, bRes] = await Promise.all([
          fetch(`${API}/sessions/`),
          fetch(`${API}/books/`),
        ]);
        if (sRes.ok) setSessions(await sRes.json());
        if (bRes.ok) setBooks((await bRes.json()).length);
        setOnline(sRes.ok || bRes.ok);
      } catch {
        setOnline(false); // backend not up yet — keep last values
      }
    };

    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  const totalStudents = sessions.reduce((n, s) => n + s.student_count, 0);

  return (
    <main className="relative isolate min-h-screen text-white overflow-hidden">
      <BooksBackground />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-emerald-200/80">
              TEACHER PORTAL
            </p>
            <h1 className="mt-2 text-4xl font-bold">
              <span className="bg-gradient-to-r from-emerald-200 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Teacher Dashboard
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 backdrop-blur px-3 py-1.5 text-xs text-slate-300">
              <span
                className={`h-2 w-2 rounded-full ${
                  online ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
                }`}
              />
              {online ? "Backend connected" : "Backend offline"}
            </span>
            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-slate-950/60 backdrop-blur px-4 py-2 text-sm text-slate-300 transition hover:border-amber-300/40 hover:text-white"
            >
              ← Home
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-5 md:grid-cols-3 mb-10">
          <StatCard title="Books" value={books} icon="📚" accent="from-amber-400 to-orange-500" />
          <StatCard title="Active Sessions" value={sessions.length} icon="📝" accent="from-cyan-400 to-blue-500" />
          <StatCard title="Students Online" value={totalStudents} icon="🧑‍🎓" accent="from-emerald-400 to-teal-500" />
        </div>

        {/* Actions */}
        <h2 className="mb-4 text-sm font-bold tracking-[0.25em]">
        <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]">
            QUICK ACTIONS
          </span>
        </h2>
        <div className="grid gap-5 md:grid-cols-2 mb-12">
          <ActionCard
            href="/teacher/upload"
            icon="📖"
            title="Upload Book"
            description="Upload and process a textbook for retrieval."
            accent="from-amber-500 to-orange-600"
          />
          <ActionCard
            href="/teacher/session"
            icon="🔒"
            title="Create Session"
            description="Create and lock a controlled open-book session."
            accent="from-emerald-400 to-teal-600"
          />
        </div>

        {/* Live sessions */}
        <h2 className="mb-4 text-sm font-bold tracking-[0.25em]"> 
          <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]">
            LIVE SESSIONS
          </span>
        </h2>
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 backdrop-blur p-10 text-center text-slate-500">
            No sessions yet — create one to get a join code for your class.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="group relative rounded-2xl p-[1px]"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 opacity-20 blur-sm transition-opacity duration-300 group-hover:opacity-60" />
                <div className="relative flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{s.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                          s.locked
                            ? "bg-rose-500/15 text-rose-300"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {s.locked ? "LOCKED" : "OPEN"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {s.subject} · {s.student_count} student{s.student_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <JoinCode code={s.join_code} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ title, value, icon, accent }: {
  title: string;
  value: number;
  icon: string;
  accent: string;
}) {
  return (
    <div className="relative rounded-2xl p-[1px]">
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${accent} opacity-25 blur-sm`} />
      <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">{title}</p>
          <span className="text-xl">{icon}</span>
        </div>
        <p className="mt-2 text-4xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function ActionCard({ href, icon, title, description, accent }: {
  href: string;
  icon: string;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group relative rounded-2xl p-[1px] transition-transform duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.02] active:scale-95"
    >
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${accent} opacity-40 blur-sm transition-all duration-300 group-hover:opacity-100 group-hover:blur-md`}
      />
      <div className="relative h-full rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur p-6">
        <span className="text-2xl">{icon}</span>
        <h2 className="mt-3 text-lg font-semibold">{title}</h2>
        <p className="mt-1.5 text-sm text-slate-400">{description}</p>
        <span className="mt-4 inline-block text-sm text-cyan-300 transition-transform duration-300 group-hover:translate-x-1">
          Open →
        </span>
      </div>
    </Link>
  );
}

function JoinCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable — nothing to do
    }
  };

  return (
    <button
      onClick={copy}
      title="Copy join code"
      className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-2 font-mono text-lg tracking-[0.2em] text-amber-200 transition hover:bg-amber-500/20 active:scale-95"
    >
      {copied ? "Copied!" : code}
    </button>
  );
}
