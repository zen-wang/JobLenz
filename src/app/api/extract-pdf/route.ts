import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text } = await extractText(pdf, { mergePages: true });

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF extraction failed";
    console.error("[extract-pdf]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
