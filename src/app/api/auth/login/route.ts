import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "E-mail en wachtwoord zijn verplicht." }, { status: 400 });
  }
  const user = await authenticate(email, password);
  if (!user) {
    return NextResponse.json({ error: "Onjuiste inloggegevens." }, { status: 401 });
  }
  const token = await createSessionToken(user);
  const res = NextResponse.json({ user });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
