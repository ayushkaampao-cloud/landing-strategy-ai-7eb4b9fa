// Shared prompt fragments + tiny helpers used by every AI content route.
// Server-only (imported from route handlers).

import type {
  ImageMode,
  ProjectCategory,
  ProjectClassification,
  ProjectResearch,
  VisualIdentityBrief,
} from "@/types";

export const NO_FABRICATION_RULE = `HARD RULE — DO NOT INVENT FACTS.
Never invent: numeric ratings, review counts, review quotes, testimonials,
press or media mentions, awards, warehouse locations, shipping times or free-shipping
thresholds, return-rate or repeat-purchase percentages, guarantee terms,
certifications, third-party test results, or competitor claims / numbers.
If a piece of information is not present in verifiedFacts, output a clearly
labeled placeholder string like "Add verified metric here" or
"Add real customer testimonial here" and set placeholder: true (and
proofNeeded: true where relevant). Placeholder copy must be unambiguously
identifiable as a fill-in-the-blank — never write it as if it were true.`;

export const CATEGORY_LANGUAGE_RULES: Record<ProjectCategory, string> = {
  b2b_saas:
    "b2b_saas — Use workflow, ROI, team efficiency, risk reduction, integration, implementation, auditability, reporting, speed, control. Do NOT use skincare/packaging/ritual/formula/tactile language.",
  finance_software:
    "finance_software — Use compliance, auditability, reconciliation, month-end, controls, risk, reporting, ROI, integration. Do NOT use lifestyle/ritual/skincare/sensory language.",
  dtc_physical_product:
    "dtc_physical_product — Use material, build, use case, packaging, sensory detail, ritual — ONLY using facts provided. Do NOT use dashboard/ROI/integration/compliance language.",
  beauty_skincare:
    "beauty_skincare — Use formula, texture, feel, routine, skin-type, ritual — only using ingredients/claims actually provided. Do NOT use dashboard/ROI/workflow language.",
  service_consulting:
    "service_consulting — Use outcomes, process, transformation, credibility, case-study placeholders, objection handling. Do NOT invent client names, logos, or metrics.",
  hardware_device:
    "hardware_device — Use specs, durability, use-case scenarios, comparison to alternatives. Do NOT invent benchmark numbers.",
  food_beverage:
    "food_beverage — Use ingredient, taste, occasion, ritual — only using facts provided. Do NOT invent nutritional or sourcing claims.",
  other:
    "other — Match language to the actual product category described. Avoid category clichés from unrelated categories (no skincare language on software, no dashboard language on physical goods).",
};

export function categoryGuidance(cls?: ProjectClassification): string {
  const cat = cls?.category ?? "other";
  return `# CATEGORY & AUDIENCE
Category: ${cat}${cls?.subcategory ? ` (${cls.subcategory})` : ""}
Audience sophistication: ${cls?.audienceSophistication ?? "intermediate"}
Awareness level: ${cls?.awarenessLevel ?? "problem_aware"}
Tone: ${cls?.toneSummary ?? ""}

Language rule for this category: ${CATEGORY_LANGUAGE_RULES[cat]}
Use language, structure, and metaphors appropriate to the ${cat} category. Do not use language typical of a different product category.`;
}

export function factsBlock(research?: ProjectResearch): string {
  if (!research) return "";
  const facts = research.verifiedFacts ?? [];
  const forbidden = research.forbiddenClaims ?? [];
  return [
    `# VERIFIED FACTS (only these are true — anything else must be a labeled placeholder)`,
    facts.length ? facts.map((f) => `- ${f}`).join("\n") : "- (none provided)",
    ``,
    `# FORBIDDEN CLAIMS (do NOT invent these — use placeholders instead)`,
    forbidden.length ? forbidden.map((f) => `- ${f}`).join("\n") : "- (default: any specific metric, review, quote, or press mention)",
  ].join("\n");
}

// -------------------- Image mode helpers --------------------

const CATEGORY_PREFERRED: Record<ProjectCategory, ImageMode[]> = {
  b2b_saas: ["interface_ui", "dashboard_closeup", "comparison_graphic", "abstract_brand_texture", "iconographic_brand_visual", "data_visual_support"],
  finance_software: ["dashboard_closeup", "interface_ui", "data_visual_support", "comparison_graphic", "abstract_brand_texture"],
  dtc_physical_product: ["product_packshot", "product_in_use", "material_detail", "iconographic_brand_visual"],
  beauty_skincare: ["product_packshot", "ingredient_macro", "material_detail", "product_in_use"],
  service_consulting: ["founder_story_editorial", "quote_card_visual", "iconographic_brand_visual", "abstract_brand_texture"],
  hardware_device: ["product_packshot", "material_detail", "product_in_use", "comparison_graphic"],
  food_beverage: ["product_packshot", "ingredient_macro", "product_in_use"],
  other: ["iconographic_brand_visual", "abstract_brand_texture", "quote_card_visual"],
};

