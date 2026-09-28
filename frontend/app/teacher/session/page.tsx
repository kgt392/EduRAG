// "use client";

// import { useEffect, useState } from "react";

// const API = "http://127.0.0.1:8000";

// type Book = {
//   id: number;
//   title: string;
//   subject: string;
// };

// type Chapter = {
//   id: number;
//   chapter_number: number;
//   title: string;
// };

// type Session = {
//   id: number;
//   name: string;
//   subject: string;
//   join_code: string;
//   locked: boolean;
//   ended: boolean;
//   student_count: number;
// };

// export default function SessionManager() {
//   const [teacher, setTeacher] = useState("Teacher");
//   const [books, setBooks] = useState<Book[]>([]);
//   const [chapters, setChapters] = useState<Chapter[]>([]);
//   const [sessions, setSessions] = useState<Session[]>([]);
//   const [activities, setActivities] = useState<any[]>([]);

//   const [bookId, setBookId] = useState<number | null>(null);
//   const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
//   const [name, setName] = useState("DBMS Open Book Session");
//   const [subject, setSubject] = useState("DBMS");

//   const [selectedSession, setSelectedSession] =
//     useState<Session | null>(null);

//   useEffect(() => {
//     const savedTeacher =
//       localStorage.getItem("teacherName");

//     if (savedTeacher) {
//       setTeacher(savedTeacher);
//     }

//     loadBooks();
//     loadSessions();
//   }, []);

//   useEffect(() => {
//     if (bookId === null) return;

//     fetch(`${API}/books/${bookId}/chapters`)
//       .then((res) => res.json())
//       .then((data) => {
//         setChapters(data);
//         setSelectedChapters([]);
//       });

//     const selectedBook = books.find(
//       (book) => book.id === bookId
//     );

//     if (selectedBook) {
//       setSubject(selectedBook.subject);
//     }
//   }, [bookId, books]);

//   async function loadBooks() {
//     const response = await fetch(`${API}/books/`);
//     const data = await response.json();

//     setBooks(data);

//     if (data.length > 0) {
//       setBookId(data[0].id);
//     }
//   }

//   async function loadSessions() {
//     const response = await fetch(`${API}/sessions/`);
//     const data = await response.json();
//     setSessions(data);
//   }

//   function toggleChapter(id: number) {
//     setSelectedChapters((current) =>
//       current.includes(id)
//         ? current.filter((x) => x !== id)
//         : [...current, id]
//     );
//   }

//   async function createSession() {
//     if (!bookId || selectedChapters.length === 0) {
//       alert("Select a book and at least one chapter.");
//       return;
//     }

//     localStorage.setItem(
//       "teacherName",
//       teacher
//     );

//     const response = await fetch(
//       `${API}/sessions/`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           name,
//           subject,
//           teacher_name: teacher,
//           chapter_ids: selectedChapters,
//         }),
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       alert(data.detail || "Failed to create session.");
//       return;
//     }

//     alert(`Session created. Join code: ${data.join_code}`);

//     setSelectedChapters([]);
//     await loadSessions();
//   }

//   async function lockSession(session: Session) {
//     await fetch(
//       `${API}/sessions/${session.id}/lock`,
//       {
//         method: "POST",
//       }
//     );

//     await loadSessions();
//   }

//   async function endSession(session: Session) {
//     const confirmed = confirm(
//       `End "${session.name}"? Students will no longer be able to use it.`
//     );

//     if (!confirmed) return;

//     await fetch(
//       `${API}/sessions/${session.id}/end`,
//       {
//         method: "POST",
//       }
//     );

//     await loadSessions();
//   }

//   async function viewActivities(session: Session) {
//     setSelectedSession(session);

//     const response = await fetch(
//       `${API}/sessions/${session.id}/activities`
//     );

//     setActivities(await response.json());
//   }

//   useEffect(() => {
//     if (!selectedSession) return;

//     const interval = setInterval(
//       () => viewActivities(selectedSession),
//       3000
//     );

//     return () => clearInterval(interval);
//   }, [selectedSession]);

//   return (
//     <main className="min-h-screen bg-[#07111f] text-white p-8">
//       <div className="max-w-7xl mx-auto">
//         <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
//           <div>
//             <p className="text-indigo-400 text-sm font-semibold tracking-widest">
//               TEACHER CONTROL CENTER
//             </p>

//             <h1 className="text-4xl font-bold mt-2">
//               Sessions
//             </h1>

//             <p className="text-slate-400 mt-2">
//               Teacher: {teacher}
//             </p>
//           </div>

//           <a
//             href="/teacher"
//             className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700"
//           >
//             ← Dashboard
//           </a>
//         </div>

