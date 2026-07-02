// Server-only LLM helpers with 3-tier provider fallback.
// Order: gemini_direct (GEMINI_API_KEY) → lovable_gateway (LOVABLE_API_KEY) → openrouter (OPENROUTER_API_KEY).
// Function signatures are preserved so no callers change.

const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_DIRECT_MODEL = "gemini-2.5-flash";
const GEMINI_DIRECT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_DIRECT_MODEL}:generateContent`;

const LOVABLE_MODEL = "google/gemini-3-flash-preview";
const OPENROUTER_MODEL = "google/gemini-2.5-flash";

export interface LLMOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  /** Optional JSON schema. Passed to Gemini as responseSchema and to
   *  OpenAI-compatible providers as response_format json_schema. */
  responseSchema?: Record<string, unknown>;
  schemaName?: string;
}

type ProviderName = "gemini_direct" | "lovable_gateway" | "openrouter";

async function callGeminiDirect(prompt: string, opts: LLMOptions): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured");

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.8,
      ...(opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
      ...(opts.responseSchema ? { responseSchema: opts.responseSchema } : {}),
    },
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }

  const res = await fetch(`${GEMINI_DIRECT_URL}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`gemini_direct ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("gemini_direct: empty response");
  return text;
}

async function callLovableGateway(prompt: string, opts: LLMOptions): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const body: Record<string, unknown> = {
    model: LOVABLE_MODEL,
    messages: [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      { role: "user", content: prompt },
    ],
    temperature: opts.temperature ?? 0.8,
  };
  if (opts.responseSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: opts.schemaName ?? "Output",
        schema: opts.responseSchema,
        strict: true,
      },
    };
  } else if (opts.json) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(LOVABLE_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`lovable_gateway ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("lovable_gateway: empty response");
  return text;
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
    throw new Error(`openrouter ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("openrouter: empty response");
  return text;
}

interface AttemptResult {
  provider: ProviderName;
  text: string;
}

/** Run the fallback chain. Optional `skip` list is used by the debug route. */
async function runChain(
  prompt: string,
  opts: LLMOptions,
  skip: Set<ProviderName> = new Set(),
): Promise<AttemptResult> {
  const attempts: { name: ProviderName; run: (p: string, o: LLMOptions) => Promise<string> }[] = [
    { name: "gemini_direct", run: callGeminiDirect },
    { name: "lovable_gateway", run: callLovableGateway },
    { name: "openrouter", run: callOpenRouter },
  ];

  const errors: string[] = [];
  for (const attempt of attempts) {
    if (skip.has(attempt.name)) continue;
    const started = Date.now();
    try {
      const text = await attempt.run(prompt, opts);
      const ms = Date.now() - started;
      console.log("[llm]", { provider: attempt.name, ok: true, ms });
      return { provider: attempt.name, text };
    } catch (err) {
      const reason = (err as Error).message || String(err);
      const ms = Date.now() - started;
      console.warn("[llm] fallback", { from: attempt.name, ms, reason });
      errors.push(`${attempt.name}: ${reason}`);
    }
  }
  throw new Error(`All LLM providers failed. ${errors.join(" | ")}`);
}

export async function callLLM(prompt: string, opts: LLMOptions = {}): Promise<string> {
  const { text } = await runChain(prompt, opts);
  return text;
}

export async function callLLMJson<T = unknown>(
  prompt: string,
  opts: LLMOptions = {},
): Promise<T> {
  // Run the chain but treat a JSON-parse failure on one tier as a tier failure
  // and continue. We do this by threading `skip` through repeated attempts.
  const skip = new Set<ProviderName>();
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    let attempt: AttemptResult;
    try {
      attempt = await runChain(prompt, { ...opts, json: true }, skip);
    } catch (err) {
      throw err;
    }
    try {
      return extractJson<T>(attempt.text);
    } catch (err) {
      console.warn("[llm] json_parse_failed", { provider: attempt.provider });
      skip.add(attempt.provider);
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All providers returned unparseable JSON");
}

export function extractJson<T = unknown>(raw: string): T {
  const trimmed = raw.trim();
  const fenceStripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(fenceStripped) as T;
  } catch {
    // fall through
  }
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

/** Debug helper used by /api/debug-llm. Returns which provider won. */
export async function _debugCall(
  prompt: string,
  skip: ProviderName[] = [],
): Promise<{ provider: ProviderName; text: string }> {
  return runChain(prompt, { json: true, temperature: 0.2 }, new Set(skip));
}
