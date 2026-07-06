import type {
  LandingPageElements,
  LandingPageElementsSection,
  SectionProps,
} from "@/types";

function isPlaceholderText(value: string | undefined): boolean {
  if (!value) return true;
  return /^(add |needs your input|placeholder|suggested)/i.test(value.trim());
}

function parseBulletToItem(bullet: string, index: number): { title: string; body: string } {
  const clean = bullet.replace(/^[-•]\s*/, "").trim();
  const bold = clean.match(/^\*\*(.+?)\*\*\s*:?\s*(.*)$/);
  if (bold) return { title: bold[1].trim(), body: bold[2].trim() || clean };

  const split = clean.match(/^([^:—–-]{4,80})\s*[:—–-]\s*(.+)$/);
  if (split) return { title: split[1].trim(), body: split[2].trim() };

  return { title: `Point ${index + 1}`, body: clean };
}

function shouldReplaceItems(section: SectionProps): boolean {
  const items = section.items ?? [];
  if (items.length === 0) return true;
  return items.every((item) => isPlaceholderText(item.title) || isPlaceholderText(item.body));
}

interface MergeOptions {
  editedFields?: Record<string, boolean>;
}

function generatedText(
  value: string | undefined,
  fallback: string | undefined,
  preserveFallback?: boolean,
): string | undefined {
  if (preserveFallback) return fallback;
  return value && value.trim().length > 0 ? value : fallback;
}

function shouldReplaceBullets(section: SectionProps): boolean {
  const bullets = section.bullets ?? [];
  if (bullets.length === 0) return true;
  return bullets.every(isPlaceholderText);
}

function isEdited(
  editedFields: Record<string, boolean> | undefined,
  sectionId: string,
  field: string,
): boolean {
  const prefix = `sections.${sectionId}.${field}`;
  return Object.keys(editedFields ?? {}).some((path) => path === prefix || path.startsWith(`${prefix}.`));
}

function mergeSectionElement(
  section: SectionProps,
  element: LandingPageElementsSection | undefined,
  options: MergeOptions = {},
): SectionProps {
  if (!element) return section;

  const itemDriven =
    section.type === "feature-grid" ||
    section.type === "faq" ||
    section.type === "comparison";
  const elementBullets = element.bullets ?? [];
  const nextItems =
    isEdited(options.editedFields, section.id, "items")
      ? section.items
    : itemDriven && elementBullets.length > 0
      ? elementBullets.map(parseBulletToItem)
      : itemDriven && shouldReplaceItems(section) && element.body
        ? [{ title: element.headline || section.title || "Details", body: element.body }]
      : section.items;

  return {
    ...section,
    title: generatedText(element.headline, section.title, isEdited(options.editedFields, section.id, "title")),
    subtitle: generatedText(element.subheadline, section.subtitle, isEdited(options.editedFields, section.id, "subtitle")),
    body: generatedText(element.body, section.body, isEdited(options.editedFields, section.id, "body")),
    bullets: itemDriven
      ? section.bullets
      : isEdited(options.editedFields, section.id, "bullets")
        ? section.bullets
        : element.bullets && element.bullets.length > 0
        ? element.bullets ?? section.bullets
        : section.bullets,
    ctaLabel: generatedText(element.cta, section.ctaLabel, isEdited(options.editedFields, section.id, "ctaLabel")),
    imagePrompt: element.imagePrompts?.[0] ?? section.imagePrompt,
    imageMode: element.imageMode ?? section.imageMode,
    negativePrompt: element.negativePrompt ?? section.negativePrompt,
    proofNeeded: element.proofNeeded ?? section.proofNeeded,
    placeholder: element.placeholder ?? section.placeholder,
    items: nextItems,
  };
}

export function mergeElementsIntoSections(
  sections: SectionProps[],
  elements: LandingPageElements | null,
  options: MergeOptions = {},
): SectionProps[] {
  if (!elements) return sections;

  const byId = new Map(elements.sections.map((section) => [section.sectionId, section]));
  return sections.map((section) => {
    if (section.type === "hero") {
      const heroElement = byId.get(section.id);
      return mergeSectionElement(
        {
          ...section,
          title: generatedText(elements.hero.headline, section.title, isEdited(options.editedFields, section.id, "title")),
          subtitle: generatedText(elements.hero.subheadline, section.subtitle, isEdited(options.editedFields, section.id, "subtitle")),
          ctaLabel: generatedText(elements.hero.primaryCTA, section.ctaLabel, isEdited(options.editedFields, section.id, "ctaLabel")),
          ctaSecondaryLabel: generatedText(elements.hero.secondaryCTA, section.ctaSecondaryLabel, isEdited(options.editedFields, section.id, "ctaSecondaryLabel")),
          imagePrompt: elements.hero.imagePrompts?.[0] ?? section.imagePrompt,
          imageMode: heroElement?.imageMode ?? section.imageMode ?? "product_packshot",
          negativePrompt: heroElement?.negativePrompt ?? section.negativePrompt,
          placeholder: elements.hero.placeholder ?? heroElement?.placeholder ?? section.placeholder,
          proofNeeded: heroElement?.proofNeeded ?? section.proofNeeded,
        },
        heroElement,
        options,
      );
    }
    return mergeSectionElement(section, byId.get(section.id), options);
  });
}