import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { AiError, logGeneration, aiJson } from "@/lib/ai";

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
      if (kind === "analyze-dossier") {
        return await analyzeDossier(user.id, body);
      }
      if (kind === "traject-goals") {
        return await generateTrajectGoals(user.id, body);
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
  const result = await aiJson<{ goals: GoalItem[] }>(
    NL_SYSTEM,
    `Analyseer het onderstaande kwalificatiedossier en stel algemene leerdoelen en leeruitkomsten op op niveau 2 (kerndoelen/vakdoelen). Gebruik Bloom-taxonomie voor het niveau. Maximaal 12 doelen.\n\n${input}\n\n` +
      `Antwoord als JSON: {"goals": [{"title": "...", "description": "...", "bloomLevel": "..."}]}`
  );
  await logGeneration(userId, "general-goals", input, JSON.stringify(result));
  return NextResponse.json({ goals: result.goals ?? [] });
}

async function analyzeDossier(userId: number, body: { dossierId: number }) {
  const dossier = await db.qualificationFile.findUnique({
    where: { id: Number(body.dossierId) },
    include: { kerntaken: { include: { werkprocessen: true } } },
  });
  if (!dossier) throw new AiError("Kwalificatiedossier niet gevonden.", 404);
  const input = `Kwalificatiedossier: ${dossier.title}

${dossier.content}`;
  const result = await aiJson<{
    kerntaken: { code: string; title: string; description?: string; werkprocessen: { code: string; title: string; description?: string }[] }[];
  }>(
    NL_SYSTEM,
    `Analyseer het onderstaande kwalificatiedossier en extraheer alle kerntaken met bijbehorende werkprocessen. Gebruik de officiële codes en formuleringen uit het dossier (bijv. kerntaak KT1 met werkprocessen 1.1, 1.2). Voeg geen kerntaken of werkprocessen toe die niet in het dossier staan.

${input}

` +
      `Antwoord als JSON: {"kerntaken": [{"code": "...", "title": "...", "description": "...", "werkprocessen": [{"code": "...", "title": "...", "description": "..."}]}]}`
  );
  await db.kerntaak.deleteMany({ where: { qualificationFileId: dossier.id } });
  const saved = [];
  for (const [ki, kt] of (result.kerntaken ?? []).entries()) {
    const kerntaak = await db.kerntaak.create({
      data: {
        qualificationFileId: dossier.id,
        code: kt.code || `KT${ki + 1}`,
        title: kt.title,
        description: kt.description || null,
        order: ki,
      },
    });
    const wps = [];
    for (const [wi, wp] of (kt.werkprocessen ?? []).entries()) {
      wps.push(
        await db.werkproces.create({
          data: {
            kerntaakId: kerntaak.id,
            code: wp.code || `${ki + 1}.${wi + 1}`,
            title: wp.title,
            description: wp.description || null,
            order: wi,
          },
        })
      );
    }
    saved.push({ ...kerntaak, werkprocessen: wps });
  }
  await logGeneration(userId, "analyze-dossier", input, JSON.stringify(result));
  return NextResponse.json({ kerntaken: saved });
}

