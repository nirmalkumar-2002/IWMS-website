import type { CityLamp } from '../handles';
import { FACE, rgb, shade, type RGB, type Rng } from './builder';
import { Chunk, PAL, face, fbox, fquad } from './kit';

type V3 = [number, number, number];

/** Local (lx, lz) → world for a yaw-rotated object (same convention as GeoBuilder.obox). */
const rot = (x: number, z: number, yaw: number, lx: number, lz: number): [number, number] => [
  x + lx * Math.cos(yaw) + lz * Math.sin(yaw),
  z - lx * Math.sin(yaw) + lz * Math.cos(yaw),
];

/** Catenary-ish sagging wire between two points, as line segments. */
export function wire(c: Chunk, a: V3, b: V3, sagPer40 = 0.7) {
  const span = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const sag = sagPer40 * (span / 40) * (span / 40) * 1.0 + 0.05;
  const n = 10;
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p: V3 = [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t - 4 * sag * t * (1 - t),
      a[2] + (b[2] - a[2]) * t,
    ];
    c.wires.push(prev[0], prev[1], prev[2], p[0], p[1], p[2]);
    prev = p;
  }
}

/**
 * PCC electric pole (tapered I-section read as a square taper) with two cross-arms.
 * Returns the three conductor attachment points (across the road direction = Z by default).
 */
export function pccPole(c: Chunk, x: number, z: number, h = 8.5, alongX = true): V3[] {
  const paint = c.g('paint');
  paint.tube([x, 0, z], [x, h, z], 0.15, 0.085, 4, PAL.pole, { flat: true, phase: Math.PI / 4, grime: 0.35 });
  const arms: [number, number][] = [
    [h - 0.3, 0.8],
    [h - 1.0, 0.55],
  ];
  const pts: V3[] = [];
  for (const [y, half] of arms) {
    if (alongX) paint.box(x - 0.05, y - 0.05, z - half, x + 0.05, y + 0.05, z + half, PAL.metalDark, { uv: 'flat' });
    else paint.box(x - half, y - 0.05, z - 0.05, x + half, y + 0.05, z + 0.05, PAL.metalDark, { uv: 'flat' });
  }
  const ins = rgb('#9a958c');
  const attach: [number, number, number][] = [
    [arms[0][0], -0.7, 0],
    [arms[0][0], 0.7, 0],
    [arms[1][0], -0.45, 0],
  ];
  for (const [y, off] of attach) {
    const px = alongX ? x : x + off;
    const pz = alongX ? z + off : z;
    paint.cylinder(px, pz, y + 0.05, y + 0.22, 0.05, 0.035, 8, ins, { cap: true });
    pts.push([px, y + 0.22, pz]);
  }
  return pts;
}

/** Same LED streetlight as Scene 01's World (9 m pole, 1.9 m arm toward the road). */
export function ledStreetlight(c: Chunk, x: number, z: number, dir: 1 | -1, lamps: CityLamp[]) {
  const paint = c.g('paint');
  const H = 9;
  paint.cylinder(x, z, 0, H, 0.11, 0.07, 10, PAL.metalDark, { grime: 0.2 });
  const armEnd = z + dir * 1.9;
  paint.box(x - 0.035, H - 0.085, Math.min(z, armEnd), x + 0.035, H - 0.015, Math.max(z, armEnd), PAL.metalDark, {
    uv: 'flat',
  });
  paint.box(x - 0.17, H - 0.17, armEnd - 0.36, x + 0.17, H - 0.11, armEnd + 0.36, rgb('#2b2d30'), { uv: 'flat' });
  c.g('glow').box(x - 0.15, H - 0.21, armEnd - 0.33, x + 0.15, H - 0.17, armEnd + 0.33, rgb('#ffe2c0', 2.4), {
    uv: 'flat',
    skip: 0,
  });
  lamps.push({ x, y: H - 0.3, z: armEnd, tx: x, tz: z + dir * 4.6, color: '#ffe2c0', candela: 230 });
}

