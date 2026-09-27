import Link from "next/link";

export default function TeacherDashboard() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <p className="text-blue-400 text-sm">TEACHER PORTAL</p>
            <h1 className="text-4xl font-bold">Dashboard</h1>
          </div>
          <Link href="/" className="text-slate-400 hover:text-white">Home</Link>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-8">
          <Card title="Books" value="0" />
          <Card title="Active Sessions" value="0" />
          <Card title="Students" value="0" />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <Action
            href="/teacher/upload"
            title="Upload DBMS Book"
            description="Upload and process a textbook."
          />
          <Action
            href="/teacher/chapters"
            title="Manage Chapters"
            description="Select the material students are allowed to access."
          />
          <Action
            href="/teacher/session"
            title="Create Session"
            description="Create and lock a controlled open-book session."
          />
        </div>
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <p className="text-slate-400">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}

function Action({ href, title, description }: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="block bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-500 transition">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-slate-400 mt-2">{description}</p>
    </Link>
  );
}
