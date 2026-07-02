import type {
  GeneratedImagePreview,
  LandingPageElements,
  ProductImageRef,
  ProductVisualProfile,
  ProjectResearch,
} from "@/types";

const K = {
  research: (projectId: string) => `lpai:research:${projectId}`,
  elements: (conceptId: string) => `lpai:elements:${conceptId}`,
  images: (conceptId: string) => `lpai:images:${conceptId}`,
  productImages: (projectId: string) => `lpai:productImages:${projectId}`,
  visualProfile: (projectId: string) => `lpai:visualProfile:${projectId}`,
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
function safeRemove(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
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

  loadProductImages: (projectId: string) =>
    safeGet<ProductImageRef[]>(K.productImages(projectId)) ?? [],
  saveProductImages: (projectId: string, imgs: ProductImageRef[]) =>
    safeSet(K.productImages(projectId), imgs),

  loadVisualProfile: (projectId: string) =>
    safeGet<ProductVisualProfile | null>(K.visualProfile(projectId)),
  saveVisualProfile: (projectId: string, p: ProductVisualProfile | null) =>
    safeSet(K.visualProfile(projectId), p),

  clearProject: (projectId: string) => {
    safeRemove(K.research(projectId));
    safeRemove(K.productImages(projectId));
    safeRemove(K.visualProfile(projectId));
  },
  clearConcept: (conceptId: string) => {
    safeRemove(K.elements(conceptId));
    safeRemove(K.images(conceptId));
  },
};
