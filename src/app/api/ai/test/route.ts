import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api";
import { aiChat, aiConfig, logGeneration } from "@/lib/ai";

export async function POST() {
  return withAdmin(async (user) => {
    const { baseUrl, model } = aiConfig();
    const started = Date.now();
    try {
      const answer = await aiChat(
        "Je bent een test-endpoint.",
        "Antwoord exact met het woord: OK",
        false
      );
      const latency = Date.now() - started;
      await logGeneration(user.id, "ai-test", "test", `OK (${latency} ms): ${answer.slice(0, 200)}`);
      return NextResponse.json({
        ok: true,
        baseUrl,
        model,
        latencyMs: latency,
        answer: answer.slice(0, 200),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ ok: false, baseUrl, model, error: msg }, { status: 502 });
    }
  });
}
