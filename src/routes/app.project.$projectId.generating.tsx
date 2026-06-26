import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { generateConceptsForProject, TEMPLATE_FAMILIES } from "@/lib/generator";

export const Route = createFileRoute("/app/project/$projectId/generating")({
  component: Generating,
});

function Generating() {
  const { projectId } = Route.useParams();
  const { projects, products, workspaces, saveConcepts } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const project = projects.find((p) => p.id === projectId);
  const product = product_or_null(project?.productId, products);
  const workspace = workspaces.find((w) => w.id === project?.workspaceId);

  useEffect(() => {
    if (!project || !product || !workspace) return;
    const ticks = [400, 800, 1200, 1600, 2000];
    const timers = ticks.map((t, i) => setTimeout(() => setStep(i + 1), t));
    const done = setTimeout(() => {
      const concepts = generateConceptsForProject(workspace, product, project);
      saveConcepts(project.id, concepts);
      navigate({
        to: "/app/project/$projectId",
        params: { projectId: project.id },
        replace: true,
      });
    }, 2400);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, product?.id, workspace?.id]);

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
      <div className="p-8 max-w-4xl">
        <div className="mono-tag text-accent mb-3">Generating</div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">{project.projectName}</h1>
        <p className="text-muted-foreground text-sm mb-10">
          {product.name} · {project.goal}
        </p>

        <div className="space-y-3">
          {TEMPLATE_FAMILIES.map((family, i) => {
            const done = i < step;
            return (
              <div
                key={family}
                className="flex items-center gap-4 p-5 bg-surface border border-border rounded-lg"
              >
                <div
                  className={`size-8 rounded-md grid place-items-center mono-tag ${
                    done ? "bg-ink text-background" : "bg-surface-muted text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : `0${i + 1}`}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{family}</div>
                  <div className="h-2 bg-surface-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full bg-accent transition-all duration-700 ${
                        done ? "w-full" : i === step ? "w-2/3 animate-pulse" : "w-0"
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function product_or_null<T extends { id: string }>(
  id: string | undefined,
  list: T[],
): T | undefined {
  return id ? list.find((x) => x.id === id) : undefined;
}
