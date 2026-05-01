import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Top Bar */}
      <header className="bg-maroon text-white px-4 py-3 shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/admin" className="font-bold text-sm">
            🔐 Admin Panel
          </Link>
          <nav className="flex gap-3 text-xs">
            <Link href="/admin" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/admin/scoring" className="hover:underline">
              Scoring
            </Link>
            <Link href="/admin/voting" className="hover:underline">
              Voting
            </Link>
            <Link href="/admin/judges" className="hover:underline">
              Judges
            </Link>
            <Link href="/" className="hover:underline opacity-70">
              ← Public
            </Link>
          </nav>
        </div>
      </header>
      <div className="max-w-4xl mx-auto">{children}</div>
    </div>
  );
}
