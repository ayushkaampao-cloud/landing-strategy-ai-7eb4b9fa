# Landing Page AI 1.0 — Final Consolidated Upgrade

Five-part upgrade layered on top of the existing pipeline. The classify → research → strategies → elements → images chain, the Gemini/Lovable/OpenRouter fallback, localStorage persistence, and the five framework families stay intact.

---

## Part 1 — Product Image Upload & Visual Grounding

**New type** (`src/types.ts`)
- `ProductImageRef { id, dataUrl, width, height, addedAt, order }`
- `ProductVisualProfile { productType, visibleMaterials[], visibleColors[], packagingStyle, labelStyle, shapeDescription, keyVisibleParts[], visibleAccessories[], likelyUsageContext, premiumLevel, photoConsistencyNotes, mustPreserve[], mustAvoid[] }`
- Extend `Project` with optional `productImages?: ProductImageRef[]` and `visualProfile?: ProductVisualProfile | null` (null = analyzed but skipped; undefined = never attempted).

**Storage** (`src/lib/storage.ts` + `store.tsx`)
- New keys `lpai:productImages:${projectId}` and `lpai:visualProfile:${projectId}`.
- Client-side downscale to max 1024px longest edge, JPEG q=0.82, stored as base64 data URLs. Warn if total >4 MB.
- Store helpers: `getProductImages / saveProductImages / getVisualProfile / saveVisualProfile`.

**Upload UI**
- New component `src/components/ProductImageUploader.tsx`: drag-drop + file picker, thumbnails with remove + drag-reorder, cap at 10, category-aware copy.
- Wired into `src/routes/app.product.new.tsx` as a step after brand details, before "Generate concepts". For SaaS/finance/service categories, the step is present but explicitly skippable ("No physical product — skip").

**Analysis route** (`src/routes/api/analyze-product-images.ts`)
- POST `{ projectId, category, images: [{dataUrl}] }`.
- For physical categories only. Calls existing gateway with multimodal input (image_url blocks with data URLs) using default Gemini model, `responseSchema` matching `ProductVisualProfile`.
- Returns the profile; client persists via store. If no images or non-physical category: returns `{ profile: null, mode: "text_only_visual_inference" }`.

**Prompt integration**
- Extend `research.ts`, `generate-strategies.ts`, `generate-elements.ts`, and image-prompt generation to accept optional `visualProfile`. When present, injected as a `PRODUCT VISUAL GROUNDING` block with the hard rule: "Use the uploaded product-image analysis as the primary visual grounding source. Do not invent a different product shape, packaging, material, label design, or accessories than what was analyzed. Preserve every item in mustPreserve; avoid every item in mustAvoid."
- Image prompts additionally weave `mustPreserve[]` into subject/material/label fields.

**Confidence badge**
- New `<GroundingBadge>` shown on concept, elements, and image panels: "Grounded in N uploaded product images" (accent) or "Text-only visual inference" (muted).

---

## Part 2 — Real Image Generation via Puter.js

**Loader**
- Add `<script src="https://js.puter.com/v2/"></script>` via `head.scripts` in `src/routes/__root.tsx`. Client-only; no key required.
- Small wrapper `src/lib/puter.ts` with `ensurePuter()` (waits for `window.puter`) and `generateImage({ prompt, negativePrompt, model, referenceImages? })`.

**Per-section control** (`src/components/SectionRenderer.tsx` + concept detail page)
- Keep existing Picsum preview as immediate placeholder.
- Add two buttons per image slot: "Generate real image" and "Keep placeholder". No auto-generation.
- While generating: loading shimmer over the placeholder. On success: swap preview to Puter blob URL and update `GeneratedImagePreview.status = "real"` in localStorage. On failure/timeout (20s): keep Picsum, show muted label "Image generation failed — using placeholder."

**Model routing by imageMode** (in `src/lib/puter.ts`)
- `product_packshot | product_in_use | material_detail | ingredient_macro` → photoreal model (try `black-forest-labs/flux.2-pro`, fall back to `openai/gpt-image-2`).
- `interface_ui | dashboard_closeup | comparison_graphic | data_visual_support` → UI-friendly model (`openai/gpt-image-2` clean vector-oriented prompt).
- `abstract_brand_texture | iconographic_brand_visual | quote_card_visual` → any general model default.

**Prompt assembly**
- Base = existing `imagePrompt` + " Avoid: " + `negativePrompt` (falling back to a default negative list including "mountains, oceans, unrelated scenery, random fruit, random objects, incorrect product shape, text overlays, watermarks").
- If `visualProfile` exists: append "Product visual grounding — must preserve: {mustPreserve}. Materials: {visibleMaterials}. Colors: {visibleColors}. Label style: {labelStyle}. Shape: {shapeDescription}."
- If uploaded product images exist AND the selected Puter model supports image-to-image input, pass the first 1–3 references via Puter's image-input option (detected at call time). Otherwise text-only. Wrapped in try/catch so an unsupported model silently falls back to text-only.

