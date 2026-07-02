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
  // Split only on strong separators — never on plain hyphens (breaks phrases like "month-end")
  return text
    .split(/\r?\n|·|•|\||;/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function firstSentence(text: string): string {
  const s = text.split(/[.?!]/)[0]?.trim();
  return s || text;
}

function audienceShort(audience: string): string {
  const trimmed = audience.trim();
  if (!trimmed) return "customers";
  // Break at first sub-clause boundary
  const clause = trimmed.split(/[,.]|\s(?:who|that|which|closing|running|building|working|with)\s/i)[0].trim();
  const CAP = 55;
  if (clause.length <= CAP) return clause.toLowerCase();
  const cut = clause.slice(0, CAP);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).toLowerCase();
}

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
  accentClass: string; // tailwind classes for card accent
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
    oneLine: (p, ws) =>
      `Punchy paid-social page that gets a cold ${audienceShort(ws.primaryAudience)} to buy ${p.name} in under 90 seconds — one promise, one proof stack, one offer.`,
  },
  "A+ Product Story": {
    code: "A-02",
    tagline: "Modular product detail. Premium, tactile, spec-forward.",
    bestFor: "PDP replacement for high-consideration or premium SKUs.",
    bestTraffic: "Direct, organic, referral",
    accentClass: "from-neutral-900/10 to-neutral-900/0 text-neutral-800 border-neutral-900/30",
    accentDot: "bg-neutral-900",
    length: "Modular",
    conceptName: (p) => `${p.name} — The Object`,
    oneLine: (p) =>
      `A premium modular PDP for ${p.name} that walks through craft, materials, and daily rituals — earns the price through detail, not discount.`,
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
    oneLine: (p, ws) =>
      `Long-form sales page that walks a skeptical ${audienceShort(ws.primaryAudience)} through the real problem, the mechanism behind ${p.name}, every objection, and a guarantee they can't refuse.`,
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
    oneLine: (p, ws) =>
      `Identity-led narrative that positions ${ws.name} as the reason ${audienceShort(ws.primaryAudience)} finally have ${p.name} — earns loyalty before it asks for the sale.`,
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
      `Comparison-first page that stacks ${p.name} against the category leaders on the criteria buyers actually screenshot before checkout.`,
  },
};

// Overload to accept optional workspace (Brand Story uses it)
FRAMEWORK_META["Brand Story Page"].conceptName = ((_p: Product, ws?: Workspace) =>
  `Why ${ws?.name ?? "We"} Exists`) as unknown as FrameworkMeta["conceptName"];

// ---------------- Content helpers ----------------

function pickBenefit(list: string[], i: number, fallback: string): string {
  return list[i] || fallback;
}

function pickFeature(list: string[], i: number, fallback: string): string {
  return list[i] || fallback;
}

interface Ctx {
  ws: Workspace;
  product: Product;
  benefits: string[];
  features: string[];
  audience: string;
  audienceShort: string;
  brand: string;
  price: string;
}

function buildCtx(ws: Workspace, product: Product): Ctx {
  const benefits = splitLines(product.keyBenefits);
  const features = splitLines(product.keyFeatures);
  return {
    ws,
    product,
    benefits,
    features,
    audience: ws.primaryAudience || "your customers",
    audienceShort: audienceShort(ws.primaryAudience || "customers"),
    brand: ws.name,
    price: product.priceInfo || "",
  };
}

function s(props: Omit<SectionProps, "id">): SectionProps {
  return { id: uid(), ...props };
}

// ---------------- Framework builders ----------------

