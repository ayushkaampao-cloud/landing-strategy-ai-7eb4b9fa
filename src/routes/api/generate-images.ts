import { createFileRoute } from "@tanstack/react-router";
import { pollinationsUrl } from "@/lib/ai/prompts";
import type { GeneratedImagePreview, ImageMode, ProjectCategory } from "@/types";

interface Body {
  projectName: string;
  conceptName: string;
  category?: ProjectCategory;
  items: {
    sectionId: string;
    imagePrompt: string;
    imageStyle?: string;
    imageMode?: ImageMode;
    negativePrompt?: string;
    /** Optional nonce so a "regenerate images" action produces a different
     *  seed while still being deterministic within the attempt. */
    seedNonce?: string;
  }[];
}

const PHYSICAL_CATEGORIES: ProjectCategory[] = [
  "dtc_physical_product",
  "beauty_skincare",
  "hardware_device",
  "food_beverage",
];

const PHYSICAL_MODES: ImageMode[] = [
  "product_packshot",
  "product_in_use",
  "material_detail",
  "ingredient_macro",
];

const LABEL_BY_MODE: Record<ImageMode, string> = {
  product_packshot: "Product packshot placeholder",
  product_in_use: "Product in use placeholder",
  material_detail: "Material detail placeholder",
  ingredient_macro: "Ingredient macro placeholder",
  interface_ui: "Interface UI placeholder",
  dashboard_closeup: "Dashboard closeup placeholder",
  comparison_graphic: "Comparison graphic placeholder",
  founder_story_editorial: "Founder / editorial placeholder",
  iconographic_brand_visual: "Brand icon placeholder",
  abstract_brand_texture: "Brand texture placeholder",
  quote_card_visual: "Quote card placeholder",
  data_visual_support: "Data visual placeholder",
  no_image_needed: "No image needed",
};

function inferMode(prompt: string): ImageMode {
  const m = prompt.match(/^\[([a-z_]+)\]/i);
  if (m) return m[1] as ImageMode;
  return "abstract_brand_texture";
}

export const Route = createFileRoute("/api/generate-images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const isPhysicalCategory =
          body.category !== undefined && PHYSICAL_CATEGORIES.includes(body.category);

        const previews: GeneratedImagePreview[] = (body.items ?? []).map((item) => {
          const mode: ImageMode = item.imageMode ?? inferMode(item.imagePrompt);
          const usePlaceholder =
            isPhysicalCategory || PHYSICAL_MODES.includes(mode);

          if (usePlaceholder) {
            return {
              sectionId: item.sectionId,
              imagePrompt: item.imagePrompt,
              imageStyle: item.imageStyle ?? "",
              previewUrl: "",
              status: "placeholder",
              imageMode: mode,
              category: body.category,
              placeholderLabel: LABEL_BY_MODE[mode] ?? "Image placeholder",
            };
          }
          const url = pollinationsUrl(
            item.imagePrompt,
            item.negativePrompt,
            item.sectionId,
            item.seedNonce,
          );
          return {
            sectionId: item.sectionId,
            imagePrompt: item.imagePrompt,
            imageStyle: item.imageStyle ?? "",
            previewUrl: url,
            status: "generated",
            imageMode: mode,
            category: body.category,
          };
        });
        return Response.json({ previews });
      },
    },
  },
});
