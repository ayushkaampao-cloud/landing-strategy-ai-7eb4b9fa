## Goal
Fix image generation UX on the concept detail view, use uploaded product photos as the hero image, soften the visual theme for readability, and swap the OpenRouter fallback model.

## 1. Reliable per-section image generation from the concept detail view

File: `src/routes/app.project.$projectId.concept.$conceptId.tsx`

- Today the "Generate real image" button only renders when an `img` slot already exists in `imageBySection`, which only happens after the bulk "Generate images" run. Make every section render an image control row unconditionally, so users can generate a section's image directly from the concept view without first running elements + bulk generation.
- Change `handleGenerateRealImage(sectionId)` to not require `imageBySection[sectionId]`. Derive prompt/style/mode from:
  - the elements record if it exists (`elements.sections[…].imagePrompts[0]`, `elements.globalStyle.imageStyle`, `sec.imageMode`),
  - otherwise from the section itself (`section.imagePrompt`, `section.imageStyle`, `section.imageMode`).
- Skip the hero when an uploaded product photo exists (already guarded — keep and extend to bulk flow).
- Confirm the merge behaviour in `store.saveImages` (already keyed by `sectionId` and merges with existing) covers the bulk path so regenerating one section never removes others. Add the same guarantee explicitly in `updateImageForSection` (single-section update path is already safe — verify no accidental array replace).

## 2. Use uploaded product photo directly for the hero section

File: `src/routes/api/generate-images.ts` and `src/routes/app.project.$projectId.concept.$conceptId.tsx`

- Server route: when the incoming item has `imageMode === "product_packshot"` AND the project has product reference images loaded, short-circuit generation and return a `real`-status preview whose `previewUrl`/`realUrl` is the first reference photo's data URL (no AI call, no credit spend). Non-hero sections still call the Gemini image endpoint with the references as guidance only.
- Client:
  - Keep the current `heroProductImage` override in `displayImageBySection`.
  - In the bulk `handleGenerateImages`, always exclude hero sections from the `items` array when `heroProductImage` is present (existing `skipHero` logic — keep) and additionally persist a synthetic hero image entry via `saveImages` so refresh keeps rendering the uploaded photo as hero (not just the in-memory override).
  - Hide the "Generate real image" button for hero sections when an uploaded photo exists (already done — keep).

## 3. Theme contrast and readability

File: `src/components/SectionRenderer.tsx` (styling only, no restructuring) and `src/lib/theme/palette.ts`

- In `paletteFromColors`, when the derived `primary` is very dark (L < 0.25), keep it as a text/accent-on-light color but don't allow it to dominate section backgrounds. Add a `surface`/`background` guard so neutrals stay the category-default light values (already the case) — verify no override slips through.
- In `SectionRenderer`, audit each section wrapper style and:
  - Replace any full-bleed `background: theme.primary` (or high-alpha primary) section fills with `background: theme.background` or `theme.surface`, and move the color emphasis to CTAs, headings, accent rules, and small chips.
  - Alternate consecutive sections between `theme.background` and `theme.surface` (or a `withAlpha(theme.accent, 0.04)` tint) so no two dark/heavy sections stack.
  - Ensure CTAs keep the accent fill (`theme.accent` + `contrastText`) so the color extraction still reads on the page.
  - Add generous vertical padding (`py-16 md:py-20`) to section wrappers that currently feel cramped; keep existing container widths.
- Do not change section component structure or copy — style adjustments only.

## 4. OpenRouter fallback model

File: `src/lib/ai/gateway.ts`

- One-line change: `const OPENROUTER_MODEL = "google/gemma-4-31b-it:free";`
- `callLLMJson` already retries and `extractJson` already strips fences / recovers loose JSON, so no additional handling needed.

## Out of scope
- Content/copy generation logic.
- Rebuilding section components.
- Any DB schema changes.

## Verification
- Load a project with uploaded product photos → hero renders the uploaded photo, non-hero sections show branded placeholders until generated.
- Click "Generate real image" on a single non-hero section → only that section updates; other section images remain unchanged after refresh.
- Bulk "Generate images" → hero is skipped, remaining sections generate; re-running does not wipe previously generated sections.
- Visual check: no two consecutive sections use a dark/heavy fill; CTAs still carry the brand accent.
- Force gateway/Lovable failure → OpenRouter tier hits `google/gemma-4-31b-it:free` and JSON still parses.
