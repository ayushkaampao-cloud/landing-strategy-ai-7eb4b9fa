import { createFileRoute } from "@tanstack/react-router";
import { callLLMJson } from "@/lib/ai/gateway";
import { categoryGuidance, factsBlock, NO_FABRICATION_RULE } from "@/lib/ai/prompts";
import type {
  LandingPageConcept,
  ProjectClassification,
  ProjectResearch,
  SectionProps,
  TemplateFamily,
} from "@/types";

const FRAMEWORKS: {
  family: TemplateFamily;
  sectionCount: string;
  purpose: string;
  toneHint: string;
}[] = [
  {
    family: "Performance Page",
    sectionCount: "6-8",
    purpose:
      "Short punchy direct-response page for cold paid social. One promise, one CTA path.",
    toneHint: "direct, urgent, benefit-first",
  },
  {
    family: "A+ Product Story",
    sectionCount: "8-10",
    purpose:
      "Modular premium storytelling — earns the price/consideration through craft and detail.",
    toneHint: "confident, tactile, premium",
  },
  {
    family: "Deep Conversion Page",
    sectionCount: "11-14",
    purpose:
      "Long-form sales page — mechanism, objection handling, repeated CTA rhythm.",
    toneHint: "authoritative, persuasive, methodical",
  },
  {
    family: "Brand Story Page",
    sectionCount: "8-10",
    purpose:
      "Narrative and identity-led — transformation, belief, community.",
    toneHint: "emotional, aspirational, warm",
  },
  {
    family: "Trust & Comparison Page",
    sectionCount: "8-10",
    purpose:
      "Proof-first comparison page — designed to close a comparison shopper.",
    toneHint: "measured, honest, evidence-led",
  },
];

interface Body {
  projectId: string;
  workspace: {
    name: string;
    brandDescription: string;
    brandVoice: string[];
    primaryAudience: string;
  };
  product: {
    name: string;
    shortDescription: string;
    keyFeatures: string;
    keyBenefits: string;
    priceInfo: string;
  };
  project: {
    goal: string;
    tone?: string;
    desiredAngle?: string;
  };
  research: ProjectResearch;
  /** Optional: regenerate only one framework family. */
  onlyFamily?: TemplateFamily;
}

const CONCEPT_SCHEMA = {
  type: "object",
  properties: {
    conceptName: { type: "string" },
    oneLineStrategy: { type: "string" },
    bestTrafficType: { type: "string" },
    bestFor: { type: "string" },
    whyThisWorks: { type: "string" },
    risksOrLimits: { type: "string" },
    tone: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          headline: { type: "string" },
          subheadline: { type: "string" },
          body: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { title: { type: "string" }, body: { type: "string" } },
              required: ["title", "body"],
              propertyOrdering: ["title", "body"],
            },
          },
          ctaLabel: { type: "string" },
          notes: { type: "string" },
          placeholder: { type: "boolean" },
          proofNeeded: { type: "boolean" },
        },
        required: ["type", "headline"],
        propertyOrdering: [
          "type",
          "headline",
          "subheadline",
          "body",
          "bullets",
          "items",
          "ctaLabel",
          "notes",
          "placeholder",
          "proofNeeded",
        ],
      },
    },
  },
  required: [
    "conceptName",
    "oneLineStrategy",
    "bestTrafficType",
    "bestFor",
    "whyThisWorks",
    "risksOrLimits",
    "tone",
    "sections",
  ],
  propertyOrdering: [
    "conceptName",
    "oneLineStrategy",
    "bestTrafficType",
    "bestFor",
    "whyThisWorks",
    "risksOrLimits",
    "tone",
    "sections",
  ],
};

interface ConceptFromLLM {
  conceptName: string;
  oneLineStrategy: string;
  bestTrafficType: string;
  bestFor: string;
  whyThisWorks: string;
  risksOrLimits: string;
  tone: string;
  sections: {
    type: string;
    headline?: string;
    subheadline?: string;
    body?: string;
    bullets?: string[];
    items?: { title: string; body: string }[];
    ctaLabel?: string;
    notes?: string;
    placeholder?: boolean;
    proofNeeded?: boolean;
  }[];
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const Route = createFileRoute("/api/generate-strategies")({
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
          const families = body.onlyFamily
            ? FRAMEWORKS.filter((f) => f.family === body.onlyFamily)
            : FRAMEWORKS;
          const results = await Promise.all(
            families.map((fw) => generateOne(fw, body)),
          );
          return Response.json({ concepts: results });
        } catch (err) {
          console.error("[strategies] error:", err);
          // Return 200 with fallback flag so the client falls back to the
          // template generator without triggering the app-level error reporter.
          return Response.json({
            fallback: true,
            error: "Content generation is temporarily unavailable — please try again in a moment.",
          });
        }
      },
    },
  },
});

