import type {
  GeneratedImagePreview,
  SectionProps,
  ThemePalette,
} from "@/types";
import { Editable } from "./Editable";
import { EditableBullets } from "./EditableBullets";
import { contrastText, withAlpha } from "@/lib/theme/palette";

type EditField = keyof Pick<
  SectionProps,
  "title" | "subtitle" | "body" | "highlight" | "ctaLabel" | "ctaSecondaryLabel"
>;

interface EditingProps {
  onEdit?: (field: EditField, value: string) => void;
  onEditBullets?: (bullets: string[]) => void;
  onEditItems?: (items: { title: string; body: string }[]) => void;
  isEdited?: (path: string) => boolean;
  saveError?: (path: string) => string | undefined;
}

interface Props extends EditingProps {
  section: SectionProps;
  theme: ThemePalette;
  image?: GeneratedImagePreview;
}

interface SectionCtx extends EditingProps {
  section: SectionProps;
  theme: ThemePalette;
  image?: GeneratedImagePreview;
  imageUrl: string;
  hasImage: boolean;
}

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

function PlaceholderBadge({ section }: { section: SectionProps }) {
  if (!section.placeholder && !section.proofNeeded) return null;
  const label = section.placeholder
    ? "Needs your input"
    : "Suggested — verify before use";
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-800 text-[10px] font-medium tracking-wide uppercase">
      <span className="size-1.5 rounded-full bg-amber-500" />
      {label}
    </div>
  );
}

