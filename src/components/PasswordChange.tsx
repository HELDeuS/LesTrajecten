"use client";

import { useState } from "react";

export default function PasswordChange() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirm) {
      setError("De nieuwe wachtwoorden komen niet overeen.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Wijzigen mislukt.");
      return;
    }
    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <h2 className="font-semibold text-lg">Wachtwoord wijzigen</h2>
      <div>
        <label className="label">Huidig wachtwoord</label>
        <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
      </div>
      <div>
        <label className="label">Nieuw wachtwoord (min. 8 tekens)</label>
        <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
      </div>
      <div>
        <label className="label">Nieuw wachtwoord bevestigen</label>
        <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">Wachtwoord gewijzigd.</p>}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Opslaan..." : "Wachtwoord wijzigen"}
      </button>
    </form>
  );
}