//         <div className="grid lg:grid-cols-5 gap-6 mt-10">
//           <section className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
//             <h2 className="text-xl font-semibold">
//               Create Session
//             </h2>

//             <label className="block mt-5 text-sm text-slate-400">
//               Teacher name
//             </label>

//             <input
//               value={teacher}
//               onChange={(e) => setTeacher(e.target.value)}
//               className="w-full mt-2 bg-slate-800 rounded-lg px-4 py-3"
//             />

//             <label className="block mt-4 text-sm text-slate-400">
//               Session name
//             </label>

//             <input
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               className="w-full mt-2 bg-slate-800 rounded-lg px-4 py-3"
//             />

//             <label className="block mt-4 text-sm text-slate-400">
//               Book
//             </label>

//             <select
//               value={bookId ?? ""}
//               onChange={(e) =>
//                 setBookId(Number(e.target.value))
//               }
//               className="w-full mt-2 bg-slate-800 rounded-lg px-4 py-3"
//             >
//               {books.map((book) => (
//                 <option key={book.id} value={book.id}>
//                   {book.title}
//                 </option>
//               ))}
//             </select>

//             <label className="block mt-4 text-sm text-slate-400">
//               Subject
//             </label>

//             <input
//               value={subject}
//               onChange={(e) => setSubject(e.target.value)}
//               className="w-full mt-2 bg-slate-800 rounded-lg px-4 py-3"
//             />

//             <div className="mt-5">
//               <p className="text-sm text-slate-400">
//                 Allowed chapters
//               </p>

//               <div className="mt-3 space-y-2 max-h-64 overflow-auto">
//                 {chapters.map((chapter) => (
//                   <label
//                     key={chapter.id}
//                     className="flex gap-3 items-center bg-slate-800 rounded-lg p-3 cursor-pointer"
//                   >
//                     <input
//                       type="checkbox"
//                       checked={selectedChapters.includes(
//                         chapter.id
//                       )}
//                       onChange={() =>
//                         toggleChapter(chapter.id)
//                       }
//                     />

//                     <span>
//                       Chapter {chapter.chapter_number}
//                       {" — "}
//                       {chapter.title}
//                     </span>
//                   </label>
//                 ))}
//               </div>
//             </div>

//             <button
//               onClick={createSession}
//               className="w-full mt-6 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
//             >
//               Create Session
//             </button>
//           </section>

//           <section className="lg:col-span-3">
//             <h2 className="text-xl font-semibold">
//               Your Sessions
//             </h2>

//             <div className="grid md:grid-cols-2 gap-4 mt-4">
//               {sessions.map((session) => (
//                 <div
//                   key={session.id}
//                   className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
//                 >
//                   <div className="flex justify-between gap-3">
//                     <div>
//                       <p className="font-semibold">
//                         {session.name}
//                       </p>

//                       <p className="text-sm text-slate-500 mt-1">
//                         {session.subject}
//                       </p>
//                     </div>

//                     <span
//                       className={`text-xs px-2 py-1 rounded-full h-fit ${
//                         session.ended
//                           ? "bg-slate-700 text-slate-300"
//                           : session.locked
//                           ? "bg-red-950 text-red-300"
//                           : "bg-emerald-950 text-emerald-300"
//                       }`}
//                     >
//                       {session.ended
//                         ? "ENDED"
//                         : session.locked
//                         ? "LOCKED"
//                         : "OPEN"}
//                     </span>
//                   </div>

//                   <div className="mt-5 bg-slate-800 rounded-xl p-4">
//                     <p className="text-xs text-slate-500">
//                       JOIN CODE
//                     </p>
//                     <p className="text-3xl tracking-widest font-bold mt-1">
//                       {session.join_code}
//                     </p>
//                   </div>

//                   <p className="text-sm text-slate-400 mt-4">
//                     Students joined:{" "}
//                     <span className="text-white font-semibold">
//                       {session.student_count}
//                     </span>
//                   </p>

//                   <div className="flex flex-wrap gap-2 mt-5">
//                     {!session.locked &&
//                       !session.ended && (
//                         <button
//                           onClick={() =>
//                             lockSession(session)
//                           }
//                           className="px-3 py-2 rounded-lg bg-red-600"
//                         >
//                           Lock
//                         </button>
//                       )}

//                     {!session.ended && (
//                       <button
//                         onClick={() =>
//                           endSession(session)
//                         }
//                         className="px-3 py-2 rounded-lg bg-slate-700"
//                       >
//                         End Session
//                       </button>
//                     )}

