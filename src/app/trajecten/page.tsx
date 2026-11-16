import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import TrajectForm from "@/components/TrajectForm";

export default async function TrajectenPage() {
  const user = await requireUser();
  const trajects = await db.traject.findMany({
    where: user.role === "ADMIN" ? {} : { ownerId: user.id },
    include: {
      qualificationFile: { select: { title: true } },
      owner: { select: { name: true } },
      _count: { select: { lessons: true, modules: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const dossiers = await db.qualificationFile.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const fmt = (d: Date) => d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lestrajecten</h1>
        <p className="text-slate-500">
          Koppel een vak en periode aan een kwalificatiedossier en werk uit naar modules, lessen en opdrachten.
        </p>
      </div>
      <TrajectForm dossiers={dossiers} />
      <div className="grid md:grid-cols-2 gap-4">
        {trajects.length === 0 && <p className="text-slate-500 text-sm">Nog geen lestrajecten.</p>}
        {trajects.map((t) => (
          <Link key={t.id} href={`/trajecten/${t.id}`} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold">{t.title}</h2>
                <p className="text-sm text-slate-500">
                  {t.subject}
                  {t.cohort ? ` · ${t.cohort}` : ""}
                </p>
              </div>
              <span className="badge bg-indigo-50 text-indigo-700">{t._count.lessons} lessen</span>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              Periode: {fmt(t.periodStart)} – {fmt(t.periodEnd)} · {t.lessonDurationMin} min/les
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {t.qualificationFile ? `Dossier: ${t.qualificationFile.title}` : "Geen dossier gekoppeld"} ·{" "}
              {t._count.modules} modules · {t.owner.name}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
