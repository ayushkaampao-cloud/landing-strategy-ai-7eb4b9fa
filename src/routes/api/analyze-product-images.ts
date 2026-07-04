import { createFileRoute } from "@tanstack/react-router";
import type { ProductVisualProfile, ProjectCategory } from "@/types";

interface Body {
  projectId?: string;
  category?: ProjectCategory;
  images: { dataUrl: string }[];
}

const GEMINI_MULTIMODAL_MODEL = "google/gemini-2.5-flash";
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const PER_IMAGE_PROMPT =
  "Describe this product's exact visible shape, color, material, packaging, and setting in 2-3 factual sentences. Only describe what is visibly shown — do not invent details.";

/** Fire one multimodal chat completion for one image. Returns the plain
 *  description, or null on failure so the batch keeps going. */
async function describeImage(dataUrl: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(LOVABLE_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GEMINI_MULTIMODAL_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PER_IMAGE_PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.warn("[analyze-product-images] image call failed:", res.status);
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (err) {
    console.warn("[analyze-product-images] image call error:", (err as Error).message);
    return null;
  }
}

function fallbackProfile(count: number): ProductVisualProfile {
  return {
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
    summaryText: "",
    sourcePhotoCount: count,
  };
}

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
          return Response.json({ profile: null, mode: "no_images" });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          console.warn("[analyze-product-images] LOVABLE_API_KEY missing");
          return Response.json(
            { profile: fallbackProfile(images.length), mode: "no_api_key" },
            { status: 200 },
          );
        }

        // Cap at 8 images so we don't melt the gateway on a huge upload.
        const capped = images.slice(0, 8);

        const descriptions: string[] = [];
        for (const img of capped) {
          if (!img?.dataUrl) continue;
          const d = await describeImage(img.dataUrl, apiKey);
          if (d) descriptions.push(d);
        }

        if (descriptions.length === 0) {
          return Response.json(
            { profile: fallbackProfile(images.length), mode: "vision_failed" },
            { status: 200 },
          );
        }

        const summaryText =
          descriptions.length === 1
            ? descriptions[0]
            : descriptions
                .map((d, i) => `Photo ${i + 1}: ${d}`)
                .join(" ");

        const profile: ProductVisualProfile = {
          ...fallbackProfile(descriptions.length),
          summaryText,
          photoConsistencyNotes:
            "Grounded from uploaded product photos. Downstream image prompts must match the summaryText description.",
        };

        return Response.json({ profile, mode: "grounded" });
      },
    },
  },
});
