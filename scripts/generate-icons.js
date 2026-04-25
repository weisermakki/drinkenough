// Generates all app icons from assets/images/tropfen.png using pngjs
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const OUT  = path.join(__dirname, '..', 'assets', 'images');
const SRC  = path.join(OUT, 'tropfen.png');
const SIZE = 1024;

// Brand background color for Android adaptive icon
const BG = { r: 230, g: 244, b: 254 }; // #E6F4FE

// ── load source ────────────────────────────────────────────────────────────

const srcBuf = fs.readFileSync(SRC);
const src = PNG.sync.read(srcBuf);
const SW = src.width;
const SH = src.height;

function srcPixel(sx, sy) {
  sx = Math.max(0, Math.min(SW - 1, Math.round(sx)));
  sy = Math.max(0, Math.min(SH - 1, Math.round(sy)));
  const i = (sy * SW + sx) * 4;
  return {
    r: src.data[i],
    g: src.data[i + 1],
    b: src.data[i + 2],
    a: src.data[i + 3],
  };
}

// Bilinear interpolation from source into SIZE×SIZE
function sample(dx, dy) {
  const fx = (dx / SIZE) * SW;
  const fy = (dy / SIZE) * SH;
  const x0 = Math.floor(fx), x1 = Math.min(SW - 1, x0 + 1);
  const y0 = Math.floor(fy), y1 = Math.min(SH - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;

  const p00 = srcPixel(x0, y0);
  const p10 = srcPixel(x1, y0);
  const p01 = srcPixel(x0, y1);
  const p11 = srcPixel(x1, y1);

  return {
    r: (1-tx)*(1-ty)*p00.r + tx*(1-ty)*p10.r + (1-tx)*ty*p01.r + tx*ty*p11.r,
    g: (1-tx)*(1-ty)*p00.g + tx*(1-ty)*p10.g + (1-tx)*ty*p01.g + tx*ty*p11.g,
    b: (1-tx)*(1-ty)*p00.b + tx*(1-ty)*p10.b + (1-tx)*ty*p01.b + tx*ty*p11.b,
    a: (1-tx)*(1-ty)*p00.a + tx*(1-ty)*p10.a + (1-tx)*ty*p01.a + tx*ty*p11.a,
  };
}

// Detect if a pixel is "background white" (outer white area of the source image).
// Uses brightness + distance-from-source-alpha for images with existing alpha,
// or a simple white-detection heuristic for fully opaque sources.
function isWhiteBg(p) {
  // If source already has alpha channel, trust it
  if (p.a < 200) return true;
  // Otherwise: very bright, low saturation → treat as white background
  const brightness = (p.r + p.g + p.b) / 3;
  const maxC = Math.max(p.r, p.g, p.b);
  const minC = Math.min(p.r, p.g, p.b);
  const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;
  return brightness > 245 && saturation < 0.06;
}

// ── PNG builder ────────────────────────────────────────────────────────────

function savePNG(filename, transform) {
  const png = new PNG({ width: SIZE, height: SIZE });
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const p = sample(x, y);
      const out = transform(p, x, y);
      const i = (y * SIZE + x) * 4;
      png.data[i]     = Math.round(Math.max(0, Math.min(255, out.r)));
      png.data[i + 1] = Math.round(Math.max(0, Math.min(255, out.g)));
      png.data[i + 2] = Math.round(Math.max(0, Math.min(255, out.b)));
      png.data[i + 3] = Math.round(Math.max(0, Math.min(255, out.a)));
    }
  }
  const outPath = path.join(OUT, filename);
  fs.writeFileSync(outPath, PNG.sync.write(png));
  console.log('wrote', outPath);
}

// ── icon variants ──────────────────────────────────────────────────────────

// 1. icon.png – hellblauer Hintergrund für iOS (kein Transparenz-Support)
savePNG('icon.png', (p) =>
  isWhiteBg(p)
    ? { r: BG.r, g: BG.g, b: BG.b, a: 255 }
    : { r: p.r, g: p.g, b: p.b, a: 255 }
);

// 2. android-icon-foreground.png – transparenter Hintergrund, Tropfen bleibt
savePNG('android-icon-foreground.png', (p) =>
  isWhiteBg(p)
    ? { r: 0, g: 0, b: 0, a: 0 }
    : { r: p.r, g: p.g, b: p.b, a: 255 }
);

// 3. android-icon-background.png – Vollfarbe #E6F4FE (hellblau)
savePNG('android-icon-background.png', () => ({
  r: BG.r, g: BG.g, b: BG.b, a: 255,
}));

// 4. android-icon-monochrome.png – weißer Tropfen, transparent
savePNG('android-icon-monochrome.png', (p) =>
  isWhiteBg(p)
    ? { r: 255, g: 255, b: 255, a: 0 }
    : { r: 255, g: 255, b: 255, a: 255 }
);

// 5. splash-icon.png – hellblauer Hintergrund
savePNG('splash-icon.png', (p) =>
  isWhiteBg(p)
    ? { r: BG.r, g: BG.g, b: BG.b, a: 255 }
    : { r: p.r, g: p.g, b: p.b, a: 255 }
);

// 6. favicon.png – transparenter Hintergrund für Web
savePNG('favicon.png', (p) =>
  isWhiteBg(p)
    ? { r: 0, g: 0, b: 0, a: 0 }
    : { r: p.r, g: p.g, b: p.b, a: 255 }
);

console.log('Done.');
