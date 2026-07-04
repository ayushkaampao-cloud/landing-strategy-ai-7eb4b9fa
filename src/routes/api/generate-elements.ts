import { createFileRoute } from "@tanstack/react-router";
import { callLLMJson } from "@/lib/ai/gateway";
import {
  buildVisualBrief,
  categoryGuidance,
  factsBlock,
  groundingPrefix,
  NO_FABRICATION_RULE,
  pickImageModeForSection,
  UNIVERSAL_NEGATIVE_PROMPT,
} from "@/lib/ai/prompts";
import type {
  ImageMode,
  LandingPageConcept,
  LandingPageElements,
  LandingPageElementsSection,
  ProjectClassification,
  ProjectResearch,
  ProductVisualProfile,
} from "@/types";

interface Body {
  concept: LandingPageConcept;
  workspace: { name: string; brandDescription: string; primaryAudience: string };
  product: { name: string; shortDescription: string; priceInfo: string };
  /** Optional — passed through from the client so elements are category-aware. */
  research?: ProjectResearch;
  classification?: ProjectClassification;
  /** Optional — the analyzed product-photo profile for this project. When
   *  present, its summaryText is prepended to every image prompt. */
  visualProfile?: ProductVisualProfile | null;
}


const ELEMENTS_SCHEMA = {
  type: "object",
  properties: {
    hero: {
      type: "object",
      properties: {
        headline: { type: "string" },
        subheadline: { type: "string" },
        primaryCTA: { type: "string" },
        secondaryCTA: { type: "string" },
        imagePrompts: { type: "array", items: { type: "string" } },
        visualDirection: { type: "string" },
        placeholder: { type: "boolean" },
      },
      required: ["headline", "subheadline", "primaryCTA", "imagePrompts", "visualDirection"],
      propertyOrdering: [
        "headline",
        "subheadline",
        "primaryCTA",
        "secondaryCTA",
        "imagePrompts",
        "visualDirection",
        "placeholder",
      ],
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sectionRef: { type: "string" },
          sectionType: { type: "string" },
          headline: { type: "string" },
          subheadline: { type: "string" },
          body: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          cta: { type: "string" },
          imagePrompts: { type: "array", items: { type: "string" } },
          visualDirection: { type: "string" },
          implementationNote: { type: "string" },
          placeholder: { type: "boolean" },
          proofNeeded: { type: "boolean" },
        },
        required: ["sectionRef", "sectionType", "headline"],
        propertyOrdering: [
          "sectionRef",
          "sectionType",
          "headline",
          "subheadline",
          "body",
          "bullets",
          "cta",
          "imagePrompts",
          "visualDirection",
          "implementationNote",
          "placeholder",
          "proofNeeded",
        ],
      },
    },
    globalStyle: {
      type: "object",
      properties: {
        designMood: { type: "string" },
        imageStyle: { type: "string" },
        colorMood: { type: "string" },
        typographyMood: { type: "string" },
        layoutMood: { type: "string" },
        brandSignalKeywords: { type: "array", items: { type: "string" } },
      },
      required: ["designMood", "imageStyle", "colorMood", "typographyMood", "layoutMood"],
      propertyOrdering: [
        "designMood",
        "imageStyle",
        "colorMood",
        "typographyMood",
        "layoutMood",
        "brandSignalKeywords",
      ],
    },
  },
  required: ["hero", "sections", "globalStyle"],
  propertyOrdering: ["hero", "sections", "globalStyle"],
};

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

        const cls = body.classification ?? body.research?.classification;
        try {
          const raw = await callLLMJson<{
            hero: LandingPageElements["hero"];
            sections: (Omit<LandingPageElementsSection, "sectionId"> & { sectionRef: string })[];
            globalStyle: LandingPageElements["globalStyle"];
          }>(buildPrompt(body, cls), {
            system:
              "You are a senior conversion copywriter and art director. Return ONLY valid JSON matching the schema. Category-aware, product-specific copy. Never fabricate proof; use labeled placeholders and set placeholder/proofNeeded flags.",
            temperature: 0.7,
            responseSchema: ELEMENTS_SCHEMA,
            schemaName: "LandingPageElements",
          });

          const sectionsInput = body.concept.schema.sections;
          const visualBrief = buildVisualBrief(
            body.workspace.name,
            body.product.name,
            cls,
            body.research,
          );

          const grounding = groundingPrefix(body.visualProfile?.summaryText);

          const sections: LandingPageElementsSection[] = (raw.sections ?? []).map((s, i) => {
            const match =
              sectionsInput.find((x) => x.type === (s.sectionType as string) || x.title === s.sectionRef) ??
              sectionsInput[i];
            const sectionType = match?.type ?? s.sectionType ?? "feature-grid";
            const imageMode: ImageMode = pickImageModeForSection(String(sectionType), cls, body.research);
            const imagePrompts = enrichPrompts(
              (s.imagePrompts ?? []).slice(0, 2),
              imageMode,
              visualBrief.brandName,
              body.product.name,
              grounding,
            );
            return {
              sectionId: match?.id ?? `s${i}`,
              sectionType,
              headline: s.headline ?? "",
              subheadline: s.subheadline,
              body: s.body,
              bullets: s.bullets,
              cta: s.cta,
              imagePrompts: imageMode === "no_image_needed" ? [] : imagePrompts,
              imageMode,
              negativePrompt: UNIVERSAL_NEGATIVE_PROMPT,
              visualDirection: s.visualDirection,
              implementationNote: s.implementationNote,
              placeholder: s.placeholder === true,
              proofNeeded: s.proofNeeded === true,
            };
          });

          const heroMode: ImageMode = pickImageModeForSection("hero", cls, body.research);
          const heroPrompts = enrichPrompts(
            (raw.hero?.imagePrompts ?? []).slice(0, 3),
            heroMode,
            visualBrief.brandName,
            body.product.name,
            grounding,
          );


          const elements: LandingPageElements = {
            conceptId: body.concept.id,
            hero: {
              ...raw.hero,
              imagePrompts: heroPrompts,
            },
            sections,
            globalStyle: raw.globalStyle,
            copyExportText: buildCopyExport(raw.hero, sections, body),
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

function enrichPrompts(
  prompts: string[],
  mode: ImageMode,
  brandName: string,
  productName: string,
): string[] {
  if (mode === "no_image_needed") return [];
  const modePrefix = MODE_PREFIX[mode] ?? "";
  return prompts.map((p) => {
    const base = (p || "").trim();
    return `[${mode}] ${modePrefix} ${base} — brand: ${brandName}, product: ${productName}. NEGATIVE: ${UNIVERSAL_NEGATIVE_PROMPT}`;
  });
}

const MODE_PREFIX: Record<ImageMode, string> = {
  interface_ui: "Stylized product UI panel, cropped, ghosted layers,",
  dashboard_closeup: "Close-up of a dashboard chart/table cell, cropped, clean,",
  comparison_graphic: "Side-by-side comparison layout, flat graphic style,",
  founder_story_editorial: "Editorial portrait or in-context photo, natural light,",
  product_packshot: "Studio product packshot, neutral surface, soft shadow,",
  product_in_use: "Product in real use context, honest photograph,",
  ingredient_macro: "Macro shot of an ingredient/material listed in the brief,",
  material_detail: "Close-up material or texture detail,",
  iconographic_brand_visual: "Simple iconographic brand visual, minimal geometric,",
  abstract_brand_texture: "Abstract brand texture, restrained palette, no imagery of objects,",
  quote_card_visual: "Typographic quote card composition, brand-neutral background,",
  data_visual_support: "Simple data visualization support graphic, flat, restrained,",
  no_image_needed: "",
};

function buildCopyExport(
  hero: LandingPageElements["hero"],
  sections: LandingPageElementsSection[],
  body: Body,
): string {
  const lines: string[] = [];
  lines.push(`# ${body.product.name} — ${body.concept.conceptName}`);
  lines.push(`Framework: ${body.concept.templateFamily}`);
  lines.push("");
  lines.push(`## HERO${hero.placeholder ? " [PLACEHOLDER — verify]" : ""}`);
  lines.push(`Headline: ${hero.headline}`);
  lines.push(`Subheadline: ${hero.subheadline}`);
  lines.push(`Primary CTA: ${hero.primaryCTA}`);
  if (hero.secondaryCTA) lines.push(`Secondary CTA: ${hero.secondaryCTA}`);
  lines.push(`Visual direction: ${hero.visualDirection}`);
  hero.imagePrompts.forEach((p) => lines.push(`  - image: ${p}`));
  lines.push("");
  sections.forEach((s, i) => {
    const tag = s.placeholder ? " [PLACEHOLDER — verify]" : s.proofNeeded ? " [PROOF NEEDED]" : "";
    lines.push(`## ${String(i + 1).padStart(2, "0")}. ${String(s.sectionType).toUpperCase()}${tag}`);
    lines.push(`Headline: ${s.headline}`);
    if (s.subheadline) lines.push(`Subheadline: ${s.subheadline}`);
    if (s.body) lines.push(`Body: ${s.body}`);
    if (s.bullets?.length) s.bullets.forEach((b) => lines.push(`  - ${b}`));
    if (s.cta) lines.push(`CTA: ${s.cta}`);
    if (s.imageMode && s.imageMode !== "no_image_needed") lines.push(`Image mode: ${s.imageMode}`);
    if (s.visualDirection) lines.push(`Visual direction: ${s.visualDirection}`);
    (s.imagePrompts ?? []).forEach((p) => lines.push(`  - image: ${p}`));
    if (s.implementationNote) lines.push(`Note: ${s.implementationNote}`);
    lines.push("");
  });
  return lines.join("\n");
}

function buildPrompt(body: Body, cls?: ProjectClassification): string {
  const outline = body.concept.schema.sections
    .map((s, i) => `${i + 1}. ${s.type} — ${s.title ?? "(no title)"}`)
    .join("\n");
  return [
    categoryGuidance(cls),
    ``,
    NO_FABRICATION_RULE,
    ``,
    `# TASK`,
    `Turn the following landing page concept into reusable copy + image-prompt elements.`,
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
    `# SECTION OUTLINE (${body.concept.schema.sections.length} sections — same order)`,
    outline,
    ``,
    factsBlock(body.research),
    ``,
    `# OUTPUT RULES`,
    `- One section object per outline section, same order, matching sectionType.`,
    `- Sharp, category-native copy — never generic filler.`,
    `- Image prompts: 1-2 per section, 2-3 for hero. Describe the SUBJECT (product/UI/etc.), setting, framing, lighting, and mood. NEVER prompt for random nature, mountains, oceans, fruit, or unrelated scenery. For b2b_saas/finance_software, prompts must depict UI/dashboards/abstract brand textures — not lifestyle scenes.`,
    `- Where a section calls for proof/reviews/press/metrics and no verified fact supports it, use placeholder copy ("Add real customer testimonial here", "Add verified metric here") and set placeholder + proofNeeded to true.`,
    `- copyExportText is built server-side — do NOT include it in your response.`,
    ``,
    `Return the JSON described in the schema. JSON only.`,
  ].join("\n");
}
