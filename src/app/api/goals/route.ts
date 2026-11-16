import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const body = await req.json();
    const { scope, title, description, bloomLevel, qualificationFileId, moduleId, trajectId, order } = body;
    if (!title || !description || !(qualificationFileId || moduleId || trajectId)) {
      return NextResponse.json({ error: "Titel, beschrijving en doelbinding zijn verplicht." }, { status: 400 });
    }
    const goal = await db.learningGoal.create({
      data: {
        scope: scope === "MODULE" ? "MODULE" : scope === "TRAJECT" ? "TRAJECT" : "GENERAL",
        title,
        description,
        bloomLevel: bloomLevel || null,
        qualificationFileId: qualificationFileId || null,
        moduleId: moduleId || null,
        trajectId: trajectId || null,
        order: order ?? 0,
      },
    });
    return NextResponse.json({ goal }, { status: 201 });
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(req, async () => {
    const body = await req.json();
    const { id, title, description, bloomLevel, order } = body;
    if (!id) return NextResponse.json({ error: "id verplicht." }, { status: 400 });
    const goal = await db.learningGoal.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(bloomLevel !== undefined && { bloomLevel }),
        ...(order !== undefined && { order }),
      },
    });
    return NextResponse.json({ goal });
  });
}

export async function DELETE(req: NextRequest) {
  return withAuth(req, async () => {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id verplicht." }, { status: 400 });
    await db.learningGoal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