const CATEGORY_FORBIDDEN: Record<ProjectCategory, ImageMode[]> = {
  b2b_saas: ["product_packshot", "ingredient_macro", "material_detail", "product_in_use"],
  finance_software: ["product_packshot", "ingredient_macro", "material_detail", "product_in_use"],
  dtc_physical_product: ["interface_ui", "dashboard_closeup"],
  beauty_skincare: ["interface_ui", "dashboard_closeup"],
  service_consulting: ["interface_ui", "dashboard_closeup", "ingredient_macro"],
  hardware_device: ["ingredient_macro"],
  food_beverage: ["interface_ui", "dashboard_closeup"],
  other: [],
};

export function buildVisualBrief(
  brandName: string,
  productType: string,
  cls: ProjectClassification | undefined,
  research?: ProjectResearch,
): VisualIdentityBrief {
  const category = cls?.category ?? "other";
  const paletteHints = research?.imageStyleHints?.slice(0, 4) ?? [];
  return {
    brandName,
    category,
    productType,
    visualIntent: research?.toneSummary || cls?.toneSummary || "Clean, confident, category-native visuals.",
    preferredImageModes: CATEGORY_PREFERRED[category],
    forbiddenImageModes: [
      ...CATEGORY_FORBIDDEN[category],
      // Universal forbiddens: never nature/scenery/random stock for anyone.
    ],
    sceneSuggestions: research?.imageStyleHints ?? [],
    productPresentationStyle:
      category === "b2b_saas" || category === "finance_software"
        ? "In-product UI framing, cropped panels, ghosted layers"
        : "Clean composition, minimal props, product as hero",
    environmentStyle:
      category === "b2b_saas" || category === "finance_software"
        ? "Neutral studio / abstract gradient background"
        : "Neutral surface, honest lighting",
    lightingStyle: "Soft even light, no harsh shadows",
    compositionStyle: "Centered or rule-of-thirds, generous negative space",
    paletteHints: paletteHints.length ? paletteHints : ["neutral", "restrained", "brand-forward"],
    realismLevel:
      category === "b2b_saas" || category === "finance_software"
        ? "stylized-ui / abstract"
        : "photographic",
  };
}

export const UNIVERSAL_NEGATIVE_PROMPT =
  "no mountains, no oceans, no lakes, no beaches, no forests, no landscapes, no sunsets, no random nature, no fruit unless it is the product, no unrelated objects, no random people unless the product depicts people, no text in image, no watermark, no logo overlays, no irrelevant scenery, no stock-photo clichés";

export function pickImageModeForSection(
  sectionType: string,
  cls: ProjectClassification | undefined,
  research?: ProjectResearch,
): ImageMode {
  const cat = cls?.category ?? "other";
  const hasProductFacts = (research?.verifiedFacts?.length ?? 0) > 2;
  const isSaaS = cat === "b2b_saas" || cat === "finance_software";
  const t = sectionType.toLowerCase();
  if (t === "hero") return isSaaS ? "interface_ui" : hasProductFacts ? "product_packshot" : "iconographic_brand_visual";
  if (t === "feature-grid") return isSaaS ? "dashboard_closeup" : "material_detail";
  if (t === "comparison") return "comparison_graphic";
  if (t === "social-proof") return "quote_card_visual";
  if (t === "story") return "founder_story_editorial";
  if (t === "lifestyle") return isSaaS ? "abstract_brand_texture" : "product_in_use";
  if (t === "details") return isSaaS ? "data_visual_support" : "material_detail";
  if (t === "guarantee" || t === "faq" || t === "cta" || t === "offer") return "iconographic_brand_visual";
  if (t === "problem-solution") return "abstract_brand_texture";
  if (t === "benefit-strip") return "no_image_needed";
  return isSaaS ? "abstract_brand_texture" : "iconographic_brand_visual";
}

// Image generation is handled server-side via /api/generate-images, which
// calls the Lovable AI Gateway (Gemini image model) and stores results in
// Lovable Cloud storage. No client-side URL builder is needed.



/**
 * Grounding prefix used on every image prompt when we have a description of
 * the user's uploaded product photos. Downstream generators receive an image
 * prompt that starts by pinning the exact visible product.
 */
export function groundingPrefix(profileSummary?: string | null): string {
  const s = (profileSummary || "").trim();
  if (!s) return "";
  return `Product must visually match this exact description: ${s}. `;
}

