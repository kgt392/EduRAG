"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import BooksBackground from "../components/BooksBackground";

type TeacherInfo = {
  id: number;
  full_name: string;
  email: string;
};

type AuthState = "checking" | "ready" | "error";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>("checking");
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkLogin() {
      setState("checking");
      setError("");
      // sessionStorage is scoped to this tab and is cleared when the tab closes.
      if (!window.sessionStorage.getItem("edurag_teacher_tab")) {
        router.replace("/teacher-login");
        return;
      }
      try {
        const response = await fetch("/backend/auth/me", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/teacher-login");
          return;
        }
        if (!response.ok) {
          throw new Error("Unable to verify teacher login. Check that the backend is running.");
        }

        const data: TeacherInfo = await response.json();
        if (active) {
          setTeacher(data);
          setState("ready");
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not connect to EduRAG.");
          setState("error");
        }
      }
    }

    checkLogin();
    return () => {
      active = false;
    };
  }, [router, retry]);

  async function signOut() {
    setSigningOut(true);
    try {
      window.sessionStorage.removeItem("edurag_teacher_tab");
      await fetch("/backend/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      router.replace("/teacher-login");
      router.refresh();
      setSigningOut(false);
    }
  }

  if (state !== "ready") {
    return (
      <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 text-white">
        <BooksBackground />
        <div className="relative w-full max-w-md rounded-2xl p-[1px]">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-30 blur-sm" />
          <div className="relative rounded-2xl border border-white/10 bg-slate-950/85 p-8 text-center backdrop-blur-xl">
            {state === "checking" ? (
              <>
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-200/20 border-t-cyan-300" />
                <p className="mt-4 text-sm text-slate-300">Verifying teacher access...</p>
              </>
            ) : (
              <>
                <p className="text-sm text-rose-300">{error}</p>
                <button
                  onClick={() => setRetry((value) => value + 1)}
                  className="mt-5 rounded-xl border border-white/10 bg-slate-900/80 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
                >
                  Retry
                </button>
                <button
                  onClick={() => router.replace("/teacher-login")}
                  className="ml-3 mt-5 rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-400 transition hover:text-white"
                >
                  Teacher login
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-end gap-3 px-6 pt-4">
        <div className="hidden text-right sm:block">
          <p className="text-xs font-semibold text-slate-200">{teacher?.full_name}</p>
          <p className="text-[11px] text-slate-500">{teacher?.email}</p>
        </div>
        <button
          onClick={signOut}
          disabled={signingOut}
          className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-300 backdrop-blur transition hover:border-rose-300/40 hover:text-white disabled:opacity-50"
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
      {children}
    </>
  );
}
