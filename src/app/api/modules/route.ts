import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  return withAuth(req, async ({ user }) => {
    const body = await req.json();
    const { trajectId, title, description } = body;
    if (!trajectId || !title) {
      return NextResponse.json({ error: "Traject en titel zijn verplicht." }, { status: 400 });
    }
    const traject = await db.traject.findFirst({
      where: { id: Number(trajectId), ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) },
    });
    if (!traject) return NextResponse.json({ error: "Traject niet gevonden." }, { status: 404 });
    const count = await db.module.count({ where: { trajectId: traject.id } });
    const module = await db.module.create({
      data: {
        trajectId: traject.id,
        title,
        description: description || null,
        order: count,
      },
    });
    return NextResponse.json({ module }, { status: 201 });
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(req, async () => {
    const body = await req.json();
    const { id, title, description, order } = body;
    if (!id) return NextResponse.json({ error: "id verplicht." }, { status: 400 });
    const module = await db.module.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(order !== undefined && { order }),
      },
    });
    return NextResponse.json({ module });
  });
}

export async function DELETE(req: NextRequest) {
  return withAuth(req, async () => {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id verplicht." }, { status: 400 });
    await db.module.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
