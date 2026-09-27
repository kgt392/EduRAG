"use client";

import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

type Book = {
  id: number;
  title: string;
  subject: string;
  filename: string;
};

type Chapter = {
  id: number;
  chapter_number: number;
  title: string;
};

export default function ChaptersPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [bookId, setBookId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/books/`)
      .then((res) => res.json())
      .then((data) => {
        setBooks(data);

        if (data.length > 0) {
          setBookId(data[0].id);
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (bookId === null) return;

    fetch(`${API}/books/${bookId}/chapters`)
      .then((res) => res.json())
      .then((data) => {
        setChapters(data);
        setSelected([]);
      });
  }, [bookId]);

  function toggleChapter(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-950 text-white p-8">Loading...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <p className="text-blue-400 text-sm">TEACHER CONTROL</p>
        <h1 className="text-3xl font-bold mt-1">Select Material</h1>

        <div className="mt-8">
          <label className="text-sm text-slate-400">Book</label>

          <select
            value={bookId ?? ""}
            onChange={(e) => setBookId(Number(e.target.value))}
            className="w-full mt-2 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
          >
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-8 space-y-3">
          {chapters.map((chapter) => (
            <label
              key={chapter.id}
              className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-blue-500"
            >
              <input
                type="checkbox"
                checked={selected.includes(chapter.id)}
                onChange={() => toggleChapter(chapter.id)}
                className="w-5 h-5"
              />

              <span>
                Chapter {chapter.chapter_number}: {chapter.title}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-6 text-slate-400">
          Selected chapters:{" "}
          <span className="text-white font-semibold">{selected.length}</span>
        </div>

        <button
          disabled={selected.length === 0}
          onClick={() => {
            localStorage.setItem(
              "selectedChapterIds",
              JSON.stringify(selected)
            );
            localStorage.setItem("selectedBookId", String(bookId));
            alert("Material selection saved.");
          }}
          className="mt-6 px-6 py-3 rounded-lg bg-blue-600 disabled:bg-slate-700"
        >
          Save Selection
        </button>
      </div>
    </main>
  );
}