function performanceSections(c: Ctx): SectionProps[] {
  const primaryBenefit = pickBenefit(
    c.benefits,
    0,
    `Finally, ${c.product.name.toLowerCase()} that actually does the thing`,
  );
  const heroCta = c.price?.toLowerCase().includes("subscri")
    ? "Start my subscription"
    : "Shop now";
  return [
    s({
      type: "hero",
      highlight: `New · ${c.brand}`,
      title: primaryBenefit,
      subtitle: `${firstSentence(c.product.shortDescription)} Built for ${c.audienceShort}. Ships in 48 hours.`,
      ctaLabel: heroCta,
      ctaSecondaryLabel: "See real results",
    }),
    s({
      type: "benefit-strip",
      bullets: [
        pickBenefit(c.benefits, 0, "Results in the first week"),
        pickBenefit(c.benefits, 1, "Loved by 12,000+ customers"),
        "Free shipping over $50",
        "60-day money-back guarantee",
      ],
    }),
    s({
      type: "social-proof",
      title: "★★★★★  4.9 average · 2,400+ verified reviews",
      body: `"I've tried five of these. ${c.product.name} is the first one I've actually re-ordered. It's not close."`,
      highlight: `— Jordan M., verified buyer`,
    }),
    s({
      type: "feature-grid",
      title: `Why ${c.product.name} converts where the others don't`,
      items: [
        {
          title: pickFeature(c.features, 0, "Engineered for the outcome"),
          body: `The single feature ${c.audienceShort} tell us made them switch.`,
        },
        {
          title: pickFeature(c.features, 1, "Zero learning curve"),
          body: `Set up in under 3 minutes. No manual required.`,
        },
        {
          title: pickFeature(c.features, 2, "Built to last"),
          body: `Designed for daily use — not a shelf-life gimmick.`,
        },
      ],
    }),
    s({
      type: "offer",
      title: c.price || "Today only — 20% off your first order",
      subtitle: `Bundle discounts auto-apply. Free returns. Cancel anytime.`,
      ctaLabel: heroCta,
    }),
    s({
      type: "faq",
      title: "Fast answers",
      items: [
        { title: "How fast will I see it work?", body: "Most customers notice a difference within the first week — usually within 3 days." },
        { title: "What if it's not for me?", body: "Send it back within 60 days. Full refund. We pay return shipping." },
        { title: "How fast does it ship?", body: "Orders placed by 2pm ship same-day from our warehouse. 2–4 day delivery." },
      ],
    }),
    s({ type: "cta", title: `Try ${c.product.name} risk-free`, ctaLabel: heroCta }),
  ];
}

function aPlusStorySections(c: Ctx): SectionProps[] {
  const heroCta = "Add to bag";
  return [
    s({
      type: "hero",
      highlight: c.brand.toUpperCase(),
      title: `${c.product.name}. Considered in every detail.`,
      subtitle: firstSentence(c.product.shortDescription) || `An object made for the way ${c.audienceShort} actually live with it.`,
      ctaLabel: heroCta,
      ctaSecondaryLabel: "The full story",
    }),
    s({
      type: "story",
      title: "One product. Made properly.",
      body: `We built ${c.product.name} because the mass-market version stopped feeling honest. Every choice — from the material down to the packaging you'll unbox — is here on purpose.`,
    }),
    s({
      type: "lifestyle",
      title: "In use",
      body: `Photographed in the routines of real ${c.audienceShort} — not staged, not lit for ads.`,
    }),
    s({
      type: "feature-grid",
      title: "What makes it different, in detail",
      items: [
        {
          title: pickFeature(c.features, 0, "The material"),
          body: "Sourced from a partner we've worked with for four years. Traceable to the batch.",
        },
        {
          title: pickFeature(c.features, 1, "The finish"),
          body: "Hand-checked before packing. The tolerance we hold is smaller than the industry standard.",
        },
        {
          title: pickFeature(c.features, 2, "The everyday details"),
          body: "The small choices you only notice on the tenth use — and then can't unsee.",
        },
        {
          title: pickFeature(c.features, 3, "The pack-out"),
          body: "Recyclable packaging that costs us more, because throwing it away shouldn't feel wasteful.",
        },
      ],
    }),
    s({
      type: "details",
      title: "The technical specification",
      bullets: c.features.length
        ? c.features.slice(0, 6)
        : ["Materials", "Dimensions", "Weight", "Care", "Origin", "Warranty"],
    }),
    s({
      type: "comparison",
      title: `Standard vs. ${c.product.name}`,
      items: [
        { title: "Standard category", body: "Mass-produced, priced to a shelf slot, replaced every 12 months." },
        { title: c.product.name, body: `Engineered to be the last ${c.product.name.toLowerCase()} ${c.audienceShort} need to buy for years.` },
      ],
    }),
    s({
      type: "story",
      title: "Where it comes from",
      body: `Every ${c.product.name} is assembled by the same small team. If something's off, it doesn't leave the workshop. That's not a marketing line — it's the reason we can only ship a limited run each month.`,
    }),
    s({
      type: "social-proof",
      title: "In the press",
      body: `"An object that quietly resets the bar for the category."`,
      highlight: "— Field Notes",
    }),
    s({
      type: "faq",
      title: "Good to know",
      items: [
        { title: "How do I care for it?", body: "Wipe clean with a damp cloth. Detailed care card ships in the box." },
        { title: "Do you offer a warranty?", body: "Yes — a real one, honored by the people who made it. Two years, no receipts required." },
        { title: "Where do you ship?", body: "Worldwide. Duties calculated at checkout so nothing surprises you." },
      ],
    }),
    s({ type: "cta", title: `Bring ${c.product.name} home`, ctaLabel: heroCta }),
  ];
}

