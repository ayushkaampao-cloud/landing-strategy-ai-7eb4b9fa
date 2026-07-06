import JSZip from "jszip";
import type {
  GeneratedImagePreview,
  LandingPageConcept,
  SectionProps,
  Project,
  Workspace,
} from "@/types";

interface Args {
  concept: LandingPageConcept;
  images: GeneratedImagePreview[];
  project: Project;
  workspace: Workspace;
  sections?: SectionProps[];
  onProgress?: (done: number, total: number) => void;
}

interface Result {
  skipped: string[];
  filename: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled";

const extFromMime = (mime: string): string => {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("svg")) return "svg";
  return "png";
};

function buildCopyMarkdown(concept: LandingPageConcept, skipped: string[], sections: SectionProps[]): string {
  const lines: string[] = [];
  lines.push(`# ${concept.conceptName}`);
  lines.push("");
  lines.push(`**Framework:** ${concept.templateFamily}`);
  lines.push(`**Strategy:** ${concept.oneLineStrategy}`);
  lines.push(`**Best traffic:** ${concept.bestTrafficType}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  sections.forEach((s, i) => {
    const n = String(i + 1).padStart(2, "0");
    const heading = `${n}. ${s.type.toUpperCase()}${s.title ? ` — ${s.title}` : ""}`;
    lines.push(`## ${heading}`);
    lines.push("");
    if (s.highlight) {
      lines.push(`> ${s.highlight}`);
      lines.push("");
    }
    if (s.subtitle) {
      lines.push(`_${s.subtitle}_`);
      lines.push("");
    }
    if (s.body) {
      lines.push(s.body);
      lines.push("");
    }
    if (s.bullets && s.bullets.length > 0) {
      s.bullets.forEach((b) => lines.push(`- ${b}`));
      lines.push("");
    }
    if (s.items && s.items.length > 0) {
      s.items.forEach((it) => lines.push(`- **${it.title}:** ${it.body}`));
      lines.push("");
    }
    if (s.ctaLabel) {
      lines.push(`**CTA:** ${s.ctaLabel}`);
      if (s.ctaSecondaryLabel) lines.push(`**Secondary CTA:** ${s.ctaSecondaryLabel}`);
      lines.push("");
    }
    lines.push("");
  });

  if (skipped.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Skipped images");
    lines.push("");
    lines.push("These section images couldn't be fetched and were omitted from this zip:");
    lines.push("");
    skipped.forEach((s) => lines.push(`- ${s}`));
    lines.push("");
  }

  return lines.join("\n");
}

export async function downloadConceptZip({
  concept,
  images,
  project,
  workspace,
  sections,
  onProgress,
}: Args): Promise<Result> {
  const zip = new JSZip();
  const renderedSections = sections ?? concept.schema.sections;

  const imageBySection: Record<string, GeneratedImagePreview> = {};
  images.forEach((img) => {
    if (img.sectionId) imageBySection[img.sectionId] = img;
  });

  const downloadable: Array<{
    index: number;
    section: SectionProps;
    url: string;
  }> = [];

  renderedSections.forEach((section, i) => {
    const img = imageBySection[section.id];
    if (!img) return;
    if (img.status === "placeholder" && !img.realUrl) return;
    if (img.status === "failed") return;
    const url = img.realUrl || img.previewUrl;
    if (!url) return;
    downloadable.push({ index: i, section, url });
  });

  const skipped: string[] = [];
  let done = 0;
  onProgress?.(0, downloadable.length);

  for (const { index, section, url } of downloadable) {
    const n = String(index + 1).padStart(2, "0");
    const label = section.title ? slug(section.title) : slug(section.type);
    const sectionLabel = `${n}. ${section.type}${section.title ? ` — ${section.title}` : ""}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const ext = extFromMime(blob.type || "");
      zip.file(`images/${n}-${label}.${ext}`, blob);
    } catch (err) {
      console.warn("[download-zip] failed", sectionLabel, err);
      skipped.push(sectionLabel);
    } finally {
      done += 1;
      onProgress?.(done, downloadable.length);
    }
  }

  zip.file("copy.md", buildCopyMarkdown(concept, skipped, renderedSections));

  const filename = `${slug(workspace.name)}-${slug(project.projectName)}-${slug(concept.conceptName)}-page.zip`;

  const blob = await zip.generateAsync({ type: "blob" });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

  return { skipped, filename };
}
