export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  ownerId: string;
  name: string;
  brandDescription: string;
  brandVoice: string[];
  primaryAudience: string;
  createdAt: string;
}

export interface Product {
  id: string;
  workspaceId: string;
  name: string;
  shortDescription: string;
  keyFeatures: string;
  keyBenefits: string;
  priceInfo: string;
  productUrl?: string;
  siteUrl?: string;
  createdAt: string;
}

export type ProjectGoal = "Sell product" | "Collect leads" | "Book calls";
export type ProjectSourceMode = "url" | "brief";

export interface Project {
  id: string;
  workspaceId: string;
  productId: string;
  projectName: string;
  goal: ProjectGoal;
  createdAt: string;
  sourceMode?: ProjectSourceMode;
  landingPageUrl?: string;
  notes?: string;
  tone?: string;
  mainProblem?: string;
  objections?: string;
  competitor?: string;
  desiredAngle?: string;
}

export interface BrandBrief {
  positioning: string;
  toneSummary: string;
  audienceSummary: string;
  topBenefits: string[];
  topObjections: string[];
  conversionDrivers: string[];
}

export type TemplateFamily =
  | "Performance Page"
  | "A+ Product Story"
  | "Deep Conversion Page"
  | "Brand Story Page"
  | "Trust & Comparison Page";

export type SectionType =
  | "hero"
  | "benefit-strip"
  | "problem-solution"
  | "feature-grid"
  | "story"
  | "lifestyle"
  | "comparison"
  | "social-proof"
  | "faq"
  | "offer"
  | "guarantee"
  | "cta"
  | "details";

export interface SectionProps {
  id: string;
  type: SectionType;
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  highlight?: string;
  ctaLabel?: string;
  ctaSecondaryLabel?: string;
  items?: { title: string; body: string }[];
  // New agentic fields
  headline?: string;
  subheadline?: string;
  notes?: string;
  imagePrompt?: string;
  imageStyle?: string;
  imageUrl?: string;
}

export interface LandingPageSchema {
  templateFamily: TemplateFamily;
  conceptName: string;
  oneLineStrategy: string;
  bestTrafficType: string;
  sections: SectionProps[];
}

export interface ProjectResearch {
  sourceMode: ProjectSourceMode;
  summary: string;
  competitorAngles: string[];
  keywords: string[];
  objections: string[];
  trustSignals: string[];
  positioningIdeas: string[];
  imageStyleHints: string[];
  toneSummary: string;
  createdAt: string;
  note?: string;
}

export interface LandingPageConcept {
  id: string;
  projectId: string;
  templateFamily: TemplateFamily;
  conceptName: string;
  oneLineStrategy: string;
  bestTrafficType: string;
  bestFor?: string;
  whyThisWorks?: string;
  risksOrLimits?: string;
  tone?: string;
  frameworkType?: TemplateFamily;
  schema: LandingPageSchema;
  researchSnapshot?: string;
  createdAt: string;
}

export interface LandingPageElementsHero {
  headline: string;
  subheadline: string;
  primaryCTA: string;
  secondaryCTA?: string;
  imagePrompts: string[];
  visualDirection: string;
}

export interface LandingPageElementsSection {
  sectionId: string;
  sectionType: SectionType | string;
  headline: string;
  subheadline?: string;
  body?: string;
  bullets?: string[];
  cta?: string;
  imagePrompts: string[];
  visualDirection?: string;
  implementationNote?: string;
}

export interface LandingPageElements {
  conceptId: string;
  hero: LandingPageElementsHero;
  sections: LandingPageElementsSection[];
  globalStyle: {
    designMood: string;
    imageStyle: string;
    colorMood: string;
    typographyMood: string;
    layoutMood: string;
  };
  copyExportText: string;
  createdAt: string;
}

export interface GeneratedImagePreview {
  sectionId: string;
  imagePrompt: string;
  imageStyle: string;
  previewUrl: string;
  status: "simulated" | "generated";
}

export interface GenerationRun {
  id: string;
  projectId: string;
  status: "pending" | "running" | "complete" | "error";
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}
