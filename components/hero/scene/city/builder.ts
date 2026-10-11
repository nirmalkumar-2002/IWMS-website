import { BufferAttribute, BufferGeometry, Color } from 'three';

type TypedCtor = Float32ArrayConstructor | Uint32ArrayConstructor;
/** Growable typed array: no per-element boxing or GC churn while generating the city. */
class Grow<C extends TypedCtor> {
  a: InstanceType<C>;
  n = 0;
  constructor(private ctor: C) {
    this.a = new ctor(4096) as InstanceType<C>;
  }
  private reserve(k: number) {
    if (this.n + k <= this.a.length) return;
    const next = new this.ctor(Math.max(this.a.length * 2, this.n + k)) as InstanceType<C>;
    next.set(this.a);
    this.a = next;
  }
  push(...v: number[]) {
    this.reserve(v.length);
    for (let i = 0; i < v.length; i++) this.a[this.n++] = v[i];
  }
  push2(x: number, y: number) {
    this.reserve(2);
    this.a[this.n++] = x;
    this.a[this.n++] = y;
  }
  push3(x: number, y: number, z: number) {
    this.reserve(3);
    this.a[this.n++] = x;
    this.a[this.n++] = y;
    this.a[this.n++] = z;
  }
  trimmed() {
    return this.a.subarray(0, this.n) as InstanceType<C>;
  }
}

/** Linear-space RGB triple. */
export type RGB = [number, number, number];

