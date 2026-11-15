/**
 * Scene 04 static city v2 (approval-stage proposal). A bespoke isometric IWMS district rendered
 * offline: eight hero operations built as dedicated landmark models, a quiet muted city around
 * them. No hero-kit buildings and no textures: clean vertex-coloured matte surfaces + glass, so
 * the image reads as a crisp architectural illustration and compresses well.
 *
 * World: metres, +Y up, west → east = −x → +x, north = −z. Blocks sit on a 40 m grid (32 m blocks,
 * 8 m roads). The camera looks from the south-west, so south (+z) and west (−x) faces are visible.
 */
import { GeoBuilder, mix, rgb, rng, shade, type RGB, type Rng } from '@/components/hero/scene/city/builder';

export type ZoneId =
  | 'collection'
  | 'logistics'
  | 'resources'
  | 'weighbridge'
  | 'processing'
  | 'landfill'
  | 'grievance'
  | 'iccc';

export interface ZoneInfo {
  /** Ground plot x0, z0, x1, z1. */
  rect: [number, number, number, number];
  /** Pin point (top-centre of the key building). */
  anchor: [number, number, number];
  /** Key building volume x0, z0, x1, z1, height (screen box = footprint ∪ body). */
  body: [number, number, number, number, number];
}

export type Mat = 'matte' | 'ground' | 'glass' | 'gloss' | 'foliage' | 'water' | 'screen' | 'liner' | 'skylight';
export interface World {
  g: Record<Mat, GeoBuilder>;
  zones: Record<ZoneId, ZoneInfo>;
}

type V3 = [number, number, number];
type Rect = [number, number, number, number];

/* ------------------------------------------------------------------------------------------ */
/* Palette (sRGB → linear)                                                                    */

const P = {
  road: rgb('#a4a8ad'),
  roadLine: rgb('#f3f2ec'),
  sidewalk: rgb('#dcdad3'),
  kerb: rgb('#eceae4'),
  lot: rgb('#e5e4df'),
  lawn: rgb('#b5c795'),
  lawnDeep: rgb('#a3b984'),
  tree: [rgb('#86a96e'), rgb('#78a065'), rgb('#94b47a'), rgb('#7f9f6a')],
  trunk: rgb('#8a7560'),
  roof: rgb('#d3cfc6'),
  coping: rgb('#f1efea'),
  glass: rgb('#9fb2c2'),
  glassDark: rgb('#4f6374'),
  filler: ['#e9e8e4', '#e3e2de', '#edece8', '#dfdedb', '#e6e3dc', '#dcdddf'].map((h) => rgb(h)),
  mint: rgb('#a6dcc8'),
  amber: rgb('#ffa526'),
  white: rgb('#f6f4ef'),
  truck: rgb('#3f9a5c'),
  truckCab: rgb('#f3f1ec'),
  wet: rgb('#3fa257'),
  dry: rgb('#3a7cc8'),
  steel: rgb('#8d969e'),
  steelDark: rgb('#5d656c'),
  concrete: rgb('#cbc8c0'),
  yard: rgb('#c5c3bc'),
  earth: rgb('#b49e7c'),
  compost: rgb('#7d6248'),
  waste: rgb('#9b9182'),
  liner: rgb('#26292d'),
  water: rgb('#5f9a9e'),
  yellow: rgb('#f0c23a'),
  red: rgb('#cf4a3c'),
};
const CAR = ['#f1f1ee', '#c9cdd1', '#8f969d', '#4c5866', '#a24a3e', '#2f3540', '#d9d2c2', '#6f8aa3'].map((h) => rgb(h));
const CLOTH = ['#3a78c4', '#d9534a', '#f0c23a', '#3fa257', '#f3f1ec', '#6d5d8f', '#e58a3a', '#2f3540'].map((h) => rgb(h));

/* ------------------------------------------------------------------------------------------ */
/* Geometry helpers                                                                           */

let W!: World;
const B = (m: Mat) => W.g[m];

