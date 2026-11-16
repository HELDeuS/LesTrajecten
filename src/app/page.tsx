import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function Dashboard() {
  const user = await requireUser();
  const [dossierCount, trajectCount, lessonCount, goalCount, recentTrajects] = await Promise.all([
    db.qualificationFile.count({ where: user.role === "ADMIN" ? {} : { ownerId: user.id } }),
    db.traject.count({ where: user.role === "ADMIN" ? {} : { ownerId: user.id } }),
    db.lesson.count({
      where: { traject: user.role === "ADMIN" ? {} : { ownerId: user.id } },
    }),
    db.learningGoal.count({ where: { scope: "GENERAL" } }),
    db.traject.findMany({
      where: user.role === "ADMIN" ? {} : { ownerId: user.id },
      include: {
        qualificationFile: { select: { title: true } },
        modules: { select: { weeks: true } },
        _count: { select: { lessons: true, modules: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const stats = [
    { label: "Kwalificatiedossiers", value: dossierCount, href: "/dossiers", color: "bg-indigo-500" },
    { label: "Lestrajecten", value: trajectCount, href: "/trajecten", color: "bg-violet-500" },
    { label: "Lessen", value: lessonCount, href: "/trajecten", color: "bg-emerald-500" },
    { label: "Algemene leerdoelen", value: goalCount, href: "/dossiers", color: "bg-amber-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welkom, {user.name}</h1>
        <p className="text-slate-500">Bouw lestrajecten op basis van kwalificatiedossiers, met AI-ondersteuning.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 hover:shadow-md transition-shadow">
            <div className={`${s.color} w-10 h-10 rounded-lg mb-3`} />
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </Link>
        ))}
      </div>
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Recente lestrajecten</h2>
          <Link href="/trajecten" className="btn-primary">
            Nieuw lestraject
          </Link>
        </div>
        {recentTrajects.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Nog geen lestrajecten. Begin met een kwalificatiedossier toe te voegen.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentTrajects.map((t) => (
              <li key={t.id}>
                <Link href={`/trajecten/${t.id}`} className="flex items-center justify-between py-3 hover:bg-slate-50 rounded px-2">
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-sm text-slate-500">
                      {t.subject} · {t._count.modules} modules · {t.modules.reduce((s, m) => s + m.weeks, 0)} weken ·{" "}
                      {t._count.lessons} lessen · {t.periodStart.toLocaleDateString("nl-NL")} –{" "}
                      {t.periodEnd.toLocaleDateString("nl-NL")}
                    </p>
                  </div>
                  <span className="badge bg-indigo-50 text-indigo-700">
                    {t._count.modules} modules
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
