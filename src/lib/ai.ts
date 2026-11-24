import { db } from "./db";

export class AiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

/**
 * AI-configuratie: werkt met elke OpenAI-compatibele endpoint
 * (Mistral, vLLM, Ollama met compat-API, llama.cpp, LM Studio, etc.).
 *
 * Env-variabelen:
 *   AI_BASE_URL  - bijv. https://api.mistral.ai/v1 of http://mijnserver:8000/v1
 *   AI_API_KEY   - API-sleutel (voor private servers vaak een willekeurige waarde)
 *   AI_MODEL     - modelnaam op de server (bijv. mistral-large-latest of llama3.1:8b)
 *   AI_JSON_MODE - "off" als de server response_format niet ondersteunt (default: aan, met automatische retry)
 *
 * Backwards-compatibel: zonder AI_* vallen MISTRAL_API_KEY/MISTRAL_MODEL terug.
 */
export function aiConfig() {
  const baseUrl = (process.env.AI_BASE_URL || "https://api.mistral.ai/v1").replace(/\/+$/, "");
  const apiKey = process.env.AI_API_KEY || process.env.MISTRAL_API_KEY || "";
  const model = process.env.AI_MODEL || process.env.MISTRAL_MODEL || "mistral-large-latest";
  return { baseUrl, apiKey, model };
}

export function aiConfigured(): boolean {
  return Boolean(aiConfig().apiKey);
}

export async function aiChat(system: string, user: string, jsonMode = true): Promise<string> {
  const { baseUrl, apiKey, model } = aiConfig();
  if (!apiKey) {
    throw new AiError(
      "Geen AI-sleutel geconfigureerd. Stel AI_API_KEY (of MISTRAL_API_KEY) in op de server.",
      503
    );
  }
  const doFetch = (withJsonMode: boolean) =>
    fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(withJsonMode ? { response_format: { type: "json_object" } } : {}),
        temperature: 0.4,
      }),
    });

  let res = await doFetch(jsonMode && process.env.AI_JSON_MODE !== "off");
  if (jsonMode && !res.ok && (res.status === 400 || res.status === 422)) {
    // Server ondersteunt response_format mogelijk niet; retry zonder json-mode
    res = await doFetch(false);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AiError(`AI API fout (${res.status}): ${text.slice(0, 300)}`, res.status);
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

function extractJson(raw: string): string | null {
  // Verwijder code-fences (```json ... ```) die lokale modellen vaak toevoegen
  const stripped = raw.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1").trim();
  try {
    JSON.parse(stripped);
    return stripped;
  } catch {
    /* val door naar regex-extractie */
  }
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      JSON.parse(stripped.slice(start, end + 1));
      return stripped.slice(start, end + 1);
    } catch {
      return null;
    }
  }
  return null;
}

export async function aiJson<T>(system: string, user: string): Promise<T> {
  const raw = await aiChat(system, user, true);
  const json = extractJson(raw);
  if (json) return JSON.parse(json) as T;
  throw new AiError(
    "De AI gaf geen geldig JSON-antwoord terug. Probeer het opnieuw, of zet een sterkere AI_JSON-capabele provider in."
  );
}

export async function aiOcrPdf(buffer: Buffer): Promise<string> {
  // Extractie via Mistral OCR API indien beschikbaar; anders lokale tekstextractie (unpdf)
  if (process.env.AI_PDF_EXTRACT === "mistral" || (!process.env.AI_PDF_EXTRACT && process.env.MISTRAL_API_KEY && !process.env.AI_BASE_URL)) {
    return mistralOcrPdf(buffer);
  }
  return localPdfText(buffer);
}

async function mistralOcrPdf(buffer: Buffer): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new AiError(
      "Geen MISTRAL_API_KEY geconfigureerd voor OCR. Zet AI_PDF_EXTRACT=local voor lokale pdf-extractie.",
      503
    );
  }
  const res = await fetch("https://api.mistral.ai/v1/ocr", {
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

async function localPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  const content = (Array.isArray(text) ? text.join("\n\n") : text).trim();
  if (!content) {
    throw new AiError(
      "De lokale pdf-extractie leverde geen tekst op. Scans/foto-pdf's hebben OCR nodig: stel MISTRAL_API_KEY in."
    );
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