/** Twin-arm 10 m median light. */
export function twinArmLight(c: Chunk, x: number, z: number, lamps: CityLamp[]) {
  const paint = c.g('paint');
  const H = 10;
  paint.cylinder(x, z, 0, H, 0.13, 0.08, 10, rgb('#6f747a'), { grime: 0.25 });
  for (const s of [-1, 1] as const) {
    const end: V3 = [x, H + 0.35, z + s * 2.1];
    paint.tube([x, H - 0.15, z], end, 0.045, 0.04, 6, rgb('#6f747a'));
    paint.box(x - 0.18, end[1] - 0.06, end[2] - 0.38, x + 0.18, end[1] + 0.02, end[2] + 0.38, rgb('#4a4e53'), {
      uv: 'flat',
    });
    c.g('glow').box(x - 0.15, end[1] - 0.1, end[2] - 0.34, x + 0.15, end[1] - 0.06, end[2] + 0.34, rgb('#f2ecdf', 2.6), {
      uv: 'flat',
      skip: 0,
    });
    lamps.push({ x, y: end[1] - 0.15, z: end[2], tx: x, tz: z + s * 4, color: '#f2ecdf', candela: 220 });
  }
}

/** Residential pole: PCC pole with a 7 m LED fitting on a short bracket. Returns wire points. */
export function residentialPole(
  c: Chunk,
  x: number,
  z: number,
  dirX: 1 | -1,
  lamps: CityLamp[],
): V3[] {
  const pts = pccPole(c, x, z, 8.5, false);
  const paint = c.g('paint');
  const end: V3 = [x + dirX * 1.3, 7.15, z];
  paint.tube([x, 6.9, z], end, 0.035, 0.03, 6, PAL.metalDark);
  paint.box(Math.min(end[0], end[0] + dirX * 0.55), 7.08, z - 0.13, Math.max(end[0], end[0] + dirX * 0.55), 7.18, z + 0.13, rgb('#3c4045'), {
    uv: 'flat',
  });
  const gx0 = Math.min(end[0] + dirX * 0.05, end[0] + dirX * 0.5);
  const gx1 = Math.max(end[0] + dirX * 0.05, end[0] + dirX * 0.5);
  c.g('glow').box(gx0, 7.04, z - 0.1, gx1, 7.08, z + 0.1, rgb('#eaf0ff', 2.4), { uv: 'flat', skip: 0 });
  lamps.push({ x: (gx0 + gx1) / 2, y: 6.95, z, tx: x + dirX * 4, tz: z, color: '#eaf0ff', candela: 190 });
  // Street-name-less junction box on the pole.
  paint.box(x - 0.15, 2.0, z - 0.12, x + 0.15, 2.5, z + 0.12, rgb('#59605a'), { uv: 'flat' });
  return pts;
}

/** Blank 12×6 m hoarding on lattice legs, rotated toward approaching traffic. */
export function hoarding(c: Chunk, x: number, z: number, yaw: number) {
  const paint = c.g('paint');
  const steel = rgb('#4e5257');
  const bottom = 6;
  for (const lx of [-3.6, 3.6]) {
    const chords: [number, number][] = [
      [lx - 0.3, -0.3],
      [lx + 0.3, -0.3],
      [lx + 0.3, 0.3],
      [lx - 0.3, 0.3],
    ];
    for (const [a, b] of chords) {
      const [wx, wz] = rot(x, z, yaw, a, b - 0.6);
      paint.tube([wx, 0, wz], [wx, bottom + 3, wz], 0.05, 0.05, 5, steel);
    }
    for (let y = 0.3; y < bottom; y += 1.2) {
      for (const [a0, b0, a1, b1] of [
        [lx - 0.3, -0.3, lx + 0.3, -0.3],
        [lx - 0.3, 0.3, lx + 0.3, 0.3],
        [lx - 0.3, -0.3, lx - 0.3, 0.3],
        [lx + 0.3, -0.3, lx + 0.3, 0.3],
      ]) {
        const [p0x, p0z] = rot(x, z, yaw, a0, b0 - 0.6);
        const [p1x, p1z] = rot(x, z, yaw, a1, b1 - 0.6);
        paint.tube([p0x, y, p0z], [p1x, y + 1.2, p1z], 0.025, 0.025, 4, steel);
      }
    }
  }
  // Board: weathered blank flex, dark steel back frame.
  paint.obox(x, bottom + 3, z, 6, 3, 0.08, yaw, rgb('#8c8981'), { uv: 'flat' });
  for (const y of [bottom + 0.4, bottom + 3, bottom + 5.6]) {
    const [bx, bz] = rot(x, z, yaw, 0, -0.35);
    paint.obox(bx, y, bz, 6, 0.06, 0.06, yaw, steel, { uv: 'flat' });
  }
  // Catwalk under the board.
  const [cx, cz] = rot(x, z, yaw, 0, 0.45);
  paint.obox(cx, bottom - 0.1, cz, 6.2, 0.04, 0.45, yaw, steel, { uv: 'flat', skip: 0 });
  // Two flood-light arms (unlit at this hour).
  for (const lx of [-3, 3]) {
    const [ax, az] = rot(x, z, yaw, lx, 1.4);
    paint.obox(ax, bottom - 0.05, az, 0.15, 0.1, 0.15, yaw, steel, { uv: 'flat' });
  }
}

