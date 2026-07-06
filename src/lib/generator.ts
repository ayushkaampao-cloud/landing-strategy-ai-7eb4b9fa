// Thin last-resort fallback + UI metadata for the 5 framework families.
// The real content pipeline lives in the /api/* routes (classify → research →
// strategies → elements → images). Everything below is used only:
//   1) to render framework metadata in the concept UI (FRAMEWORK_META).
//   2) if the entire AI gateway chain fails, so the app doesn't dead-end.
// It NEVER fabricates proof (reviews, ratings, press, guarantees, metrics) —
// every section is a labeled placeholder the user must fill in.

import type {
  LandingPageConcept,
  LandingPageSchema,
  Product,
  Project,
  SectionProps,
  SectionType,
  TemplateFamily,
  Workspace,
} from "@/types";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const TEMPLATE_FAMILIES: TemplateFamily[] = [
  "Performance Page",
  "A+ Product Story",
  "Deep Conversion Page",
  "Brand Story Page",
  "Trust & Comparison Page",
];

export interface FrameworkMeta {
  code: string;
  tagline: string;
  bestFor: string;
  bestTraffic: string;
  accentClass: string;
  accentDot: string;
  length: "Short" | "Medium" | "Long" | "Modular";
  conceptName: (p: Product, ws: Workspace) => string;
  oneLine: (p: Product, ws: Workspace) => string;
}

export const FRAMEWORK_META: Record<TemplateFamily, FrameworkMeta> = {
  "Performance Page": {
    code: "P-01",
    tagline: "Direct response. Short. Built for a cold click.",
    bestFor: "Cold paid social — one hook, one offer, one CTA.",
    bestTraffic: "Cold paid (Meta / TikTok)",
    accentClass: "from-orange-500/15 to-orange-500/0 text-orange-600 border-orange-500/30",
    accentDot: "bg-orange-500",
    length: "Short",
    conceptName: (p) => `Fast Funnel — ${p.name}`,
    oneLine: (p) =>
      `Short direct-response page for ${p.name} — one promise, one CTA, minimal friction.`,
  },
  "A+ Product Story": {
    code: "A-02",
    tagline: "Modular product detail. Premium, spec-forward.",
    bestFor: "PDP replacement for high-consideration SKUs.",
    bestTraffic: "Direct, organic, referral",
    accentClass: "from-neutral-900/10 to-neutral-900/0 text-neutral-800 border-neutral-900/30",
    accentDot: "bg-neutral-900",
    length: "Modular",
    conceptName: (p) => `${p.name} — The Object`,
    oneLine: (p) =>
      `Modular product story for ${p.name} that earns consideration through detail rather than discount.`,
  },
  "Deep Conversion Page": {
    code: "D-03",
    tagline: "Long-form persuasion. Every objection, in order.",
    bestFor: "Considered purchases where the buyer is comparing hard.",
    bestTraffic: "Search, email, retargeting",
    accentClass: "from-blue-500/15 to-blue-500/0 text-blue-700 border-blue-500/30",
    accentDot: "bg-blue-600",
    length: "Long",
    conceptName: (p) => `The Case For ${p.name}`,
    oneLine: (p) =>
      `Long-form sales page for ${p.name} — mechanism, objections, repeated CTA rhythm.`,
  },
  "Brand Story Page": {
    code: "B-04",
    tagline: "Narrative-first. Belief before benefits.",
    bestFor: "Retargeting warm audiences and identity-led categories.",
    bestTraffic: "Retargeting, community, PR",
    accentClass: "from-amber-500/15 to-amber-500/0 text-amber-700 border-amber-500/30",
    accentDot: "bg-amber-500",
    length: "Medium",
    conceptName: (_p, ws) => `Why ${ws?.name ?? "We"} Exists`,
    oneLine: (_p, ws) =>
      `Identity-led narrative for ${ws.name} — earns loyalty before it asks for the sale.`,
  },
  "Trust & Comparison Page": {
    code: "T-05",
    tagline: "Proof-stack + comparison grid. Closes the switcher.",
    bestFor: "Bottom-funnel, competitor traffic, review-driven categories.",
    bestTraffic: "Competitor search, review sites",
    accentClass: "from-emerald-500/15 to-emerald-500/0 text-emerald-700 border-emerald-500/30",
    accentDot: "bg-emerald-500",
    length: "Medium",
    conceptName: (p) => `${p.name} vs. Everything Else`,
    oneLine: (p) =>
      `Comparison-first page for ${p.name} against category alternatives on criteria buyers actually check.`,
  },
};

