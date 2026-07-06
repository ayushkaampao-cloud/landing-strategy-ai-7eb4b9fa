## Goal
Ship a reliable end-to-end flow: brief → concepts → generated copy visible in preview → per-section images that persist, don't overwrite each other, and don't burn credits.

## Scope of changes

### 1. Copy renders in the preview (concept detail, project index, share preview)
- Keep `mergeElementsIntoSections` as the single source of truth for turning saved `elements` + user edits into the rendered `SectionProps[]`.
- Guarantee every render path (`app.project.$projectId.concept.$conceptId.tsx`, `app.project.$projectId.index.tsx`, `preview.$shareToken.tsx`) uses `displaySections` — no direct reads of `concept.hero`/`concept.sections` in JSX.
- When `elements` are missing, render the product-derived skeleton copy from `generator.ts` (no "Add headline" placeholders ever surface).

### 2. Elements persist and reload
- On concept load, hydrate `elements` from backend (`elements` table) into the store before first render; fall back to localStorage only if backend is empty.
- After `generate-elements` succeeds, write to backend AND update store in one action so a refresh shows the same copy.
- Same rule for `image_previews`: load by `concept_id` on mount, keyed by `section_id`.

### 3. Per-section image storage (no cross-section overwrites)
- State shape: `imageBySection: Record<sectionId, GeneratedImagePreview>` — never an array replaced wholesale.
- Single-section generate: upsert only that `sectionId` row (backend + store).
- Bulk generate: iterate sections, skip if (`imageMode === "no_image_needed"`) or (existing image for that sectionId is valid) or (empty prompt); upsert per section as each completes. A failure on one section never clears others.
- Renderer reads `imageBySection[section.id]` directly.

### 4. Hero / product-shot short-circuit
- If the project has uploaded product images and section `imageMode` is `product_packshot` (or the hero), use the first uploaded image as the section image immediately — no AI call, no credit spend. Store it as a normal `image_previews` row so refresh works.

### 5. Credit-safe failure handling
- `generate-images` returns a typed result per section: `ok | skipped | rate_limited | credits_exhausted | failed`.
- On 402: stop the batch, toast once ("AI credits exhausted — using placeholders"), keep any successful sections intact.
- On other failures: keep the previous image for that section (don't null it out), show a small inline "retry" affordance on that section only.

### 6. OpenRouter model
- Leave `OPENROUTER_MODEL = "google/gemma-4-31b-it:free"` as set. Confirm `extractJson` still handles its output; no other change.

## Out of scope
- No new section types, no visual redesign, no new model providers, no schema changes beyond what per-section image upsert already needs.

## Technical notes
- Files touched: `src/lib/store.tsx` (hydrate elements+images from backend, per-section image upsert), `src/routes/app.project.$projectId.concept.$conceptId.tsx` (single + bulk handlers using per-section upsert, hero short-circuit call site), `src/routes/api/generate-images.ts` (per-section result contract, 402 handling, packshot short-circuit), `src/components/SectionRenderer.tsx` (read `imageBySection[section.id]`), `src/lib/landingPageElements.ts` (already correct — verify only), `src/routes/app.project.$projectId.index.tsx` and `src/routes/preview.$shareToken.tsx` (use `displaySections` + `imageBySection`).
- No migrations needed if `elements` and `image_previews` tables already key by `concept_id` + `section_id` (they do per `get_shared_concept`).

## Verification (single pass, minimal credits)
1. Open an existing concept → generated copy shows in preview (not "Add headline").
2. Refresh → same copy still shows.
3. Click generate on section A → only A gets a new image; B unchanged.
4. Bulk generate with one uploaded product image → hero uses uploaded image with zero AI calls; other sections generate once and skip on re-run.
5. Simulate 402 (or observe if it happens): batch stops cleanly, prior images intact, one toast.
