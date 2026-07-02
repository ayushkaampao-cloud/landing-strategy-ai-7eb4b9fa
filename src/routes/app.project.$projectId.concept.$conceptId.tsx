import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { FRAMEWORK_META, generateConceptsForProject } from "@/lib/generator";
import { SectionRenderer } from "@/components/SectionRenderer";
import { useMemo, useState } from "react";
import type { GeneratedImagePreview, LandingPageElements } from "@/types";

export const Route = createFileRoute("/app/project/$projectId/concept/$conceptId")({
  component: ConceptDetail,
});

function ConceptDetail() {
  const { projectId, conceptId } = Route.useParams();
  const {
    projects,
    products,
    workspaces,
    concepts,
    saveConcepts,
    getResearch,
    getElements,
    saveElements,
    getImages,
    saveImages,
  } = useStore();
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);
  const [elementsLoading, setElementsLoading] = useState(false);
  const [elementsError, setElementsError] = useState<string | null>(null);
  const [elementsStep, setElementsStep] = useState(0);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [elementsVersion, setElementsVersion] = useState(0);
  const [imagesVersion, setImagesVersion] = useState(0);


  const project = projects.find((p) => p.id === projectId);
  const product = products.find((p) => p.id === project?.productId);
  const workspace = workspaces.find((w) => w.id === project?.workspaceId);
  const concept = concepts.find((c) => c.id === conceptId);

  if (!project || !concept || !product || !workspace) {
    return (
      <>
        <TopBar />
        <div className="p-8 text-sm text-muted-foreground">Concept not found.</div>
      </>
    );
  }

  const meta = FRAMEWORK_META[concept.templateFamily];

  const fullText = () => {
    const lines: string[] = [
      `# ${concept.conceptName}`,
      `Framework: ${concept.templateFamily}`,
      `Strategy: ${concept.oneLineStrategy}`,
      `Best traffic: ${concept.bestTrafficType}`,
      "",
    ];
    concept.schema.sections.forEach((s, i) => {
      lines.push(`## ${i + 1}. ${s.type.toUpperCase()}${s.title ? ` — ${s.title}` : ""}`);
      if (s.highlight) lines.push(`[${s.highlight}]`);
      if (s.subtitle) lines.push(s.subtitle);
      if (s.body) lines.push(s.body);
      if (s.bullets) s.bullets.forEach((b) => lines.push(`- ${b}`));
      if (s.items) s.items.forEach((it) => lines.push(`• ${it.title}: ${it.body}`));
      if (s.ctaLabel) lines.push(`[CTA: ${s.ctaLabel}]`);
      lines.push("");
    });
    return lines.join("\n");
  };

  const heroText = () => {
    const hero = concept.schema.sections.find((s) => s.type === "hero");
    if (!hero) return "";
    return [hero.highlight, hero.title, hero.subtitle, hero.ctaLabel]
      .filter(Boolean)
      .join("\n");
  };

  const outlineText = () =>
    concept.schema.sections
      .map((s, i) => `${i + 1}. ${s.type}${s.title ? ` — ${s.title}` : ""}`)
      .join("\n");

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* noop */
    }
  };

  const [regenerating, setRegenerating] = useState(false);
  const regenerate = async () => {
    if (!workspace || !product || !project) return;
    setRegenerating(true);
    try {
      const research =
        getResearch(projectId) ?? null;
      if (!research) {
        // No research cached — bounce through the full generating flow.
        navigate({
          to: "/app/project/$projectId/generating",
          params: { projectId },
          replace: true,
        });
        return;
      }
      const res = await fetch("/api/generate-strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
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
            desiredAngle: project.desiredAngle,
          },
          research,
          onlyFamily: concept.templateFamily,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { concepts: import("@/types").LandingPageConcept[] };
      const fresh = data.concepts[0];
      if (!fresh) throw new Error("No concept returned");
      // Replace only the current framework's concept, keep the others.
      const others = concepts.filter(
        (c) => c.projectId !== project.id || c.templateFamily !== concept.templateFamily,
      );
      saveConcepts(project.id, [...others.filter((c) => c.projectId === project.id), fresh]);
      navigate({
        to: "/app/project/$projectId/concept/$conceptId",
        params: { projectId, conceptId: fresh.id },
        replace: true,
      });
    } catch (err) {
      console.error("[regenerate] error:", err);
      // Last-resort fallback so the app never dead-ends.
      const fresh = generateConceptsForProject(workspace, product, project);
      saveConcepts(project.id, fresh);
      const swap = fresh.find((c) => c.templateFamily === concept.templateFamily);
      if (swap) {
        navigate({
          to: "/app/project/$projectId/concept/$conceptId",
          params: { projectId, conceptId: swap.id },
          replace: true,
        });
      }
    } finally {
      setRegenerating(false);
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const research = getResearch(projectId);
  const elements = useMemo(
    () => getElements(conceptId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conceptId, elementsVersion],
  );
  const images = useMemo(
    () => getImages(conceptId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conceptId, imagesVersion],
  );
  const imageBySection = useMemo(() => {
    const map: Record<string, GeneratedImagePreview> = {};
    images.forEach((i) => (map[i.sectionId] = i));
    return map;
  }, [images]);

  async function handleGenerateElements() {
    setElementsLoading(true);
    setElementsError(null);
    setElementsStep(1);
    try {
      const stepTimer = setInterval(() => setElementsStep((s) => Math.min(s + 1, 4)), 700);
      const res = await fetch("/api/generate-elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept,
          workspace: {
            name: workspace!.name,
            brandDescription: workspace!.brandDescription,
            primaryAudience: workspace!.primaryAudience,
          },
          product: {
            name: product!.name,
            shortDescription: product!.shortDescription,
            priceInfo: product!.priceInfo,
          },
          research: research ?? undefined,
          classification: research?.classification,
        }),
      });
      clearInterval(stepTimer);
      if (!res.ok) throw new Error((await res.text()) || "Element generation failed");
      const data = (await res.json()) as LandingPageElements;
      saveElements(conceptId, data);
      setElementsVersion((v) => v + 1);
      setElementsStep(4);
    } catch (err) {
      setElementsError((err as Error).message);
    } finally {
      setElementsLoading(false);
    }
  }

  async function handleGenerateImages() {
    if (!elements) return;
    setImagesLoading(true);
    setImagesError(null);
    try {
      const items = [
        ...elements.hero.imagePrompts.map((p, i) => ({
          sectionId: `hero-${i}`,
          imagePrompt: p,
          imageStyle: elements.globalStyle.imageStyle,
        })),
        ...elements.sections.flatMap((sec) =>
          (sec.imagePrompts ?? []).map((p) => ({
            sectionId: sec.sectionId,
            imagePrompt: p,
            imageStyle: elements.globalStyle.imageStyle,
            imageMode: sec.imageMode,
          })),
        ),
      ];
      const res = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project!.projectName,
          conceptName: concept!.conceptName,
          category: research?.classification?.category,
          items,
        }),
      });
      if (!res.ok) throw new Error("Image generation failed");
      const data = (await res.json()) as { previews: GeneratedImagePreview[] };
      saveImages(conceptId, data.previews);
      setImagesVersion((v) => v + 1);
    } catch (err) {
      setImagesError((err as Error).message);
    } finally {
      setImagesLoading(false);
    }
  }


  return (
    <>
      <TopBar>
        <Link
          to="/app/project/$projectId"
          params={{ projectId }}
          className="mono-tag text-muted-foreground hover:text-foreground"
        >
          ← All 5 concepts
        </Link>
      </TopBar>
      <div className="grid grid-cols-12 min-h-[calc(100vh-56px)]">
        {/* Preview surface — LEFT */}
        <main className="col-span-12 lg:col-span-8 xl:col-span-9 p-6 lg:p-10 bg-surface-muted/50 border-r border-border">
          <div className="max-w-3xl mx-auto bg-surface ring-soft rounded-xl overflow-hidden shadow-elevated">
            <div className="h-9 border-b border-border bg-surface-muted flex items-center px-3 gap-1.5">
              <div className="size-2.5 rounded-full bg-border" />
              <div className="size-2.5 rounded-full bg-border" />
              <div className="size-2.5 rounded-full bg-border" />
              <div className="mono-tag text-muted-foreground ml-3 truncate">
                {product.name.toLowerCase().replace(/\s+/g, "-")}.com
              </div>
              <div className={`ml-auto mono-tag px-2 py-0.5 rounded ${meta.accentClass.split(" ").filter(c => c.startsWith("text-")).join(" ")} bg-background ring-soft`}>
                {meta.code}
              </div>
            </div>
            <div>
              {concept.schema.sections.map((s) => {
                const img = imageBySection[s.id];
                return (
                  <div key={s.id} id={`section-${s.id}`}>
                    <SectionRenderer section={s} />
                    {img && (
                      <div className="px-10 pb-10 -mt-6">
                        <div className="rounded-lg overflow-hidden ring-soft">
                          <img
                            src={img.previewUrl}
                            alt="Section preview"
                            className="w-full h-auto block"
                            loading="lazy"
                          />
                          <div className="px-3 py-2 bg-surface-muted flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="mono-tag">Preview image · Simulated</span>
                            <span className="truncate max-w-[60%]">{img.imagePrompt}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </main>

        {/* Strategy rail — RIGHT */}
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 bg-background lg:sticky lg:top-14 lg:self-start lg:h-[calc(100vh-56px)] lg:overflow-y-auto">
          <div className={`h-1 w-full ${meta.accentDot}`} />
          <div className="p-7">
            <div className="flex items-center gap-2 mb-3">
              <span className={`mono-tag px-2 py-0.5 rounded ring-soft ${meta.accentClass.split(" ").filter(c => c.startsWith("text-")).join(" ")}`}>
                {meta.code}
              </span>
              <span className="mono-tag text-muted-foreground">{meta.length} format</span>
            </div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {concept.templateFamily}
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight mb-3 leading-tight">
              {concept.conceptName}
            </h1>
            <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
              {concept.oneLineStrategy}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-6">
              <div className="p-3 bg-surface border border-border rounded-lg">
                <div className="mono-tag text-muted-foreground mb-1">Best traffic</div>
                <div className="text-xs font-medium leading-snug">{concept.bestTrafficType}</div>
              </div>
              <div className="p-3 bg-surface border border-border rounded-lg">
                <div className="mono-tag text-muted-foreground mb-1">Sections</div>
                <div className="text-xs font-medium">{concept.schema.sections.length} modules</div>
              </div>
            </div>

            <div className="p-3 bg-surface-muted/60 border border-border rounded-lg mb-6">
              <div className="mono-tag text-muted-foreground mb-1">Framework fit</div>
              <div className="text-[13px] leading-relaxed">{meta.bestFor}</div>
            </div>

            {(concept.whyThisWorks || concept.risksOrLimits || concept.bestFor) && (
              <div className="space-y-3 mb-6">
                {concept.whyThisWorks && (
                  <RailBlock label="Why this works" body={concept.whyThisWorks} />
                )}
                {concept.bestFor && <RailBlock label="Best for" body={concept.bestFor} />}
                {concept.risksOrLimits && (
                  <RailBlock label="Risks & limits" body={concept.risksOrLimits} tone="muted" />
                )}
              </div>
            )}

            {research && (
              <div className="p-3 bg-surface border border-border rounded-lg mb-6">
                <div className="mono-tag text-muted-foreground mb-1">Research snapshot</div>
                <div className="text-[12px] leading-relaxed line-clamp-4">
                  {research.summary}
                </div>
              </div>
            )}


            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="mono-tag text-muted-foreground">Content outline</div>
                <div className="mono-tag text-muted-foreground">
                  {concept.schema.sections.length}
                </div>
              </div>
              <ol className="space-y-0.5">
                {concept.schema.sections.map((s, i) => (
                  <li key={s.id}>
                    <button
                      onClick={() => scrollTo(s.id)}
                      className="w-full text-left flex gap-3 py-1.5 px-2 -mx-2 rounded-md hover:bg-surface-muted group"
                    >
                      <span className="mono-tag text-muted-foreground shrink-0 mt-0.5 w-6">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium leading-snug truncate group-hover:text-foreground">
                          {s.title ?? capitalize(s.type)}
                        </span>
                        <span className="mono-tag text-muted-foreground">{s.type}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-2 pt-4 border-t border-border">
              <div className="mono-tag text-muted-foreground mb-1">Elements & visuals</div>
              {!elements ? (
                <button
                  onClick={handleGenerateElements}
                  disabled={elementsLoading}
                  className="w-full h-10 text-[13px] font-medium bg-ink text-background rounded-md hover:opacity-90 disabled:opacity-60"
                >
                  {elementsLoading
                    ? ["Breaking strategy into blocks…", "Writing headlines & CTAs…", "Preparing image prompts…", "Packaging elements…"][elementsStep] ?? "Working…"
                    : "Get elements for this page"}
                </button>
              ) : (
                <>
                  <div className="p-3 bg-surface border border-border rounded-lg text-[12px]">
                    <div className="mono-tag text-muted-foreground mb-1">Hero headline</div>
                    <div className="font-medium mb-2 leading-snug">{elements.hero.headline}</div>
                    <div className="text-muted-foreground leading-snug mb-2">
                      {elements.hero.subheadline}
                    </div>
                    <div className="flex gap-1">
                      <span className="mono-tag px-1.5 py-0.5 bg-ink text-background rounded">
                        {elements.hero.primaryCTA}
                      </span>
                      {elements.hero.secondaryCTA && (
                        <span className="mono-tag px-1.5 py-0.5 bg-surface-muted rounded">
                          {elements.hero.secondaryCTA}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-surface border border-border rounded-lg text-[11px] leading-snug space-y-1">
                    <div className="mono-tag text-muted-foreground mb-1">Global style</div>
                    <div>· {elements.globalStyle.designMood}</div>
                    <div>· {elements.globalStyle.imageStyle}</div>
                    <div>· {elements.globalStyle.colorMood}</div>
                    <div>· {elements.globalStyle.typographyMood}</div>
                  </div>
                  <button
                    onClick={() => copy("elements", elements.copyExportText)}
                    className="w-full h-9 text-[13px] font-medium border border-border rounded-md hover:bg-surface-muted"
                  >
                    {copied === "elements" ? "Copied ✓" : "Copy all elements"}
                  </button>
                  <button
                    onClick={() =>
                      copy(
                        "prompts",
                        [
                          ...elements.hero.imagePrompts,
                          ...elements.sections.flatMap((s) => s.imagePrompts ?? []),
                        ].join("\n"),
                      )
                    }
                    className="w-full h-9 text-[12px] font-medium text-muted-foreground hover:text-foreground border border-border rounded-md"
                  >
                    {copied === "prompts" ? "Copied ✓" : "Copy image prompts"}
                  </button>
                  <button
                    onClick={handleGenerateImages}
                    disabled={imagesLoading}
                    className="w-full h-10 text-[13px] font-medium bg-accent text-background rounded-md hover:opacity-90 disabled:opacity-60"
                  >
                    {imagesLoading
                      ? "Generating preview visuals…"
                      : images.length > 0
                        ? "↻ Regenerate images"
                        : "Generate images"}
                  </button>
                  {images.length > 0 && (
                    <div className="mono-tag text-muted-foreground text-center pt-1">
                      {images.length} preview visuals attached · simulated
                    </div>
                  )}
                </>
              )}
              {elementsError && (
                <div className="p-2 text-[11px] bg-red-500/10 border border-red-500/30 rounded text-red-800">
                  {elementsError}
                </div>
              )}
              {imagesError && (
                <div className="p-2 text-[11px] bg-red-500/10 border border-red-500/30 rounded text-red-800">
                  {imagesError}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-border mt-4">
              <div className="mono-tag text-muted-foreground mb-1">Copy actions</div>
              <button
                onClick={() => copy("outline", outlineText())}
                className="w-full h-9 text-[13px] font-medium border border-border rounded-md hover:bg-surface-muted"
              >
                {copied === "outline" ? "Copied ✓" : "Copy outline"}
              </button>
              <button
                onClick={() => copy("hero", heroText())}
                className="w-full h-9 text-[13px] font-medium border border-border rounded-md hover:bg-surface-muted"
              >
                {copied === "hero" ? "Copied ✓" : "Copy hero"}
              </button>
              <button
                onClick={() => copy("full", fullText())}
                className="w-full h-9 text-[13px] font-medium border border-border rounded-md hover:bg-surface-muted"
              >
                {copied === "full" ? "Copied ✓" : "Copy full page content"}
              </button>
              <button
                onClick={regenerate}
                className="w-full h-9 text-[12px] font-medium text-muted-foreground hover:text-foreground"
              >
                ↻ Regenerate this concept
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function RailBlock({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone?: "muted";
}) {
  return (
    <div
      className={`p-3 border rounded-lg ${
        tone === "muted"
          ? "bg-surface-muted/60 border-border"
          : "bg-surface border-border"
      }`}
    >
      <div className="mono-tag text-muted-foreground mb-1">{label}</div>
      <div className="text-[12px] leading-relaxed">{body}</div>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}

