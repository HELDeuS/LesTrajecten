"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import TrajectGoals from "./TrajectGoals";

type Goal = { id: number; title: string; description: string; bloomLevel: string | null; scope: string };
type Module = {
  id: number;
  title: string;
  description: string | null;
  weeks: number;
  order: number;
  goals: Goal[];
  lessons: Lesson[];
};
type Assignment = { id: number; title: string; description: string; type: string };
type Lesson = {
  id: number;
  number: number;
  numberInModule: number;
  week: number;
  title: string;
  date: string | null;
  durationMin: number;
  introduction: string | null;
  activities: string | null;
  materials: string | null;
  assessment: string | null;
  aiGenerated: boolean;
  goals: { learningGoalId: number; learningGoal: Goal }[];
  assignments: Assignment[];
};
type Traject = {
  id: number;
  title: string;
  subject: string;
  cohort: string | null;
  periodStart: string;
  periodEnd: string;
  lessonsPerWeek: number;
  lessonDurationMin: number;
  goals: Goal[];
  qualificationFile: { title: string; goals: Goal[]; kerntaken: { id: number; code: string; title: string; werkprocessen: { id: number; code: string; title: string }[] }[] } | null;
  modules: Module[];
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("nl-NL") : "geen datum");

export default function TrajectDetail({ traject }: { traject: Traject }) {
  const router = useRouter();
  const [modules, setModules] = useState(traject.modules);
  const [trajectGoals, setTrajectGoals] = useState(traject.goals);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newModule, setNewModule] = useState({ title: "", description: "", weeks: "6" });

  const totalWeeks = modules.reduce((s, m) => s + m.weeks, 0);
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);

  const allGoals = [
    ...trajectGoals.map((g) => ({ ...g, scope: "TRAJECT" })),
    ...(traject.qualificationFile?.goals.map((g) => ({ ...g, scope: "GENERAL" })) || []),
    ...modules.flatMap((m) => m.goals.map((g) => ({ ...g, scope: "MODULE" }))),
  ];

  async function api(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Actie mislukt.");
    return data;
  }

  async function reload() {
    const res = await fetch(`/api/trajects/${traject.id}`);
    router.refresh();
    if (res.ok) {
      const data = await res.json();
      setModules(data.traject.modules);
    }
  }

  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newModule.title) return;
    setError(null);
    try {
      await api("/api/modules", "POST", { trajectId: traject.id, ...newModule });
      setNewModule({ title: "", description: "", weeks: "6" });
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deleteModule(id: number) {
    setError(null);
    try {
      await api(`/api/modules?id=${id}`, "DELETE");
      setModules((prev) => prev.filter((m) => m.id !== id));
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function updateModule(id: number, patch: Record<string, unknown>) {
    setError(null);
    try {
      await api("/api/modules", "PATCH", { id, ...patch });
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function generateModuleGoals(moduleId: number) {
    setBusy(`module-${moduleId}`);
    setError(null);
    try {
      const data = await api("/api/ai/generate", "POST", {
        kind: "module-goals",
        moduleId,
        subject: traject.subject,
      });
      for (const g of data.goals) {
        await api("/api/goals", "POST", { scope: "MODULE", moduleId, ...g });
      }
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function updateLesson(lessonId: number, patch: Record<string, unknown>) {
    await api(`/api/lessons/${lessonId}`, "PATCH", patch);
    await reload();
  }

  async function generateLessonPlan(lesson: Lesson, goalIds: number[]) {
    setBusy(`lesson-${lesson.id}`);
    setError(null);
    try {
      const data = await api("/api/ai/generate", "POST", {
        kind: "lesson-plan",
        lessonId: lesson.id,
        goalIds,
      });
      const { title, introduction, activities, materials, assessment } = data.plan;
      await updateLesson(lesson.id, { title, introduction, activities, materials, assessment });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function generateAssignments(lesson: Lesson) {
    setBusy(`assignments-${lesson.id}`);
    setError(null);
    try {
      const data = await api("/api/ai/generate", "POST", { kind: "assignments", lessonId: lesson.id });
      for (const a of data.assignments) {
        await api("/api/assignments", "POST", { lessonId: lesson.id, ...a, aiGenerated: true });
      }
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function deleteAssignment(lessonId: number, id: number) {
    await api(`/api/assignments?id=${id}`, "DELETE");
    await reload();
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/trajecten" className="text-sm text-indigo-600 hover:underline">
          ← Alle lestrajecten
        </Link>
        <h1 className="text-2xl font-bold mt-2">{traject.title}</h1>
        <p className="text-slate-500">
          {traject.subject}
          {traject.cohort ? ` · ${traject.cohort}` : ""} · {fmt(traject.periodStart)} – {fmt(traject.periodEnd)} ·{" "}
          {traject.lessonsPerWeek} lessen/week · {traject.lessonDurationMin} min/les
          {traject.qualificationFile && ` · Dossier: ${traject.qualificationFile.title}`}
        </p>
        <p className="text-sm text-slate-600 mt-1">
          <strong>{modules.length}</strong> modules · <strong>{totalWeeks}</strong> weken ·{" "}
          <strong>{totalLessons}</strong> lessen
        </p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <TrajectGoals
        trajectId={traject.id}
        kerntaken={traject.qualificationFile?.kerntaken || []}
        initialGoals={trajectGoals}
        onChange={(gs) => setTrajectGoals(gs.map((g) => ({ ...g, scope: "TRAJECT" })))}
      />

      {modules.map((m, mi) => (
        <section key={m.id} className="card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold text-indigo-600 uppercase">Periode {mi + 1}</p>
              <h2 className="font-semibold text-lg">{m.title}</h2>
              {m.description && <p className="text-sm text-slate-500">{m.description}</p>}
              <p className="text-sm text-slate-600 mt-1">
                {m.weeks} weken · {m.lessons.length} lessen · {m.goals.length} leerdoelen
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <div className="flex gap-2">
                <button
                  onClick={() => generateModuleGoals(m.id)}
                  className="btn-primary text-xs px-2 py-1"
                  disabled={busy === `module-${m.id}`}
                >
                  {busy === `module-${m.id}` ? "AI verdeelt..." : "✨ AI verdeel doelen over periode"}
                </button>
                <button onClick={() => deleteModule(m.id)} className="btn-danger text-xs px-2 py-1">
                  Verwijder
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Weken:</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  defaultValue={m.weeks}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== m.weeks && v >= 1) updateModule(m.id, { weeks: v });
                  }}
                  className="input w-20 px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>

          {m.goals.length > 0 && (
            <details className="border border-slate-200 rounded-lg p-3">
              <summary className="text-sm font-medium cursor-pointer">Leerdoelen ({m.goals.length})</summary>
              <ul className="mt-2 space-y-1">
                {m.goals.map((g) => (
                  <li key={g.id} className="text-sm text-slate-600 flex gap-2">
                    <span className="text-indigo-500">◆</span>
                    <span>
                      <span className="font-medium">{g.title}</span>
                      {g.bloomLevel && <span className="badge bg-violet-50 text-violet-700 ml-1">{g.bloomLevel}</span>}
                      <span className="text-slate-500"> — {g.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="space-y-3">
            {m.lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                allGoals={allGoals}
                busy={busy}
                onSave={updateLesson}
                onGeneratePlan={generateLessonPlan}
                onGenerateAssignments={generateAssignments}
                onDeleteAssignment={deleteAssignment}
              />
            ))}
          </div>
        </section>
      ))}

      <form onSubmit={addModule} className="card p-6">
        <h2 className="font-semibold text-lg mb-4">Nieuwe module/periode toevoegen</h2>
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="label">Titel</label>
            <input
              className="input"
              placeholder="bijv. Periode 1: Linux basis"
              value={newModule.title}
              onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Aantal weken</label>
            <input
              type="number"
              min={1}
              max={52}
              className="input"
              value={newModule.weeks}
              onChange={(e) => setNewModule({ ...newModule, weeks: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Omschrijving (optioneel)</label>
            <input
              className="input"
              value={newModule.description}
              onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
            />
          </div>
        </div>
        <button type="submit" className="btn-primary mt-4">
          Module toevoegen
        </button>
        <p className="text-xs text-slate-400 mt-2">
          Lessen worden automatisch aangemaakt (weken × {traject.lessonsPerWeek} lessen/week) en over de periode
          ingepland vanaf de startdatum.
        </p>
      </form>
    </div>
  );
}

function LessonCard({
  lesson,
  allGoals,
  busy,
  onSave,
  onGeneratePlan,
  onGenerateAssignments,
  onDeleteAssignment,
}: {
  lesson: Lesson;
  allGoals: (Goal & { scope: string })[];
  busy: string | null;
  onSave: (id: number, patch: Record<string, unknown>) => Promise<void>;
  onGeneratePlan: (lesson: Lesson, goalIds: number[]) => Promise<void>;
  onGenerateAssignments: (lesson: Lesson) => Promise<void>;
  onDeleteAssignment: (lessonId: number, id: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [date, setDate] = useState(lesson.date ? lesson.date.slice(0, 10) : "");
  const [introduction, setIntroduction] = useState(lesson.introduction || "");
  const [activities, setActivities] = useState(lesson.activities || "");
  const [materials, setMaterials] = useState(lesson.materials || "");
  const [assessment, setAssessment] = useState(lesson.assessment || "");
  const [selectedGoals, setSelectedGoals] = useState<number[]>(lesson.goals.map((g) => g.learningGoalId));
  const [saving, setSaving] = useState(false);

  function toggleGoal(id: number) {
    setSelectedGoals((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  async function save() {
    setSaving(true);
    await onSave(lesson.id, {
      title,
      date: date || null,
      introduction,
      activities,
      materials,
      assessment,
      goalIds: selectedGoals,
    });
    setSaving(false);
  }

  return (
    <div className="border border-slate-200 rounded-lg">
      <button
        className="w-full flex items-center justify-between p-3 text-left"
        onClick={() => setOpen(!open)}
      >
        <div>
          <p className="font-medium text-sm">
            Les {lesson.number} ({lesson.numberInModule} in periode): {lesson.title}
            {lesson.aiGenerated && <span className="badge bg-emerald-50 text-emerald-700 ml-2">AI</span>}
          </p>
          <p className="text-xs text-slate-400">
            Week {lesson.week} · {fmt(lesson.date)} · {lesson.durationMin} min · {lesson.goals.length} leerdoelen ·{" "}
            {lesson.assignments.length} opdrachten
          </p>
        </div>
        <span className="text-slate-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">Titel</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <p className="label">Gekoppelde leerdoelen</p>
            <div className="grid md:grid-cols-2 gap-1 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {allGoals.length === 0 && <p className="text-sm text-slate-400">Geen leerdoelen beschikbaar.</p>}
              {allGoals.map((g) => (
                <label key={g.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedGoals.includes(g.id)}
                    onChange={() => toggleGoal(g.id)}
                  />
                  <span>
                    {g.title}
                    <span className="badge bg-slate-100 text-slate-500 ml-1">
                      {g.scope === "GENERAL" ? "algemeen" : g.scope === "TRAJECT" ? "traject" : "module"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">Inleiding</label>
              <textarea className="input min-h-24" value={introduction} onChange={(e) => setIntroduction(e.target.value)} />
            </div>
            <div>
              <label className="label">Activiteiten</label>
              <textarea className="input min-h-24" value={activities} onChange={(e) => setActivities(e.target.value)} />
            </div>
            <div>
              <label className="label">Materialen</label>
              <textarea className="input min-h-16" value={materials} onChange={(e) => setMaterials(e.target.value)} />
            </div>
            <div>
              <label className="label">Beoordeling / afsluiting</label>
              <textarea className="input min-h-16" value={assessment} onChange={(e) => setAssessment(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={save} className="btn-primary" disabled={saving}>
              {saving ? "Opslaan..." : "Les opslaan"}
            </button>
            <button
              onClick={() => onGeneratePlan(lesson, selectedGoals)}
              className="btn-secondary"
              disabled={busy === `lesson-${lesson.id}`}
            >
              {busy === `lesson-${lesson.id}` ? "AI genereert..." : "✨ AI lesplan"}
            </button>
            <button
              onClick={() => onGenerateAssignments(lesson)}
              className="btn-secondary"
              disabled={busy === `assignments-${lesson.id}`}
            >
              {busy === `assignments-${lesson.id}` ? "AI genereert..." : "✨ AI opdrachten"}
            </button>
            <a href={`/api/lessons/${lesson.id}/pptx`} className="btn-secondary">
              ⬇ PowerPoint
            </a>
          </div>

          {lesson.assignments.length > 0 && (
            <div>
              <p className="label">Opdrachten</p>
              <ul className="space-y-2">
                {lesson.assignments.map((a) => (
                  <li key={a.id} className="border border-slate-200 rounded-lg p-3 flex justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        {a.title}
                        <span className="badge bg-slate-100 text-slate-600 ml-2">{a.type}</span>
                      </p>
                      <p className="text-sm text-slate-600">{a.description}</p>
                    </div>
                    <button
                      onClick={() => onDeleteAssignment(lesson.id, a.id)}
                      className="btn-danger text-xs px-2 py-1 h-fit"
                    >
                      Verwijder
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