function box(m: Mat, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col: RGB, skip = 8) {
  B(m).box(Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y1, Math.max(z0, z1), col, { uv: 'flat', skip });
}
function flat(m: Mat, x0: number, z0: number, x1: number, z1: number, y: number, col: RGB) {
  B(m).quad([(x0 + x1) / 2, y, (z0 + z1) / 2], [0, 1, 0], [0, 0, -1], Math.abs(x1 - x0) / 2, Math.abs(z1 - z0) / 2, col, 'flat');
}
function cyl(m: Mat, x: number, z: number, y0: number, y1: number, r0: number, r1: number, col: RGB, seg = 16, cap = true) {
  B(m).cylinder(x, z, y0, y1, r0, r1, seg, col, { cap });
}
/** Smooth ellipsoid (tree crowns, heads). */
function sphere(m: Mat, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, col: RGB, seg = 14, rings = 9) {
  const g = B(m);
  const base = g.vertexCount;
  for (let i = 0; i <= rings; i++) {
    const th = (Math.PI * i) / rings;
    const st = Math.sin(th);
    const ct = Math.cos(th);
    for (let j = 0; j <= seg; j++) {
      const ph = (2 * Math.PI * j) / seg;
      const nx = st * Math.cos(ph);
      const nz = st * Math.sin(ph);
      g.pos.push3(cx + nx * rx, cy + ct * ry, cz + nz * rz);
      const ex = nx / rx;
      const ey = ct / ry;
      const ez = nz / rz;
      const l = Math.hypot(ex, ey, ez);
      g.nor.push3(ex / l, ey / l, ez / l);
      g.uv.push2(0.5, 0.5);
      const k = 0.86 + 0.14 * (ct * 0.5 + 0.5);
      g.col.push3(col[0] * k, col[1] * k, col[2] * k);
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < seg; j++) {
      const a = base + i * (seg + 1) + j;
      const b = a + seg + 1;
      g.idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
}

interface Frame {
  at(lx: number, lz: number): [number, number];
  yaw: number;
}
function frame(x: number, z: number, yaw: number): Frame {
  const ca = Math.cos(yaw);
  const sa = Math.sin(yaw);
  return { yaw, at: (lx, lz) => [x + lx * ca + lz * sa, z - lx * sa + lz * ca] };
}
/** Vehicles are drawn slightly over life size so they read in the illustration. */
const VS = 1.2;
function lbox(m: Mat, o: Frame, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, col: RGB) {
  x0 *= VS;
  x1 *= VS;
  y0 *= VS;
  y1 *= VS;
  z0 *= VS;
  z1 *= VS;
  const [wx, wz] = o.at((x0 + x1) / 2, (z0 + z1) / 2);
  B(m).obox(wx, (y0 + y1) / 2, wz, (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2, o.yaw, col, { uv: 'flat' });
}
function wheel(o: Frame, lx: number, lz: number, w: number, r: number) {
  lx *= VS;
  lz *= VS;
  w *= VS;
  r *= VS;
  const [ax, az] = o.at(lx, lz - w / 2);
  const [bx, bz] = o.at(lx, lz + w / 2);
  B('gloss').tube([ax, r, az], [bx, r, bz], r, r, 12, rgb('#2a2c2f'), { cap: true });
  B('gloss').tube([bx, r, bz], [ax, r, az], r * 0.5, r * 0.5, 10, rgb('#b9bec3'), { cap: true });
}

/* ------------------------------------------------------------------------------------------ */
/* People, vehicles, props                                                                    */

function person(x: number, z: number, r: Rng, col?: RGB) {
  const c = col ?? r.pick(CLOTH);
  cyl('matte', x, z, 0.15, 1.2, 0.22, 0.22, rgb('#3b3f46'), 8);
  cyl('matte', x, z, 1.2, 2.15, 0.32, 0.26, c, 10);
  sphere('matte', x, 2.5, z, 0.23, 0.25, 0.23, rgb('#8a6248'), 10, 6);
}

/** Branded compactor: off-white cab, green body, white band with a mint stripe, amber beacon. */
function truck(x: number, z: number, yaw: number, body: RGB = P.truck) {
  const o = frame(x, z, yaw);
  lbox('gloss', o, -4.2, 3.9, 0.55, 1.0, -1.0, 1.0, rgb('#2f3236'));
  lbox('gloss', o, 2.0, 4.1, 0.95, 3.0, -1.2, 1.2, P.truckCab);
  lbox('glass', o, 3.96, 4.14, 1.95, 2.8, -1.08, 1.08, P.glassDark);
  lbox('glass', o, 2.5, 3.7, 1.95, 2.75, -1.22, 1.22, P.glassDark);
  lbox('gloss', o, 2.6, 3.2, 3.0, 3.22, -0.25, 0.25, P.amber);
  lbox('gloss', o, -4.0, 1.85, 1.0, 3.3, -1.22, 1.22, body);
  lbox('gloss', o, -3.8, 1.65, 3.3, 3.55, -1.05, 1.05, shade(body, 0.9));
  lbox('gloss', o, -4.0, 1.85, 1.95, 2.35, -1.235, 1.235, P.white);
  lbox('gloss', o, -4.0, 1.85, 2.08, 2.2, -1.24, 1.24, P.mint);
  lbox('gloss', o, -4.75, -4.0, 0.75, 3.05, -1.18, 1.18, shade(body, 0.75));
  for (const lx of [3.0, -1.7, -2.9]) for (const s of [-1, 1]) wheel(o, lx, s * 1.02, 0.36, 0.5);
}

function tipper(x: number, z: number, yaw: number, body: RGB, load: RGB | null = null) {
  const o = frame(x, z, yaw);
  lbox('gloss', o, -3.6, 3.7, 0.55, 1.0, -1.0, 1.0, rgb('#2f3236'));
  lbox('gloss', o, 1.9, 3.9, 0.95, 2.9, -1.18, 1.18, P.truckCab);
  lbox('glass', o, 3.76, 3.94, 1.9, 2.7, -1.06, 1.06, P.glassDark);
  lbox('gloss', o, -3.7, 1.7, 1.0, 1.15, -1.22, 1.22, shade(body, 0.8));
  lbox('gloss', o, -3.7, 1.7, 1.15, 2.6, -1.22, -1.06, body);
  lbox('gloss', o, -3.7, 1.7, 1.15, 2.6, 1.06, 1.22, body);
  lbox('gloss', o, -3.7, -3.54, 1.15, 2.5, -1.06, 1.06, body);
  lbox('gloss', o, 1.54, 1.7, 1.15, 2.8, -1.06, 1.06, body);
  if (load) lbox('matte', o, -3.55, 1.55, 1.15, 2.3, -1.05, 1.05, load);
  for (const lx of [2.8, -1.5, -2.7]) for (const s of [-1, 1]) wheel(o, lx, s * 1.0, 0.34, 0.48);
}

function car(x: number, z: number, yaw: number, col: RGB) {
  const o = frame(x, z, yaw);
  lbox('gloss', o, -2.1, 2.1, 0.3, 0.92, -0.86, 0.86, col);
  lbox('glass', o, -1.15, 0.85, 0.92, 1.4, -0.78, 0.78, P.glassDark);
  lbox('gloss', o, -1.05, 0.75, 1.4, 1.47, -0.74, 0.74, col);
  for (const lx of [1.35, -1.35]) for (const s of [-1, 1]) wheel(o, lx, s * 0.8, 0.2, 0.31);
}

function van(x: number, z: number, yaw: number, col: RGB = P.white, stripe: RGB = P.mint) {
  const o = frame(x, z, yaw);
  lbox('gloss', o, -2.5, 2.4, 0.35, 2.15, -0.98, 0.98, col);
  lbox('gloss', o, 2.4, 2.75, 0.35, 1.25, -0.95, 0.95, col);
  lbox('glass', o, 1.7, 2.45, 1.3, 1.95, -0.93, 0.93, P.glassDark);
  lbox('glass', o, -1.9, 1.5, 1.35, 1.85, -0.99, 0.99, P.glassDark);
  lbox('gloss', o, -2.5, 2.4, 0.9, 1.1, -0.995, 0.995, stripe);
  for (const lx of [1.7, -1.7]) for (const s of [-1, 1]) wheel(o, lx, s * 0.88, 0.22, 0.36);
}

function bike(x: number, z: number, yaw: number, col: RGB) {
  const o = frame(x, z, yaw);
  lbox('gloss', o, -0.9, 0.9, 0.35, 0.8, -0.18, 0.18, col);
  lbox('gloss', o, -0.5, 0.3, 0.8, 0.95, -0.2, 0.2, rgb('#2f3236'));
  for (const lx of [0.7, -0.7]) wheel(o, lx, 0, 0.12, 0.33);
}

function loader(x: number, z: number, yaw: number) {
  const o = frame(x, z, yaw);
  lbox('gloss', o, -2.2, 1.2, 0.6, 1.6, -1.0, 1.0, P.yellow);
  lbox('glass', o, -1.6, -0.1, 1.6, 3.0, -0.85, 0.85, P.glassDark);
  lbox('gloss', o, -1.7, 0.0, 3.0, 3.12, -0.95, 0.95, P.yellow);
  lbox('gloss', o, 1.2, 2.6, 0.9, 1.15, -0.25, 0.25, shade(P.yellow, 0.8));
  lbox('gloss', o, 2.5, 3.3, 0.15, 1.1, -1.25, 1.25, rgb('#55595e'));
  for (const lx of [0.8, -1.6]) for (const s of [-1, 1]) wheel(o, lx, s * 1.0, 0.45, 0.6);
}

/** Wheelie bin (~1.4× life size so pairs read at 1200 px): body, overhanging lid with handle, wheels. */
function bin(x: number, z: number, col: RGB, big = false) {
  const s = big ? 1.35 : 1;
  const hw = 0.62 * s;
  const hd = 0.56 * s;
  const h = 1.75 * s;
  B('gloss').box(x - hw, 0.32, z - hd, x + hw, h, z + hd, col, { uv: 'flat' });
  B('gloss').box(x - hw - 0.08, h, z - hd - 0.1, x + hw + 0.08, h + 0.16, z + hd + 0.06, shade(col, 0.78), { uv: 'flat' });
  B('gloss').box(x - hw * 0.6, h - 0.25, z - hd - 0.12, x + hw * 0.6, h - 0.1, z - hd, rgb('#2f3236'), { uv: 'flat' });
  for (const sx of [-1, 1]) B('gloss').tube([x + sx * hw * 0.75, 0.22, z - hd - 0.02], [x + sx * hw * 0.75, 0.22, z - hd + 0.22], 0.2, 0.2, 10, rgb('#2a2c2f'), { cap: true });
  B('gloss').box(x - hw, 0.15, z + hd - 0.25, x - hw + 0.2, 0.35, z + hd, rgb('#2a2c2f'), { uv: 'flat' });
  B('gloss').box(x + hw - 0.2, 0.15, z + hd - 0.25, x + hw, 0.35, z + hd, rgb('#2a2c2f'), { uv: 'flat' });
}

function container(x: number, z: number, yaw: number, col: RGB, len = 6) {
  const o = frame(x, z, yaw);
  lbox('gloss', o, -len / 2, len / 2, 0.15, 2.4, -1.2, 1.2, col);
  for (let i = 0; i <= len / 1.2; i++) {
    const lx = -len / 2 + 0.1 + i * 1.2;
    lbox('gloss', o, lx - 0.07, lx + 0.07, 0.2, 2.35, -1.24, 1.24, shade(col, 0.85));
  }
}

function tree(x: number, z: number, r: Rng, s = 1) {
  const h = r.range(2.2, 3.0) * s;
  cyl('matte', x, z, 0.15, h + 0.6, 0.18 * s, 0.13 * s, P.trunk, 8, false);
  const col = r.pick(P.tree);
  const cr = r.range(2.0, 2.6) * s;
  sphere('foliage', x, h + cr * 0.85, z, cr, cr * 0.9, cr, col);
  if (r() < 0.6)
    sphere('foliage', x + r.range(-0.8, 0.8) * s, h + cr * 1.5, z + r.range(-0.8, 0.8) * s, cr * 0.7, cr * 0.65, cr * 0.7, shade(col, 1.06));
}

function bench(x: number, z: number, alongX: boolean) {
  const [hx, hz] = alongX ? [0.9, 0.25] : [0.25, 0.9];
  box('matte', x - hx, 0.15, z - hz, x + hx, 0.5, z + hz, rgb('#9c826a'));
}

/* ------------------------------------------------------------------------------------------ */
/* Buildings                                                                                  */

interface BldOpts {
  floors: number;
  wall: RGB;
  ground?: number;
  fh?: number;
  /** 'punched' residential windows, 'ribbon' office bands, 'none'. */
  windows?: 'punched' | 'ribbon' | 'none';
  roof?: RGB;
  parapet?: number;
  rooftop?: boolean;
  r: Rng;
  glass?: RGB;
  /** Faces that get windows. Only S (+z) and W (−x) are visible from the camera. */
  faces?: ('S' | 'W' | 'N' | 'E')[];
  /** Base height (for setback upper volumes). */
  base?: number;
  /** Gable roof in this colour instead of a parapet + flat roof. */
  pitched?: RGB;
  /** Ground-floor shopfront (dark glazing band + awning) on the visible faces. */
  shop?: RGB;
}
/** Block with parapet (or gable roof), coping, windows on the visible faces and a little roof kit. */
function bld(x0: number, z0: number, x1: number, z1: number, o: BldOpts) {
  const fh = o.fh ?? 3.2;
  const g0 = o.ground ?? 3.6;
  const by = o.base ?? 0.15;
  const H = by + g0 + (o.floors - 1) * fh;
  box('matte', x0, by, z0, x1, H, z1, o.wall, by > 0.2 ? 8 : 8);
  const cop = mix(o.wall, P.coping, 0.6);
  if (o.pitched) {
    gable(x0, z0, x1, z1, H, Math.min(x1 - x0, z1 - z0) * 0.32, o.pitched);
  } else {
    flat('matte', x0 + 0.25, z0 + 0.25, x1 - 0.25, z1 - 0.25, H + 0.02, o.roof ?? roofTone(o.r));
    const p = o.parapet ?? 0.8;
    const t = 0.25;
    box('matte', x0, H, z0, x1, H + p, z0 + t, o.wall);
    box('matte', x0, H, z1 - t, x1, H + p, z1, o.wall);
    box('matte', x0, H, z0 + t, x0 + t, H + p, z1 - t, o.wall);
    box('matte', x1 - t, H, z0 + t, x1, H + p, z1 - t, o.wall);
    box('matte', x0 - 0.05, H + p, z0 - 0.05, x1 + 0.05, H + p + 0.08, z0 + t + 0.05, cop);
    box('matte', x0 - 0.05, H + p, z1 - t - 0.05, x1 + 0.05, H + p + 0.08, z1 + 0.05, cop);
    box('matte', x0 - 0.05, H + p, z0, x0 + t + 0.05, H + p + 0.08, z1, cop);
    box('matte', x1 - t - 0.05, H + p, z0, x1 + 0.05, H + p + 0.08, z1, cop);
  }
  const win = o.windows ?? 'punched';
  const gc = o.glass ?? P.glass;
  const faces = o.faces ?? ['S', 'W'];
  const put = (s: string, a0: number, a1: number, y0: number, y1: number, col: RGB) => {
    const e = 0.06;
    if (s === 'S') box('glass', a0, y0, z1 - 0.02, a1, y1, z1 + e, col, 8 | 4);
    if (s === 'N') box('glass', a0, y0, z0 - e, a1, y1, z0 + 0.02, col, 8 | 4);
    if (s === 'W') box('glass', x0 - e, y0, a0, x0 + 0.02, y1, a1, col, 8 | 4);
    if (s === 'E') box('glass', x1 - 0.02, y0, a0, x1 + e, y1, a1, col, 8 | 4);
  };
  for (let f = 0; f < o.floors; f++) {
    if (win === 'none') break;
    if (f === 0 && o.shop) continue;
    const y0 = by + (f === 0 ? 0.75 : g0 + (f - 1) * fh + 0.85);
    const y1 = y0 + (win === 'ribbon' ? 1.7 : 1.45);
    for (const s of faces) {
      const along = s === 'S' || s === 'N' ? x1 - x0 : z1 - z0;
      const start = s === 'S' || s === 'N' ? x0 : z0;
      if (win === 'ribbon') put(s, start + 0.9, start + along - 0.9, y0, y1, gc);
      else {
        const n = Math.max(1, Math.floor((along - 1.2) / 2.8));
        const step = (along - 1.2) / n;
        for (let i = 0; i < n; i++) {
          const c = start + 0.6 + step * (i + 0.5);
          put(s, c - 0.7, c + 0.7, y0, y1, gc);
        }
      }
    }
  }
  if (o.shop) {
    const aw = o.shop;
    for (const s of faces) {
      if (s === 'S') {
        put(s, x0 + 0.6, x1 - 0.6, by + 0.3, by + 2.9, P.glassDark);
        box('matte', x0 + 0.3, by + 3.0, z1, x1 - 0.3, by + 3.2, z1 + 1.4, aw);
      }
      if (s === 'W') {
        put(s, z0 + 0.6, z1 - 0.6, by + 0.3, by + 2.9, P.glassDark);
        box('matte', x0 - 1.4, by + 3.0, z0 + 0.3, x0, by + 3.2, z1 - 0.3, aw);
      }
    }
  }
  if (o.rooftop !== false && !o.pitched) {
    const r = o.r;
    const w = x1 - x0;
    const d = z1 - z0;
    const sx = x0 + r.range(0.2, 0.5) * w;
    const sz = z0 + r.range(0.2, 0.4) * d;
    box('matte', sx, H, sz, sx + Math.min(4, w * 0.3), H + 2.6, sz + Math.min(3.5, d * 0.3), mix(o.wall, P.roof, 0.3));
    if (r() < 0.7) cyl('matte', x0 + w * 0.75, z0 + d * 0.7, H + 0.1, H + 1.5, 0.6, 0.6, rgb('#c9ccd0'), 14);
    if (r() < 0.5) for (let i = 0; i < 2; i++) box('matte', x0 + w * (0.55 + i * 0.15), H, z0 + d * 0.25, x0 + w * (0.55 + i * 0.15) + 1.1, H + 0.8, z0 + d * 0.25 + 0.8, rgb('#bfc3c6'));
  }
  return H;
}

/** Subtle roof variation: light concrete, warm grey, pale membrane. */
function roofTone(r: Rng): RGB {
  return r.pick([rgb('#d3cfc6'), rgb('#cdcbc5'), rgb('#d9d6cf'), rgb('#c9c6be')]);
}

/** Gable roof along the longer axis with eaves, ridge and a fascia. */
function gable(x0: number, z0: number, x1: number, z1: number, H: number, rise: number, col: RGB) {
  const ov = 0.45;
  const alongX = x1 - x0 >= z1 - z0;
  const m = B('matte');
  if (alongX) {
    const zm = (z0 + z1) / 2;
    m.ribbon([[x0 - ov, H, z0 - ov], [x1 + ov, H, z0 - ov]], [[x0 - ov, H + rise, zm], [x1 + ov, H + rise, zm]], shade(col, 0.9), undefined, [0, 1, -1]);
    m.ribbon([[x0 - ov, H + rise, zm], [x1 + ov, H + rise, zm]], [[x0 - ov, H, z1 + ov], [x1 + ov, H, z1 + ov]], col, undefined, [0, 1, 1]);
    m.tri([x0, H, z1], [x0, H, z0], [x0, H + rise, zm], [-1, 0, 0], shade(col, 1.25));
    m.tri([x1, H, z0], [x1, H, z1], [x1, H + rise, zm], [1, 0, 0], shade(col, 1.25));
  } else {
    const xm = (x0 + x1) / 2;
    m.ribbon([[x0 - ov, H, z1 + ov], [x0 - ov, H, z0 - ov]], [[xm, H + rise, z1 + ov], [xm, H + rise, z0 - ov]], col, undefined, [-1, 1, 0]);
    m.ribbon([[xm, H + rise, z1 + ov], [xm, H + rise, z0 - ov]], [[x1 + ov, H, z1 + ov], [x1 + ov, H, z0 - ov]], shade(col, 0.9), undefined, [1, 1, 0]);
    m.tri([x0, H, z1], [x1, H, z1], [xm, H + rise, z1], [0, 0, 1], shade(col, 1.25));
    m.tri([x1, H, z0], [x0, H, z0], [xm, H + rise, z0], [0, 0, -1], shade(col, 1.25));
  }
}

/** Portal-frame shed with a light gable roof and optional skylight strips; `openS` leaves the south side open. */
function shed(x0: number, z0: number, x1: number, z1: number, eave: number, rise: number, o: { wall: RGB; roof: RGB; skylights?: boolean; openS?: boolean; columnsOnly?: boolean }) {
  const ov = 0.5;
  const zm = (z0 + z1) / 2;
  const ridge = eave + rise;
  if (o.columnsOnly) {
    const n = Math.max(1, Math.round((x1 - x0) / 6));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      for (const z of [z0 + 0.2, z1 - 0.2]) box('gloss', x - 0.18, 0.15, z - 0.18, x + 0.18, eave, z + 0.18, P.steelDark);
    }
  } else {
    box('matte', x0, 0.15, z0, x1, 1.0, z1, P.concrete, 8 | 4);
    box('matte', x0 + 0.02, 1.0, z0 + 0.02, x1 - 0.02, eave, z1 - 0.02, o.wall, 8 | 4 | (o.openS ? 16 : 0));
    if (o.openS) {
      box('matte', x0 + 0.3, 0.15, z1 - 1.0, x1 - 0.3, eave - 0.4, z1 - 0.9, rgb('#4f5357'), 8 | 4 | 1 | 2 | 32);
      const n = Math.max(1, Math.round((x1 - x0) / 6));
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        box('gloss', x - 0.22, 0.15, z1 - 0.45, x + 0.22, eave, z1, P.steelDark);
      }
      box('matte', x0, eave - 1.1, z1 - 0.3, x1, eave, z1, o.wall);
    }
    for (const [x, nx] of [
      [x0 + 0.02, -1],
      [x1 - 0.02, 1],
    ] as const) {
      const a: V3 = [x, eave, z0];
      const b: V3 = [x, eave, z1];
      const t: V3 = [x, ridge, zm];
      if (nx < 0) B('matte').tri(a, b, t, [-1, 0, 0], o.wall);
      else B('matte').tri(b, a, t, [1, 0, 0], o.wall);
    }
  }
  const slope = (rise + 0.15) / (zm - z0 + ov);
  B('matte').ribbon(
    [
      [x0 - ov, eave - 0.15, z0 - ov],
      [x1 + ov, eave - 0.15, z0 - ov],
    ],
    [
      [x0 - ov, ridge, zm],
      [x1 + ov, ridge, zm],
    ],
    shade(o.roof, 0.97),
    undefined,
    [0, 1, 0],
  );
  B('matte').ribbon(
    [
      [x0 - ov, ridge, zm],
      [x1 + ov, ridge, zm],
    ],
    [
      [x0 - ov, eave - 0.15, z1 + ov],
      [x1 + ov, eave - 0.15, z1 + ov],
    ],
    o.roof,
    undefined,
    [0, 1, 0],
  );
  box('matte', x0 - ov, ridge - 0.04, zm - 0.3, x1 + ov, ridge + 0.14, zm + 0.3, shade(o.roof, 0.9));
  if (o.skylights) {
    const yAt = (z: number) => ridge - Math.abs(z - zm) * slope + 0.05;
    const n = Math.max(2, Math.round((x1 - x0) / 6));
    for (let i = 0; i < n; i++) {
      const xa = x0 + ((i + 0.5) * (x1 - x0)) / n - 0.9;
      for (const [za, zb] of [
        [z0 + 1, zm - 0.6],
        [zm + 0.6, z1 - 1],
      ]) {
        B('skylight').ribbon(
          [
            [xa, yAt(za), za],
            [xa + 1.8, yAt(za), za],
          ],
          [
            [xa, yAt(zb), zb],
            [xa + 1.8, yAt(zb), zb],
          ],
          rgb('#cfe2ea'),
          undefined,
          [0, 1, 0],
        );
      }
    }
  }
  return ridge;
}

/** Terrace (frustum) from rect at y0 to rect inset by `run` at y1; returns the top rect. */
function frustum(m: Mat, b: Rect, y0: number, y1: number, run: number, side: RGB, top: RGB | null): Rect {
  const [x0, z0, x1, z1] = b;
  const t: Rect = [x0 + run, z0 + run, x1 - run, z1 - run];
  const Bt: V3[] = [
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y0, z0],
    [x0, y0, z0],
  ];
  const T: V3[] = [
    [t[0], y1, t[3]],
    [t[2], y1, t[3]],
    [t[2], y1, t[1]],
    [t[0], y1, t[1]],
  ];
  const facing: V3[] = [
    [0, 1, 1],
    [1, 1, 0],
    [0, 1, -1],
    [-1, 1, 0],
  ];
  for (let i = 0; i < 4; i++) B(m).ribbon([Bt[i], Bt[(i + 1) % 4]], [T[i], T[(i + 1) % 4]], side, undefined, facing[i]);
  if (top) flat(m, t[0], t[1], t[2], t[3], y1, top);
  return t;
}