/** Themed placeholder frame for missing images — never blank, never gray. */
function BrandedImageFrame({
  theme,
  label,
  aspect = "aspect-[16/9]",
  rounded = "rounded-xl",
}: {
  theme: ThemePalette;
  label: string;
  aspect?: string;
  rounded?: string;
}) {
  return (
    <div
      className={`${aspect} ${rounded} grid place-items-center relative overflow-hidden`}
      style={{
        background: `linear-gradient(135deg, ${withAlpha(theme.primary, 0.12)} 0%, ${withAlpha(theme.accent, 0.18)} 100%), ${theme.surface}`,
        border: `1px solid ${withAlpha(theme.primary, 0.15)}`,
      }}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${withAlpha(theme.accent, 0.25)} 0%, transparent 60%)`,
        }}
      />
      <span
        className="relative mono-tag text-[10px] tracking-[0.15em] uppercase"
        style={{ color: theme.mutedText }}
      >
        {label}
      </span>
    </div>
  );
}

/** Renders the section image if we have one; otherwise a branded placeholder. */
function SectionImage({
  ctx,
  aspect,
  rounded,
  label,
  className,
}: {
  ctx: SectionCtx;
  aspect?: string;
  rounded?: string;
  label: string;
  className?: string;
}) {
  const finalAspect = aspect ?? "aspect-[16/9]";
  const finalRounded = rounded ?? "rounded-xl";
  if (ctx.hasImage) {
    return (
      <div
        className={`${finalAspect} ${finalRounded} overflow-hidden ${className ?? ""}`}
        style={{ background: ctx.theme.surface }}
      >
        <img
          src={ctx.imageUrl}
          alt={label}
          className="w-full h-full object-cover block"
          loading="lazy"
        />
      </div>
    );
  }
  return (
    <BrandedImageFrame
      theme={ctx.theme}
      label={label}
      aspect={finalAspect}
      rounded={finalRounded}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Editable helpers                                                    */
/* ------------------------------------------------------------------ */

function useEditables(ctx: SectionCtx) {
  const { section: s, onEdit, onEditBullets, onEditItems, isEdited, saveError } = ctx;

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
        edited={isEdited?.(field)}
        saveError={saveError?.(field)}
      />
    );
  };

  const renderBullets = (bullets: string[] | undefined, dotColor?: string) => {
    if (!onEditBullets) {
      return (
        <ul className="space-y-2">
          {(bullets ?? []).map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <span
                className="mt-2 size-1.5 rounded-full shrink-0"
                style={{ background: dotColor ?? ctx.theme.accent }}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <EditableBullets
        bullets={bullets ?? []}
        onChange={onEditBullets}
        edited={isEdited?.("bullets")}
        saveError={saveError?.("bullets")}
      />
    );
  };

  const renderItem = (
    it: { title: string; body: string },
    i: number,
    titleClass: string,
    bodyClass: string,
  ) => {
    if (!onEditItems) {
      return (
        <>
          <h3 className={titleClass}>{it.title}</h3>
          <p className={bodyClass}>{it.body}</p>
        </>
      );
    }
    const updateItem = (patch: Partial<{ title: string; body: string }>) => {
      const next = (s.items ?? []).slice();
      next[i] = { ...next[i], ...patch };
      onEditItems(next);
    };
    return (
      <>
        <h3 className={titleClass}>
          <Editable
            value={it.title}
            placeholder="Add title"
            onSave={(v) => updateItem({ title: v })}
            edited={isEdited?.(`items.${i}.title`)}
            saveError={saveError?.(`items.${i}.title`)}
          />
        </h3>
        <p className={bodyClass}>
          <Editable
            value={it.body}
            placeholder="Add body"
            multiline
            onSave={(v) => updateItem({ body: v })}
            edited={isEdited?.(`items.${i}.body`)}
            saveError={saveError?.(`items.${i}.body`)}
          />
        </p>
      </>
    );
  };

  return { E, renderBullets, renderItem };
}

/* ------------------------------------------------------------------ */
/* Main dispatcher                                                     */
/* ------------------------------------------------------------------ */

export function SectionRenderer(props: Props) {
  const { section: s, theme, image, onEdit, onEditBullets, onEditItems, isEdited, saveError } = props;
  const imageUrl = image?.realUrl || image?.previewUrl || "";
  const hasImage = !!imageUrl && image?.status !== "placeholder";
  const ctx: SectionCtx = {
    section: s,
    theme,
    image,
    imageUrl,
    hasImage,
    onEdit,
    onEditBullets,
    onEditItems,
    isEdited,
    saveError,
  };
  const needsBadge = s.placeholder || s.proofNeeded;
  const content = renderByType(ctx);
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

function renderByType(ctx: SectionCtx) {
  switch (ctx.section.type) {
    case "hero": return <HeroSection ctx={ctx} />;
    case "benefit-strip": return <BenefitStripSection ctx={ctx} />;
    case "problem-solution": return <ProblemSolutionSection ctx={ctx} />;
    case "feature-grid": return <FeatureGridSection ctx={ctx} />;
    case "story": return <StorySection ctx={ctx} />;
    case "lifestyle": return <LifestyleSection ctx={ctx} />;
    case "comparison": return <ComparisonSection ctx={ctx} />;
    case "social-proof": return <SocialProofSection ctx={ctx} />;
    case "faq": return <FaqSection ctx={ctx} />;
    case "offer": return <OfferSection ctx={ctx} />;
    case "guarantee": return <GuaranteeSection ctx={ctx} />;
    case "cta": return <CtaSection ctx={ctx} />;
    case "details": return <DetailsSection ctx={ctx} />;
    default: return <GenericSection ctx={ctx} />;
  }
}

/* ------------------------------------------------------------------ */
/* Section components                                                  */
/* ------------------------------------------------------------------ */

function HeroSection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { E } = useEditables(ctx);
  const accentText = contrastText(theme.accent);
  const primaryText = contrastText(theme.primary);
  return (
    <section
      className="px-6 md:px-12 py-14 md:py-20"
      style={{ background: theme.background, color: theme.text, borderTop: `1px solid ${withAlpha(theme.primary, 0.06)}` }}
    >
      <div className="grid md:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
        <div>
          {(s.highlight || ctx.onEdit) && (
            <div
              className="inline-block mono-tag mb-5 px-2.5 py-1 rounded-full text-[10px] tracking-[0.15em] uppercase"
              style={{
                background: withAlpha(theme.accent, 0.15),
                color: theme.primary,
              }}
            >
              {E("highlight", "Add eyebrow tag")}
            </div>
          )}
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-balance mb-5 leading-[1.05]"
            style={{ color: theme.primary }}
          >
            {E("title", "Add hero headline")}
          </h1>
          {(s.subtitle || ctx.onEdit) && (
            <p
              className="text-lg mb-7 leading-relaxed max-w-lg"
              style={{ color: theme.mutedText }}
            >
              {E("subtitle", "Add supporting subhead", true)}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <span
              className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-semibold"
              style={{ background: theme.accent, color: accentText }}
            >
              {E("ctaLabel", "Add primary CTA")}
            </span>
            {(s.ctaSecondaryLabel || ctx.onEdit) && (
              <span
                className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-semibold border"
                style={{
                  borderColor: withAlpha(theme.primary, 0.25),
                  color: theme.primary,
                  background: "transparent",
                }}
              >
                {E("ctaSecondaryLabel", "Add secondary CTA")}
              </span>
            )}
          </div>
        </div>
        <div className="order-first md:order-last">
          <SectionImage
            ctx={ctx}
            aspect="aspect-[4/5] md:aspect-[5/6]"
            rounded="rounded-2xl"
            label="Hero visual"
          />
        </div>
      </div>
      {/* fallback line so contrast/primary tokens are considered referenced */}
      <span className="sr-only" style={{ color: primaryText }} />
    </section>
  );
}

function BenefitStripSection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { renderBullets } = useEditables(ctx);
  return (
    <section
      className="px-6 md:px-12 py-8"
      style={{
        background: withAlpha(theme.accent, 0.08),
        borderTop: `1px solid ${withAlpha(theme.primary, 0.08)}`,
        borderBottom: `1px solid ${withAlpha(theme.primary, 0.08)}`,
        color: theme.text,
      }}
    >
      <div className="max-w-6xl mx-auto">
        {renderBullets(s.bullets)}
      </div>
    </section>
  );
}

function ProblemSolutionSection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { E } = useEditables(ctx);
  return (
    <section
      className="px-6 md:px-12 py-20 md:py-24"
      style={{ background: theme.background, color: theme.text, borderTop: `1px solid ${withAlpha(theme.primary, 0.06)}` }}
    >
      <div className="grid md:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
        <div>
          <div
            className="mono-tag mb-3 text-[10px] tracking-[0.15em] uppercase"
            style={{ color: theme.accent }}
          >
            The problem → the fix
          </div>
          <h2
            className="text-3xl md:text-4xl font-semibold tracking-tight mb-4 leading-tight"
            style={{ color: theme.primary }}
          >
            {E("title", "Add problem/solution headline")}
          </h2>
          <p
            className="text-base leading-relaxed"
            style={{ color: theme.mutedText }}
          >
            {E("body", "Add supporting body copy", true)}
          </p>
        </div>
        <SectionImage
          ctx={ctx}
          aspect="aspect-square"
          rounded="rounded-2xl"
          label="Problem / solution visual"
        />
      </div>
    </section>
  );
}

function FeatureGridSection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { E, renderItem } = useEditables(ctx);
  return (
    <section
      className="px-6 md:px-12 py-20 md:py-24"
      style={{ background: theme.background, color: theme.text, borderTop: `1px solid ${withAlpha(theme.primary, 0.06)}` }}
    >
      <div className="max-w-6xl mx-auto">
        {(s.title || ctx.onEdit) && (
          <h2
            className="text-3xl md:text-4xl font-semibold tracking-tight mb-8 max-w-2xl leading-tight"
            style={{ color: theme.primary }}
          >
            {E("title", "Add feature grid title")}
          </h2>
        )}
        {ctx.hasImage && (
          <div className="mb-8">
            <SectionImage
              ctx={ctx}
              aspect="aspect-[21/9]"
              rounded="rounded-2xl"
              label="Feature banner"
            />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(s.items ?? []).map((it, i) => (
            <div
              key={i}
              className="p-6 rounded-xl"
              style={{
                background: theme.surface,
                border: `1px solid ${withAlpha(theme.primary, 0.1)}`,
              }}
            >
              <div
                className="size-8 grid place-items-center rounded-lg mb-4 text-xs font-mono font-semibold"
                style={{
                  background: withAlpha(theme.accent, 0.15),
                  color: theme.accent,
                }}
              >
                0{i + 1}
              </div>
              {renderItem(
                it,
                i,
                "font-semibold mb-1.5 text-base",
                "text-sm leading-relaxed",
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StorySection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { E } = useEditables(ctx);
  return (
    <section
      className="px-6 md:px-12 py-16 md:py-20"
      style={{
        background: withAlpha(theme.primary, 0.04),
        color: theme.text,
      }}
    >
      <div className="grid md:grid-cols-5 gap-10 items-center max-w-6xl mx-auto">
        <div className="md:col-span-2">
          <SectionImage
            ctx={ctx}
            aspect="aspect-[4/5]"
            rounded="rounded-2xl"
            label="Story image"
          />
        </div>
        <div className="md:col-span-3">
          <div
            className="text-5xl leading-none mb-3 font-serif"
            style={{ color: theme.accent }}
          >
            “
          </div>
          <h2
            className="font-display text-3xl md:text-4xl font-semibold mb-5 leading-tight"
            style={{ color: theme.primary }}
          >
            {E("title", "Add story headline")}
          </h2>
          <p
            className="text-base leading-relaxed"
            style={{ color: theme.mutedText }}
          >
            {E("body", "Add story body", true)}
          </p>
        </div>
      </div>
    </section>
  );
}

function LifestyleSection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { E } = useEditables(ctx);
  return (
    <section
      className="px-6 md:px-12 py-20 md:py-24"
      style={{ background: theme.background, color: theme.text, borderTop: `1px solid ${withAlpha(theme.primary, 0.06)}` }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <SectionImage
            ctx={ctx}
            aspect="aspect-[21/9]"
            rounded="rounded-2xl"
            label="Lifestyle imagery"
          />
        </div>
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-3xl md:text-4xl font-semibold tracking-tight mb-4"
            style={{ color: theme.primary }}
          >
            {E("title", "Add lifestyle headline")}
          </h2>
          <p
            className="text-base leading-relaxed"
            style={{ color: theme.mutedText }}
          >
            {E("body", "Add lifestyle body", true)}
          </p>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { E, renderItem } = useEditables(ctx);
  const primaryText = contrastText(theme.primary);
  return (
    <section
      className="px-6 md:px-12 py-20 md:py-24"
      style={{ background: theme.background, color: theme.text, borderTop: `1px solid ${withAlpha(theme.primary, 0.06)}` }}
    >
      <div className="max-w-5xl mx-auto">
        {(s.title || ctx.onEdit) && (
          <h2
            className="text-3xl md:text-4xl font-semibold tracking-tight mb-8 text-center"
            style={{ color: theme.primary }}
          >
            {E("title", "Add comparison title")}
          </h2>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {(s.items ?? []).map((it, i) => {
            const isOurs = i === (s.items?.length ?? 0) - 1;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl"
                style={
                  isOurs
                    ? {
                        background: theme.primary,
                        color: primaryText,
                        boxShadow: `0 20px 40px -20px ${withAlpha(theme.primary, 0.5)}`,
                      }
                    : {
                        background: theme.surface,
                        color: theme.mutedText,
                        border: `1px solid ${withAlpha(theme.primary, 0.1)}`,
                      }
                }
              >
                <div
                  className="mono-tag mb-3 text-[10px] tracking-[0.15em] uppercase"
                  style={{
                    color: isOurs ? theme.accent : theme.mutedText,
                  }}
                >
                  {isOurs ? "Our approach" : "Old way"}
                </div>
                {renderItem(
                  it,
                  i,
                  "font-semibold mb-2 text-lg",
                  "text-sm leading-relaxed",
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SocialProofSection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { E, renderBullets } = useEditables(ctx);
  return (
    <section
      className="px-6 md:px-12 py-16 text-center"
      style={{
        background: withAlpha(theme.accent, 0.06),
        color: theme.text,
      }}
    >
      <div className="max-w-3xl mx-auto">
        {(s.title || ctx.onEdit) && (
          <div
            className="mono-tag mb-4 text-[10px] tracking-[0.15em] uppercase"
            style={{ color: theme.accent }}
          >
            {E("title", "Add proof label")}
          </div>
        )}
        {ctx.hasImage && (
          <div
            className="size-16 rounded-full overflow-hidden mx-auto mb-6"
            style={{ border: `2px solid ${theme.accent}` }}
          >
            <img
              src={ctx.imageUrl}
              alt="Testimonial"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div
          className="text-4xl leading-none mb-3 font-serif"
          style={{ color: theme.accent }}
        >
          “
        </div>
        <p
          className="text-xl md:text-2xl font-medium italic leading-relaxed mb-5"
          style={{ color: theme.primary }}
        >
          {E("body", "Add real customer testimonial here", true)}
        </p>
        <p
          className="mono-tag text-[11px] tracking-wider uppercase"
          style={{ color: theme.mutedText }}
        >
          {E("highlight", "Add attribution (name, role)")}
        </p>
        {(s.bullets || ctx.onEditBullets) && (
          <div className="mt-8 max-w-xl mx-auto text-left">
            {renderBullets(s.bullets)}
          </div>
        )}
      </div>
    </section>
  );
}

function FaqSection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { E, renderItem } = useEditables(ctx);
  return (
    <section
      className="px-6 md:px-12 py-20 md:py-24"
      style={{ background: theme.background, color: theme.text, borderTop: `1px solid ${withAlpha(theme.primary, 0.06)}` }}
    >
      <div className="max-w-3xl mx-auto">
        {(s.title || ctx.onEdit) && (
          <h2
            className="text-3xl md:text-4xl font-semibold tracking-tight mb-8"
            style={{ color: theme.primary }}
          >
            {E("title", "Add FAQ title")}
          </h2>
        )}
        <div className="space-y-3">
          {(s.items ?? []).map((it, i) => (
            <div
              key={i}
              className="p-5 rounded-xl"
              style={{
                background: theme.surface,
                border: `1px solid ${withAlpha(theme.primary, 0.1)}`,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 size-6 grid place-items-center rounded-full text-xs font-mono font-semibold shrink-0"
                  style={{
                    background: withAlpha(theme.accent, 0.15),
                    color: theme.accent,
                  }}
                >
                  Q
                </div>
                <div className="flex-1 min-w-0">
                  {renderItem(
                    it,
                    i,
                    "font-semibold mb-1.5 text-base",
                    "text-sm leading-relaxed",
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OfferSection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { E } = useEditables(ctx);
  const accentText = contrastText(theme.accent);
  return (
    <section
      className="px-6 md:px-12 py-20 md:py-24"
      style={{
        background: withAlpha(theme.accent, 0.08),
        color: theme.text,
        borderTop: `1px solid ${withAlpha(theme.primary, 0.06)}`,
      }}
    >
      <div
        className="max-w-2xl mx-auto text-center p-10 md:p-12 rounded-2xl"
        style={{
          background: theme.surface,
          border: `1px solid ${withAlpha(theme.accent, 0.25)}`,
          boxShadow: `0 20px 40px -24px ${withAlpha(theme.accent, 0.3)}`,
        }}
      >
        <h2
          className="text-3xl md:text-4xl font-semibold tracking-tight mb-3"
          style={{ color: theme.primary }}
        >
          {E("title", "Add offer title")}
        </h2>
        <p
          className="text-base mb-7 leading-relaxed"
          style={{ color: theme.mutedText }}
        >
          {E("subtitle", "Add offer subtitle", true)}
        </p>
        <span
          className="inline-flex items-center px-7 py-3.5 rounded-lg text-sm font-semibold"
          style={{ background: theme.accent, color: accentText }}
        >
          {E("ctaLabel", "Add offer CTA")}
        </span>
      </div>
    </section>
  );
}


function GuaranteeSection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { E } = useEditables(ctx);
  return (
    <section
      className="px-6 md:px-12 py-12"
      style={{ background: theme.background, color: theme.text, borderTop: `1px solid ${withAlpha(theme.primary, 0.06)}` }}
    >
      <div
        className="max-w-3xl mx-auto flex items-start gap-5 p-6 rounded-xl"
        style={{
          background: theme.surface,
          border: `1px solid ${withAlpha(theme.accent, 0.3)}`,
        }}
      >
        <div
          className="size-12 rounded-full grid place-items-center shrink-0 text-lg font-bold"
          style={{
            background: theme.accent,
            color: contrastText(theme.accent),
          }}
        >
          ✓
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold mb-1.5 text-base"
            style={{ color: theme.primary }}
          >
            {E("title", "Add guarantee title")}
          </h3>
          <p
            className="text-sm leading-relaxed"
            style={{ color: theme.mutedText }}
          >
            {E(
              "body",
              "Add real guarantee terms — do not fabricate",
              true,
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

function DetailsSection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { E, renderBullets } = useEditables(ctx);
  return (
    <section
      className="px-6 md:px-12 py-20 md:py-24"
      style={{ background: theme.background, color: theme.text, borderTop: `1px solid ${withAlpha(theme.primary, 0.06)}` }}
    >
      <div className="grid md:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
        <div>
          {(s.title || ctx.onEdit) && (
            <h2
              className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 leading-tight"
              style={{ color: theme.primary }}
            >
              {E("title", "Add details title")}
            </h2>
          )}
          {renderBullets(s.bullets)}
        </div>
        <SectionImage
          ctx={ctx}
          aspect="aspect-[4/5]"
          rounded="rounded-2xl"
          label="Details visual"
        />
      </div>
    </section>
  );
}

function CtaSection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { E } = useEditables(ctx);
  return (
    <section
      className="px-6 md:px-12 py-20 md:py-24"
      style={{
        background: theme.background,
        color: theme.text,
        borderTop: `1px solid ${withAlpha(theme.primary, 0.06)}`,
      }}
    >
      <div
        className="max-w-3xl mx-auto text-center p-10 md:p-14 rounded-2xl"
        style={{
          background: theme.surface,
          border: `1px solid ${withAlpha(theme.primary, 0.12)}`,
          boxShadow: `0 24px 48px -28px ${withAlpha(theme.primary, 0.25)}`,
        }}
      >
        <h2
          className="text-4xl md:text-5xl font-semibold tracking-tight mb-8 leading-tight"
          style={{ color: theme.primary }}
        >
          {E("title", "Add closing CTA headline")}
        </h2>
        <span
          className="inline-flex items-center px-8 py-4 rounded-lg text-base font-semibold"
          style={{ background: theme.accent, color: contrastText(theme.accent) }}
        >
          {E("ctaLabel", "Add CTA label")}
        </span>
      </div>
    </section>
  );
}


function GenericSection({ ctx }: { ctx: SectionCtx }) {
  const { theme, section: s } = ctx;
  const { E } = useEditables(ctx);
  return (
    <section
      className="px-6 md:px-12 py-14"
      style={{ background: theme.background, color: theme.text, borderTop: `1px solid ${withAlpha(theme.primary, 0.06)}` }}
    >
      <div className="max-w-3xl mx-auto">
        <h2
          className="text-2xl md:text-3xl font-semibold tracking-tight mb-3"
          style={{ color: theme.primary }}
        >
          {E("title", "Add section title")}
        </h2>
        {(s.body || ctx.onEdit) && (
          <p
            className="text-base leading-relaxed mb-6"
            style={{ color: theme.mutedText }}
          >
            {E("body", "Add section body", true)}
          </p>
        )}
        {ctx.hasImage && (
          <SectionImage ctx={ctx} label="Section visual" />
        )}
      </div>
    </section>
  );
}
