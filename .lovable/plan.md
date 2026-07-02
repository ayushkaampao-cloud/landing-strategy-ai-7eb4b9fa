# Plan: 3-tier provider fallback in `src/lib/ai/gateway.ts`

Single-file change. Preserves `callLLM`, `callLLMJson`, `extractJson`, and `LLMOptions` signatures so no callers change.

## Fallback chain

For every call, try in order and stop at first success:

1. **`gemini_direct`** — if `process.env.GEMINI_API_KEY` is set, call Google's Generative Language API directly.
2. **`lovable_gateway`** — Gemini via Lovable AI Gateway using `LOVABLE_API_KEY` (current default path).
3. **`openrouter`** — Google Gemini via OpenRouter using `OPENROUTER_API_KEY` if set.

If a tier throws (missing key, network, 4xx/5xx, rate limit, JSON parse failure), log the failure reason and try the next tier. If all tiers fail, throw an aggregated error listing which tiers were attempted and their status.

## Direct Gemini call (`callGeminiDirect`)

- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
- Model: `gemini-2.5-flash` (matches OpenRouter fallback tier; direct API doesn't accept the `-preview` gateway alias).
- Request body maps our `LLMOptions`:
  - `contents: [{ role: "user", parts: [{ text: prompt }] }]`
  - `systemInstruction: { parts: [{ text: opts.system }] }` when present
  - `generationConfig: { temperature, maxOutputTokens, responseMimeType: opts.json ? "application/json" : undefined }`
- Response: extract `candidates[0].content.parts[0].text`.
- Treat empty text or non-200 as failure to trigger fallback.
- Key never logged; only `provider="gemini_direct"` and HTTP status on failure.

## Logging

Add a lightweight tagged `console.log("[llm]", { provider, ok, ms, status? })` at the end of each attempt. On success, log once with the winning provider. On failure of a tier, log `console.warn("[llm] fallback", { from, reason })`. Never include headers, bodies with prompts, or key material.

## Function shape

```ts
export async function callLLM(prompt, opts = {}): Promise<string>
export async function callLLMJson<T>(prompt, opts = {}): Promise<T>
```

Internally:

```ts
const attempts = [
  { name: "gemini_direct", enabled: !!process.env.GEMINI_API_KEY, run: callGeminiDirect },
  { name: "lovable_gateway", enabled: !!process.env.LOVABLE_API_KEY, run: callGemini },
  { name: "openrouter", enabled: !!process.env.OPENROUTER_API_KEY, run: callOpenRouter },
];
// try in order, aggregate errors, log winner
```

`callLLMJson` keeps its current behavior (calls `callLLM` with `json: true`, then `extractJson`). If parsing fails on one tier's output, that counts as a tier failure and the chain continues.

## Verification (before further refactor)

Add a tiny debug route `src/routes/api/debug-llm.ts` (GET) that runs a trivial prompt (`"Return JSON {\"ok\": true}"`) through `callLLMJson` and responds with `{ provider, result }`. I'll:

1. Hit it with `stack_modern--invoke-server-function` → expect `gemini_direct`.
2. Temporarily blank `GEMINI_API_KEY` via a query flag (`?skip=gemini_direct`) that forces skipping tiers, to prove `lovable_gateway` responds.
3. Skip both to confirm `openrouter` path (only if `OPENROUTER_API_KEY` exists; otherwise report it's not configured and skip that assertion).
4. Check `stack_modern--server-function-logs` for the `[llm]` log lines.

The debug route stays in the codebase for now (harmless GET, no secrets exposed) and can be removed later.

## Out of scope

- No changes to `src/lib/ai/*` service modules, server routes that call `callLLM/callLLMJson`, or UI.
- No rotation/removal of `LOVABLE_API_KEY`.
- No new dependencies.
