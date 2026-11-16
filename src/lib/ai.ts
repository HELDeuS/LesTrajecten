import { db } from "./db";

const MISTRAL_API_BASE = "https://api.mistral.ai/v1";
const MISTRAL_API_URL = `${MISTRAL_API_BASE}/chat/completions`;
const DEFAULT_MODEL = process.env.MISTRAL_MODEL || "mistral-large-latest";

export class AiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export async function mistralChat(system: string, user: string, jsonMode = true): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new AiError(
      "Geen MISTRAL_API_KEY geconfigureerd. Stel de omgevingsvariabele in op de server.",
      503
    );
  }
  const res = await fetch(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AiError(`Mistral API fout (${res.status}): ${text.slice(0, 300)}`, res.status);
  }
  const data = await res.json();
  return normalizeContent(data.choices?.[0]?.message?.content);
}

function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        part && typeof part === "object" && "text" in part
          ? String((part as { text: unknown }).text ?? "")
          : String(part ?? "")
      )
      .join("");
  }
  if (content && typeof content === "object") return JSON.stringify(content);
  return "";
}

export async function mistralJson<T>(system: string, user: string): Promise<T> {
  const raw = await mistralChat(system, user, true);
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new AiError(
      "AI gaf een onverwacht antwoordformaat terug. Probeer het opnieuw."
    );
  }
}

export async function mistralOcrPdf(buffer: Buffer): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new AiError(
      "Geen MISTRAL_API_KEY geconfigureerd. PDF-extractie gebruikt de Mistral OCR API; stel de sleutel in.",
      503
    );
  }
  const res = await fetch(`${MISTRAL_API_BASE}/ocr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      pages: [],
      document: {
        type: "document_url",
        document_url: `data:application/pdf;base64,${buffer.toString("base64")}`,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AiError(`Mistral OCR fout (${res.status}): ${text.slice(0, 300)}`, res.status);
  }
  const data = await res.json();
  const pages: { markdown?: string }[] = data.pages ?? [];
  const content = pages
    .map((p) => (p.markdown || "").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
  if (!content) {
    throw new AiError("De OCR-extractie leverde geen tekst op. Controleer of de pdf leesbare tekst bevat.");
  }
  return content;
}

export async function logGeneration(userId: number, kind: string, input: string, output: string) {
  const truncatedInput = input.slice(0, 8000);
  const truncatedOutput = output.slice(0, 8000);
  await db.aiGeneration.create({
    data: { userId, kind, input: truncatedInput, output: truncatedOutput },
  });
}
