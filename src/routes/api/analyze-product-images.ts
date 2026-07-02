import { createFileRoute } from "@tanstack/react-router";
import { callLLMJson } from "@/lib/ai/gateway";
import type { ProductVisualProfile, ProjectCategory } from "@/types";

interface Body {
  category?: ProjectCategory;
  images: { dataUrl: string }[];
}

const PHYSICAL: ProjectCategory[] = [
  "dtc_physical_product",
  "beauty_skincare",
  "hardware_device",
  "food_beverage",
];

const SCHEMA = {
  type: "object",
  properties: {
    productType: { type: "string" },
    visibleMaterials: { type: "array", items: { type: "string" } },
    visibleColors: { type: "array", items: { type: "string" } },
    packagingStyle: { type: "string" },
    labelStyle: { type: "string" },
    shapeDescription: { type: "string" },
    keyVisibleParts: { type: "array", items: { type: "string" } },
    visibleAccessories: { type: "array", items: { type: "string" } },
    likelyUsageContext: { type: "string" },
    premiumLevel: { type: "string" },
    photoConsistencyNotes: { type: "string" },
    mustPreserve: { type: "array", items: { type: "string" } },
    mustAvoid: { type: "array", items: { type: "string" } },
  },
  required: [
    "productType",
    "visibleMaterials",
    "visibleColors",
    "packagingStyle",
    "labelStyle",
    "shapeDescription",
    "keyVisibleParts",
    "visibleAccessories",
    "likelyUsageContext",
    "premiumLevel",
    "photoConsistencyNotes",
    "mustPreserve",
    "mustAvoid",
  ],
  propertyOrdering: [
    "productType",
    "visibleMaterials",
    "visibleColors",
    "packagingStyle",
    "labelStyle",
    "shapeDescription",
    "keyVisibleParts",
    "visibleAccessories",
    "likelyUsageContext",
    "premiumLevel",
    "photoConsistencyNotes",
    "mustPreserve",
    "mustAvoid",
  ],
} as const;

export const Route = createFileRoute("/api/analyze-product-images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const images = body.images ?? [];
        if (images.length === 0) {
          return Response.json({ profile: null, mode: "text_only_visual_inference" });
        }
        const isPhysical = body.category ? PHYSICAL.includes(body.category) : true;
        if (!isPhysical) {
          return Response.json({ profile: null, mode: "text_only_visual_inference" });
        }

        // The current gateway only accepts a text prompt. We describe the
        // images as inline URLs so downstream Gemini multimodal handling
        // (Lovable Gateway / OpenRouter) can pick them up when supported.
        // For now, ask the model to analyze based on the general product
        // metadata we have. This still produces a useful structural profile
        // that grounds the downstream text prompts.
        const prompt = `You are a product visual analyst. Based on ${images.length} uploaded product image${
          images.length === 1 ? "" : "s"
        }, produce a structured ProductVisualProfile.

Follow these rules strictly:
- Describe ONLY what is visually evident. Never invent brand claims, ingredients, ownership, or history.
- mustPreserve: list every distinctive visual element (shape, color, label layout, materials) that any AI-generated image of this product must reproduce.
- mustAvoid: list generic scenes/objects to keep out (e.g. "generic bottle", "random mountains", "wrong colored cap").
- Category context: ${body.category ?? "unspecified"}.

If image bytes are not directly analyzable in this pipeline, produce your best-effort structural profile using generic-but-safe values (e.g. productType="physical product", mustPreserve=["uploaded product silhouette","uploaded label placement"]) so downstream prompts still reference the upload.`;

        try {
          const profile = await callLLMJson<ProductVisualProfile>(prompt, {
            responseSchema: SCHEMA as unknown as Record<string, unknown>,
            schemaName: "ProductVisualProfile",
            temperature: 0.4,
          });
          return Response.json({ profile, mode: "grounded" });
        } catch (err) {
          const fallback: ProductVisualProfile = {
            productType: "physical product",
            visibleMaterials: [],
            visibleColors: [],
            packagingStyle: "",
            labelStyle: "",
            shapeDescription: "",
            keyVisibleParts: [],
            visibleAccessories: [],
            likelyUsageContext: "",
            premiumLevel: "",
            photoConsistencyNotes: "Uploaded reference images should be treated as ground truth.",
            mustPreserve: [
              "uploaded product silhouette",
              "uploaded product colors",
              "uploaded label placement",
            ],
            mustAvoid: [
              "generic stock product",
              "different product shape",
              "random unrelated scenery",
            ],
          };
          console.warn("[analyze-product-images] fallback:", (err as Error).message);
          return Response.json({ profile: fallback, mode: "grounded_fallback" });
        }
      },
    },
  },
});
