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

const P = "Needs your input";

function s(props: Omit<SectionProps, "id">): SectionProps {
  return { id: uid(), placeholder: true, ...props };
}

function skeletonSections(family: TemplateFamily, p: Product, ws: Workspace): SectionProps[] {
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

  return types[family].map((type) => {
    switch (type) {
      case "hero":
        return s({
          type,
          title: `Add hero headline for ${p.name}`,
          subtitle: `Add hero subheadline for ${ws.primaryAudience || "your audience"}`,
          ctaLabel: "Add CTA label",
          proofNeeded: false,
        });
      case "benefit-strip":
        return s({ type, bullets: [P, P, P, P] });
      case "feature-grid":
        return s({
          type,
          title: "Add section headline",
          items: [
            { title: P, body: P },
            { title: P, body: P },
            { title: P, body: P },
          ],
        });
      case "problem-solution":
      case "story":
      case "lifestyle":
        return s({ type, title: `Add ${type} headline`, body: P });
      case "comparison":
        return s({
          type,
          title: "Add comparison headline",
          items: [
            { title: "Alternative", body: P },
            { title: p.name, body: P },
          ],
        });
      case "social-proof":
        return s({
          type,
          title: "Add real customer testimonial or verified metric here",
          body: "Add real customer quote here",
          highlight: "— Add verified attribution",
          proofNeeded: true,
        });
      case "faq":
        return s({
          type,
          title: "Add FAQ headline",
          items: [
            { title: P, body: P },
            { title: P, body: P },
          ],
        });
      case "offer":
        return s({ type, title: p.priceInfo || "Add offer headline", subtitle: P, ctaLabel: "Add CTA label" });
      case "guarantee":
        return s({ type, title: "Add guarantee headline (if you offer one)", body: P, proofNeeded: true });
      case "details":
        return s({ type, title: "Add specs / details headline", bullets: [P, P, P, P] });
      case "cta":
        return s({ type, title: "Add closing CTA headline", ctaLabel: "Add CTA label" });
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
      sections: skeletonSections(family, product, ws),
    };
    return {
      id: uid(),
      projectId: project.id,
      templateFamily: family,
      conceptName,
      oneLineStrategy,
      bestTrafficType: meta.bestTraffic,
      whyThisWorks: "AI generation failed — this is a placeholder skeleton for you to fill in.",
      risksOrLimits: "Placeholder only. Do not ship without replacing every field.",
      schema,
      createdAt: new Date().toISOString(),
    };
  });
}