// ---------------------------------------------------------------------------
// LAST-RESORT FALLBACK — used only when the AI gateway fails end-to-end.
// Emits placeholder-only sections. No fabricated proof, ratings, reviews,
// press, guarantees, warehouse locations, shipping claims, or metrics.
// ---------------------------------------------------------------------------

const P = "Add verified proof here before publishing.";

function splitInput(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n|·|•|\||;/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function sentence(value: string | undefined, fallback: string): string {
  const clean = (value ?? "").trim();
  return clean || fallback;
}

function benefitLine(p: Product): string {
  return splitInput(p.keyBenefits)[0] ?? sentence(p.shortDescription, "make the buying decision clearer and easier");
}

function featureItems(p: Product): { title: string; body: string }[] {
  const features = splitInput(p.keyFeatures);
  const benefits = splitInput(p.keyBenefits);
  const source = features.length > 0 ? features : benefits;
  if (source.length === 0) {
    return [
      { title: "Clear product value", body: sentence(p.shortDescription, `${p.name} gives buyers a focused reason to choose you.`) },
      { title: "Built around the use case", body: "Position the product around the real job your buyer is trying to get done." },
      { title: "Lower-friction decision", body: "Answer the practical questions buyers need resolved before they click." },
    ];
  }
  return source.slice(0, 5).map((item, i) => ({
    title: item.replace(/^[-•]\s*/, ""),
    body: benefits[i] ?? sentence(p.shortDescription, `A practical reason to consider ${p.name}.`),
  }));
}

function faqItems(p: Product): { title: string; body: string }[] {
  return [
    {
      title: `Who is ${p.name} best for?`,
      body: sentence(p.shortDescription, `${p.name} is for buyers who want a clearer, more focused solution.`),
    },
    {
      title: "What makes it different?",
      body: splitInput(p.keyFeatures).slice(0, 3).join("; ") || "Use your strongest product details here to make the difference concrete.",
    },
    {
      title: "What is the offer?",
      body: p.priceInfo || "Add the current price, trial, bundle, or incentive here.",
    },
  ];
}

function s(props: Omit<SectionProps, "id">): SectionProps {
  return { id: uid(), placeholder: true, ...props };
}

function skeletonSections(family: TemplateFamily, p: Product, ws: Workspace, project: Project): SectionProps[] {
  const types: Record<TemplateFamily, SectionType[]> = {
    "Performance Page": ["hero", "benefit-strip", "feature-grid", "social-proof", "offer", "faq", "cta"],
    "A+ Product Story": ["hero", "story", "feature-grid", "lifestyle", "details", "comparison", "faq", "cta"],
    "Deep Conversion Page": [
      "hero",
      "problem-solution",
      "story",
      "feature-grid",
      "benefit-strip",
      "social-proof",
      "comparison",
      "guarantee",
      "offer",
      "faq",
      "cta",
    ],
    "Brand Story Page": ["hero", "story", "lifestyle", "feature-grid", "social-proof", "story", "cta"],
    "Trust & Comparison Page": [
      "hero",
      "social-proof",
      "comparison",
      "feature-grid",
      "details",
      "guarantee",
      "faq",
      "cta",
    ],
  };

  const audience = ws.primaryAudience || "buyers who want a better way forward";
  const features = featureItems(p);
  const benefits = splitInput(p.keyBenefits);
  return types[family].map((type) => {
    switch (type) {
      case "hero":
        return s({
          type,
          title: `${p.name} for ${audience}`,
          subtitle: sentence(
            p.shortDescription,
            `${p.name} helps ${audience} ${benefitLine(p)}.`,
          ),
          ctaLabel: project.goal === "Book calls" ? "Book a call" : project.goal === "Collect leads" ? "Get the guide" : "Shop now",
          proofNeeded: false,
          placeholder: false,
        });
      case "benefit-strip":
        return s({
          type,
          bullets: benefits.length > 0 ? benefits.slice(0, 4) : [benefitLine(p), "Compare the product quickly", "Understand the offer", "Move forward with confidence"],
          placeholder: false,
        });
      case "feature-grid":
        return s({
          type,
          title: `What makes ${p.name} worth choosing`,
          items: features,
          placeholder: false,
        });
      case "problem-solution":
        return s({
          type,
          title: project.mainProblem || `The problem ${p.name} is built to solve`,
          body: `${sentence(p.shortDescription, `${p.name} gives buyers a clearer option.`)} ${benefits.length > 0 ? `The core outcome: ${benefits[0]}.` : "Use this section to connect the buyer's current frustration to your product's practical value."}`,
          placeholder: false,
        });
      case "story":
        return s({
          type,
          title: `A focused product story from ${ws.name}`,
          body: `${sentence(ws.brandDescription, `${ws.name} focuses on practical product experiences.`)} ${p.name} is positioned around ${audience}, with the page built to explain the value clearly before asking for action.`,
          placeholder: false,
        });
      case "lifestyle":
        return s({
          type,
          title: `${p.name} in the moments that matter`,
          body: `Show how ${p.name} fits into the buyer's real context: what they are trying to solve, what changes after purchase, and why the details matter.`,
          placeholder: false,
        });
      case "comparison":
        return s({
          type,
          title: `${p.name} compared with the usual alternatives`,
          items: [
            { title: "The usual way", body: project.competitor ? `Buyers may compare against ${project.competitor}, DIY workarounds, or delaying the decision.` : "Buyers may compare against cheaper alternatives, DIY workarounds, or doing nothing." },
            { title: p.name, body: `${p.name} leads with ${benefitLine(p)}${features[0]?.title ? ` and backs it up with ${features[0].title}.` : "."}` },
          ],
          placeholder: false,
        });
      case "social-proof":
        return s({
          type,
          title: "Add real customer testimonial or verified metric",
          body: "Add real customer quote here before publishing.",
          highlight: "— Add verified attribution",
          proofNeeded: true,
        });
      case "faq":
        return s({
          type,
          title: `Questions buyers ask before choosing ${p.name}`,
          items: faqItems(p),
          placeholder: false,
        });
      case "offer":
        return s({
          type,
          title: p.priceInfo || `Get ${p.name}`,
          subtitle: `${benefitLine(p)}. Make the offer, price, guarantee, or next step explicit here.`,
          ctaLabel: project.goal === "Book calls" ? "Book a call" : project.goal === "Collect leads" ? "Claim the offer" : "Buy now",
          placeholder: false,
        });
      case "guarantee":
        return s({ type, title: "Add guarantee or risk-reversal terms", body: P, proofNeeded: true });
      case "details":
        return s({
          type,
          title: `${p.name} details buyers should know`,
          bullets: splitInput(p.keyFeatures).length > 0 ? splitInput(p.keyFeatures) : [sentence(p.shortDescription, `${p.name} product details`)],
          placeholder: false,
        });
      case "cta":
        return s({
          type,
          title: `Ready to choose ${p.name}?`,
          ctaLabel: project.goal === "Book calls" ? "Book a call" : project.goal === "Collect leads" ? "Get started" : "Shop now",
          placeholder: false,
        });
    }
  });
}

export function generateConceptsForProject(
  ws: Workspace,
  product: Product,
  project: Project,
): LandingPageConcept[] {
  return TEMPLATE_FAMILIES.map((family) => {
    const meta = FRAMEWORK_META[family];
    const conceptName = meta.conceptName(product, ws);
    const oneLineStrategy = meta.oneLine(product, ws);
    const schema: LandingPageSchema = {
      templateFamily: family,
      conceptName,
      oneLineStrategy,
      bestTrafficType: meta.bestTraffic,
      sections: skeletonSections(family, product, ws, project),
    };
    return {
      id: uid(),
      projectId: project.id,
      templateFamily: family,
      conceptName,
      oneLineStrategy,
      bestTrafficType: meta.bestTraffic,
      whyThisWorks: "Generated from your saved product and brand inputs without using AI credits.",
      risksOrLimits: "Proof-heavy sections still require verified testimonials, metrics, guarantees, or policy details before publishing.",
      schema,
      createdAt: new Date().toISOString(),
    };
  });
}