/* ------------------------------------------------------------------------------------------ */
/* City grid                                                                                  */

const PITCH = 40;
const HALF = 16;
const N = 11;
/**
 * The eight operations sit on a tight staggered 4 × 2 cluster of blocks (screen columns west → east,
 * upper/lower rows), with parks on the blocks between them so each reads as its own place.
 */
const ZONE_BLOCKS: Record<string, ZoneId> = {
  '-1,-3': 'grievance',
  '-2,-1': 'collection',
  '0,-2': 'resources',
  '-1,0': 'logistics',
  '1,0': 'iccc',
  '1,1': 'weighbridge',
  '3,1': 'processing',
  '4,1': 'processing',
  '2,3': 'landfill',
  '3,3': 'landfill',
};
const MERGED: Record<ZoneId, Rect> = {
  grievance: [-56, -136, -24, -104],
  collection: [-96, -56, -64, -24],
  resources: [-16, -96, 16, -64],
  logistics: [-56, -16, -24, 16],
  iccc: [24, -16, 56, 16],
  weighbridge: [24, 24, 56, 56],
  processing: [104, 24, 176, 56],
  landfill: [64, 104, 136, 136],
};
const PARKS = new Set(['2,1', '1,2', '0,0', '-1,-1', '0,1', '-1,1', '-3,0', '2,-1', '-2,1', '3,-1', '0,2', '-2,-3', '4,0', '-4,-2', '1,-3', '-1,3', '3,3', '-1,-2', '0,-1']);

