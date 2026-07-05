## Goal

Restore reliable content generation by making the OpenRouter fallback actually free-tier usable, and stop leaking raw provider error strings into the UI.

## 1. Confirm the OpenRouter key wiring (no code change)

`src/lib/ai/gateway.ts` reads `process.env.OPENROUTER_API_KEY` at line 108 inside `callOpenRouter`, which is invoked as the third entry in `runChain`'s attempts array (after `gemini_direct` and `lovable_gateway`). Confirmed: once the `OPENROUTER_API_KEY` secret is present in the server env, the existing fallback loop uses it automatically — no wiring changes needed.

## 2. Switch OpenRouter to a free model with structured output

In `src/lib/ai/gateway.ts`:

- Change `OPENROUTER_MODEL` from `"google/gemini-2.5-flash"` to `"google/gemma-4-31b-it:free"` (verified present in the current OpenRouter `/models` catalog).
- Keep the existing `response_format` branching in `callOpenRouter` — it already sends `json_schema` when `responseSchema` is provided and `json_object` when only `opts.json` is true, which is the correct OpenAI-compatible shape for structured output on OpenRouter.
- Leave the `strict: true` flag in place; if the free model rejects strict schemas at runtime, `callLLMJson` will already retry via its skip-and-continue loop, and the `extractJson` recovery in that path will salvage any near-JSON responses.

No other providers, prompts, or callers change.

## 3. End-to-end fallback verification

After the model change, verify OpenRouter actually serves a real request while the first two tiers are down:

- Call `/api/debug-llm` (which uses `_debugCall`) with `skip=["gemini_direct","lovable_gateway"]` via `stack_modern--invoke-server-function` and confirm `provider: "openrouter"` in the response and non-empty text.
- Then call `/api/generate-strategies` with a minimal but valid payload (workspace/product/project/research) using the same skip forced via a temporary query flag OR — simpler — just call it normally and inspect `stack_modern--server-function-logs` for `[llm] fallback ... from: lovable_gateway` followed by `[llm] ... provider: openrouter, ok: true`. Confirm the response body contains real `concepts`, not the template skeleton.
- If OpenRouter returns non-JSON on the free model, the log will show `json_parse_failed` — in that case fall back to `openai/gpt-oss-20b:free` (also free, also in the catalog, better JSON compliance) and re-verify.

## 4. Clean up user-facing error surfacing

Right now provider error strings bubble straight to the UI via `throw new Error(\`All LLM providers failed. ${errors.join(" | ")}\`)` and get displayed verbatim by:

- `src/routes/app.project.$projectId.generating.tsx` — `setError((err as Error).message ...)` renders inside the red banner at line 208–212.
- `src/routes/app.project.$projectId.concept.$conceptId.tsx` line 268–270 — `toast.error(\`Regeneration failed: ${(err as Error).message} ...\`)`.
- Any other `!res.ok ? throw new Error(await res.text())` paths that show the server's raw error body.

Changes:

1. **`src/lib/ai/gateway.ts`** — keep the detailed error message thrown by `runChain` for server logs, but also console.error the full joined reasons before throwing so the technical detail is preserved on the server. The thrown message stays technical; the API routes decide what to show.

2. **`src/routes/api/generate-strategies.ts` and `src/routes/api/generate-elements.ts`** — in the catch block, `console.error("[generate-strategies] failure:", err)` (already done) and return a sanitized JSON body `{ error: "Content generation is temporarily unavailable — please try again in a moment." }` with the appropriate status, instead of forwarding `(err as Error).message`.

3. **`src/routes/app.project.$projectId.generating.tsx`** — replace `setError((err as Error).message || "Something went wrong")` with a fixed string: `setError("Content generation is temporarily unavailable — please try again in a moment.")`. `console.error(err)` is already there.

4. **`src/routes/app.project.$projectId.concept.$conceptId.tsx`** — change line 268–270's toast to `toast.error("Content generation is temporarily unavailable — please try again in a moment. Your current concept is unchanged.")`. `console.error("[regenerate] error:", err)` already logs the technical detail. Do NOT change the image-generation toast (line 355) since the user explicitly excluded the image pipeline.

5. Any place that does `throw new Error(await res.text())` after a `/api/generate-*` fetch (concept file line 240, 389) stays as-is because the API route now returns the sanitized message — the raw provider detail never reaches the client.

## Out of scope (per user)

- Image generation pipeline (`/api/generate-images`, `image_previews` inserts, image-related toasts).
- Visual theme and UI styling.
- Any other provider or prompt logic.

## Technical notes

- Free-tier OpenRouter models have per-minute rate limits (~20 req/min at time of writing) and can occasionally return non-JSON; `callLLMJson`'s three-pass skip loop already handles this by retrying within the chain.
- `google/gemma-4-31b-it:free` is currently listed in OpenRouter's `/api/v1/models` catalog with a 262K context window and supports OpenAI-compatible `response_format`. If it later disappears, swap to `openai/gpt-oss-20b:free` (also verified present).
- The Lovable Gateway allowlist rule does not apply here — this call goes direct to OpenRouter, which has its own catalog.
