import { createFileRoute } from "@tanstack/react-router";
import { callLLMJson } from "@/lib/ai/gateway";
import type {
  LandingPageConcept,
  LandingPageElements,
  LandingPageElementsSection,
} from "@/types";

interface Body {
  concept: LandingPageConcept;
  workspace: { name: string; brandDescription: string; primaryAudience: string };
  product: { name: string; shortDescription: string; priceInfo: string };
}

export const Route = createFileRoute("/api/generate-elements")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        try {
          const raw = await callLLMJson<{
            hero: LandingPageElements["hero"];
            sections: (Omit<LandingPageElementsSection, "sectionId"> & {
              sectionRef: string;
            })[];
            globalStyle: LandingPageElements["globalStyle"];
          }>(buildPrompt(body), {
            system:
              "You are a senior conversion copywriter and art director. Return ONLY valid JSON matching the schema. Write specific, product-aware copy — never filler.",
            temperature: 0.75,
          });

          const sectionsInput = body.concept.schema.sections;
          const sections: LandingPageElementsSection[] = (raw.sections ?? []).map(
            (s, i) => {
              const match =
                sectionsInput.find(
                  (x) =>
                    x.type === (s.sectionType as string) ||
                    x.title === s.sectionRef,
                ) ?? sectionsInput[i];
              return {
                sectionId: match?.id ?? `s${i}`,
                sectionType: match?.type ?? s.sectionType ?? "feature-grid",
                headline: s.headline ?? "",
                subheadline: s.subheadline,
                body: s.body,
                bullets: s.bullets,
                cta: s.cta,
                imagePrompts: Array.isArray(s.imagePrompts) ? s.imagePrompts.slice(0, 2) : [],
                visualDirection: s.visualDirection,
                implementationNote: s.implementationNote,
              };
            },
          );

          const copyExportText = buildCopyExport(raw.hero, sections, body);

          const elements: LandingPageElements = {
            conceptId: body.concept.id,
            hero: raw.hero,
            sections,
            globalStyle: raw.globalStyle,
            copyExportText,
            createdAt: new Date().toISOString(),
          };
          return Response.json(elements);
        } catch (err) {
          console.error("[elements] error:", err);
          return Response.json(
            { error: (err as Error).message || "Element generation failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});

function buildCopyExport(
  hero: LandingPageElements["hero"],
  sections: LandingPageElementsSection[],
  body: Body,
): string {
  const lines: string[] = [];
  lines.push(`# ${body.product.name} — ${body.concept.conceptName}`);
  lines.push(`Framework: ${body.concept.templateFamily}`);
  lines.push("");
  lines.push(`## HERO`);
  lines.push(`Headline: ${hero.headline}`);
  lines.push(`Subheadline: ${hero.subheadline}`);
  lines.push(`Primary CTA: ${hero.primaryCTA}`);
  if (hero.secondaryCTA) lines.push(`Secondary CTA: ${hero.secondaryCTA}`);
  lines.push(`Visual direction: ${hero.visualDirection}`);
  lines.push(`Image prompts:`);
  hero.imagePrompts.forEach((p) => lines.push(`  - ${p}`));
  lines.push("");
  sections.forEach((s, i) => {
    lines.push(`## ${String(i + 1).padStart(2, "0")}. ${String(s.sectionType).toUpperCase()}`);
    lines.push(`Headline: ${s.headline}`);
    if (s.subheadline) lines.push(`Subheadline: ${s.subheadline}`);
    if (s.body) lines.push(`Body: ${s.body}`);
    if (s.bullets?.length) {
      lines.push(`Bullets:`);
      s.bullets.forEach((b) => lines.push(`  - ${b}`));
    }
    if (s.cta) lines.push(`CTA: ${s.cta}`);
    if (s.visualDirection) lines.push(`Visual direction: ${s.visualDirection}`);
    if (s.imagePrompts?.length) {
      lines.push(`Image prompts:`);
      s.imagePrompts.forEach((p) => lines.push(`  - ${p}`));
    }
    if (s.implementationNote) lines.push(`Note: ${s.implementationNote}`);
    lines.push("");
  });
  return lines.join("\n");
}

function buildPrompt(body: Body): string {
  const outline = body.concept.schema.sections
    .map((s, i) => `${i + 1}. ${s.type} — ${s.title ?? "(no title)"}`)
    .join("\n");
  return [
    `# TASK`,
    `Turn the following landing page concept into reusable, copy-and-image elements. The page must be immediately usable in a page builder.`,
    ``,
    `# BRAND & PRODUCT`,
    `${body.workspace.name} · ${body.workspace.brandDescription}`,
    `Audience: ${body.workspace.primaryAudience}`,
    `Product: ${body.product.name} — ${body.product.shortDescription}`,
    `Price/offer: ${body.product.priceInfo}`,
    ``,
    `# CONCEPT`,
    `Framework: ${body.concept.templateFamily}`,
    `Concept: ${body.concept.conceptName}`,
    `Strategy: ${body.concept.oneLineStrategy}`,
    `Tone: ${body.concept.tone ?? ""}`,
    ``,
    `# SECTION OUTLINE (${body.concept.schema.sections.length} sections)`,
    outline,
    ``,
    `# OUTPUT`,
    `Return ONLY this JSON:`,
    `{
  "hero": {
    "headline": string,
    "subheadline": string,
    "primaryCTA": string,
    "secondaryCTA": string,
    "imagePrompts": string[] (2-3 specific prompts),
    "visualDirection": string (2 sentences on look/feel/composition)
  },
  "sections": [
    {
      "sectionRef": string (matches the section title above, or its type),
      "sectionType": string (same section type as outline),
      "headline": string,
      "subheadline": string (optional),
      "body": string (optional),
      "bullets": string[] (optional),
      "cta": string (optional),
      "imagePrompts": string[] (1-2 prompts),
      "visualDirection": string (1 sentence),
      "implementationNote": string (1 sentence for the builder — layout / behavior guidance)
    }
  ],
  "globalStyle": {
    "designMood": string,
    "imageStyle": string,
    "colorMood": string,
    "typographyMood": string,
    "layoutMood": string
  }
}
Rules:
- One section object per outline section, in the same order.
- Sharp, specific copy. Reference product features and audience concerns.
- Image prompts should be specific enough to give a designer or image model a strong brief.
- JSON only.`,
  ].join("\n");
}
