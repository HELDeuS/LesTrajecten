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
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);

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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadInfo(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/dossiers/extract-pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "PDF-extractie mislukt.");
        return;
      }
      setContent(data.content);
      if (!title) {
        setTitle(file.name.replace(/\.pdf$/i, ""));
      }
      setUploadInfo(
        `Geëxtraheerd uit ${file.name} (${Math.round(file.size / 1024)} kB). Controleer de inhoud hieronder en pas aan waar nodig.`
      );
    } catch {
      setError("Het uploaden of extraheren mislukte. Probeer het opnieuw.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
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
        <div className="flex flex-wrap gap-2 mb-2">
          <label className="btn-secondary cursor-pointer">
            {uploading ? "AI extraheert tekst..." : "📄 Pdf uploaden (AI-extractie)"}
            <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          <span className="text-xs text-slate-400 self-center">of plak hieronder de tekst handmatig</span>
        </div>
        {uploadInfo && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mb-2">{uploadInfo}</p>}
        <textarea
          className="input min-h-40"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          placeholder="Upload een pdf of plak hier de relevante tekst uit het kwalificatiedossier (kerntaken, werkprocessen, beroepshouding, etc.)"
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
