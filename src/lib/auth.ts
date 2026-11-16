import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me-in-production"
);

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "DOCENT";
};

export async function createSessionToken(user: SessionUser) {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.id !== "number") return null;
    return {
      id: payload.id as number,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as "ADMIN" | "DOCENT",
    };
  } catch {
    return null;
  }
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get("session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return null;
  const bcrypt = (await import("bcryptjs")).default;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
