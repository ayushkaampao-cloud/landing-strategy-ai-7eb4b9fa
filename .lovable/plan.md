Plan: Switch to Nano Banana 2 and source the grounding badge from a lightweight count

1. Answers to the two questions

   - Yes, the Lovable AI Gateway supports the newer Google image model. The exact model identifier to use is `google/gemini-3.1-flash-image` (Nano Banana 2). It is listed in the image generation catalog and is a direct replacement for the current `google/gemini-2.5-flash-image` in `src/routes/api/generate-images.ts`.

   - The existing request body in that route already uses the correct Gemini image-model shape: a `messages` array with `content` blocks and `modalities: ["image", "text"]`. So the only required change for the model swap is the model id string.

   - Yes, the grounding count can be sourced from a lightweight query. `product_visual_profiles.source_image_urls` is a JSONB array of uploaded photo metadata. The client can read a tiny generated column such as `image_count` instead of the full base64 payloads, so the badge count survives refresh without re-introducing the multi-megabyte payload that was removed.

2. Files to change

   a. Database migration
      - Add a generated column to `public.product_visual_profiles`:
        ```sql
        ALTER TABLE public.product_visual_profiles
          ADD COLUMN image_count INT
          GENERATED ALWAYS AS (jsonb_array_length(COALESCE(source_image_urls, '[]'::jsonb)))
          STORED;
        ```
      - No new RLS policies or GRANTs are needed because the existing policies on the table already cover the column.

   b. `src/lib/store.tsx`
      - Add `productImageCount: Record<string, number>` to the `AppData` shape.
      - In `loadUserData`, extend the `product_visual_profiles` select to include `image_count`:
        ```ts
        .select("id, project_id, profile, description, image_count")
        ```
      - Build a `productImageCount` map from the returned rows.
      - Expose `getProductImageCount: (projectId: string) => number` in the store context value.
      - Keep `productImages` for current-session uploads (the dataUrls are already in the client), but no longer rely on it after refresh.

   c. `src/routes/app.project.$projectId.concept.$conceptId.tsx`
      - Read `productImageCount = getProductImageCount(projectId)` and pass it to `GroundingBadge`:
        ```tsx
        <GroundingBadge count={productImageCount} hasProfile={!!visualProfile} />
        ```
      - For the client-side `generateRealImage` call, keep a lightweight reference signal (the function only checks whether `referenceImages.length > 0`). A single placeholder `ProductImageRef` when `productImageCount > 0` is enough to trigger the grounding prompt text.

   d. `src/routes/api/generate-images.ts`
      - Change the model constant:
        ```ts
        const GEMINI_IMAGE_MODEL = "google/gemini-3.1-flash-image";
        ```
      - Leave the rest of the body (messages, modalities, content blocks) unchanged because it is already the correct Gemini image-model shape.

3. Verification steps

   - Generate a concept image for one section and confirm the route still returns a valid image and a signed URL.
   - Refresh the concept page and confirm the grounding badge shows the correct number of uploaded reference images.
   - Confirm the browser no longer downloads multi-megabyte `source_image_urls` payloads on refresh.

4. Rollback

   - If the new model fails, revert `GEMINI_IMAGE_MODEL` back to `"google/gemini-2.5-flash-image"`. The grounding count changes are independent and can remain.