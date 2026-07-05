## Goal
Let a user share a read-only public preview of a single concept via an unguessable link, and revoke it.

## 1. Database migration

Add sharing to `concepts` and expose a token-gated read path.

- `ALTER TABLE public.concepts ADD COLUMN share_token uuid UNIQUE` (nullable).
- Create a `SECURITY DEFINER` function `public.get_shared_concept(_token uuid)` returning JSON with:
  - the concept row (all display fields),
  - the matching `elements` row (if any),
  - the matching `image_previews` rows (without `source_image_urls`).
  It looks up the concept by `share_token = _token AND share_token IS NOT NULL`, then joins children by `concept_id`. Returns `NULL` if no match. `SET search_path = public`.
- `GRANT EXECUTE ON FUNCTION public.get_shared_concept(uuid) TO anon, authenticated`.
- Do **not** add any anon SELECT policy on `concepts`, `elements`, or `image_previews`. All public access flows exclusively through this function, which cannot leak other rows (it filters by token in its own body).

Rationale: token-scoped RLS with joins across three tables is fragile; a definer function with an explicit `WHERE share_token = _token` guarantees the public path can only ever return the one concept and its children.

## 2. Store additions (`src/lib/store.tsx`)

- `enableConceptShare(conceptId): Promise<string>` — if the concept already has `share_token`, return it; else generate a UUID (`crypto.randomUUID()`), update the row in Supabase, update local `concepts[]`, return the token.
- `disableConceptShare(conceptId): Promise<void>` — set `share_token = null` in DB, mirror in local state.
- Extend `LandingPageConcept` type with optional `shareToken?: string | null` and map `share_token` in the initial load selector.

## 3. Concept view UI (`src/routes/app.project.$projectId.concept.$conceptId.tsx`)

Add a small share control cluster in the concept header (near existing action buttons):

- If `concept.shareToken` is null: **"Share preview"** button → calls `enableConceptShare`, then copies `${window.location.origin}/preview/{token}` to clipboard, toast `"Share link copied"`.
- If already shared: show **"Copy link"** and **"Disable link"** buttons.
  - Copy link → clipboard + toast `"Link copied"`.
  - Disable link → `ConfirmDeleteDialog`-style confirmation ("Disable this share link? The public preview will stop working."), then `disableConceptShare`, toast `"Share link disabled"`.

No other UI changes; owner view stays fully editable.

## 4. Public preview route (`src/routes/preview.$shareToken.tsx`)

New top-level public route (SSR on, no auth gate, not under `_authenticated`).

- Uses a **public server function** `getSharedConcept({ token })` that:
  - Builds a Supabase publishable-key client inline (per `tanstack-supabase-integration`).
  - Calls `supabase.rpc("get_shared_concept", { _token: token })`.
  - Returns `{ concept, elements, images } | null`.
  - No `requireSupabaseAuth`, no `supabaseAdmin`.
- Loader calls the server fn via `ensureQueryData`; component uses `useSuspenseQuery`.
- If result is `null` → render a clean centered page: **"This preview is no longer available."** (200, not an error). Also set `head()` `robots: noindex, nofollow` and a generic title.
- If result exists → reuse `SectionRenderer` + palette resolution from the current concept view to render sections, hero, elements, and image previews in **read-only** mode. No edit toolbar, no regeneration buttons, no "back to project" link, no brand/project names beyond what the concept itself contains (`concept.conceptName`). Add a tiny "Made with …" footer only if trivial; otherwise omit.
- `head()` sets `title = concept.conceptName`, description from `oneLineStrategy`, `robots: noindex` (share links shouldn't be indexed), and og:title/description mirrored.

## 5. Security invariants

- Anon role has **no** direct SELECT on `concepts`, `elements`, `image_previews`.
- Only path for anonymous reads is `get_shared_concept(uuid)`, which returns exactly one concept + its own children or `NULL`.
- Revoking = `share_token = NULL`; RPC then returns `NULL` and route shows the "no longer available" message.
- Token is `uuid` (122 bits of entropy), `UNIQUE`.

## Non-goals

- No changes to generation logic, classification, or existing owner-only routes.
- No listing of shared links elsewhere in the app.
- No expiring tokens, no per-view analytics.

## Files touched

- **New migration**: adds `share_token` column + `get_shared_concept` function + grants.
- **New**: `src/routes/preview.$shareToken.tsx`, `src/lib/preview.functions.ts` (server fn).
- **Edited**: `src/lib/store.tsx`, `src/routes/app.project.$projectId.concept.$conceptId.tsx`, `src/types.ts`.