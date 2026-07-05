## Diagnosis

### Bug 1 — "Generate real image" per-section button does nothing

The two entry points call **completely different backends**:

- **Sidebar "Generate images" button** (`handleGenerateImages`, concept route line 412) → POST `/api/generate-images` → Lovable AI Gateway (`google/gemini-3.1-flash-image`) → uploads to Supabase storage → returns signed URL. Server-side, reliable. **This is the one that works.**
- **Per-section "Generate real image" button** (`handleGenerateRealImage`, concept route line 337) → `generateRealImage()` in `src/lib/puter.ts` → `window.puter.ai.txt2img(...)` loaded from `https://js.puter.com/v2/` (script tag in `__root.tsx` line 110). **This is the broken path.**

The Puter path fails silently for users because `puter.ai.txt2img` requires a Puter.com account/session; without one it opens a blocked auth popup or the promise never resolves, so the click just spins. The `preview.$shareToken.tsx` route has no generate button at all — it's read-only — so the "elsewhere it works" is really the sidebar bulk button on the same page, which uses the working gateway path.

There is no reason to keep two different image backends. The fix is to route the per-section button through `/api/generate-images` for a single item, matching the bulk path.

### Bug 2 — Generating one section wipes another section's image

`handleGenerateRealImage` (line 349) rebuilds the whole image array from a memoized closure:

```ts
const next = images.map((i) =>
  i.sectionId === sectionId ? { ...i, realUrl: url, status: "real" } : i,
);
saveImages(conceptId, next);
```

`images` is captured from the render that started the request. `saveImages` in `src/lib/store.tsx` line 929 then does a **delete-all-then-reinsert** against `image_previews` for the concept's element row (`.delete().eq("element_id", elemId)` → `.insert(rows)`). Two consequences:

1. **Race between concurrent per-section clicks:** if section A is still generating when B finishes, B writes its stale snapshot (with A pre-update) and overwrites A's just-saved `realUrl`. Same on the DB (last delete-insert wins).
2. **Race with the bulk "Generate images" button:** it also calls `saveImages(conceptId, data.previews)` with a fresh Gateway response and clobbers per-section `realUrl`s already saved.

So it's both: the client state slot is per-concept (not per-section) and the DB write is a full replace. Nothing is actually keyed per section id at the write level.

## Fix plan

Frontend-only changes; no schema changes.

1. **Unify the per-section trigger with the gateway path.**
   In `src/routes/app.project.$projectId.concept.$conceptId.tsx`, rewrite `handleGenerateRealImage(sectionId)` to POST a single-item payload to `/api/generate-images` (same shape as `handleGenerateImages`, `items: [{ sectionId, imagePrompt, imageStyle, imageMode, negativePrompt }]`) instead of calling `generateRealImage` from `@/lib/puter`. Use the returned `previews[0].previewUrl` as the section's `realUrl`, set `status: "real"`. Drop the `generateRealImage` import and the unused `referenceImagesForReal` shim.

2. **Make the save merge per-section instead of replacing the array.**
   Add `updateImageForSection(conceptId, sectionId, patch)` to `src/lib/store.tsx`. It should:
   - Read the latest images from `dataRef.current.images[conceptId]` (not a stale closure), apply the patch to the matching `sectionId` (insert if missing), setState, and bump.
   - On the DB side, `upsert` a single `image_previews` row keyed by `(element_id, metadata->>sectionId)` — or simpler and safe: `delete().eq("element_id", elemId).eq("metadata->>sectionId", sectionId)` then insert just that one row. This removes the full delete-and-reinsert that causes cross-section wipes.
   Use this new function inside `handleGenerateRealImage` (success and failure branches).

3. **Keep the existing `saveImages` for the bulk "Generate images" flow**, but before writing, merge the incoming previews with any existing entries that already have `realUrl` / `status === "real"` so the bulk regen doesn't blow away per-section real images. Concretely: for each incoming preview, if the current stored entry for that `sectionId` has `realUrl`, preserve `realUrl` and `status: "real"` on the merged object.

4. **Guard against concurrent clicks on the same section** (defense in depth): the button is already `disabled={!!realGenerating[s.id]}`; keep that. No further concurrency lock needed once each write is per-section.

5. **Remove `src/lib/puter.ts` usage** from the concept route. Leaving the file in place is fine; it's just no longer imported here. No change to `/api/generate-images` server route — it already accepts a single-item `items` array and writes each result independently.

### Technical notes

- No changes to `SectionRenderer`, theme code, or preview route.
- No DB migration: `image_previews` already stores `metadata.sectionId`, which is what the new per-section delete/upsert filters on.
- After the fix, the per-section button will use the same Gemini path as the bulk button, so behavior (quality, timing, storage bucket, signed-URL TTL) is consistent between the two entry points.
