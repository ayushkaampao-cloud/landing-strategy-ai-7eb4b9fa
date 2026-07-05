import { createFileRoute } from "@tanstack/react-router";
import { callLLMJson } from "@/lib/ai/gateway";
import { classifyProject } from "@/routes/api/classify-project";
import { categoryGuidance } from "@/lib/ai/prompts";
import type { ProjectClassification, ProjectResearch } from "@/types";

interface Body {
  sourceMode: "url" | "brief";
  landingPageUrl?: string;
  siteUrl?: string;
  notes?: string;
  /** Optional — when present, the server loads product_visual_profiles for
   *  this project and passes its visibleColors to the classifier to derive
   *  an on-brand themePalette from real product photos. */
  projectId?: string;
  workspace: {
    name: string;
    brandDescription: string;
    brandVoice: string[];
    primaryAudience: string;
  };
  product: {
    name: string;
    shortDescription: string;
    keyFeatures: string;
    keyBenefits: string;
    priceInfo: string;
  };
  project: {
    goal: string;
    tone?: string;
    mainProblem?: string;
    objections?: string;
    competitor?: string;
    desiredAngle?: string;
  };
}

const RESEARCH_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    competitorAngles: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    objections: { type: "array", items: { type: "string" } },
    trustSignals: { type: "array", items: { type: "string" } },
    trustSignalsNeeded: { type: "array", items: { type: "string" } },
    positioningIdeas: { type: "array", items: { type: "string" } },
    imageStyleHints: { type: "array", items: { type: "string" } },
    toneSummary: { type: "string" },
    verifiedFacts: { type: "array", items: { type: "string" } },
    forbiddenClaims: { type: "array", items: { type: "string" } },
  },
  required: [
    "summary",
    "competitorAngles",
    "keywords",
    "objections",
    "trustSignals",
    "trustSignalsNeeded",
    "positioningIdeas",
    "imageStyleHints",
    "toneSummary",
    "verifiedFacts",
    "forbiddenClaims",
  ],
  propertyOrdering: [
    "summary",
    "competitorAngles",
    "keywords",
    "objections",
    "trustSignals",
    "trustSignalsNeeded",
    "positioningIdeas",
    "imageStyleHints",
    "toneSummary",
    "verifiedFacts",
    "forbiddenClaims",
  ],
};

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LandingPageAI/1.0 (+research)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);
  } catch {
    return null;
  }
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 10) : [];
}

export const Route = createFileRoute("/api/research-project")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        let note: string | undefined;
        let pageText: string | null = null;
        if (body.sourceMode === "url" && body.landingPageUrl) {
          pageText = await fetchPageText(body.landingPageUrl);
          if (!pageText) note = "Landing page couldn't be fetched — using brief-based inference instead.";
        }

        try {
          // Step 0: load visibleColors from product_visual_profiles if
          // this project already has an analyzed profile; used to derive
          // an on-brand themePalette from real product photos.
          let visibleColors: string[] | undefined;
          if (body.projectId) {
            try {
              const { supabaseAdmin } = await import(
                "@/integrations/supabase/client.server"
              );
              const { data } = await supabaseAdmin
                .from("product_visual_profiles")
                .select("profile")
                .eq("project_id", body.projectId)
                .maybeSingle();
              const profile = (data?.profile ?? null) as
                | { visibleColors?: string[] }
                | null;
              if (Array.isArray(profile?.visibleColors)) {
                visibleColors = profile!.visibleColors;
              }
            } catch (e) {
              console.warn(
                "[research] visual-profile lookup failed:",
                (e as Error).message,
              );
            }
          }

          // Step 1: classify.
          let classification: ProjectClassification | undefined;
          try {
            classification = await classifyProject({
              workspace: {
                name: body.workspace.name,
                brandDescription: body.workspace.brandDescription,
                primaryAudience: body.workspace.primaryAudience,
              },
              product: {
                name: body.product.name,
                shortDescription: body.product.shortDescription,
                keyFeatures: body.product.keyFeatures,
                keyBenefits: body.product.keyBenefits,
              },
              project: {
                goal: body.project.goal,
                tone: body.project.tone,
                notes: body.notes,
              },
              visibleColors,
            });
          } catch (e) {
            console.warn("[research] classify failed, continuing:", (e as Error).message);
          }

          // Step 2: research with classification-aware prompt.
          const prompt = buildPrompt(body, pageText, classification);
          const research = await callLLMJson<Partial<ProjectResearch>>(prompt, {
            system:
              "You are a senior landing-page strategist. Return ONLY valid JSON matching the schema. Be concrete and category-specific. Never fabricate reviews, ratings, press mentions, guarantees, or metrics — those go in forbiddenClaims. Only include a fact in verifiedFacts if it was explicitly provided in the input or extracted verbatim from the fetched page text.",
            temperature: 0.6,
            responseSchema: RESEARCH_SCHEMA,
            schemaName: "ProjectResearch",
          });

          const full: ProjectResearch = {
            sourceMode: body.sourceMode,
            summary: research.summary ?? "",
            competitorAngles: arr(research.competitorAngles),
            keywords: arr(research.keywords),
            objections: arr(research.objections),
            trustSignals: arr(research.trustSignals),
            trustSignalsNeeded: arr(research.trustSignalsNeeded),
            positioningIdeas: arr(research.positioningIdeas),
            imageStyleHints: arr(research.imageStyleHints),
            toneSummary: research.toneSummary ?? classification?.toneSummary ?? "",
            verifiedFacts: arr(research.verifiedFacts),
            forbiddenClaims: arr(research.forbiddenClaims),
            classification,
            createdAt: new Date().toISOString(),
            note,
          };
          return Response.json(full);
        } catch (err) {
          console.error("[research] error:", err);
          // Return 200 with fallback flag so the client can degrade gracefully
          // without triggering the app-level error reporter / blank screen.
          return Response.json({
            fallback: true,
            error: (err as Error).message || "Research failed",
          });
        }
      },
    },
  },
});

