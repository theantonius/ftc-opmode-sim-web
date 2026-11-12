// Canvas helpers ported from the Processing version's Draw.java.
// Text is placed like Figma text boxes: y = top of the line box.

export const LEFT = -1, CENTER = 0, RIGHT = 1;

const FAMILY = { regular: "400", semibold: "600", bold: "700" };

/** CSS font for the 2D context. kind: regular | semibold | bold | mono */
export function font(kind, size) {
  if (kind === "mono") return `400 ${size}px "Roboto Mono", monospace`;
  return `${FAMILY[kind]} ${size}px Inter, sans-serif`;
}

const metricsCache = new Map();
function metrics(ctx, f) {
  let m = metricsCache.get(f);
  if (!m) {
    ctx.save();
    ctx.font = f;
    const t = ctx.measureText("Hg");
    ctx.restore();
    m = { ascent: t.fontBoundingBoxAscent, descent: t.fontBoundingBoxDescent };
    metricsCache.set(f, m);
  }
  return m;
}

/** Call after the web fonts load so metrics come from Inter / Roboto Mono. */
export function resetMetrics() {
  metricsCache.clear();
}

export function width(ctx, s, f) {
  ctx.save();
  ctx.font = f;
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}

/** One line, "normal" line height. */
export function text(ctx, s, f, color, x, yTop, align) {
  const m = metrics(ctx, f);
  lines(ctx, [s], f, color, x, yTop, m.ascent + m.descent, align);
}

/** Several lines with a fixed line height (Figma "leading"). */
export function lines(ctx, list, f, color, x, yTop, lineHeight, align) {
  const m = metrics(ctx, f);
  const glyphBox = m.ascent + m.descent;
  ctx.save();
  ctx.font = f;
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = align === LEFT ? "left" : align === CENTER ? "center" : "right";
  list.forEach((s, n) => {
    const baseline = yTop + n * lineHeight + (lineHeight - glyphBox) / 2 + m.ascent;
    ctx.fillText(s, x, baseline);
  });
  ctx.restore();
}

/** Greedy word wrap to a pixel width. */
export function wrap(ctx, str, f, maxWidth) {
  const out = [];
  for (const para of str.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const trial = line.length === 0 ? word : line + " " + word;
      if (width(ctx, trial, f) <= maxWidth || line.length === 0) line = trial;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/** CSS-style border: stroke drawn inside the box. */
export function box(ctx, x, y, w, h, fill, border, bw) {
  ctx.save();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = bw;
    ctx.strokeRect(x + bw / 2, y + bw / 2, w - bw, h - bw);
  }
  ctx.restore();
}

/** SVG icon from assets/, drawn at its own (fractional) width/height from the SVG. */
export async function loadSvg(path) {
  const svg = await (await fetch(path)).text();
  const num = (attr) => parseFloat((svg.match(new RegExp("<svg[^>]*\\s" + attr + '="([\\d.]+)"')) || [])[1]);
  const img = new Image();
  img.w = num("width");
  img.h = num("height");
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve;
    img.src = path;
  });
  return img;
}

export function image(ctx, img, x, y) {
  if (img && img.complete && img.naturalWidth) ctx.drawImage(img, x, y, img.w, img.h);
}
