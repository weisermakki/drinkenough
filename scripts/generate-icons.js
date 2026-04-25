// Generates water drop icons for DrinkEnough using pngjs (no extra deps)
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const SIZE = 1024;
const OUT = path.join(__dirname, '..', 'assets', 'images');

// Drop geometry (tuned for 1024x1024)
const CX    = SIZE / 2;   // 512 – horizontal center
const TIP_Y = 90;         // top point of the drop
const CY    = 668;        // center of the round base
const CR    = 262;        // radius of the round base

// Brand colors
const PRIMARY   = { r: 56,  g: 184, b: 235 }; // #38b8eb
const LIGHT     = { r: 125, g: 216, b: 245 }; // #7dd8f5
const DARK      = { r: 42,  g: 159, b: 212 }; // #2a9fd4
const BG_LIGHT  = { r: 230, g: 244, b: 254 }; // #E6F4FE (android bg)

// ── shape ──────────────────────────────────────────────────────────────────

function insideDrop(px, py) {
  const x = px - CX;

  // Round base (lower circle)
  const dy = py - CY;
  if (x * x + dy * dy <= CR * CR) return true;

  // Upper tapered region
  if (py < TIP_Y || py > CY) return false;
  const t = (py - TIP_Y) / (CY - TIP_Y); // 0 at tip, 1 at circle center
  const halfW = CR * Math.pow(t, 0.52);   // smooth power taper
  return Math.abs(x) < halfW;
}

// 2×2 super-sampling → smooth edges
function coverage(px, py) {
  let hits = 0;
  for (let sy = 0; sy < 2; sy++)
    for (let sx = 0; sx < 2; sx++)
      if (insideDrop(px + sx * 0.5, py + sy * 0.5)) hits++;
  return hits / 4;
}

// ── color ──────────────────────────────────────────────────────────────────

function dropColor(px, py) {
  // Vertical gradient: LIGHT at top, PRIMARY in middle, DARK at bottom
  const dropH = CY + CR - TIP_Y;
  const t = Math.max(0, Math.min(1, (py - TIP_Y) / dropH));

  let r, g, b;
  if (t < 0.45) {
    const u = t / 0.45;
    r = LIGHT.r + (PRIMARY.r - LIGHT.r) * u;
    g = LIGHT.g + (PRIMARY.g - LIGHT.g) * u;
    b = LIGHT.b + (PRIMARY.b - LIGHT.b) * u;
  } else {
    const u = (t - 0.45) / 0.55;
    r = PRIMARY.r + (DARK.r - PRIMARY.r) * u;
    g = PRIMARY.g + (DARK.g - PRIMARY.g) * u;
    b = PRIMARY.b + (DARK.b - PRIMARY.b) * u;
  }

  // White specular highlight (upper-left area)
  const hx = px - (CX - CR * 0.32);
  const hy = py - (TIP_Y + (CY - TIP_Y) * 0.28);
  const hd2 = (hx * hx + hy * hy) / (CR * CR * 0.12);
  const highlight = Math.max(0, 1 - hd2) * 0.55;

  return {
    r: Math.min(255, r + (255 - r) * highlight),
    g: Math.min(255, g + (255 - g) * highlight),
    b: Math.min(255, b + (255 - b) * highlight),
  };
}

// ── PNG helpers ────────────────────────────────────────────────────────────

function makePNG(getPixel) {
  const png = new PNG({ width: SIZE, height: SIZE });
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const { r, g, b, a } = getPixel(x, y);
      png.data[i]     = Math.round(r);
      png.data[i + 1] = Math.round(g);
      png.data[i + 2] = Math.round(b);
      png.data[i + 3] = Math.round(a);
    }
  }
  return PNG.sync.write(png);
}

function savePNG(filename, getPixel) {
  const buf = makePNG(getPixel);
  const p = path.join(OUT, filename);
  fs.writeFileSync(p, buf);
  console.log('wrote', p);
}

// ── icon variants ──────────────────────────────────────────────────────────

// 1. Main icon – white background + drop
savePNG('icon.png', (x, y) => {
  const c = coverage(x, y);
  if (c === 0) return { r: 255, g: 255, b: 255, a: 255 };
  const dc = dropColor(x, y);
  return {
    r: dc.r * c + 255 * (1 - c),
    g: dc.g * c + 255 * (1 - c),
    b: dc.b * c + 255 * (1 - c),
    a: 255,
  };
});

// 2. Android foreground – transparent bg, drop shape
savePNG('android-icon-foreground.png', (x, y) => {
  const c = coverage(x, y);
  if (c === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const dc = dropColor(x, y);
  return { r: dc.r, g: dc.g, b: dc.b, a: Math.round(255 * c) };
});

// 3. Android background – solid brand light
savePNG('android-icon-background.png', () => ({
  r: BG_LIGHT.r, g: BG_LIGHT.g, b: BG_LIGHT.b, a: 255,
}));

// 4. Android monochrome – transparent bg, white drop
savePNG('android-icon-monochrome.png', (x, y) => {
  const c = coverage(x, y);
  return { r: 255, g: 255, b: 255, a: Math.round(255 * c) };
});

// 5. Splash icon – white background + drop (same as main icon)
savePNG('splash-icon.png', (x, y) => {
  const c = coverage(x, y);
  if (c === 0) return { r: 255, g: 255, b: 255, a: 255 };
  const dc = dropColor(x, y);
  return {
    r: dc.r * c + 255 * (1 - c),
    g: dc.g * c + 255 * (1 - c),
    b: dc.b * c + 255 * (1 - c),
    a: 255,
  };
});

// 6. Favicon – white background + drop (same as main icon)
savePNG('favicon.png', (x, y) => {
  const c = coverage(x, y);
  if (c === 0) return { r: 255, g: 255, b: 255, a: 255 };
  const dc = dropColor(x, y);
  return {
    r: dc.r * c + 255 * (1 - c),
    g: dc.g * c + 255 * (1 - c),
    b: dc.b * c + 255 * (1 - c),
    a: 255,
  };
});

console.log('Done.');
