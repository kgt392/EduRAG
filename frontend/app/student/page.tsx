import Link from "next/link";

export default function StudentDashboard() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <p className="text-emerald-400 text-sm">STUDENT PORTAL</p>
        <h1 className="text-4xl font-bold mt-1 mb-10">Student Dashboard</h1>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <h2 className="text-xl font-semibold">DBMS Open-Book Session</h2>
          <p className="text-slate-400 mt-2">
            Join your assigned session to access the permitted textbook material.
          </p>

          <Link
            href="/student/join"
            className="inline-block mt-6 px-6 py-3 bg-emerald-600 rounded-lg"
          >
            Join Session
          </Link>
        </div>
      </div>
    </main>
  );
}