---

## Part 3 — Navigation (Back Button + Breadcrumbs)

**Back control**
- New `<BackLink>` component using TanStack `<Link>` with `to=".."` `from={Route.fullPath}` so it maps to real route history (browser back-compatible, preload="intent").
- Add to `app.project.$projectId.concept.$conceptId.tsx`, `app.project.$projectId.generating.tsx`, and any elements/image sub-pages, labelled contextually ("← Back to concepts", "← Back to project").

**Breadcrumbs**
- New `<Breadcrumbs>` at top of deep pages: `Project Name / Concept Name / Elements`, each segment a `<Link>`. Uses store lookups for names.

**History hygiene**
- Audit uses of `useNavigate` — replace click-nav with `<Link>` where a plain href works. Ensure no `replace: true` on normal transitions.
- Enable `scrollRestoration: true` in `src/router.tsx`.

---

## Part 4 — Delete Project / Delete Brand

**Store additions** (`src/lib/store.tsx`)
- `deleteProject(projectId)`: removes project + its concepts, and clears `lpai:research:*`, `lpai:elements:*` (per concept), `lpai:images:*` (per concept), `lpai:productImages:*`, `lpai:visualProfile:*`.
- `deleteWorkspace(workspaceId)`: cascades — deletes all products and projects under the workspace (each via `deleteProject`), then removes the workspace itself; if it was active, reset `activeWorkspaceId`.

**UI**
- Project card kebab menu (`DropdownMenu`) on `app.projects.tsx` and project index with a "Delete project" item → `AlertDialog` confirming with the project name.
- Brand/workspace delete entry in `app.brand.new.tsx` / workspace switcher area with equivalent `AlertDialog`.
- On confirm: run cascade, `toast.success("Project deleted")`, `navigate({ to: "/app" })`.

---

## Part 5 — Premium / Futuristic UI

**Tokens** (`src/styles.css`)
- Introduce a dark-first neutral palette (deep slate surfaces, alpha-blended borders `color-mix(in oklab, foreground 8%, transparent)`), one confident accent (a restrained electric teal — no purple/blue gradient cliché), semantic tokens for `--surface-1..3`, `--border-soft`, `--shadow-soft/elevated`, `--radius-sm/md/lg`.
- Add `@theme` entries for the new colors so Tailwind utilities pick them up.
- Full light-mode counterpart with matched contrast (WCAG AA verified on primary/foreground/background pairs).

**Typography**
- Load Satoshi (display) + General Sans (body) from Fontshare via `<link>` in `__root.tsx` head. Update `--font-display` and `--font-sans` in `@theme`. Apply `font-display` to h1/h2/hero, body font elsewhere.

**Component polish**
- Update `Button`, `Card`, `Input`, `DropdownMenu`, `Dialog`, and `AppShell` for the new tokens: soft layered surfaces, alpha borders, subtle inner highlight on hover, focus rings using the accent at 40% alpha.
- Micro-interactions: 120–180ms ease-out on hover/press. `motion-safe:` only, respecting `prefers-reduced-motion`.
- Page transitions: lightweight fade+translate on route content wrapper in `AppShell`, using CSS transitions keyed on `pathname`. Skip when reduced-motion.

**Dark mode toggle**
- Add `ThemeProvider` (class-based `dark`) with toggle in `AppShell` header, persisted in localStorage. Default = system, then dark.

**Consistency pass**
- Apply tokens across dashboard, new project flow, project detail, concept detail, elements panel, image panel, account/settings. Ensure 44px min touch targets and consistent spacing scale.

---

## Self-test checklist (run before reporting done)
1. Upload 2 images to a `beauty_skincare` project → `visualProfile.mustPreserve` populated; strategies/elements prompts contain the grounding block; badge reads "Grounded in 2 uploaded product images".
2. SaaS project with no upload → badge reads "Text-only visual inference"; pipeline still runs.
3. Click "Generate real image" on a `product_packshot` section of the skincare project → Puter returns image resembling the uploaded bottle; on a SaaS `interface_ui` section → clean UI-style render.
4. Back links + browser back/forward traverse project → concept → elements without dead-ends; scroll roughly restored.
5. Delete project → confirmation → cascade removes all `lpai:*:<id>` keys, toast shown, redirect to /app. Delete brand → all child projects gone, no orphans in localStorage.
6. Dark + light modes both polished across dashboard, concept detail, elements panel; AA contrast passes.

## Out of scope
- Supabase or any server-side persistence
- Changes to the classification / no-fabrication / imageMode logic
- Changes to the Gemini/Lovable/OpenRouter fallback chain
- New framework families or new pipeline steps beyond the analyze-product-images call
