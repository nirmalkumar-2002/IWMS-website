import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { rng } from './builder';

/** Window atlases hold this many variants side by side; the last lit slot is solid white. */
export const WINDOW_SLOTS = 4;
export const LIT_SLOTS = WINDOW_SLOTS + 1;

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function finish(c: HTMLCanvasElement, srgb = true, repeat = true): Texture {
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping;
  t.minFilter = LinearMipmapLinearFilter;
  t.anisotropy = 4;
  return t;
}

/** Window frame + MS grille pattern drawn over a pane, shared by lit and unlit atlases. */
function frame(
  ctx: CanvasRenderingContext2D,
  x0: number,
  variant: number,
  size: number,
  color: string,
) {
  ctx.fillStyle = color;
  const b = 7;
  ctx.fillRect(x0, 0, size, b);
  ctx.fillRect(x0, size - b, size, b);
  ctx.fillRect(x0, 0, b, size);
  ctx.fillRect(x0 + size - b, 0, b, size);
  if (variant === 0) {
    // Two-track aluminium slider.
    ctx.fillRect(x0 + size / 2 - 3, 0, 6, size);
  } else if (variant === 1) {
    // Three-panel casement with fixed top vent.
    ctx.fillRect(x0 + size / 3 - 2, 0, 4, size);
    ctx.fillRect(x0 + (2 * size) / 3 - 2, 0, 4, size);
    ctx.fillRect(x0, size * 0.24, size, 4);
  } else if (variant === 2) {
    // MS safety grille: vertical bars and two flats.
    for (let i = 1; i < 9; i++) ctx.fillRect(x0 + (i * size) / 9 - 1, 0, 2.5, size);
    ctx.fillRect(x0, size * 0.33, size, 3);
    ctx.fillRect(x0, size * 0.66, size, 3);
    ctx.fillRect(x0 + size / 2 - 3, 0, 6, size);
  } else {
    ctx.fillRect(x0 + size / 2 - 3, 0, 6, size);
    ctx.fillRect(x0, size * 0.5 - 2, size, 4);
  }
}

/** Unlit glazing: dark panes with a faint interior and lighter frames. Multiplies glass colour. */
export function makeGlassAtlas() {
  const s = 128;
  const [c, ctx] = canvas(s * WINDOW_SLOTS, s);
  const random = rng(41);
  for (let k = 0; k < WINDOW_SLOTS; k++) {
    const x0 = k * s;
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#9aa3ad');
    g.addColorStop(1, '#6f767e');
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, s, s);
    // Curtains / furniture silhouettes faintly behind the glass.
    if (random() < 0.7) {
      ctx.fillStyle = 'rgba(40,40,44,0.35)';
      ctx.fillRect(x0 + 8, 8, s * (0.18 + random() * 0.2), s - 16);
      ctx.fillRect(x0 + s - 8 - s * 0.25, 8, s * 0.25, s - 16);
    }
    frame(ctx, x0, k, s, '#d8d8d4');
  }
  return finish(c, true, false);
}

/** Lit interiors: ceiling-light falloff, curtains, frames; last slot solid white for lamps. */
export function makeLitAtlas() {
  const s = 128;
  const [c, ctx] = canvas(s * LIT_SLOTS, s);
  for (let k = 0; k < WINDOW_SLOTS; k++) {
    const x0 = k * s;
    const g = ctx.createRadialGradient(x0 + s / 2, s * 0.05, 4, x0 + s / 2, s * 0.4, s * 0.9);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#8a8a8a');
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, s, s);
    if (k === 1 || k === 3) {
      // Drawn curtains glowing through: folds as soft vertical bands.
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = `rgba(60,45,35,${0.18 + (i % 3) * 0.08})`;
        ctx.fillRect(x0 + (i * s) / 16, 0, s / 32, s);
      }
      ctx.fillStyle = 'rgba(70,50,35,0.35)';
      ctx.fillRect(x0, 0, s, s);
    } else {
      ctx.fillStyle = 'rgba(30,25,22,0.55)';
      ctx.fillRect(x0 + 6, 6, s * 0.22, s - 12);
      // Furniture / cupboard silhouette low in the room.
      ctx.fillStyle = 'rgba(25,20,18,0.45)';
      ctx.fillRect(x0 + s * 0.55, s * 0.62, s * 0.38, s * 0.38);
    }
    frame(ctx, x0, k, s, '#151413');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(WINDOW_SLOTS * s, 0, s, s);
  return finish(c, true, false);
}

