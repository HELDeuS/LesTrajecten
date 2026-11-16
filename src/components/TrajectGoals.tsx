"use client";

import { useState } from "react";

type Werkproces = { id: number; code: string; title: string };
type Kerntaak = { id: number; code: string; title: string; werkprocessen: Werkproces[] };
type Goal = { id: number; title: string; description: string; bloomLevel: string | null };
type Proposal = { title: string; description: string; bloomLevel: string | null };

export default function TrajectGoals({
  trajectId,
  kerntaken,
  initialGoals,
  onChange,
}: {
  trajectId: number;
  kerntaken: Kerntaak[];
  initialGoals: Goal[];
  onChange: (goals: Goal[]) => void;
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [selected, setSelected] = useState<number[]>([]);
  const [context, setContext] = useState("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setProposals([]);
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "traject-goals", trajectId, werkprocesIds: selected, context }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Genereren mislukt.");
      return;
    }
    setProposals(data.goals || []);
  }

  function updateProposal(i: number, patch: Partial<Proposal>) {
    setProposals((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function removeProposal(i: number) {
    setProposals((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveProposals() {
    setSaving(true);
    setError(null);
    const saved: Goal[] = [];
    for (const p of proposals) {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "TRAJECT", trajectId, ...p, order: goals.length + saved.length }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Opslaan mislukt.");
        setSaving(false);
        return;
      }
      saved.push(data.goal);
    }
    const updated = [...goals, ...saved];
    setGoals(updated);
    onChange(updated);
    setProposals([]);
    setSaving(false);
  }

  async function deleteGoal(id: number) {
    const res = await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      const updated = goals.filter((g) => g.id !== id);
      setGoals(updated);
      onChange(updated);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-lg">Trajectbrede leerdoelen & -uitkomsten</h2>
        <p className="text-sm text-slate-500">
          Kies de relevante kerntaken en werkprocessen uit het dossier, laat AI leerdoelen voor het hele traject
          voorstellen, bewerk ze naar inzicht en sla ze op.
        </p>
      </div>

      {kerntaken.length > 0 ? (
        <details className="border border-slate-200 rounded-lg p-4">
          <summary className="text-sm font-medium cursor-pointer">
            Kerntaken & werkprocessen ({selected.length} geselecteerd)
          </summary>
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
            {kerntaken.map((kt) => (
              <div key={kt.id}>
                <p className="text-sm font-medium">
                  <span className="badge bg-indigo-50 text-indigo-700 mr-2">{kt.code}</span>
                  {kt.title}
                </p>
                <div className="ml-4 mt-1 space-y-1">
                  {kt.werkprocessen.map((wp) => (
                    <label key={wp.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selected.includes(wp.id)}
                        onChange={() => toggle(wp.id)}
                      />
                      <span>
                        <span className="badge bg-slate-100 text-slate-600 mr-1">{wp.code}</span>
                        {wp.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      ) : (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Er is geen dossier met kerntaken gekoppeld, of het dossier is nog niet geanalyseerd. Analyseer eerst het
          kwalificatiedossier (bij de dossiers) en koppel het aan dit traject.
        </p>
      )}

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="label">Context voor AI (optioneel)</label>
          <input
            className="input"
            placeholder="bijv. niveau 3, focus op serverbeheer"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>
        <button
          onClick={generate}
          className="btn-primary whitespace-nowrap"
          disabled={loading || kerntaken.length === 0}
        >
          {loading ? "AI genereert..." : "✨ AI leerdoelen voorstellen"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {proposals.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">AI-voorstel ({proposals.length} doelen) — bewerk naar eigen inzicht:</p>
          {proposals.map((p, i) => (
            <div key={i} className="border border-indigo-200 bg-indigo-50/50 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  className="input"
                  value={p.title}
                  onChange={(e) => updateProposal(i, { title: e.target.value })}
                  placeholder="Titel"
                />
                <input
                  className="input w-40"
                  value={p.bloomLevel || ""}
                  onChange={(e) => updateProposal(i, { bloomLevel: e.target.value })}
                  placeholder="Bloom"
                />
                <button onClick={() => removeProposal(i)} className="btn-danger text-xs px-2 py-1 h-fit">
                  ✕
                </button>
              </div>
              <textarea
                className="input min-h-16"
                value={p.description}
                onChange={(e) => updateProposal(i, { description: e.target.value })}
                placeholder="Beschrijving / leeruitkomst"
              />
            </div>
          ))}
          <button onClick={saveProposals} className="btn-primary" disabled={saving}>
            {saving ? "Opslaan..." : `Voorstel opslaan (${proposals.length})`}
          </button>
        </div>
      )}

      {goals.length > 0 && (
        <ul className="space-y-2">
          {goals.map((g, i) => (
            <li key={g.id} className="border border-slate-200 rounded-lg p-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {i + 1}. {g.title}
                  {g.bloomLevel && <span className="badge bg-violet-50 text-violet-700 ml-2">{g.bloomLevel}</span>}
                </p>
                <p className="text-sm text-slate-600">{g.description}</p>
              </div>
              <button onClick={() => deleteGoal(g.id)} className="btn-danger text-xs px-2 py-1 h-fit">
                Verwijder
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
