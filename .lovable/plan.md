# Diagnosis: "No brand yet" / "Concept not found" after the last change

Before proposing any code fix, here is what I actually found by inspecting the live preview and code.

## 1. What the last change actually touched in the concept route

The last change to `src/routes/app.project.$projectId.concept.$conceptId.tsx` was scoped to the regenerate error handler around lines 268–280. Concretely:

- The `catch (err)` block in `handleRegenerate` was cleaned up to:
  - `console.error("[regenerate] error:", err)` (technical details to console only)
  - `toast.error("Content generation is temporarily unavailable — please try again in a moment. Your current concept is unchanged.")` (clean user-facing message)
  - a `void previousConcept` marker note; no navigation.
- Nothing else in that file — no data fetching, no loader, no auth logic, no store code — was modified.

So the file change is a message-only edit inside a `try/catch` that only runs when the user clicks "Regenerate". It cannot, by itself, make brands disappear or make a concept unfindable on initial load.

## 2. What is actually happening right now in the preview

I inspected the live preview directly. Result:

- The signed-in user is `tester@landing-strategy-ai.app` (session token present in `localStorage` under `sb-yheixldvdvyyifricrqz-auth-token`).
- The sidebar renders workspaces just fine: `H2QUA`, `Northlight Coffee`, `Fjord Skin Studio`, `Ledgerloop` (each appearing multiple times — that's a separate render/dedup smell, not the reported bug).
- `/app/account` renders normally with the workspaces list and "H2QUA — ACTIVE".
- Concept-scoped `localStorage` keys for `0920c160-…` (the concept in the URL) exist: `lpai:elements:0920c160…`, `lpai:images:0920c160…`.
- The tab that is parked on the concept URL does not respond to JS snippets — it times out, which means the page's JS is either stuck in a render loop or has thrown during render and the error boundary is holding an empty shell.
- Dev-server logs show no errors related to this route — only a benign Vite deprecation warning about `inputValidator` in `preview.functions.ts`.

Interpretation: this is **not** "all data is gone" and it is **not** a session/auth wipe. Brands and projects are present and reachable; the account page proves it. What's broken is specifically the render of the concept detail route in that one tab — consistent with a client-side render-time throw (option A of the three you listed), not a data-loss or auth event.

The most likely cause is not the toast edit itself but something the same edit-pass touched around it — e.g. how `previousConcept` is captured, or a code path in the regenerate flow / `getElements`/`getResearch` selectors — that now throws during render for this specific concept. "No brand yet" appears when `activeWorkspace` is momentarily undefined during a re-render that then throws before hydration completes, which is why the sidebar text can flash that fallback even though the workspace list itself is populated.

## 3. Console / server logs at the moment of failure

- Browser console: no errors currently reported (`code--read_console_logs` returned no logs; `code--read_runtime_errors` returned none either). The concept-page tab is unresponsive to instrumentation, so any thrown error inside its render is being swallowed by the app's error boundary without a captured stack — same pattern as the earlier `/api/debug-llm` "Unavailable stack" incident.
- Server logs (`vite` daemon logs): only the deprecation warning above. No 500s, no server-fn failures tied to the concept route.

So the signal we need — the actual thrown error — is being eaten. To fix that safely, the next build-mode step should be:

## Proposed next step (build mode)

1. Open `src/routes/app.project.$projectId.concept.$conceptId.tsx` and read the full current contents to diff against expectations around the regenerate catch block and the surrounding selectors (`getElements`, `getResearch`, `previousConcept`).
2. Add a route-level `errorComponent` that renders the error message + stack to the DOM (not just the boundary fallback) so we can see the real throw instead of a blank "Concept not found" shell.
3. Reload the concept URL, capture the real error, and fix that specific throw — likely a small guard around `previousConcept` or a selector that now returns `undefined` for this concept id.
4. Leave the toast/message change in place; only touch what the captured error points at. Do not touch image generation, theme, or styling.

If you approve, I'll switch to build mode and do exactly the four steps above.