const scratch = new Color();
/** sRGB hex → linear RGB (vertex colours are linear in three's colour pipeline). */
export function rgb(hex: string, scale = 1): RGB {
  scratch.set(hex);
  return [scratch.r * scale, scratch.g * scale, scratch.b * scale];
}
export function mix(a: RGB, b: RGB, k: number): RGB {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
export function shade(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}

/** Deterministic PRNG (LCG) so the layout is identical on every load. */
export function rng(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return Object.assign(next, {
    range: (a: number, b: number) => a + next() * (b - a),
    int: (a: number, b: number) => Math.floor(a + next() * (b - a + 1)),
    pick: <T,>(list: readonly T[]) => list[Math.floor(next() * list.length)],
    chance: (p: number) => next() < p,
  });
}
export type Rng = ReturnType<typeof rng>;

type V3 = [number, number, number];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Faces of a box that can be skipped (bitmask). */
export const FACE = { PX: 1, NX: 2, PY: 4, NY: 8, PZ: 16, NZ: 32 };

export interface BoxOpts {
  /** Faces to omit (FACE bitmask). Bottom faces are omitted by default. */
  skip?: number;
  /** Darken the bottom edge of side faces by this fraction (ground grime / ambient occlusion). */
  grime?: number;
  /** Darken the top edge of side faces (stains under parapets). */
  stain?: number;
  /** 'world' maps the texture in metres; 'flat' samples a single texel. */
  uv?: 'world' | 'flat';
}

/**
 * Accumulates indexed triangles for one material bucket. Everything is written straight into
 * plain arrays (no intermediate BufferGeometries), which keeps generation in the tens of ms.
 */
export class GeoBuilder {
  pos = new Grow(Float32Array);
  nor = new Grow(Float32Array);
  uv = new Grow(Float32Array);
  col = new Grow(Float32Array);
  idx = new Grow(Uint32Array);
  constructor(
    /** World-UV tile size in metres (u, v). */
    public su = 2,
    public sv = 2,
    /** UV used by 'flat' mapping. */
    public flatUV: [number, number] = [0.5, 0.5],
  ) {}

  get vertexCount() {
    return this.pos.n / 3;
  }

  private vert(p: V3, n: V3, u: number, v: number, c: RGB) {
    this.pos.push3(p[0], p[1], p[2]);
    this.nor.push3(n[0], n[1], n[2]);
    this.uv.push2(u, v);
    this.col.push3(c[0], c[1], c[2]);
  }

  /**
   * Quad centred at c with outward normal n and in-plane up vector `up` (right = up × n).
   * uvRect = [u0, v0, u1, v1] for explicit UVs, otherwise world-mapped (or flat).
   */
  quad(
    c: V3,
    n: V3,
    up: V3,
    hw: number,
    hh: number,
    color: RGB | [RGB, RGB],
    uvRect?: [number, number, number, number] | 'flat',
  ) {
    const r = cross(up, n);
    const base = this.vertexCount;
    const corners: [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    const bottom = Array.isArray(color[0]) ? (color as [RGB, RGB])[0] : (color as RGB);
    const top = Array.isArray(color[0]) ? (color as [RGB, RGB])[1] : (color as RGB);
    for (const [sx, sy] of corners) {
      const p: V3 = [
        c[0] + r[0] * hw * sx + up[0] * hh * sy,
        c[1] + r[1] * hw * sx + up[1] * hh * sy,
        c[2] + r[2] * hw * sx + up[2] * hh * sy,
      ];
      let u: number;
      let v: number;
      if (uvRect === 'flat') {
        u = this.flatUV[0];
        v = this.flatUV[1];
      } else if (uvRect) {
        u = sx < 0 ? uvRect[0] : uvRect[2];
        v = sy < 0 ? uvRect[1] : uvRect[3];
      } else {
        u = (p[0] * r[0] + p[1] * r[1] + p[2] * r[2]) / this.su;
        v = (p[0] * up[0] + p[1] * up[1] + p[2] * up[2]) / this.sv;
      }
      this.vert(p, n, u, v, sy < 0 ? bottom : top);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  /** Axis-aligned box from min/max corners. */
  box(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    color: RGB,
    opts: BoxOpts = {},
  ) {
    this.obox(
      (x0 + x1) / 2,
      (y0 + y1) / 2,
      (z0 + z1) / 2,
      Math.abs(x1 - x0) / 2,
      Math.abs(y1 - y0) / 2,
      Math.abs(z1 - z0) / 2,
      0,
      color,
      opts,
    );
  }

  /** Box rotated about Y by `yaw` (radians), centre + half extents. */
  obox(
    cx: number,
    cy: number,
    cz: number,
    hx: number,
    hy: number,
    hz: number,
    yaw: number,
    color: RGB,
    opts: BoxOpts = {},
  ) {
    const skip = opts.skip ?? FACE.NY;
    const ca = Math.cos(yaw);
    const sa = Math.sin(yaw);
    const ex: V3 = [ca, 0, -sa];
    const ez: V3 = [sa, 0, ca];
    const up: V3 = [0, 1, 0];
    const flat = opts.uv === 'flat' ? 'flat' : undefined;
    const g = opts.grime ?? 0;
    const st = opts.stain ?? 0;
    const side: RGB | [RGB, RGB] =
      g || st ? [shade(color, 1 - g), shade(color, 1 - st)] : color;
    const at = (a: V3, d: number): V3 => [cx + a[0] * d, cy + a[1] * d, cz + a[2] * d];
    if (!(skip & FACE.PX)) this.quad(at(ex, hx), ex, up, hz, hy, side, flat);
    if (!(skip & FACE.NX))
      this.quad(at(ex, -hx), [-ex[0], 0, -ex[2]], up, hz, hy, side, flat);
    if (!(skip & FACE.PZ)) this.quad(at(ez, hz), ez, up, hx, hy, side, flat);
    if (!(skip & FACE.NZ))
      this.quad(at(ez, -hz), [-ez[0], 0, -ez[2]], up, hx, hy, side, flat);
    if (!(skip & FACE.PY))
      this.quad(at(up, hy), up, [-ez[0], 0, -ez[2]], hx, hz, color, flat);
    if (!(skip & FACE.NY)) this.quad(at(up, -hy), [0, -1, 0], ez, hx, hz, color, flat);
  }

  /** Vertical cylinder / cone frustum with smooth (or flat) sides. */
  cylinder(
    x: number,
    z: number,
    y0: number,
    y1: number,
    r0: number,
    r1: number,
    seg: number,
    color: RGB,
    opts: { cap?: boolean; flat?: boolean; phase?: number; grime?: number } = {},
  ) {
    this.tube([x, y0, z], [x, y1, z], r0, r1, seg, color, opts);
  }

  /** Cylinder between two arbitrary points. */
  tube(
    a: V3,
    b: V3,
    r0: number,
    r1: number,
    seg: number,
    color: RGB,
    opts: { cap?: boolean; flat?: boolean; phase?: number; grime?: number } = {},
  ) {
    const axis: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(axis[0], axis[1], axis[2]);
    const w: V3 = [axis[0] / len, axis[1] / len, axis[2] / len];
    const ref: V3 = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const cu = cross(ref, w);
    const lu = Math.hypot(...cu);
    const u: V3 = [cu[0] / lu, cu[1] / lu, cu[2] / lu];
    const v = cross(w, u);
    const phase = opts.phase ?? 0;
    const bottomColor = shade(color, 1 - (opts.grime ?? 0));
    const dir = (i: number): V3 => {
      const t = phase + (i / seg) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      return [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s];
    };
    const slope = (r0 - r1) / len;
    if (opts.flat) {
      for (let i = 0; i < seg; i++) {
        const d0 = dir(i);
        const d1 = dir(i + 1);
        const mid = dir(i + 0.5);
        const n: V3 = [mid[0] + w[0] * slope, mid[1] + w[1] * slope, mid[2] + w[2] * slope];
        const nl = Math.hypot(...n);
        n[0] /= nl;
        n[1] /= nl;
        n[2] /= nl;
        const base = this.vertexCount;
        const p = (d: V3, o: V3, r: number): V3 => [o[0] + d[0] * r, o[1] + d[1] * r, o[2] + d[2] * r];
        this.vert(p(d0, a, r0), n, i / seg, 0, bottomColor);
        this.vert(p(d1, a, r0), n, (i + 1) / seg, 0, bottomColor);
        this.vert(p(d1, b, r1), n, (i + 1) / seg, len / this.sv, color);
        this.vert(p(d0, b, r1), n, i / seg, len / this.sv, color);
        this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    } else {
      const base = this.vertexCount;
      for (let i = 0; i <= seg; i++) {
        const d = dir(i);
        const n: V3 = [d[0] + w[0] * slope, d[1] + w[1] * slope, d[2] + w[2] * slope];
        const nl = Math.hypot(...n);
        n[0] /= nl;
        n[1] /= nl;
        n[2] /= nl;
        this.vert([a[0] + d[0] * r0, a[1] + d[1] * r0, a[2] + d[2] * r0], n, i / seg, 0, bottomColor);
        this.vert([b[0] + d[0] * r1, b[1] + d[1] * r1, b[2] + d[2] * r1], n, i / seg, len / this.sv, color);
      }
      for (let i = 0; i < seg; i++) {
        const k = base + i * 2;
        this.idx.push(k, k + 2, k + 3, k, k + 3, k + 1);
      }
    }
    if (opts.cap && r1 > 0) {
      const base = this.vertexCount;
      this.vert(b, w, 0.5, 0.5, color);
      for (let i = 0; i <= seg; i++) {
        const d = dir(i);
        this.vert([b[0] + d[0] * r1, b[1] + d[1] * r1, b[2] + d[2] * r1], w, 0.5, 0.5, color);
      }
      for (let i = 0; i < seg; i++) this.idx.push(base, base + 1 + i, base + 2 + i);
    }
  }

  /** Single triangle (counter-clockwise seen from the normal side). */
  tri(a: V3, b: V3, c: V3, n: V3, color: RGB, uvs?: [number, number][]) {
    const base = this.vertexCount;
    const pts = [a, b, c];
    pts.forEach((p, i) => {
      const uv = uvs ? uvs[i] : [p[0] / this.su, p[2] / this.sv];
      this.vert(p, n, uv[0], uv[1], color);
    });
    this.idx.push(base, base + 1, base + 2);
  }

  /** Strip of quads between two polylines (same length). Normals from the quad plane. */
  ribbon(
    left: V3[],
    right: V3[],
    color: RGB,
    uvFn?: (p: V3) => [number, number],
    facing?: V3,
  ) {
    for (let i = 0; i < left.length - 1; i++) {
      const a = left[i];
      const b = right[i];
      const c = right[i + 1];
      const d = left[i + 1];
      const e1: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const e2: V3 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      const n = cross(e1, e2);
      const nl = Math.hypot(...n) || 1;
      n[0] /= nl;
      n[1] /= nl;
      n[2] /= nl;
      const flip = facing && n[0] * facing[0] + n[1] * facing[1] + n[2] * facing[2] < 0;
      if (flip) {
        n[0] = -n[0];
        n[1] = -n[1];
        n[2] = -n[2];
      }
      const base = this.vertexCount;
      for (const p of [a, b, c, d]) {
        const uv = uvFn
          ? uvFn(p)
          : Math.abs(n[1]) > 0.5
            ? [p[0] / this.su, p[2] / this.sv]
            : [(p[0] + p[2]) / this.su, p[1] / this.sv];
        this.vert(p, n, uv[0], uv[1], color);
      }
      if (flip) this.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
      else this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  build(): BufferGeometry | null {
    if (this.idx.n === 0) return null;
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(this.pos.trimmed(), 3));
    g.setAttribute('normal', new BufferAttribute(this.nor.trimmed(), 3));
    g.setAttribute('uv', new BufferAttribute(this.uv.trimmed(), 2));
    g.setAttribute('color', new BufferAttribute(this.col.trimmed(), 3));
    g.setIndex(new BufferAttribute(this.idx.trimmed(), 1));
    g.computeBoundingSphere();
    return g;
  }
}
