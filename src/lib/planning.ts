import { db } from "./db";

export function lessonDate(periodStart: Date, weekOffset: number, dayIndex: number): Date {
  const d = new Date(periodStart);
  d.setDate(d.getDate() + weekOffset * 7 + dayIndex);
  return d;
}

export async function renumberTraject(trajectId: number): Promise<void> {
  const traject = await db.traject.findUnique({
    where: { id: trajectId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { numberInModule: "asc" },
            include: { _count: { select: { goals: true, assignments: true } } },
          },
        },
      },
    },
  });
  if (!traject) return;
  const lpw = Math.max(1, traject.lessonsPerWeek);

  let globalNumber = 0;
  let weeksBefore = 0;

  for (const m of traject.modules) {
    const target = Math.max(1, m.weeks) * lpw;
    const lessons = m.lessons;

    const isEmpty = (l: (typeof lessons)[number]) =>
      !l.introduction &&
      !l.activities &&
      !l.materials &&
      !l.assessment &&
      l._count.goals === 0 &&
      l._count.assignments === 0;

    const kept = lessons.filter((l) => !isEmpty(l));
    const empty = lessons.filter(isEmpty);
    const surplusEmpty = empty.slice(Math.max(0, target - kept.length));
    if (surplusEmpty.length) {
      await db.lesson.deleteMany({ where: { id: { in: surplusEmpty.map((l) => l.id) } } });
    }
    const finalLessons = [...kept, ...empty.slice(0, target - kept.length)];
    for (let i = finalLessons.length; i < target; i++) {
      const created = await db.lesson.create({
        data: {
          trajectId: traject.id,
          moduleId: m.id,
          number: 0,
          numberInModule: i,
          durationMin: traject.lessonDurationMin,
          title: `Les ${i + 1}`,
        },
      });
      finalLessons.push({ ...created, _count: { goals: 0, assignments: 0 } });
    }

    let idx = 0;
    for (const l of finalLessons) {
      globalNumber += 1;
      const weekOffset = weeksBefore + Math.floor(idx / lpw);
      const dayIndex = idx % lpw;
      await db.lesson.update({
        where: { id: l.id },
        data: {
          number: globalNumber,
          numberInModule: idx + 1,
          week: weekOffset + 1,
          date: lessonDate(traject.periodStart, weekOffset, dayIndex),
          durationMin: l.durationMin || traject.lessonDurationMin,
        },
      });
      idx += 1;
    }
    weeksBefore += m.weeks;
  }
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
