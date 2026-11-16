import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { renumberTraject } from "@/lib/planning";

export async function POST(req: NextRequest) {
  return withAuth(req, async ({ user }) => {
    const body = await req.json();
    const { trajectId, title, description, weeks } = body;
    if (!trajectId || !title) {
      return NextResponse.json({ error: "Traject en titel zijn verplicht." }, { status: 400 });
    }
    const traject = await db.traject.findFirst({
      where: { id: Number(trajectId), ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) },
    });
    if (!traject) return NextResponse.json({ error: "Traject niet gevonden." }, { status: 404 });
    const w = Number(weeks) || 6;
    if (w < 1 || w > 52) {
      return NextResponse.json({ error: "Aantal weken moet tussen 1 en 52 liggen." }, { status: 400 });
    }
    const count = await db.module.count({ where: { trajectId: traject.id } });
    const module = await db.module.create({
      data: {
        trajectId: traject.id,
        title,
        description: description || null,
        weeks: w,
        order: count,
      },
    });
    await renumberTraject(traject.id);
    return NextResponse.json({ module }, { status: 201 });
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(req, async () => {
    const body = await req.json();
    const { id, title, description, weeks, order } = body;
    if (!id) return NextResponse.json({ error: "id verplicht." }, { status: 400 });
    if (weeks !== undefined && (Number(weeks) < 1 || Number(weeks) > 52)) {
      return NextResponse.json({ error: "Aantal weken moet tussen 1 en 52 liggen." }, { status: 400 });
    }
    const existing = await db.module.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Module niet gevonden." }, { status: 404 });
    const module = await db.module.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(weeks !== undefined && { weeks: Number(weeks) }),
        ...(order !== undefined && { order }),
      },
    });
    await renumberTraject(module.trajectId);
    return NextResponse.json({ module });
  });
}

export async function DELETE(req: NextRequest) {
  return withAuth(req, async () => {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id verplicht." }, { status: 400 });
    const existing = await db.module.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Module niet gevonden." }, { status: 404 });
    await db.module.delete({ where: { id } });
    await renumberTraject(existing.trajectId);
    return NextResponse.json({ ok: true });
  });
}
