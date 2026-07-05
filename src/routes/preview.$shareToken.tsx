import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SectionRenderer } from "@/components/SectionRenderer";
import { getSharedConcept, type SharedConceptPayload } from "@/lib/preview.functions";
import { resolveThemePalette } from "@/lib/theme/palette";
import type { ThemePalette } from "@/types";

const sharedConceptQuery = (token: string) =>
  queryOptions({
    queryKey: ["shared-concept", token],
    queryFn: () => getSharedConcept({ data: { token } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/preview/$shareToken")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(sharedConceptQuery(params.shareToken)),
  head: ({ loaderData }) => {
    const data = loaderData as SharedConceptPayload | null | undefined;
    if (!data) {
      return {
        meta: [
          { title: "Preview unavailable" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    const title = data.concept.conceptName;
    const desc = data.concept.oneLineStrategy;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  errorComponent: () => <PreviewMissing />,
  notFoundComponent: () => <PreviewMissing />,
  component: PreviewPage,
});

function PreviewMissing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold tracking-tight mb-2">
          This preview is no longer available
        </h1>
        <p className="text-sm text-muted-foreground">
          The share link has been disabled or is invalid.
        </p>
      </div>
    </div>
  );
}

function PreviewPage() {
  const { shareToken } = Route.useParams();
  const { data } = useSuspenseQuery(sharedConceptQuery(shareToken));

  if (!data) return <PreviewMissing />;

  const { concept, images, themePalette, category } = data;
  const theme: ThemePalette =
    themePalette ?? resolveThemePalette({ category: category ?? undefined });

  const imageBySection: Record<string, (typeof images)[number]> = {};
  images.forEach((img) => {
    if (img.sectionId) imageBySection[img.sectionId] = img;
  });

  return (
    <div className="min-h-screen" style={{ background: theme.background }}>
      <div className="max-w-3xl mx-auto">
        {concept.schema.sections.map((s) => {
          const img = imageBySection[s.id];
          const isPlaceholderImg = img && img.status === "placeholder" && !img.realUrl;
          const activeUrl = img?.realUrl || img?.previewUrl || "";
          const passImage =
            img && !isPlaceholderImg && activeUrl && img.status !== "failed"
              ? img
              : undefined;
          return (
            <div key={s.id}>
              <SectionRenderer section={s} theme={theme} image={passImage} />
            </div>
          );
        })}
      </div>
      <footer
        className="py-8 text-center text-[11px]"
        style={{ color: theme.mutedText }}
      >
        Shared preview · read-only
      </footer>
    </div>
  );
}
