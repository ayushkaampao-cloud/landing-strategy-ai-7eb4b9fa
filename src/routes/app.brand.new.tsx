import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/brand/new")({
  component: NewBrand,
});

const VOICE_OPTIONS = ["Bold", "Playful", "Calm", "Expert", "Premium", "Warm", "Direct"];

function NewBrand() {
  const { createWorkspace } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [voice, setVoice] = useState<string[]>([]);
  const [audience, setAudience] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || saving) return;
    setSaving(true);
    try {
      await createWorkspace({
        name,
        brandDescription: desc,
        brandVoice: voice,
        primaryAudience: audience,
      });
      navigate({ to: "/app/product/new" });
    } catch (err) {
      toast.error("Brand could not be saved: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (v: string) =>
    setVoice((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  return (
    <>
      <TopBar />
      <div className="p-8 max-w-2xl">
        <div className="mono-tag text-accent mb-3">Step 1 of 3 · Brand</div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Create your brand</h1>
        <p className="text-muted-foreground text-sm mb-8">
          One workspace per brand. This gives strategy context to every product you add.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <Field label="Brand name" value={name} onChange={setName} required />
          <Field
            label="Brand description"
            value={desc}
            onChange={setDesc}
            textarea
            placeholder="Who you are, what you sell, what makes you different."
          />
          <div>
            <span className="mono-tag text-muted-foreground mb-2 block">Brand voice</span>
            <div className="flex flex-wrap gap-2">
              {VOICE_OPTIONS.map((v) => {
                const on = voice.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggle(v)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                      on
                        ? "bg-ink text-background border-ink"
                        : "border-border bg-surface hover:border-foreground/30"
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
          <Field
            label="Primary audience"
            value={audience}
            onChange={setAudience}
            placeholder="e.g. Endurance athletes 25-40 buying premium recovery gear"
          />
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-5 bg-ink text-background font-medium rounded-md text-sm disabled:opacity-60"
          >
            {saving ? "Saving brand…" : "Continue to product →"}
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
          className="w-full px-3 py-2 rounded-md border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
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