export function buildWorld(): World {
  const g = Object.fromEntries(
    (['matte', 'ground', 'glass', 'gloss', 'foliage', 'water', 'screen', 'liner', 'skylight'] as Mat[]).map((k) => [k, new GeoBuilder(1, 1, [0.5, 0.5])]),
  ) as Record<Mat, GeoBuilder>;
  W = { g, zones: {} as Record<ZoneId, ZoneInfo> };
  const r = rng(20261020);
  const ext = PITCH * N + 40;
  // Road surface everywhere; blocks are raised slabs.
  flat('ground', -ext, -ext, ext, ext, 0, P.road);

  // Blocks (zone blocks merged).
  const done = new Set<ZoneId>();
  for (let i = -N; i <= N; i++)
    for (let j = -N; j <= N; j++) {
      const key = `${i},${j}`;
      const zid = ZONE_BLOCKS[key];
      if (zid) {
        if (done.has(zid)) continue;
        done.add(zid);
        const rect = MERGED[zid];
        slab(rect);
        markings(rect, true);
        ZONES[zid](inset(rect, 2.4), r);
        continue;
      }
      const rect: Rect = [i * PITCH - HALF, j * PITCH - HALF, i * PITCH + HALF, j * PITCH + HALF];
      slab(rect);
      markings(rect, false);
      const d = Math.hypot(i * PITCH - 20, j * PITCH - 20);
      if (PARKS.has(key)) park(inset(rect, 2.4), r);
      else filler(inset(rect, 2.4), r, d);
      streetTrees(rect, r, d);
    }
  traffic(r);
  return W;
}

const inset = (b: Rect, k: number): Rect => [b[0] + k, b[1] + k, b[2] - k, b[3] - k];

function slab(b: Rect) {
  const [x0, z0, x1, z1] = b;
  box('ground', x0, 0, z0, x1, 0.15, z1, P.kerb, 8 | 4);
  flat('ground', x0, z0, x1, z1, 0.15, P.kerb);
  flat('ground', x0 + 0.3, z0 + 0.3, x1 - 0.3, z1 - 0.3, 0.155, P.sidewalk);
}

/** Centre dashes on the road east and south of each block; zebra crossings around zones. */
function markings(b: Rect, zone: boolean) {
  const [x0, z0, x1, z1] = b;
  const xr = x1 + 4;
  const zr = z1 + 4;
  for (let z = z0 + 2; z < z1 - 2; z += 6) flat('ground', xr - 0.1, z, xr + 0.1, z + 3, 0.02, P.roadLine);
  for (let x = x0 + 2; x < x1 - 2; x += 6) flat('ground', x, zr - 0.1, x + 3, zr + 0.1, 0.02, P.roadLine);
  if (zone) {
    for (const [cx, cz] of [
      [x0 - 4, z1 + 4],
      [x1 + 4, z1 + 4],
      [x0 - 4, z0 - 4],
      [x1 + 4, z0 - 4],
    ]) {
      for (let a = -3; a <= 3; a += 1) {
        flat('ground', cx + a - 0.25, cz + 4.5, cx + a + 0.25, cz + 6.8, 0.025, P.roadLine);
        flat('ground', cx + 4.5, cz + a - 0.25, cx + 6.8, cz + a + 0.25, 0.025, P.roadLine);
      }
    }
  }
}

function streetTrees(b: Rect, r: Rng, d: number) {
  const [x0, z0, x1, z1] = b;
  const p = d < 200 ? 0.8 : 0.55;
  for (let x = x0 + 4; x < x1 - 2; x += 8) {
    if (r() < p) tree(x, z1 - 1.2, r, 0.75);
    if (r() < p * 0.7) tree(x + 4, z0 + 1.2, r, 0.75);
  }
  for (let z = z0 + 6; z < z1 - 4; z += 8) if (r() < p * 0.7) tree(x0 + 1.2, z, r, 0.75);
}

function park(b: Rect, r: Rng) {
  const [x0, z0, x1, z1] = b;
  flat('ground', x0, z0, x1, z1, 0.17, P.lawn);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  flat('ground', x0, cz - 1.1, x1, cz + 1.1, 0.19, rgb('#e6dfcf'));
  flat('ground', cx - 1.1, z0, cx + 1.1, z1, 0.19, rgb('#e6dfcf'));
  cyl('ground', cx, cz, 0.17, 0.21, 4.2, 4.2, rgb('#e6dfcf'), 32);
  for (let i = 0; i < 14; i++) {
    const x = r.range(x0 + 2, x1 - 2);
    const z = r.range(z0 + 2, z1 - 2);
    if (Math.abs(x - cx) < 2.8 || Math.abs(z - cz) < 2.8) continue;
    tree(x, z, r, r.range(0.85, 1.15));
  }
}

/** Quiet context: muted, varied blocks (heights, footprints, gable roofs, shopfronts, setbacks). */
function filler(b: Rect, r: Rng, d: number) {
  const [x0, z0, x1, z1] = b;
  flat('ground', x0, z0, x1, z1, 0.17, P.lot);
  const wall = () => r.pick(P.filler);
  const roofs = [rgb('#c9b6a8'), rgb('#bbb8b3'), rgb('#cdbcad'), rgb('#b7bdc2')];
  const awn = [rgb('#d3c1a6'), rgb('#b4c4be'), rgb('#ccb1a3'), rgb('#bcc4cf')];
  const maxF = d < 110 ? 3 : d < 200 ? 4 : 6;
  const t = d < 150 ? r() * 0.78 : r();
  const w = x1 - x0;
  if (t < 0.28) {
    // Houses with gardens, some under gable roofs.
    const s = (w - 3) / 2;
    for (const [ox, oz] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]) {
      const a = x0 + 1 + ox * (s + 1);
      const c = z0 + 1 + oz * (s + 1);
      const sh = r.range(1.2, 3.2);
      const sw = r.range(0.4, 2);
      const pitched = r() < 0.55 ? r.pick(roofs) : undefined;
      bld(a + sh, c + sh, a + s - sw, c + s - 0.4, { floors: r.int(1, Math.min(3, maxF)), wall: wall(), r, pitched });
      if (r() < 0.7) tree(a + 1.6, c + s - 1.2, r, 0.7);
    }
  } else if (t < 0.55) {
    // Mixed-use street: two slabs with shopfronts facing the street, courtyard between.
    const dep = r.range(8, 10);
    const f1 = r.int(2, maxF);
    bld(x0 + 1, z0 + 1, x1 - 1, z0 + 1 + dep, { floors: f1, wall: wall(), r });
    const split = x0 + r.range(0.4, 0.6) * w;
    bld(x0 + 1, z1 - 1 - dep, split - 0.5, z1 - 1, { floors: r.int(2, maxF), wall: wall(), r, shop: r.pick(awn) });
    bld(split + 0.5, z1 - 1 - dep + r.range(0, 2), x1 - 1, z1 - 1, { floors: r.int(2, maxF), wall: wall(), r, shop: r.pick(awn) });
    flat('ground', x0 + 2, z0 + dep + 2, x1 - 2, z1 - dep - 2, 0.18, P.lawn);
    for (let x = x0 + 4; x < x1 - 3; x += 7) tree(x, (z0 + z1) / 2, r, 0.7);
  } else if (t < 0.78) {
    // L-shaped block + parking court.
    const dep = r.range(7, 9);
    const f = r.int(2, maxF);
    const c = wall();
    bld(x0 + 1, z0 + 1, x1 - 1, z0 + 1 + dep, { floors: f, wall: c, r });
    bld(x0 + 1, z0 + 1 + dep, x0 + 1 + dep, z1 - 1, { floors: Math.max(2, f - 1), wall: c, r, rooftop: false, shop: r() < 0.5 ? r.pick(awn) : undefined });
    for (let i = 0; i < 3; i++) if (r() < 0.8) car(x0 + 13 + i * 3, z1 - 4.5, Math.PI / 2, r.pick(CAR));
    tree(x1 - 3, z0 + dep + 5, r, 0.9);
  } else {
    // Commercial podium with a setback upper volume.
    const f = r.int(3, maxF + 1);
    const H = bld(x0 + 1, z0 + 1, x1 - 1, z1 - 1, { floors: 1, wall: shade(wall(), 0.97), r, rooftop: false, ground: 4.2, shop: r.pick(awn) });
    bld(x0 + 6, z0 + 4, x1 - 6, z1 - 8, { floors: f, wall: wall(), r, base: H, windows: r() < 0.5 ? 'ribbon' : 'punched' });
    for (const x of [x0 + 3, x1 - 3]) tree(x, z1 - 3, r, 0.6);
  }
}

