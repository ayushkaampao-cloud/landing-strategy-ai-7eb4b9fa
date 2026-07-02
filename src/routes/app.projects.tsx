import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/app/projects")({
  component: ProjectsList,
});

function ProjectsList() {
  const { projects, products, concepts, activeWorkspace } = useStore();
  const wsProjects = projects.filter((p) => p.workspaceId === activeWorkspace?.id);
  const hasConcepts = (projectId: string) =>
    concepts.some((c) => c.projectId === projectId);
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
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Projects</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Every project = one product, five strategic landing pages.
        </p>
        {wsProjects.length === 0 ? (
          <div className="p-12 bg-surface border border-dashed border-border rounded-xl text-center">
            <h3 className="font-semibold mb-2">No projects yet</h3>
            <Link
              to="/app/new"
              className="inline-flex items-center px-4 py-2 bg-ink text-background text-sm font-medium rounded-md mt-2"
            >
              Create the first one
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {wsProjects.map((p) => {
              const product = products.find((pr) => pr.id === p.productId);
              return (
                <Link
                  key={p.id}
                  to="/app/project/$projectId"
                  params={{ projectId: p.id }}
                  className="flex items-center justify-between p-5 bg-surface border border-border rounded-lg hover:border-foreground/30 transition-colors"
                >
                  <div>
                    <div className="font-medium">{p.projectName}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {product?.name} · {p.goal}
                    </div>
                  </div>
                  <span className="mono-tag text-muted-foreground">View →</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
