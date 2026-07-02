import { createFileRoute } from "@tanstack/react-router";
import { callLLMJson } from "@/lib/ai/gateway";
import type { ProjectClassification } from "@/types";

interface Body {
  workspace: { name: string; brandDescription: string; primaryAudience: string };
  product: { name: string; shortDescription: string; keyFeatures: string; keyBenefits: string };
  project?: { goal?: string; tone?: string; notes?: string };
}

const SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: [
        "b2b_saas",
        "finance_software",
        "dtc_physical_product",
        "beauty_skincare",
        "service_consulting",
        "hardware_device",
        "food_beverage",
        "other",
      ],
    },
    subcategory: { type: "string" },
    audienceSophistication: { type: "string", enum: ["beginner", "intermediate", "expert"] },
    awarenessLevel: {
      type: "string",
      enum: ["unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"],
    },
    toneSummary: { type: "string" },
  },
  required: ["category", "subcategory", "audienceSophistication", "awarenessLevel", "toneSummary"],
  propertyOrdering: ["category", "subcategory", "audienceSophistication", "awarenessLevel", "toneSummary"],
};

export async function classifyProject(body: Body): Promise<ProjectClassification> {
  const prompt = [
    `Classify the following product/brand into one of the fixed categories.`,
    `Return JSON only.`,
    ``,
    `BRAND: ${body.workspace.name} — ${body.workspace.brandDescription}`,
    `AUDIENCE: ${body.workspace.primaryAudience}`,
    `PRODUCT: ${body.product.name} — ${body.product.shortDescription}`,
    `FEATURES: ${body.product.keyFeatures}`,
    `BENEFITS: ${body.product.keyBenefits}`,
    body.project?.goal ? `GOAL: ${body.project.goal}` : ``,
    body.project?.tone ? `TONE: ${body.project.tone}` : ``,
    body.project?.notes ? `NOTES: ${body.project.notes}` : ``,
  ]
    .filter(Boolean)
    .join("\n");
  return callLLMJson<ProjectClassification>(prompt, {
    system:
      "You are a category classifier for landing-page strategy. Return ONLY valid JSON matching the requested schema. Choose the single best category — if it's software choose b2b_saas or finance_software, if it's a physical consumable choose dtc_physical_product / beauty_skincare / food_beverage, etc.",
    temperature: 0.2,
    responseSchema: SCHEMA,
    schemaName: "ProjectClassification",
  });
}

export const Route = createFileRoute("/api/classify-project")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        try {
          const cls = await classifyProject(body);
          return Response.json(cls);
        } catch (err) {
          console.error("[classify] error:", err);
          return Response.json(
            { error: (err as Error).message || "Classification failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
