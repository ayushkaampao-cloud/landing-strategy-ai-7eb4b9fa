import type {
  GeneratedImagePreview,
  LandingPageElements,
  ProjectResearch,
} from "@/types";

// Extra per-entity storage keyed by projectId / conceptId.
// The core app state (workspaces/products/projects/concepts) lives in the
// store's main STORAGE_KEY. This file adds research/elements/images which are
// verbose enough to keep on their own keys.

const K = {
  research: (projectId: string) => `lpai:research:${projectId}`,
  elements: (conceptId: string) => `lpai:elements:${conceptId}`,
  images: (conceptId: string) => `lpai:images:${conceptId}`,
};

function safeGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function safeSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — ignore */
  }
}

export const storage = {
  loadResearch: (projectId: string) =>
    safeGet<ProjectResearch>(K.research(projectId)),
  saveResearch: (projectId: string, r: ProjectResearch) =>
    safeSet(K.research(projectId), r),

  loadElements: (conceptId: string) =>
    safeGet<LandingPageElements>(K.elements(conceptId)),
  saveElements: (conceptId: string, e: LandingPageElements) =>
    safeSet(K.elements(conceptId), e),

  loadImages: (conceptId: string) =>
    safeGet<GeneratedImagePreview[]>(K.images(conceptId)) ?? [],
  saveImages: (conceptId: string, imgs: GeneratedImagePreview[]) =>
    safeSet(K.images(conceptId), imgs),
};
