import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { AiError, mistralJson } from "@/lib/ai";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async ({ user }) => {
    const id = Number((await params).id);
    const lesson = await db.lesson.findFirst({
      where: { id },
      include: {
        traject: true,
        goals: { include: { learningGoal: true } },
        assignments: true,
      },
    });
    if (!lesson || (user.role !== "ADMIN" && lesson.traject.ownerId !== user.id)) {
      return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
    }

    const goalText =
      lesson.goals.map((lg) => `- ${lg.learningGoal.title}: ${lg.learningGoal.description}`).join("\n") ||
      "Geen leerdoelen gekoppeld.";
    const input = `Les: ${lesson.title}\nVak: ${lesson.traject.subject}\nLeerdoelen:\n${goalText}\n\nInleiding: ${lesson.introduction || "geen"}\nActiviteiten: ${lesson.activities || "geen"}`;
    const outline = await mistralJson<{ slides: { title: string; bullets: string[] }[] }>(
      "Je bent expert in onderwijs en presentaties. Antwoord in het Nederlands met geldige JSON.",
      `Maak een presentatie-outline voor de volgende les. Maximaal 10 slides, per slide maximaal 5 korte bullets.\n\n${input}\n\n` +
        `Antwoord als JSON: {"slides": [{"title": "...", "bullets": ["...", "..."]}]}`
    );

    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_16x9";
    pptx.title = lesson.title;

    const title = pptx.addSlide();
    title.addText(lesson.title, { x: 0.5, y: 2.0, fontSize: 32, bold: true, color: "FFFFFF" });
    title.addText(`${lesson.traject.subject} — Les ${lesson.number}`, {
      x: 0.5, y: 3.0, fontSize: 18, color: "D9E2FF",
    });
    title.background = { color: "4F46E5" };

    const goalsSlide = pptx.addSlide();
    goalsSlide.addText("Leerdoelen", { x: 0.5, y: 0.4, fontSize: 24, bold: true });
    lesson.goals.forEach((lg, i) => {
      goalsSlide.addText(`${i + 1}. ${lg.learningGoal.title}`, {
        x: 0.7, y: 1.2 + i * 0.6, fontSize: 14,
      });
    });

    for (const slide of outline.slides ?? []) {
      const s = pptx.addSlide();
      s.addText(slide.title, { x: 0.5, y: 0.4, fontSize: 22, bold: true, color: "4F46E5" });
      (slide.bullets ?? []).forEach((b, i) => {
        s.addText(b, { x: 0.7, y: 1.3 + i * 0.55, fontSize: 14, color: "333333" });
      });
    }

    if (lesson.assignments.length) {
      const s = pptx.addSlide();
      s.addText("Opdrachten", { x: 0.5, y: 0.4, fontSize: 22, bold: true, color: "4F46E5" });
      lesson.assignments.forEach((a, i) => {
        s.addText(`${i + 1}. ${a.title}`, { x: 0.7, y: 1.2 + i * 0.7, fontSize: 14 });
      });
    }

    const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    const filename = `les-${lesson.number}-${lesson.title.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40)}.pptx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }).catch((e) => {
    if (e instanceof AiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  });
}
