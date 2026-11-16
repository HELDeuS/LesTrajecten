import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async ({ user }) => {
    const id = Number((await params).id);
    const dossier = await db.qualificationFile.findFirst({
      where: { id, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) },
    });
    if (!dossier) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
    const body = await req.json();
    const updated = await db.qualificationFile.update({
      where: { id },
      data: {
        title: body.title ?? dossier.title,
        creboCode: body.creboCode ?? dossier.creboCode,
        description: body.description ?? dossier.description,
        content: body.content ?? dossier.content,
      },
    });
    return NextResponse.json({ dossier: updated });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async ({ user }) => {
    const id = Number((await params).id);
    const dossier = await db.qualificationFile.findFirst({
      where: { id, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) },
    });
    if (!dossier) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
    await db.qualificationFile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
