## Part 1 — Editable placeholder content wired to `elements` table

### Current gap
- `SectionRenderer` + `Editable` already let users click-edit hero/section fields on the **preview surface**, but those writes go through `updateConceptSection` → `concepts.concept_data` in the DB. The `elements` table's `is_edited` flag is never set from user edits, and the right-side "Elements & visuals" rail (hero headline, subheadline, CTAs, global style, bullets) is completely static — no click-to-edit at all.
- `saveElements` currently sets `is_edited: true` unconditionally on **every** write, so it also flips true when the AI writes freshly generated elements. That means we can't distinguish user edits from machine writes.
- Bullets, feature-grid items, and comparison items in `SectionRenderer` render as plain text — not editable, no add/remove.
- No autosave, no debounce, no per-field error surface, no dot/"edited" indicator, and regenerate silently overwrites everything.

### Data model change
Widen `is_edited` from a single row-level boolean to a **per-field map** so we can preserve user edits on regenerate without asking about every field. Add one column on `elements`:

- `edited_fields jsonb NOT NULL DEFAULT '{}'::jsonb` — shape `{ "hero.headline": true, "sections.<sectionId>.body": true, "sections.<sectionId>.bullets.2": true, ... }`.

Keep the existing `is_edited boolean` as a coarse "any edit exists" flag for backwards compatibility; derive it from `edited_fields` on write.

Migration is a single ALTER TABLE — no data backfill needed.

### Store changes (`src/lib/store.tsx`)
- New action `updateElementField(conceptId, path, value)` — patches the in-memory `LandingPageElements`, marks `edited_fields[path] = true`, debounces (1.2s) a DB write to `elements` (`body_copy`, `edited_fields`, `is_edited = true`). Rejected writes bubble up via a `Promise` so the UI can render an inline error.
- New action `updateSectionBullets(conceptId, sectionId, bullets[])` — same path, marks `sections.<sectionId>.bullets` edited.
- `saveElements` (used by AI generation) stops force-setting `is_edited: true`. Instead: on regenerate it **merges** the AI result with any fields whose path is in `edited_fields`, so user-edited fields survive.
- Track `saveErrorByPath: Record<string,string>` so components can render per-field errors.

### UI changes
- New `EditableText` primitive built on top of the existing `Editable` — adds:
  - debounced autosave (1.2s idle) on top of the current blur-save,
  - a small `•` dot when `edited_fields[path]` is true,
  - an inline red `"Couldn't save — retry"` line when the store reports a failure for that path.
- New `EditableBullets` — list with per-bullet `EditableText`, "Add bullet" button, and "×" remove per row. Writes through `updateSectionBullets`.
- `SectionRenderer`: replace static bullet/items rendering in `benefit-strip`, `feature-grid`, `comparison`, `faq`, `details`, `social-proof.bullets` with `EditableBullets` / `EditableText` bound to element paths.
- Right-side rail in `app.project.$projectId.concept.$conceptId.tsx`: wrap `elements.hero.headline`, `subheadline`, `primaryCTA`, `secondaryCTA`, and each `globalStyle.*` line in `EditableText` bound to element paths.
- Every field with a live edit shows the "edited" dot; the coarse "Regenerate this concept" button (see Part 2) reads the count of edited fields and warns before overwriting.

### Regenerate-preserves-edits rule
- Concept regenerate (Part 2) and elements regenerate both call a shared `mergePreservingEdits(oldEls, newEls, editedFields)` that overlays user-edited paths from `oldEls` back onto `newEls`. If any user-edited field exists, show a confirm dialog: **"You have N edits. Keep them / Overwrite all."**

---

## Part 2 — Fix "Concept not found" after regenerate

### Root causes found
1. `const [regenerating, setRegenerating] = useState(false);` is declared **after** the early `return` on line 56 (`if (!project || !concept ...) return "Concept not found."`). This is a React Rules-of-Hooks violation: if the concept ever briefly disappears mid-render (e.g. between the client-side setState and the store rehydrating from Supabase), the hook order changes and React unmounts the tree — surfacing as the "Concept not found" screen and losing local state.
2. The regenerate handler updates state and clears local caches but never re-reads what the DB actually persisted. If the concepts upsert fails, in-memory state and the DB diverge; a later refresh reloads the DB and shows the old concept (or nothing if the delete-not-in clause raced).
3. The button doesn't disable strictly enough: it disables during the fetch, but a rapid double-click before `setRegenerating(true)` commits can fire twice. There is no navigation guard because current code doesn't navigate — but the perceived "navigated away to a not-found screen" is caused by cause #1, not by an actual navigation.

### Fix
- Move **all** hook declarations (`useState(regenerating)`, `useState(copied)`, `useMemo`s, etc.) above the early return so hook order is stable; keep the early return purely as a render guard.
- In `regenerate()`:
  - Guard entry with a ref (`isRegeneratingRef.current`) in addition to state so a double-click within the same tick is dropped.
  - Await the Supabase upsert (`saveConcepts` currently fires-and-forgets); expose an `awaitable` variant `saveConceptsAsync` that resolves only after the DB write succeeds, and re-select the row (`select().eq('id', concept.id).single()`) to confirm.
  - Only after confirmed success: apply `mergePreservingEdits` to elements, bump versions, toast success.
  - On failure: toast error, leave the in-memory concept exactly as it was before the call, do not clear the elements/images caches.
- The button stays disabled (with a `Regenerating…` label + spinner) for the full duration of `regenerate()` including the DB confirmation round-trip.
- Explicitly **do not navigate** — the URL/param already point at the stable `conceptId`, which we preserve.

### Explicit non-goals for this session
- No changes to `src/routes/api/generate-images.ts`, `src/lib/puter.ts`, the Gemini/Nano Banana pipeline, image reference upload flow, or the AI Gateway model constants.

---

## Files touched

- `supabase/migrations/<new>.sql` — add `edited_fields jsonb` to `elements`.
- `src/integrations/supabase/types.ts` — regenerated after migration.
- `src/lib/store.tsx` — `updateElementField`, `updateSectionBullets`, `saveConceptsAsync`, `mergePreservingEdits`, per-path error map; stop forcing `is_edited: true` in `saveElements`.
- `src/components/Editable.tsx` — add debounce + error slot + edited dot (kept back-compat).
- New `src/components/EditableBullets.tsx`.
- `src/components/SectionRenderer.tsx` — swap static bullets/items for editable variants; pass element-path prop.
- `src/routes/app.project.$projectId.concept.$conceptId.tsx` — hook order fix, hardened `regenerate()`, wrap rail fields in `EditableText`, wire confirm-on-overwrite dialog.

## Open question before I start

Autosave debounce is 1.2s idle by default. Do you want a hard "you have unsaved changes" indicator while the debounce is in flight, or is the transient state fine as long as saves land within ~1-2s?