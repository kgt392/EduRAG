"use client";

import { useEffect, useState } from "react";
import BooksBackground from "../../components/BooksBackground";

const API = "http://127.0.0.1:8000";

export default function StudentSession() {
  const [student, setStudent] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [subject, setSubject] = useState("");
  const [chapters, setChapters] = useState<any[]>([]);
  const [warnings, setWarnings] = useState(0);

  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const [ended, setEnded] = useState(false);

  // Strip a leading "DBMS" (or "DBMS -", "DBMS:") from the session name for display.
  const displayName = sessionName.replace(/^\s*DBMS[\s:–-]*/i, "");

  useEffect(() => {
    const saved = localStorage.getItem("studentSession");
    if (!saved) return;

    const data = JSON.parse(saved);
    setStudent(data.student_name);
    setSessionId(data.session_id);
    setSessionName(data.session_name);
    setSubject(data.subject || "");
    setChapters(data.chapters || []);
  }, []);

  async function logActivity(eventType: string, details: string) {
    if (!sessionId || !student || ended) return;

    try {
      await fetch(`${API}/sessions/${sessionId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: student,
          event_type: eventType,
          details,
        }),
        keepalive: true,
      });

      setWarnings((value) => value + 1);
    } catch {}
  }

  useEffect(() => {
    if (!sessionId || !student) return;

    const visibilityHandler = () => {
      if (document.hidden) {
        logActivity("TAB_SWITCH", "Student changed browser tab.");
      }
    };

    const blurHandler = () => {
      logActivity("WINDOW_BLUR", "Student left the browser window.");
    };

    const fullscreenHandler = () => {
      if (!document.fullscreenElement) {
        logActivity("FULLSCREEN_EXIT", "Student exited fullscreen.");
      }
    };

    const unloadHandler = () => {
      fetch(`${API}/sessions/${sessionId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: student,
          event_type: "SESSION_EXIT",
          details: "Student left or closed the session.",
        }),
        keepalive: true,
      });
    };

    document.addEventListener("visibilitychange", visibilityHandler);
    window.addEventListener("blur", blurHandler);
    document.addEventListener("fullscreenchange", fullscreenHandler);
    window.addEventListener("beforeunload", unloadHandler);

    return () => {
      document.removeEventListener("visibilitychange", visibilityHandler);
      window.removeEventListener("blur", blurHandler);
      document.removeEventListener("fullscreenchange", fullscreenHandler);
      window.removeEventListener("beforeunload", unloadHandler);
    };
  }, [sessionId, student, ended]);

  useEffect(() => {
    if (!sessionId) return;

    const checkSession = async () => {
      const response = await fetch(`${API}/sessions/${sessionId}`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.ended) setEnded(true);
    };

    checkSession();
    const interval = setInterval(checkSession, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  async function searchApprovedMaterial() {
    if (!query.trim() || !sessionId) return;

    setSearching(true);
    setAnswer("");
    setSource(null);

    try {
      const response = await fetch(`${API}/sessions/${sessionId}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_name: student, query }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAnswer(data.detail || "Search failed.");
        return;
      }

      setAnswer(data.answer);
      setSource(data.result);
    } finally {
      setSearching(false);
    }
  }

  async function leaveSession() {
    if (!sessionId) return;

    await fetch(`${API}/sessions/${sessionId}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_name: student,
        event_type: "SESSION_EXIT",
        details: "Student clicked Leave Session.",
      }),
    });

    localStorage.removeItem("studentSession");
    window.location.href = "/student";
  }

  async function fullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {}
  }

  if (ended) {
    return (
      <main className="relative isolate min-h-screen text-white overflow-hidden flex items-center justify-center p-8">
        <BooksBackground />
        <div className="relative w-full max-w-lg rounded-2xl p-[1px]">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-600 opacity-30 blur-sm" />
          <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-3xl text-emerald-300">
              ✓
            </div>
            <h1 className="mt-5 text-3xl font-bold">
              <span className="bg-gradient-to-r from-emerald-200 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Session Ended
              </span>
            </h1>
            <p className="mt-3 text-slate-400">
              Your teacher has ended this session.
            </p>
            <a
              href="/student"
              className="mt-6 inline-block rounded-xl border border-white/10 bg-slate-900/70 px-6 py-3 text-sm text-slate-300 transition hover:border-emerald-300/40 hover:text-white"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate min-h-screen text-white overflow-hidden">
      <BooksBackground />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between gap-5 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-emerald-200/80">
              CONTROLLED SESSION
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-emerald-200 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                {displayName}
              </span>
            </h1>
            <p className="mt-2 text-slate-400">
              {subject} · Student:{" "}
              <span className="text-slate-200">{student}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/70 backdrop-blur px-4 py-3">
              <p className="text-[10px] font-semibold tracking-widest text-slate-500">
                ACTIVITY WARNINGS
              </p>
              <p
                className={`text-xl font-bold tabular-nums ${
                  warnings > 0 ? "text-amber-300" : "text-emerald-300"
                }`}
              >
                {warnings}
              </p>
            </div>

            <button
              onClick={leaveSession}
              className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-5 py-3 font-semibold text-rose-300 transition hover:bg-rose-500/20 active:scale-95"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Approved material */}
        <h2 className="mb-4 text-sm font-bold tracking-[0.25em]">
          <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]">
            APPROVED MATERIAL
          </span>
        </h2>

        <div className="relative rounded-2xl p-[1px] mb-10">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-20 blur-sm" />
          <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur p-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <p className="text-sm text-slate-400">
                Only teacher-selected material can be searched during this
                session.
              </p>

              <button
                onClick={fullscreen}
                className="group relative shrink-0 rounded-xl p-[1px] transition-transform duration-300 hover:-translate-y-0.5 active:scale-95"
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 opacity-50 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/80 px-5 py-2.5 text-sm font-semibold">
                  ⛶ Enter Fullscreen
                </span>
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {chapters.map((chapter) => (
                <span
                  key={chapter.id}
                  className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200"
                >
                  Ch. {chapter.chapter_number}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <h2 className="mb-4 text-sm font-bold tracking-[0.25em]">
          <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]">
            ASK THE APPROVED MATERIAL
          </span>
        </h2>

        <div className="relative rounded-2xl p-[1px]">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-600 opacity-20 blur-sm" />
          <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur p-6">
            <p className="text-sm text-slate-500">
              EduRAG returns the single highest-ranked grounded result.
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchApprovedMaterial();
                }}
                placeholder="e.g. What is an ad hoc wireless network?"
                className="flex-1 rounded-xl border border-white/10 bg-slate-900/70 px-5 py-3 text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
              />

              <button
                onClick={searchApprovedMaterial}
                disabled={searching || !query.trim()}
                className="group relative rounded-xl p-[1px] transition-transform duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0"
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-600 opacity-60 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative flex items-center justify-center rounded-xl border border-white/10 bg-slate-950/80 px-8 py-3 font-semibold whitespace-nowrap">
                  {searching ? "Searching..." : "Search →"}
                </span>
              </button>
            </div>

            {answer && (
              <div className="mt-8">
                <div className="relative rounded-2xl p-[1px]">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 opacity-30 blur-sm" />
                  <div className="relative rounded-2xl border border-white/10 bg-slate-950/90 backdrop-blur p-7">
                    <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                      Grounded Answer
                    </p>
                    <p className="mt-4 text-lg leading-8 text-slate-100">
                      {answer}
                    </p>
                  </div>
                </div>

                {source && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur p-5">
                    <div className="flex flex-wrap justify-between gap-3 text-sm">
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-medium text-emerald-300">
                        Source: Page {source.page}
                      </span>
                      <span className="text-slate-500">
                        Relevance: {source.score.toFixed(3)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-400">
                      {source.chapter_title}
                    </p>

                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-cyan-300 transition hover:text-cyan-200">
                        View source excerpt
                      </summary>
                      <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
                        {source.source_text}
                      </p>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
