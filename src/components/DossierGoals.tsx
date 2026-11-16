"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Goal = { id: number; title: string; description: string; bloomLevel: string | null };

export default function DossierGoals({
  dossierId,
  initialGoals,
}: {
  dossierId: number;
  initialGoals: Goal[];
}) {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState({ title: "", description: "", bloomLevel: "" });

  async function generateGoals() {
    setGenerating(true);
    setError(null);
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "general-goals", dossierId, context }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error || "Genereren mislukt.");
      return;
    }
    setGoals((prev) => [...prev, ...data.goals.map((g: Goal, i: number) => ({ ...g, id: -(prev.length + i + 1) }))]);
  }

  async function saveGoals() {
    setSaving(true);
    setError(null);
    const unsaved = goals.filter((g) => g.id < 0);
    for (const g of unsaved) {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "GENERAL", qualificationFileId: dossierId, ...g, order: goals.indexOf(g) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Opslaan mislukt.");
        setSaving(false);
        return;
      }
      const saved = await res.json();
      setGoals((prev) => prev.map((x) => (x.id === g.id ? saved.goal : x)));
    }
    setSaving(false);
    router.refresh();
  }

  async function deleteGoal(id: number) {
    if (id > 0) {
      await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
    router.refresh();
  }

  async function addManualGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!newGoal.title || !newGoal.description) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "GENERAL",
        qualificationFileId: dossierId,
        ...newGoal,
        order: goals.length,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setGoals((prev) => [...prev, data.goal]);
      setNewGoal({ title: "", description: "", bloomLevel: "" });
      router.refresh();
    }
  }

  const hasUnsaved = goals.some((g) => g.id < 0);

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Algemene leerdoelen en -uitkomsten</h2>
        <button onClick={generateGoals} className="btn-primary" disabled={generating}>
          {generating ? "AI genereert..." : "✨ Genereren met AI"}
        </button>
      </div>
      <input
        className="input"
        placeholder="Optionele context voor AI (bijv. niveau, doelgroep, specifieke focus)"
        value={context}
        onChange={(e) => setContext(e.target.value)}
      />
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {goals.length === 0 && !generating && (
        <p className="text-sm text-slate-500">
          Nog geen leerdoelen. Genereer ze met AI of voeg ze handmatig toe.
        </p>
      )}
      <ul className="space-y-3">
        {goals.map((g, i) => (
          <li key={g.id} className="border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">
                {i + 1}. {g.title}
                {g.bloomLevel && (
                  <span className="badge bg-violet-50 text-violet-700 ml-2">{g.bloomLevel}</span>
                )}
                {g.id < 0 && <span className="badge bg-amber-50 text-amber-700 ml-2">nieuw</span>}
              </p>
              <p className="text-sm text-slate-600 mt-1">{g.description}</p>
            </div>
            <button onClick={() => deleteGoal(g.id)} className="btn-danger text-xs px-2 py-1">
              Verwijder
            </button>
          </li>
        ))}
      </ul>
      {hasUnsaved && (
        <button onClick={saveGoals} className="btn-primary" disabled={saving}>
          {saving ? "Opslaan..." : "Nieuwe doelen opslaan"}
        </button>
      )}
      <form onSubmit={addManualGoal} className="border-t border-slate-100 pt-4 grid md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="label">Handmatig doel toevoegen: titel</label>
          <input className="input" value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Bloom-niveau</label>
          <input className="input" value={newGoal.bloomLevel} onChange={(e) => setNewGoal({ ...newGoal, bloomLevel: e.target.value })} placeholder="bijv. Toepassen" />
        </div>
        <div>
          <label className="label">Beschrijving</label>
          <input className="input" value={newGoal.description} onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })} />
        </div>
        <div className="md:col-span-4">
          <button type="submit" className="btn-secondary">
            Doel toevoegen
          </button>
        </div>
      </form>
    </div>
  );
}