async function generateTrajectGoals(
  userId: number,
  body: { trajectId: number; werkprocesIds: number[]; context?: string }
) {
  const traject = await db.traject.findUnique({
    where: { id: Number(body.trajectId) },
    include: {
      qualificationFile: true,
      modules: { orderBy: { order: "asc" } },
    },
  });
  if (!traject) throw new AiError("Traject niet gevonden.", 404);
  const werkprocessen = await db.werkproces.findMany({
    where: { id: { in: (body.werkprocesIds || []).map(Number) } },
    include: { kerntaak: true },
  });
  if (!werkprocessen.length) {
    throw new AiError("Selecteer eerst minimaal één werkproces.", 400);
  }
  const wpText = werkprocessen
    .map((wp) => `- [${wp.kerntaak.code}] ${wp.kerntaak.title} — werkproces ${wp.code}: ${wp.title}${wp.description ? ` (${wp.description})` : ""}`)
    .join("\n");
  const moduleText = traject.modules
    .map((m, i) => `- Periode ${i + 1}: ${m.title} (${m.weeks} weken)`)
    .join("\n");
  const input = `Vak/traject: ${traject.title} (${traject.subject})
Kwalificatiedossier: ${traject.qualificationFile?.title || "geen"}
Gekozen kerntaken en werkprocessen:
${wpText}
Periodes:
${moduleText || "nog geen periodes"}
Extra context: ${body.context || "geen"}`;
  const result = await aiJson<{ goals: GoalItem[] }>(
    NL_SYSTEM,
    `Op basis van de gekozen kerntaken en werkprocessen stel je leerdoelen en leeruitkomsten op voor het COMPLETE traject (niet per periode). Dek alle gekozen werkprocessen af. Formuleer ze toetsbaar en concreet op mbo-niveau, met Bloom-niveau. Maximaal 15 doelen.

${input}

` +
      `Antwoord als JSON: {"goals": [{"title": "...", "description": "...", "bloomLevel": "..."}]}`
  );
  await logGeneration(userId, "traject-goals", input, JSON.stringify(result));
  return NextResponse.json({ goals: result.goals ?? [] });
}

async function generateModuleGoals(
  userId: number,
  body: { moduleId: number; subject: string; context?: string }
) {
  const module = await db.module.findUnique({
    where: { id: Number(body.moduleId) },
    include: {
      traject: {
        include: {
          goals: { where: { scope: "TRAJECT" }, orderBy: { order: "asc" } },
          qualificationFile: { include: { goals: { where: { scope: "GENERAL" } } } },
          modules: { orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!module) throw new AiError("Module niet gevonden.", 404);
  const trajectGoals = module.traject.goals;
  const generalGoals = module.traject.qualificationFile?.goals ?? [];
  const sourceGoals = trajectGoals.length ? trajectGoals : generalGoals;
  if (!sourceGoals.length) {
    throw new AiError(
      "Er zijn nog geen trajectbrede leerdoelen. Genereer eerst leerdoelen voor het traject (of algemene doelen bij het dossier).",
      400
    );
  }
  const moduleIndex = module.traject.modules.findIndex((m) => m.id === module.id);
  const goalText = sourceGoals
    .map((g) => `- ${g.title}: ${g.description}${g.bloomLevel ? ` (Bloom: ${g.bloomLevel})` : ""}`)
    .join("\n");
  const input = `Vak: ${module.traject.subject}\nModule/periode ${moduleIndex + 1} van ${module.traject.modules.length}: ${module.title} (${module.weeks} weken)\n${module.description || ""}\nTrajectbrede leerdoelen:\n${goalText}\nExtra context: ${body.context || "geen"}`;
  const result = await aiJson<{ goals: GoalItem[] }>(
    NL_SYSTEM,
    `Verdeel de onderstaande trajectbrede leerdoelen over deze periode van het traject. Kies de doelen die logisch in deze periode thuishoren (rekening houdend met de positie van de periode in het traject), en werk ze uit naar concrete, toetsbare leerdoelen en leeruitkomsten voor deze periode. Bepaal zelf een passende complexiteit: beginperiodes starten met lagere Bloom-niveaus (kennen/begrijpen/toepassen), latere periodes werken toe op hogere niveaus (analyseren/evalueren/creëren) en integratie van eerdere periodes. Maximaal 10 doelen.\n\n${input}\n\n` +
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
  const result = await aiJson<{
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
  const result = await aiJson<{ assignments: { title: string; description: string; type: string }[] }>(
    NL_SYSTEM,
    `Maak praktische lesopdrachten (individueel, duo of groep) die bij de onderstaande les passen en de leerdoelen oefenen/toetsen. Beschrijf elke opdracht concreet en uitvoerbaar.\n\n${input}\n\n` +
      `Antwoord als JSON: {"assignments": [{"title": "...", "description": "...", "type": "individueel|duo|groep|huiswerk"}]}`
  );
  await logGeneration(userId, "assignments", input, JSON.stringify(result));
  return NextResponse.json({ assignments: result.assignments ?? [] });
}
