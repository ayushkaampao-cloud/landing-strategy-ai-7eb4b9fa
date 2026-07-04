// Brand theme palette derivation.
// Two sources: extracted from product_visual_profiles.visibleColors, or
// picked from a category default map. Pure functions — safe on both server
// (classify-project handler) and client (concept page fallback).

export interface ThemePalette {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  source: "product_photos" | "category_default";
}

// ---------- color helpers ----------

const NAMED_COLORS: Record<string, string> = {
  white: "#FFFFFF", black: "#0A0A0A",
  red: "#DC2626", crimson: "#B91C3C", scarlet: "#E11D48",
  orange: "#EA580C", amber: "#D97706", yellow: "#EAB308",
  lime: "#65A30D", green: "#16A34A", emerald: "#059669",
  sage: "#7B9B7A", olive: "#556B2F", forest: "#1F3B2D", mint: "#A7F3D0",
  teal: "#0D9488", cyan: "#0891B2", turquoise: "#14B8A6",
  sky: "#0284C7", blue: "#2563EB", navy: "#1E3A5F", cobalt: "#1E40AF",
  indigo: "#4F46E5", violet: "#7C3AED", purple: "#9333EA",
  fuchsia: "#C026D3", magenta: "#C026D3",
  pink: "#DB2777", rose: "#E11D48", coral: "#FF7F50", salmon: "#FA8072",
  peach: "#FFDAB9", apricot: "#FBCEB1",
  brown: "#78350F", tan: "#D2B48C", beige: "#E7D9C4", cream: "#F5EBDD",
  ivory: "#FBF7EE", sand: "#E5D3B3", terracotta: "#B75A3C",
  gold: "#D4A24C", bronze: "#B08D57", copper: "#B87333",
  silver: "#C0C0C0", gray: "#6B7280", grey: "#6B7280",
  charcoal: "#2A2A2A", slate: "#475569", stone: "#78716C",
  lavender: "#C4B5FD", plum: "#7F3F82", burgundy: "#7A1F2B",
  maroon: "#7F1D1D", mustard: "#C99A2E",
};

export function normalizeColor(input: string): string | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (!s) return null;
  const hex3 = s.match(/#?([0-9a-f]{3})\b/);
  const hex6 = s.match(/#?([0-9a-f]{6})\b/);
  if (hex6) return "#" + hex6[1].toUpperCase();
  if (hex3) {
    const h = hex3[1];
    return "#" + (h[0] + h[0] + h[1] + h[1] + h[2] + h[2]).toUpperCase();
  }
  // search for a named color token inside the string
  for (const key of Object.keys(NAMED_COLORS)) {
    // whole-word-ish
    if (s === key || s.includes(` ${key}`) || s.startsWith(`${key} `) || s.includes(key)) {
      return NAMED_COLORS[key];
    }
  }
  return null;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return "#" + (c(r) + c(g) + c(b)).toUpperCase();
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hue2rgb(p, q, h + 1 / 3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1 / 3) * 255,
  ];
}
function saturationScore(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const [, s, l] = rgbToHsl(r, g, b);
  // Penalize colors that are near white/black — they carry no brand identity.
  const midWeight = 1 - Math.abs(l - 0.5) * 1.6;
  return s * Math.max(0.05, midWeight);
}
function hueDistance(a: string, b: string): number {
  const [ah] = rgbToHsl(...hexToRgb(a));
  const [bh] = rgbToHsl(...hexToRgb(b));
  const d = Math.abs(ah - bh);
  return Math.min(d, 360 - d);
}
export function contrastText(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#111111" : "#FFFFFF";
}
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

// ---------- category defaults ----------

const CATEGORY_PALETTES: Record<string, Omit<ThemePalette, "source">> = {
  b2b_saas: {
    primary: "#0F2540", accent: "#3B82F6",
    background: "#F6F8FC", surface: "#FFFFFF",
    text: "#0F172A", mutedText: "#64748B",
  },
  finance_software: {
    primary: "#0B2545", accent: "#10B981",
    background: "#F4F7FA", surface: "#FFFFFF",
    text: "#0B1524", mutedText: "#556072",
  },
  dtc_physical_product: {
    primary: "#2A231D", accent: "#C7623A",
    background: "#F5EEE4", surface: "#FBF7F0",
    text: "#1F1A15", mutedText: "#7A6E63",
  },
  beauty_skincare: {
    primary: "#7A4E3B", accent: "#E8B69A",
    background: "#FBF2E9", surface: "#FFF8F0",
    text: "#3D2A1F", mutedText: "#9A7C6A",
  },
  service_consulting: {
    primary: "#1F2937", accent: "#B08A50",
    background: "#F9F6F0", surface: "#FFFFFF",
    text: "#1B1F27", mutedText: "#6B7280",
  },
  hardware_device: {
    primary: "#0A0B0D", accent: "#39FF88",
    background: "#111214", surface: "#1A1B1F",
    text: "#F4F4F5", mutedText: "#A1A1AA",
  },
  food_beverage: {
    primary: "#5B2A1F", accent: "#E5642F",
    background: "#FBF4E9", surface: "#FFFAF1",
    text: "#2A1610", mutedText: "#8A6A54",
  },
  other: {
    primary: "#1F2544", accent: "#7C4DFF",
    background: "#F6F5FA", surface: "#FFFFFF",
    text: "#141428", mutedText: "#6B6A82",
  },
};

export function categoryPalette(category?: string): ThemePalette {
  const base =
    CATEGORY_PALETTES[category ?? "other"] ?? CATEGORY_PALETTES.other;
  return { ...base, source: "category_default" };
}

// ---------- product-photo derivation ----------

export function paletteFromColors(
  colors: string[],
  category?: string,
): ThemePalette | null {
  const normalized = colors
    .map(normalizeColor)
    .filter((x): x is string => !!x);
  if (normalized.length === 0) return null;

  // Rank by saturation; the first is primary. Accent is the most-saturated
  // color that is hue-distant from primary (>= 30°). Falls back to a
  // desaturated variant of primary when no distant hue exists.
  const sorted = [...normalized].sort(
    (a, b) => saturationScore(b) - saturationScore(a),
  );
  const primary = sorted[0];
  const accent =
    sorted.slice(1).find((c) => hueDistance(c, primary) >= 30) ??
    sorted[1] ??
    // rotate primary hue as a last resort
    (() => {
      const [r, g, b] = hexToRgb(primary);
      const [h, s, l] = rgbToHsl(r, g, b);
      const [nr, ng, nb] = hslToRgb((h + 40) % 360, Math.min(1, s + 0.1), l);
      return rgbToHex(nr, ng, nb);
    })();

  // Neutrals ride on the category defaults so text stays legible and the
  // background reads on-brand for the vertical (warm creams for skincare,
  // cool grays for SaaS, etc.).
  const fallback = categoryPalette(category);
  return {
    primary,
    accent,
    background: fallback.background,
    surface: fallback.surface,
    text: fallback.text,
    mutedText: fallback.mutedText,
    source: "product_photos",
  };
}

export function resolveThemePalette(opts: {
  category?: string;
  visibleColors?: string[];
}): ThemePalette {
  const fromPhotos =
    opts.visibleColors && opts.visibleColors.length > 0
      ? paletteFromColors(opts.visibleColors, opts.category)
      : null;
  return fromPhotos ?? categoryPalette(opts.category);
}
