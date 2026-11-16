"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DossierForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creboCode, setCreboCode] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/dossiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, creboCode, description, content }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Opslaan mislukt.");
      return;
    }
    setTitle("");
    setCreboCode("");
    setDescription("");
    setContent("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Kwalificatiedossier toevoegen
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <h2 className="font-semibold text-lg">Nieuw kwalificatiedossier</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Titel</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="bijv. Software Developer" />
        </div>
        <div>
          <label className="label">CREBO-code (optioneel)</label>
          <input className="input" value={creboCode} onChange={(e) => setCreboCode(e.target.value)} placeholder="bijv. 95331" />
        </div>
      </div>
      <div>
        <label className="label">Korte omschrijving (optioneel)</label>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="label">Inhoud van het dossier</label>
        <textarea
          className="input min-h-40"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          placeholder="Plak hier de relevante tekst uit het kwalificatiedossier (kerntaken, werkprocessen, beroepshouding, etc.)"
        />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Opslaan..." : "Opslaan"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          Annuleren
        </button>
      </div>
    </form>
  );
}
