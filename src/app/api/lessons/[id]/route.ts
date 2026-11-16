import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async ({ user }) => {
    const id = Number((await params).id);
    const lesson = await db.lesson.findFirst({
      where: { id },
      include: { traject: { select: { ownerId: true } } },
    });
    if (!lesson || (user.role !== "ADMIN" && lesson.traject.ownerId !== user.id)) {
      return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
    }
    const body = await req.json();
    const updated = await db.lesson.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.date !== undefined && { date: body.date ? new Date(body.date) : null }),
        ...(body.durationMin !== undefined && { durationMin: Number(body.durationMin) }),
        ...(body.introduction !== undefined && { introduction: body.introduction }),
        ...(body.activities !== undefined && { activities: body.activities }),
        ...(body.materials !== undefined && { materials: body.materials }),
        ...(body.assessment !== undefined && { assessment: body.assessment }),
        ...(body.goalIds !== undefined && {
          goals: {
            deleteMany: {},
            create: (body.goalIds as number[]).map((gid) => ({ learningGoalId: gid })),
          },
        }),
      },
      include: { goals: { include: { learningGoal: true } } },
    });
    return NextResponse.json({ lesson: updated });
  });
}
