import { NextRequest, NextResponse } from "next/server";
import { callLLMJson } from "@/lib/llm";
import { RESUME_PARSE_PROMPT } from "@/lib/prompts";
import type { ResumeProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  const start = Date.now();

  let body: { resume_text: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { resume_text } = body;
  if (!resume_text?.trim()) {
    return NextResponse.json(
      { error: "resume_text is required" },
      { status: 400 },
    );
  }

  try {
    const { data, provider, model, latency_ms } =
      await callLLMJson<ResumeProfile>({
        systemPrompt: RESUME_PARSE_PROMPT,
        userPrompt: resume_text,
        maxTokens: 8192,
      });

    return NextResponse.json(
      {
        resume_profile: data,
        llm_metadata: { provider, model, latency_ms },
      },
      {
        headers: { "X-Latency-Ms": String(Date.now() - start) },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[parse-resume] Failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
