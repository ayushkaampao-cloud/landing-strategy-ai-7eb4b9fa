## Goal
Add "Download everything" to the concept view's copy-actions column that packages every section image + a copy document into one zip.

## 1. Dependency

Add `jszip` (small, browser-safe, no native deps) via `bun add jszip`. Import as `import JSZip from "jszip"`.

## 2. New helper: `src/lib/downloadConceptZip.ts`

Pure client-side function `downloadConceptZip({ concept, images, project, workspace })` that:

- **Filename**: slugify `${workspace.name}-${project.projectName}-${concept.conceptName}-page.zip` (lowercase, non-alphanum → `-`, collapse dashes). Example: `qorfit-pulse-performance-page.zip`.
- **Copy document (`copy.md`)**: build markdown with:
  - Title `# {concept.conceptName}`, framework line, one-line strategy.
  - For each section in order: `## {NN}. {TYPE} — {title}` header, then highlight (`> …`), subtitle, body, bullets (`- …`), items (`- **title**: body`), and CTA (`**CTA:** …`). Same shape as the existing `fullText()` helper — reuse that logic.
  - Trailing "Skipped images" list if any downloads failed.
- **Images**: iterate sections in order; for each section with an image (checking `imageBySection` built the same way the view does — `realUrl || previewUrl`, skipping `placeholder`/`failed`/missing URLs), `fetch(url)` → `blob()`, name `NN-{sectionType-or-slug(title)}.{ext}` where `NN` is 2-digit index and `ext` derives from the blob's MIME (`image/png`→`png`, `image/jpeg`→`jpg`, `image/webp`→`webp`, fallback `png`). Wrap each fetch in try/catch; on failure push to a `skipped` array and keep going.
- Zip via JSZip → `generateAsync({ type: "blob" })` → programmatic `<a download>` click, then revoke the object URL.

Data URLs (some previews are base64) are handled by `fetch()` natively.

## 3. UI change: `src/routes/app.project.$projectId.concept.$conceptId.tsx`

In the "Copy actions" block, add a fourth button *after* "Copy full page content" and *before* "↻ Regenerate this concept":

```
[Download everything]         // idle
[Packaging {n}/{total}…]      // loading
```

- Local state: `downloading: boolean`, `dlProgress: {done, total} | null` updated by an optional `onProgress` callback in the helper.
- On click → `setDownloading(true)`; await helper; toast `"Downloaded"` or `"Some images couldn't be included"` if `skipped.length > 0`; toast `"Download failed"` on outright error; `finally setDownloading(false)`.
- Button disabled while downloading.

No changes to server code, DB, or existing copy/share flows.

## 4. Non-goals

- No zip for the shared preview route.
- No including of the underlying `elements.json` or per-section metadata — plain readable markdown only.
- No image regeneration if a section has no image; it's simply omitted from the zip (and listed under "Skipped images" only if a URL existed but the fetch failed, not if there was no image to begin with).

## Files touched
- **New**: `src/lib/downloadConceptZip.ts`
- **Edited**: `src/routes/app.project.$projectId.concept.$conceptId.tsx`, `package.json` (+ lockfile) via `bun add jszip`.