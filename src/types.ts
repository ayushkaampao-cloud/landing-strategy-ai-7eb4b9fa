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

export interface ProductImageRef {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  addedAt: string;
  order: number;
}

export interface ProductVisualProfile {
  productType: string;
  visibleMaterials: string[];
  visibleColors: string[];
  packagingStyle: string;
  labelStyle: string;
  shapeDescription: string;
  keyVisibleParts: string[];
  visibleAccessories: string[];
  likelyUsageContext: string;
  premiumLevel: string;
  photoConsistencyNotes: string;
  mustPreserve: string[];
  mustAvoid: string[];
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

export type ProjectCategory =
  | "b2b_saas"
  | "finance_software"
  | "dtc_physical_product"
  | "beauty_skincare"
  | "service_consulting"
  | "hardware_device"
  | "food_beverage"
  | "other";

export type AudienceSophistication = "beginner" | "intermediate" | "expert";
export type AwarenessLevel =
  | "unaware"
  | "problem_aware"
  | "solution_aware"
  | "product_aware"
  | "most_aware";

export interface ProjectClassification {
  category: ProjectCategory;
  subcategory: string;
  audienceSophistication: AudienceSophistication;
  awarenessLevel: AwarenessLevel;
  toneSummary: string;
}

export type ImageMode =
  | "product_packshot"
  | "product_in_use"
  | "interface_ui"
  | "dashboard_closeup"
  | "comparison_graphic"
  | "founder_story_editorial"
  | "ingredient_macro"
  | "material_detail"
  | "iconographic_brand_visual"
  | "abstract_brand_texture"
  | "quote_card_visual"
  | "data_visual_support"
  | "no_image_needed";

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
  // Agentic fields
  headline?: string;
  subheadline?: string;
  notes?: string;
  imagePrompt?: string;
  imageStyle?: string;
  imageMode?: ImageMode;
  imageUrl?: string;
  negativePrompt?: string;
  proofNeeded?: boolean;
  placeholder?: boolean;
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
  trustSignalsNeeded?: string[];
  positioningIdeas: string[];
  imageStyleHints: string[];
  toneSummary: string;
  createdAt: string;
  note?: string;
  classification?: ProjectClassification;
  verifiedFacts?: string[];
  forbiddenClaims?: string[];
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
  placeholder?: boolean;
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
  imageMode?: ImageMode;
  negativePrompt?: string;
  visualDirection?: string;
  implementationNote?: string;
  proofNeeded?: boolean;
  placeholder?: boolean;
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
    brandSignalKeywords?: string[];
  };
  copyExportText: string;
  createdAt: string;
}

export interface VisualIdentityBrief {
  brandName: string;
  category: ProjectCategory;
  productType: string;
  visualIntent: string;
  preferredImageModes: ImageMode[];
  forbiddenImageModes: ImageMode[];
  sceneSuggestions: string[];
  productPresentationStyle: string;
  environmentStyle: string;
  lightingStyle: string;
  compositionStyle: string;
  paletteHints: string[];
  realismLevel: string;
}

export interface GeneratedImagePreview {
  sectionId: string;
  imagePrompt: string;
  imageStyle: string;
  previewUrl: string;
  status: "simulated" | "generated" | "real" | "failed" | "placeholder";
  imageMode?: ImageMode;
  category?: ProjectCategory;
  realUrl?: string;
  placeholderLabel?: string;
}

export interface GenerationRun {
  id: string;
  projectId: string;
  status: "pending" | "running" | "complete" | "error";
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}
