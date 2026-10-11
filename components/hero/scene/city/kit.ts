import { FACE, GeoBuilder, mix, rgb, shade, type RGB, type Rng } from './builder';
import { LIT_SLOTS, WINDOW_SLOTS, slotUV } from './textures';

/** Material buckets: one merged mesh per bucket per chunk. */
export type Bucket =
  | 'plaster'
  | 'concrete'
  | 'pavers'
  | 'asphalt'
  | 'glass'
  | 'glow'
  | 'paint'
  | 'marking'
  | 'grille'
  | 'foliage'
  | 'facade'
  | 'facadeDim'
  | 'skyline'
  | 'ground';

const BUCKET_UV: Record<Bucket, [number, number, [number, number]?]> = {
  plaster: [2, 2],
  concrete: [2, 1],
  pavers: [2, 2],
  asphalt: [3.2, 3.2],
  glass: [1, 1],
  glow: [1, 1, [(WINDOW_SLOTS + 0.5) / LIT_SLOTS, 0.5]],
  paint: [1, 0.4, [0.5, 0.01]],
  marking: [1, 1],
  grille: [0.13, 1],
  foliage: [1, 1, [0.25, 0.5]],
  facade: [12, 12.4],
  facadeDim: [12, 12.4],
  skyline: [12, 12, [0.001, 0.999]],
  ground: [40, 40],
};

