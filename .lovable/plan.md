# Delete flow + persistent back navigation

## 1. Store: async, error-surfacing deletes

`src/lib/store.tsx` — change `deleteProject` and `deleteWorkspace` to `Promise<void>`, awaiting the DB call BEFORE removing local state. On DB error, throw and leave in-memory state untouched so the row stays visible. Update the interface types accordingly.

Cascades already handle child rows: `concepts → projects → brands`, `elements → concepts`, `image_previews → elements`, `product_visual_profiles → projects`. So a single `.delete()` on `projects` or `brands` is enough.

## 2. Confirmation dialog

New tiny helper component `src/components/ConfirmDeleteDialog.tsx` wrapping shadcn `AlertDialog`:

- Props: `open`, `onOpenChange`, `entity` ("brand" | "project"), `name`, `onConfirm: () => Promise<void>`.
- Body text (exact): `Delete "{name}" and all its concepts, elements, and images? This can't be undone.`
- "Cancel" (secondary) + "Delete" (destructive) buttons. Delete button shows loading spinner while `onConfirm` runs; if it throws, dialog stays open, `toast.error(...)` fires.

## 3. Wire delete buttons

- **`src/routes/app.projects.tsx`** — replace both `window.confirm` calls (brand delete + per-project delete) with `<ConfirmDeleteDialog>` state. On success:
  - Project delete → toast "Project deleted." (stay on page, list refreshes automatically).
  - Brand delete → toast "Brand deleted." then `navigate({ to: "/app" })`.

- **`src/routes/app.project.$projectId.index.tsx`** — add a "Delete project" button in the header (next to "Edit project"). On confirm: delete, toast "Project deleted.", `navigate({ to: "/app/projects" })` (the brand's project list — this route already scopes to `activeWorkspace`, which is this project's workspace).

  To ensure the deleted project's workspace is the active one when we land, call `setActiveWorkspace(project.workspaceId)` before navigating.

## 4. Persistent back links (concept view = concept + elements)

Elements are rendered inside the concept route, so this covers both.

- **Concept route header** already has `← All 5 concepts` linked to `/app/project/$projectId` with `params={{ projectId }}` from `Route.useParams()`. Keep as-is but promote it to a first-class breadcrumb: two links rendered as `{brandName} / {projectName} / ← Back to project`, all using real IDs (`project.workspaceId`, `projectId`) and TanStack `<Link>` (not `history.back()`), so refresh and deep links work.
  - `{brandName}` → `to="/app/projects"` with `setActiveWorkspace(project.workspaceId)` on click (an inline handler in a small wrapper `<Link>`).
  - `{projectName}` → `to="/app/project/$projectId"`, `params={{ projectId }}`.

- **`src/routes/app.project.$projectId.index.tsx`** — add the same breadcrumb (`{brandName} /`) at the top pointing to `/app/projects` (brand's project list), for the project → brand hop.

- **`src/routes/app.project.$projectId.edit.tsx`** — already has "← Back to project" using params; keep unchanged.

## 5. Non-goals

- No new DB migration (cascades already exist).
- No changes to concept/element regeneration logic.
- Back navigation never reads `window.history`; every hop is a typed `<Link>` with the parent's ID from route params or the in-memory record.

## Files touched

- Edit: `src/lib/store.tsx` (async deletes + interface).
- Edit: `src/routes/app.projects.tsx` (dialog wiring; no window.confirm; brand-delete redirect).
- Edit: `src/routes/app.project.$projectId.index.tsx` (Delete button, breadcrumb).
- Edit: `src/routes/app.project.$projectId.concept.$conceptId.tsx` (breadcrumb).
- New: `src/components/ConfirmDeleteDialog.tsx`.
