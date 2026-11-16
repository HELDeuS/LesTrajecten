"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Goal = { id: number; title: string; description: string; bloomLevel: string | null; scope: string };
type Module = { id: number; title: string; description: string | null; order: number; goals: Goal[] };
type Assignment = { id: number; title: string; description: string; type: string };
type Lesson = {
  id: number;
  number: number;
  title: string;
  date: string | null;
  durationMin: number;
  moduleId: number | null;
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
  numberOfLessons: number;
  lessonDurationMin: number;
  qualificationFile: { title: string; goals: Goal[] } | null;
  modules: Module[];
  lessons: Lesson[];
};

const fmt = (d: string) => new Date(d).toLocaleDateString("nl-NL");

export default function TrajectDetail({ traject }: { traject: Traject }) {
  const router = useRouter();
  const [modules, setModules] = useState(traject.modules);
  const [lessons, setLessons] = useState(traject.lessons);
  const [newModule, setNewModule] = useState({ title: "", description: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const allGoals = [
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

  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newModule.title) return;
    try {
      const data = await api("/api/modules", "POST", { trajectId: traject.id, ...newModule });
      setModules((prev) => [...prev, { ...data.module, goals: [] }]);
      setNewModule({ title: "", description: "" });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deleteModule(id: number) {
    try {
      await api(`/api/modules?id=${id}`, "DELETE");
      setModules((prev) => prev.filter((m) => m.id !== id));
      setLessons((prev) => prev.map((l) => (l.moduleId === id ? { ...l, moduleId: null } : l)));
      router.refresh();
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
      const saved: Goal[] = [];
      for (const g of data.goals) {
        const res = await api("/api/goals", "POST", {
          scope: "MODULE",
          moduleId,
          ...g,
          order: saved.length,
        });
        saved.push(res.goal);
      }
      setModules((prev) =>
        prev.map((m) => (m.id === moduleId ? { ...m, goals: [...m.goals, ...saved] } : m))
      );
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function updateLesson(lessonId: number, patch: Partial<Lesson> & { goalIds?: number[] }) {
    const data = await api(`/api/lessons/${lessonId}`, "PATCH", patch);
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? {
              ...l,
              ...patch,
              goals: (data.lesson.goals as { learningGoalId: number; learningGoal: Goal }[]) || l.goals,
            }
          : l
      )
    );
    router.refresh();
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
      await updateLesson(lesson.id, { ...data.plan, aiGenerated: true });
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
      const data = await api("/api/ai/generate", "POST", {
        kind: "assignments",
        lessonId: lesson.id,
      });
      const created: Assignment[] = [];
      for (const a of data.assignments) {
        const res = await api("/api/assignments", "POST", { lessonId: lesson.id, ...a, aiGenerated: true });
        created.push(res.assignment);
      }
      setLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, assignments: [...l.assignments, ...created] } : l))
      );
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function deleteAssignment(lessonId: number, id: number) {
    await api(`/api/assignments?id=${id}`, "DELETE");
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, assignments: l.assignments.filter((a) => a.id !== id) } : l))
    );
    router.refresh();
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
          {traject.cohort ? ` · ${traject.cohort}` : ""} · {traject.numberOfLessons} lessen ·{" "}
          {fmt(traject.periodStart)} – {fmt(traject.periodEnd)} · {traject.lessonDurationMin} min/les
          {traject.qualificationFile && ` · Dossier: ${traject.qualificationFile.title}`}
        </p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <section className="card p-6">
        <h2 className="font-semibold text-lg mb-4">Modules</h2>
        <ul className="space-y-4 mb-4">
          {modules.length === 0 && <p className="text-sm text-slate-500">Nog geen modules.</p>}
          {modules.map((m) => (
            <li key={m.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{m.title}</p>
                  {m.description && <p className="text-sm text-slate-500">{m.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => generateModuleGoals(m.id)}
                    className="btn-primary text-xs px-2 py-1"
                    disabled={busy === `module-${m.id}`}
                  >
                    {busy === `module-${m.id}` ? "AI genereert..." : "✨ AI specifieke leerdoelen"}
                  </button>
                  <button onClick={() => deleteModule(m.id)} className="btn-danger text-xs px-2 py-1">
                    Verwijder
                  </button>
                </div>
              </div>
              {m.goals.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {m.goals.map((g, i) => (
                    <li key={g.id} className="text-sm text-slate-600 flex gap-2">
                      <span className="text-indigo-500">◆</span>
                      <span>
                        <span className="font-medium">{g.title}</span>
                        {g.bloomLevel && (
                          <span className="badge bg-violet-50 text-violet-700 ml-1">{g.bloomLevel}</span>
                        )}
                        <span className="text-slate-500"> — {g.description}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={addModule} className="flex gap-3 items-end border-t border-slate-100 pt-4">
          <div className="flex-1">
            <label className="label">Nieuwe module</label>
            <input
              className="input"
              placeholder="bijv. Module 1: Basis programmeren"
              value={newModule.title}
              onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
            />
          </div>
          <div className="flex-[2]">
            <label className="label">Omschrijving (optioneel)</label>
            <input
              className="input"
              value={newModule.description}
              onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-secondary">
            Toevoegen
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg">Lessen ({lessons.length})</h2>
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            modules={modules}
            allGoals={allGoals}
            busy={busy}
            onSave={updateLesson}
            onGeneratePlan={generateLessonPlan}
            onGenerateAssignments={generateAssignments}
            onDeleteAssignment={deleteAssignment}
          />
        ))}
      </section>
    </div>
  );
}

function LessonCard({
  lesson,
  modules,
  allGoals,
  busy,
  onSave,
  onGeneratePlan,
  onGenerateAssignments,
  onDeleteAssignment,
}: {
  lesson: Lesson;
  modules: Module[];
  allGoals: (Goal & { scope: string })[];
  busy: string | null;
  onSave: (id: number, patch: Partial<Lesson> & { goalIds?: number[] }) => Promise<void>;
  onGeneratePlan: (lesson: Lesson, goalIds: number[]) => Promise<void>;
  onGenerateAssignments: (lesson: Lesson) => Promise<void>;
  onDeleteAssignment: (lessonId: number, id: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [date, setDate] = useState(lesson.date ? lesson.date.slice(0, 10) : "");
  const [moduleId, setModuleId] = useState(lesson.moduleId ? String(lesson.moduleId) : "");
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
      moduleId: moduleId ? Number(moduleId) : null,
      introduction,
      activities,
      materials,
      assessment,
      goalIds: selectedGoals,
    });
    setSaving(false);
  }

  return (
    <div className="card">
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <div>
          <p className="font-medium">
            Les {lesson.number}: {lesson.title}
            {lesson.aiGenerated && <span className="badge bg-emerald-50 text-emerald-700 ml-2">AI</span>}
          </p>
          <p className="text-xs text-slate-400">
            {lesson.date ? fmt(lesson.date) : "geen datum"} · {lesson.durationMin} min ·{" "}
            {modules.find((m) => m.id === lesson.moduleId)?.title || "geen module"} ·{" "}
            {lesson.goals.length} leerdoelen · {lesson.assignments.length} opdrachten
          </p>
        </div>
        <span className="text-slate-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="label">Titel</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Module</label>
              <select className="input" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
                <option value="">— geen —</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
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
                      {g.scope === "GENERAL" ? "algemeen" : "module"}
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