function deepConversionSections(c: Ctx): SectionProps[] {
  const heroCta = "Read the full case";
  return [
    s({
      type: "hero",
      highlight: "A long read — worth it",
      title: `If you're still comparing, read this before you buy.`,
      subtitle: `An honest, no-hype breakdown of why ${c.audienceShort} keep switching to ${c.product.name} — and the three things it doesn't do.`,
      ctaLabel: heroCta,
      ctaSecondaryLabel: "Skip to the offer",
    }),
    s({
      type: "problem-solution",
      title: "The real problem nobody in the category will name",
      body: `Most ${c.audienceShort} have already spent hundreds on products that promise the same outcome and quietly under-deliver. The category has a marketing problem, not a product problem — and the incentives are stacked against you finding that out until after you've paid.`,
    }),
    s({
      type: "story",
      title: "What's actually at stake",
      body: `Every month spent on the wrong product is a month of compounding frustration, a stack of half-used bottles/boxes/accounts, and — worse — the slow belief that this category just doesn't work. It does. You've just been sold the wrong version of it.`,
    }),
    s({
      type: "feature-grid",
      title: `How ${c.product.name} works — the mechanism`,
      items: [
        {
          title: `Step 1 · ${pickFeature(c.features, 0, "Diagnose")}`,
          body: "We start with the input most brands skip. It's the reason the rest of the sequence actually works.",
        },
        {
          title: `Step 2 · ${pickFeature(c.features, 1, "Apply")}`,
          body: "The daily routine takes under 2 minutes. It has to — or you won't do it, and neither will we.",
        },
        {
          title: `Step 3 · ${pickFeature(c.features, 2, "Compound")}`,
          body: "The results aren't in the first bottle. They're in the third. Here's why that's the honest answer.",
        },
        {
          title: `Step 4 · ${pickFeature(c.features, 3, "Sustain")}`,
          body: "Once it works, you don't need more of it. You need less. That's why we made the refills half the price.",
        },
      ],
    }),
    s({
      type: "benefit-strip",
      bullets: c.benefits.length
        ? c.benefits.slice(0, 4)
        : [
            "Repeatable outcomes",
            "Backed by third-party testing",
            "Formulated in-house, not white-labeled",
            "No auto-shipment traps",
          ],
    }),
    s({
      type: "social-proof",
      title: "The customers who used to buy the competitor",
      body: `"I spent $340 on the market leader over two years. I've spent $88 on ${c.product.name} and it's not the same league. I'm annoyed I didn't switch earlier."`,
      highlight: "— Priya S., customer for 14 months",
    }),
    s({
      type: "comparison",
      title: "Before / after (real timelines, not marketing ones)",
      items: [
        { title: "Week 1", body: "You'll notice the routine is easier. That's it. Anyone promising more in week 1 is selling you something." },
        { title: "Week 4", body: `The change ${c.audienceShort} actually came for. This is when the reviews get long.` },
      ],
    }),
    s({
      type: "problem-solution",
      title: "The objections we hear most (and honest answers)",
      body: `"Is it worth the price?" — Only if you factor in what you'd otherwise spend replacing cheaper alternatives every 3 months. "Will it work for me?" — If you match the audience above, our repeat-purchase rate is 71%. "What if it doesn't?" — Send it back, keep the results card, get every dollar back.`,
    }),
    s({
      type: "guarantee",
      title: "The 60-day, no-questions guarantee",
      body: `Try ${c.product.name} for 60 days. If you don't see the change we promised, email us one line and we refund everything — including shipping. We can afford to offer this because 71% of first-time buyers reorder.`,
    }),
    s({
      type: "social-proof",
      title: "More proof",
      body: `"I'm a hard sell. Nothing has changed my mind on this category in ten years. This did."`,
      highlight: "— Marcus T., verified buyer",
    }),
    s({
      type: "offer",
      title: c.price || "Start with a single unit — $39",
      subtitle: "Or subscribe and save 20% on every refill. Skip, pause, or cancel from your inbox — no login required.",
      ctaLabel: "Start today",
    }),
    s({
      type: "faq",
      title: "Everything else you're wondering",
      items: [
        { title: "Will it work for me?", body: `If you match the audience described above, yes — with 71% repeat purchase, our numbers are the most honest thing on this page.` },
        { title: "How long until I see results?", body: "Meaningful results in weeks 3–4. Anyone promising faster is guessing." },
        { title: "What's the return policy?", body: "60 days, full refund, we pay return shipping. Keep the results card." },
        { title: "How do subscriptions work?", body: "Choose 30, 60, or 90 days. Skip or cancel from a link in your inbox. No login, no phone call." },
      ],
    }),
    s({ type: "cta", title: "Make the decision once. Then stop shopping.", ctaLabel: "Start today" }),
  ];
}

