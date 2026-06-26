import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/app/new")({
  component: NewProjectRouter,
});

function NewProjectRouter() {
  const { activeWorkspace, products } = useStore();
  return (
    <>
      <TopBar />
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">New project</h1>
        <p className="text-muted-foreground text-sm mb-8">
          {activeWorkspace
            ? "Add a product (or reuse an existing one) to generate five landing page directions."
            : "First, create a brand for this workspace."}
        </p>
        {!activeWorkspace ? (
          <Link
            to="/app/brand/new"
            className="inline-flex items-center px-4 py-2 bg-ink text-background text-sm font-medium rounded-md"
          >
            Create brand →
          </Link>
        ) : (
          <div className="space-y-3">
            <Link
              to="/app/product/new"
              className="flex items-center justify-between p-5 bg-surface border border-border rounded-lg hover:border-foreground/30 transition-colors"
            >
              <div>
                <div className="font-medium">Brief a new product</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Recommended. Features, benefits, price.
                </div>
              </div>
              <span className="mono-tag text-muted-foreground">Start →</span>
            </Link>
            {products
              .filter((p) => p.workspaceId === activeWorkspace.id)
              .map((p) => (
                <div
                  key={p.id}
                  className="p-5 bg-surface-muted border border-border rounded-lg"
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {p.shortDescription || "No description"}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </>
  );
}
