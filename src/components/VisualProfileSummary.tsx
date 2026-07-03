import type { ProductVisualProfile } from "@/types";

interface Props {
  profile: ProductVisualProfile | null;
  imageCount: number;
  compact?: boolean;
}

export function VisualProfileSummary({ profile, imageCount, compact }: Props) {
  if (!profile) {
    return (
      <div className="p-3 border border-dashed border-border rounded-lg text-[12px] text-muted-foreground">
        <div className="mono-tag mb-1">Visual profile</div>
        Text-only visual inference — no product images uploaded.
      </div>
    );
  }
  const rows: [string, string | string[] | undefined][] = [
    ["Product type", profile.productType],
    ["Colors", profile.visibleColors],
    ["Materials", profile.visibleMaterials],
    ["Shape", profile.shapeDescription],
    ["Packaging", profile.packagingStyle],
    ["Label", profile.labelStyle],
    ["Key parts", profile.keyVisibleParts],
    ["Must preserve", profile.mustPreserve],
    ["Must avoid", profile.mustAvoid],
  ];
  return (
    <div
      className={`border border-accent/30 bg-accent/5 rounded-lg ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="mono-tag text-accent">Visual profile · grounded</div>
        <div className="mono-tag text-muted-foreground">
          {imageCount} image{imageCount === 1 ? "" : "s"} analyzed
        </div>
      </div>
      <dl
        className={`grid ${compact ? "grid-cols-1 gap-1.5" : "grid-cols-2 gap-x-4 gap-y-1.5"} text-[11px]`}
      >
        {rows.map(([label, val]) => {
          const text = Array.isArray(val) ? val.filter(Boolean).join(", ") : val;
          if (!text) return null;
          return (
            <div key={label} className="min-w-0">
              <dt className="mono-tag text-muted-foreground">{label}</dt>
              <dd className="leading-snug break-words">{text}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
