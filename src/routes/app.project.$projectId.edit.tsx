import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { ProductImageUploader } from "@/components/ProductImageUploader";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { ProductImageRef, ProjectGoal } from "@/types";

export const Route = createFileRoute("/app/project/$projectId/edit")({
  component: EditProject,
});

const GOALS: ProjectGoal[] = ["Sell product", "Collect leads", "Book calls"];

function sameImageSet(a: ProductImageRef[], b: ProductImageRef[]) {
  if (a.length !== b.length) return false;
  const as = a.map((i) => i.id).sort().join(",");
  const bs = b.map((i) => i.id).sort().join(",");
  return as === bs;
}

function EditProject() {
  const { projectId } = Route.useParams();
  
  const {
    projects,
    products,
    workspaces,
    getProductImages,
    saveProductImages,
    saveVisualProfile,
    updateProjectBrief,
    updateWorkspaceDescription,
  } = useStore();

  const project = projects.find((p) => p.id === projectId);
  const product = products.find((p) => p.id === project?.productId);
  const workspace = workspaces.find((w) => w.id === project?.workspaceId);
  const storedImages = getProductImages(projectId);

  const initial = useMemo(
    () => ({
      brandDescription: workspace?.brandDescription ?? "",
      productDescription: product?.shortDescription ?? "",
      keyFeatures: product?.keyFeatures ?? "",
      keyBenefits: product?.keyBenefits ?? "",
      goal: (project?.goal ?? "Sell product") as ProjectGoal,
      tone: project?.tone ?? "",
      notes: project?.notes ?? "",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId],
  );

  const [brandDescription, setBrandDescription] = useState(initial.brandDescription);
  const [productDescription, setProductDescription] = useState(initial.productDescription);
  const [keyFeatures, setKeyFeatures] = useState(initial.keyFeatures);
  const [keyBenefits, setKeyBenefits] = useState(initial.keyBenefits);
  const [goal, setGoal] = useState<ProjectGoal>(initial.goal);
  const [tone, setTone] = useState(initial.tone);
  const [notes, setNotes] = useState(initial.notes);
  const [savingBrief, setSavingBrief] = useState(false);

  const [images, setImages] = useState<ProductImageRef[]>(storedImages);
  const [savingPhotos, setSavingPhotos] = useState(false);

  if (!project || !workspace) {
    return (
      <>
        <TopBar />
        <div className="p-8 text-sm text-muted-foreground">Project not found.</div>
      </>
    );
  }

  const submitBrief = async (e: FormEvent) => {
    e.preventDefault();
    setSavingBrief(true);
    try {
      await Promise.all([
        updateWorkspaceDescription(workspace.id, brandDescription),
        updateProjectBrief(projectId, {
          productDescription,
          keyFeatures,
          keyBenefits,
          goal,
          tone,
          notes,
        }),
      ]);
      toast.success("Project details saved");
    } catch (err) {
      toast.error("Failed to save: " + (err as Error).message);
    } finally {
      setSavingBrief(false);
    }
  };

  const submitPhotos = async () => {
    const changed = !sameImageSet(images, storedImages);
    setSavingPhotos(true);
    try {
      saveProductImages(projectId, images);
      if (!changed) {
        toast.message("No photo changes to save");
        return;
      }
      if (images.length === 0) {
        saveVisualProfile(projectId, null);
        toast.success("Photos cleared");
        return;
      }
      const res = await fetch("/api/analyze-product-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          images: images.map((i) => ({ dataUrl: i.dataUrl })),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          profile: import("@/types").ProductVisualProfile | null;
        };
        saveVisualProfile(projectId, data.profile);
        toast.success("Product photos re-analyzed ✓");
      } else {
        toast.message("Photos saved — re-analysis failed, keeping previous summary.");
      }
    } catch (err) {
      toast.error("Failed to save photos: " + (err as Error).message);
    } finally {
      setSavingPhotos(false);
    }
  };

  return (
    <>
      <TopBar>
        <span className="mono-tag text-muted-foreground">Edit project</span>
      </TopBar>
      <div className="p-8 max-w-3xl space-y-8">
        <div>
          <div className="mono-tag text-muted-foreground mb-2">Editing</div>
          <h1 className="text-3xl font-semibold tracking-tight mb-1">
            {project.projectName}
          </h1>
          <p className="text-muted-foreground text-sm">
            Update the brief or product photos. Existing concepts and elements stay untouched.
          </p>
          <Link
            to="/app/project/$projectId"
            params={{ projectId }}
            className="mono-tag text-accent inline-block mt-3"
          >
            ← Back to project
          </Link>
        </div>

        <form
          onSubmit={submitBrief}
          className="p-6 bg-surface border border-border rounded-xl space-y-4"
        >
          <h2 className="text-lg font-semibold tracking-tight">Brief</h2>

          <Field label="Brand description">
            <textarea
              value={brandDescription}
              onChange={(e) => setBrandDescription(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>
          <Field label="Product description">
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>
          <Field label="Key features">
            <textarea
              value={keyFeatures}
              onChange={(e) => setKeyFeatures(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>
          <Field label="Key benefits">
            <textarea
              value={keyBenefits}
              onChange={(e) => setKeyBenefits(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>
          <Field label="Goal">
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as ProjectGoal)}
              className={inputCls}
            >
              {GOALS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tone">
            <input
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingBrief}
              className="inline-flex items-center h-10 px-5 bg-ink text-background text-sm font-medium rounded-md disabled:opacity-50"
            >
              {savingBrief ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

        <div className="p-6 bg-surface border border-border rounded-xl space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Product photos</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Add or remove photos, then save to re-analyze the visual profile. The brand
              theme is refreshed the next time you re-run research or regenerate a concept.
            </p>
          </div>
          <ProductImageUploader images={images} onChange={setImages} optional />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setImages(storedImages)}
              disabled={savingPhotos || sameImageSet(images, storedImages)}
              className="mono-tag px-3 py-1.5 rounded-md border border-border bg-background hover:border-foreground/30 disabled:opacity-40"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={submitPhotos}
              disabled={savingPhotos}
              className="inline-flex items-center h-10 px-5 bg-ink text-background text-sm font-medium rounded-md disabled:opacity-50"
            >
              {savingPhotos ? "Saving & re-analyzing…" : "Save photos"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mono-tag text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  );
}
