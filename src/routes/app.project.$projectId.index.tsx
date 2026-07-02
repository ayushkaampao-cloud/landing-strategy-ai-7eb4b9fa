import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { FRAMEWORK_META } from "@/lib/generator";

export const Route = createFileRoute("/app/project/$projectId/")({
  component: ProjectGallery,
});

function ProjectGallery() {
  const { projectId } = Route.useParams();
  const { projects, products, concepts } = useStore();
  const project = projects.find((p) => p.id === projectId);
  const product = products.find((p) => p.id === project?.productId);
  const projectConcepts = concepts.filter((c) => c.projectId === projectId);

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
        <div className="p-8 max-w-3xl">
          <div className="mono-tag text-muted-foreground mb-2">Project</div>
          <h1 className="text-3xl font-semibold tracking-tight mb-1">
            {project.projectName}
          </h1>
          <p className="text-muted-foreground text-sm mb-10">
            {product?.name} · {project.goal}
          </p>

          <div className="p-10 bg-surface border border-border rounded-xl">
            <div className="mono-tag text-accent mb-3">Ready to generate</div>
            <h2 className="text-xl font-semibold tracking-tight mb-2">
              Five distinct landing page strategies for {product?.name}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-lg">
              We'll build one concept per framework — Performance, A+ Product Story,
              Deep Conversion, Brand Story, and Trust & Comparison — each with a
              full section-level schema you can read, copy, and ship.
            </p>
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

  return (
    <>
      <TopBar>
        <span className="mono-tag text-muted-foreground">{project.goal}</span>
      </TopBar>
      <div className="p-8 max-w-7xl">
        <div className="mb-2 mono-tag text-muted-foreground">Project</div>
        <h1 className="text-3xl font-semibold tracking-tight mb-1">
          {project.projectName}
        </h1>
        <p className="text-muted-foreground text-sm mb-10">
          {product?.name} · 5 strategic directions
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projectConcepts.map((c) => {
            const meta = FRAMEWORK_META[c.templateFamily];
            const hero = c.schema.sections.find((s) => s.type === "hero");
            return (
              <Link
                key={c.id}
                to="/app/project/$projectId/concept/$conceptId"
                params={{ projectId, conceptId: c.id }}
                className="group block bg-surface border border-border rounded-xl p-1 hover:border-foreground/30 transition-all"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="mono-tag bg-ink text-background px-2 py-0.5 rounded">
                      {meta.code}
                    </span>
                    <span className="mono-tag text-accent">{c.bestTrafficType}</span>
                  </div>
                  <div className="mono-tag text-muted-foreground mb-1">
                    {c.templateFamily}
                  </div>
                  <h3 className="font-semibold mb-2">{c.conceptName}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                    {c.oneLineStrategy}
                  </p>
                </div>
                {/* Mini hero preview */}
                <div className="rounded-lg bg-surface-muted p-5 m-1 ring-soft min-h-[140px]">
                  {hero && (
                    <>
                      {hero.highlight && (
                        <div className="mono-tag text-muted-foreground mb-1.5">
                          {hero.highlight}
                        </div>
                      )}
                      <div className="text-sm font-semibold leading-snug mb-2 line-clamp-2">
                        {hero.title}
                      </div>
                      {hero.subtitle && (
                        <div className="text-[11px] text-muted-foreground line-clamp-2">
                          {hero.subtitle}
                        </div>
                      )}
                      <div className="flex gap-1.5 mt-3">
                        {hero.ctaLabel && (
                          <span className="text-[10px] px-2 py-1 bg-ink text-background rounded">
                            {hero.ctaLabel}
                          </span>
                        )}
                        {hero.ctaSecondaryLabel && (
                          <span className="text-[10px] px-2 py-1 border border-border rounded">
                            {hero.ctaSecondaryLabel}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="mono-tag text-muted-foreground">View concept</span>
                  <span className="text-sm text-accent group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
