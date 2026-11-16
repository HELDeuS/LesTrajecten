import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  return withAuth(req, async ({ user }) => {
    const body = await req.json();
    const { lessonId, title, description, type } = body;
    if (!lessonId || !title || !description) {
      return NextResponse.json({ error: "Les, titel en beschrijving zijn verplicht." }, { status: 400 });
    }
    const lesson = await db.lesson.findFirst({
      where: { id: Number(lessonId) },
      include: { traject: { select: { ownerId: true } } },
    });
    if (!lesson || (user.role !== "ADMIN" && lesson.traject.ownerId !== user.id)) {
      return NextResponse.json({ error: "Les niet gevonden." }, { status: 404 });
    }
    const assignment = await db.assignment.create({
      data: {
        lessonId: lesson.id,
        title,
        description,
        type: type || "opdracht",
      },
    });
    return NextResponse.json({ assignment }, { status: 201 });
  });
}

export async function DELETE(req: NextRequest) {
  return withAuth(req, async () => {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id verplicht." }, { status: 400 });
    await db.assignment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
