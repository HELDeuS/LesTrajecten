import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import DossierForm from "@/components/DossierForm";

export default async function DossiersPage() {
  await requireUser();
  const dossiers = await db.qualificationFile.findMany({
    include: { owner: { select: { name: true } }, _count: { select: { goals: true, trajects: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kwalificatiedossiers</h1>
        <p className="text-slate-500">
          Voeg de inhoud van een kwalificatiedossier toe en laat AI algemene leerdoelen en uitkomsten genereren.
        </p>
      </div>
      <DossierForm />
      <div className="grid md:grid-cols-2 gap-4">
        {dossiers.length === 0 && (
          <p className="text-slate-500 text-sm">Nog geen dossiers toegevoegd.</p>
        )}
        {dossiers.map((d) => (
          <Link key={d.id} href={`/dossiers/${d.id}`} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold">{d.title}</h2>
                {d.creboCode && <p className="text-xs text-slate-400">CREBO {d.creboCode}</p>}
              </div>
              <span className="badge bg-indigo-50 text-indigo-700">
                {d._count.goals} leerdoelen
              </span>
            </div>
            {d.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{d.description}</p>}
            <p className="text-xs text-slate-400 mt-3">
              {d._count.trajects} lestrajecten · toegevoegd door {d.owner.name}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
