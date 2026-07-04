// Client-side wrapper around Puter.js text-to-image.
// The script tag is injected in src/routes/__root.tsx.

import type { ImageMode, ProductImageRef, ProductVisualProfile } from "@/types";

declare global {
  interface Window {
    puter?: {
      ai?: {
        txt2img?: (
          prompt: string,
          options?: Record<string, unknown>,
        ) => Promise<HTMLImageElement | string | { src?: string; url?: string }>;
      };
    };
  }
}

export async function ensurePuter(timeoutMs = 6000): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.puter?.ai?.txt2img) return true;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.puter?.ai?.txt2img) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return !!window.puter?.ai?.txt2img;
}

function modelFor(mode?: ImageMode): string | undefined {
  switch (mode) {
    case "product_packshot":
    case "product_in_use":
    case "material_detail":
    case "ingredient_macro":
      return "gpt-image-1"; // photoreal-capable
    case "interface_ui":
    case "dashboard_closeup":
    case "comparison_graphic":
    case "data_visual_support":
      return "gpt-image-1";
    default:
      return undefined; // Puter default
  }
}

const DEFAULT_NEGATIVE =
  "landscapes, mountains, oceans, forests, sunsets, beaches, travel scenes, random people, animals, wildlife, unrelated fruit, unrelated objects, generic stock photo, altered product shape, altered label placement, text overlays, watermarks, logo overlays";

export interface GenerateRealImageInput {
  prompt: string;
  negativePrompt?: string;
  imageMode?: ImageMode;
  visualProfile?: ProductVisualProfile | null;
  referenceImages?: ProductImageRef[];
}

function buildFullPrompt(input: GenerateRealImageInput): string {
  const parts: string[] = [];
  if ((input.referenceImages?.length ?? 0) > 0) {
    parts.push(
      `Match the uploaded product reference exactly: preserve silhouette, proportions, label placement, and color.`,
    );
  }
  parts.push(input.prompt.trim());
  if (input.visualProfile) {
    const p = input.visualProfile;
    // Prefer summaryText — it's the observed description from the uploaded
    // photos. The structural fields are only populated when a richer vision
    // pipeline fills them; skip any that are empty so we never inject
    // invented attributes.
    if (p.summaryText?.trim()) {
      parts.push(
        `Product must visually match this exact description from the uploaded photos: ${p.summaryText.trim()}`,
      );
    }
    const grounding = [
      p.mustPreserve?.length && `Preserve: ${p.mustPreserve.join(", ")}`,
      p.visibleMaterials?.length && `Materials: ${p.visibleMaterials.join(", ")}`,
      p.visibleColors?.length && `Colors: ${p.visibleColors.join(", ")}`,
      p.labelStyle && `Label style: ${p.labelStyle}`,
      p.shapeDescription && `Shape: ${p.shapeDescription}`,
      p.mustAvoid?.length && `Avoid also: ${p.mustAvoid.join(", ")}`,
    ]
      .filter(Boolean)
      .join(". ");
    if (grounding) parts.push(`Product visual grounding — ${grounding}.`);
  }
  const neg = input.negativePrompt?.trim() || DEFAULT_NEGATIVE;
  parts.push(`Avoid: ${neg}.`);
  return parts.join(" ");
}

export async function generateRealImage(
  input: GenerateRealImageInput,
): Promise<string> {
  const ok = await ensurePuter();
  if (!ok || !window.puter?.ai?.txt2img) {
    throw new Error("Puter.js not available");
  }
  const fullPrompt = buildFullPrompt(input);
  const model = modelFor(input.imageMode);
  const options: Record<string, unknown> = {};
  if (model) options.model = model;

  const result = await Promise.race([
    window.puter.ai.txt2img(fullPrompt, options),
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error("Image generation timed out")), 45000),
    ),
  ]);

  if (typeof result === "string") return result;
  if (result instanceof HTMLImageElement) return result.src;
  if (result && typeof result === "object") {
    const r = result as { src?: string; url?: string };
    if (r.src) return r.src;
    if (r.url) return r.url;
  }
  throw new Error("Puter returned unexpected result");
}
