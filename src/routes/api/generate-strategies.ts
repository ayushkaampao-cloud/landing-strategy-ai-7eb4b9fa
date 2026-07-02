import { createFileRoute } from "@tanstack/react-router";
import { callLLMJson } from "@/lib/ai/gateway";
import type {
  LandingPageConcept,
  ProjectResearch,
  SectionProps,
  TemplateFamily,
} from "@/types";

const FRAMEWORKS: {
  family: TemplateFamily;
  sectionCount: string;
  sectionTypes: string;
  purpose: string;
  toneHint: string;
}[] = [
  {
    family: "Performance Page",
    sectionCount: "6-8",
    sectionTypes:
      "hero, benefit-strip, social-proof, feature-grid, offer, faq, cta",
    purpose:
      "Short punchy direct-response page for cold paid social. One promise, one CTA path.",
    toneHint: "direct, urgent, benefit-first",
  },
  {
    family: "A+ Product Story",
    sectionCount: "8-10",
    sectionTypes:
      "hero, story, feature-grid, lifestyle, feature-grid, social-proof, details, faq, cta",
    purpose:
      "Modular premium product storytelling — earns the price through craft and detail.",
    toneHint: "confident, tactile, premium",
  },
  {
    family: "Deep Conversion Page",
    sectionCount: "11-14",
    sectionTypes:
      "hero, problem-solution, story, feature-grid, feature-grid, comparison, social-proof, offer, guarantee, faq, cta",
    purpose:
      "Long-form sales page — mechanism, objection handling, repeated CTA rhythm.",
    toneHint: "authoritative, persuasive, methodical",
  },
  {
    family: "Brand Story Page",
    sectionCount: "8-10",
    sectionTypes:
      "hero, story, story, lifestyle, feature-grid, social-proof, faq, cta",
    purpose:
      "Narrative and identity-led — transformation, belief, community.",
    toneHint: "emotional, aspirational, warm",
  },
  {
    family: "Trust & Comparison Page",
    sectionCount: "8-10",
    sectionTypes:
      "hero, social-proof, benefit-strip, comparison, feature-grid, guarantee, faq, cta",
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
}

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
    ctaLabel?: string;
    notes?: string;
    imagePrompt?: string;
    imageStyle?: string;
    items?: { title: string; body: string }[];
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
          const results = await Promise.all(
            FRAMEWORKS.map((fw) => generateOne(fw, body)),
          );
          return Response.json({ concepts: results });
        } catch (err) {
          console.error("[strategies] error:", err);
          return Response.json(
            { error: (err as Error).message || "Strategy generation failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});

async function generateOne(
  fw: (typeof FRAMEWORKS)[number],
  body: Body,
): Promise<LandingPageConcept> {
  const prompt = buildPrompt(fw, body);
  const raw = await callLLMJson<ConceptFromLLM>(prompt, {
    system:
      "You are a senior conversion strategist for D2C ecommerce. Return ONLY valid JSON matching the requested schema. Write specific, category-aware copy that references the actual product, audience, and research provided. No generic filler. No markdown.",
    temperature: 0.85,
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
    imagePrompt: s.imagePrompt,
    imageStyle: s.imageStyle,
  }));

  const concept: LandingPageConcept = {
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
  return concept;
}

const VALID_TYPES = new Set([
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
  if (VALID_TYPES.has(clean)) return clean as SectionProps["type"];
  if (clean.includes("hero")) return "hero";
  if (clean.includes("faq")) return "faq";
  if (clean.includes("compar")) return "comparison";
  if (clean.includes("proof") || clean.includes("test") || clean.includes("review"))
    return "social-proof";
  if (clean.includes("offer") || clean.includes("price")) return "offer";
  if (clean.includes("guarantee")) return "guarantee";
  if (clean.includes("cta") || clean.includes("call")) return "cta";
  if (clean.includes("story") || clean.includes("origin")) return "story";
  if (clean.includes("life") || clean.includes("use")) return "lifestyle";
  if (clean.includes("problem")) return "problem-solution";
  if (clean.includes("benefit")) return "benefit-strip";
  if (clean.includes("spec") || clean.includes("detail")) return "details";
  return "feature-grid";
}

function buildPrompt(fw: (typeof FRAMEWORKS)[number], body: Body): string {
  return [
    `# TASK`,
    `Write ONE landing page concept for the "${fw.family}" framework.`,
    `Framework purpose: ${fw.purpose}`,
    `Target section count: ${fw.sectionCount}. Suggested section flow (pick and adapt from these types): ${fw.sectionTypes}`,
    `Tone: ${fw.toneHint}${body.project.tone ? ` — also honor the requested tone "${body.project.tone}"` : ""}.`,
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
    `Trust signals: ${body.research.trustSignals.join(" | ")}`,
    `Positioning ideas: ${body.research.positioningIdeas.join(" | ")}`,
    `Keywords: ${body.research.keywords.join(", ")}`,
    ``,
    `# OUTPUT SCHEMA (return ONLY this JSON object)`,
    `{
  "conceptName": string (short, distinctive — not generic),
  "oneLineStrategy": string (one sentence: the strategic bet this page makes),
  "bestTrafficType": string (one line — e.g. "Cold Meta paid social", "Google branded + review search"),
  "bestFor": string (who this page converts best),
  "whyThisWorks": string (2-3 sentences of strategic reasoning tied to the research),
  "risksOrLimits": string (1-2 sentences on where this framework can fail),
  "tone": string (2-4 adjectives),
  "sections": [
    {
      "type": one of: hero, benefit-strip, problem-solution, feature-grid, story, lifestyle, comparison, social-proof, faq, offer, guarantee, cta, details,
      "headline": string,
      "subheadline": string (optional),
      "body": string (optional; use for story/problem/lifestyle sections),
      "bullets": string[] (optional; use for benefit-strip or short lists),
      "items": [{"title": string, "body": string}] (optional; use for feature-grid, comparison, faq with 2-6 items),
      "ctaLabel": string (optional; hero/offer/cta),
      "notes": string (short strategic note explaining why this section exists),
      "imagePrompt": string (a specific visual prompt for the section image),
      "imageStyle": string (2-4 words on visual mood)
    }
  ]
}
Rules:
- Produce ${fw.sectionCount} sections, in a logical conversion order.
- Every section MUST have a real, specific headline referencing the product/audience.
- Use bullets/items where appropriate — do not stuff prose into bullets and vice versa.
- Sharp, category-specific copy. No "unlock your potential" style filler.
- JSON only. No markdown fences.`,
  ].join("\n");
}
