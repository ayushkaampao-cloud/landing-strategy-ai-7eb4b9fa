# Landing Page AI — Intelligence Upgrade Plan

Scope: content + image intelligence only. No UI redesign, no route changes, no Supabase, no publishing. Existing gateway fallback chain (Gemini direct → Lovable Gateway → OpenRouter) stays untouched.

## 1. Gateway: add structured-output support

Extend `src/lib/ai/gateway.ts` (non-breaking) with an optional `responseSchema` param on `callLLMJson`:

- Gemini direct path: pass `generationConfig: { responseMimeType: "application/json", responseSchema, ... }`.
- Lovable Gateway / OpenRouter paths: translate to `response_format: { type: "json_schema", json_schema: { name, schema, strict: true } }`.
- Existing signatures still work when no schema is passed. Provider selection + fallback logic unchanged.
- Add small helper `defineSchema()` for building schemas with stable `propertyOrdering` (Gemini-specific field, ignored elsewhere).

## 2. New type surface (`src/types.ts`)

Extend without breaking existing consumers:

- `ProjectClassification`: `category` (union of 8 values from spec), `subcategory`, `audienceSophistication`, `awarenessLevel`, `toneSummary`.
- `ProjectResearch` gains: `classification`, `trustSignalsNeeded[]`, `verifiedFacts[]`, `forbiddenClaims[]` (keep old fields for back-compat).
- `SectionProps` / elements gain: `imageMode` (union of 13 modes), `negativePrompt`, `proofNeeded?: boolean`, `placeholder?: boolean` (drives the "Needs your input" UI tag).
- `VisualIdentityBrief`: brandName, category, productType, visualIntent, preferredImageModes[], forbiddenImageModes[], sceneSuggestions, productPresentationStyle, environmentStyle, lightingStyle, compositionStyle, paletteHints, realismLevel.
- `GeneratedImagePreview` gains: `imageMode`, `category`.

## 3. New AI service modules

Create thin, single-purpose modules that all call through the existing gateway:

- `src/lib/ai/classify.ts` — `classifyProject(input) → ProjectClassification`. Runs first, always. Structured schema.
- `src/lib/ai/research.ts` — `researchProject(input, classification) → ProjectResearch`. Handles `sourceMode: "url" | "brief"`, best-effort page fetch (reuse logic from existing `api/research-project.ts`), records `note` on fetch failure. Emits `verifiedFacts` only from user brief or fetched text; emits `forbiddenClaims` naming everything not provided (reviews, ratings, press, guarantees, shipping, certifications, metrics).
- `src/lib/ai/strategies.ts` — `generateStrategies(research, classification) → LandingPageConcept[5]`. One Gemini call per framework family (parallel), each prompt receives classification + verifiedFacts + forbiddenClaims + category-language guidance. Structured schema per concept.
- `src/lib/ai/elements.ts` — `generateElements(concept, research, classification) → LandingPageElements`. Adds `proofNeeded`, `placeholder` flags, `copyExportText`.
- `src/lib/ai/visual.ts` — `generateVisualIdentityBrief(research, classification, product) → VisualIdentityBrief`. Cached per project.
- `src/lib/ai/images.ts` — `generateImagePrompts(section, visualBrief, classification)` produces the structured prompt object (imageMode, subject, setting, cameraFraming, lighting, styleReferences, mood, negativePrompt) and `pickPreviewSeed(imageMode, category)` for the preview endpoint.

Every prompt in strategies/elements/images includes the hard rule:
> Never invent numbers, ratings, review counts, quotes, press/media mentions, warehouse or shipping claims, guarantee terms, return rates, certifications, or competitor claims. If not in verifiedFacts, output a labeled placeholder ("Add verified metric here", "Add real customer testimonial here") and set `placeholder: true`.

And the category-language rule (SaaS/finance vs. DTC/beauty/food vs. service vs. hardware) exactly as specified in the brief.

## 4. Server routes

Update in place; keep paths and response shapes compatible with existing UI consumers:

- `src/routes/api/classify-project.ts` (new) — POST, returns `ProjectClassification`.
- `src/routes/api/research-project.ts` — call `classifyProject` first, then `researchProject`, return extended `ProjectResearch` including `classification`.
- `src/routes/api/generate-strategies.ts` — delegate to `strategies.ts`. Remove the hardcoded `FRAMEWORKS` copy-shaping logic; keep only the framework family list (name + section-count hint) and pass everything else to the model with the research + classification.
- `src/routes/api/generate-elements.ts` — delegate to `elements.ts`; adds placeholder/proofNeeded flags.
- `src/routes/api/generate-images.ts` — call `images.ts` to (a) classify each section's imageMode using the visual brief, (b) build the structured prompt, (c) map (imageMode, category) → a curated deterministic Picsum seed set (e.g., abstract textures for `interface_ui`/`abstract_brand_texture`, product-composition-style seeds for `product_packshot`, editorial seeds for `founder_story_editorial`, plain gradient placeholder for `no_image_needed`). Never fully random.

## 5. Generator refactor (`src/lib/generator.ts`)

- Strip all hardcoded copy, fake proof, review counts, press mentions (WIRED/VOGUE/GQ etc.), warehouse/shipping/guarantee claims.
- Becomes a thin orchestrator: `runFullPipeline(project)` → classify → research → strategies (or single-concept regenerate) → elements → images, all through the AI modules above.
- Regenerate-concept, get-elements, and generate-images entry points all go through this orchestrator.
- Keep ONE clearly-labeled `LAST_RESORT_FALLBACK` used only if the entire gateway chain throws. It emits placeholder-only sections ("Add real headline here", "Add verified metric here", `placeholder: true`) — never fabricated content.

## 6. UI trust labeling

Minimal, additive to existing components (no redesign):

- `src/components/SectionRenderer.tsx` and the elements rail in `app.project.$projectId.concept.$conceptId.tsx`: when a field or section has `placeholder: true` or `proofNeeded: true`, render a small badge ("Needs your input" / "Suggested — verify before use") next to the value using the existing `Badge` component.
- No layout, spacing, or navigation changes.

## 7. Self-test before finish

Run the pipeline end-to-end against two seed inputs (executed via the debug route or a temporary script, not shipped as UI):

1. SaaS invoicing product.
2. DTC skincare serum.

Verify:
- Classification returns the right category for each.
- No fabricated proof/ratings/press anywhere in concepts or elements (grep for known fake tokens: "WIRED", "VOGUE", "GQ", "★", "4.9", "10,000+", "guarantee").
- SaaS output uses workflow/ROI/integration language and no skincare/ritual language; DTC output uses material/formula/ritual and no ROI/dashboard language.
- Image prompts for SaaS use `interface_ui` / `dashboard_closeup` / `abstract_brand_texture`; DTC uses `product_packshot` / `material_detail`. No nature/mountain/fruit prompts in either.
- Placeholders are flagged with the badge in the UI.

## Technical notes

- All new modules are server-only (imported from route handlers). No new client dependencies.
- Structured schemas kept small and constraint-free (no `.min()`/`.max()` bounds, no long enums beyond the fixed unions above) per gateway rules.
- Strategy generation stays parallel across the 5 families; classification + research + visual brief run once per project and are cached on the project object in local storage.
- Preview image mapping is a static table in `images.ts` keyed by `(imageMode, category)` → Picsum seed list; deterministic hash chooses within the list. No random scenery.
- No changes to routes, router config, auth, storage keys, or the gateway fallback chain.

## Out of scope

Supabase, real image generation, publishing, analytics, collaboration, Shopify API, UI redesign, new pages, framework additions.
