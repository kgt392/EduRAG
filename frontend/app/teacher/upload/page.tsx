"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BooksBackground from "../../components/BooksBackground";

const API = "http://127.0.0.1:8000";

type Book = {
  id: number;
  title: string;
  subject: string;
  filename: string;
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("DBMS");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadBooks = useCallback(async () => {
    try {
      const response = await fetch(`${API}/books/`);
      if (response.ok) {
        setBooks(await response.json());
      }
    } catch {
      // Backend offline — list just stays empty
    } finally {
      setBooksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  async function deleteBook(book: Book) {
    const confirmed = window.confirm(
      `Delete "${book.title}"?\n\nThis removes the PDF, processed data, chapters and indexed vectors.`
    );

    if (!confirmed) return;

    setDeletingId(book.id);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch(`${API}/books/${book.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Delete failed.");
        setIsError(true);
        return;
      }

      setBooks((prev) => prev.filter((b) => b.id !== book.id));
      setMessage(`"${book.title}" deleted successfully.`);
    } catch {
      setMessage("Backend is not reachable.");
      setIsError(true);
    } finally {
      setDeletingId(null);
    }
  }

  async function upload() {
    if (!file) {
      setMessage("Please select a PDF.");
      setIsError(true);
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);

    const form = new FormData();
    form.append("file", file);
    form.append("subject", subject);

    try {
      const response = await fetch(`${API}/books/upload`, {
        method: "POST",
        body: form,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Upload failed.");
        setIsError(true);
        return;
      }

      setResult(data);
      setMessage("Book uploaded, processed and indexed successfully.");
      setFile(null);
      await loadBooks();
    } catch {
      setMessage("Backend is not reachable.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate min-h-screen text-white overflow-hidden">
      <BooksBackground />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-indigo-300/80">
              CONTENT LIBRARY
            </p>
            <h1 className="mt-2 text-4xl font-bold">
              <span className="bg-gradient-to-r from-indigo-200 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                Upload Educational Material
              </span>
            </h1>
            <p className="mt-3 text-slate-400">
              PDF → page extraction → chunking → embeddings → Qdrant
            </p>
          </div>

          <Link
            href="/teacher"
            className="rounded-xl border border-white/10 bg-slate-950/60 backdrop-blur px-4 py-2 text-sm text-slate-300 transition hover:border-indigo-300/40 hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Book library — left column */}
          <aside>
            <h2 className="mb-4 text-sm font-bold tracking-[0.25em]">
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(167,139,250,0.35)]">
                LIBRARY ({books.length})
              </span>
            </h2>

            <div className="relative rounded-2xl p-[1px]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 opacity-25 blur-sm" />
              <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur p-4">
                {booksLoading ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Loading books...
                  </p>
                ) : books.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No books uploaded yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {books.map((book) => (
                      <li
                        key={book.id}
                        className="rounded-xl border border-white/10 bg-slate-900/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-100">
                              {book.title}
                            </p>
                            <p className="mt-1 text-xs text-indigo-300">
                              {book.subject}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {book.filename}
                            </p>
                          </div>

                          <button
                            onClick={() => deleteBook(book)}
                            disabled={deletingId === book.id}
                            className="shrink-0 rounded-lg border border-white/10 bg-slate-800/70 px-3 py-1.5 text-xs text-slate-400 transition hover:border-rose-400/40 hover:text-rose-300 disabled:opacity-40"
                          >
                            {deletingId === book.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>

          {/* Upload form — right column */}
          <section>
            <h2 className="mb-4 text-sm font-bold tracking-[0.25em]">
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]">
                NEW TEXTBOOK
              </span>
            </h2>

            <div className="relative rounded-2xl p-[1px]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 opacity-25 blur-sm" />
              <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur p-8">
                <label className="text-sm text-slate-400">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20"
                />

                <label className="mt-6 block text-sm text-slate-400">
                  PDF textbook
                </label>

                <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-900/40 px-6 py-10 text-center transition hover:border-indigo-400/40 hover:bg-slate-900/60">
                  <span className="text-3xl">📄</span>
                  <span className="mt-3 text-sm text-slate-300">
                    {file ? "Choose a different PDF" : "Click to choose a PDF"}
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    Only .pdf files are supported
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>

                {file && (
                  <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{file.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="shrink-0 rounded-lg border border-white/10 bg-slate-800/70 px-3 py-1.5 text-xs text-slate-400 transition hover:border-rose-400/40 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <button
                  onClick={upload}
                  disabled={!file || loading}
                  className="group relative mt-6 rounded-xl p-[1px] transition-transform duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 opacity-60 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative flex items-center justify-center rounded-xl border border-white/10 bg-slate-950/80 px-8 py-3 font-semibold whitespace-nowrap">
                    {loading ? "Processing..." : "Process Book →"}
                  </span>
                </button>

                {message && (
                  <p
                    className={`mt-5 text-sm ${
                      isError ? "text-rose-400" : "text-emerald-300"
                    }`}
                  >
                    {message}
                  </p>
                )}

                {result && (
                  <div className="mt-6 grid gap-3 md:grid-cols-4">
                    <Stat label="Pages" value={result.pages_processed} />
                    <Stat label="Chunks" value={result.chunks_created} />
                    <Stat label="Chapters" value={result.chapters_detected} />
                    <Stat label="Vectors" value={result.vectors_indexed} />
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="relative rounded-xl p-[1px]">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-15 blur-sm" />
      <div className="relative rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur p-4">
        <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-cyan-200">
          {value}
        </p>
      </div>
    </div>
  );
}