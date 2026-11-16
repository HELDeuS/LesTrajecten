import { requireUser } from "@/lib/auth";
import PasswordChange from "@/components/PasswordChange";

export default async function ProfielPage() {
  const user = await requireUser();
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Profiel</h1>
        <p className="text-slate-500">
          {user.name} · {user.email} · <span className="badge bg-slate-100 text-slate-600">{user.role}</span>
        </p>
      </div>
      <PasswordChange />
    </div>
  );
}
