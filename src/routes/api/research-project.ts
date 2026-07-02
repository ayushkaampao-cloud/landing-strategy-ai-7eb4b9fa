import { createFileRoute } from "@tanstack/react-router";
import { callLLMJson } from "@/lib/ai/gateway";
import type { ProjectResearch } from "@/types";

interface Body {
  sourceMode: "url" | "brief";
  landingPageUrl?: string;
  siteUrl?: string;
  notes?: string;
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

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LandingPageAI/1.0 (+research)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return stripped.slice(0, 8000);
  } catch {
    return null;
  }
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

        let pageText: string | null = null;
        let note: string | undefined;
        if (body.sourceMode === "url" && body.landingPageUrl) {
          pageText = await fetchPageText(body.landingPageUrl);
          if (!pageText) {
            note =
              "Landing page couldn't be fetched — using brief-based inference instead.";
          }
        }

        const prompt = buildPrompt(body, pageText);

        try {
          const research = await callLLMJson<Omit<ProjectResearch, "sourceMode" | "createdAt">>(
            prompt,
            {
              system:
                "You are a senior landing-page strategist for e-commerce and performance brands. Return ONLY valid JSON matching the requested schema. Be concrete, category-specific, and useful — never generic.",
              temperature: 0.7,
            },
          );

          const full: ProjectResearch = {
            sourceMode: body.sourceMode,
            summary: research.summary ?? "",
            competitorAngles: arr(research.competitorAngles),
            keywords: arr(research.keywords),
            objections: arr(research.objections),
            trustSignals: arr(research.trustSignals),
            positioningIdeas: arr(research.positioningIdeas),
            imageStyleHints: arr(research.imageStyleHints),
            toneSummary: research.toneSummary ?? "",
            createdAt: new Date().toISOString(),
            note,
          };
          return Response.json(full);
        } catch (err) {
          console.error("[research] error:", err);
          return Response.json(
            { error: (err as Error).message || "Research failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").slice(0, 8);
  return [];
}

function buildPrompt(body: Body, pageText: string | null): string {
  const lines: string[] = [];
  lines.push(`# BRAND`);
  lines.push(`Name: ${body.workspace.name}`);
  lines.push(`Description: ${body.workspace.brandDescription}`);
  lines.push(`Voice: ${body.workspace.brandVoice.join(", ")}`);
  lines.push(`Audience: ${body.workspace.primaryAudience}`);
  lines.push("");
  lines.push(`# PRODUCT`);
  lines.push(`Name: ${body.product.name}`);
  lines.push(`Description: ${body.product.shortDescription}`);
  lines.push(`Features: ${body.product.keyFeatures}`);
  lines.push(`Benefits: ${body.product.keyBenefits}`);
  lines.push(`Price/offer: ${body.product.priceInfo}`);
  lines.push("");
  lines.push(`# PROJECT`);
  lines.push(`Goal: ${body.project.goal}`);
  if (body.project.tone) lines.push(`Tone: ${body.project.tone}`);
  if (body.project.mainProblem) lines.push(`Main problem solved: ${body.project.mainProblem}`);
  if (body.project.objections) lines.push(`Objections: ${body.project.objections}`);
  if (body.project.competitor) lines.push(`Competitor/alternative: ${body.project.competitor}`);
  if (body.project.desiredAngle) lines.push(`Desired angle: ${body.project.desiredAngle}`);
  if (body.notes) lines.push(`Notes: ${body.notes}`);
  lines.push("");
  if (pageText) {
    lines.push(`# EXISTING PAGE TEXT (excerpt)`);
    lines.push(pageText);
    lines.push("");
  }

  lines.push(`# TASK`);
  lines.push(
    `Return a JSON object shaped exactly as:
{
  "summary": string (3-5 sentences of concrete research summary),
  "competitorAngles": string[] (4-6 angles competitors likely use),
  "keywords": string[] (6-10 category / intent keywords buyers actually type),
  "objections": string[] (4-6 real objections this audience raises),
  "trustSignals": string[] (4-6 trust elements that would move this buyer),
  "positioningIdeas": string[] (3-5 sharp positioning angles for this specific product),
  "imageStyleHints": string[] (3-5 visual direction ideas — moods, lighting, subject cues),
  "toneSummary": string (1-2 sentences describing the ideal voice for this page)
}
Be specific to the product/category. No filler. No markdown. JSON only.`,
  );
  return lines.join("\n");
}