function traffic(r: Rng) {
  for (let i = -N; i < N; i++)
    for (let j = -N; j < N; j++) {
      const xr = i * PITCH + 20;
      const zr = j * PITCH + 20;
      if (r() < 0.35) car(xr + (r() < 0.5 ? -2 : 2), j * PITCH + r.range(-10, 10), r() < 0.5 ? Math.PI / 2 : -Math.PI / 2, r.pick(CAR));
      if (r() < 0.35) car(i * PITCH + r.range(-10, 10), zr + (r() < 0.5 ? -2 : 2), r() < 0.5 ? 0 : Math.PI, r.pick(CAR));
    }
  // Collection trucks on the routes between the operations.
  truck(18, -2, -Math.PI / 2);
  truck(-4, 22, 0);
  truck(46, 62, 0);
  truck(-44, -22, Math.PI);
  truck(-22, 38, Math.PI / 2);
}

/* ------------------------------------------------------------------------------------------ */
/* The eight operations                                                                       */

const ZONES: Record<ZoneId, (b: Rect, r: Rng) => void> = {
  collection,
  logistics,
  resources,
  iccc,
  weighbridge,
  processing,
  landfill,
  grievance,
};

/** 01 Collection & Verification: a residential lane, gates with wet + dry bins, shared bin bay, truck collecting. */
function collection(b: Rect, r: Rng) {
  const [x0, z0, x1, z1] = b;
  flat('ground', x0, z0, x1, z1, 0.17, rgb('#f0e3c8'));
  const l0 = z1 - 7;
  const l1 = z1 - 1.5;
  flat('ground', x0, l0, x1, l1, 0.19, rgb('#b2b5b9'));
  const walls = [rgb('#f4efe4'), rgb('#f1e3c4'), rgb('#dcebe3'), rgb('#f2ddd0')];
  const accents = [P.amber, rgb('#c8735a'), P.mint];
  const roofs = [undefined, rgb('#b98a72'), undefined];
  const n = 3;
  const lw = x1 - x0 - 5.5;
  const pw = lw / n;
  for (let i = 0; i < n; i++) {
    const px = x0 + i * pw;
    const wall = walls[i % walls.length];
    const hx0 = px + 1.2;
    const hx1 = px + pw - 1.2;
    const hz1 = l0 - 5;
    const hz0 = hz1 - 10;
    bld(hx0, hz0, hx1, hz1, { floors: i === 1 ? 2 : 2, wall, r, ground: 3.4, fh: 3.1, pitched: roofs[i] });
    box('gloss', hx0 + 1, 3.3, hz1, hx1 - 1, 3.5, hz1 + 1.3, accents[i]);
    box('matte', px + pw / 2 - 0.7, 0.15, hz1, px + pw / 2 + 0.7, 2.4, hz1 + 0.06, rgb('#7a5b45'));
    flat('ground', px + 0.3, hz1, px + pw - 0.3, l0 - 0.3, 0.18, i % 2 ? rgb('#d9d2c2') : P.lawn);
    const gx = px + pw * 0.55;
    box('matte', px + 0.2, 0.15, l0 - 0.45, gx - 1.6, 1.4, l0 - 0.2, wall);
    box('matte', gx + 1.6, 0.15, l0 - 0.45, px + pw - 0.2, 1.4, l0 - 0.2, wall);
    box('matte', px + 0.2, 0.15, hz1, px + 0.45, 1.4, l0 - 0.2, wall);
    for (const x of [gx - 1.75, gx + 1.45]) box('matte', x, 0.15, l0 - 0.55, x + 0.3, 1.8, l0 - 0.1, mix(wall, P.coping, 0.5));
    box('gloss', gx - 1.45, 0.3, l0 - 0.36, gx + 1.45, 1.3, l0 - 0.28, rgb('#3e4a57'));
    if (i !== 1) tree(px + 1.8, hz1 + 2.4, r, 0.6);
    // Wet + dry pair at the gate, on the lane edge.
    bin(gx + 2.4, l0 + 0.9, P.wet);
    bin(gx + 3.9, l0 + 0.9, P.dry);
  }
  // Shared bin bay at the lane end: low walled enclosure with a light canopy, large bins.
  const bx0 = x1 - 5;
  box('matte', bx0, 0.15, l0 - 9, bx0 + 0.25, 1.3, l0 - 0.5, P.concrete);
  box('matte', bx0, 0.15, l0 - 9, x1 - 0.3, 1.3, l0 - 8.75, P.concrete);
  box('gloss', bx0 - 0.3, 3.0, l0 - 9.3, x1, 3.2, l0 - 0.2, rgb('#e9ecec'));
  box('gloss', bx0 - 0.32, 2.8, l0 - 9.32, x1 + 0.02, 3.0, l0 - 0.18, P.truck);
  for (const z of [l0 - 9, l0 - 0.6]) box('gloss', x1 - 0.6, 0.15, z, x1 - 0.35, 2.8, z + 0.25, P.steel);
  bin(bx0 + 2.3, l0 - 7, P.wet, true);
  bin(bx0 + 2.3, l0 - 4.7, P.dry, true);
  bin(bx0 + 2.3, l0 - 2.4, P.wet, true);
  // Compactor mid-collection: a bin being tipped at the rear hopper, crew beside it.
  // (On the street edge south of the lane so the gate bins stay in view.)
  const tx = x0 + pw * 1.2;
  const tz = z1 + 4.6;
  truck(tx, tz, Math.PI);
  bin(tx + 6.6, tz, P.wet);
  person(tx + 6.4, tz + 1.7, r, P.wet);
  person(tx + 7.8, tz - 1.2, r, P.wet);
  // Verification at a gate: worker with an amber handheld.
  const wx = x0 + pw * 0.55 + 1.2;
  person(wx, l0 + 2.4, r, P.wet);
  box('gloss', wx + 0.2, 1.25, l0 + 2.55, wx + 0.5, 1.6, l0 + 2.62, P.amber);
  person(x0 + pw * 0.55 - 0.6, l0 + 1.2, r);
  W.zones.collection = {
    rect: [x0, z0, x1, z1],
    anchor: [x0 + pw * 1.5, 11.5, l0 - 10],
    body: [x0, l0 - 15, x1, l0, 11],
  };
}

/** 02 D2D Logistics: fleet depot — branded canopy over a truck line, yard bays, wash bay, fuel point, gate. */
function logistics(b: Rect, r: Rng) {
  const [x0, z0, x1, z1] = b;
  flat('ground', x0, z0, x1, z1, 0.17, rgb('#c6ccc8'));
  const wall = rgb('#e8e4da');
  box('matte', x0, 0.15, z0, x1, 2.0, z0 + 0.3, wall);
  box('matte', x0, 0.15, z0, x0 + 0.3, 2.0, z1, wall);
  box('matte', x1 - 0.3, 0.15, z0, x1, 2.0, z1, wall);
  box('matte', x0, 0.15, z1 - 0.3, x0 + 11, 2.0, z1, wall);
  box('matte', x0 + 19, 0.15, z1 - 0.3, x1, 2.0, z1, wall);
  box('matte', x0 + 10.6, 0.15, z1 - 0.6, x0 + 11.2, 2.8, z1, P.coping);
  box('matte', x0 + 18.8, 0.15, z1 - 0.6, x0 + 19.4, 2.8, z1, P.coping);
  box('gloss', x0 + 11.2, 1.0, z1 - 0.4, x0 + 18, 1.12, z1 - 0.25, P.amber);
  bld(x0 + 20, z1 - 4.2, x0 + 23, z1 - 1, { floors: 1, wall: P.white, r, ground: 2.8, rooftop: false, windows: 'ribbon' });
  // Branded depot canopy (green fascia, mint stripe) over a line of four trucks.
  const cx1 = x1 - 8.5;
  const cz1 = z0 + 11;
  shed(x0 + 0.8, z0 + 0.8, cx1, cz1, 6.4, 0.9, { wall: P.steel, roof: rgb('#e9ecec'), columnsOnly: true });
  box('gloss', x0 + 0.3, 5.7, cz1 + 0.3, cx1 + 0.5, 6.35, cz1 + 0.55, P.truck);
  box('gloss', x0 + 0.3, 5.95, cz1 + 0.55, cx1 + 0.5, 6.1, cz1 + 0.6, P.mint);
  for (let i = 0; i < 4; i++) truck(x0 + 3 + i * 4.1, z0 + 6, -Math.PI / 2);
  // Yard bays with more of the fleet.
  for (let i = 0; i < 6; i++) flat('ground', x0 + 1 + i * 3.6, cz1 + 1.2, x0 + 1.12 + i * 3.6, cz1 + 10, 0.19, P.yellow);
  for (let i = 0; i < 4; i++) truck(x0 + 2.8 + i * 3.6, cz1 + 5.6, -Math.PI / 2);
  // Wash bay (east): wet floor under two blue gantries.
  const wx0 = x1 - 7.5;
  flat('ground', wx0, z0 + 1, x1 - 0.8, z0 + 11.5, 0.19, rgb('#9fc3d6'));
  for (const z of [z0 + 2.5, z0 + 10]) {
    box('gloss', wx0, 0.15, z - 0.2, wx0 + 0.4, 4.6, z + 0.2, P.steel);
    box('gloss', x1 - 1.2, 0.15, z - 0.2, x1 - 0.8, 4.6, z + 0.2, P.steel);
    box('gloss', wx0, 4.4, z - 0.25, x1 - 0.8, 4.8, z + 0.25, P.dry);
  }
  truck((wx0 + x1 - 0.8) / 2, z0 + 6.3, -Math.PI / 2);
  // Fuel point (south-east).
  const fz = z0 + 15;
  box('matte', x1 - 7, 0.15, fz, x1 - 1.5, 0.4, fz + 2, P.concrete);
  box('gloss', x1 - 6, 0.4, fz + 0.6, x1 - 5.2, 2.0, fz + 1.4, P.white);
  box('gloss', x1 - 3.6, 0.4, fz + 0.6, x1 - 2.8, 2.0, fz + 1.4, P.white);
  for (const [x, z] of [
    [x1 - 7.2, fz - 1.5],
    [x1 - 1.3, fz - 1.5],
    [x1 - 7.2, fz + 3.5],
    [x1 - 1.3, fz + 3.5],
  ])
    box('gloss', x - 0.15, 0.15, z - 0.15, x + 0.15, 4.3, z + 0.15, P.steel);
  box('gloss', x1 - 8, 4.3, fz - 2.5, x1 - 0.6, 4.65, fz + 4.5, P.white);
  box('gloss', x1 - 8.02, 4.3, fz - 2.52, x1 - 0.58, 4.5, fz + 4.52, P.truck);
  W.zones.logistics = { rect: [x0, z0, x1, z1], anchor: [x0 + 9, 7.4, z0 + 6], body: [x0 + 0.8, z0 + 0.8, cx1, cz1, 7.3] };
}