/** Bus shelter: steel frame, sheet roof, back panel, bench. Faces -Z (toward the road). */
export function busShelter(c: Chunk, x: number, z: number) {
  const paint = c.g('paint');
  const steel = rgb('#5d646b');
  const hw = 4;
  const hd = 0.9;
  paint.box(x - hw - 0.1, 2.55, z - hd - 0.15, x + hw + 0.1, 2.65, z + hd + 0.05, rgb('#6d7278'), { skip: 0, uv: 'flat' });
  for (const px of [x - hw + 0.1, x, x + hw - 0.1])
    for (const pz of [z - hd + 0.1, z + hd - 0.1])
      paint.box(px - 0.05, 0, pz - 0.05, px + 0.05, 2.55, pz + 0.05, steel, { uv: 'flat' });
  paint.box(x - hw + 0.1, 0.45, z + hd - 0.12, x + hw - 0.1, 2.35, z + hd - 0.08, rgb('#47515b'), { uv: 'flat' });
  paint.box(x - hw + 0.4, 0.42, z + 0.1, x + hw - 0.4, 0.47, z + hd - 0.15, steel, { uv: 'flat' });
  // Concrete base slab.
  c.g('concrete').box(x - hw - 0.3, -0.02, z - hd - 0.2, x + hw + 0.3, 0.16, z + hd + 0.2, shade(PAL.concrete, 0.85));
  // Dim tube light under the roof.
  c.g('glow').box(x - 0.7, 2.49, z - 0.05, x + 0.7, 2.54, z + 0.05, rgb('#e2ecff', 1.1), { uv: 'flat', skip: 0 });
}

/** Distribution transformer on a two-pole structure. */
export function transformer(c: Chunk, x: number, z: number): V3[] {
  const paint = c.g('paint');
  const p1 = pccPole(c, x - 1.25, z, 9);
  pccPole(c, x + 1.25, z, 9);
  paint.box(x - 1.6, 3.2, z - 0.55, x + 1.6, 3.32, z + 0.55, PAL.metalDark, { skip: 0, uv: 'flat' });
  const body = rgb('#6a716d');
  paint.box(x - 0.6, 3.32, z - 0.45, x + 0.6, 4.75, z + 0.45, body, { uv: 'flat' });
  for (let i = 0; i < 6; i++) {
    const fx = x - 0.5 + i * 0.2;
    paint.box(fx - 0.02, 3.4, z + 0.45, fx + 0.02, 4.55, z + 0.7, shade(body, 0.85), { uv: 'flat' });
    paint.box(fx - 0.02, 3.4, z - 0.7, fx + 0.02, 4.55, z - 0.45, shade(body, 0.85), { uv: 'flat' });
  }
  for (let i = -1; i <= 1; i++) paint.cylinder(x + i * 0.35, z, 4.75, 5.15, 0.06, 0.04, 8, rgb('#8d6b4f'), { cap: true });
  // AB switch / fuse cross-arm.
  paint.box(x - 1.6, 7.0, z - 0.05, x + 1.6, 7.1, z + 0.05, PAL.metalDark, { uv: 'flat' });
  // Distribution box at the base.
  paint.box(x - 0.4, 0.5, z + 0.15, x + 0.4, 1.5, z + 0.5, rgb('#5d6463'), { uv: 'flat' });
  return p1;
}

/** 3-aspect traffic signal; lenses face direction (fx, fz). `state` picks the lit aspect. */
export function trafficSignal(c: Chunk, x: number, z: number, fx: number, fz: number, state: 'red' | 'amber' | 'none') {
  const paint = c.g('paint');
  const H = 4.0;
  paint.cylinder(x, z, 0, H, 0.08, 0.07, 10, rgb('#55595e'), { grime: 0.3 });
  const f = face(x + fx * 0.15, z + fz * 0.15, fx, fz);
  fbox(paint, f, -0.18, 0.18, H - 1.0, H + 0.05, -0.3, 0, rgb('#1f2124'), { uv: 'flat' });
  const aspects: [number, string, number][] = [
    [H - 0.18, '#ff3a26', state === 'red' ? 1.3 : 0.05],
    [H - 0.5, '#ffa21f', state === 'amber' ? 1.1 : 0.05],
    [H - 0.82, '#2fd38a', 0.04],
  ];
  for (const [y, col, k] of aspects) {
    fquad(c.g('glow'), f, 0, y, 0.01, 0.1, 0.1, rgb(col, k), 'flat');
    // Visor.
    fbox(paint, f, -0.14, 0.14, y + 0.12, y + 0.14, 0, 0.22, rgb('#1f2124'), { uv: 'flat', skip: 0 });
  }
}

