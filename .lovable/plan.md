## Plan

1. **Stop data loss on refresh**
   - Make brand and project creation wait for the database save before navigating to the next screen.
   - If a save fails, show a clear error and keep the user on the form instead of silently continuing with local-only data.
   - This addresses the likely race where the project/profile/concepts are written before the brand/project row exists, causing security-policy failures and disappearing projects after refresh.

2. **Make product images persist reliably**
   - Change product image/profile saves to an awaited, single upsert-style save per project.
   - Ensure uploaded product photos and visual profiles are saved after the project exists, not in parallel with project creation.
   - Keep the current product-photo grounding behavior, but surface failures visibly instead of hiding them in console logs.

3. **Make strategy/content/element generation resilient**
   - Ensure research and concepts are persisted with awaited saves during the generation flow before navigating away.
   - Add a fallback for `/api/generate-elements` like the existing research/strategy fallback, so “Get elements” still produces usable section content when AI providers or credits are unavailable.
   - Avoid spending more generation credits during verification; validate with fallback paths and existing saved data.

4. **Fix image generation/display behavior**
   - Update the image generation route to use the dedicated image-generation endpoint with the correct Gemini/OpenAI body shape instead of the legacy chat endpoint for new image generation.
   - Preserve section-level storage: generating one section updates only that section’s image row, never deletes or overwrites other section images.
   - Keep uploaded product photos as the hero image after refresh, while other sections can use independently generated images/placeholders.

5. **Improve user-visible reliability**
   - Add “Saving…” / “Generating…” disabled states on the brand/product forms so users cannot submit twice during long saves.
   - Replace silent console-only persistence failures with toasts/messages that explain exactly what was not saved.
   - Keep scope focused on persistence, elements, and image generation — no copy-generation redesign.

## Technical notes

- The database policies themselves look ownership-based and reasonable; the observed failures are more likely caused by fire-and-forget writes and dependent writes racing ahead of their parent rows.
- The main files to change will be the store, brand/product creation routes, concept generation route, elements route, and image generation route.
- I will verify by checking that saved rows exist after creation and that refresh reloads brand, project, concepts, elements, and images.