import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import UserAdmin from "@/components/UserAdmin";
import AiAdmin from "@/components/AiAdmin";

export default async function BeheerPage() {
  await requireAdmin();
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Beheer</h1>
        <p className="text-slate-500">Beheer docent-accounts voor deze omgeving.</p>
      </div>
      <AiAdmin />
      <UserAdmin initialUsers={JSON.parse(JSON.stringify(users))} />
    </div>
  );
}
