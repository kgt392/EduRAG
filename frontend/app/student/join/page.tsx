"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = "http://127.0.0.1:8000";

export default function JoinSession() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function join() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/sessions/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          join_code: code.toUpperCase(),
          student_name: name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Unable to join session.");
        return;
      }

      localStorage.setItem(
        "studentSession",
        JSON.stringify(data)
      );

      router.push("/student/session");
    } catch {
      setError("Backend is not reachable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8">
        <h1 className="text-3xl font-bold">
          Join Session
        </h1>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full mt-6 bg-slate-800 rounded-lg px-4 py-3"
        />

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Session code"
          maxLength={6}
          className="w-full mt-3 bg-slate-800 rounded-lg px-4 py-3 tracking-widest"
        />

        <button
          onClick={join}
          disabled={!name || !code || loading}
          className="w-full mt-4 px-6 py-3 bg-emerald-600 disabled:bg-slate-700 rounded-lg"
        >
          {loading ? "Joining..." : "Join Session"}
        </button>

        {error && (
          <p className="mt-4 text-red-400">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
