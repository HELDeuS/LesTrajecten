import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { AiError, logGeneration, mistralJson } from "@/lib/ai";

type GoalItem = { title: string; description: string; bloomLevel?: string };

const NL_SYSTEM =
  "Je bent een expert in het Nederlands mbo-onderwijs en curriculumontwerp. " +
  "Je werkt volgens de richtlijnen van kwalificatiedossiers (KBB/SBB), Bloom-taxonomie en constructief alignment. " +
  "Je antwoordt altijd in het Nederlands en alleen met geldige JSON in het gevraagde formaat.";

export async function POST(req: NextRequest) {
  return withAuth(req, async ({ user }) => {
    const body = await req.json();
    const { kind } = body;

    try {
      if (kind === "general-goals") {
        return await generateGeneralGoals(user.id, body);
      }
      if (kind === "module-goals") {
        return await generateModuleGoals(user.id, body);
      }
      if (kind === "lesson-plan") {
        return await generateLessonPlan(user.id, body);
      }
      if (kind === "assignments") {
        return await generateAssignments(user.id, body);
      }
      return NextResponse.json({ error: "Onbekend generatietype." }, { status: 400 });
    } catch (e) {
      if (e instanceof AiError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
  });
}

async function generateGeneralGoals(userId: number, body: { dossierId: number; context?: string }) {
  const dossier = await db.qualificationFile.findUnique({ where: { id: Number(body.dossierId) } });
  if (!dossier) throw new AiError("Kwalificatiedossier niet gevonden.", 404);
  const input = `Kwalificatiedossier: ${dossier.title}\n\n${dossier.content}\n\nExtra context: ${body.context || "geen"}`;
  const result = await mistralJson<{ goals: GoalItem[] }>(
    NL_SYSTEM,
    `Analyseer het onderstaande kwalificatiedossier en stel algemene leerdoelen en leeruitkomsten op op niveau 2 (kerndoelen/vakdoelen). Gebruik Bloom-taxonomie voor het niveau. Maximaal 12 doelen.\n\n${input}\n\n` +
      `Antwoord als JSON: {"goals": [{"title": "...", "description": "...", "bloomLevel": "..."}]}`
  );
  await logGeneration(userId, "general-goals", input, JSON.stringify(result));
  return NextResponse.json({ goals: result.goals ?? [] });
}

async function generateModuleGoals(
  userId: number,
  body: { moduleId: number; subject: string; context?: string }
) {
  const module = await db.module.findUnique({
    where: { id: Number(body.moduleId) },
    include: {
      traject: { include: { qualificationFile: { include: { goals: { where: { scope: "GENERAL" } } } } } },
    },
  });
  if (!module) throw new AiError("Module niet gevonden.", 404);
  const generalGoals =
    module.traject.qualificationFile?.goals.map((g) => `- ${g.title}: ${g.description}`).join("\n") ||
    "Geen algemene leerdoelen beschikbaar.";
  const input = `Vak: ${module.traject.subject}\nModule: ${module.title}\n${module.description || ""}\nAlgemene leerdoelen:\n${generalGoals}\nExtra context: ${body.context || "geen"}`;
  const result = await mistralJson<{ goals: GoalItem[] }>(
    NL_SYSTEM,
    `Verdiep de onderstaande algemene leerdoelen naar specifieke leerdoelen en leeruitkomsten voor dit vak en deze module. Maak ze concreet, toetsbaar en passend op mbo-niveau. Maximaal 10 doelen.\n\n${input}\n\n` +
      `Antwoord als JSON: {"goals": [{"title": "...", "description": "...", "bloomLevel": "..."}]}`
  );
  await logGeneration(userId, "module-goals", input, JSON.stringify(result));
  return NextResponse.json({ goals: result.goals ?? [] });
}

async function generateLessonPlan(
  userId: number,
  body: { lessonId: number; goalIds?: number[]; context?: string }
) {
  const lesson = await db.lesson.findUnique({
    where: { id: Number(body.lessonId) },
    include: {
      traject: true,
      module: { include: { _count: { select: { lessons: true } } } },
      goals: { include: { learningGoal: true } },
    },
  });
  if (!lesson) throw new AiError("Les niet gevonden.", 404);
  const goalIds = body.goalIds?.length
    ? body.goalIds
    : lesson.goals.map((lg) => lg.learningGoalId);
  const goals = await db.learningGoal.findMany({ where: { id: { in: goalIds } } });
  const goalText =
    goals.map((g) => `- ${g.title}: ${g.description}${g.bloomLevel ? ` (Bloom: ${g.bloomLevel})` : ""}`).join("\n") ||
    "Geen leerdoelen gekoppeld.";
  const input = `Traject: ${lesson.traject.title} (vak: ${lesson.traject.subject})\nLes ${lesson.numberInModule} van ${lesson.module._count.lessons} in module "${lesson.module.title}", week ${lesson.week} van het traject, duur ${lesson.durationMin} minuten\nLeerdoelen:\n${goalText}\nExtra context: ${body.context || "geen"}`;
  const result = await mistralJson<{
    title: string;
    introduction: string;
    activities: string;
    materials: string;
    assessment: string;
  }>(
    NL_SYSTEM,
    `Ontwerp een concreet lesplan voor de onderstaande les met een didactische structuur (bijv. directe instructie, verwerkingsfase, afsluiting). Houd rekening met de lesduur. Geef per fase tijdsindicaties.\n\n${input}\n\n` +
      `Antwoord als JSON: {"title": "...", "introduction": "...", "activities": "...", "materials": "...", "assessment": "..."}`
  );
  await logGeneration(userId, "lesson-plan", input, JSON.stringify(result));
  return NextResponse.json({ plan: result });
}

async function generateAssignments(
  userId: number,
  body: { lessonId: number; count?: number; context?: string }
) {
  const lesson = await db.lesson.findUnique({
    where: { id: Number(body.lessonId) },
    include: { goals: { include: { learningGoal: true } }, traject: true },
  });
  if (!lesson) throw new AiError("Les niet gevonden.", 404);
  const goalText =
    lesson.goals.map((lg) => `- ${lg.learningGoal.title}: ${lg.learningGoal.description}`).join("\n") ||
    "Geen leerdoelen gekoppeld.";
  const input = `Les: ${lesson.title} (vak: ${lesson.traject.subject}, ${lesson.durationMin} min)\nLeerdoelen:\n${goalText}\nAantal opdrachten: ${body.count || 3}\nExtra context: ${body.context || "geen"}`;
  const result = await mistralJson<{ assignments: { title: string; description: string; type: string }[] }>(
    NL_SYSTEM,
    `Maak praktische lesopdrachten (individueel, duo of groep) die bij de onderstaande les passen en de leerdoelen oefenen/toetsen. Beschrijf elke opdracht concreet en uitvoerbaar.\n\n${input}\n\n` +
      `Antwoord als JSON: {"assignments": [{"title": "...", "description": "...", "type": "individueel|duo|groep|huiswerk"}]}`
  );
  await logGeneration(userId, "assignments", input, JSON.stringify(result));
  return NextResponse.json({ assignments: result.assignments ?? [] });
}
