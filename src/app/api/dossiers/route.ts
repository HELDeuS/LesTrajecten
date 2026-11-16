import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  return withAuth(req, async ({ user }) => {
    const dossiers = await db.qualificationFile.findMany({
      where: user.role === "ADMIN" ? {} : { ownerId: user.id },
      include: { _count: { select: { goals: true, trajects: true } }, owner: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ dossiers });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async ({ user }) => {
    const body = await req.json();
    const { title, creboCode, description, content } = body;
    if (!title || !content) {
      return NextResponse.json({ error: "Titel en inhoud zijn verplicht." }, { status: 400 });
    }
    const dossier = await db.qualificationFile.create({
      data: {
        title,
        creboCode: creboCode || null,
        description: description || null,
        content,
        ownerId: user.id,
      },
    });
    return NextResponse.json({ dossier }, { status: 201 });
  });
}
