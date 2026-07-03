# Fix Plan: Landing Page AI — Broken Core Behavior

Scope: fix the 4 concrete bugs without redesigning anything. All work is in the frontend + existing API routes.

---

## Part 1 — Make "Needs your input" placeholders editable inline

**New:** `src/components/Editable.tsx`
- Click-to-edit text primitive.
- Renders as styled placeholder (amber, dotted underline) when value looks like a placeholder (`/^(add|needs|placeholder|verify|tbd|todo|insert |real customer|verified )/i`, or `isPlaceholder` prop).
- On click → swaps to `<input>` or `<textarea>` (per `multiline`), autofocuses & selects.
- Saves on blur / Enter; Esc cancels; empty value → reverts to placeholder.
- Shows small "User provided" tag when the current value differs from placeholder.

**New store method:** `src/lib/store.tsx`
- `updateConceptSection(conceptId, sectionId, patch: Partial<SectionProps>)` → mutates the concept in the `concepts` array immutably and persists via existing localStorage.
- If `patch` yields all-empty strings, delete those keys so placeholder default returns (rendered from generator's placeholder string).

**Edit** `src/components/SectionRenderer.tsx`
- Add optional prop `onEdit?: (field: keyof SectionProps, value: string) => void`.
- When `onEdit` is provided AND `section.placeholder || section.proofNeeded`, wrap these fields with `<Editable>`:
  - hero: `title` (h1), `subtitle`, `ctaLabel`, `ctaSecondaryLabel`, `highlight`
  - problem-solution / story / lifestyle / details / cta: `title`, `body`
  - social-proof: `body` (testimonial), `highlight` (attribution)
  - guarantee: `title`, `body`
  - offer / cta: `title`, `subtitle`, `ctaLabel`
  - comparison / feature-grid / faq: skip item-level editing this pass (still render).
- Keep the existing `PlaceholderBadge` for the section-level cue.
- Backward-compatible when `onEdit` is absent.

**Edit** `src/routes/app.project.$projectId.concept.$conceptId.tsx`
- Pass `onEdit={(field, value) => updateConceptSection(conceptId, s.id, { [field]: value })}` to each `<SectionRenderer>`.
- Persistence works automatically because store already serializes `concepts` to localStorage.

Placeholders covered per user list: headlines, CTA labels, testimonial bodies, proof/metric highlights (hero.highlight, social-proof.highlight), guarantee body, comparison titles/bodies via section-level fields. No auto-fill; user-only.

---

## Part 2 — Fix "Regenerate whole concept" (blank Concept-not-found)

Root cause: `saveConcepts` runs `setData` asynchronously; the `navigate` to a **new conceptId** re-renders before state commits → lookup returns undefined → "Concept not found."

Chosen approach: **Option A — regenerate in place, keep same `concept.id`**.

**Edit** `src/routes/app.project.$projectId.concept.$conceptId.tsx` → `regenerate()`:
1. Loading + error state via existing `regenerating` + a new `regenError` (shown as toast + inline banner; user stays on the same route).
2. Call `/api/generate-strategies` with `onlyFamily: concept.templateFamily`.
3. Take `fresh` and **reuse the current `concept.id`**:
   ```ts
   const merged: LandingPageConcept = { ...fresh, id: concept.id, projectId: project.id, createdAt: concept.createdAt };
   const nextForProject = concepts
     .filter(c => c.projectId === project.id)
     .map(c => (c.id === concept.id ? merged : c));
   saveConcepts(project.id, nextForProject);
   ```
4. **No navigation.** Route stays valid; existing sections re-render.
5. Also invalidate cached elements/images for this concept via `storage.clearConcept(concept.id)` + bump versions so the elements/images panel resets cleanly.
6. On error: `toast.error(...)`, keep the user on the current concept. Never navigate.
7. Fallback path (network failure) also uses in-place replacement with the local `generateConceptsForProject` output for the same family.

Result: regeneration is idempotent — same route, same URL, same conceptId every time. Cannot dead-end.

---

## Part 3 — Connect product image uploads to actual output

**Edit** `src/routes/api/analyze-product-images.ts`
- Accept `dataUrl`s and pass them multimodally when the gateway supports it. Gateway text-only today; keep current text-only best-effort profile, **but** stamp `photoConsistencyNotes` with `"Uploaded ${N} product image(s). Treat these as ground truth for shape, color, label layout."` so downstream text prompts always reference the upload.
- Return `mode: "grounded"` whenever `images.length > 0` (fallback profile still counts).

**Confirm downstream wiring** (audit only, small edits if needed):
- `generate-strategies`, `generate-elements` already receive `research.classification`. Add `visualProfile` to their request bodies from the concept detail page and thread it through to the prompt (append a "Visual grounding" block from `mustPreserve`, `visibleColors`, `keyVisibleParts`). If routes don't yet read it, extend them minimally.
- `generate-images` already gets `category`; add `visualProfile` + `referenceImageCount` to the request body.
- Puter `generateRealImage` already merges `visualProfile.mustPreserve/Colors/Materials/labelStyle/shape` into the prompt (verified in `src/lib/puter.ts`).

**UI visibility (debug-safe):**
- **New:** `src/components/VisualProfileSummary.tsx` — compact card showing productType, colors, materials, shape, packaging, label, keyVisibleParts, mustPreserve, mustAvoid, plus header "N image(s) analyzed" or "Text-only visual inference".
- Render on:
  - Project dashboard (`app.project.$projectId.index.tsx`) — right below the Research snapshot.
  - Concept detail (`app.project.$projectId.concept.$conceptId.tsx`) — in the right rail, above "Elements & visuals".
- Existing `<GroundingBadge>` in the TopBar stays.

---

## Part 4 — Fix image generation relevance

**Edit** `src/types.ts`
- Extend `GeneratedImagePreview.status` union with `"placeholder"`.
- Add optional `placeholderLabel?: string` and `placeholderMode?: ImageMode`.

**Edit** `src/routes/api/generate-images.ts`
- Define `PHYSICAL_CATEGORIES = ["dtc_physical_product","beauty_skincare","hardware_device","food_beverage"]`.
- For each item:
  - If `category` is physical **OR** the resolved `mode` is one of `product_packshot | product_in_use | material_detail | ingredient_macro` → return `{ status: "placeholder", previewUrl: "", placeholderLabel: LABEL_BY_MODE[mode], placeholderMode: mode }` (no Picsum).
  - Otherwise (SaaS, service, abstract modes) → keep existing `previewUrlFor(mode, seed)` (still grayscale-treated abstract textures, never scenery for physical products).
- `LABEL_BY_MODE`:
  - `product_packshot` → "Product packshot placeholder"
  - `product_in_use` → "Product in use placeholder"
  - `material_detail` → "Material detail placeholder"
  - `ingredient_macro` → "Ingredient macro placeholder"
  - fallbacks per remaining modes.

**Edit** `src/components/SectionRenderer.tsx` image slot (via concept page) — actually rendering lives in the concept page. So:

**Edit** `src/routes/app.project.$projectId.concept.$conceptId.tsx` image renderer block:
- When `img.status === "placeholder"` and no `img.realUrl`: render a structured neutral card (aspect 16/9, dashed border, muted background) with:
  - big mode icon (simple SVG glyph per mode)
  - `img.placeholderLabel`
  - small "Generate real image" button (existing action) — routes through Puter with the visualProfile.
  - a secondary "Not yet generated — click to render with product grounding" caption.
- When `img.realUrl` present: unchanged.

**Edit** `src/lib/puter.ts`
- Extend `DEFAULT_NEGATIVE` to include: `"landscapes, mountains, oceans, forests, sunsets, beaches, random people, animals, wildlife, travel scenes, unrelated fruit, unrelated objects, generic stock photo, wrong product shape, altered label, text overlays, watermarks"`.
- If `referenceImages.length > 0`, prepend to prompt: `"Match uploaded product reference exactly: preserve silhouette, proportions, label placement, and color."` (Puter.js API doesn't accept image inputs today — documented limitation below.)

Net: physical-product sections never show scenery. Wrong-but-pretty images replaced with explicit, mode-labeled placeholder cards until the user opts into real Puter generation.

---

## Part 5 — Back button / route stability

**Audit + tiny edits:**
- Concept detail TopBar already has "← All 5 concepts". Keep.
- Project detail: add "← Projects" back link (already via TopBar breadcrumbs — verify).
- `generating` and `product/new`: ensure TopBar back link renders.
- Since regenerate no longer navigates, browser back/forward can no longer land on a stale conceptId.
- All action buttons that mutate state (`updateConceptSection`, `saveElements`, `saveImages`) stay on-route.

---

## Part 6 — Self-test checklist (manual after build)

1. Upload 3+ product images at `/app/product/new` → project created, `analyze-product-images` returns profile → project page shows `<VisualProfileSummary>` with real colors/materials.
2. Open a concept → placeholder headline is amber + dotted underline → click → input opens → type "Sleep-tracking that actually sleeps with you" → blur → new value renders + "User provided" tag → reload page → value persists.
3. Click "Regenerate this concept" 3× → URL unchanged → sections update in place → no "Concept not found."
4. If network fails, toast error appears, page stays intact.
5. Generate elements → Generate images. For a physical-product project, all image slots show structured `"Product packshot placeholder"` / `"Product in use placeholder"` cards — no random scenery, no animals, no landscapes.
6. Click "Generate real image" on a slot → Puter prompt includes `Preserve: … Materials: … Colors: … Avoid: landscapes, animals, …`.
7. Verify `<GroundingBadge>` in TopBar reads "Grounded in N uploaded images".

---

## Known limitation to report back

- Puter.js `txt2img` currently accepts a text prompt only. True **reference-image conditioning** (img2img with uploaded product photos as visual anchors) is not exposed by the Puter SDK we're using. We compensate by injecting the analyzed `ProductVisualProfile` (colors, materials, shape, mustPreserve/mustAvoid) into every prompt, and by falling back to explicit structured placeholders whenever real generation isn't invoked — so users never see a plausibly-wrong image passing itself off as the product.