//                     <button
//                       onClick={() =>
//                         viewActivities(session)
//                       }
//                       className="px-3 py-2 rounded-lg bg-indigo-600"
//                     >
//                       Activity
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </section>
//         </div>

//         {selectedSession && (
//           <section className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6">
//             <div className="flex justify-between items-center">
//               <div>
//                 <h2 className="text-xl font-semibold">
//                   Activity — {selectedSession.name}
//                 </h2>

//                 <p className="text-slate-500 mt-1">
//                   Updates automatically
//                 </p>
//               </div>

//               <button
//                 onClick={() => setSelectedSession(null)}
//                 className="text-slate-500 hover:text-white"
//               >
//                 Close
//               </button>
//             </div>

//             <div className="mt-5 space-y-2">
//               {activities.length === 0 && (
//                 <p className="text-slate-500">
//                   No activity yet.
//                 </p>
//               )}

//               {activities.map((activity) => (
//                 <div
//                   key={activity.id}
//                   className="flex justify-between gap-4 bg-slate-800 rounded-lg p-3"
//                 >
//                   <div>
//                     <p className="font-medium">
//                       {activity.student_name}
//                     </p>
//                     <p className="text-sm text-slate-400">
//                       {activity.event_type}
//                     </p>
//                   </div>

//                   <p className="text-xs text-slate-500">
//                     {activity.details}
//                   </p>
//                 </div>
//               ))}
//             </div>
//           </section>
//         )}
//       </div>
//     </main>
//   );
// }