export class Chunk {
  builders = new Map<Bucket, GeoBuilder>();
  /** Overhead wires as line-segment pairs (x, y, z, x, y, z). */
  wires: number[] = [];
  constructor(public name: string) {}
  g(bucket: Bucket) {
    let b = this.builders.get(bucket);
    if (!b) {
      const [su, sv, flat] = BUCKET_UV[bucket];
      b = new GeoBuilder(su, sv, flat);
      this.builders.set(bucket, b);
    }
    return b;
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Palette (sRGB hex → linear). Nothing on plaster brighter than ~#e0e0e0, no pure black.     */

export const PAL = {
  plaster: [
    [rgb('#d6d1c4'), 0.3],
    [rgb('#c9b596'), 0.22],
    [rgb('#d3c38c'), 0.16],
    [rgb('#a8aaa5'), 0.22],
    [rgb('#9fb4ab'), 0.1],
  ] as [RGB, number][],
  terracotta: rgb('#a0553a'),
  concrete: rgb('#8f8c86'),
  brick: rgb('#8a4b36'),
  roof: rgb('#6c6862'),
  kerb: rgb('#7a7d80'),
  shutters: [
    [rgb('#8a8f95'), 0.6],
    [rgb('#3d5a80'), 0.14],
    [rgb('#3f6b4a'), 0.13],
    [rgb('#6b2e2e'), 0.13],
  ] as [RGB, number][],
  tanks: [
    [rgb('#1b1b1b'), 0.7],
    [rgb('#d4d4ce'), 0.25],
    [rgb('#2d4a78'), 0.05],
  ] as [RGB, number][],
  metalDark: rgb('#3a3f45'),
  pole: rgb('#8d8a84'),
  ac: rgb('#9c9c97'),
  railing: rgb('#2e3236'),
  glass: rgb('#ffffff'),
  litWarm: rgb('#ffb36b'),
  litSoft: rgb('#ffc88a'),
  litTube: rgb('#e2ecff'),
};

export function weighted<T>(r: Rng, list: [T, number][]): T {
  let k = r();
  for (const [v, w] of list) {
    if (k < w) return v;
    k -= w;
  }
  return list[list.length - 1][0];
}

/** Per-building plaster: palette pick with slight random drift so neighbours never match exactly. */
export function plasterColor(r: Rng): RGB {
  const base = weighted(r, PAL.plaster);
  const k = r.range(0.86, 1.0);
  return mix(shade(base, k), rgb('#b8b2a6'), r.range(0, 0.15));
}

export function litColor(r: Rng): RGB {
  const k = r();
  const c = k < 0.45 ? PAL.litWarm : k < 0.8 ? PAL.litSoft : PAL.litTube;
  return shade(c, r.range(0.7, 1.1));
}

/* ------------------------------------------------------------------------------------------ */
/* Face-relative helpers. A Face is a vertical plane through (x, z) with axis-aligned outward  */
/* normal n; `a` runs along the face to the viewer's right, `o` outward along n.              */

export interface Face {
  x: number;
  z: number;
  nx: number;
  nz: number;
  rx: number;
  rz: number;
}
export const face = (x: number, z: number, nx: number, nz: number): Face => ({
  x,
  z,
  nx,
  nz,
  rx: nz,
  rz: -nx,
});
export const fp = (f: Face, a: number, o: number): [number, number] => [
  f.x + f.rx * a + f.nx * o,
  f.z + f.rz * a + f.nz * o,
];
export const dirBit = (nx: number, nz: number) =>
  nx > 0.5 ? FACE.PX : nx < -0.5 ? FACE.NX : nz > 0.5 ? FACE.PZ : FACE.NZ;

export function fbox(
  g: GeoBuilder,
  f: Face,
  a0: number,
  a1: number,
  y0: number,
  y1: number,
  o0: number,
  o1: number,
  color: RGB,
  opts?: Parameters<GeoBuilder['box']>[7],
) {
  const [xa, za] = fp(f, a0, o0);
  const [xb, zb] = fp(f, a1, o1);
  g.box(
    Math.min(xa, xb),
    y0,
    Math.min(za, zb),
    Math.max(xa, xb),
    y1,
    Math.max(za, zb),
    color,
    opts,
  );
}

export function fquad(
  g: GeoBuilder,
  f: Face,
  a: number,
  y: number,
  o: number,
  hw: number,
  hh: number,
  color: RGB | [RGB, RGB],
  uv?: [number, number, number, number] | 'flat',
) {
  const [x, z] = fp(f, a, o);
  g.quad([x, y, z], [f.nx, 0, f.nz], [0, 1, 0], hw, hh, color, uv);
}

/** Glazed opening: lit interior or dark reflective glass, with optional chajja, sill and AC. */
export function windowAt(
  c: Chunk,
  f: Face,
  a: number,
  ySill: number,
  w: number,
  h: number,
  lit: number,
  r: Rng,
  opts: { chajja?: boolean; sill?: boolean; ac?: number; trim?: RGB } = {},
) {
  const variant = r.int(0, WINDOW_SLOTS - 1);
  const yc = ySill + h / 2;
  if (r() < lit) fquad(c.g('glow'), f, a, yc, 0.012, w / 2, h / 2, litColor(r), slotUV(variant, LIT_SLOTS));
  else
    fquad(
      c.g('glass'),
      f,
      a,
      yc,
      0.012,
      w / 2,
      h / 2,
      shade(PAL.glass, r.range(0.8, 1)),
      slotUV(variant, WINDOW_SLOTS),
    );
  const trim = opts.trim ?? PAL.concrete;
  if (opts.sill !== false)
    fbox(c.g('concrete'), f, a - w / 2 - 0.08, a + w / 2 + 0.08, ySill - 0.08, ySill, 0, 0.1, trim, {
      skip: 0,
    });
  if (opts.chajja !== false)
    fbox(
      c.g('concrete'),
      f,
      a - w / 2 - 0.25,
      a + w / 2 + 0.25,
      ySill + h + 0.15,
      ySill + h + 0.24,
      0,
      0.6,
      trim,
      { skip: 0 },
    );
  if (opts.ac && r() < opts.ac) {
    const side = r() < 0.5 ? -1 : 1;
    const ax = a + side * (w / 2 + 0.55);
    fbox(c.g('paint'), f, ax - 0.4, ax + 0.4, ySill - 0.05, ySill + 0.5, 0, 0.28, PAL.ac, {
      uv: 'flat',
      skip: 0,
    });
  }
}

/** Cylindrical water tank on a stand (black Sintex-type dominates). */
export function tank(c: Chunk, x: number, y: number, z: number, r: Rng, standH = 0.6, seg = 14) {
  const col = weighted(r, PAL.tanks);
  const paint = c.g('paint');
  if (standH > 0) {
    paint.box(x - 0.6, y, z - 0.6, x + 0.6, y + standH, z + 0.6, rgb('#4b4d50'), {
      uv: 'flat',
    });
  }
  const y0 = y + standH;
  paint.cylinder(x, z, y0, y0 + 1.2, 0.55, 0.55, seg, col, { cap: false });
  paint.cylinder(x, z, y0 + 1.2, y0 + 1.36, 0.55, 0.2, seg, col, { cap: true });
}

/* ------------------------------------------------------------------------------------------ */
/* Buildings                                                                                  */

export type Kind = 'shop' | 'apartment' | 'house' | 'tower';
export interface BuildingSpec {
  /** Front face plane: centre of the frontage at ground level, outward normal. */
  x: number;
  z: number;
  nx: number;
  nz: number;
  width: number;
  depth: number;
  /** Storeys above the ground storey (G+n). */
  floors: number;
  kind: Kind;
  lit: number;
  /** Side walls visible (gap to neighbour). */
  exposed: [boolean, boolean];
  detail: 'full' | 'mid';
}

export const FLOOR = 3.1;
const PLINTH = 0.45;
const PARAPET = 1.0;

/**
 * Contemporary Indian RCC frame typologies: plinth, slab bands, chajjas, balconies, shutters,
 * stilt parking, parapet with coping, stair headroom and water tanks on every roof.
 */
export function building(c: Chunk, r: Rng, s: BuildingSpec) {
  const f0 = face(s.x, s.z, s.nx, s.nz);
  // Front-left corner.
  const [lx, lz] = fp(f0, -s.width / 2, 0);
  const front = face(lx, lz, s.nx, s.nz);
  const w = s.width;
  const d = s.depth;
  const wall = plasterColor(r);
  const accent = r() < 0.3;
  const trim = r() < 0.5 ? shade(wall, 0.85) : mix(PAL.concrete, wall, 0.4);
  const ground = s.kind === 'shop' ? 4.5 : s.kind === 'house' ? PLINTH + FLOOR : 3.0;
  const H = ground + s.floors * FLOOR;
  const leftBit = dirBit(-front.rx, -front.rz);
  const rightBit = dirBit(front.rx, front.rz);
  const skipSides = (s.exposed[0] ? 0 : leftBit) | (s.exposed[1] ? 0 : rightBit);

  if (s.detail === 'mid') {
    const fac = c.g(s.lit < 0.08 ? 'facadeDim' : 'facade');
    fbox(fac, front, 0, w, 0, H, -d, 0, wall, { grime: 0.2, skip: FACE.NY | FACE.PY });
    roof(c, r, front, w, d, H, wall, trim, s, false);
    return;
  }

  const pl = c.g('plaster');
  const stilt = s.kind === 'apartment' || s.kind === 'tower';
  // Main mass (above stilts for apartments).
  fbox(pl, front, 0, w, stilt ? ground : 0, H, -d, 0, wall, {
    grime: stilt ? 0.08 : 0.28,
    stain: 0.1,
    skip: FACE.PY | (stilt ? 0 : FACE.NY) | skipSides,
  });
  if (stilt) stilts(c, r, front, w, d, ground, s);

  // Ground storey frontage.
  if (s.kind === 'shop') shopFront(c, r, front, w, s);
  else if (s.kind === 'house') {
    fbox(c.g('concrete'), front, -0.05, w + 0.05, 0, PLINTH, 0, 0.08, shade(PAL.concrete, 0.7));
    // Main door (dark timber) + a window or two.
    const door = r.range(1.0, w * 0.35);
    fquad(c.g('paint'), front, door, PLINTH + 1.05, 0.012, 0.55, 1.05, rgb('#3b2a20'), 'flat');
    fbox(c.g('concrete'), front, door - 0.8, door + 0.8, PLINTH + 2.35, PLINTH + 2.45, 0, 0.9, trim, {
      skip: 0,
    });
    for (let a = door + 2.2; a < w - 1; a += r.range(2.6, 3.4))
      windowAt(c, front, a, PLINTH + 0.9, 1.2, 1.35, s.lit * 1.2, r, { ac: 0.15, trim });
  }

  // Upper storeys.
  const bays = Math.max(1, Math.round(w / r.range(3.0, 3.8)));
  const bw = w / bays;
  const stairBay = s.kind === 'apartment' || s.kind === 'tower' ? Math.floor(bays / 2) : -1;
  const balconyBays = new Set<number>();
  for (let b = 0; b < bays; b++) if (b !== stairBay && r() < (s.kind === 'house' ? 0.4 : 0.3)) balconyBays.add(b);
  const balconyWall = r() < 0.5;
  for (let fl = 0; fl < s.floors; fl++) {
    const y = ground + fl * FLOOR;
    // Slab band.
    fbox(c.g('concrete'), front, -0.04, w + 0.04, y - 0.18, y + 0.02, 0, 0.06, trim);
    for (let b = 0; b < bays; b++) {
      const a = (b + 0.5) * bw;
      if (b === stairBay) continue;
      if (balconyBays.has(b)) balcony(c, r, front, a, bw, y, s.lit, balconyWall, wall, trim);
      else if (r() < 0.92) {
        const ww = bw > 3.4 && r() < 0.4 ? 1.8 : 1.2;
        windowAt(c, front, a, y + 0.9, ww, 1.35, s.lit, r, { ac: 0.25, trim });
      }
    }
  }
  if (stairBay >= 0) stairTower(c, r, front, (stairBay + 0.5) * bw, ground, H, s.floors, trim, wall);
  if (accent && s.kind !== 'tower') {
    // Terracotta feature fin climbing the facade.
    const a = r() < 0.5 ? 0.3 : w - 0.9;
    fbox(pl, front, a, a + 0.6, ground, H + 0.6, 0, 0.3, PAL.terracotta, { skip: FACE.NY });
  }

  // Exposed side walls get a column of windows near the front.
  for (const side of [0, 1] as const) {
    if (!s.exposed[side]) continue;
    const sf =
      side === 0
        ? face(...fp(front, 0, -d), -front.rx, -front.rz)
        : face(...fp(front, w, 0), front.rx, front.rz);
    // On the left face `a` runs from back to front; on the right from front to back.
    const n = Math.max(1, Math.floor(d / 4.2));
    for (let fl = 0; fl < s.floors; fl++) {
      const y = ground + fl * FLOOR;
      for (let i = 0; i < n; i++) {
        if (r() < 0.35) continue;
        const k = (i + 0.5) / n;
        const a = side === 0 ? d * k : d * (1 - k);
        windowAt(c, sf, a, y + 0.9, 1.0, 1.2, s.lit * 0.7, r, { ac: 0.15, trim });
      }
    }
  }
  roof(c, r, front, w, d, H, wall, trim, s, true);
}

function shopFront(c: Chunk, r: Rng, f: Face, w: number, s: BuildingSpec) {
  const paint = c.g('paint');
  // Step/plinth platform along the frontage.
  fbox(c.g('concrete'), f, 0, w, 0, 0.15, 0, 0.9, shade(PAL.concrete, 0.75), { skip: 0 });
  const n = Math.max(1, Math.round(w / r.range(3.2, 4.4)));
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) * sw;
    const hw = sw / 2 - 0.3;
    if (r() < 0.07) {
      // Early-opening shop: dim lit interior, shutter rolled up under the fascia.
      fquad(c.g('glow'), f, a, 0.15 + 1.6, 0.01, hw, 1.6, shade(PAL.litWarm, 0.55), slotUV(r.int(0, 3), LIT_SLOTS));
      fbox(paint, f, a - hw, a + hw, 3.35, 3.75, 0, 0.3, weighted(r, PAL.shutters), { uv: 'flat' });
    } else {
      fbox(paint, f, a - hw, a + hw, 0.15, 3.75, 0, 0.05, shade(weighted(r, PAL.shutters), r.range(0.75, 1)), {
        skip: FACE.NY,
      });
    }
  }
  // Sunshade over the shutters; fascia above stays blank.
  fbox(c.g('concrete'), f, 0, w, 3.75, 3.85, 0, 0.9, shade(PAL.concrete, 0.9), { skip: 0 });
  if (s.lit > 0 && r() < 0.35) {
    // Tube light under the sunshade.
    const a = r.range(1, w - 1);
    fbox(c.g('glow'), f, a - 0.6, a + 0.6, 3.68, 3.74, 0.3, 0.36, shade(PAL.litTube, 1.6), {
      uv: 'flat',
      skip: 0,
    });
  }
}

