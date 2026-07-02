import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { FRAMEWORK_META, TEMPLATE_FAMILIES } from "@/lib/generator";

export const Route = createFileRoute("/app/projects")({
  component: ProjectsList,
});

function ProjectsList() {
  const { projects, products, concepts, workspaces, activeWorkspace, setActiveWorkspace } = useStore();
  const wsProjects = projects.filter((p) => p.workspaceId === activeWorkspace?.id);
  const otherWorkspaces = workspaces.filter((w) => w.id !== activeWorkspace?.id && projects.some((p) => p.workspaceId === w.id));

  return (
    <>
      <TopBar>
        <Link
          to="/app/new"
          className="text-sm font-medium px-3 py-1.5 bg-ink text-background rounded-md"
        >
          New project
        </Link>
      </TopBar>
      <div className="p-8 max-w-6xl">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Every project = one product, five strategic landing pages.
            </p>
          </div>
          {activeWorkspace && (
            <div className="mono-tag text-muted-foreground">
              {activeWorkspace.name} · {wsProjects.length} project{wsProjects.length === 1 ? "" : "s"}
            </div>
          )}
        </div>

        {wsProjects.length === 0 ? (
          <div className="p-12 bg-surface border border-dashed border-border rounded-xl text-center">
            <div className="mono-tag text-muted-foreground mb-3">Empty workspace</div>
            <h3 className="font-semibold text-lg mb-2">No projects in {activeWorkspace?.name ?? "this brand"} yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
              Add a product to generate five landing page strategies for it — one per framework.
            </p>
            <Link
              to="/app/new"
              className="inline-flex items-center px-4 py-2 bg-ink text-background text-sm font-medium rounded-md"
            >
              Create the first project
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {wsProjects.map((p) => {
              const product = products.find((pr) => pr.id === p.productId);
              const projectConcepts = concepts.filter((c) => c.projectId === p.id);
              const generated = projectConcepts.length > 0;
              return (
                <Link
                  key={p.id}
                  to="/app/project/$projectId"
                  params={{ projectId: p.id }}
                  className="block p-5 bg-surface border border-border rounded-xl hover:border-foreground/30 hover:shadow-elevated transition-all"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="mono-tag text-muted-foreground">{p.goal}</span>
                        <span
                          className={`mono-tag px-2 py-0.5 rounded ${
                            generated
                              ? "bg-accent/10 text-accent"
                              : "bg-surface-muted text-muted-foreground ring-soft"
                          }`}
                        >
                          {generated ? "Generated" : "Not generated"}
                        </span>
                      </div>
                      <div className="font-semibold text-[15px] mb-0.5">{p.projectName}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {product?.name}
                        {product?.shortDescription && (
                          <> · <span className="text-muted-foreground/70">{product.shortDescription}</span></>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      {generated ? (
                        <div className="flex -space-x-1">
                          {TEMPLATE_FAMILIES.map((f) => {
                            const m = FRAMEWORK_META[f];
                            return (
                              <span
                                key={f}
                                title={f}
                                className={`size-6 rounded-full ${m.accentDot} ring-2 ring-background`}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <span className="mono-tag text-muted-foreground">Ready to generate →</span>
                      )}
                      <span className="text-muted-foreground">→</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {otherWorkspaces.length > 0 && (
          <div className="mt-12">
            <div className="mono-tag text-muted-foreground mb-3">Other brands</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {otherWorkspaces.map((w) => {
                const count = projects.filter((p) => p.workspaceId === w.id).length;
                return (
                  <button
                    key={w.id}
                    onClick={() => setActiveWorkspace(w.id)}
                    className="text-left p-4 bg-surface border border-border rounded-lg hover:border-foreground/30 transition-colors"
                  >
                    <div className="font-medium mb-1">{w.name}</div>
                    <div className="mono-tag text-muted-foreground">
                      {count} project{count === 1 ? "" : "s"} · switch →
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