/** UV rect of window variant k inside an atlas with `slots` columns. */
export function slotUV(k: number, slots: number): [number, number, number, number] {
  const pad = 0.5 / (128 * slots);
  return [k / slots + pad, 0.004, (k + 1) / slots - pad, 0.996];
}

/** One vertical bar per tile on transparent: compound-wall grilles and MS gates (alpha-tested). */
export function makeGrille() {
  const [c, ctx] = canvas(32, 32);
  ctx.clearRect(0, 0, 32, 32);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(12, 0, 8, 32);
  const t = finish(c, true, true);
  return t;
}

/** Foliage atlas: left half a leafy clump (neem / shrubs), right half a coconut frond. */
export function makeFoliage() {
  const s = 256;
  const [c, ctx] = canvas(s * 2, s);
  const random = rng(77);
  ctx.clearRect(0, 0, s * 2, s);
  for (let i = 0; i < 1400; i++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * s * 0.46;
    const x = s / 2 + Math.cos(a) * r;
    const y = s / 2 + Math.sin(a) * r * 0.9;
    const l = 150 + random() * 105;
    ctx.fillStyle = `rgb(${l},${l},${l})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + random() * 4, 1.6 + random() * 2, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Frond: rib along the card's length (v), leaflets angled toward the tip.
  const x0 = s;
  ctx.strokeStyle = '#d8d8d8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0 + s / 2, s);
  ctx.lineTo(x0 + s / 2, 4);
  ctx.stroke();
  for (let i = 0; i < 44; i++) {
    const y = s - 8 - i * 5.6;
    const len = (s * 0.46) * Math.sin(((i + 4) / 50) * Math.PI) * (0.85 + random() * 0.15);
    const l = 170 + random() * 80;
    ctx.strokeStyle = `rgb(${l},${l},${l})`;
    ctx.lineWidth = 2.6;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x0 + s / 2, y);
      ctx.quadraticCurveTo(
        x0 + s / 2 + side * len * 0.5,
        y - len * 0.2,
        x0 + s / 2 + side * len,
        y - len * 0.5 + random() * 6,
      );
      ctx.stroke();
    }
  }
  return finish(c, true, false);
}

/** Galvanised / painted shutter ribs (multiplies the vertex colour). */
export function makeRibs() {
  const [c, ctx] = canvas(4, 64);
  for (let y = 0; y < 64; y++) {
    const k = 0.5 + 0.5 * Math.cos((y / 64) * Math.PI * 2 * 4);
    const l = Math.round(200 + 55 * k);
    ctx.fillStyle = `rgb(${l},${l},${l})`;
    ctx.fillRect(0, y, 4, 1);
  }
  return finish(c, true, true);
}

/**
 * Mid-distance facade (4 bays × 4 floors per tile): plaster with dark windows, chajja shadow
 * and slab bands; plus the matching emissive map with ~`lit` of windows lit.
 */
export function makeFacade(lit: number, seed: number) {
  const s = 256;
  const [c, ctx] = canvas(s, s);
  const [e, ectx] = canvas(s, s);
  const random = rng(seed);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, s, s);
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, s, s);
  const bay = s / 4;
  const floor = s / 4;
  for (let f = 0; f < 4; f++) {
    const y = f * floor;
    ctx.fillStyle = '#bdbab3';
    ctx.fillRect(0, y + floor - 5, s, 5);
    for (let b = 0; b < 4; b++) {
      const wx = b * bay + bay * 0.3;
      const wy = y + floor * 0.3;
      const ww = bay * 0.42;
      const wh = floor * 0.44;
      ctx.fillStyle = '#3a3f47';
      ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = '#7d7a74';
      ctx.fillRect(wx - 4, wy - 7, ww + 8, 5);
      if (random() < lit) {
        const warm = random() < 0.75;
        ectx.fillStyle = warm ? (random() < 0.5 ? '#ffb36b' : '#ffc88a') : '#e2ecff';
        ectx.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
      }
    }
  }
  return { map: finish(c), emissive: finish(e) };
}

/** Far skyline: sparse window dots on black (added on top of the pre-fogged wall colour). */
export function makeSkyDots(ratio: number, seed: number) {
  const s = 256;
  const [c, ctx] = canvas(s, s);
  const random = rng(seed);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, s, s);
  const cols = 20;
  const rows = 20;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      if (random() < ratio) {
        ctx.fillStyle = random() < 0.75 ? '#7a4f2a' : '#4f5866';
        ctx.fillRect((x * s) / cols + 4, (y * s) / rows + 4, 5, 6);
      }
  return finish(c);
}