/** 03 Resource Management: ward operations office, crew assembly area, equipment yard, staff vehicles. */
function resources(b: Rect, r: Rng) {
  const [x0, z0, x1, z1] = b;
  flat('ground', x0, z0, x1, z1, 0.17, rgb('#dde9e1'));
  const bx0 = x0 + 1;
  const bx1 = x1 - 8;
  const bz0 = z0 + 1;
  const bz1 = z0 + 11;
  const H = bld(bx0, bz0, bx1, bz1, { floors: 3, wall: P.white, r, windows: 'ribbon', ground: 3.8, fh: 3.5, glass: rgb('#8fb2c4'), rooftop: false });
  for (let x = bx0 + 1.5; x < bx1 - 1; x += 2.2) box('matte', x, 3.8, bz1, x + 0.25, H, bz1 + 0.6, P.mint);
  const mx = (bx0 + bx1) / 2;
  box('matte', mx - 3.5, 3.5, bz1, mx + 3.5, 3.85, bz1 + 3, P.coping);
  box('gloss', mx - 3.5, 3.85, bz1 + 2.8, mx + 3.5, 4.35, bz1 + 3, P.dry);
  for (const x of [mx - 3.1, mx + 3.1]) cyl('gloss', x, bz1 + 2.6, 0.15, 3.5, 0.15, 0.15, P.steel, 10);
  rooftopSolar(bx0 + 1.5, bz0 + 1.5, bx1 - 1.5, bz1 - 1.5, H);
  // Equipment yard (east): lean-to store, stock of new bins, handcarts.
  const ex0 = bx1 + 1;
  box('matte', ex0, 0.15, z0 + 1, x1 - 0.5, 0.2, z0 + 15, rgb('#cfccc4'));
  box('gloss', ex0 - 0.2, 3.4, z0 + 0.8, x1 - 0.3, 3.6, z0 + 7, rgb('#e6e9e9'));
  for (const [x, z] of [
    [ex0, z0 + 6.8],
    [x1 - 0.6, z0 + 6.8],
  ])
    box('gloss', x - 0.12, 0.15, z - 0.12, x + 0.12, 3.4, z + 0.12, P.steel);
  box('matte', ex0, 0.15, z0 + 1, x1 - 0.5, 3.4, z0 + 1.3, rgb('#d6d3cb'));
  for (let i = 0; i < 4; i++)
    for (let k = 0; k < 2; k++) bin(ex0 + 1 + i * 1.6, z0 + 2.4 + k * 1.6, (i + k) % 2 ? P.dry : P.wet);
  for (let i = 0; i < 3; i++) {
    const hx = ex0 + 1.5 + i * 2.2;
    const hz = z0 + 10.5;
    box('gloss', hx - 0.6, 0.6, hz - 0.9, hx + 0.6, 1.4, hz + 0.9, P.truck);
    B('gloss').tube([hx - 0.65, 0.35, hz + 0.5], [hx + 0.65, 0.35, hz + 0.5], 0.3, 0.3, 10, rgb('#2a2c2f'), { cap: true });
    box('gloss', hx - 0.05, 0.6, hz - 1.9, hx + 0.05, 1.3, hz - 0.9, P.steelDark);
  }
  // Crew assembly area in front: painted square, uniformed staff in rows, supervisor.
  const ax0 = x0 + 1.5;
  const az0 = bz1 + 4;
  flat('ground', ax0, az0, ax0 + 9, az0 + 6.5, 0.19, rgb('#d7e6de'));
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) person(ax0 + 1.4 + i * 2, az0 + 1.4 + k * 1.8, r, k === 0 ? P.amber : P.wet);
  person(ax0 + 4.4, az0 - 0.8, r, P.white);
  // Staff vehicles.
  van(x1 - 9, z1 - 2.6, 0);
  van(x1 - 3.2, z1 - 6.5, -Math.PI / 2);
  for (let i = 0; i < 5; i++) bike(ax0 + 11 + i * 0.95, z1 - 1.6, Math.PI / 2, r.pick(CLOTH));
  W.zones.resources = { rect: [x0, z0, x1, z1], anchor: [mx, H + 1, (bz0 + bz1) / 2], body: [bx0, bz0, bx1, bz1, H + 1] };
}

/** ICCC: the signature glass tower on a podium with a subtle screen wall, antennas and dish. */
function iccc(b: Rect, r: Rng) {
  const [x0, z0, x1, z1] = b;
  flat('ground', x0, z0, x1, z1, 0.17, rgb('#e3edf0'));
  // Podium.
  const px0 = x0 + 1;
  const px1 = x1 - 1;
  const pz0 = z0 + 1;
  const pz1 = z0 + 15;
  box('glass', px0 + 0.6, 0.15, pz0 + 0.6, px1 - 0.6, 4.4, pz1 - 0.6, rgb('#a9bfcd'));
  box('matte', px0, 4.4, pz0, px1, 9, pz1, P.white);
  box('matte', px0 - 0.3, 9, pz0 - 0.3, px1 + 0.3, 9.4, pz1 + 0.3, P.coping);
  // Screen wall on the south face of the podium (subtle).
  B('screen').quad([(px0 + px1) / 2 + 1.5, 6.7, pz1 + 0.04], [0, 0, 1], [0, 1, 0], (px1 - px0) / 2 - 2.5, 2.0, [1, 1, 1], [0, 0, 1, 1]);
  // Mint fins on the west podium face.
  for (let z = pz0 + 1; z < pz1 - 0.5; z += 1.4) box('matte', px0 - 0.5, 4.6, z, px0, 8.8, z + 0.25, P.mint);
  // Tower.
  const tx0 = px0 + 2;
  const tx1 = tx0 + 14;
  const tz0 = pz0 + 1;
  const tz1 = tz0 + 11;
  const TH = 46;
  box('glass', tx0, 9.4, tz0, tx1, TH, tz1, rgb('#9db6c9'));
  for (let y = 13; y < TH; y += 3.6) box('matte', tx0 - 0.06, y - 0.1, tz0 - 0.06, tx1 + 0.06, y + 0.12, tz1 + 0.06, rgb('#e3e8eb'));
  for (let x = tx0 + 1.75; x < tx1; x += 1.75) box('matte', x - 0.08, 9.4, tz1, x + 0.08, TH, tz1 + 0.35, rgb('#e3e8eb'));
  for (let z = tz0 + 1.75; z < tz1; z += 1.75) box('matte', tx0 - 0.35, 9.4, z - 0.08, tx0, TH, z + 0.08, rgb('#e3e8eb'));
  box('matte', tx1 - 3.5, 9.4, tz0 - 0.2, tx1 + 0.2, TH + 3, tz1 + 0.2, P.white);
  box('matte', tx0 - 0.4, TH, tz0 - 0.4, tx1 + 0.4, TH + 0.7, tz1 + 0.4, P.coping);
  box('matte', tx0 + 1.5, TH + 0.7, tz0 + 2, tx0 + 8, TH + 2.8, tz1 - 2, rgb('#d8dde0'));
  // Antennas + dish.
  const mx = tx0 + 4;
  const mz = (tz0 + tz1) / 2;
  cyl('gloss', mx, mz, TH + 2.8, TH + 16, 0.28, 0.1, rgb('#e6e8ea'), 10);
  cyl('gloss', mx + 3.5, mz + 2, TH + 2.8, TH + 10, 0.18, 0.08, rgb('#e6e8ea'), 8);
  box('gloss', mx - 0.2, TH + 16, mz - 0.2, mx + 0.2, TH + 16.5, mz + 0.2, P.red);
  cyl('gloss', mx + 1.2, mz - 2.5, TH + 4, TH + 4.8, 1.2, 0.25, P.white, 18);
  // Forecourt: water feature, mint planters, flags, drop-off.
  B('water').quad([px0 + 6, 0.3, z1 - 4], [0, 1, 0], [0, 0, -1], 5, 1.8, P.water, 'flat');
  box('matte', px0 + 0.7, 0.15, z1 - 6.1, px0 + 11.3, 0.3, z1 - 1.9, P.coping, 8);
  for (let i = 0; i < 3; i++) cyl('gloss', px1 - 1 - i * 1.4, z1 - 3, 0.15, 8.5, 0.07, 0.05, P.white, 6);
  for (const x of [px0 + 14, px0 + 19]) {
    box('matte', x - 1.2, 0.15, z1 - 3.5, x + 1.2, 0.7, z1 - 1.5, P.mint);
    tree(x, z1 - 2.5, r, 0.6);
  }
  car(px0 + 15, pz1 + 3, 0, CAR[0]);
  for (let i = 0; i < 4; i++) person(px0 + 4 + i * 2.3, pz1 + 2.5 + (i % 2), r);
  W.zones.iccc = { rect: [x0, z0, x1, z1], anchor: [(tx0 + tx1) / 2, TH + 3, (tz0 + tz1) / 2], body: [tx0, tz0, tx1, tz1, TH + 3] };
}

