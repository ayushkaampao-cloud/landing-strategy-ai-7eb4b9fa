# Visual rendering system: brand theme + styled sections

Two-part change built on top of the existing content pipeline. No changes to what content gets generated (classification fields, strategies, elements copy) beyond adding a `themePalette` object.

## Part 1 — Brand theme palette

### Data
- Add `themePalette` to `projects.classification` JSON (no new column needed — `classification` is already `Json`). Shape:
  ```ts
  themePalette: {
    primary: string;       // hex, e.g. "#1F3B4D"
    accent: string;        // hex
    background: string;    // hex — neutral surface
    surface: string;       // hex — card / elevated surface
    text: string;          // hex — body text on background
    mutedText: string;     // hex
    source: "product_photos" | "category_default";
  }
  ```
- Extend `ProjectClassification` in `src/types.ts` with an optional `themePalette` field of the shape above.

### Generation (in `src/routes/api/classify-project.ts`)
After `classifyProject()` returns the classification, compute `themePalette` and attach it to the returned object. Two sources, in priority order:

1. **Product-photo extraction** — if the caller passes a `projectId` (extend the POST `Body`), the handler queries `product_visual_profiles` for that project. If a row exists with `source_image_urls` (or `visibleColors`), pick the two most dominant / most-saturated colors via a lightweight in-worker sampler:
   - Fetch up to 3 signed image URLs, decode to pixels with the `Response.arrayBuffer` + a tiny JS PNG/JPEG decoder is heavy — instead, we already store `visibleColors: string[]` on the visual profile (LLM-extracted color names/hexes). Convert those to hex via a small named-color map, then use the two most-saturated as primary/accent. Neutrals are derived by desaturating primary toward white/black using `oklch` conversions.
   - Set `source: "product_photos"`.
2. **Category default** — a hard-coded map keyed by `ProjectCategory` + `toneSummary` keywords:
   - `beauty_skincare` → warm cream / muted terracotta / soft peach
   - `b2b_saas` / `finance_software` → cool slate + electric blue accent
   - `dtc_physical_product` → warm neutral + brand-adjacent accent
   - `food_beverage` → warm off-white + saturated accent
   - `hardware_device` → deep charcoal + neon accent
   - `service_consulting` → editorial ivory + deep primary
   - fallback → neutral warm gray + indigo accent
   - Set `source: "category_default"`.

`research-project.ts` (which invokes `classifyProject`) passes through `projectId` when available so extraction can run at initial research time. When `projectId` isn't available yet (very first classify before project is persisted), it falls back to category defaults; a later re-classify can upgrade it.

### Consumption
`Project.classification.themePalette` is read by the concept renderer and passed as a `theme` prop to every styled section. No global CSS variable mutation — we use inline styles / a scoped CSS-vars wrapper on the preview surface so switching concepts across projects doesn't leak theme state.

## Part 2 — Styled per-section-type components

Replace the switch inside `src/components/SectionRenderer.tsx` with a dispatcher that picks a real styled component per `SectionType`. New folder: `src/components/sections/`.

Components (one per existing `SectionType`):
- `HeroSection.tsx` — full-bleed hero, image on the right at ≥lg (or as background with overlay when the image mode is `abstract_brand_texture` / `iconographic_brand_visual`). Eyebrow tag, H1, subhead, primary + secondary CTA styled with `theme.accent`.
- `BenefitStripSection.tsx` — horizontal 3–4 column strip of bullets with icons, no image; accent-tinted background.
- `ProblemSolutionSection.tsx` — two-column: problem copy left, generated image right in a rounded card; theme-tinted background.
- `FeatureGridSection.tsx` — grid of item cards; if the section image exists, use it as a header banner above the grid, and each item gets a numbered accent chip.
- `StorySection.tsx` — editorial layout: large image left, long-form copy right, accent quote mark.
- `LifestyleSection.tsx` — image-dominant (16:7), copy centered below.
- `ComparisonSection.tsx` — two-card comparison; "ours" card uses `theme.primary` background with `theme.background` text, "theirs" muted.
- `SocialProofSection.tsx` — centered testimonial with accent quote marks; if image exists, small circular avatar above; bullets render as a stats row.
- `FaqSection.tsx` — accordion-styled list; theme-tinted expanded state (no interaction change — keep current static open state).
- `OfferSection.tsx` — full-width accent-background band with headline, subtitle, CTA in inverted colors.
- `GuaranteeSection.tsx` — badge + short copy inline; accent check mark.
- `CtaSection.tsx` — final full-bleed CTA on `theme.primary`, headline in `theme.background`, button in `theme.accent`.
- `DetailsSection.tsx` — two-column: bulleted details left, image right.