function balcony(
  c: Chunk,
  r: Rng,
  f: Face,
  a: number,
  bw: number,
  y: number,
  lit: number,
  solid: boolean,
  wall: RGB,
  trim: RGB,
) {
  const hw = Math.min(bw / 2 - 0.15, 1.7);
  // French door behind.
  const variant = r.int(0, WINDOW_SLOTS - 1);
  if (r() < lit) fquad(c.g('glow'), f, a, y + 1.05, 0.012, 0.55, 1.05, litColor(r), slotUV(variant, LIT_SLOTS));
  else fquad(c.g('glass'), f, a, y + 1.05, 0.012, 0.55, 1.05, PAL.glass, slotUV(variant, WINDOW_SLOTS));
  fbox(c.g('concrete'), f, a - hw, a + hw, y - 0.15, y + 0.02, 0, 1.2, trim, { skip: 0 });
  if (solid) {
    fbox(c.g('plaster'), f, a - hw, a + hw, y + 0.02, y + 1.0, 1.08, 1.2, wall, { skip: FACE.NY });
    fbox(c.g('plaster'), f, a - hw, a - hw + 0.12, y + 0.02, y + 1.0, 0, 1.08, wall, { skip: FACE.NY });
    fbox(c.g('plaster'), f, a + hw - 0.12, a + hw, y + 0.02, y + 1.0, 0, 1.08, wall, { skip: FACE.NY });
  } else {
    fbox(c.g('paint'), f, a - hw, a + hw, y + 0.95, y + 1.0, 1.12, 1.18, PAL.railing, { uv: 'flat', skip: 0 });
    fquad(c.g('grille'), f, a, y + 0.5, 1.15, hw, 0.48, PAL.railing);
  }
  // Clothes-line / drying rail sometimes.
  if (r() < 0.15)
    fbox(c.g('paint'), f, a - hw, a + hw, y + 2.2, y + 2.22, 0.9, 0.92, rgb('#5a5a58'), { uv: 'flat', skip: 0 });
}

