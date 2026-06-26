import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { FRAMEWORK_META, generateConceptsForProject } from "@/lib/generator";
import { SectionRenderer } from "@/components/SectionRenderer";
import { useState } from "react";

export const Route = createFileRoute("/app/project/$projectId/concept/$conceptId")({
  component: ConceptDetail,
});

function ConceptDetail() {
  const { projectId, conceptId } = Route.useParams();
  const { projects, products, workspaces, concepts, saveConcepts } = useStore();
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

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
      `Best for: ${concept.bestTrafficType}`,
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

  const regenerate = () => {
    const fresh = generateConceptsForProject(workspace, product, project);
    saveConcepts(project.id, fresh);
    const newConcept = fresh.find((c) => c.templateFamily === concept.templateFamily);
    if (newConcept) {
      navigate({
        to: "/app/project/$projectId/concept/$conceptId",
        params: { projectId, conceptId: newConcept.id },
        replace: true,
      });
    }
  };

  return (
    <>
      <TopBar>
        <Link
          to="/app/project/$projectId"
          params={{ projectId }}
          className="mono-tag text-muted-foreground hover:text-foreground"
        >
          ← Back to gallery
        </Link>
      </TopBar>
      <div className="grid grid-cols-12 gap-0 min-h-[calc(100vh-56px)]">
        {/* Strategy rail */}
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 border-r border-border bg-surface-muted/40 p-8 lg:sticky lg:top-14 lg:self-start lg:h-[calc(100vh-56px)] lg:overflow-y-auto">
          <div className="mono-tag text-accent mb-2">{meta.code} · {concept.templateFamily}</div>
          <h1 className="text-2xl font-semibold tracking-tight mb-3 leading-tight">
            {concept.conceptName}
          </h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {concept.oneLineStrategy}
          </p>

          <div className="p-4 bg-surface border border-border rounded-lg mb-6">
            <div className="mono-tag text-muted-foreground mb-1">Best for</div>
            <div className="text-sm font-medium">{concept.bestTrafficType}</div>
            <div className="mono-tag text-muted-foreground mt-3 mb-1">Framework strength</div>
            <div className="text-sm">{meta.bestFor}</div>
          </div>

          <div className="mb-6">
            <div className="mono-tag text-muted-foreground mb-3">Content outline</div>
            <ol className="space-y-2">
              {concept.schema.sections.map((s, i) => (
                <li key={s.id} className="flex gap-3 text-sm">
                  <span className="mono-tag text-muted-foreground shrink-0 mt-0.5">
                    0{i + 1}
                  </span>
                  <span className="text-foreground">
                    <span className="block">{s.title ?? capitalize(s.type)}</span>
                    <span className="mono-tag text-muted-foreground">{s.type}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => copy("outline", outlineText())}
              className="w-full h-9 text-sm font-medium border border-border rounded-md hover:bg-surface"
            >
              {copied === "outline" ? "Copied ✓" : "Copy outline text"}
            </button>
            <button
              onClick={() => copy("hero", heroText())}
              className="w-full h-9 text-sm font-medium border border-border rounded-md hover:bg-surface"
            >
              {copied === "hero" ? "Copied ✓" : "Copy hero section"}
            </button>
            <button
              onClick={() => copy("full", fullText())}
              className="w-full h-9 text-sm font-medium bg-ink text-background rounded-md hover:opacity-90"
            >
              {copied === "full" ? "Copied ✓" : "Copy entire page content"}
            </button>
            <button
              onClick={regenerate}
              className="w-full h-9 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Regenerate concept
            </button>
          </div>
        </aside>

        {/* Preview surface */}
        <main className="col-span-12 lg:col-span-8 xl:col-span-9 p-8 bg-surface-muted/50">
          <div className="max-w-3xl mx-auto bg-surface ring-soft rounded-xl overflow-hidden shadow-elevated">
            <div className="h-9 border-b border-border bg-surface-muted flex items-center px-3 gap-1.5">
              <div className="size-2.5 rounded-full bg-border" />
              <div className="size-2.5 rounded-full bg-border" />
              <div className="size-2.5 rounded-full bg-border" />
              <div className="mono-tag text-muted-foreground ml-3 truncate">
                {product.name.toLowerCase().replace(/\s+/g, "-")}.com
              </div>
            </div>
            <div>
              {concept.schema.sections.map((s) => (
                <SectionRenderer key={s.id} section={s} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}
