I understand the urgency. Based on the current code and live network evidence, this needs a rescue fix, not more trial-and-error generation.

Plan:

1. Fix the blank/placeholder copy issue
- The generated elements exist in the backend, but the preview is still rendering the original concept schema placeholders like “Add hero headline”.
- Wire saved `elements` back into the rendered section data before passing it to `SectionRenderer`.
- Map `elements.hero` into the hero section and each `elements.sections[sectionId]` into its matching page section so the real generated headline, body, bullets, CTA, and items appear on the page.
- Keep manual edits working by applying generated elements as display defaults, not replacing the whole concept-generation system.

2. Fix persistence after refresh
- Ensure newly created projects/concepts/elements are loaded and shown from the backend consistently after refresh.
- Preserve the existing backend-backed storage path; avoid local-only data.
- Make sure generated elements and images remain linked to the same concept id and are not lost when the page reloads.

3. Stop wasting credits on image retries
- Make bulk image generation skip sections with `imageMode: "no_image_needed"` and skip empty prompt arrays.
- If uploaded product images exist, use the uploaded product image for hero/product-shot sections immediately, without calling image AI.
- For other sections, keep existing generated images and only generate missing sections.

4. Fix per-section image rendering and saving
- Store and render each generated image independently by `sectionId`.
- Make single-section generation update only that section’s image row.
- Prevent bulk generation from deleting or overwriting images already generated for other sections.

5. Add useful failure messages without consuming credits
- If an AI route falls back locally or image generation fails, surface a clear status in the UI instead of silently leaving placeholder content.
- Keep local fallback content visible so the page is usable even if the AI provider is temporarily unavailable.

6. Verify the critical demo path
- Use the existing app flow only: open a concept, generate elements, confirm real copy appears in the preview, generate images, confirm hero uses uploaded image and section images persist after refresh.
- No extra model/provider experiments; keep credit usage minimal.