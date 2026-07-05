## Scope

Three focused changes, no content/copy generator work.

## 1. Image generation bugs — verify + tighten

The per-section "Generate real image" button and cross-section overwrite fix (from the last diagnosis) are already implemented in `src/routes/app.project.$projectId.concept.$conceptId.tsx` (routed through `/api/generate-images`) and `src/lib/store.tsx` (`updateImageForSection` per-section upsert, `saveImages` merge-preserving `real` status). Concrete follow-up work in this step:

- Manually verify the per-section button on the concept detail view now returns a real image and does not clear other sections' images.
- No further code change unless verification fails; if it does, add a per-section concurrency ref in `handleGenerateRealImage` (in addition to the disabled state) to block a second click while the DB round-trip completes.

## 2. Hero uses uploaded product photo directly

Goal: when the project has uploaded product photos, the hero section renders the actual uploaded photo (no AI call for that slot). AI generation continues to power all other sections.

Changes, all in `src/routes/app.project.$projectId.concept.$conceptId.tsx`:

- Add a `heroProductImage` memo: `getProductImages(projectId)[0]?.dataUrl ?? null`.
- Build a `displayImageBySection` map derived from `imageBySection`: for every section with `type === "hero"`, if `heroProductImage` is set, override with a synthetic `GeneratedImagePreview` `{ sectionId, previewUrl: heroProductImage, realUrl: heroProductImage, status: "real", imagePrompt: "Uploaded product photo", imageStyle: "uploaded", imageMode: "product_hero" }`. Pass this map into the section renderer loop instead of `imageBySection`.
- In `handleGenerateImages` (bulk): when `heroProductImage` exists, filter out items whose `sectionId` starts with `hero-` OR whose section type is `hero` before POSTing to `/api/generate-images`. This prevents wasting a Gemini call and prevents an AI hero from overwriting the uploaded photo.
- In the per-section image toolbar (lines ~532-580): when the section is a hero AND `heroProductImage` exists, hide the "Generate real image" button and change the caption to `Using uploaded product photo`.
- No change to `SectionRenderer` — it already renders `image.realUrl` first via `<img src=…>`, and a data-URL works directly in `<img>`.
- No DB write for the synthetic hero image — it lives in-memo only and is re-derived on load from `getProductImages`.

Edge cases:
- Multiple uploaded photos: use the first (`order` is already respected by `getProductImages`).
- No uploaded photos: behavior unchanged — hero goes through AI like today.
- Download-zip: `downloadConceptZip` receives `images` (not the display map). To keep the zip's hero as the uploaded photo, pass a `displayImages` array (with the hero override merged in) into `downloadConceptZip` instead of raw `images`.

## 3. Visual theme: contrast & readability pass

The palette logic (`resolveThemePalette` in `src/lib/theme/palette.ts`) stays untouched. Only the section-level styling in `src/components/SectionRenderer.tsx` changes so accent/primary become highlights, not full-section fills.

Adjustments:

- **CtaSection** — currently `background: theme.primary` (full dark block). Change to `background: theme.background`, wrap contents in a rounded card: `background: theme.surface`, `border: 1px solid withAlpha(theme.primary, 0.12)`, generous padding, `boxShadow: 0 20px 40px -20px withAlpha(theme.primary, 0.15)`. Headline uses `theme.primary` on light. CTA button keeps `background: theme.accent` (highlight). Section padding stays `py-20`.
- **OfferSection** — currently `background: theme.accent` (full colored block). Change to `background: withAlpha(theme.accent, 0.08)` with an inner white card (`theme.surface`, subtle accent border). Title in `theme.primary`, subtitle in `theme.mutedText`, CTA button `background: theme.accent`. Keeps the "offer feels special" cue without a heavy full-bleed color.
- **ComparisonSection** — the "isOurs" card keeps `background: theme.primary` (single card, intentional emphasis) but soften the shadow to `0 10px 30px -15px withAlpha(theme.primary, 0.35)`.
- **Section rhythm** — bump vertical padding on `ProblemSolutionSection`, `FeatureGridSection`, `LifestyleSection`, `FaqSection`, `DetailsSection`, `GenericSection` from `py-16` → `py-20 md:py-24` for more breathing room; on `BenefitStripSection` keep compact but add clearer top/bottom borders using `withAlpha(theme.primary, 0.1)` (currently 0.08).
- **Between-section separators** — add a hairline `borderTop: 1px solid withAlpha(theme.primary, 0.06)` at the top of every section that uses `theme.background`. This lands as a subtle divider so consecutive light sections don't blur together, without introducing new colored blocks.
- **StorySection** — currently `withAlpha(theme.primary, 0.04)`; keep, but add a matching hairline top border for consistency.

Do not touch: `styles.css` tokens, `palette.ts`, `SectionRenderer` component structure/hooks, or copy fields.

## Technical notes

- Files touched: `src/routes/app.project.$projectId.concept.$conceptId.tsx`, `src/components/SectionRenderer.tsx`. No DB migration, no server route changes, no `store.tsx` changes beyond what already shipped.
- No new state slot for the hero override — pure derivation from `getProductImages(projectId)` on each render.
- After the change, verify:
  1. Concept with uploaded photos → hero renders the uploaded photo; bulk "Generate images" does not overwrite it; "Generate real image" button is hidden on hero.
  2. Concept without uploaded photos → hero still goes through AI generation as before.
  3. Scrolling the preview shows alternating light sections with clear separators and only accent-colored highlights on CTAs/offer strip; no consecutive dark full-bleed blocks.