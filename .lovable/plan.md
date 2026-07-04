
## Context

- This app runs on Lovable Cloud (`yheixldvdvyyifricrqz`) and cannot be pointed at your external Supabase (`pzlmdculvdwcclcgxfso`) — the DB, auth, keys, and edge runtime are managed together.
- The 6 tables the app uses already exist here with RLS: `brands`, `projects`, `concepts`, `elements`, `image_previews`, `product_visual_profiles`.
- So we only need to move **rows**, remapping ownership to your Lovable Cloud user account.

## What you'll provide

From your Supabase dashboard (SQL editor → Download CSV, or Table Editor → Export CSV), export one CSV per table you want migrated:

1. `brands.csv`
2. `projects.csv`
3. `concepts.csv`
4. `elements.csv`
5. `image_previews.csv`
6. `product_visual_profiles.csv`

Upload them to chat. Also tell me the **email** of the Lovable Cloud account that should own all imported brands (sign up here first if you haven't).

## What I'll do

1. Sign in to Lovable Cloud with the email you gave me, look up its `auth.users.id`.
2. For each CSV, stage into a temp table via `psql \copy`, then insert into the real table while:
   - Rewriting `brands.user_id` → your Lovable Cloud user id (ignoring the old one).
   - Preserving original UUIDs so FK chains (brand → project → concept → element/image_preview) stay intact.
   - Skipping rows whose parent isn't in the imported set.
3. Verify counts per table and that RLS still lets you see them from the app.
4. Confirm your original Supabase project is untouched (read-only export on your end).

## Caveats

- If your source tables have columns this app's schema doesn't have, those columns are dropped.
- If your source has columns marked NOT NULL here but empty there, I'll flag those rows before importing.
- Storage/file assets in your Supabase Storage buckets aren't in scope for this plan — tell me if you also need those moved and I'll add a step.

Approve and I'll wait for the CSVs + owner email.
