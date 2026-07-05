import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { generateConceptsForProject } from "@/lib/generator";
import type { LandingPageConcept, ProjectResearch } from "@/types";

export const Route = createFileRoute("/app/project/$projectId/generating")({
  component: Generating,
});

const STEPS = [
  "Reading brief",
  "Analyzing positioning",
  "Mapping competitor angles",
  "Extracting objections & keywords",
  "Writing 5 strategic directions",
] as const;

function Generating() {
  const { projectId } = Route.useParams();
  const {
    projects,
    products,
    workspaces,
    saveConcepts,
    saveResearch,
  } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const started = useRef(false);

  const project = projects.find((p) => p.id === projectId);
  const product = project ? products.find((p) => p.id === project.productId) : undefined;
  const workspace = project ? workspaces.find((w) => w.id === project.workspaceId) : undefined;

  useEffect(() => {
    if (!project || !product || !workspace) return;
    if (started.current) return;
    started.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, product?.id, workspace?.id]);

  async function run() {
    if (!project || !product || !workspace) return;
    setError(null);
    setStep(1);
    try {
      // 1. Research
      const researchPayload = {
        sourceMode: project.sourceMode ?? "brief",
        projectId: project.id,
        landingPageUrl: project.landingPageUrl,
        siteUrl: product.siteUrl,
        notes: project.notes,
        workspace: {
          name: workspace.name,
          brandDescription: workspace.brandDescription,
          brandVoice: workspace.brandVoice,
          primaryAudience: workspace.primaryAudience,
        },
        product: {
          name: product.name,
          shortDescription: product.shortDescription,
          keyFeatures: product.keyFeatures,
          keyBenefits: product.keyBenefits,
          priceInfo: product.priceInfo,
        },
        project: {
          goal: project.goal,
          tone: project.tone,
          mainProblem: project.mainProblem,
          objections: project.objections,
          competitor: project.competitor,
          desiredAngle: project.desiredAngle,
        },
      };
      setStep(2);
      const rRes = await fetch("/api/research-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(researchPayload),
      });
      let research: ProjectResearch;
      if (!rRes.ok) {
        // Fallback synthetic research so the app never dead-ends
        research = fallbackResearch(project.sourceMode ?? "brief", product, workspace);
        setNote("Research fell back to brief-based inference (LLM unavailable).");
      } else {
        research = (await rRes.json()) as ProjectResearch;
        if (research.note) setNote(research.note);
      }
      saveResearch(project.id, research);

      setStep(3);
      // 2. Strategies
      const sRes = await fetch("/api/generate-strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          workspace: researchPayload.workspace,
          product: researchPayload.product,
          project: researchPayload.project,
          research,
        }),
      });
      setStep(4);
      let concepts: LandingPageConcept[];
      if (!sRes.ok) {
        concepts = generateConceptsForProject(workspace, product, project);
        setNote((n) => n ?? "Strategies fell back to template generator (LLM unavailable).");
      } else {
        const data = (await sRes.json()) as { concepts: LandingPageConcept[] };
        concepts = data.concepts;
        if (!concepts || concepts.length === 0) {
          concepts = generateConceptsForProject(workspace, product, project);
        }
      }
      setStep(5);
      saveConcepts(project.id, concepts);
      setTimeout(() => {
        navigate({
          to: "/app/project/$projectId",
          params: { projectId: project.id },
          replace: true,
        });
      }, 600);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Something went wrong");
      // Last-resort fallback so the user gets something
      const concepts = generateConceptsForProject(workspace, product, project);
      saveConcepts(project.id, concepts);
      setTimeout(() => {
        navigate({
          to: "/app/project/$projectId",
          params: { projectId: project.id },
          replace: true,
        });
      }, 1200);
    }
  }

  if (!project || !product || !workspace) {
    return (
      <>
        <TopBar />
        <div className="p-8 text-sm text-muted-foreground">Project not found.</div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="p-8 max-w-2xl">
        <div className="mono-tag text-accent mb-3">Working</div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">{project.projectName}</h1>
        <p className="text-muted-foreground text-sm mb-10">
          {product.name} · {project.goal} · source: {project.sourceMode ?? "brief"}
        </p>

        <div className="space-y-3">
          {STEPS.map((label, i) => {
            const idx = i + 1;
            const done = idx < step;
            const active = idx === step;
            return (
              <div
                key={label}
                className="flex items-center gap-4 p-4 bg-surface border border-border rounded-lg"
              >
                <div
                  className={`size-8 rounded-md grid place-items-center mono-tag ${
                    done
                      ? "bg-ink text-background"
                      : active
                        ? "bg-accent text-background"
                        : "bg-surface-muted text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : `0${idx}`}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{label}</div>
                  <div className="h-1.5 bg-surface-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full bg-accent transition-all duration-700 ${
                        done ? "w-full" : active ? "w-2/3 animate-pulse" : "w-0"
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {note && (
          <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-xs text-amber-800">
            {note}
          </div>
        )}
        {error && (
          <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-xs text-red-800">
            {error}
          </div>
        )}
      </div>
    </>
  );
}

function fallbackResearch(
  sourceMode: "url" | "brief",
  product: { name: string; keyBenefits: string; keyFeatures: string },
  workspace: { primaryAudience: string; brandDescription: string },
): ProjectResearch {
  const split = (s: string) =>
    s
      .split(/\r?\n|·|•|\||;/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 6);
  return {
    sourceMode,
    summary: `${product.name} targets ${workspace.primaryAudience}. ${workspace.brandDescription}`,
    competitorAngles: ["Legacy incumbents", "Cheap DTC alternatives", "DIY / status quo"],
    keywords: [product.name.toLowerCase(), "best", "review", "vs", "alternative"],
    objections: ["Price", "Trust", "Switching cost", "Will it work for me"],
    trustSignals: ["Verified reviews", "Guarantee", "Founder story", "Press mentions"],
    positioningIdeas: split(product.keyBenefits),
    imageStyleHints: ["Editorial", "Warm natural light", "Real users in context"],
    toneSummary: "Confident and specific — earn the click, don't ask for it.",
    createdAt: new Date().toISOString(),
    note: "Generated locally without LLM (fallback).",
  };
}
