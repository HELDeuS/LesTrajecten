import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { AiError, aiOcrPdf } from "@/lib/ai";
import { logGeneration } from "@/lib/ai";

const MAX_PDF_BYTES = 50 * 1024 * 1024;
const OCR_TIMEOUT_MS = 5 * 60 * 1000;

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  return withAuth(req, async ({ user }) => {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "Stuur het bestand als multipart/form-data mee." }, { status: 400 });
    }
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Geen pdf-bestand ontvangen." }, { status: 400 });
    }
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Alleen pdf-bestanden worden ondersteund." }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "De pdf is groter dan 50 MB." }, { status: 400 });
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const content = await Promise.race([
        aiOcrPdf(buffer),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new AiError("De OCR-extractie duurde te lang. Probeer het opnieuw.")), OCR_TIMEOUT_MS)
        ),
      ]);
      await logGeneration(user.id, "ocr-dossier", file.name, content.slice(0, 2000));
      return NextResponse.json({ content, filename: file.name, pages: null });
    } catch (e) {
      if (e instanceof AiError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
  });
}
