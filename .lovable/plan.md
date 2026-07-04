## Goal

Replace the current Pollinations-based image generation with Google Gemini image generation via the Lovable AI Gateway. When the project has uploaded product photos, pass up to 3 as reference images so the generated visual preserves the real product's shape/color/branding. Save each result to Lovable Cloud storage and persist the public URL as the section preview.

Text/copy generation is untouched.

## Changes

### 1. Storage bucket for generated images

New migration:
- Create public bucket `generated-images` via `storage_create_bucket` tool (public read).
- RLS on `storage.objects`: authenticated users can INSERT/UPDATE/DELETE their own objects under this bucket; anyone can SELECT.

### 2. Rewrite `src/routes/api/generate-images.ts`

- Accept `projectId` in the request body (concept page already knows it).
- Server-side, load `product_visual_profiles.source_image_urls` for that project using the admin client. Take the first up to 3 entries and extract each `dataUrl`.
- For each item, call the Lovable AI Gateway chat completions endpoint with model `google/gemini-2.5-flash-image` and `modalities: ["image","text"]`:
  - `messages[0].content` = text block + up to 3 `image_url` blocks (data URLs) when references exist.
  - Text: `"Use the reference image(s) to preserve the exact product's shape, color, and branding. Place it in this new scene/context: {imagePrompt}. Avoid: {negativePrompt}."` When no references, drop the "Use the reference image(s)…" sentence and send `imagePrompt` + `Avoid: negativePrompt` only.
- Parse the returned base64 PNG from the response, decode to bytes, upload via `supabaseAdmin.storage.from('generated-images').upload('generated/{projectId}/{sectionId}-{timestamp}.png', bytes, { contentType: 'image/png', upsert: true })`, then get `getPublicUrl`.
- Return `GeneratedImagePreview` with `previewUrl = publicUrl`, `status: "generated"`.
- On error (gateway failure, timeout ~45s, empty response, upload error): return `status: "failed"`, `previewUrl: ""` for that item. The concept page's existing failed-image UI (gray placeholder + Retry button) will surface it.
- Requests run in parallel with `Promise.all` per batch, each wrapped so one failure never breaks siblings.
- Remove the physical-category → placeholder branch (real generation now works for all categories); the placeholder path stays only as the failure fallback.

### 3. Update `src/routes/app.project.$projectId.concept.$conceptId.tsx`

- Add `projectId` to the `/api/generate-images` request body.
- No other changes: existing Retry button, imgFailed handling, and per-section "Generate real image" flow already do the right thing when `previewUrl` is empty or the load fails.

### 4. Cleanup in `src/lib/ai/prompts.ts`

- Delete `pollinationsUrl()` and its `hashStr` helper (no longer referenced).
- Leave everything else (category rules, factsBlock, buildVisualBrief, groundingPrefix, pickImageModeForSection) untouched.

### 5. Untouched

- Text/copy generation (`/api/generate-elements`, prompts logic for text).
- Client-side `generateRealImage` (Puter) per-section flow — keep as an alternate manual option.
- "Copy image prompt" UI.
- Types.

## Failure/retry contract

- Failed section → `status: "failed"`, empty `previewUrl` → existing UI shows gray placeholder + Retry.
- Retry button re-runs `/api/generate-images` for the concept (existing behavior via the retry nonce path) or the per-section "Generate real image".

## Notes / assumptions

- Uses the Lovable AI Gateway with `LOVABLE_API_KEY` (already in project secrets). No user API key needed.
- Product photos are already stored as base64 data URLs in `product_visual_profiles.source_image_urls`, so they can be sent directly to Gemini as `image_url` blocks without any additional upload step.
- Public storage bucket keeps preview URLs stable and cacheable; per-project path prefix keeps things tidy.
