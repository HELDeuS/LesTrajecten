"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Werkproces = { id: number; code: string; title: string; description: string | null };
type Kerntaak = {
  id: number;
  code: string;
  title: string;
  description: string | null;
  werkprocessen: Werkproces[];
};

export default function KerntakenPanel({
  dossierId,
  initialKerntaken,
}: {
  dossierId: number;
  initialKerntaken: Kerntaak[];
}) {
  const router = useRouter();
  const [kerntaken, setKerntaken] = useState<Kerntaak[]>(initialKerntaken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "analyze-dossier", dossierId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Analyse mislukt.");
        return;
      }
      setKerntaken(data.kerntaken);
      router.refresh();
    } catch {
      setError("Er ging iets mis bij de AI-analyse.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Kerntaken & werkprocessen</h2>
          <p className="text-sm text-slate-500">
            AI extraheert de kerntaken en werkprocessen uit het dossier; je kiest er later per traject de relevante
            onderdelen uit.
          </p>
        </div>
        <button onClick={analyze} className="btn-primary" disabled={loading}>
          {loading ? "AI analyseert..." : kerntaken.length ? "✨ Opnieuw analyseren" : "✨ AI analyseren"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {kerntaken.length === 0 && !loading && (
        <p className="text-sm text-slate-500">Nog geen analyse. Start de AI-analyse om kerntaken te extraheren.</p>
      )}
      <div className="space-y-3">
        {kerntaken.map((kt) => (
          <details key={kt.id} className="border border-slate-200 rounded-lg p-4">
            <summary className="font-medium cursor-pointer">
              <span className="badge bg-indigo-50 text-indigo-700 mr-2">{kt.code}</span>
              {kt.title}
              <span className="text-sm text-slate-400 ml-2">({kt.werkprocessen.length} werkprocessen)</span>
            </summary>
            {kt.description && <p className="text-sm text-slate-600 mt-2">{kt.description}</p>}
            <ul className="mt-2 space-y-1">
              {kt.werkprocessen.map((wp) => (
                <li key={wp.id} className="text-sm text-slate-600 flex gap-2">
                  <span className="badge bg-slate-100 text-slate-600">{wp.code}</span>
                  <span>
                    <span className="font-medium">{wp.title}</span>
                    {wp.description && <span className="text-slate-500"> — {wp.description}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
