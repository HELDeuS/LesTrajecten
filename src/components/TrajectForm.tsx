"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TrajectForm({ dossiers }: { dossiers: { id: number; title: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subject: "",
    cohort: "",
    periodStart: "",
    periodEnd: "",
    numberOfLessons: "12",
    lessonDurationMin: "90",
    qualificationFileId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/trajects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Aanmaken mislukt.");
      return;
    }
    router.push(`/trajecten/${data.traject.id}`);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Nieuw lestraject
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <h2 className="font-semibold text-lg">Nieuw lestraject</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Titel</label>
          <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} required placeholder="bijv. Programmeren met Python" />
        </div>
        <div>
          <label className="label">Vak / onderwerp</label>
          <input className="input" value={form.subject} onChange={(e) => set("subject", e.target.value)} required placeholder="bijv. Informatica" />
        </div>
        <div>
          <label className="label">Cohort / groep (optioneel)</label>
          <input className="input" value={form.cohort} onChange={(e) => set("cohort", e.target.value)} placeholder="bijv. Klas B2-IA" />
        </div>
        <div>
          <label className="label">Kwalificatiedossier</label>
          <select className="input" value={form.qualificationFileId} onChange={(e) => set("qualificationFileId", e.target.value)}>
            <option value="">— geen —</option>
            {dossiers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Periode start</label>
          <input type="date" className="input" value={form.periodStart} onChange={(e) => set("periodStart", e.target.value)} required />
        </div>
        <div>
          <label className="label">Periode einde</label>
          <input type="date" className="input" value={form.periodEnd} onChange={(e) => set("periodEnd", e.target.value)} required />
        </div>
        <div>
          <label className="label">Aantal lessen</label>
          <input type="number" min={1} max={200} className="input" value={form.numberOfLessons} onChange={(e) => set("numberOfLessons", e.target.value)} required />
        </div>
        <div>
          <label className="label">Lesduur (minuten)</label>
          <input type="number" min={20} max={480} className="input" value={form.lessonDurationMin} onChange={(e) => set("lessonDurationMin", e.target.value)} required />
        </div>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Aanmaken..." : "Lestraject aanmaken"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          Annuleren
        </button>
      </div>
    </form>
  );
}