Each component:
- Accepts `{ section, theme, image, editing }` where `editing` bundles the existing `onEdit/onEditBullets/onEditItems/isEdited/saveError` props so all inline-editing (from the previous PR) still works — we pass these into the same `<Editable>` / `<EditableBullets>` primitives, just inside new layouts.
- Embeds the section image **inline** using `image.realUrl || image.previewUrl` if present. The current concept page block that renders `<img>` **below** each section (lines ~431–500 of `app.project.$projectId.concept.$conceptId.tsx`) is removed — images now live inside each section component in the right slot for that layout.
- When no image URL exists yet, renders a **branded placeholder** for that slot: a rounded frame filled with a diagonal gradient of `theme.primary` → `theme.accent` at low opacity over `theme.surface`, with a small monospace label ("Hero visual", "Comparison graphic", etc.) — never gray, never blank.
- Uses inline styles for the theme colors (`style={{ background: theme.background, color: theme.text }}`) rather than Tailwind color classes, so the palette actually applies. Layout, spacing, and typography stay in Tailwind classes.
- Responsive: single-column below `md`, multi-column above.

### Dispatcher
`SectionRenderer` becomes a thin dispatcher:
```tsx
const REGISTRY: Record<SectionType, ComponentType<SectionComponentProps>> = {
  hero: HeroSection, "benefit-strip": BenefitStripSection, /* … */
};
const Comp = REGISTRY[s.type] ?? GenericSection;
return <Comp section={s} theme={theme} image={image} editing={editing} />;
```
`GenericSection` (fallback) uses the theme too, so an unknown/future section type still looks on-brand. Section-type inference: `s.type` already exists on every generated section — we trust it. If a section arrives with an unknown type, we log once and use `GenericSection`; we do NOT infer from position.

### Concept page wiring (`app.project.$projectId.concept.$conceptId.tsx`)
- Read `themePalette` from `project.classification?.themePalette`; if missing, use the category-default derivation (same map as the classifier) as a client-side fallback so old projects still render.
- Pass `theme` and `image` into `SectionRenderer` alongside the existing editing props.
- Remove the standalone image block below each section (its "generate real image" affordance moves into a small overlay on the image inside the section, or stays as-is directly under — TBD by simplest diff; either way the section image itself is embedded).
- Wrap the preview surface in a `<div style={{ background: theme.background }}>` so the whole page reads on-brand, not on white.

## Technical details

**Files touched**
- `src/types.ts` — add `themePalette` to `ProjectClassification`, add `ThemePalette` type.
- `src/routes/api/classify-project.ts` — accept optional `projectId`, run extractor, attach `themePalette`.
- `src/routes/api/research-project.ts` — forward `projectId` when calling `classifyProject`.
- `src/lib/theme/palette.ts` — new: category default map, product-photo extractor, hex/oklch helpers, `resolveThemePalette(classification)` for client fallback.
- `src/components/SectionRenderer.tsx` — becomes dispatcher.
- `src/components/sections/*.tsx` — 13 new files, one per section type + `GenericSection` + shared `BrandedImageFrame` + `SectionComponentProps` type.
- `src/routes/app.project.$projectId.concept.$conceptId.tsx` — remove standalone image block, pass theme, wrap surface in themed div.

**Non-goals (explicitly untouched)**
- `generate-strategies.ts`, `generate-elements.ts` copy, image generation pipeline, AI gateway model config, `image_previews` schema, elements editing behavior.

**Migration**
- None required — `classification` is already `Json` and `themePalette` is nested inside it.

## Diagram

```text
classify-project.ts
  ├─ classifyProject() ─► LLM classification
  └─ resolveThemePalette({ classification, projectId? })
        ├─ product_visual_profiles.visibleColors ─► extract primary/accent
        └─ category default map (fallback)
                                    │
                                    ▼
                projects.classification.themePalette (Json)
                                    │
                          concept page reads theme
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            <HeroSection theme=…>         <FaqSection theme=…>
              embeds image inline           branded placeholder
              accent CTA, theme bg          if image missing
```