function stairTower(
  c: Chunk,
  r: Rng,
  f: Face,
  a: number,
  ground: number,
  H: number,
  floors: number,
  trim: RGB,
  wall: RGB,
) {
  const hw = 1.6;
  fbox(c.g('plaster'), f, a - hw, a + hw, ground, H + 2.4, 0, 0.5, shade(wall, 0.94), {
    skip: FACE.NY,
    stain: 0.12,
  });
  fbox(c.g('concrete'), f, a - hw - 0.1, a + hw + 0.1, H + 2.4, H + 2.55, -0.6, 0.6, trim, { skip: 0 });
  const litTower = r() < 0.5;
  for (let fl = 0; fl < floors; fl++) {
    const y = ground + fl * FLOOR + 1.55;
    if (litTower && r() < 0.85)
      fquad(c.g('glow'), f, a, y + 0.6, 0.51, 0.35, 0.6, shade(r() < 0.6 ? PAL.litSoft : PAL.litTube, 0.75), slotUV(2, LIT_SLOTS));
    else fquad(c.g('glass'), f, a, y + 0.6, 0.51, 0.35, 0.6, PAL.glass, slotUV(2, WINDOW_SLOTS));
  }
}

function stilts(c: Chunk, r: Rng, f: Face, w: number, d: number, h: number, s: BuildingSpec) {
  const con = c.g('concrete');
  const col = shade(PAL.concrete, 0.95);
  const nx = Math.max(2, Math.round(w / 4.5));
  const nz = Math.max(2, Math.round(d / 4.5));
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= nz; j++) {
      if (i > 0 && i < nx && j > 0 && j < nz) continue;
      const a = Math.min(w - 0.3, Math.max(0, (i * w) / nx - 0.15));
      const o = -Math.min(d - 0.45, Math.max(0, (j * d) / nz));
      fbox(con, f, a, a + 0.3, 0, h, o - 0.45, o, col);
    }
  // Dark parking interior + lift/stair core seen between the columns.
  fbox(c.g('plaster'), f, 1.5, w - 1.5, 0, h, -d + 1.5, -2.5, rgb('#45433f'), { skip: FACE.PY });
  // Parking floor.
  fbox(con, f, 0, w, 0, 0.05, -d, 0, rgb('#55534f'), { skip: FACE.NY });
  // A tube light or two on the stilt ceiling.
  const lights = r.int(1, 2);
  for (let i = 0; i < lights; i++) {
    const a = r.range(2, w - 2);
    fbox(c.g('glow'), f, a - 0.6, a + 0.6, h - 0.08, h - 0.02, -1.6, -1.5, shade(PAL.litTube, s.lit > 0.1 ? 1.4 : 0.9), {
      uv: 'flat',
      skip: 0,
    });
  }
}

