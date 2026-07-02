# Plan: Agentic Landing Page AI 1.0

Turn the current static generator into a real AI-backed strategy product using Gemini (via Lovable AI Gateway), with local browser persistence and staged loading UX. No Supabase, no publishing, no real image models — Lorem Picsum previews only.

## 1. Secrets & providers

- Ensure `LOVABLE_API_KEY` is provisioned (Lovable AI Gateway = Gemini access, no user-supplied key needed).
- Add `OPENROUTER_API_KEY` as an optional secret (via add_secret) for fallback. If missing, fallback simply no-ops.
- Never expose keys to the client — all model calls run inside TanStack server routes.

Note on user's spec: The user asked for `GEMINI_API_KEY`. Lovable's built-in gateway already routes `google/gemini-*` models through `LOVABLE_API_KEY`, so we'll use that as the primary path (no extra key needed) and document that `GEMINI_API_KEY` isn't required. OpenRouter stays as an optional real fallback.

## 2. Types (`src/types.ts` extended)

Add/refine: `ProjectSourceMode = "url" | "brief"`, extend `Project` with `sourceMode`, `landingPageUrl?`, `notes?`, `tone?`, `mainProblem?`, `objections?`, `competitor?`, `desiredAngle?`. Add `ProjectResearch`, extended `LandingPageSection` (headline/subheadline/imagePrompt/imageStyle/imageUrl), extended `LandingPageConcept` (frameworkType, whyThisWorks, risksOrLimits, bestFor, tone, researchSnapshot), `LandingPageElements`, `GeneratedImagePreview`. Keep existing fields aliased where possible so current UI keeps rendering.

## 3. Storage layer (`src/lib/storage.ts`)

Wrap localStorage with typed helpers: `saveProjects/loadProjects`, `saveProjectResearch/loadProjectResearch(projectId)`, `saveConcepts/loadConcepts(projectId)`, `saveElements/loadElements(conceptId)`, `saveImages/loadImages(conceptId)`. Extend `src/lib/store.tsx` to expose research/elements/images via context and delegate to the storage module (single source of truth, swap-friendly for Supabase later).

## 4. Provider abstraction

```text
src/lib/providers/gemini.ts       -> generateTextWithGemini(prompt, schema?)
src/lib/providers/openrouter.ts   -> generateTextWithOpenRouter(prompt, schema?)
src/lib/providers/index.ts        -> callLLM(prompt, schema?) with Gemini→OpenRouter fallback
```

Both use the AI SDK + `@ai-sdk/openai-compatible` pointing at Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1`) with structured output via Zod schemas. Default model: `google/gemini-3-flash-preview`.

## 5. AI service modules

```text
src/lib/ai/research.ts    -> runProjectResearch(project, product, workspace)
src/lib/ai/strategies.ts  -> generateFrameworkConcepts(project, product, workspace, research)
src/lib/ai/elements.ts    -> generatePageElements(concept, product, workspace)
src/lib/ai/images.ts      -> generatePreviewImages(elements) — deterministic Picsum seeds
```

Each returns typed data matching the interfaces above. Strategy generator makes 5 parallel calls (one per framework) with framework-specific system prompts enforcing section-count and tone requirements. Falls back to the existing template generator if the LLM call fails, so the app never dead-ends.

## 6. Server routes

TanStack server routes under `src/routes/api/`:

- `api/research-project.ts` — POST, accepts brief + sourceMode + optional URL; if URL provided, fetches page HTML server-side and strips to text (~8k chars) before prompting; returns `ProjectResearch`.
- `api/generate-strategies.ts` — POST, accepts project+research; returns 5 concepts.
- `api/generate-elements.ts` — POST, accepts concept; returns `LandingPageElements`.
- `api/generate-images.ts` — POST, accepts elements; returns `GeneratedImagePreview[]` with Picsum URLs (`https://picsum.photos/seed/{hash}/1200/800`), `status: "simulated"`.

All routes read env inside the handler, validate input with Zod, surface 402/429/500 errors with clear messages.

## 7. UI changes (minimal, no redesign)

**New Project flow (`app.product.new.tsx` / new project creation):**
- Add radio group at top: "Use existing page URL" vs "Start from product brief only".
- URL mode: URL + optional site URL + notes.
- Brief mode: keep existing fields, add tone, audience, main problem, objections, competitor, desired angle.
- On submit: create project → auto-run research → navigate to `generating` screen.

**Generating screen (`app.project.$projectId.generating.tsx`):**
- Replace static text with staged progress: Reading brief → Analyzing positioning → Mapping competitors → Extracting objections → Writing 5 directions. Steps advance as each API call resolves.

**Project page (`app.project.$projectId.index.tsx`):**
- Compact Research panel (summary, competitor angles, keywords, objections, trust signals, positioning ideas).
- Existing 5-concept gallery unchanged visually, powered by real concepts.
- Status chips: research ✓, concepts ✓, elements ✓.

**Concept detail (`app.project.$projectId.concept.$conceptId.tsx`):**
- Keep left preview / right rail. Add rail blocks: Framework type, Why this works, Best for, Risks/limits, Research snapshot, Section navigator (already exists), Copy actions (already exist).
- Add primary button: **"Get elements for this page"** → opens a right-side drawer/panel showing hero, per-section elements, global style, copy-export text, with Copy all / Copy hero / Copy image prompts actions and staged loading.
- Below elements panel: **"Generate images"** button → attaches Picsum previews to sections (rendered inside preview + inside elements panel), each labeled "Preview image — Simulated".

**Dashboard (`app.index.tsx`) & Projects (`app.projects.tsx`):**
- Add metrics: # projects, # concepts, last generated, active source mode.
- Projects list: research/concepts/elements status pills.

**Empty states & errors:** inline retry buttons on each generation surface; toast + inline message when Gemini fails; graceful URL-fetch fallback message.

## 8. Guardrails preserved

- Homepage, auth, sidebar, dashboard shell, gallery, concept detail layout all kept.
- Five frameworks and their names unchanged.
- No Supabase, no publishing, no analytics, no Shopify, no drag-and-drop.
- Demo account continues to work (seeds local data; skips LLM by using existing template generator as fallback so demo is instant).

## 9. Success check

Full happy path: create project (either mode) → research auto-runs → 5 concepts appear → open concept → see framework/why/risks/research → click "Get elements" → see hero/sections/copy-export → click "Generate images" → see Picsum previews attached. All persisted in localStorage across reloads.
