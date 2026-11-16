import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import DossierGoals from "@/components/DossierGoals";

export default async function DossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const id = Number((await params).id);
  const dossier = await db.qualificationFile.findUnique({
    where: { id },
    include: { goals: { where: { scope: "GENERAL" }, orderBy: { order: "asc" } } },
  });
  if (!dossier) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{dossier.title}</h1>
          {dossier.creboCode && <p className="text-sm text-slate-500">CREBO {dossier.creboCode}</p>}
          {dossier.description && <p className="text-slate-500 mt-1">{dossier.description}</p>}
        </div>
      </div>
      <DossierGoals dossierId={dossier.id} initialGoals={dossier.goals} />
      <details className="card p-6">
        <summary className="font-semibold cursor-pointer">Inhoud van het dossier</summary>
        <pre className="text-sm text-slate-600 whitespace-pre-wrap mt-4 max-h-96 overflow-y-auto">{dossier.content}</pre>
      </details>
    </div>
  );
}
