"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BooksBackground from "../components/BooksBackground";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    // A browser cookie may survive session restoration. The tab marker ensures
    // a fresh tab must go through the login screen again.
    if (!window.sessionStorage.getItem("edurag_teacher_tab")) {
      setChecking(false);
      return () => {
        active = false;
      };
    }

    fetch("/backend/auth/me", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => {
        if (response.ok) {
          router.replace("/teacher");
        } else if (response.status === 401) {
          window.sessionStorage.removeItem("edurag_teacher_tab");
        }
      })
      .catch(() => {
        // Keep the login form available; submitting it will show a connection error.
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/backend/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.detail || "Unable to sign in. Check your email and password.");
        return;
      }

      window.sessionStorage.setItem("edurag_teacher_tab", "1");
      router.replace("/teacher");
      router.refresh();
    } catch {
      setError("EduRAG backend is not reachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-5 py-12 text-white">
      <BooksBackground />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/55 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative flex flex-col justify-between overflow-hidden border-b border-white/10 p-8 sm:p-10 lg:border-b-0 lg:border-r">
          <div className="absolute -left-24 top-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-semibold tracking-[0.3em] text-amber-100/80">
              CONTROLLED OPEN-BOOK LEARNING
            </p>
            <h1 className="mt-5 text-5xl font-bold tracking-tight sm:text-6xl">
              <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-rose-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,170,90,0.2)]">
                EduRag
              </span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300 sm:text-lg">
              A focused space for teachers to prepare approved learning material
              and manage controlled classroom sessions.
            </p>
          </div>

          <div className="relative mt-10 rounded-2xl border border-cyan-300/15 bg-slate-900/45 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-xl text-cyan-200">
                ◈
              </div>
              <div>
                <p className="font-semibold text-slate-100">Teacher workspace</p>
                <p className="mt-0.5 text-xs text-slate-400">Authorized accounts only</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Sign in with the credentials provided by your EduRag administrator.
              Teacher accounts cannot be created from this page.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs font-semibold tracking-[0.28em] text-cyan-300/80">
                TEACHER PORTAL
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Sign in to continue to your teacher dashboard.
              </p>
            </div>

            <form onSubmit={login} className="space-y-5">
              <div>
                <label htmlFor="teacher-email" className="mb-2 block text-sm font-medium text-slate-300">
                  Email address
                </label>
                <input
                  id="teacher-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teacher@school.edu"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/75 px-4 py-3.5 text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/15"
                />
              </div>

              <div>
                <label htmlFor="teacher-password" className="mb-2 block text-sm font-medium text-slate-300">
                  Password
                </label>
                <input
                  id="teacher-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/75 px-4 py-3.5 text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/15"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || checking}
                className="group relative mt-2 w-full rounded-xl p-[1px] transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-70 blur-sm transition-opacity group-hover:opacity-100" />
                <span className="relative flex items-center justify-center rounded-xl border border-white/10 bg-slate-950/90 px-5 py-3.5 font-semibold text-white">
                  {loading ? "Signing in..." : checking ? "Checking session..." : "Sign in to EduRag →"}
                </span>
              </button>
            </form>

            <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-sm">
              <span className="text-slate-500">No public registration</span>
              <Link href="/" className="text-cyan-300 transition hover:text-cyan-200">
                ← Back to home
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