async function generateOne(
  fw: (typeof FRAMEWORKS)[number],
  body: Body,
): Promise<LandingPageConcept> {
  const raw = await callLLMJson<ConceptFromLLM>(buildPrompt(fw, body, body.research.classification), {
    system:
      "You are a senior conversion strategist. Return ONLY valid JSON matching the schema. Every headline must reference the specific product/audience/category. If a section would normally contain proof (reviews, ratings, press, metrics, guarantees) and no verified fact supports it, write a clearly labeled placeholder (e.g. 'Add real customer testimonial here') and set placeholder: true + proofNeeded: true. Never fabricate.",
    temperature: 0.8,
    responseSchema: CONCEPT_SCHEMA,
    schemaName: "LandingPageConcept",
  });

  const sections: SectionProps[] = (raw.sections ?? []).map((s) => ({
    id: uid(),
    type: normalizeType(s.type),
    title: s.headline,
    subtitle: s.subheadline,
    body: s.body,
    bullets: Array.isArray(s.bullets) ? s.bullets.slice(0, 6) : undefined,
    items: Array.isArray(s.items) ? s.items.slice(0, 6) : undefined,
    ctaLabel: s.ctaLabel,
    headline: s.headline,
    subheadline: s.subheadline,
    notes: s.notes,
    placeholder: s.placeholder === true,
    proofNeeded: s.proofNeeded === true,
  }));

  return {
    id: uid(),
    projectId: body.projectId,
    templateFamily: fw.family,
    frameworkType: fw.family,
    conceptName: raw.conceptName || `${fw.family} — ${body.product.name}`,
    oneLineStrategy: raw.oneLineStrategy || fw.purpose,
    bestTrafficType: raw.bestTrafficType || fw.toneHint,
    bestFor: raw.bestFor,
    whyThisWorks: raw.whyThisWorks,
    risksOrLimits: raw.risksOrLimits,
    tone: raw.tone,
    schema: {
      templateFamily: fw.family,
      conceptName: raw.conceptName || `${fw.family} — ${body.product.name}`,
      oneLineStrategy: raw.oneLineStrategy || fw.purpose,
      bestTrafficType: raw.bestTrafficType || fw.toneHint,
      sections,
    },
    researchSnapshot: body.research.summary,
    createdAt: new Date().toISOString(),
  };
}

const VALID_TYPES = new Set<SectionProps["type"]>([
  "hero",
  "benefit-strip",
  "problem-solution",
  "feature-grid",
  "story",
  "lifestyle",
  "comparison",
  "social-proof",
  "faq",
  "offer",
  "guarantee",
  "cta",
  "details",
]);

function normalizeType(t: string): SectionProps["type"] {
  const clean = (t || "").toLowerCase().replace(/_/g, "-").trim();
  if (VALID_TYPES.has(clean as SectionProps["type"])) return clean as SectionProps["type"];
  if (clean.includes("hero")) return "hero";
  if (clean.includes("faq")) return "faq";
  if (clean.includes("compar")) return "comparison";
  if (clean.includes("proof") || clean.includes("test") || clean.includes("review")) return "social-proof";
  if (clean.includes("offer") || clean.includes("price") || clean.includes("pricing")) return "offer";
  if (clean.includes("guarantee")) return "guarantee";
  if (clean.includes("cta") || clean.includes("call")) return "cta";
  if (clean.includes("story") || clean.includes("origin")) return "story";
  if (clean.includes("life") || clean.includes("use")) return "lifestyle";
  if (clean.includes("problem")) return "problem-solution";
  if (clean.includes("benefit")) return "benefit-strip";
  if (clean.includes("spec") || clean.includes("detail")) return "details";
  return "feature-grid";
}

function buildPrompt(
  fw: (typeof FRAMEWORKS)[number],
  body: Body,
  cls?: ProjectClassification,
): string {
  return [
    categoryGuidance(cls),
    ``,
    NO_FABRICATION_RULE,
    ``,
    `# TASK`,
    `Write ONE landing page concept for the "${fw.family}" framework.`,
    `Framework purpose: ${fw.purpose}`,
    `Target section count: ${fw.sectionCount}. Tone hint: ${fw.toneHint}${body.project.tone ? ` — honor the requested tone "${body.project.tone}"` : ""}.`,
    ``,
    `# BRAND`,
    `${body.workspace.name}: ${body.workspace.brandDescription}`,
    `Voice: ${body.workspace.brandVoice.join(", ")}`,
    `Audience: ${body.workspace.primaryAudience}`,
    ``,
    `# PRODUCT`,
    `${body.product.name}: ${body.product.shortDescription}`,
    `Features: ${body.product.keyFeatures}`,
    `Benefits: ${body.product.keyBenefits}`,
    `Price/offer: ${body.product.priceInfo}`,
    `Goal: ${body.project.goal}${body.project.desiredAngle ? ` · Desired angle: ${body.project.desiredAngle}` : ""}`,
    ``,
    `# RESEARCH`,
    `Summary: ${body.research.summary}`,
    `Competitor angles: ${body.research.competitorAngles.join(" | ")}`,
    `Objections: ${body.research.objections.join(" | ")}`,
    `Positioning ideas: ${body.research.positioningIdeas.join(" | ")}`,
    `Keywords: ${body.research.keywords.join(", ")}`,
    ``,
    factsBlock(body.research),
    ``,
    `# STRUCTURE RULES`,
    `- Produce ${fw.sectionCount} sections in a logical conversion order for the ${cls?.category ?? "product"} category.`,
    `- Section types must be one of: hero, benefit-strip, problem-solution, feature-grid, story, lifestyle, comparison, social-proof, faq, offer, guarantee, cta, details.`,
    `- For b2b_saas / finance_software / service_consulting: prefer feature-grid, comparison, problem-solution, faq, offer, cta. Use "lifestyle" only if it clearly means "in-context usage" (e.g. team using the product), not physical lifestyle.`,
    `- Sections needing proof (social-proof, guarantee, details with metrics, comparison with numbers) — if the underlying fact isn't in verifiedFacts, write placeholder copy and set placeholder + proofNeeded to true.`,
    `- Every headline must be specific to this product/audience — no generic filler like "unlock your potential" / "next generation".`,
    `- Use bullets/items where they help; do not stuff prose into bullets.`,
    ``,
    `Return the JSON object described in the schema. JSON only.`,
  ].join("\n");
}
