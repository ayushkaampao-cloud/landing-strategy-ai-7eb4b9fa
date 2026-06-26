import type {
  LandingPageConcept,
  LandingPageSchema,
  Product,
  Project,
  SectionProps,
  TemplateFamily,
  Workspace,
} from "@/types";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n|,|•|-/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const TEMPLATE_FAMILIES: TemplateFamily[] = [
  "Performance Page",
  "A+ Product Story",
  "Deep Conversion Page",
  "Brand Story Page",
  "Trust & Comparison Page",
];

export const FRAMEWORK_META: Record<
  TemplateFamily,
  {
    code: string;
    tagline: string;
    bestFor: string;
    conceptName: (p: Product) => string;
    oneLine: (p: Product) => string;
    bestTraffic: string;
  }
> = {
  "Performance Page": {
    code: "P-01",
    tagline: "Direct response, short-to-medium, built for paid ads.",
    bestFor: "Cold paid traffic (Meta / TikTok)",
    conceptName: (p) => `Fast Funnel — ${p.name}`,
    oneLine: (p) =>
      `Aggressive hook + benefit-led modules drive a single decision for cold ${p.name} buyers.`,
    bestTraffic: "Cold paid social",
  },
  "A+ Product Story": {
    code: "A-02",
    tagline: "Premium modular product narrative.",
    bestFor: "Premium traffic, organic, referral",
    conceptName: (p) => `Sensory Edition — ${p.name}`,
    oneLine: (p) =>
      `High-fidelity modular story that justifies the price of ${p.name} through craft and detail.`,
    bestTraffic: "Direct / organic",
  },
  "Deep Conversion Page": {
    code: "D-03",
    tagline: "Long-form persuasive sales page.",
    bestFor: "Considered purchases, search traffic",
    conceptName: (p) => `The Case For ${p.name}`,
    oneLine: (p) =>
      `Long-form persuasion that dismantles every objection before the buy decision.`,
    bestTraffic: "Search & email",
  },
  "Brand Story Page": {
    code: "B-04",
    tagline: "Narrative and emotional brand-led page.",
    bestFor: "Retargeting, warm audiences",
    conceptName: (p) => `Why We Built ${p.name}`,
    oneLine: (p) =>
      `Emotional brand-led narrative positioning ${p.name} as the transformation engine.`,
    bestTraffic: "Retargeting / warm",
  },
  "Trust & Comparison Page": {
    code: "T-05",
    tagline: "Proof and comparison heavy.",
    bestFor: "Bottom-funnel, competitor traffic",
    conceptName: (p) => `${p.name} vs. the Rest`,
    oneLine: (p) =>
      `Comparison grid plus proof-stack closes warm shoppers comparing alternatives.`,
    bestTraffic: "Bottom funnel / competitor",
  },
};

