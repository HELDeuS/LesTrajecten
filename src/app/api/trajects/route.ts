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
      numberOfLessons,
      lessonDurationMin,
      qualificationFileId,
    } = body;
    if (!title || !subject || !periodStart || !periodEnd || !numberOfLessons || !lessonDurationMin) {
      return NextResponse.json(
        { error: "Titel, vak, periode, aantal lessen en lesduur zijn verplicht." },
        { status: 400 }
      );
    }
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (end < start) {
      return NextResponse.json({ error: "Einde van de periode ligt voor het begin." }, { status: 400 });
    }
    if (numberOfLessons < 1 || numberOfLessons > 200) {
      return NextResponse.json({ error: "Aantal lessen moet tussen 1 en 200 liggen." }, { status: 400 });
    }
    const traject = await db.traject.create({
      data: {
        title,
        subject,
        cohort: cohort || null,
        periodStart: start,
        periodEnd: end,
        numberOfLessons: Number(numberOfLessons),
        lessonDurationMin: Number(lessonDurationMin),
        qualificationFileId: qualificationFileId ? Number(qualificationFileId) : null,
        ownerId: user.id,
        lessons: {
          create: Array.from({ length: Number(numberOfLessons) }, (_, i) => ({
            number: i + 1,
            title: `Les ${i + 1}`,
            durationMin: Number(lessonDurationMin),
          })),
        },
      },
      include: { lessons: true },
    });
    return NextResponse.json({ traject }, { status: 201 });
  });
}
