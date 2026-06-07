/**
 * Typography/vector design engine. Deterministically turns text + presets into
 * a shirt-safe SVG. Typography-first (cleaner, safer, easier to print) — not AI art.
 */

export interface ColorPreset {
  id: string;
  background: string; // CSS color; 'transparent' for print
  foreground: string;
}

export interface LayoutPreset {
  id: string;
  fontFamily: string; // a commercially-licensed font (e.g. a Google Font)
  fontWeight: number;
  /** uppercase / title / as-is */
  textTransform: 'uppercase' | 'title' | 'none';
  maxLines: number;
}

export interface DesignRequest {
  slogan: string;
  layout: LayoutPreset;
  color: ColorPreset;
  /** Shirt-safe print area in pixels at the target DPI. */
  widthPx: number;
  heightPx: number;
}

export interface DesignArtifact {
  svg: string;
  metadata: {
    slogan: string;
    fontFamily: string;
    colors: ColorPreset;
    layoutId: string;
    widthPx: number;
    heightPx: number;
  };
}

function applyTransform(text: string, transform: LayoutPreset['textTransform']): string {
  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'title':
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    default:
      return text;
  }
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!,
  );
}

/** Render a master SVG. Raster export (PNG at 300 DPI) is handled downstream. */
export function renderSvg(req: DesignRequest): DesignArtifact {
  const text = escapeXml(applyTransform(req.slogan, req.layout.textTransform));
  const bg =
    req.color.background === 'transparent'
      ? ''
      : `<rect width="100%" height="100%" fill="${req.color.background}"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${req.widthPx}" height="${req.heightPx}" viewBox="0 0 ${req.widthPx} ${req.heightPx}">
  ${bg}
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="${escapeXml(req.layout.fontFamily)}" font-weight="${req.layout.fontWeight}" fill="${req.color.foreground}" font-size="${Math.round(req.heightPx / 6)}">${text}</text>
</svg>`;

  return {
    svg,
    metadata: {
      slogan: req.slogan,
      fontFamily: req.layout.fontFamily,
      colors: req.color,
      layoutId: req.layout.id,
      widthPx: req.widthPx,
      heightPx: req.heightPx,
    },
  };
}
