import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { FRAMEWORK_META, generateConceptsForProject } from "@/lib/generator";
import { SectionRenderer } from "@/components/SectionRenderer";
import { GroundingBadge } from "@/components/GroundingBadge";
import { VisualProfileSummary } from "@/components/VisualProfileSummary";

import { storage } from "@/lib/storage";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { GeneratedImagePreview, LandingPageConcept, LandingPageElements, SectionProps } from "@/types";
import { resolveThemePalette } from "@/lib/theme/palette";
import { downloadConceptZip } from "@/lib/downloadConceptZip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    saveConceptsAsync,
    updateConceptSection,
    updateSectionBullets,
    isFieldEdited,
    getEditedFields,
    getFieldSaveError,
    getResearch,
    getElements,
    saveElements,
    getImages,
    saveImages,
    updateImageForSection,
    getProductImageCount,
    getVisualProfile,
    setActiveWorkspace,
    enableConceptShare,
    disableConceptShare,
  } = useStore();
  // All hooks are declared unconditionally at the top of the component to
  // keep hook order stable across renders. A prior version declared
  // `useState(regenerating)` after the early return below, which caused
  // React to unmount the tree whenever `concept` was briefly missing and
  // surfaced as a spurious "Concept not found" screen.
  const [copied, setCopied] = useState<string | null>(null);
  const [elementsLoading, setElementsLoading] = useState(false);
  const [elementsError, setElementsError] = useState<string | null>(null);
  const [elementsStep, setElementsStep] = useState(0);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [elementsVersion, setElementsVersion] = useState(0);
  const [imagesVersion, setImagesVersion] = useState(0);
  const [realGenerating, setRealGenerating] = useState<Record<string, boolean>>({});
  // Section IDs whose preview image failed to load, plus a per-section
  // retry nonce that lets the user reload without regenerating the URL.
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});
  const [imgRetry, setImgRetry] = useState<Record<string, number>>({});
  const [regenerating, setRegenerating] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [disableShareOpen, setDisableShareOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState<{ done: number; total: number } | null>(null);
  const regeneratingRef = useRef(false);

  const project = projects.find((p) => p.id === projectId);
  const product = products.find((p) => p.id === project?.productId);
  const workspace = workspaces.find((w) => w.id === project?.workspaceId);
  const concept = concepts.find((c) => c.id === conceptId);

  // IMPORTANT: All hooks below must run on every render regardless of whether
  // `concept` exists. Declaring hooks after an early return causes React to
  // throw "Rendered fewer hooks than expected" when concept briefly disappears
  // during regenerate/refresh — which cascades into the app error boundary
  // and surfaces as a blank "Concept not found" screen.
  const research = getResearch(projectId);
  const elements = useMemo(
    () => (concept ? getElements(conceptId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conceptId, elementsVersion, concept?.id],
  );
  const images = useMemo(
    () => (concept ? getImages(conceptId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conceptId, imagesVersion, concept?.id],
  );
  const imageBySection = useMemo(() => {
    const map: Record<string, GeneratedImagePreview> = {};
    images.forEach((i) => (map[i.sectionId] = i));
    return map;
  }, [images]);
  const productImageCount = getProductImageCount(projectId);
  const visualProfile = getVisualProfile(projectId);
  // If the project uploaded product photos, use the first one directly as the
  // hero image instead of an AI-generated one. Other sections still use AI.
  const heroProductImage = useMemo(() => {
    const imgs = useStore.prototype ? [] : [];
    // Read from store snapshot; the store already returns [] when absent.
    return imgs.length ? imgs : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, productImageCount]);
  const theme = useMemo(() => {
    const stored = research?.classification?.themePalette;
    if (stored) return stored;
    return resolveThemePalette({
      category: research?.classification?.category,
      visibleColors: visualProfile?.visibleColors,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [research?.classification?.themePalette, research?.classification?.category, visualProfile]);


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

  const shareUrl = (token: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/preview/${token}`;

  const handleSharePreview = async () => {
    if (!concept || shareBusy) return;
    setShareBusy(true);
    try {
      const token = await enableConceptShare(concept.id);
      try {
        await navigator.clipboard.writeText(shareUrl(token));
        toast.success("Share link copied");
      } catch {
        toast.success("Share preview enabled");
      }
    } catch (err) {
      toast.error("Couldn't enable share link");
      console.error("[share] enable", err);
    } finally {
      setShareBusy(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!concept?.shareToken) return;
    try {
      await navigator.clipboard.writeText(shareUrl(concept.shareToken));
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleDisableShare = async () => {
    if (!concept) return;
    setShareBusy(true);
    try {
      await disableConceptShare(concept.id);
      toast.success("Share link disabled");
      setDisableShareOpen(false);
    } catch (err) {
      toast.error("Couldn't disable share link");
      console.error("[share] disable", err);
    } finally {
      setShareBusy(false);
    }
  };


  const regenerate = async () => {
    if (!workspace || !product || !project || !concept) return;
    // Double-guard: ref catches double-clicks within the same tick before
    // the setState above commits.
    if (regeneratingRef.current) return;
    regeneratingRef.current = true;
    setRegenerating(true);
    const previousConcept = concept;
    const editedPaths = Object.keys(getEditedFields(concept.id));
    const editedCount = editedPaths.length;
    if (editedCount > 0) {
      const ok = window.confirm(
        `You have ${editedCount} edited field${editedCount === 1 ? "" : "s"} on this concept. ` +
          `Overwrite them with a fresh generation?\n\n` +
          `OK to overwrite everything, Cancel to keep the current concept.`,
      );
      if (!ok) {
        regeneratingRef.current = false;
        setRegenerating(false);
        return;
      }
    }
    try {
      const research = getResearch(projectId) ?? null;
      let merged: LandingPageConcept;
      if (research) {
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
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          console.error("[strategies] api error:", res.status, detail);
          throw new Error("provider_unavailable");
        }
        const data = (await res.json()) as { concepts: LandingPageConcept[] };
        const fresh = data.concepts[0];
        if (!fresh) throw new Error("No concept returned");
        // Preserve stable id/createdAt so URL stays valid and elements/images
        // rows don't cascade-delete.
        merged = { ...fresh, id: concept.id, projectId: project.id, createdAt: concept.createdAt };
      } else {
        // Skeleton fallback — never navigate away.
        const skeleton = generateConceptsForProject(workspace, product, project);
        const swap = skeleton.find((c) => c.templateFamily === concept.templateFamily);
        if (!swap) throw new Error("Skeleton returned no matching family");
        merged = { ...swap, id: concept.id, projectId: project.id, createdAt: concept.createdAt };
      }
      const nextForProject = concepts
        .filter((c) => c.projectId === project.id)
        .map((c) => (c.id === concept.id ? merged : c));
      // Await the DB write BEFORE mutating any local caches. If the write
      // fails we throw and land in the catch below, leaving the previous
      // concept untouched on screen.
      await saveConceptsAsync(project.id, nextForProject);
      // Only now is it safe to invalidate derived artefacts.
      storage.clearConcept(concept.id);
      setElementsVersion((v) => v + 1);
      setImagesVersion((v) => v + 1);
      toast.success("Concept regenerated");
    } catch (err) {
      console.error("[regenerate] error:", err);
      toast.error(
        "Content generation is temporarily unavailable — please try again in a moment. Your current concept is unchanged.",
      );
      // Ensure the previous concept is still visible; no navigation happens.
      void previousConcept;
    } finally {
      regeneratingRef.current = false;
      setRegenerating(false);
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  async function handleGenerateRealImage(sectionId: string) {
    const img = imageBySection[sectionId];
    if (!img) return;
    setRealGenerating((s) => ({ ...s, [sectionId]: true }));
    try {
      const section = concept?.schema.sections.find((s) => s.id === sectionId);
      const res = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          projectName: project!.projectName,
          conceptName: concept!.conceptName,
          category: research?.classification?.category,
          items: [
            {
              sectionId,
              imagePrompt: img.imagePrompt,
              imageStyle: img.imageStyle,
              imageMode: img.imageMode,
              negativePrompt: section?.negativePrompt,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(`Gateway ${res.status}`);
      const data = (await res.json()) as { previews: GeneratedImagePreview[] };
      const preview = data.previews?.[0];
      if (!preview || preview.status === "failed" || !preview.previewUrl) {
        throw new Error("Image generation returned no image");
      }
      updateImageForSection(conceptId, sectionId, {
        realUrl: preview.previewUrl,
        status: "real",
      });
      setImagesVersion((v) => v + 1);
      toast.success("Real image generated");
    } catch (err) {
      updateImageForSection(conceptId, sectionId, { status: "failed" });
      setImagesVersion((v) => v + 1);
      toast.error(`Image generation failed: ${(err as Error).message}`);
    } finally {
      setRealGenerating((s) => ({ ...s, [sectionId]: false }));
    }
  }



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
          visualProfile: visualProfile ?? undefined,
        }),
      });
      clearInterval(stepTimer);
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[elements] api error:", res.status, detail);
        throw new Error("Content generation is temporarily unavailable — please try again in a moment.");
      }
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
      const negBySection: Record<string, string | undefined> = {};
      concept!.schema.sections.forEach((s) => {
        negBySection[s.id] = s.negativePrompt;
      });
      const items = [
        ...elements.hero.imagePrompts.map((p, i) => ({
          sectionId: `hero-${i}`,
          imagePrompt: p,
          imageStyle: elements.globalStyle.imageStyle,
          negativePrompt: undefined as string | undefined,
        })),
        ...elements.sections.flatMap((sec) =>
          (sec.imagePrompts ?? []).map((p) => ({
            sectionId: sec.sectionId,
            imagePrompt: p,
            imageStyle: elements.globalStyle.imageStyle,
            imageMode: sec.imageMode,
            negativePrompt: sec.negativePrompt ?? negBySection[sec.sectionId],
          })),
        ),
      ];
      const res = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          projectName: project!.projectName,
          conceptName: concept!.conceptName,
          category: research?.classification?.category,
          items,
        }),
      });
      if (!res.ok) throw new Error("Image generation failed");
      const data = (await res.json()) as { previews: GeneratedImagePreview[] };
      saveImages(conceptId, data.previews);
      setImgFailed({});
      setImgRetry({});
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
        <GroundingBadge count={productImageCount} hasProfile={!!visualProfile} />
        <Link
          to="/app/projects"
          onClick={() => workspace && setActiveWorkspace(workspace.id)}
          className="mono-tag text-muted-foreground hover:text-foreground"
        >
          {workspace?.name ?? "Brand"}
        </Link>
        <span className="mono-tag text-muted-foreground">/</span>
        <Link
          to="/app/project/$projectId"
          params={{ projectId }}
          className="mono-tag text-muted-foreground hover:text-foreground"
        >
          ← {project.projectName}
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
            <div style={{ background: theme.background }}>
              {concept.schema.sections.map((s) => {
                const img = imageBySection[s.id];
                const activeUrl = img?.realUrl || img?.previewUrl || "";
                const isPlaceholderImg = img && img.status === "placeholder" && !img.realUrl;
                const isMissingUrl = !!img && !isPlaceholderImg && !activeUrl;
                const showFailed = !!img && !isPlaceholderImg && (imgFailed[s.id] || isMissingUrl || img.status === "failed");
                // Only pass the image into the section renderer when it will actually render.
                const passImage = !!img && !isPlaceholderImg && !showFailed ? img : undefined;
                return (
                  <div key={s.id} id={`section-${s.id}`}>
                    <SectionRenderer
                      section={s}
                      theme={theme}
                      image={passImage}
                      onEdit={(field, value) =>
                        updateConceptSection(concept.id, s.id, { [field]: value } as Partial<SectionProps>)
                      }
                      onEditBullets={(bullets) =>
                        updateSectionBullets(concept.id, s.id, bullets)
                      }
                      onEditItems={(items) =>
                        updateConceptSection(concept.id, s.id, { items } as Partial<SectionProps>)
                      }
                      isEdited={(path) =>
                        isFieldEdited(concept.id, `sections.${s.id}.${path}`)
                      }
                      saveError={(path) =>
                        getFieldSaveError(concept.id, `sections.${s.id}.${path}`)
                      }
                    />
                    {img && (
                      <div
                        className="px-6 md:px-12 py-2 flex items-center justify-between text-[11px] gap-2 border-t"
                        style={{
                          background: theme.surface,
                          color: theme.mutedText,
                          borderColor: `${theme.primary}22`,
                        }}
                      >
                        <span className="mono-tag">
                          {img.status === "real"
                            ? "Real image · AI-generated"
                            : img.status === "failed"
                              ? "Generation failed — using branded placeholder"
                              : img.status === "placeholder"
                                ? `Branded placeholder · ${img.imageMode ?? "image"}`
                                : "Preview image · Generated"}
                        </span>
                        <div className="flex items-center gap-2">
                          {showFailed && (
                            <button
                              type="button"
                              onClick={() => {
                                setImgFailed((m) => ({ ...m, [s.id]: false }));
                                setImgRetry((m) => ({ ...m, [s.id]: (m[s.id] ?? 0) + 1 }));
                              }}
                              className="mono-tag px-2 py-0.5 rounded"
                              style={{ background: theme.primary, color: "#fff" }}
                            >
                              Retry image
                            </button>
                          )}
                          {img.status !== "real" && (
                            <button
                              type="button"
                              onClick={() => handleGenerateRealImage(s.id)}
                              disabled={!!realGenerating[s.id]}
                              className="mono-tag px-2 py-0.5 rounded disabled:opacity-50"
                              style={{ background: theme.accent, color: "#fff" }}
                            >
                              {realGenerating[s.id] ? "Generating…" : "Generate real image"}
                            </button>
                          )}
                          <span className="truncate max-w-[40%]" title={img.imagePrompt}>
                            {img.imagePrompt}
                          </span>
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
              <VisualProfileSummary
                profile={visualProfile}
                imageCount={productImageCount}
                compact
              />
            </div>




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
                onClick={async () => {
                  if (downloading) return;
                  setDownloading(true);
                  setDlProgress(null);
                  try {
                    const { skipped } = await downloadConceptZip({
                      concept,
                      images,
                      project,
                      workspace,
                      onProgress: (done, total) => setDlProgress({ done, total }),
                    });
                    if (skipped.length > 0) {
                      toast.success(
                        `Downloaded — ${skipped.length} image${skipped.length === 1 ? "" : "s"} skipped`,
                      );
                    } else {
                      toast.success("Downloaded");
                    }
                  } catch (err) {
                    console.error("[download] error", err);
                    toast.error("Download failed");
                  } finally {
                    setDownloading(false);
                    setDlProgress(null);
                  }
                }}
                disabled={downloading}
                className="w-full h-9 text-[13px] font-medium border border-border rounded-md hover:bg-surface-muted disabled:opacity-60"
              >
                {downloading
                  ? dlProgress && dlProgress.total > 0
                    ? `Packaging ${dlProgress.done}/${dlProgress.total}…`
                    : "Packaging…"
                  : "Download everything"}
              </button>
              <button
                onClick={regenerate}
                disabled={regenerating}
                className="w-full h-9 text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                {regenerating ? "Regenerating…" : "↻ Regenerate this concept"}
              </button>
            </div>

            <div className="space-y-2 pt-4 border-t border-border mt-4">
              <div className="mono-tag text-muted-foreground mb-1">Share</div>
              {!concept.shareToken ? (
                <button
                  onClick={handleSharePreview}
                  disabled={shareBusy}
                  className="w-full h-9 text-[13px] font-medium border border-border rounded-md hover:bg-surface-muted disabled:opacity-60"
                >
                  {shareBusy ? "Creating link…" : "Share preview"}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCopyShareLink}
                    className="w-full h-9 text-[13px] font-medium border border-border rounded-md hover:bg-surface-muted"
                  >
                    Copy link
                  </button>
                  <button
                    onClick={() => setDisableShareOpen(true)}
                    disabled={shareBusy}
                    className="w-full h-9 text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
                  >
                    Disable link
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
      <AlertDialog
        open={disableShareOpen}
        onOpenChange={(v) => !shareBusy && setDisableShareOpen(v)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable share link?</AlertDialogTitle>
            <AlertDialogDescription>
              The public preview will stop working. You can create a new link
              later, but it will have a different URL.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={shareBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDisableShare();
              }}
              disabled={shareBusy}
            >
              {shareBusy ? "Disabling…" : "Disable link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