// frontend/app/teacher/session/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BooksBackground from "../../components/BooksBackground";

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
  const [name, setName] = useState("Open Book Session");
  const [subject, setSubject] = useState("DBMS");

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    const savedTeacher = localStorage.getItem("teacherName");
    if (savedTeacher) setTeacher(savedTeacher);

    loadBooks();
    loadSessions();

    const t = setInterval(loadSessions, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (bookId === null) return;

    fetch(`${API}/books/${bookId}/chapters`)
      .then((res) => res.json())
      .then((data) => {
        setChapters(data);
        setSelectedChapters([]);
      });

    const selectedBook = books.find((book) => book.id === bookId);
    if (selectedBook) setSubject(selectedBook.subject);
  }, [bookId, books]);

  async function loadBooks() {
    const response = await fetch(`${API}/books/`);
    const data = await response.json();

    setBooks(data);
    if (data.length > 0) setBookId(data[0].id);
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

    localStorage.setItem("teacherName", teacher);

    const response = await fetch(`${API}/sessions/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        subject,
        teacher_name: teacher,
        chapter_ids: selectedChapters,
      }),
    });

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
    await fetch(`${API}/sessions/${session.id}/lock`, { method: "POST" });
    await loadSessions();
  }

  async function endSession(session: Session) {
    const confirmed = confirm(
      `End "${session.name}"? Students will no longer be able to use it.`
    );
    if (!confirmed) return;

    await fetch(`${API}/sessions/${session.id}/end`, { method: "POST" });
    await loadSessions();
  }

  async function viewActivities(session: Session) {
    setSelectedSession(session);

    const response = await fetch(`${API}/sessions/${session.id}/activities`);
    setActivities(await response.json());
  }

  useEffect(() => {
    if (!selectedSession) return;

    const interval = setInterval(() => viewActivities(selectedSession), 3000);
    return () => clearInterval(interval);
  }, [selectedSession]);

  return (
    <main className="relative isolate min-h-screen text-white overflow-hidden">
      <BooksBackground />

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-indigo-300/80">
              TEACHER CONTROL CENTER
            </p>
            <h1 className="mt-2 text-4xl font-bold">
              <span className="bg-gradient-to-r from-indigo-200 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                Sessions
              </span>
            </h1>
            <p className="mt-2 text-slate-400">
              Teacher: <span className="text-slate-200">{teacher}</span>
            </p>
          </div>

          <Link
            href="/teacher"
            className="w-fit rounded-xl border border-white/10 bg-slate-950/60 backdrop-blur px-4 py-2 text-sm text-slate-300 transition hover:border-indigo-300/40 hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Create session */}
          <section className="lg:col-span-2">
            <h2 className="mb-4 text-sm font-bold tracking-[0.25em]">
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]">
                CREATE SESSION
              </span>
            </h2>

            <div className="relative rounded-2xl p-[1px]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 opacity-25 blur-sm" />
              <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur p-6">
                <label className="block text-sm text-slate-400">
                  Teacher name
                </label>
                <input
                  value={teacher}
                  onChange={(e) => setTeacher(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20"
                />

                <label className="mt-4 block text-sm text-slate-400">
                  Session name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Open Book Session — Unit 3"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20"
                />

                <label className="mt-4 block text-sm text-slate-400">
                  Book
                </label>
                <select
                  value={bookId ?? ""}
                  onChange={(e) => setBookId(Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none transition focus:border-indigo-400/50"
                >
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title}
                    </option>
                  ))}
                </select>

                <label className="mt-4 block text-sm text-slate-400">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20"
                />

                <div className="mt-5">
                  <p className="text-sm text-slate-400">Allowed chapters</p>

                  <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                    {chapters.length === 0 && (
                      <p className="rounded-lg border border-dashed border-white/10 bg-slate-900/40 p-3 text-sm text-slate-500">
                        No chapters found for this book.
                      </p>
                    )}

                    {chapters.map((chapter) => {
                      const checked = selectedChapters.includes(chapter.id);
                      return (
                        <label
                          key={chapter.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${
                            checked
                              ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
                              : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleChapter(chapter.id)}
                            className="accent-cyan-400"
                          />
                          <span>
                            Chapter {chapter.chapter_number} — {chapter.title}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {selectedChapters.length > 0 && (
                    <p className="mt-2 text-xs text-cyan-300">
                      {selectedChapters.length} chapter
                      {selectedChapters.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>

                <button
                  onClick={createSession}
                  className="group relative mt-6 w-full rounded-xl p-[1px] transition-transform duration-300 hover:-translate-y-0.5 active:scale-95"
                >
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 opacity-60 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative flex items-center justify-center rounded-xl border border-white/10 bg-slate-950/80 px-5 py-3 font-semibold">
                    Create Session →
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* Session list */}
          <section className="lg:col-span-3">
            <h2 className="mb-4 text-sm font-bold tracking-[0.25em]">
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]">
                YOUR SESSIONS
              </span>
            </h2>

            {sessions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-8 text-center text-slate-500">
                No sessions yet — create your first one on the left.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {sessions.map((session) => (
                <div key={session.id} className="relative rounded-2xl p-[1px]">
                  <div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-r blur-sm ${
                      session.ended
                        ? "from-slate-500 to-slate-700 opacity-10"
                        : session.locked
                        ? "from-rose-500 to-red-600 opacity-20"
                        : "from-emerald-400 to-teal-600 opacity-20"
                    }`}
                  />
                  <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur p-5">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {session.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {session.subject}
                        </p>
                      </div>

                      <span
                        className={`h-fit shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest ${
                          session.ended
                            ? "bg-slate-700/50 text-slate-400"
                            : session.locked
                            ? "bg-rose-500/15 text-rose-300"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {session.ended
                          ? "ENDED"
                          : session.locked
                          ? "LOCKED"
                          : "OPEN"}
                      </span>
                    </div>

                    <div className="mt-5 rounded-xl border border-white/10 bg-slate-900/70 p-4">
                      <p className="text-[10px] font-semibold tracking-widest text-slate-500">
                        JOIN CODE
                      </p>
                      <p className="mt-1 text-3xl font-bold tracking-[0.3em] text-cyan-200">
                        {session.join_code}
                      </p>
                    </div>

                    <p className="mt-4 text-sm text-slate-400">
                      Students joined:{" "}
                      <span className="font-semibold text-white tabular-nums">
                        {session.student_count}
                      </span>
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {!session.locked && !session.ended && (
                        <button
                          onClick={() => lockSession(session)}
                          className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 active:scale-95"
                        >
                          Lock
                        </button>
                      )}

                      {!session.ended && (
                        <button
                          onClick={() => endSession(session)}
                          className="rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700/70 active:scale-95"
                        >
                          End Session
                        </button>
                      )}

                      <button
                        onClick={() => viewActivities(session)}
                        className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20 active:scale-95"
                      >
                        Activity
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Activity feed */}
        {selectedSession && (
          <section className="mt-10">
            <div className="relative rounded-2xl p-[1px]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-600 opacity-15 blur-sm" />
              <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Activity —{" "}
                      <span className="text-amber-200">
                        {selectedSession.name}
                      </span>
                    </h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                      Updates automatically
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedSession(null)}
                    className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-400 transition hover:text-white"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="mt-5 space-y-2">
                  {activities.length === 0 && (
                    <p className="rounded-lg border border-dashed border-white/10 bg-slate-900/40 p-4 text-slate-500">
                      No activity yet.
                    </p>
                  )}

                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex justify-between gap-4 rounded-lg border border-white/10 bg-slate-900/60 p-3"
                    >
                      <div>
                        <p className="font-medium">{activity.student_name}</p>
                        <p className="mt-0.5 text-xs font-semibold tracking-wide text-amber-300/90">
                          {activity.event_type}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500 text-right">
                        {activity.details}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
