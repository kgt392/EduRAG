import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">EduRAG</h1>
        <p className="text-slate-400 mb-8">Controlled learning & assessment platform</p>

        <div className="flex gap-4 justify-center">
          <Link href="/teacher" className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500">
            Teacher Portal
          </Link>
          <Link href="/student" className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500">
            Student Portal
          </Link>
        </div>
      </div>
    </main>
  );
}
