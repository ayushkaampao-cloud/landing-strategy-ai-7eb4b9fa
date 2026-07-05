import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { FRAMEWORK_META, TEMPLATE_FAMILIES } from "@/lib/generator";
import { VisualProfileSummary } from "@/components/VisualProfileSummary";
import { GroundingBadge } from "@/components/GroundingBadge";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/project/$projectId/")({
  component: ProjectGallery,
});

function ProjectGallery() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const { projects, products, concepts, workspaces, getResearch, getProductImageCount, getVisualProfile, deleteProject, setActiveWorkspace } = useStore();
  const project = projects.find((p) => p.id === projectId);
  const product = products.find((p) => p.id === project?.productId);
  const workspace = workspaces.find((w) => w.id === project?.workspaceId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const projectConcepts = concepts.filter((c) => c.projectId === projectId);
  const research = getResearch(projectId);
  const productImageCount = getProductImageCount(projectId);
  const visualProfile = getVisualProfile(projectId);

  if (!project) {
    return (
      <>
        <TopBar />
        <div className="p-8 text-sm text-muted-foreground">Project not found.</div>
      </>
    );
  }

  if (projectConcepts.length === 0) {
    return (
      <>
        <TopBar>
          <span className="mono-tag text-muted-foreground">{project.goal}</span>
        </TopBar>
        <div className="p-8 max-w-4xl">
          <div className="mono-tag text-muted-foreground mb-2">Project</div>
          <div className="flex items-start justify-between gap-4 mb-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              {project.projectName}
            </h1>
            <Link
              to="/app/project/$projectId/edit"
              params={{ projectId }}
              className="mono-tag px-3 py-1.5 rounded-md border border-border bg-surface hover:border-foreground/30 shrink-0"
            >
              Edit project
            </Link>
          </div>
          <p className="text-muted-foreground text-sm mb-10">
            {product?.name} · {project.goal}
          </p>

          <div className="p-10 bg-surface border border-border rounded-xl">
            <div className="mono-tag text-accent mb-3">Ready to generate</div>
            <h2 className="text-2xl font-semibold tracking-tight mb-3">
              Five distinct strategies for {product?.name}
            </h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-lg">
              We'll draft one full landing page per framework — different structure,
              tone, and section order. Read them side-by-side, copy the winner,
              or regenerate any concept in place.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-8">
              {TEMPLATE_FAMILIES.map((f) => {
                const m = FRAMEWORK_META[f];
                return (
                  <div key={f} className="p-3 bg-surface-muted/60 border border-border rounded-lg">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`size-1.5 rounded-full ${m.accentDot}`} />
                      <span className="mono-tag text-muted-foreground">{m.code}</span>
                    </div>
                    <div className="text-[13px] font-medium leading-snug mb-1">{f}</div>
                    <div className="mono-tag text-muted-foreground">{m.length}</div>
                  </div>
                );
              })}
            </div>

            <Link
              to="/app/project/$projectId/generating"
              params={{ projectId }}
              className="inline-flex items-center h-11 px-6 bg-ink text-background text-sm font-medium rounded-md hover:opacity-90"
            >
              Generate 5 landing page strategies →
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Order concepts by canonical framework order
  const ordered = [...projectConcepts].sort(
    (a, b) =>
      TEMPLATE_FAMILIES.indexOf(a.templateFamily) -
      TEMPLATE_FAMILIES.indexOf(b.templateFamily),
  );

  return (
    <>
      <TopBar>
        <GroundingBadge count={productImageCount} hasProfile={!!visualProfile} />
        <span className="mono-tag text-muted-foreground">{project.goal}</span>
      </TopBar>
      <div className="p-8 max-w-7xl">
        <Link
          to="/app/projects"
          onClick={() => workspace && setActiveWorkspace(workspace.id)}
          className="mono-tag text-muted-foreground hover:text-foreground inline-block mb-3"
        >
          ← {workspace?.name ?? "All projects"}
        </Link>
        <div className="mb-2 mono-tag text-muted-foreground">Project</div>
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {project.projectName}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/app/project/$projectId/edit"
              params={{ projectId }}
              className="mono-tag px-3 py-1.5 rounded-md border border-border bg-surface hover:border-foreground/30"
            >
              Edit project
            </Link>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="mono-tag px-3 py-1.5 rounded-md border border-border bg-surface text-muted-foreground hover:text-destructive hover:border-destructive/40"
            >
              Delete project
            </button>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-8">
          {product?.name} · 5 strategic directions · {ordered.reduce((n, c) => n + c.schema.sections.length, 0)} sections total
        </p>

        {research && (
          <div className="mb-8 p-5 bg-surface border border-border rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="mono-tag text-accent">Research snapshot</div>
              <div className="mono-tag text-muted-foreground">
                source: {research.sourceMode}
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-4">{research.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <ResearchBlock label="Competitor angles" items={research.competitorAngles} />
              <ResearchBlock label="Objections" items={research.objections} />
              <ResearchBlock label="Trust signals" items={research.trustSignals} />
              <ResearchBlock label="Positioning ideas" items={research.positioningIdeas} />
              <ResearchBlock label="Keywords" items={research.keywords} />
              <ResearchBlock label="Image style" items={research.imageStyleHints} />
            </div>
            {research.note && (
              <div className="mt-3 mono-tag text-muted-foreground">{research.note}</div>
            )}
          </div>
        )}

        <div className="mb-8">
          <VisualProfileSummary profile={visualProfile} imageCount={productImageCount} />
        </div>




        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {ordered.map((c) => {
            const meta = FRAMEWORK_META[c.templateFamily];
            const hero = c.schema.sections.find((s) => s.type === "hero");
            return (
              <Link
                key={c.id}
                to="/app/project/$projectId/concept/$conceptId"
                params={{ projectId, conceptId: c.id }}
                className="group block bg-surface border border-border rounded-xl overflow-hidden hover:border-foreground/30 transition-all hover:shadow-elevated"
              >
                {/* Family accent band */}
                <div className={`h-1 ${meta.accentDot}`} />

                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`mono-tag px-2 py-0.5 rounded ring-soft bg-background ${meta.accentClass.split(" ").filter(x => x.startsWith("text-")).join(" ")}`}>
                      {meta.code} · {meta.length}
                    </span>
                    <span className="mono-tag text-muted-foreground">
                      {c.schema.sections.length} sections
                    </span>
                  </div>
                  <div className="mono-tag text-muted-foreground mb-1">
                    {c.templateFamily}
                  </div>
                  <h3 className="font-semibold text-[15px] leading-snug mb-2 line-clamp-1">
                    {c.conceptName}
                  </h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-3 min-h-[3.6em]">
                    {c.oneLineStrategy}
                  </p>
                </div>

                {/* Hero preview snapshot */}
                <div className={`mx-4 mb-4 rounded-lg p-4 ring-soft bg-gradient-to-br ${meta.accentClass} min-h-[150px] flex flex-col justify-between`}>
                  {hero && (
                    <>
                      <div>
                        {hero.highlight && (
                          <div className="mono-tag mb-1.5 opacity-70">
                            {hero.highlight}
                          </div>
                        )}
                        <div className="text-[13px] font-semibold leading-snug text-foreground line-clamp-3">
                          {hero.title}
                        </div>
                        {hero.subtitle && (
                          <div className="text-[11px] text-muted-foreground line-clamp-2 mt-1.5 leading-snug">
                            {hero.subtitle}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 mt-3">
                        {hero.ctaLabel && (
                          <span className="text-[10px] px-2 py-1 bg-ink text-background rounded font-medium">
                            {hero.ctaLabel}
                          </span>
                        )}
                        {hero.ctaSecondaryLabel && (
                          <span className="text-[10px] px-2 py-1 border border-border rounded bg-background/60">
                            {hero.ctaSecondaryLabel}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="px-5 pb-5 pt-3 border-t border-border flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mono-tag text-muted-foreground mb-1">Best for</div>
                    <div className="text-[12px] leading-snug line-clamp-2">
                      {meta.bestFor}
                    </div>
                  </div>
                  <span className={`text-sm shrink-0 mt-4 ${meta.accentClass.split(" ").filter(x => x.startsWith("text-")).join(" ")} group-hover:translate-x-0.5 transition-transform`}>
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entity="project"
        name={project.projectName}
        onConfirm={async () => {
          try {
            if (workspace) setActiveWorkspace(workspace.id);
            await deleteProject(projectId);
            toast.success("Project deleted.");
            navigate({ to: "/app/projects" });
          } catch (err) {
            toast.error("Failed to delete project: " + (err as Error).message);
            throw err;
          }
        }}
      />
    </>
  );
}

function ResearchBlock({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="mono-tag text-muted-foreground mb-1.5">{label}</div>
      <ul className="space-y-1">
        {items.slice(0, 5).map((it, i) => (
          <li key={i} className="text-[12px] leading-snug">
            · {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