function buildSections(
  family: TemplateFamily,
  ws: Workspace,
  product: Product,
): SectionProps[] {
  const benefits = splitLines(product.keyBenefits);
  const features = splitLines(product.keyFeatures);
  const audience = ws.primaryAudience || "your customers";
  const brand = ws.name;

  const s = (props: Omit<SectionProps, "id">): SectionProps => ({
    id: uid(),
    ...props,
  });

  const heroCta = "Shop now";

  switch (family) {
    case "Performance Page":
      return [
        s({
          type: "hero",
          highlight: "New from " + brand,
          title: benefits[0]
            ? benefits[0]
            : `Meet ${product.name}. Built for ${audience}.`,
          subtitle:
            product.shortDescription ||
            `The fastest way to upgrade your routine.`,
          ctaLabel: heroCta,
          ctaSecondaryLabel: "See how it works",
        }),
        s({
          type: "benefit-strip",
          bullets: benefits.slice(0, 4).length
            ? benefits.slice(0, 4)
            : ["Fast results", "Loved by thousands", "30-day guarantee", "Free shipping"],
        }),
        s({
          type: "problem-solution",
          title: "The problem most people don't fix",
          body: `Most ${audience} settle for products that look good but underdeliver. ${product.name} is engineered around the one outcome that actually matters.`,
        }),
        s({
          type: "feature-grid",
          title: "What's inside",
          items: features.slice(0, 4).map((f) => ({
            title: f,
            body: `Designed specifically for ${audience}.`,
          })),
        }),
        s({
          type: "social-proof",
          title: "Rated 4.9 by 2,400+ customers",
          body: `"Easily the best purchase I've made this year. ${product.name} just works."`,
          highlight: "Verified buyer",
        }),
        s({
          type: "offer",
          title: product.priceInfo || "Today only — free shipping",
          subtitle: "Bundle discounts auto-apply at checkout.",
          ctaLabel: heroCta,
        }),
        s({
          type: "faq",
          title: "Frequently asked",
          items: [
            { title: "How fast will I see results?", body: "Most customers see a difference within the first week." },
            { title: "What's the return policy?", body: "30-day money-back, no questions asked." },
            { title: "Where does it ship from?", body: "Ships from our regional warehouse — 2-4 day delivery." },
          ],
        }),
        s({ type: "cta", title: "Try it risk-free", ctaLabel: heroCta }),
      ];

    case "A+ Product Story":
      return [
        s({
          type: "hero",
          highlight: brand,
          title: benefits[0] ?? `${product.name}, reimagined.`,
          subtitle: product.shortDescription,
          ctaLabel: heroCta,
          ctaSecondaryLabel: "Learn the craft",
        }),
        s({
          type: "story",
          title: "An intro to the product",
          body: `${product.name} began with a simple question: what would it look like if ${audience} had something built to a higher standard?`,
        }),
        s({
          type: "feature-grid",
          title: "Designed in detail",
          items: features.slice(0, 4).map((f) => ({
            title: f,
            body: "A small detail that compounds into a better experience.",
          })),
        }),
        s({
          type: "comparison",
          title: `Why ${product.name}`,
          items: [
            { title: "Standard", body: "Mass-market, designed to a price." },
            { title: product.name, body: "Engineered for the outcome, not the spec sheet." },
          ],
        }),
        s({
          type: "lifestyle",
          title: "In real life",
          body: `Made for the routines and rituals of ${audience}.`,
        }),
        s({
          type: "details",
          title: "Technical details",
          bullets: features.slice(0, 5),
        }),
        s({
          type: "social-proof",
          title: "What people are saying",
          body: `"It looks and feels exactly like the brand promises."`,
          highlight: "Editor, Field Notes",
        }),
        s({
          type: "faq",
          title: "Good to know",
          items: [
            { title: "Materials and origin", body: "Sourced and assembled with traceable partners." },
            { title: "Care", body: "Designed to last with simple care." },
          ],
        }),
        s({ type: "cta", title: `Bring ${product.name} home`, ctaLabel: heroCta }),
      ];

    case "Deep Conversion Page":
      return [
        s({
          type: "hero",
          highlight: "A long read",
          title: `The honest case for ${product.name}.`,
          subtitle: `If you're ${audience.toLowerCase()} and you've tried everything else, read this.`,
          ctaLabel: heroCta,
        }),
        s({
          type: "problem-solution",
          title: "The real problem",
          body: `Most ${audience} are sold quick fixes. The result: shelves full of half-used products and no real change.`,
        }),
        s({
          type: "story",
          title: "What's at stake",
          body: `Every month you spend on the wrong product is a month of compounding frustration.`,
        }),
        s({
          type: "feature-grid",
          title: `How ${product.name} works`,
          items: features.slice(0, 4).map((f, i) => ({
            title: `Step ${i + 1}: ${f}`,
            body: "Designed in sequence to actually compound.",
          })),
        }),
        s({
          type: "benefit-strip",
          bullets: benefits.length ? benefits : ["Clear outcomes", "Repeatable results", "Designed for durability"],
        }),
        s({
          type: "social-proof",
          title: "Real customers, real outcomes",
          body: `"I tried four competitors before this. ${product.name} is the first one that actually worked."`,
        }),
        s({
          type: "problem-solution",
          title: "Common objections",
          body: `"Is it worth the price?" — Yes, when you factor in what you'd otherwise spend replacing cheaper alternatives.`,
        }),
        s({
          type: "faq",
          title: "Everything else",
          items: [
            { title: "Will this work for me?", body: "If you fit the audience above, yes." },
            { title: "What if it doesn't?", body: "Full refund, 60 days." },
            { title: "Shipping?", body: "Free over $50." },
          ],
        }),
        s({ type: "offer", title: product.priceInfo || "Start today", ctaLabel: heroCta }),
        s({ type: "cta", title: "Make the decision once.", ctaLabel: heroCta }),
      ];

    case "Brand Story Page":
      return [
        s({
          type: "hero",
          highlight: brand,
          title: `For ${audience} who want more than a product.`,
          subtitle: ws.brandDescription || "A small idea, taken seriously.",
          ctaLabel: heroCta,
        }),
        s({
          type: "story",
          title: "Why we started",
          body:
            ws.brandDescription ||
            `We started ${brand} because the existing options didn't respect the people using them.`,
        }),
        s({
          type: "lifestyle",
          title: "Who it's for",
          body: `Built for ${audience}.`,
        }),
        s({
          type: "feature-grid",
          title: `${product.name} is the engine`,
          items: benefits.slice(0, 3).map((b) => ({
            title: b,
            body: "Part of the change you've been waiting for.",
          })),
        }),
        s({
          type: "social-proof",
          title: "From the community",
          body: `"It's the first brand in the category I actually trust."`,
        }),
        s({
          type: "story",
          title: "What we believe",
          body: `${ws.brandVoice?.join(", ") || "Honesty, restraint, craft."} — these aren't taglines.`,
        }),
        s({
          type: "faq",
          title: "Common questions",
          items: [
            { title: "How are you different?", body: "We optimise for outcomes, not for ads." },
            { title: "Where do you ship?", body: "Globally." },
          ],
        }),
        s({ type: "cta", title: "Join us", ctaLabel: heroCta }),
      ];

    case "Trust & Comparison Page":
      return [
        s({
          type: "hero",
          highlight: "Rated 4.9 / 5",
          title: `${product.name} — the choice ${audience} keep coming back to.`,
          subtitle: product.shortDescription,
          ctaLabel: heroCta,
        }),
        s({
          type: "social-proof",
          title: "Featured in",
          bullets: ["WIRED", "VOGUE", "GQ", "Fast Company"],
        }),
        s({
          type: "comparison",
          title: `${product.name} vs. typical options`,
          items: [
            { title: "Typical brand", body: "Generic formula, mass production, thin support." },
            { title: product.name, body: "Engineered formula, transparent sourcing, real support." },
          ],
        }),
        s({
          type: "feature-grid",
          title: "What you actually get",
          items: features.slice(0, 4).map((f) => ({ title: f, body: "Backed by proof." })),
        }),
        s({
          type: "social-proof",
          title: "2,400+ verified reviews",
          body: `"I compared four. ${product.name} won on every dimension."`,
        }),
        s({
          type: "guarantee",
          title: "60-day guarantee",
          body: "If it doesn't work, send it back. Full refund.",
        }),
        s({
          type: "faq",
          title: "Buying questions",
          items: [
            { title: "How does pricing compare?", body: "Lower lifetime cost than the cheaper alternatives." },
            { title: "How fast does it ship?", body: "2-4 days, free over $50." },
          ],
        }),
        s({ type: "cta", title: "See why people switch", ctaLabel: heroCta }),
      ];
  }
}

export function generateConceptsForProject(
  ws: Workspace,
  product: Product,
  project: Project,
): LandingPageConcept[] {
  return TEMPLATE_FAMILIES.map((family) => {
    const meta = FRAMEWORK_META[family];
    const schema: LandingPageSchema = {
      templateFamily: family,
      conceptName: meta.conceptName(product),
      oneLineStrategy: meta.oneLine(product),
      bestTrafficType: meta.bestTraffic,
      sections: buildSections(family, ws, product),
    };
    return {
      id: uid(),
      projectId: project.id,
      templateFamily: family,
      conceptName: schema.conceptName,
      oneLineStrategy: schema.oneLineStrategy,
      bestTrafficType: schema.bestTrafficType,
      schema,
      createdAt: new Date().toISOString(),
    };
  });
}
