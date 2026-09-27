"use client";

import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

type Book = {
  id: number;
  title: string;
  subject: string;
};

type Chapter = {
  id: number;
  chapter_number: number;
  title: string;
};

type Session = {
  id: number;
  name: string;
  subject: string;
  join_code: string;
  locked: boolean;
  ended: boolean;
  student_count: number;
};

export default function SessionManager() {
  const [teacher, setTeacher] = useState("Teacher");
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const [bookId, setBookId] = useState<number | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [name, setName] = useState("DBMS Open Book Session");
  const [subject, setSubject] = useState("DBMS");

  const [selectedSession, setSelectedSession] =
    useState<Session | null>(null);

  useEffect(() => {
    const savedTeacher =
      localStorage.getItem("teacherName");

    if (savedTeacher) {
      setTeacher(savedTeacher);
    }

    loadBooks();
    loadSessions();
  }, []);

  useEffect(() => {
    if (bookId === null) return;

    fetch(`${API}/books/${bookId}/chapters`)
      .then((res) => res.json())
      .then((data) => {
        setChapters(data);
        setSelectedChapters([]);
      });

    const selectedBook = books.find(
      (book) => book.id === bookId
    );

    if (selectedBook) {
      setSubject(selectedBook.subject);
    }
  }, [bookId, books]);

  async function loadBooks() {
    const response = await fetch(`${API}/books/`);
    const data = await response.json();

    setBooks(data);

    if (data.length > 0) {
      setBookId(data[0].id);
    }
  }

  async function loadSessions() {
    const response = await fetch(`${API}/sessions/`);
    const data = await response.json();
    setSessions(data);
  }

  function toggleChapter(id: number) {
    setSelectedChapters((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  }

  async function createSession() {
    if (!bookId || selectedChapters.length === 0) {
      alert("Select a book and at least one chapter.");
      return;
    }

    localStorage.setItem(
      "teacherName",
      teacher
    );

    const response = await fetch(
      `${API}/sessions/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          subject,
          teacher_name: teacher,
          chapter_ids: selectedChapters,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "Failed to create session.");
      return;
    }

    alert(`Session created. Join code: ${data.join_code}`);

    setSelectedChapters([]);
    await loadSessions();
  }

  async function lockSession(session: Session) {
    await fetch(
      `${API}/sessions/${session.id}/lock`,
      {
        method: "POST",
      }
    );

    await loadSessions();
  }

  async function endSession(session: Session) {
    const confirmed = confirm(
      `End "${session.name}"? Students will no longer be able to use it.`
    );

    if (!confirmed) return;

    await fetch(
      `${API}/sessions/${session.id}/end`,
      {
        method: "POST",
      }
    );

    await loadSessions();
  }

  async function viewActivities(session: Session) {
    setSelectedSession(session);

    const response = await fetch(
      `${API}/sessions/${session.id}/activities`
    );

    setActivities(await response.json());
  }

  useEffect(() => {
    if (!selectedSession) return;

    const interval = setInterval(
      () => viewActivities(selectedSession),
      3000
    );

    return () => clearInterval(interval);
  }, [selectedSession]);

  return (
    <main className="min-h-screen bg-[#07111f] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <p className="text-indigo-400 text-sm font-semibold tracking-widest">
              TEACHER CONTROL CENTER
            </p>

            <h1 className="text-4xl font-bold mt-2">
              Sessions
            </h1>

            <p className="text-slate-400 mt-2">
              Teacher: {teacher}
            </p>
          </div>

          <a
            href="/teacher"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700"
          >
            ← Dashboard
          </a>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 mt-10">
          <section className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold">
              Create Session
            </h2>

            <label className="block mt-5 text-sm text-slate-400">
              Teacher name
            </label>

            <input
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              className="w-full mt-2 bg-slate-800 rounded-lg px-4 py-3"
            />

            <label className="block mt-4 text-sm text-slate-400">
              Session name
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-2 bg-slate-800 rounded-lg px-4 py-3"
            />

            <label className="block mt-4 text-sm text-slate-400">
              Book
            </label>

            <select
              value={bookId ?? ""}
              onChange={(e) =>
                setBookId(Number(e.target.value))
              }
              className="w-full mt-2 bg-slate-800 rounded-lg px-4 py-3"
            >
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>

            <label className="block mt-4 text-sm text-slate-400">
              Subject
            </label>

            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full mt-2 bg-slate-800 rounded-lg px-4 py-3"
            />

            <div className="mt-5">
              <p className="text-sm text-slate-400">
                Allowed chapters
              </p>

              <div className="mt-3 space-y-2 max-h-64 overflow-auto">
                {chapters.map((chapter) => (
                  <label
                    key={chapter.id}
                    className="flex gap-3 items-center bg-slate-800 rounded-lg p-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedChapters.includes(
                        chapter.id
                      )}
                      onChange={() =>
                        toggleChapter(chapter.id)
                      }
                    />

                    <span>
                      Chapter {chapter.chapter_number}
                      {" — "}
                      {chapter.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={createSession}
              className="w-full mt-6 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
            >
              Create Session
            </button>
          </section>

          <section className="lg:col-span-3">
            <h2 className="text-xl font-semibold">
              Your Sessions
            </h2>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {session.name}
                      </p>

                      <p className="text-sm text-slate-500 mt-1">
                        {session.subject}
                      </p>
                    </div>

                    <span
                      className={`text-xs px-2 py-1 rounded-full h-fit ${
                        session.ended
                          ? "bg-slate-700 text-slate-300"
                          : session.locked
                          ? "bg-red-950 text-red-300"
                          : "bg-emerald-950 text-emerald-300"
                      }`}
                    >
                      {session.ended
                        ? "ENDED"
                        : session.locked
                        ? "LOCKED"
                        : "OPEN"}
                    </span>
                  </div>

                  <div className="mt-5 bg-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-500">
                      JOIN CODE
                    </p>
                    <p className="text-3xl tracking-widest font-bold mt-1">
                      {session.join_code}
                    </p>
                  </div>

                  <p className="text-sm text-slate-400 mt-4">
                    Students joined:{" "}
                    <span className="text-white font-semibold">
                      {session.student_count}
                    </span>
                  </p>

                  <div className="flex flex-wrap gap-2 mt-5">
                    {!session.locked &&
                      !session.ended && (
                        <button
                          onClick={() =>
                            lockSession(session)
                          }
                          className="px-3 py-2 rounded-lg bg-red-600"
                        >
                          Lock
                        </button>
                      )}

                    {!session.ended && (
                      <button
                        onClick={() =>
                          endSession(session)
                        }
                        className="px-3 py-2 rounded-lg bg-slate-700"
                      >
                        End Session
                      </button>
                    )}

                    <button
                      onClick={() =>
                        viewActivities(session)
                      }
                      className="px-3 py-2 rounded-lg bg-indigo-600"
                    >
                      Activity
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {selectedSession && (
          <section className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">
                  Activity — {selectedSession.name}
                </h2>

                <p className="text-slate-500 mt-1">
                  Updates automatically
                </p>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="text-slate-500 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {activities.length === 0 && (
                <p className="text-slate-500">
                  No activity yet.
                </p>
              )}

              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex justify-between gap-4 bg-slate-800 rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">
                      {activity.student_name}
                    </p>
                    <p className="text-sm text-slate-400">
                      {activity.event_type}
                    </p>
                  </div>

                  <p className="text-xs text-slate-500">
                    {activity.details}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
