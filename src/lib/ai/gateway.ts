// Server-only LLM helpers for Lovable AI Gateway (Gemini) with optional
// OpenRouter fallback. All calls run inside TanStack server routes.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_MODEL = "google/gemini-3-flash-preview";
const OPENROUTER_MODEL = "google/gemini-2.5-flash";

export interface LLMOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

async function callGemini(prompt: string, opts: LLMOptions): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  const body: Record<string, unknown> = {
    model: DEFAULT_MODEL,
    messages: [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      { role: "user", content: prompt },
    ],
    temperature: opts.temperature ?? 0.8,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callOpenRouter(prompt: string, opts: LLMOptions): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: prompt },
      ],
      temperature: opts.temperature ?? 0.8,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/** Try Gemini first, fall back to OpenRouter if available. */
export async function callLLM(prompt: string, opts: LLMOptions = {}): Promise<string> {
  try {
    return await callGemini(prompt, opts);
  } catch (err) {
    if (process.env.OPENROUTER_API_KEY) {
      try {
        return await callOpenRouter(prompt, opts);
      } catch {
        throw err; // surface original Gemini error
      }
    }
    throw err;
  }
}

/** Call model expecting JSON; extract first {...} block and parse. */
export async function callLLMJson<T = unknown>(
  prompt: string,
  opts: LLMOptions = {},
): Promise<T> {
  const raw = await callLLM(prompt, { ...opts, json: true });
  return extractJson<T>(raw);
}

export function extractJson<T = unknown>(raw: string): T {
  const trimmed = raw.trim();
  // Strip common code fences
  const fenceStripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(fenceStripped) as T;
  } catch {
    // fall through
  }
  // find first { and last } / first [ and last ]
  const firstBrace = fenceStripped.indexOf("{");
  const firstBracket = fenceStripped.indexOf("[");
  const start =
    firstBrace === -1
      ? firstBracket
      : firstBracket === -1
        ? firstBrace
        : Math.min(firstBrace, firstBracket);
  const lastBrace = fenceStripped.lastIndexOf("}");
  const lastBracket = fenceStripped.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);
  if (start >= 0 && end > start) {
    const slice = fenceStripped.slice(start, end + 1);
    return JSON.parse(slice) as T;
  }
  throw new Error("Model did not return JSON");
}
