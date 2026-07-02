interface GroundingBadgeProps {
  count: number;
  hasProfile: boolean;
}

export function GroundingBadge({ count, hasProfile }: GroundingBadgeProps) {
  const grounded = count > 0 && hasProfile;
  return (
    <span
      className={`mono-tag inline-flex items-center gap-1.5 px-2 py-0.5 rounded ring-soft ${
        grounded
          ? "bg-accent/10 text-accent"
          : "bg-surface-muted text-muted-foreground"
      }`}
      title={
        grounded
          ? `Downstream prompts reference ${count} uploaded product image${count === 1 ? "" : "s"}`
          : "No product images uploaded — visuals inferred from text only"
      }
    >
      <span
        className={`size-1.5 rounded-full ${grounded ? "bg-accent" : "bg-muted-foreground/50"}`}
      />
      {grounded
        ? `Grounded in ${count} uploaded image${count === 1 ? "" : "s"}`
        : "Text-only visual inference"}
    </span>
  );
}
