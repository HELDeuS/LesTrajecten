import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET() {
  return withAdmin(async () => {
    const users = await db.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ users });
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async () => {
    const { name, email, password, role } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Naam, e-mail en wachtwoord zijn verplicht." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Wachtwoord moet minimaal 8 tekens zijn." }, { status: 400 });
    }
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: "Dit e-mailadres is al in gebruik." }, { status: 409 });
    }
    const bcrypt = (await import("bcryptjs")).default;
    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash: await bcrypt.hash(password, 10),
        role: role === "ADMIN" ? "ADMIN" : "DOCENT",
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  });
}

export async function PATCH(req: NextRequest) {
  return withAdmin(async () => {
    const { id, password } = await req.json();
    if (!id || !password) {
      return NextResponse.json({ error: "Gebruiker en nieuw wachtwoord zijn verplicht." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Wachtwoord moet minimaal 8 tekens zijn." }, { status: 400 });
    }
    const target = await db.user.findUnique({ where: { id: Number(id) } });
    if (!target) return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
    const bcrypt = (await import("bcryptjs")).default;
    await db.user.update({
      where: { id: target.id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: NextRequest) {
  return withAdmin(async (admin) => {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id verplicht." }, { status: 400 });
    if (id === admin.id) {
      return NextResponse.json({ error: "Je kunt jezelf niet verwijderen." }, { status: 400 });
    }
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
    if (target.role === "ADMIN") {
      const adminCount = await db.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "De laatste beheerder kan niet verwijderd worden." }, { status: 400 });
      }
    }
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
