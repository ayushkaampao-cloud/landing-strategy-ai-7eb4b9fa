import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { workspaces, products, projects, concepts, activeWorkspace } = useStore();
  const wsProjects = projects.filter(
    (p) => p.workspaceId === activeWorkspace?.id,
  );
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
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            {activeWorkspace ? `${activeWorkspace.name} · Dashboard` : "Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Brief your product, generate five strategies, ship the right one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <Stat label="Brands" value={workspaces.length} />
          <Stat label="Products" value={products.length} />
          <Stat label="Concepts generated" value={concepts.length} />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Recent projects</h2>
          <Link to="/app/projects" className="mono-tag text-muted-foreground hover:text-foreground">
            View all →
          </Link>
        </div>
        {wsProjects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3">
            {wsProjects.slice(0, 6).map((p) => (
              <Link
                key={p.id}
                to="/app/project/$projectId"
                params={{ projectId: p.id }}
                className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg hover:border-foreground/30 transition-colors"
              >
                <div>
                  <div className="font-medium">{p.projectName}</div>
                  <div className="mono-tag text-muted-foreground mt-1">{p.goal}</div>
                </div>
                <span className="text-sm text-muted-foreground">View →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-5 bg-surface border border-border rounded-lg">
      <div className="mono-tag text-muted-foreground mb-2">{label}</div>
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-12 bg-surface border border-dashed border-border rounded-xl text-center">
      <h3 className="font-semibold mb-2">No projects yet</h3>
      <p className="text-sm text-muted-foreground mb-5">
        Add a product and generate your first five landing page directions.
      </p>
      <Link
        to="/app/new"
        className="inline-flex items-center px-4 py-2 bg-ink text-background text-sm font-medium rounded-md"
      >
        Create a project
      </Link>
    </div>
  );
}