/** Broken compound-wall run on a vacant plot (some courses collapsed, some gaps). */
export function brokenWall(c: Chunk, x0: number, x1: number, z: number, r: Rng, color: RGB) {
  const pl = c.g('plaster');
  let x = x0;
  while (x < x1) {
    const seg = Math.min(x1 - x, r.range(2, 6));
    if (r() > 0.15) {
      const h = r() < 0.25 ? r.range(0.5, 1.2) : 1.5;
      pl.box(x, 0, z - 0.1, x + seg, h, z + 0.1, shade(color, r.range(0.8, 1)), { grime: 0.45, stain: 0.15 });
      if (h === 1.5) pl.box(x - 0.15, 0, z - 0.17, x + 0.15, 1.6, z + 0.17, shade(color, 0.9), { grime: 0.45 });
    } else if (r() < 0.6) {
      // Rubble from a collapsed section.
      c.g('concrete').cylinder(x + seg / 2, z + r.range(-0.4, 0.4), -0.05, 0.35, r.range(0.6, 1.0), 0.15, 10, shade(PAL.concrete, 0.6));
    }
    x += seg;
  }
}

/** Lean-to tin-roof shed facing the road (normal -Z if side > 0). */
export function tinShed(c: Chunk, x0: number, x1: number, zFront: number, depth: number, r: Rng) {
  const toward = -1; // sheds sit on +Z and face the road
  const zBack = zFront + depth;
  const pl = c.g('plaster');
  const wall = shade(r() < 0.5 ? PAL.brick : rgb('#9a958a'), r.range(0.8, 1));
  const hf = 4.3;
  const hb = 3.7;
  pl.box(x0, 0, zBack - 0.2, x1, hb, zBack, wall, { grime: 0.35 });
  pl.box(x0, 0, zFront, x0 + 0.2, hb, zBack, wall, { grime: 0.35 });
  pl.box(x1 - 0.2, 0, zFront, x1, hb, zBack, wall, { grime: 0.35 });
  // Front: shutters between brick piers.
  const paint = c.g('paint');
  const n = Math.max(1, Math.round((x1 - x0) / 4));
  const sw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * sw;
    pl.box(a, 0, zFront, a + 0.3, hf - 0.1, zFront + 0.3, wall, { grime: 0.35 });
    if (r() < 0.12) {
      c.g('glow').quad([a + sw / 2, 1.5, zFront + 0.3], [0, 0, toward], [0, 1, 0], sw / 2 - 0.4, 1.5, rgb('#ffb36b', 0.45), [0.42, 0.1, 0.58, 0.9]);
    } else {
      paint.box(a + 0.3, 0, zFront + 0.25, a + sw, 3.3, zFront + 0.3, shade(PAL.shutters[0][0], r.range(0.65, 0.95)));
    }
  }
  pl.box(x0, 3.3, zFront, x1, hf - 0.1, zFront + 0.3, wall, {});
  // Sloping corrugated sheet roof (front high), double-sided.
  const ov = 0.6;
  const roofCol = shade(r() < 0.5 ? rgb('#7c8086') : rgb('#6e5f52'), r.range(0.8, 1));
  const a: V3 = [x0 - 0.2, hf, zFront - ov];
  const b: V3 = [x1 + 0.2, hf, zFront - ov];
  const cBack: V3 = [x1 + 0.2, hb - 0.05, zBack + 0.3];
  const d: V3 = [x0 - 0.2, hb - 0.05, zBack + 0.3];
  paint.ribbon([a, d], [b, cBack], roofCol, (p) => [p[0] / 1, p[2] / 0.4], [0, 1, 0]);
  paint.ribbon([a, d], [b, cBack], shade(roofCol, 0.6), (p) => [p[0] / 1, p[2] / 0.4], [0, -1, 0]);
}

