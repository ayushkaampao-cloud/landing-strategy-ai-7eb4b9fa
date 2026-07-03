import type { SectionProps } from "@/types";
import { Editable } from "./Editable";

type EditField = keyof Pick<
  SectionProps,
  "title" | "subtitle" | "body" | "highlight" | "ctaLabel" | "ctaSecondaryLabel"
>;

interface Props {
  section: SectionProps;
  onEdit?: (field: EditField, value: string) => void;
}

function PlaceholderBadge({ section }: { section: SectionProps }) {
  if (!section.placeholder && !section.proofNeeded) return null;
  const label = section.placeholder ? "Needs your input" : "Suggested — verify before use";
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-800 text-[10px] font-medium tracking-wide uppercase mb-3">
      <span className="size-1.5 rounded-full bg-amber-500" />
      {label}
    </div>
  );
}

export function SectionRenderer({ section, onEdit }: Props) {
  const s = section;
  const needsBadge = s.placeholder || s.proofNeeded;
  const editable = !!onEdit && (s.placeholder === true || s.proofNeeded === true);
  const content = renderSection(s, editable ? onEdit : undefined);
  if (!needsBadge) return content;
  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10">
        <PlaceholderBadge section={s} />
      </div>
      {content}
    </div>
  );
}

function renderSection(
  s: SectionProps,
  onEdit?: (field: EditField, v: string) => void,
) {
  const E = (
    field: EditField,
    placeholder: string,
    multiline?: boolean,
    className?: string,
  ) => {
    if (!onEdit) return <>{s[field] ?? placeholder}</>;
    return (
      <Editable
        value={s[field] as string | undefined}
        placeholder={placeholder}
        multiline={multiline}
        onSave={(v) => onEdit(field, v)}
        isPlaceholder={s.placeholder}
        className={className}
      />
    );
  };

  switch (s.type) {
    case "hero":
      return (
        <section className="px-10 py-16 border-b border-border text-center">
          {(s.highlight || onEdit) && (
            <div className="inline-block mono-tag text-muted-foreground mb-4">
              {E("highlight", "Add eyebrow tag")}
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-balance mb-4 leading-[1.05]">
            {E("title", "Add hero headline", false)}
          </h1>
          {(s.subtitle || onEdit) && (
            <p className="text-base text-muted-foreground max-w-xl mx-auto mb-6">
              {E("subtitle", "Add supporting subhead", true)}
            </p>
          )}
          <div className="flex justify-center gap-2">
            <span className="inline-flex items-center px-4 py-2 rounded-md bg-ink text-background text-sm font-medium">
              {E("ctaLabel", "Add primary CTA")}
            </span>
            {(s.ctaSecondaryLabel || onEdit) && (
              <span className="inline-flex items-center px-4 py-2 rounded-md border border-border text-sm font-medium">
                {E("ctaSecondaryLabel", "Add secondary CTA")}
              </span>
            )}
          </div>
          <div className="mt-8 aspect-[16/7] rounded-xl bg-surface-muted grid place-items-center ring-soft">
            <span className="mono-tag text-muted-foreground">Hero visual</span>
          </div>
        </section>
      );

    case "benefit-strip":
      return (
        <section className="px-10 py-8 bg-surface-muted border-b border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(s.bullets ?? []).map((b, i) => (
              <div key={i} className="text-sm font-medium flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-accent" />
                {b}
              </div>
            ))}
          </div>
        </section>
      );

    case "problem-solution":
      return (
        <section className="px-10 py-14 border-b border-border">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight mb-3">
              {E("title", "Add problem/solution headline")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {E("body", "Add supporting body copy", true)}
            </p>
          </div>
        </section>
      );

    case "feature-grid":
      return (
        <section className="px-10 py-14 border-b border-border">
          {s.title && <h2 className="text-2xl font-semibold tracking-tight mb-6">{E("title", "Add feature grid title")}</h2>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(s.items ?? []).map((it, i) => (
              <div key={i} className="p-5 border border-border rounded-lg bg-surface">
                <div className="mono-tag text-muted-foreground mb-2">0{i + 1}</div>
                <h3 className="font-semibold mb-1">{it.title}</h3>
                <p className="text-sm text-muted-foreground">{it.body}</p>
              </div>
            ))}
          </div>
        </section>
      );

    case "story":
      return (
        <section className="px-10 py-16 border-b border-border bg-surface-muted">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold mb-4 leading-tight">{E("title", "Add story headline")}</h2>
            <p className="text-muted-foreground leading-relaxed">{E("body", "Add story body", true)}</p>
          </div>
        </section>
      );

    case "lifestyle":
      return (
        <section className="px-10 py-14 border-b border-border">
          <h2 className="text-2xl font-semibold tracking-tight mb-3">{E("title", "Add lifestyle headline")}</h2>
          <p className="text-muted-foreground mb-6">{E("body", "Add lifestyle body", true)}</p>
          <div className="aspect-[16/6] rounded-xl bg-surface-muted grid place-items-center ring-soft">
            <span className="mono-tag text-muted-foreground">Lifestyle imagery</span>
          </div>
        </section>
      );

    case "comparison":
      return (
        <section className="px-10 py-14 border-b border-border">
          {s.title && <h2 className="text-2xl font-semibold tracking-tight mb-6">{E("title", "Add comparison title")}</h2>}
          <div className="grid grid-cols-2 gap-4">
            {(s.items ?? []).map((it, i) => (
              <div
                key={i}
                className={`p-5 rounded-lg border ${i === 1 ? "border-ink bg-surface" : "border-border bg-surface-muted text-muted-foreground"}`}
              >
                <h3 className="font-semibold mb-2">{it.title}</h3>
                <p className="text-sm">{it.body}</p>
              </div>
            ))}
          </div>
        </section>
      );

    case "social-proof":
      return (
        <section className="px-10 py-14 border-b border-border text-center">
          {s.title && <div className="mono-tag text-muted-foreground mb-3">{E("title", "Add proof label")}</div>}
          <p className="text-xl font-medium italic max-w-2xl mx-auto leading-relaxed">
            {E("body", "Add real customer testimonial here", true)}
          </p>
          <p className="mt-4 mono-tag">{E("highlight", "Add attribution (name, role)")}</p>
          {s.bullets && (
            <div className="flex justify-center gap-8 mt-6 flex-wrap">
              {s.bullets.map((b, i) => (
                <span key={i} className="mono-tag text-muted-foreground">{b}</span>
              ))}
            </div>
          )}
        </section>
      );

    case "faq":
      return (
        <section className="px-10 py-14 border-b border-border">
          {s.title && <h2 className="text-2xl font-semibold tracking-tight mb-6">{E("title", "Add FAQ title")}</h2>}
          <div className="divide-y divide-border border-y border-border">
            {(s.items ?? []).map((it, i) => (
              <div key={i} className="py-4">
                <h3 className="font-medium mb-1">{it.title}</h3>
                <p className="text-sm text-muted-foreground">{it.body}</p>
              </div>
            ))}
          </div>
        </section>
      );

    case "offer":
      return (
        <section className="px-10 py-14 border-b border-border bg-surface-muted text-center">
          <h2 className="text-2xl font-semibold tracking-tight mb-2">{E("title", "Add offer title")}</h2>
          <p className="text-muted-foreground mb-5">{E("subtitle", "Add offer subtitle", true)}</p>
          <span className="inline-flex items-center px-5 py-2.5 rounded-md bg-ink text-background text-sm font-medium">
            {E("ctaLabel", "Add offer CTA")}
          </span>
        </section>
      );

    case "guarantee":
      return (
        <section className="px-10 py-12 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-md bg-brand-soft text-accent grid place-items-center font-mono text-xs">
              ✓
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{E("title", "Add guarantee title")}</h3>
              <p className="text-sm text-muted-foreground">{E("body", "Add real guarantee terms — do not fabricate", true)}</p>
            </div>
          </div>
        </section>
      );

    case "details":
      return (
        <section className="px-10 py-14 border-b border-border">
          {s.title && <h2 className="text-2xl font-semibold tracking-tight mb-4">{E("title", "Add details title")}</h2>}
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {(s.bullets ?? []).map((b, i) => (
              <li key={i} className="flex gap-2 py-1 border-b border-border/60">
                <span className="mono-tag text-muted-foreground">0{i + 1}</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>
      );

    case "cta":
      return (
        <section className="px-10 py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight mb-5">{E("title", "Add closing CTA headline")}</h2>
          <span className="inline-flex items-center px-6 py-3 rounded-md bg-ink text-background text-sm font-medium">
            {E("ctaLabel", "Add CTA label")}
          </span>
        </section>
      );
  }
  return null;
}
