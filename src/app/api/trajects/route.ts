import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  return withAuth(req, async ({ user }) => {
    const body = await req.json();
    const {
      title,
      subject,
      cohort,
      periodStart,
      periodEnd,
      lessonsPerWeek,
      lessonDurationMin,
      qualificationFileId,
    } = body;
    if (!title || !subject || !periodStart || !periodEnd || !lessonsPerWeek || !lessonDurationMin) {
      return NextResponse.json(
        { error: "Titel, vak, periode, lessen per week en lesduur zijn verplicht." },
        { status: 400 }
      );
    }
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (end < start) {
      return NextResponse.json({ error: "Einde van de periode ligt voor het begin." }, { status: 400 });
    }
    const lpw = Number(lessonsPerWeek);
    const dur = Number(lessonDurationMin);
    if (lpw < 1 || lpw > 7) {
      return NextResponse.json({ error: "Lessen per week moet tussen 1 en 7 liggen." }, { status: 400 });
    }
    if (dur < 20 || dur > 480) {
      return NextResponse.json({ error: "Lesduur moet tussen 20 en 480 minuten liggen." }, { status: 400 });
    }
    const traject = await db.traject.create({
      data: {
        title,
        subject,
        cohort: cohort || null,
        periodStart: start,
        periodEnd: end,
        lessonsPerWeek: lpw,
        lessonDurationMin: dur,
        qualificationFileId: qualificationFileId ? Number(qualificationFileId) : null,
        ownerId: user.id,
      },
    });
    return NextResponse.json({ traject }, { status: 201 });
  });
}
