"use client";

import { useState } from "react";

type User = { id: number; name: string; email: string; role: string; createdAt: string };

export default function UserAdmin({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "DOCENT" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetFor, setResetFor] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Aanmaken mislukt.");
      return;
    }
    setUsers((prev) => [...prev, data.user]);
    setForm({ name: "", email: "", password: "", role: "DOCENT" });
  }

  async function resetPassword(id: number) {
    setError(null);
    setMessage(null);
    if (newPassword.length < 8) {
      setError("Het nieuwe wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password: newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Wijzigen mislukt.");
      return;
    }
    setResetFor(null);
    setNewPassword("");
    setMessage("Wachtwoord gewijzigd.");
  }

  async function deleteUser(id: number) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Verwijderen mislukt.");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createUser} className="card p-6 space-y-4">
        <h2 className="font-semibold text-lg">Nieuwe gebruiker</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className="label">Naam</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Wachtwoord</label>
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="DOCENT">Docent</option>
              <option value="ADMIN">Beheerder</option>
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Aanmaken..." : "Gebruiker aanmaken"}
        </button>
      </form>

      <div className="card p-6">
        <h2 className="font-semibold text-lg mb-4">Gebruikers ({users.length})</h2>
        {message && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mb-3">{message}</p>}
        <ul className="divide-y divide-slate-100">
          {users.map((u) => (
            <li key={u.id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {u.name}
                    <span className="badge bg-slate-100 text-slate-600 ml-2">{u.role}</span>
                  </p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setResetFor(resetFor === u.id ? null : u.id)} className="btn-secondary text-xs px-2 py-1">
                    Wachtwoord resetten
                  </button>
                  <button onClick={() => deleteUser(u.id)} className="btn-danger text-xs px-2 py-1">
                    Verwijder
                  </button>
                </div>
              </div>
              {resetFor === u.id && (
                <div className="flex gap-2 mt-3">
                  <input
                    type="password"
                    className="input"
                    placeholder="Nieuw wachtwoord (min. 8 tekens)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button onClick={() => resetPassword(u.id)} className="btn-primary text-xs whitespace-nowrap">
                    Opslaan
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
