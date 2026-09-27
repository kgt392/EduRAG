"use client";

import { useState } from "react";

const API = "http://127.0.0.1:8000";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("DBMS");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);

  async function upload() {
    if (!file) {
      setMessage("Please select a PDF.");
      return;
    }

    setLoading(true);
    setMessage("");

    const form = new FormData();
    form.append("file", file);
    form.append("subject", subject);

    try {
      const response = await fetch(
        `${API}/books/upload`,
        {
          method: "POST",
          body: form,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Upload failed.");
        return;
      }

      setResult(data);
      setMessage("Book uploaded, processed and indexed successfully.");
    } catch {
      setMessage("Backend is not reachable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <p className="text-indigo-400 text-sm font-semibold tracking-widest">
          CONTENT LIBRARY
        </p>

        <h1 className="text-4xl font-bold mt-2">
          Upload educational material
        </h1>

        <p className="text-slate-400 mt-3">
          PDF → page extraction → chunking → embeddings → Qdrant
        </p>

        <div className="mt-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <label className="text-sm text-slate-400">
            Subject
          </label>

          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
          />

          <label className="block text-sm text-slate-400 mt-6">
            PDF textbook
          </label>

          <input
            type="file"
            accept=".pdf"
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
            className="w-full mt-2 text-slate-300"
          />

          {file && (
            <div className="mt-4 bg-slate-800 rounded-xl p-4">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-slate-500 mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          <button
            onClick={upload}
            disabled={!file || loading}
            className="mt-6 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 font-semibold"
          >
            {loading ? "Processing..." : "Process Book"}
          </button>

          {message && (
            <p className="mt-5 text-sm text-indigo-300">
              {message}
            </p>
          )}

          {result && (
            <div className="mt-6 grid md:grid-cols-4 gap-3">
              <Stat
                label="Pages"
                value={result.pages_processed}
              />
              <Stat
                label="Chunks"
                value={result.chunks_created}
              />
              <Stat
                label="Chapters"
                value={result.chapters_detected}
              />
              <Stat
                label="Vectors"
                value={result.vectors_indexed}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