function brandStorySections(c: Ctx): SectionProps[] {
  const heroCta = "Join us";
  const voice = c.ws.brandVoice?.length ? c.ws.brandVoice.join(" · ") : "Honest · Considered · Made to last";
  return [
    s({
      type: "hero",
      highlight: c.brand,
      title: `For ${c.audienceShort} who wanted something better and got tired of waiting.`,
      subtitle: firstSentence(c.ws.brandDescription) || `A small brand doing one thing seriously.`,
      ctaLabel: heroCta,
      ctaSecondaryLabel: `The story behind ${c.brand}`,
    }),
    s({
      type: "story",
      title: `Why we started ${c.brand}`,
      body:
        c.ws.brandDescription ||
        `We started ${c.brand} because the existing options were designed for margin, not for the people using them. So we built the version we wanted for ourselves — and then, quietly, for everyone else.`,
    }),
    s({
      type: "lifestyle",
      title: "Who this is for",
      body: `We didn't build ${c.brand} for everyone. We built it for ${c.audience.toLowerCase()}. If that sounds like you, you're going to feel this immediately.`,
    }),
    s({
      type: "story",
      title: "What we believe",
      body: `${voice}. Those aren't taglines — they're the reason we say no to shortcuts every single week. It's slower. It costs more. It's the only way to make something that's actually good.`,
    }),
    s({
      type: "feature-grid",
      title: `${c.product.name} — the object we chose to make first`,
      items: (c.benefits.length ? c.benefits.slice(0, 3) : ["Made properly", "Lasts longer", "Feels honest"]).map((b) => ({
        title: b,
        body: `Every ${c.product.name} we ship is a small argument that the category can be better than this.`,
      })),
    }),
    s({
      type: "social-proof",
      title: "From the community",
      body: `"${c.brand} is the first brand in this category I've told my friends about without being asked."`,
      highlight: "— Alex R., customer since day one",
    }),
    s({
      type: "story",
      title: "Where we're going",
      body: `We're building ${c.brand} slowly, on purpose. Every product we release has to earn its place. If you want to be early to that — this is the door.`,
    }),
    s({ type: "cta", title: `Be part of what ${c.brand} is becoming`, ctaLabel: heroCta }),
  ];
}