/** 04 Weighbridge: long bright scale deck + truck, cabin facing it, barriers both ends, approach lanes, transfer shed. */
function weighbridge(b: Rect, r: Rng) {
  const [x0, z0, x1, z1] = b;
  flat('ground', x0, z0, x1, z1, 0.17, rgb('#dcd5c2'));
  // Approach lane (asphalt) along the south with arrows-free lane lines.
  flat('ground', x0, z1 - 9.5, x1, z1 - 1, 0.18, rgb('#b5b8bc'));
  for (const z of [z1 - 9.3, z1 - 1.2]) flat('ground', x0, z - 0.08, x1, z + 0.08, 0.19, P.roadLine);
  // The scale: a long, bright steel deck with yellow/black edge markings.
  const dx0 = x0 + 2;
  const dx1 = x1 - 2;
  const dz0 = z1 - 7.3;
  const dz1 = dz0 + 4.2;
  box('matte', dx0 - 0.6, 0.15, dz0 - 0.6, dx1 + 0.6, 0.32, dz1 + 0.6, P.concrete);
  box('gloss', dx0, 0.32, dz0, dx1, 0.5, dz1, rgb('#b8c0c6'));
  for (let x = dx0 + 3; x < dx1; x += 3) box('gloss', x, 0.5, dz0, x + 0.08, 0.52, dz1, rgb('#8d969e'));
  for (const z of [dz0 - 0.4, dz1]) {
    let k = 0;
    for (let x = dx0; x < dx1 - 0.1; x += 0.9) box('gloss', x, 0.32, z, Math.min(dx1, x + 0.9), 0.6, z + 0.4, k++ % 2 ? rgb('#2a2c2f') : P.yellow);
  }
  truck((dx0 + dx1) / 2 + 0.5, (dz0 + dz1) / 2, 0);
  // Barrier arms at both ends (red/white).
  for (const [px, dir] of [
    [dx0 - 1.2, 1],
    [dx1 + 1.2, -1],
  ] as const) {
    box('gloss', px - 0.3, 0.15, dz1 + 0.8, px + 0.3, 1.25, dz1 + 1.4, P.white);
    for (let i = 0; i < 5; i++) box('gloss', px - 0.12, 1.05, dz1 + 0.8 - (i + 1) * 0.95, px + 0.12, 1.2, dz1 + 0.8 - i * 0.95, i % 2 ? P.white : P.red);
    void dir;
  }
  // Control cabin north of the deck, window band facing the deck, canopy over it.
  const cx0 = x0 + 9;
  const cz1 = dz0 - 1.8;
  bld(cx0, cz1 - 5, cx0 + 8, cz1, { floors: 1, wall: P.white, r, ground: 3.2, windows: 'ribbon', rooftop: false, faces: ['S', 'W'] });
  box('gloss', cx0 - 1, 4.6, cz1 - 6, cx0 + 9, 4.85, cz1 + 2.2, rgb('#eef0f0'));
  box('gloss', cx0 - 1.02, 4.35, cz1 - 6.02, cx0 + 9.02, 4.6, cz1 + 2.22, P.truck);
  for (const x of [cx0 - 0.7, cx0 + 8.7]) box('gloss', x - 0.12, 0.15, cz1 + 1.9, x + 0.12, 4.35, cz1 + 2.1, P.steel);
  // Transfer shed behind with hook-lift containers.
  shed(x0 + 1, z0 + 0.8, x0 + 8, z0 + 12, 7.5, 1.0, { wall: rgb('#e2e5e5'), roof: rgb('#eceeee'), openS: true });
  container(x1 - 6, z0 + 3, 0, rgb('#3a7cc8'));
  container(x1 - 6, z0 + 6.2, 0, rgb('#3fa257'));
  W.zones.weighbridge = { rect: [x0, z0, x1, z1], anchor: [(dx0 + dx1) / 2, 4.2, (dz0 + dz1) / 2], body: [dx0 - 1, cz1 - 6, dx1 + 1, dz1 + 1, 5] };
}

/** 05 Processing: MRF shed with skylights, conveyor, segregation bays, bales, compost windrows. */
function processing(b: Rect, r: Rng) {
  const [x0, z0, x1, z1] = b;
  flat('ground', x0, z0, x1, z1, 0.17, rgb('#d9d1bd'));
  // MRF shed.
  const sx0 = x0 + 1;
  const sx1 = sx0 + 30;
  const sz0 = z0 + 1;
  const sz1 = z0 + 17;
  const ridge = shed(sx0, sz0, sx1, sz1, 9, 2.2, { wall: rgb('#e4e7e8'), roof: rgb('#f0f2f2'), openS: true, skylights: true });
  // Conveyor rising from the tipping floor into the shed (dark belt, yellow frame).
  const ca: V3 = [sx0 + 25.5, 0.9, z1 - 2];
  const cb: V3 = [sx0 + 25.5, 6.5, sz1 - 1.2];
  B('gloss').ribbon(
    [
      [ca[0] - 0.7, ca[1], ca[2]],
      [cb[0] - 0.7, cb[1], cb[2]],
    ],
    [
      [ca[0] + 0.7, ca[1], ca[2]],
      [cb[0] + 0.7, cb[1], cb[2]],
    ],
    rgb('#3a3e43'),
    undefined,
    [0, 1, 1],
  );
  for (const s of [-1, 1])
    B('gloss').tube([ca[0] + s * 0.8, ca[1] + 0.25, ca[2]], [cb[0] + s * 0.8, cb[1] + 0.25, cb[2]], 0.12, 0.12, 8, P.yellow);
  for (let k = 0.2; k < 1; k += 0.3) {
    const y = ca[1] + (cb[1] - ca[1]) * k;
    const z = ca[2] + (cb[2] - ca[2]) * k;
    for (const s of [-1, 1]) box('gloss', ca[0] + s * 0.8 - 0.1, 0.15, z - 0.1, ca[0] + s * 0.8 + 0.1, y, z + 0.1, P.yellow);
  }
  box('gloss', ca[0] - 1.5, 0.15, ca[2] - 0.5, ca[0] + 1.5, 1.4, ca[2] + 1.5, P.steelDark);
  // Segregation bays (west of the conveyor) with coloured heaps.
  const heaps = [rgb('#d8c79b'), rgb('#7fa5c6'), rgb('#b4b4b0'), rgb('#86a86c'), rgb('#9a7a5a')];
  for (let i = 0; i < 5; i++) {
    const bx = sx0 + 0.3 + i * 4.5;
    const bz0 = sz1 + 1.2;
    box('matte', bx, 0.15, bz0, bx + 0.35, 2.2, bz0 + 5.4, P.concrete);
    if (i === 4) box('matte', bx + 4.15, 0.15, bz0, bx + 4.5, 2.2, bz0 + 5.4, P.concrete);
    box('matte', bx, 0.15, bz0, bx + 4.5, 2.2, bz0 + 0.35, P.concrete);
    B('matte').cylinder(bx + 2.25, bz0 + 2.8, 0.15, 2.3, 2.05, 0.45, 10, heaps[i], { flat: true, cap: true, phase: r() });
  }
  // Bale stacks.
  const bales = [rgb('#8fb0cc'), rgb('#d8c79b'), rgb('#b9bdbf'), rgb('#a8c48c')];
  for (let i = 0; i < 12; i++) {
    const bx = sx1 + 1.5 + (i % 4) * 1.4;
    const by = 0.15 + Math.floor(i / 4) * 1.15;
    box('gloss', bx, by, sz0 + 1, bx + 1.25, by + 1.1, sz0 + 2.4, bales[(i + Math.floor(i / 4)) % 4]);
    box('gloss', bx, by, sz0 + 2.6, bx + 1.25, by + 1.1, sz0 + 4.0, bales[(i + 1) % 4]);
  }
  loader(sx1 + 4, sz0 + 9, Math.PI / 2 + 0.3);
  // Compost yard east: covered windrows under a light canopy + open windrows.
  const cx0 = sx1 + 9;
  flat('ground', cx0, z0 + 1, x1 - 1, z1 - 1, 0.19, rgb('#cbbfa9'));
  const rows = Math.floor((x1 - 1 - cx0) / 3.4);
  for (let i = 0; i < rows; i++) {
    const x = cx0 + 1.7 + i * 3.4;
    const za = z0 + 2.5;
    const zb = z1 - 2.5;
    const hw = 1.3;
    const h = 1.6;
    const col = shade(P.compost, r.range(0.92, 1.1));
    B('matte').ribbon(
      [
        [x - hw, 0.2, za],
        [x - hw, 0.2, zb],
      ],
      [
        [x, h, za + 0.9],
        [x, h, zb - 0.9],
      ],
      col,
      undefined,
      [-1, 1, 0],
    );
    B('matte').ribbon(
      [
        [x, h, za + 0.9],
        [x, h, zb - 0.9],
      ],
      [
        [x + hw, 0.2, za],
        [x + hw, 0.2, zb],
      ],
      shade(col, 1.08),
      undefined,
      [1, 1, 0],
    );
    B('matte').tri([x - hw, 0.2, zb], [x + hw, 0.2, zb], [x, h, zb - 0.9], [0, 0.5, 0.86], shade(col, 1.04));
  }
  shed(cx0, z0 + 1.5, cx0 + 3.4 * Math.min(4, rows), z0 + 12, 5.5, 0.8, { wall: P.steel, roof: rgb('#e8ebeb'), columnsOnly: true });
  loader(cx0 + 15, z1 - 1.5, 0.2);
  W.zones.processing = { rect: [x0, z0, x0 + 46, z1], anchor: [(sx0 + sx1) / 2, ridge + 0.5, (sz0 + sz1) / 2], body: [sx0, sz0, sx1, sz1, ridge + 0.5] };
}