function buildPrompt(body: Body, pageText: string | null, cls?: ProjectClassification): string {
  const lines: string[] = [];
  lines.push(categoryGuidance(cls));
  lines.push("");
  lines.push(`# BRAND`);
  lines.push(`${body.workspace.name} — ${body.workspace.brandDescription}`);
  lines.push(`Voice: ${body.workspace.brandVoice.join(", ")}`);
  lines.push(`Audience: ${body.workspace.primaryAudience}`);
  lines.push("");
  lines.push(`# PRODUCT`);
  lines.push(`${body.product.name} — ${body.product.shortDescription}`);
  lines.push(`Features: ${body.product.keyFeatures}`);
  lines.push(`Benefits: ${body.product.keyBenefits}`);
  lines.push(`Price/offer: ${body.product.priceInfo}`);
  lines.push("");
  lines.push(`# PROJECT`);
  lines.push(`Goal: ${body.project.goal}`);
  if (body.project.tone) lines.push(`Tone: ${body.project.tone}`);
  if (body.project.mainProblem) lines.push(`Main problem: ${body.project.mainProblem}`);
  if (body.project.objections) lines.push(`Objections: ${body.project.objections}`);
  if (body.project.competitor) lines.push(`Competitor/alternative: ${body.project.competitor}`);
  if (body.project.desiredAngle) lines.push(`Desired angle: ${body.project.desiredAngle}`);
  if (body.notes) lines.push(`Notes: ${body.notes}`);
  lines.push("");
  if (pageText) {
    lines.push(`# EXISTING PAGE TEXT (excerpt — treat as verifiable source)`);
    lines.push(pageText);
    lines.push("");
  }
  lines.push(`# TASK`);
  lines.push(
    `Return research JSON with:
- summary: 3-5 sentences of concrete, category-appropriate research.
- competitorAngles[]: 4-6 angles competitors likely use in this category.
- keywords[]: 6-10 category / intent keywords buyers actually type.
- objections[]: 4-6 real objections THIS audience raises for THIS category.
- trustSignals[]: existing trust signals visible in the brief or fetched page ONLY (facts).
- trustSignalsNeeded[]: 4-6 trust signals this buyer would move on but which have NOT been provided yet.
- positioningIdeas[]: 3-5 sharp category-native positioning angles.
- imageStyleHints[]: 3-5 visual direction ideas appropriate to the category (do NOT suggest nature/landscape/random scenery).
- toneSummary: 1-2 sentences on ideal voice.
- verifiedFacts[]: ONLY facts explicitly provided in the input or extracted verbatim from the page. If in doubt, leave it out.
- forbiddenClaims[]: things the copywriter must NOT invent. Always include the ones missing from the brief, e.g. "no review counts provided", "no press mentions provided", "no guarantee terms provided", "no shipping/warehouse claims provided", "no certifications provided", "no repeat-purchase or return-rate metrics provided".

No filler. No markdown. JSON only.`,
  );
  return lines.join("\n");
}
