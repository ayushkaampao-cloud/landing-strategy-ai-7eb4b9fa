# Edit project screen

New route `/app/project/$projectId/edit` that lets the user update the brief and manage product photos, without touching already-generated concepts, elements, or images.

## Entry point

- Add an "Edit project" link/button to the project view (`src/routes/app.project.$projectId.index.tsx`) in the header area beside the project title. Uses the same `Link` styling as other secondary actions on that page.

## Fields (pre-filled)

All editable in one form, pre-filled from the current `Project` / `Workspace` values:

| Field | Backing column | Table |
|---|---|---|
| Brand description | `brands.description` | `brands` (workspace) |
| Product description | `projects.product_description` | `projects` |
| Key features | `projects.key_features` | `projects` |
| Key benefits | `projects.key_benefits` | `projects` |
| Goal | `projects.goal` (enum select) | `projects` |
| Tone | `projects.tone` | `projects` |
| Notes | `projects.notes` | `projects` |

On submit: single "Save changes" button. Writes go to `brands` (for brand description) and `projects` (for the rest) in parallel. Local store state is updated optimistically; toast on success / error. No auto-navigation — stay on the edit page so the user can also manage photos.

## Product photos

Second card on the same page:
- Reuse `<ProductImageUploader>` (already handles add/remove/reorder) seeded with `getProductImages(projectId)`.
- Local edit buffer; a "Save photos" button below the uploader commits changes. This keeps the analyze-images cost off every keystroke.
- On save:
  1. Persist via `saveProductImages(projectId, nextImages)` (already writes `product_visual_profiles.source_image_urls` + updates `productImageCount`).
  2. If the set changed (compare by id list), POST `/api/analyze-product-images` with the new set, then call `saveVisualProfile(projectId, data.profile)`. Show a "Re-analyzing photos…" inline spinner during the call.
  3. If the new set is empty, call `saveVisualProfile(projectId, null)` and skip the analyze fetch.
- Never blocks the brief-fields form; the two save buttons are independent.

## Store additions (`src/lib/store.tsx`)

Two new helpers (no schema change — projects table already has all columns; brands already has description):

- `updateProjectBrief(projectId, patch: Partial<Pick<Project, 'goal' | 'tone' | 'notes' | ...>> & { productDescription?; keyFeatures?; keyBenefits? })` — updates local `projects` + `products` arrays and issues `supabase.from('projects').update({...}).eq('id', projectId)` mapping camelCase → snake_case columns.
- `updateWorkspaceDescription(workspaceId, description)` — updates local `workspaces` and `supabase.from('brands').update({ description }).eq('id', workspaceId)`.

Both are optimistic with error toast + revert on failure (best-effort — matches existing store patterns which fire-and-forget most writes).

## Explicit non-goals

- No cascade to `concepts`, `elements`, or `image_previews` — those stay exactly as they are.
- No re-classification / re-research is triggered by brief edits (the next explicit "Regenerate" on a concept will pick up new values through the existing generation flow).
- The `themePalette` on `research.classification` is not recomputed here. If new photos change the dominant colors, the palette refreshes only when the user reruns research or a concept-level regenerate. Called out in a small helper note under the photos card so users know how to refresh the theme.

## Files touched

- New: `src/routes/app.project.$projectId.edit.tsx` — the form (two cards, two save buttons, uses TopBar + BackLink).
- Edit: `src/lib/store.tsx` — add `updateProjectBrief` and `updateWorkspaceDescription`; expose in the context value + hook return type.
- Edit: `src/routes/app.project.$projectId.index.tsx` — add "Edit project" link to the header area.

## Technical details

- Form state uses local `useState` per field, seeded once from the store snapshot in `useMemo` on mount, so store re-renders don't clobber user edits.
- Photo save uses the same `ProductImageRef[]` shape the create flow uses; `analyze-product-images` request body matches the existing call in `app.product.new.tsx`.
- Brief-fields save writes both tables (`brands`, `projects`) in `Promise.all`; failures surfaced individually.
- "Photos changed" check compares the sorted list of `image.id` values from stored vs. buffered arrays.