/** 06 Landfill: green capped terraces, active lined cell, leachate pond, ramp, perimeter, site office. */
function landfill(b: Rect, r: Rng) {
  const [x0, z0, x1, z1] = b;
  flat('ground', x0, z0, x1, z1, 0.17, rgb('#cdc8aa'));
  // Perimeter: green buffer, fence and trees along the south edge.
  flat('ground', x0, z1 - 2.4, x1, z1, 0.18, P.lawnDeep);
  for (let x = x0 + 1; x < x1; x += 3) box('gloss', x, 0.15, z1 - 0.4, x + 0.1, 1.9, z1 - 0.3, P.steelDark);
  box('gloss', x0 + 0.3, 1.7, z1 - 0.38, x1 - 0.5, 1.76, z1 - 0.32, P.steelDark);
  for (let x = x0 + 16; x < x1 - 2; x += 7) tree(x, z1 - 1.3, r, 0.6);
  // Site office + lined leachate pond on the west strip.
  bld(x0 + 0.5, z0 + 0.5, x0 + 10, z0 + 6, { floors: 1, wall: P.white, r, ground: 3.2, windows: 'ribbon', rooftop: false });
  box('gloss', x0 + 0.1, 3.4, z0 + 0.1, x0 + 10.4, 3.6, z0 + 6.4, P.truck);
  const pond: Rect = [x0 + 0.5, z0 + 9, x0 + 11, z1 - 7];
  box('liner', pond[0], 0.15, pond[1], pond[2], 0.7, pond[3], P.liner);
  B('water').quad([(pond[0] + pond[2]) / 2, 0.72, (pond[1] + pond[3]) / 2], [0, 1, 0], [0, 0, -1], (pond[2] - pond[0]) / 2 - 0.6, (pond[3] - pond[1]) / 2 - 0.6, P.water, 'flat');
  // Access road (gravel) from the west gate to the ramp foot, with a loaded tipper.
  flat('ground', x0, z1 - 5.8, x0 + 16, z1 - 1.8, 0.19, rgb('#d3c8ae'));
  tipper(x0 + 6.5, z1 - 3.8, 0, P.truck, rgb('#9c8f7c'));
  // Capped mound (centre): three green terraces with benches, gas vents on the cap.
  const m0: Rect = [x0 + 13, z0 + 0.5, x0 + 46, z1 - 3];
  let t = frustum('matte', m0, 0.17, 3.0, 2.8, P.lawnDeep, rgb('#c3cf9e'));
  t = inset(t, 1.1);
  t = frustum('matte', t, 3.0, 6.0, 2.6, P.lawn, rgb('#c3cf9e'));
  t = inset(t, 1.1);
  const top = frustum('matte', t, 6.0, 8.2, 2.0, rgb('#a9bf8a'), rgb('#bccb98'));
  for (let x = top[0] + 2; x < top[2] - 1; x += 4)
    for (let z = top[1] + 1.5; z < top[3] - 0.5; z += 3.5) cyl('gloss', x, z, 8.2, 9.4, 0.15, 0.15, P.steelDark, 8);
  // Access ramp up the south face.
  const L: V3[] = [];
  const R: V3[] = [];
  const S0: V3[] = [];
  const S1: V3[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const x = m0[0] + 2 + u * 22;
    const y = 0.25 + u * 8.0;
    const zo = m0[3] + 1.4 - y * 1.25;
    L.push([x, y, zo - 3.6]);
    R.push([x, y, zo]);
    S0.push([x, y, zo]);
    S1.push([x, Math.max(0.17, y - 3.4), zo + 2.4]);
  }
  B('matte').ribbon(L, R, rgb('#d8ccb0'), undefined, [0, 1, 0]);
  B('matte').ribbon(S0, S1, rgb('#bfb08e'), undefined, [0, 0.6, 1]);
  // Active cell (east): bund with exposed black HDPE liner, waste floor, compactor + tipper.
  const a0: Rect = [x0 + 48, z0 + 0.5, x1 - 0.5, z1 - 3];
  const crest = frustum('matte', a0, 0.17, 4.2, 3.0, P.lawnDeep, null);
  const ring = (rr: Rect, w: number, y: number, col: RGB, m: Mat) => {
    const [ax, az, bx, bz] = rr;
    flat(m, ax, az, bx, az + w, y, col);
    flat(m, ax, bz - w, bx, bz, y, col);
    flat(m, ax, az + w, ax + w, bz - w, y, col);
    flat(m, bx - w, az + w, bx, bz - w, y, col);
  };
  ring(crest, 2.0, 4.2, rgb('#dccfb2'), 'matte');
  const li = inset(crest, 2.0);
  const fl = inset(li, 2.6);
  const lin = (pa: V3, pb: V3, qa: V3, qb: V3, n: V3) => B('liner').ribbon([pa, pb], [qa, qb], P.liner, undefined, n);
  lin([li[0], 4.21, li[3]], [li[2], 4.21, li[3]], [fl[0], 1.4, fl[3]], [fl[2], 1.4, fl[3]], [0, 1, -1]);
  lin([li[0], 4.21, li[1]], [li[2], 4.21, li[1]], [fl[0], 1.4, fl[1]], [fl[2], 1.4, fl[1]], [0, 1, 1]);
  lin([li[0], 4.21, li[1]], [li[0], 4.21, li[3]], [fl[0], 1.4, fl[1]], [fl[0], 1.4, fl[3]], [1, 1, 0]);
  lin([li[2], 4.21, li[1]], [li[2], 4.21, li[3]], [fl[2], 1.4, fl[1]], [fl[2], 1.4, fl[3]], [-1, 1, 0]);
  flat('matte', fl[0], fl[1], fl[2], fl[3], 1.4, P.waste);
  const fx = (fl[0] + fl[2]) / 2;
  frustum('matte', [fl[0] - 2, fl[1] - 2, fx, fl[3] + 2], 1.4, 2.8, 1.6, shade(P.waste, 0.95), shade(P.waste, 1.05));
  loader(fx + 2.5, (fl[1] + fl[3]) / 2, 2.6);
  tipper((crest[0] + crest[2]) / 2, crest[3] - 1.0, 0, P.truck, rgb('#9c8f7c'));
  W.zones.landfill = {
    rect: [x0, z0, x1, z1],
    anchor: [(top[0] + top[2]) / 2, 8.6, (top[1] + top[3]) / 2],
    body: [m0[0], m0[1], m0[2], m0[3], 8.6],
  };
}

/** 07 Grievances: citizen service centre — colonnade, forecourt with helpdesk canopy + kiosks, people. */
function grievance(b: Rect, r: Rng) {
  const [x0, z0, x1, z1] = b;
  flat('ground', x0, z0, x1, z1, 0.17, rgb('#f3e2c4'));
  for (let x = x0 + 2; x < x1; x += 4) flat('ground', x, z0 + 13, x + 0.25, z1, 0.18, rgb('#e2d3ba'));
  const bx0 = x0 + 1;
  const bx1 = x1 - 1;
  const bz0 = z0 + 1;
  const bz1 = z0 + 10;
  const H = bld(bx0, bz0, bx1, bz1, { floors: 2, wall: rgb('#f7f3ea'), r, windows: 'ribbon', ground: 4.2, fh: 4, glass: rgb('#9fbccc'), rooftop: false });
  box('matte', bx0 + 1, 4.1, bz1, bx1 - 1, 4.5, bz1 + 3.4, P.coping);
  box('gloss', bx0 + 1, 4.5, bz1 + 3.2, bx1 - 1, 5.2, bz1 + 3.4, P.mint);
  for (let x = bx0 + 1.6; x <= bx1 - 1.4; x += 3) cyl('matte', x, bz1 + 2.9, 0.15, 4.1, 0.22, 0.22, P.white, 12);
  rooftopSolar(bx0 + 2, bz0 + 1.5, bx1 - 2, bz1 - 1.5, H);
  // Helpdesk canopy (mint tensile roof) with two desks and queues.
  const hx0 = x0 + 2;
  const hz0 = bz1 + 6;
  box('gloss', hx0, 3.1, hz0, hx0 + 9, 3.3, hz0 + 5, P.mint);
  for (const [x, z] of [
    [hx0 + 0.3, hz0 + 0.3],
    [hx0 + 8.7, hz0 + 0.3],
    [hx0 + 0.3, hz0 + 4.7],
    [hx0 + 8.7, hz0 + 4.7],
  ])
    box('gloss', x - 0.1, 0.15, z - 0.1, x + 0.1, 3.1, z + 0.1, P.white);
  for (const x of [hx0 + 2.3, hx0 + 6.3]) {
    box('gloss', x - 1.1, 0.15, hz0 + 1, x + 1.1, 1.05, hz0 + 1.7, P.white);
    person(x, hz0 + 0.5, r, P.dry);
    for (let i = 0; i < 3; i++) person(x + (i % 2 ? 0.3 : -0.2), hz0 + 2.6 + i * 1.0, r);
  }
  // Self-service kiosks + planters with trees, benches, flagpole, visitors.
  for (const x of [x1 - 9, x1 - 7]) {
    box('gloss', x - 0.4, 0.15, hz0 + 1, x + 0.4, 2.0, hz0 + 1.5, P.dry);
    box('gloss', x - 0.32, 1.2, hz0 + 1.5, x + 0.32, 1.8, hz0 + 1.54, P.amber);
    person(x, hz0 + 2.5, r);
  }
  for (const [x, z] of [
    [x1 - 3.5, z1 - 3],
    [x0 + 14, z1 - 2.5],
  ]) {
    cyl('matte', x, z, 0.15, 0.65, 1.5, 1.5, rgb('#e3d6c0'), 24);
    tree(x, z, r, 0.75);
  }
  bench(x0 + 18, z1 - 1.6, true);
  cyl('gloss', x1 - 2, bz1 + 4.5, 0.15, 9, 0.07, 0.05, P.white, 6);
  for (let i = 0; i < 6; i++) person(r.range(x0 + 12, x1 - 4), r.range(bz1 + 4.2, z1 - 4.5), r);
  W.zones.grievance = { rect: [x0, z0, x1, z1], anchor: [(bx0 + bx1) / 2, H + 1.2, (bz0 + bz1) / 2], body: [bx0, bz0, bx1, bz1 + 3.4, H + 1] };
}

function rooftopSolar(x0: number, z0: number, x1: number, z1: number, H: number) {
  for (let z = z0; z < z1 - 1.6; z += 2.6)
    B('glass').ribbon(
      [
        [x0, H + 0.35, z + 1.8],
        [x1, H + 0.35, z + 1.8],
      ],
      [
        [x0, H + 1.0, z],
        [x1, H + 1.0, z],
      ],
      rgb('#3d5878'),
      undefined,
      [0, 1, 0],
    );
}
