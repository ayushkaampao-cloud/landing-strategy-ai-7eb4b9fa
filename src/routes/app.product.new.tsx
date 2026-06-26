import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { useState, type FormEvent } from "react";
import type { ProjectGoal } from "@/types";

export const Route = createFileRoute("/app/product/new")({
  component: NewProduct,
});

const GOALS: ProjectGoal[] = ["Sell product", "Collect leads", "Book calls"];

function NewProduct() {
  const { activeWorkspace, createProduct, createProject } = useStore();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [features, setFeatures] = useState("");
  const [benefits, setBenefits] = useState("");
  const [price, setPrice] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [goal, setGoal] = useState<ProjectGoal>("Sell product");

  if (!activeWorkspace) {
    return (
      <>
        <TopBar />
        <div className="p-8">
          <p className="text-sm text-muted-foreground mb-4">
            Create a brand first.
          </p>
          <Link
            to="/app/brand/new"
            className="inline-flex items-center px-4 py-2 bg-ink text-background text-sm font-medium rounded-md"
          >
            Create brand
          </Link>
        </div>
      </>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const product = createProduct({
      workspaceId: activeWorkspace.id,
      name,
      shortDescription: shortDesc,
      keyFeatures: features,
      keyBenefits: benefits,
      priceInfo: price,
      productUrl: productUrl || undefined,
      siteUrl: siteUrl || undefined,
    });
    const project = createProject({
      workspaceId: activeWorkspace.id,
      productId: product.id,
      projectName: projectName || `${name} — First Landing Page Set`,
      goal,
    });
    navigate({
      to: "/app/project/$projectId/generating",
      params: { projectId: project.id },
    });
  };

  return (
    <>
      <TopBar />
      <div className="p-8 max-w-3xl">
        <div className="mono-tag text-accent mb-3">Step 2 of 3 · Product & project</div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Add a product</h1>
        <p className="text-muted-foreground text-sm mb-8">
          The richer the brief, the sharper the five strategies will be.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <Field label="Product name" value={name} onChange={setName} required />
          <Field
            label="Short description"
            value={shortDesc}
            onChange={setShortDesc}
            placeholder="One-line description of what the product is."
          />
          <Field
            label="Key features (one per line)"
            value={features}
            onChange={setFeatures}
            textarea
            placeholder={"Medical-grade sensor\n14-day battery\nHypoallergenic finish"}
          />
          <Field
            label="Key benefits (one per line)"
            value={benefits}
            onChange={setBenefits}
            textarea
            placeholder={"Sleep deeper\nWake refreshed\nTrack effortlessly"}
          />
          <Field
            label="Price / offer"
            value={price}
            onChange={setPrice}
            placeholder="$199 + free shipping"
          />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Product URL (optional)" value={productUrl} onChange={setProductUrl} />
            <Field label="Existing site URL (optional)" value={siteUrl} onChange={setSiteUrl} />
          </div>

          <div className="pt-6 mt-6 border-t border-border">
            <h2 className="text-lg font-semibold mb-4 tracking-tight">Project</h2>
            <Field
              label="Project name"
              value={projectName}
              onChange={setProjectName}
              placeholder={name ? `${name} — First Landing Page Set` : "First landing page set"}
            />
            <div className="mt-4">
              <span className="mono-tag text-muted-foreground mb-2 block">Goal</span>
              <div className="flex gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoal(g)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                      goal === g
                        ? "bg-ink text-background border-ink"
                        : "border-border bg-surface hover:border-foreground/30"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="h-11 px-6 bg-ink text-background font-medium rounded-md text-sm"
          >
            Generate my 5 landing page directions →
          </button>
        </form>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mono-tag text-muted-foreground mb-1.5 block">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-md border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-sans"
        />
      ) : (
        <input
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      )}
    </label>
  );
}
