import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { renumberTraject } from "@/lib/planning";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async ({ user }) => {
    const id = Number((await params).id);
    const traject = await db.traject.findFirst({
      where: { id, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) },
      include: {
        qualificationFile: { include: { goals: { where: { scope: "GENERAL" }, orderBy: { order: "asc" } } } },
        modules: {
          orderBy: { order: "asc" },
          include: {
            goals: { orderBy: { order: "asc" } },
            lessons: { orderBy: { numberInModule: "asc" }, include: { goals: { include: { learningGoal: true } }, assignments: true } },
          },
        },
      },
    });
    if (!traject) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
    return NextResponse.json({ traject: JSON.parse(JSON.stringify(traject)) });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async ({ user }) => {
    const id = Number((await params).id);
    const traject = await db.traject.findFirst({
      where: { id, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) },
    });
    if (!traject) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
    const body = await req.json();
    const updated = await db.traject.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.subject !== undefined && { subject: body.subject }),
        ...(body.cohort !== undefined && { cohort: body.cohort }),
        ...(body.periodStart && { periodStart: new Date(body.periodStart) }),
        ...(body.periodEnd && { periodEnd: new Date(body.periodEnd) }),
        ...(body.lessonsPerWeek !== undefined && { lessonsPerWeek: Number(body.lessonsPerWeek) }),
        ...(body.lessonDurationMin !== undefined && { lessonDurationMin: Number(body.lessonDurationMin) }),
        ...(body.qualificationFileId !== undefined && {
          qualificationFileId: body.qualificationFileId ? Number(body.qualificationFileId) : null,
        }),
      },
    });
    await renumberTraject(updated.id);
    return NextResponse.json({ traject: updated });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async ({ user }) => {
    const id = Number((await params).id);
    const traject = await db.traject.findFirst({
      where: { id, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) },
    });
    if (!traject) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
    await db.traject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
