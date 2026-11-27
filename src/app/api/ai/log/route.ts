import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET() {
  return withAdmin(async () => {
    const logs = await db.aiGeneration.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } } },
    });
    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        kind: l.kind,
        input: l.input,
        output: l.output,
        createdAt: l.createdAt,
        userName: l.user.name,
        userEmail: l.user.email,
      })),
    });
  });
}