function trustComparisonSections(c: Ctx): SectionProps[] {
  const heroCta = "See the comparison";
  return [
    s({
      type: "hero",
      highlight: "★ 4.9 / 5 · 2,400+ verified reviews",
      title: `${c.product.name} — the one ${c.audienceShort} keep switching to.`,
      subtitle: `Comparison-first breakdown of how ${c.product.name} stacks up against the category leaders — on the criteria buyers actually screenshot before checkout.`,
      ctaLabel: heroCta,
      ctaSecondaryLabel: "Read reviews first",
    }),
    s({
      type: "social-proof",
      title: "As featured in",
      bullets: ["WIRED", "VOGUE", "GQ", "FAST COMPANY", "MONOCLE"],
    }),
    s({
      type: "comparison",
      title: `${c.product.name} vs. the category leader`,
      items: [
        {
          title: "Category leader",
          body: "White-labeled formula, thin support, opaque sourcing, aggressive auto-ship, average 3.8★ across independent reviews.",
        },
        {
          title: c.product.name,
          body: `Formulated in-house, published sourcing, cancel-anytime with one click, 4.9★ across 2,400+ verified reviews.`,
        },
      ],
    }),
    s({
      type: "feature-grid",
      title: "What you actually get — and how we prove it",
      items: [
        {
          title: pickFeature(c.features, 0, "Third-party tested"),
          body: "Every batch tested by an independent lab. Reports published on the product page.",
        },
        {
          title: pickFeature(c.features, 1, "Traceable sourcing"),
          body: "We list every supplier by name. No 'proprietary blend' hand-waving.",
        },
        {
          title: pickFeature(c.features, 2, "Real support"),
          body: "Answered by a human in under 4 hours. Read our public response-time dashboard.",
        },
        {
          title: pickFeature(c.features, 3, "No dark patterns"),
          body: "No auto-ship you can't cancel. No fake urgency. No fake reviews.",
        },
      ],
    }),
    s({
      type: "social-proof",
      title: "The reviews you can screenshot",
      body: `"I compared four. I made a spreadsheet. ${c.product.name} won on every dimension that mattered — and the two that didn't, they told me about themselves."`,
      highlight: "— Sam K., verified buyer",
    }),
    s({
      type: "details",
      title: "The numbers we publish (and update monthly)",
      bullets: [
        "71% first-time buyer repeat-purchase rate",
        "4.9★ average across 2,400+ verified reviews",
        "< 4h median support response time",
        "0.7% return rate — vs. 6.2% category average",
        "60-day money-back guarantee, no questions",
      ],
    }),
    s({
      type: "guarantee",
      title: "60-day no-questions guarantee",
      body: `If ${c.product.name} isn't the best ${c.product.name.toLowerCase()} you've bought, email one line and we refund every dollar — including shipping.`,
    }),
    s({
      type: "faq",
      title: "The questions switchers ask us",
      items: [
        { title: "How does pricing compare?", body: "Higher upfront than the drugstore version, roughly half the lifetime cost of the DTC leader. Full math on request." },
        { title: "Is it really different, or is it marketing?", body: "Read the third-party test reports on the product page. We link them because we want you to." },
        { title: "How fast does it ship?", body: "2–4 days, free over $50, from a warehouse in Ohio." },
      ],
    }),
    s({ type: "cta", title: "See why buyers switch — and stay", ctaLabel: heroCta }),
  ];
}

function buildSections(family: TemplateFamily, ws: Workspace, product: Product): SectionProps[] {
  const c = buildCtx(ws, product);
  switch (family) {
    case "Performance Page":
      return performanceSections(c);
    case "A+ Product Story":
      return aPlusStorySections(c);
    case "Deep Conversion Page":
      return deepConversionSections(c);
    case "Brand Story Page":
      return brandStorySections(c);
    case "Trust & Comparison Page":
      return trustComparisonSections(c);
  }
}

export function generateConceptsForProject(
  ws: Workspace,
  product: Product,
  project: Project,
): LandingPageConcept[] {
  return TEMPLATE_FAMILIES.map((family) => {
    const meta = FRAMEWORK_META[family];
    // Special: brand story concept name uses workspace
    const conceptName = meta.conceptName(product, ws);
    const oneLineStrategy = meta.oneLine(product, ws);
    const schema: LandingPageSchema = {
      templateFamily: family,
      conceptName,
      oneLineStrategy,
      bestTrafficType: meta.bestTraffic,
      sections: buildSections(family, ws, product),
    };
    return {
      id: uid(),
      projectId: project.id,
      templateFamily: family,
      conceptName,
      oneLineStrategy,
      bestTrafficType: meta.bestTraffic,
      schema,
      createdAt: new Date().toISOString(),
    };
  });
}
