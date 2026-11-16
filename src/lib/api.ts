import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./auth";
import { db } from "./db";

export type AuthContext = { user: SessionUser; params?: Record<string, string> };

export async function withAuth(
  req: NextRequest,
  handler: (ctx: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
  try {
    return await handler({ user });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Interne serverfout." },
      { status: 500 }
    );
  }
}

export async function withAdmin(handler: (user: SessionUser) => Promise<NextResponse>) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Alleen beheerders." }, { status: 403 });
  }
  try {
    return await handler(user);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Interne serverfout." },
      { status: 500 }
    );
  }
}

export async function ownedTraject(userId: number, id: number) {
  return db.traject.findFirst({
    where: {
      id,
      OR: [{ ownerId: userId }, { owner: { role: "ADMIN" } }],
    },
  });
}
