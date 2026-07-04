## What's happening

The last change swapped image generation to Gemini via the Lovable AI Gateway and made `/api/generate-images` do a server-side read of `product_visual_profiles.source_image_urls`. Two side effects of that turn are the most plausible causes of the "blank screen + lost brand/project on refresh":

### 1. Concept page can throw during render, tripping the root `errorComponent`

`src/routes/app.project.$projectId.concept.$conceptId.tsx` now reads `img.previewUrl` unconditionally:

```
src={ (img.realUrl ?? img.previewUrl) +
      (imgRetry[s.id] ? (img.previewUrl.includes("?") ? "&" : "?") + `_r=…` : "") }
```

For rows produced by the new pipeline, `previewUrl` can be an empty string (failed generation → status `"failed"`, no URL). That path is fine. But the `saveImages` DB round-trip stores `preview_url` as-is, so on refresh `row.preview_url` can be `""` or `null` and `imgFailed[s.id]` starts `false` — the `<img>` renders with `src=""`, which many browsers request as the page URL itself and fires `onerror`; the retry button then re-runs the `.includes` branch. This is not blank-screen-worthy on its own, but combined with #2 it produces the observed cascade.

More importantly, the same file now depends on `productImages`/`visualProfile` being loaded before render (`GroundingBadge`, VisualProfileSummary, `handleGenerateRealImage`). If the initial store load for `product_visual_profiles` throws (see #2), the concept page mounts with `useStore()` throwing / undefined and React unmounts into `ErrorComponent`, which shows the generic "This page didn't load" screen — the user perceives this as "everything is gone".

### 2. `product_visual_profiles.source_image_urls` is now pulled on every page load and can be huge

`loadUserData` in `src/lib/store.tsx` does `supabase.from("product_visual_profiles").select("*")` for every project. That column is `jsonb` and now holds full `dataUrl` base64 payloads for up to N uploaded product photos (used by the new Gemini reference-image path in `/api/generate-images`). On refresh:

- The response can be multi-megabyte per project; PostgREST/Supabase can time out or return an error.
- The parsed JSON is held in React state as `productImages` — memory spike + slow hydrate.
- If the query errors, `loadUserData` currently swallows via optional chaining and sets `productImages: {}`, but if a *later* step (e.g. `.in("project_id", projectIds)` with a very long response) fails, `setData(...)` is never reached and `loaded` stays false → the AppShell shows "Loading…" forever, indistinguishable from "blank".

Nothing in the store or `AppShell` changed to cause this — the new dependency on base64 references in the DB is what made an already-fat column load-blocking.

### 3. Did the change touch brand/project/concept data loading?

Not directly — `src/lib/store.tsx` `loadUserData` wasn't edited in the image-gen turn. The indirect coupling is through `product_visual_profiles`, which is queried in the same initial load and now carries the heavy reference-image payload used by the new Gemini flow.

## Minimal fix (image-related code only)

Do not touch `loadUserData`, brand/project fetching, or concept persistence. Fix only what the image-generation change introduced.

1. **Stop loading base64 reference images into the client.** In `loadUserData` in `src/lib/store.tsx`, change the `product_visual_profiles` select to explicit columns and drop `source_image_urls` from the client fetch (server-side `/api/generate-images` still reads it via `supabaseAdmin` — that path is unchanged). Keep `productImages` in state derived from a lighter `ProductImageRef` shape (id + optional thumbnail URL), or leave it empty on load and only rehydrate on demand.

2. **Guard the concept page against empty preview URLs.** In `src/routes/app.project.$projectId.concept.$conceptId.tsx`, treat `!img.previewUrl && !img.realUrl && img.status !== "placeholder"` as the "failed" branch (retry UI), instead of trying to render `<img src="">`. This prevents the render-time exception that trips `ErrorComponent`.

3. **Never write empty strings to `image_previews.preview_url`.** In `/api/generate-images`, when `status === "failed"`, return `previewUrl: null` (and adjust the type). The client's `saveImages` should then persist `null`, and the load path already tolerates it.

That's it — three surgical edits. No changes to brand/project/concept loading, saving, auth, or the store's persistence logic; no changes to the copy-generation pipeline.

## Technical details

- Files to touch: `src/lib/store.tsx` (single select statement in `loadUserData`), `src/routes/app.project.$projectId.concept.$conceptId.tsx` (image render branch), `src/routes/api/generate-images.ts` (`failed` return shape). Type touch-up in `src/types.ts` if `previewUrl` is not already `string | null`.
- Verification: after edits, refresh the concept page cold — brand/project/concept must appear from the DB, and a section whose image failed must show the "Retry" state instead of blanking the route.
- Out of scope: hydration `data-tsd-source` warning in the console (dev-only, unrelated), the AI copy generation pipeline, storage RLS policies added earlier.