/** G+3 RCC frame under construction, with brick infill, rebar stubs and green shade net. */
export function constructionSite(c: Chunk, x0: number, x1: number, zNear: number, zFar: number, r: Rng) {
  const con = c.g('concrete');
  const fresh = rgb('#9a978f');
  const floors = 4;
  const fh = 3.2;
  const xs: number[] = [];
  for (let x = x0; x <= x1 + 0.01; x += 4) xs.push(x);
  const zs = [zNear, (zNear + zFar) / 2, zFar];
  const top = floors * fh;
  for (const x of xs)
    for (const z of zs) {
      con.box(x - 0.15, 0, z - 0.225, x + 0.15, top, z + 0.225, shade(fresh, r.range(0.85, 1)), { grime: 0.2 });
      // Rebar stubs for the next floor.
      const paint = c.g('paint');
      for (const [dx, dz] of [
        [-0.1, -0.17],
        [0.1, -0.17],
        [-0.1, 0.17],
        [0.1, 0.17],
      ])
        paint.box(x + dx - 0.012, top, z + dz - 0.012, x + dx + 0.012, top + r.range(0.7, 1.1), z + dz + 0.012, rgb('#4a3a30'), {
          uv: 'flat',
        });
    }
  const zMin = Math.min(zNear, zFar);
  const zMax = Math.max(zNear, zFar);
  for (let f = 1; f <= floors; f++) {
    const y = f * fh;
    con.box(x0 - 0.4, y - 0.15, zMin - 0.4, x1 + 0.4, y, zMax + 0.4, fresh, { skip: 0 });
    for (const z of zs) con.box(x0, y - 0.6, z - 0.15, x1, y - 0.15, z + 0.15, shade(fresh, 0.9), { skip: FACE.PY });
    for (const x of xs) con.box(x - 0.15, y - 0.6, zMin, x + 0.15, y - 0.15, zMax, shade(fresh, 0.9), { skip: FACE.PY });
    // Formwork props (ballies) under the newest slab.
    if (f === floors)
      for (let i = 0; i < 18; i++) {
        const px = r.range(x0 + 0.5, x1 - 0.5);
        const pz = r.range(zMin + 0.5, zMax - 0.5);
        c.g('paint').cylinder(px, pz, y - fh, y - 0.15, 0.05, 0.04, 5, rgb('#5f5143'));
      }
  }
  // Brick infill on the ground floor (back and sides), half-height on the front.
  const pl = c.g('plaster');
  pl.box(x0, 0, zMin - 0.11, x1, fh - 0.6, zMin + 0.11, PAL.brick, { grime: 0.3 });
  pl.box(x0 - 0.11, 0, zMin, x0 + 0.11, fh - 0.6, zMax, PAL.brick, { grime: 0.3 });
  pl.box(x1 - 0.11, 0, zMin, x1 + 0.11, fh - 0.6, zMax, PAL.brick, { grime: 0.3 });
  pl.box(x0, 0, zMax - 0.11, x0 + (x1 - x0) * 0.55, 1.2, zMax + 0.11, PAL.brick, { grime: 0.3 });
  // Green shade net hung on the approach-facing end over two floors, sagging short of the corners.
  c.g('paint').box(x0 - 0.5, fh * 1.5 + 0.1, zMin + 0.6, x0 - 0.46, fh * 3.5 - 0.3, zMax - 0.6, rgb('#34503f'), {
    uv: 'flat',
    skip: 0,
  });
  // Sand and aggregate heaps, brick stack.
  c.g('concrete').cylinder(x1 + 3, zMax - 2, -0.05, 1.1, 2.2, 0.2, 14, rgb('#857560'));
  c.g('concrete').cylinder(x1 + 3.5, zMin + 2, -0.05, 0.8, 1.6, 0.15, 14, rgb('#6f6c66'));
  pl.box(x0 + 6, 0, zMax + 0.6, x0 + 8.5, 1.0, zMax + 1.8, PAL.brick);
}

/** Tin-sheet site barricade along X at z, with a gate gap. */
export function barricade(c: Chunk, x0: number, x1: number, z: number, gap: [number, number]) {
  const paint = c.g('paint');
  const col = rgb('#50606e');
  for (const [a, b] of [
    [x0, gap[0]],
    [gap[1], x1],
  ]) {
    if (b <= a) continue;
    paint.box(a, 0, z - 0.03, b, 2.4, z + 0.03, col, { grime: 0.3 });
    for (let x = a; x <= b; x += 3) paint.box(x - 0.04, 0, z - 0.08, x + 0.04, 2.5, z + 0.08, PAL.metalDark, { uv: 'flat' });
  }
}
