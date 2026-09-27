"use client";

import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function StudentSession() {
  const [student, setStudent] = useState("");
  const [sessionId, setSessionId] =
    useState<number | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [subject, setSubject] = useState("");
  const [chapters, setChapters] = useState<any[]>([]);
  const [warnings, setWarnings] = useState(0);

  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const saved =
      localStorage.getItem("studentSession");

    if (!saved) return;

    const data = JSON.parse(saved);

    setStudent(data.student_name);
    setSessionId(data.session_id);
    setSessionName(data.session_name);
    setSubject(data.subject || "");
    setChapters(data.chapters || []);
  }, []);

  async function logActivity(
    eventType: string,
    details: string
  ) {
    if (!sessionId || !student || ended) return;

    try {
      await fetch(
        `${API}/sessions/${sessionId}/activity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_name: student,
            event_type: eventType,
            details,
          }),
          keepalive: true,
        }
      );

      setWarnings((value) => value + 1);
    } catch {}
  }

  useEffect(() => {
    if (!sessionId || !student) return;

    const visibilityHandler = () => {
      if (document.hidden) {
        logActivity(
          "TAB_SWITCH",
          "Student changed browser tab."
        );
      }
    };

    const blurHandler = () => {
      logActivity(
        "WINDOW_BLUR",
        "Student left the browser window."
      );
    };

    const fullscreenHandler = () => {
      if (!document.fullscreenElement) {
        logActivity(
          "FULLSCREEN_EXIT",
          "Student exited fullscreen."
        );
      }
    };

    const unloadHandler = () => {
      fetch(
        `${API}/sessions/${sessionId}/leave`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_name: student,
            event_type: "SESSION_EXIT",
            details: "Student left or closed the session.",
          }),
          keepalive: true,
        }
      );
    };

    document.addEventListener(
      "visibilitychange",
      visibilityHandler
    );

    window.addEventListener(
      "blur",
      blurHandler
    );

    document.addEventListener(
      "fullscreenchange",
      fullscreenHandler
    );

    window.addEventListener(
      "beforeunload",
      unloadHandler
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        visibilityHandler
      );

      window.removeEventListener(
        "blur",
        blurHandler
      );

      document.removeEventListener(
        "fullscreenchange",
        fullscreenHandler
      );

      window.removeEventListener(
        "beforeunload",
        unloadHandler
      );
    };
  }, [sessionId, student, ended]);

  useEffect(() => {
    if (!sessionId) return;

    const checkSession = async () => {
      const response = await fetch(
        `${API}/sessions/${sessionId}`
      );

      if (!response.ok) return;

      const data = await response.json();

      if (data.ended) {
        setEnded(true);
      }
    };

    checkSession();

    const interval = setInterval(
      checkSession,
      5000
    );

    return () => clearInterval(interval);
  }, [sessionId]);

  async function searchApprovedMaterial() {
    if (!query.trim() || !sessionId) return;

    setSearching(true);
    setAnswer("");
    setSource(null);

    try {
      const response = await fetch(
        `${API}/sessions/${sessionId}/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_name: student,
            query,
          }),
        }
      );

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

    await fetch(
      `${API}/sessions/${sessionId}/leave`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_name: student,
          event_type: "SESSION_EXIT",
          details: "Student clicked Leave Session.",
        }),
      }
    );

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
      <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center p-8">
        <div className="max-w-lg text-center bg-slate-900 border border-slate-800 rounded-2xl p-10">
          <div className="text-5xl">✓</div>
          <h1 className="text-3xl font-bold mt-5">
            Session Ended
          </h1>
          <p className="text-slate-400 mt-3">
            Your teacher has ended this session.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-5">
          <div>
            <p className="text-emerald-400 text-sm font-semibold tracking-widest">
              CONTROLLED SESSION
            </p>

            <h1 className="text-3xl font-bold mt-2">
              {sessionName}
            </h1>

            <p className="text-slate-400 mt-2">
              {subject} · Student: {student}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl">
              <p className="text-xs text-slate-500">
                ACTIVITY WARNINGS
              </p>
              <p className="text-xl font-bold text-yellow-400">
                {warnings}
              </p>
            </div>

            <button
              onClick={leaveSession}
              className="px-4 py-3 bg-slate-800 rounded-xl hover:bg-slate-700"
            >
              Leave
            </button>
          </div>
        </div>

        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Approved Material
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                Only teacher-selected material can be searched.
              </p>
            </div>

            <button
              onClick={fullscreen}
              className="px-4 py-2 rounded-lg bg-indigo-600"
            >
              Enter Fullscreen
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            {chapters.map((chapter) => (
              <span
                key={chapter.id}
                className="px-3 py-2 bg-slate-800 rounded-lg text-sm"
              >
                Ch. {chapter.chapter_number}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold">
            Ask the approved material
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            EduRAG returns the single highest-ranked grounded result.
          </p>

          <div className="flex gap-3 mt-5">
            <input
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchApprovedMaterial();
                }
              }}
              placeholder="e.g. What is an ad hoc wireless network?"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
            />

            <button
              onClick={searchApprovedMaterial}
              disabled={searching}
              className="px-6 py-3 bg-emerald-600 rounded-xl font-semibold disabled:bg-slate-700"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {answer && (
            <div className="mt-8">
              <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-900 rounded-2xl p-7">
                <p className="text-xs uppercase tracking-widest text-indigo-300 font-semibold">
                  Grounded Answer
                </p>

                <p className="text-lg leading-8 mt-4 text-slate-100">
                  {answer}
                </p>
              </div>

              {source && (
                <div className="mt-4 bg-slate-800/70 rounded-xl p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <span className="text-emerald-400">
                      Source: Page {source.page}
                    </span>

                    <span className="text-slate-500">
                      Relevance: {source.score.toFixed(3)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 mt-2">
                    {source.chapter_title}
                  </p>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-slate-400">
                      View source excerpt
                    </summary>

                    <p className="mt-3 whitespace-pre-line text-sm text-slate-300">
                      {source.source_text}
                    </p>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
