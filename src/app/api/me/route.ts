import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  return withAuth(req, async ({ user }) => {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Huidig en nieuw wachtwoord zijn verplicht." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Het nieuwe wachtwoord moet minimaal 8 tekens zijn." }, { status: 400 });
    }
    const record = await db.user.findUnique({ where: { id: user.id } });
    if (!record) return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
    const bcrypt = (await import("bcryptjs")).default;
    const valid = await bcrypt.compare(currentPassword, record.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Huidig wachtwoord is onjuist." }, { status: 401 });
    }
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });
    return NextResponse.json({ ok: true });
  });
}