function roof(
  c: Chunk,
  r: Rng,
  f: Face,
  w: number,
  d: number,
  H: number,
  wall: RGB,
  trim: RGB,
  s: BuildingSpec,
  full: boolean,
) {
  const pl = c.g('plaster');
  const con = c.g('concrete');
  // Roof slab.
  fbox(con, f, 0.15, w - 0.15, H - 0.05, H + 0.05, -d + 0.15, -0.15, PAL.roof, { skip: ~FACE.PY & 63 });
  // Parapet (outer skin continues the wall, so only inner faces and top are new).
  const t = 0.15;
  const ph = H + PARAPET;
  fbox(pl, f, 0, w, H, ph, -t, 0, wall, { skip: FACE.NY, stain: 0.0 });
  fbox(pl, f, 0, w, H, ph, -d, -d + t, wall, { skip: FACE.NY });
  fbox(pl, f, 0, t, H, ph, -d + t, -t, wall, { skip: FACE.NY });
  fbox(pl, f, w - t, w, H, ph, -d + t, -t, wall, { skip: FACE.NY });
  // Coping, slightly proud of the wall.
  fbox(con, f, -0.05, w + 0.05, ph, ph + 0.07, -0.2, 0.05, trim, { skip: 0 });
  fbox(con, f, -0.05, w + 0.05, ph, ph + 0.07, -d - 0.05, -d + 0.2, trim, { skip: 0 });
  fbox(con, f, -0.05, 0.2, ph, ph + 0.07, -d + 0.2, -0.2, trim, { skip: 0 });
  fbox(con, f, w - 0.2, w + 0.05, ph, ph + 0.07, -d + 0.2, -0.2, trim, { skip: 0 });

  // Staircase headroom (mumty) with a door, set back from the front.
  const hwid = Math.min(3.2, w * 0.35);
  const ha = r() < 0.5 ? 0.15 : w - 0.15 - hwid;
  const hd0 = -d + 0.15;
  const hd1 = hd0 + r.range(3.2, 4.2);
  fbox(pl, f, ha, ha + hwid, H, H + 2.7, hd0, hd1, shade(wall, 0.95), { skip: FACE.NY, stain: 0.12 });
  fbox(con, f, ha - 0.1, ha + hwid + 0.1, H + 2.7, H + 2.8, hd0 - 0.1, hd1 + 0.3, trim, { skip: 0 });
  if (full) fquad(c.g('paint'), f, ha + hwid / 2, H + 1.05, hd1 + 0.01, 0.45, 1.05, rgb('#3e3a35'), 'flat');

  // Water tanks on stands (on top of the headroom for houses, on the roof for the rest).
  const tanks = s.kind === 'house' ? r.int(1, 2) : r.int(2, 4);
  for (let i = 0; i < tanks; i++) {
    const onHead = s.kind === 'house' && i === 0;
    const a = onHead ? ha + hwid / 2 : r.range(1.2, w - 1.2);
    const o = onHead ? (hd0 + hd1) / 2 : -r.range(d * 0.45, d - 1.2);
    const [x, z] = fp(f, a, o);
    tank(c, x, onHead ? H + 2.8 : H, z, r, onHead ? 0.25 : r.range(0.4, 1.4), full ? 14 : 7);
  }
  // Lift machine room on apartments / towers.
  if (full && (s.kind === 'apartment' || s.kind === 'tower')) {
    const a = r.range(w * 0.3, w * 0.6);
    fbox(pl, f, a, a + 3, H, H + 3.4, -d * 0.6, -d * 0.6 + 3, shade(wall, 0.93), { skip: FACE.NY });
  }
  // Occasional tin sheet shelter on a house roof.
  if (full && s.kind === 'house' && r() < 0.2) {
    const a0 = r.range(0.5, w * 0.4);
    fbox(c.g('paint'), f, a0, a0 + 3.5, H + 2.2, H + 2.26, -d * 0.6, -d * 0.6 + 3, rgb('#7c8086'), { skip: 0 });
    for (const a of [a0 + 0.1, a0 + 3.3])
      fbox(c.g('paint'), f, a, a + 0.08, H, H + 2.2, -d * 0.6 + 0.1, -d * 0.6 + 0.18, PAL.metalDark, { uv: 'flat' });
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Compound walls and gates                                                                   */

export interface WallOpts {
  height: number;
  grille: number;
  color: RGB;
  /** Gate openings as [a0, a1] along the face. */
  gates?: [number, number][];
  gateColor?: RGB;
}

/** Compound wall along a face from a=0 to a=len (thickness 0.2 behind the face plane). */
export function compoundWall(c: Chunk, f: Face, len: number, o: WallOpts, r: Rng) {
  const pl = c.g('plaster');
  const con = c.g('concrete');
  const gates = [...(o.gates ?? [])].sort((p, q) => p[0] - q[0]);
  const runs: [number, number][] = [];
  let cur = 0;
  for (const [g0, g1] of gates) {
    if (g0 > cur) runs.push([cur, g0]);
    cur = Math.max(cur, g1);
  }
  if (cur < len) runs.push([cur, len]);
  const solidTop = o.height - o.grille;
  for (const [a0, a1] of runs) {
    if (a1 - a0 < 0.05) continue;
    fbox(pl, f, a0, a1, 0, solidTop, -0.2, 0, o.color, { grime: 0.35, stain: 0.08 });
    fbox(con, f, a0 - 0.02, a1 + 0.02, solidTop, solidTop + 0.06, -0.24, 0.04, shade(PAL.concrete, 0.95), {
      skip: FACE.NY,
    });
    if (o.grille > 0) {
      const mid = (a0 + a1) / 2;
      fquad(c.g('grille'), f, mid, solidTop + 0.06 + o.grille / 2, -0.1, (a1 - a0) / 2, o.grille / 2, PAL.railing);
      // Pillars every ~3 m carry the grille.
      for (let a = a0; a <= a1 + 0.01; a += Math.max(2.5, (a1 - a0) / Math.max(1, Math.round((a1 - a0) / 3)))) {
        fbox(pl, f, a - 0.15, a + 0.15, 0, o.height + 0.1, -0.25, 0.05, shade(o.color, 0.96), { grime: 0.35 });
      }
    }
  }
  for (const [g0, g1] of gates) gate(c, f, g0, g1, o.height, o.gateColor ?? PAL.railing, o.color, r);
}

/** MS swing gate between two pillars. */
export function gate(c: Chunk, f: Face, a0: number, a1: number, h: number, color: RGB, pillar: RGB, r: Rng) {
  const paint = c.g('paint');
  fbox(c.g('plaster'), f, a0 - 0.35, a0, 0, h + 0.25, -0.3, 0.1, pillar, { grime: 0.3 });
  fbox(c.g('plaster'), f, a1, a1 + 0.35, 0, h + 0.25, -0.3, 0.1, pillar, { grime: 0.3 });
  const gh = h - 0.1;
  const mid = (a0 + a1) / 2;
  // Frame rails, a lower solid sheet and grille bars above.
  fbox(paint, f, a0 + 0.05, a1 - 0.05, gh - 0.06, gh, -0.12, -0.06, color, { uv: 'flat', skip: 0 });
  fbox(paint, f, a0 + 0.05, a1 - 0.05, 0.08, 0.7, -0.11, -0.07, shade(color, 0.9), { uv: 'flat', skip: 0 });
  fbox(paint, f, mid - 0.03, mid + 0.03, 0.08, gh, -0.12, -0.06, color, { uv: 'flat', skip: 0 });
  fquad(c.g('grille'), f, mid, (0.7 + gh) / 2, -0.09, (a1 - a0) / 2 - 0.05, (gh - 0.7) / 2, color);
  if (r() < 0.3) {
    // Little gate lamp on a pillar.
    const [x, z] = fp(f, a1 + 0.17, -0.1);
    c.g('paint').box(x - 0.09, h + 0.47, z - 0.09, x + 0.09, h + 0.52, z + 0.09, PAL.metalDark, { uv: 'flat' });
    c.g('glow').box(x - 0.06, h + 0.3, z - 0.06, x + 0.06, h + 0.47, z + 0.06, shade(PAL.litSoft, 0.8), {
      uv: 'flat',
    });
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Vegetation (smooth trunks + alpha cards; no faceted blobs)                                 */

const LEAF_UV: [number, number, number, number] = [0.005, 0.01, 0.495, 0.99];
const FROND_UV: [number, number, number, number] = [0.505, 0.0, 0.995, 1.0];

export function palm(c: Chunk, x: number, z: number, r: Rng, lean?: [number, number]) {
  const h = r.range(8, 11.5);
  const la = lean ?? [r.range(-0.6, 0.6), r.range(-0.6, 0.6)];
  const trunk = rgb('#5d554b');
  const paint = c.g('paint');
  const pts: [number, number, number][] = [];
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push([x + la[0] * k * k, h * k, z + la[1] * k * k]);
  }
  for (let i = 0; i < n; i++) {
    const r0 = 0.19 - 0.06 * (i / n);
    const r1 = 0.19 - 0.06 * ((i + 1) / n);
    paint.tube(pts[i], pts[i + 1], r0, r1, 10, shade(trunk, 0.9 + (i % 2) * 0.1), { grime: i === 0 ? 0.3 : 0 });
  }
  const top = pts[n];
  const fol = c.g('foliage');
  const fronds = r.int(13, 17);
  const col = rgb('#4a5a36');
  for (let i = 0; i < fronds; i++) {
    const az = (i / fronds) * Math.PI * 2 + r.range(-0.2, 0.2);
    const len = r.range(3.2, 4.2);
    const rise = r.range(-0.1, 0.6);
    const dx = Math.cos(az);
    const dz = Math.sin(az);
    const wid = 0.75;
    const segs = 4;
    const left: [number, number, number][] = [];
    const right: [number, number, number][] = [];
    for (let k = 0; k <= segs; k++) {
      const t = k / segs;
      const rad = len * t;
      const y = top[1] + rise * t * 2 - 2.6 * t * t * (0.6 + 0.4 * (1 - rise));
      const cx = top[0] + dx * rad;
      const cz = top[2] + dz * rad;
      const ww = wid * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.1));
      left.push([cx - dz * ww, y + 0.05 * t, cz + dx * ww]);
      right.push([cx + dz * ww, y + 0.05 * t, cz - dx * ww]);
    }
    const shadeK = r.range(0.75, 1.05);
    fol.ribbon(left, right, shade(col, shadeK), (p) => {
      // Map along-frond distance to v and lateral side to u.
      const dxp = p[0] - top[0];
      const dzp = p[2] - top[2];
      const along = (dxp * dx + dzp * dz) / len;
      const lat = -dxp * dz + dzp * dx;
      return [
        FROND_UV[0] + (FROND_UV[2] - FROND_UV[0]) * (0.5 + lat / (2 * wid)),
        FROND_UV[1] + (FROND_UV[3] - FROND_UV[1]) * Math.min(1, along),
      ];
    });
  }
  // Nut cluster.
  paint.cylinder(top[0], top[2], top[1] - 0.7, top[1] + 0.05, 0.32, 0.18, 10, rgb('#3e3b2c'), { cap: true });
}

/** Neem / rain tree: branching trunk, crown of crossed leaf cards at several heights. */
export function neem(c: Chunk, x: number, z: number, r: Rng, scale = 1) {
  const h = r.range(5.5, 8) * scale;
  const paint = c.g('paint');
  const bark = rgb('#4a443c');
  const fork = h * 0.4;
  paint.tube([x, 0, z], [x, fork, z], 0.22 * scale, 0.17 * scale, 10, bark, { grime: 0.3 });
  const crownR = r.range(2.6, 3.6) * scale;
  for (let i = 0; i < 3; i++) {
    const az = r.range(0, Math.PI * 2);
    paint.tube(
      [x, fork, z],
      [x + Math.cos(az) * crownR * 0.5, h * 0.75, z + Math.sin(az) * crownR * 0.5],
      0.13 * scale,
      0.06 * scale,
      8,
      bark,
    );
  }
  const fol = c.g('foliage');
  const col = rgb('#3a4a2f');
  const cy = h * 0.72;
  const cards = 9;
  for (let i = 0; i < cards; i++) {
    const az = (i / cards) * Math.PI + r.range(-0.2, 0.2);
    const ox = r.range(-0.5, 0.5) * crownR;
    const oz = r.range(-0.5, 0.5) * crownR;
    const oy = r.range(-0.3, 0.35) * crownR;
    const hw = crownR * r.range(0.65, 0.9);
    const hh = crownR * r.range(0.45, 0.6);
    const n: [number, number, number] = [Math.cos(az), 0, Math.sin(az)];
    fol.quad([x + ox, cy + oy, z + oz], n, [0, 1, 0], hw, hh, shade(col, r.range(0.7, 1.05)), LEAF_UV);
  }
  // Two near-horizontal cards close the crown from above and below.
  for (const y of [cy + crownR * 0.25, cy - crownR * 0.2]) {
    fol.quad([x, y, z], [0, 1, 0], [0, 0, -1], crownR * 0.85, crownR * 0.85, shade(col, 0.8), LEAF_UV);
  }
}

/** Low shrub (< 1.2 m) as a few crossed cards. */
export function shrub(c: Chunk, x: number, z: number, r: Rng, h = 1) {
  const fol = c.g('foliage');
  const col = rgb('#36432c');
  for (let i = 0; i < 3; i++) {
    const az = (i / 3) * Math.PI + r.range(0, 0.5);
    const hw = r.range(0.6, 1.0) * h;
    fol.quad([x, h * 0.5, z], [Math.cos(az), 0, Math.sin(az)], [0, 1, 0], hw, h * 0.5, shade(col, r.range(0.7, 1)), LEAF_UV);
  }
}
