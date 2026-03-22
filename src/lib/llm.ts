/**
 * Provider-agnostic LLM client.
 *
 * Resolution order for provider:
 *   1. LLM_PROVIDER env var ("gemini" | "claude")
 *   2. GEMINI_API_KEY exists → gemini
 *   3. ANTHROPIC_API_KEY exists → claude
 *   4. Error
 */

type LLMProvider = "gemini" | "claude";

interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Desired max tokens in the response. Default 4096. */
  maxTokens?: number;
}

interface LLMResponse {
  text: string;
  provider: LLMProvider;
  model: string;
  latency_ms: number;
}

function resolveProvider(): { provider: LLMProvider; apiKey: string } {
  const explicit = process.env.LLM_PROVIDER as LLMProvider | undefined;

  if (explicit === "gemini") {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("LLM_PROVIDER=gemini but GEMINI_API_KEY is not set");
    return { provider: "gemini", apiKey: key };
  }

  if (explicit === "claude") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("LLM_PROVIDER=claude but ANTHROPIC_API_KEY is not set");
    return { provider: "claude", apiKey: key };
  }

  // Auto-detect
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "your_actual_key") {
    return { provider: "gemini", apiKey: geminiKey };
  }

  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey && claudeKey !== "your_actual_key") {
    return { provider: "claude", apiKey: claudeKey };
  }

  throw new Error(
    "No LLM API key found. Set GEMINI_API_KEY or ANTHROPIC_API_KEY in .env.local",
  );
}

// ─── Gemini ──────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-2.0-flash";

async function callGemini(
  apiKey: string,
  req: LLMRequest,
): Promise<{ text: string; model: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: req.systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: req.userPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: req.maxTokens ?? 4096,
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "";

  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return { text, model: GEMINI_MODEL };
}

// ─── Claude ──────────────────────────────────────────────────

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_URL = "https://api.anthropic.com/v1/messages";

async function callClaude(
  apiKey: string,
  req: LLMRequest,
): Promise<{ text: string; model: string }> {
  const res = await fetch(CLAUDE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: req.maxTokens ?? 4096,
      temperature: 0.2,
      system: req.systemPrompt,
      messages: [{ role: "user", content: req.userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text ?? "";

  if (!text) {
    throw new Error("Claude returned empty response");
  }

  return { text, model: CLAUDE_MODEL };
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Send a prompt to the configured LLM provider and get a text response.
 * The response is expected to be JSON — caller is responsible for parsing.
 */
export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const { provider, apiKey } = resolveProvider();
  const start = Date.now();

  const result =
    provider === "gemini"
      ? await callGemini(apiKey, req)
      : await callClaude(apiKey, req);

  return {
    text: result.text,
    provider,
    model: result.model,
    latency_ms: Date.now() - start,
  };
}

/**
 * Call the LLM and parse the response as JSON of type T.
 * Strips markdown code fences if the model wraps its output.
 */
export async function callLLMJson<T>(req: LLMRequest): Promise<{
  data: T;
  provider: LLMProvider;
  model: string;
  latency_ms: number;
}> {
  const response = await callLLM(req);

  // Strip markdown code fences if present
  let cleaned = response.text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
  }

  const data = JSON.parse(cleaned) as T;
  return {
    data,
    provider: response.provider,
    model: response.model,
    latency_ms: response.latency_ms,
  };
}
