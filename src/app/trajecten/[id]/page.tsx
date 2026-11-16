import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import TrajectDetail from "@/components/TrajectDetail";

export default async function TrajectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  const traject = await db.traject.findFirst({
    where: { id, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) },
    include: {
      goals: { where: { scope: "TRAJECT" }, orderBy: { order: "asc" } },
      qualificationFile: {
        include: {
          goals: { where: { scope: "GENERAL" }, orderBy: { order: "asc" } },
          kerntaken: { orderBy: { order: "asc" }, include: { werkprocessen: { orderBy: { order: "asc" } } } },
        },
      },
      modules: {
        orderBy: { order: "asc" },
        include: {
          goals: { orderBy: { order: "asc" } },
          lessons: { orderBy: { numberInModule: "asc" }, include: { goals: { include: { learningGoal: true } }, assignments: true } },
        },
      },
    },
  });
  if (!traject) notFound();

  return <TrajectDetail traject={JSON.parse(JSON.stringify(traject))} />;
}
