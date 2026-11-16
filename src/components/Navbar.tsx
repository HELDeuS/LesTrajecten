"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/dossiers", label: "Kwalificatiedossiers" },
  { href: "/trajecten", label: "Lestrajecten" },
];

export default function Navbar({ user }: { user: { name: string; role: string } }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="font-bold text-indigo-600 text-lg">
          LesTrajecten
        </Link>
        <div className="flex gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href))
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user.role === "ADMIN" && (
            <Link
              href="/beheer"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                pathname.startsWith("/beheer")
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Beheer
            </Link>
          )}
          <Link
            href="/profiel"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              pathname.startsWith("/profiel")
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Profiel
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {user.name}
            <span className="badge bg-slate-100 text-slate-600 ml-2">{user.role}</span>
          </span>
          <button onClick={logout} className="btn-secondary">
            Uitloggen
          </button>
        </div>
      </div>
    </nav>
  );
}
