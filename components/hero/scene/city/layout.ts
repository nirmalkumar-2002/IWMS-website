import type { CityLamp } from '../handles';
import { RESIDENTIAL, TURN_START_X, samplePath, type PathSample } from '../route';
import { TRUCK_LANE_Z } from '../rig';
import { FACE, GeoBuilder, mix, rgb, rng, shade, type RGB, type Rng } from './builder';
import {
  Chunk,
  PAL,
  building,
  compoundWall,
  face,
  neem,
  palm,
  plasterColor,
  shrub,
  type BuildingSpec,
  type Kind,
} from './kit';
import {
  barricade,
  brokenWall,
  busShelter,
  constructionSite,
  hoarding,
  ledStreetlight,
  pccPole,
  residentialPole,
  tinShed,
  trafficSignal,
  transformer,
  twinArmLight,
  wire,
} from './props';

type V3 = [number, number, number];

/** Scene 01 road geometry (World.tsx): matched exactly so the extension is seamless. */
const ROAD = { from: -320, halfW: 3.5, kerb: 0.15, kerbW: 0.18, walk: 2.6, tile: 3.2 };
const WALK_IN = ROAD.halfW + ROAD.kerbW;
const WALK_OUT = WALK_IN + ROAD.walk;
/** Scene 01 streetlights (World.tsx), which the city also registers for the pooled lights. */
const WORLD_POSTS = { z: -5.45, spacing: 32, from: -160, to: 224, armLen: 1.9, height: 9 };

const ROAD_START = 320;
const ROAD_END = 900;
const AX = RESIDENTIAL.axisX;
const RES_HALF = RESIDENTIAL.width / 2;
const RES_END = RESIDENTIAL.startZ + RESIDENTIAL.length;
const CORNER_R = 5;
// Left-hand traffic: the median sits on the truck's right, the +Z side of the centre line.
const MEDIAN = { z0: 0, z1: 1.2, h: 0.3 };

export interface CityLayout {
  chunks: Chunk[];
  lamps: CityLamp[];
  /** Residential compound-wall gates (street face), recorded while building zone D. */
  gates: StreetGate[];
}

/** A household gate on the residential street: centre of its 3 m opening on the wall face. */
export interface StreetGate {
  x: number;
  z: number;
  /** +1 = east (+X, the truck's kerbside under left-hand traffic), −1 = west. */
  side: 1 | -1;
  plot: number;
  /** The plot's street frontage (compound wall) along z. */
  from: number;
  to: number;
}

/** Distance from (x, z) to the truck's route (main road then residential street). */
function routeDistance(x: number, z: number) {
  const main = x <= AX ? Math.abs(z - TRUCK_LANE_Z) : Math.hypot(x - AX, z - TRUCK_LANE_Z);
  const res = z >= 0 && z <= RES_END ? Math.abs(x - AX) : Math.hypot(x - AX, z - Math.min(Math.max(z, 0), RES_END));
  return Math.min(main, res);
}

const asphaltUV = (p: V3): [number, number] => [
  (p[0] - ROAD.from) / ROAD.tile,
  (ROAD.halfW - p[2]) / ROAD.tile,
];

/**
 * Inner-corner kerb line of the right turn: the rear-axle path offset to the truck's right.
 * From the left lane the far (+Z) kerb starts 5.25 m to the right (lane −1.75 → kerb +3.5) and
 * the street's carriageway edge ends 4.5 m to the right (truck at axis + 1.5 → edge axis − 3).
 */
function innerCurve(extra: number): V3[] {
  const s = {} as PathSample;
  const pts: V3[] = [];
  for (let d = TURN_START_X; d < TURN_START_X + 80; d += 1) {
    samplePath(d, s);
    const offset = ROAD.halfW - TRUCK_LANE_Z - 0.75 * (s.yaw / (Math.PI / 2)) + extra;
    pts.push([s.x - Math.sin(s.yaw) * offset, 0, s.z + Math.cos(s.yaw) * offset]);
    if (s.yaw >= Math.PI / 2 - 1e-4) break;
  }
  return pts;
}

/** Offset a polyline in XZ by `d` to its right-hand side (relative to travel direction). */
function offsetLine(pts: V3[], d: number, y: number): V3[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const l = Math.hypot(dx, dz) || 1;
    return [p[0] - (dz / l) * d, y, p[2] + (dx / l) * d];
  });
}
const lift = (pts: V3[], y: number): V3[] => pts.map((p) => [p[0], y, p[2]]);

/** Kerb (concrete, 0.15 high) + paver footpath along a polyline, footpath on the right side. */
function kerbAndWalk(road: Chunk, line: V3[], kerbColor: RGB, walkColor: RGB) {
  const con = road.g('concrete');
  const kTop0 = lift(line, ROAD.kerb);
  const kTop1 = lift(offsetLine(line, ROAD.kerbW, 0), ROAD.kerb);
  con.ribbon(lift(line, 0), kTop0, kerbColor, undefined, undefined);
  con.ribbon(kTop0, kTop1, kerbColor, undefined, [0, 1, 0]);
  const walkOut = lift(offsetLine(line, ROAD.kerbW + ROAD.walk, 0), ROAD.kerb);
  road.g('pavers').ribbon(kTop1, walkOut, walkColor, undefined, [0, 1, 0]);
  con.ribbon(walkOut, lift(walkOut, -0.02), shade(kerbColor, 0.8));
}

/** Asphalt triangle wound to face up, UVs continuing the main road's tiling. */
function triUp(g: GeoBuilder, a: V3, b: V3, c: V3) {
  const cy = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
  const [p, q] = cy > 0 ? [b, c] : [c, b];
  g.tri(a, p, q, [0, 1, 0], rgb('#ffffff'), [asphaltUV(a), asphaltUV(p), asphaltUV(q)]);
}

/* ------------------------------------------------------------------------------------------ */

function buildRoads(road: Chunk, r: Rng, lamps: CityLamp[], medium: boolean) {
  const asp = road.g('asphalt');
  const con = road.g('concrete');
  const mark = road.g('marking');
  const kerbCol = PAL.kerb;
  const walkCol = rgb('#8d8780');
  const paint = rgb('#b9b39c');
  const up: V3 = [0, 1, 0];

  // Carriageway continuation (UVs continue World's tiling from x = -320).
  asp.ribbon(
    [
      [ROAD_START, 0, -ROAD.halfW],
      [ROAD_END, 0, -ROAD.halfW],
    ],
    [
      [ROAD_START, 0, ROAD.halfW],
      [ROAD_END, 0, ROAD.halfW],
    ],
    rgb('#ffffff'),
    asphaltUV,
    up,
  );

  // Inner-corner fillet: asphalt fan from the mouth corner to the swept-path kerb.
  const curve = innerCurve(0);
  const corner: V3 = [AX - RES_HALF, 0, ROAD.halfW];
  for (let i = 0; i < curve.length - 1; i++) {
    triUp(asp, corner, curve[i + 1], curve[i]);
  }
  const curveEnd = curve[curve.length - 1];
  // Close the sliver between the curve end and the residential carriageway edge.
  triUp(asp, corner, [AX - RES_HALF, 0, curveEnd[2]], curveEnd);
  // Right-hand corner: small-radius fillet.
  const rc: V3 = [AX + RES_HALF + CORNER_R, 0, ROAD.halfW + CORNER_R];
  const arc: V3[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = Math.PI + (i / 10) * (Math.PI / 2);
    arc.push([rc[0] + Math.cos(t) * CORNER_R, 0, rc[2] + Math.sin(t) * CORNER_R]);
  }
  const rCorner: V3 = [AX + RES_HALF, 0, ROAD.halfW];
  for (let i = 0; i < arc.length - 1; i++)
    triUp(asp, rCorner, arc[i], arc[i + 1]);

  // Kerbs + footpaths. -Z side: continuous. Lines are ordered so the footpath is on the right.
  kerbAndWalk(road, [
    [ROAD_END, 0, -ROAD.halfW],
    [ROAD_START, 0, -ROAD.halfW],
  ], kerbCol, walkCol);
  // +Z side: up to the turn, around the inner corner curve, then beyond the junction.
  const plusZ: V3[] = [[ROAD_START, 0, ROAD.halfW], ...curve];
  kerbAndWalk(road, plusZ, kerbCol, walkCol);
  kerbAndWalk(road, [...arc, [ROAD_END, 0, ROAD.halfW]], kerbCol, walkCol);

  // Painted kerb (black/yellow) on the approach to the junction.
  const yellow = rgb('#a8913f');
  const black = rgb('#262626');
  for (let x = 520, i = 0; x < TURN_START_X; x += 1, i++)
    // On the truck's (−Z, left) kerb.
    road.g('paint').box(x, 0, -ROAD.halfW - ROAD.kerbW - 0.005, x + 1, ROAD.kerb + 0.005, -ROAD.halfW + 0.005, i % 2 ? yellow : black, {
      uv: 'flat',
      skip: FACE.NY | FACE.NZ,
    });

  // Residential carriageway (concrete, joints every 4.5 m) + drain-cover verges.
  const resCol = rgb('#a19d95');
  con.box(AX - RES_HALF, -0.03, ROAD.halfW, AX + RES_HALF, 0.0, RES_END + 1, resCol, { skip: FACE.NY });
  for (let z = ROAD.halfW + 4.5; z < RES_END + 1; z += 4.5)
    mark.quad([AX, 0.002, z], [0, 1, 0], [0, 0, -1], RES_HALF, 0.02, rgb('#3e3c39'));
  mark.quad([AX, 0.002, (ROAD.halfW + RES_END + 1) / 2], [0, 1, 0], [0, 0, -1], 0.02, (RES_END + 1 - ROAD.halfW) / 2, rgb('#4a4844'));
  // Cross lane closing the street.
  con.box(AX - 45, -0.03, RES_END + 1, AX + 45, 0.0, RES_END + 7, shade(resCol, 0.95), { skip: FACE.NY });
  for (let x = AX - 45 + 4.5; x < AX + 45; x += 4.5)
    mark.quad([x, 0.002, RES_END + 4], [0, 1, 0], [0, 0, -1], 0.02, 3, rgb('#3e3c39'));
  // Verges: precast drain covers between carriageway and compound walls.
  const coverCol = shade(PAL.concrete, 0.85);
  for (const side of [-1, 1]) {
    const z0 = side < 0 ? curveEnd[2] : ROAD.halfW + CORNER_R;
    for (let z = z0; z < RES_END + 1 - 0.9; z += 1.0) {
      const x0 = side < 0 ? AX - RES_HALF - 1.0 : AX + RES_HALF;
      con.box(x0 + 0.02, -0.02, z + 0.02, x0 + 0.98, 0.07, z + 0.98, shade(coverCol, r.range(0.85, 1.05)), {});
    }
  }

  // Markings: centre dashes continue World's 9 m rhythm up to the median.
  for (let i = Math.ceil((ROAD_START - 1.5 - ROAD.from) / 9); ; i++) {
    const x = ROAD.from + i * 9;
    if (x > 486) break;
    mark.quad([x, 0.004, 0], [0, 1, 0], [0, 0, -1], 1.5, 0.06, paint);
  }
  // Edge lines.
  const edge = (x0: number, x1: number, z: number) =>
    mark.quad([(x0 + x1) / 2, 0.004, z], [0, 1, 0], [0, 0, -1], (x1 - x0) / 2, 0.075, paint);
  edge(ROAD_START, ROAD_END, -(ROAD.halfW - 0.25));
  edge(ROAD_START, TURN_START_X - 2, ROAD.halfW - 0.25);
  edge(AX + RES_HALF + CORNER_R + 1, ROAD_END, ROAD.halfW - 0.25);
  // Zebra crossing and stop line before the junction.
  for (let z = -3.0; z <= 3.01; z += 1.0) mark.quad([551.5, 0.004, z], [0, 1, 0], [0, 0, -1], 1.5, 0.25, rgb('#bdb8a6'));
  mark.quad([548.6, 0.004, -1.6], [0, 1, 0], [0, 0, -1], 0.15, 1.6, paint);
  // Speed breaker: smooth hump with black/yellow bands.
  for (let i = 0, z = -ROAD.halfW; z < ROAD.halfW - 0.01; z += 0.7, i++) {
    const left: V3[] = [];
    const right: V3[] = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      const x = 538.4 + 3.2 * t;
      const y = 0.055 * Math.sin(Math.PI * t) ** 1.5 + 0.003;
      left.push([x, y, z]);
      right.push([x, y, z + 0.7]);
    }
    mark.ribbon(left, right, i % 2 ? rgb('#a8913f') : rgb('#2a2a2a'), undefined, [0, 1, 0]);
  }

  // Median with painted kerbs and twin-arm lights (gap at the junction).
  const medianRuns: [number, number][] = [
    // First run ends at x 550 so the right turn clears the median nose (≈0.5 m).
    [490, 550],
    [AX + RES_HALF + CORNER_R + 4, ROAD_END],
  ];
  for (const [x0, x1] of medianRuns) {
    for (let x = x0, i = 0; x < x1; x += 1, i++) {
      const col = i % 2 ? rgb('#bdb9ad') : rgb('#2b2b2b');
      road.g('paint').box(x, 0, MEDIAN.z0, Math.min(x1, x + 1), MEDIAN.h, MEDIAN.z1, col, {
        uv: 'flat',
        skip: FACE.NY | FACE.PY,
      });
    }
    con.box(x0 + 0.02, MEDIAN.h - 0.04, MEDIAN.z0 + 0.15, x1 - 0.02, MEDIAN.h + 0.02, MEDIAN.z1 - 0.15, rgb('#3a3a32'), {
      skip: FACE.NY,
    });
    for (const xe of [x0, x1])
      road.g('paint').box(xe - 0.01, 0, MEDIAN.z0, xe + 0.01, MEDIAN.h, MEDIAN.z1, rgb('#bdb9ad'), { uv: 'flat' });
    const lampsFrom = x0 + 10;
    for (let x = lampsFrom; x < Math.min(x1, 800); x += 30) {
      if (medium && x > 700) break;
      twinArmLight(road, x, (MEDIAN.z0 + MEDIAN.z1) / 2, lamps);
    }
    for (let x = x0 + 3; x < x1 - 2; x += r.range(4, 7)) shrub(road, x, (MEDIAN.z0 + MEDIAN.z1) / 2, r, r.range(0.5, 0.9));
  }

  // LED streetlights continue on -Z beyond Scene 01's last post, until the median takes over.
  for (let x = WORLD_POSTS.to + WORLD_POSTS.spacing; x <= 480; x += WORLD_POSTS.spacing)
    ledStreetlight(road, x, WORLD_POSTS.z, 1, lamps);

  // Traffic signals at the junction corners (outside the inner corner the camera swings through).
  trafficSignal(road, AX + RES_HALF + 3, -ROAD.halfW - 0.8, -1, 0, 'red');
  trafficSignal(road, AX + RES_HALF + CORNER_R + 3, ROAD.halfW + 0.9, -1, 0, 'amber');
  trafficSignal(road, AX - RES_HALF - 8, -ROAD.halfW - 0.8, 1, 0, 'red');

  // Ground beyond Scene 01's ground plane (which ends at x = 800).
  road.g('ground').quad([1300, -0.02, 0], [0, 1, 0], [0, 0, -1], 500, 800, rgb('#090c0b'));
}

/* ------------------------------------------------------------------------------------------ */

/** Row of buildings along the main road; n = +1 for the -Z side (facing +Z), -1 for +Z side. */
function roadRow(
  c: Chunk,
  r: Rng,
  x0: number,
  x1: number,
  frontZ: number,
  n: 1 | -1,
  o: {
    widths: [number, number];
    depth: [number, number];
    gaps: [number, number];
    fill: number;
    floors: [number, number];
    kind: Kind;
    lit: number;
    forecourt?: boolean;
    vacantWall?: boolean;
  },
) {
  const lots: { x0: number; x1: number; built: boolean }[] = [];
  let x = x0;
  while (x < x1 - o.widths[0]) {
    const w = Math.min(r.range(o.widths[0], o.widths[1]), x1 - x);
    lots.push({ x0: x, x1: x + w, built: r() < o.fill });
    x += w + r.range(o.gaps[0], o.gaps[1]);
  }
  lots.forEach((lot, i) => {
    const w = lot.x1 - lot.x0;
    if (!lot.built) {
      if (o.vacantWall !== false) brokenWall(c, lot.x0, lot.x1, frontZ - n * 0.3, r, mix(PAL.concrete, rgb('#a8aaa5'), 0.4));
      for (let k = 0; k < 2; k++) shrub(c, r.range(lot.x0 + 1, lot.x1 - 1), frontZ - n * r.range(2, 8), r, r.range(0.6, 1.1));
      return;
    }
    const prev = lots[i - 1];
    const next = lots[i + 1];
    const gapBefore = !prev || !prev.built || lot.x0 - prev.x1 > 0.8;
    const gapAfter = !next || !next.built || next.x0 - lot.x1 > 0.8;
    // For n = +1 the face's left is -X; for n = -1 it's +X.
    const exposed: [boolean, boolean] = n > 0 ? [gapBefore, gapAfter] : [gapAfter, gapBefore];
    const spec: BuildingSpec = {
      x: (lot.x0 + lot.x1) / 2,
      z: frontZ,
      nx: 0,
      nz: n,
      width: w,
      depth: r.range(o.depth[0], o.depth[1]),
      floors: r.int(o.floors[0], o.floors[1]),
      kind: o.kind,
      lit: o.lit,
      exposed,
      detail: 'full',
    };
    building(c, r, spec);
    if (o.forecourt) {
      const zA = n > 0 ? -WALK_OUT : WALK_OUT;
      c.g('concrete').box(lot.x0 - 0.5, -0.02, Math.min(zA, frontZ), lot.x1 + 0.5, 0.06, Math.max(zA, frontZ), shade(PAL.concrete, r.range(0.55, 0.7)), {
        skip: FACE.NY,
      });
    }
  });
}

/* Zone A: outer roadway (x 40–220) ----------------------------------------------------------- */
function zoneA(c: Chunk, r: Rng) {
  // PCC poles with three sagging conductors (continuing on into zone B to the transformer).
  let prev: V3[] | null = null;
  for (let x = 40; x <= 400; x += 40) {
    const pts = pccPole(c, x, -7.5);
    if (prev) for (let i = 0; i < 3; i++) wire(c, prev[i], pts[i], 0.7);
    prev = pts;
  }
  // Vacant plots: broken compound-wall runs set back from the road, with plot-boundary returns.
  let x = 44;
  while (x < 215) {
    const len = r.range(10, 25);
    if (r() < 0.45) {
      const z = r.range(10, 19);
      const col = mix(rgb('#a8aaa5'), PAL.concrete, r());
      brokenWall(c, x, Math.min(215, x + len), z, r, col);
      if (r() < 0.5) {
        const rx = r() < 0.5 ? x : Math.min(215, x + len);
        c.g('plaster').box(rx - 0.1, 0, z + 0.1, rx + 0.1, 1.5, z + r.range(5, 10), shade(col, 0.9), { grime: 0.45 });
      }
      for (let k = 0; k < 3; k++) shrub(c, r.range(x, x + len), z + r.range(1, 8), r, r.range(0.6, 1.2));
    }
    x += len + r.range(4, 14);
  }
  hoarding(c, 120, 24, Math.PI + (25 * Math.PI) / 180);
  hoarding(c, 190, -24, -(25 * Math.PI) / 180);
}

/* Zone B: developing roadside (x 220–420) ---------------------------------------------------- */
function zoneB(c: Chunk, r: Rng, lamps: CityLamp[]) {
  barricade(c, 231, 279, -7.2, [246, 252]);
  constructionSite(c, 235, 275, -9.6, -18.6, r);
  // Tin-roof sheds (G+0, 4.3 m) on +Z.
  for (const [a, b] of [
    [230, 242],
    [245, 258],
    [262, 274],
    [279, 293],
    [297, 310],
  ])
    tinShed(c, a, b, 9 + r.range(0, 1.5), r.range(6, 7.5), r);
  // Mixed-use G+2–G+3 frontage.
  roadRow(c, r, 322, 420, -9.5, 1, {
    widths: [6, 12],
    depth: [12, 15],
    gaps: [0, 4],
    fill: 0.75,
    floors: [2, 3],
    kind: 'shop',
    lit: 0.06,
    forecourt: true,
  });
  roadRow(c, r, 322, 375, 9.5, -1, {
    widths: [6, 12],
    depth: [9, 10],
    gaps: [0, 4],
    fill: 0.75,
    floors: [2, 2],
    kind: 'shop',
    lit: 0.08,
    forecourt: true,
  });
  busShelter(c, 360, 7.2);
  const t = transformer(c, 405, -8);
  void t;
  void lamps;
}

/* Zone C: city entrance (x 420–560, plus the main road beyond the junction) ----------------- */
function zoneC(c: Chunk, r: Rng, medium: boolean) {
  // Apartments behind a compound wall.
  const wallFace = face(420, -7.5, 0, 1);
  let x = 422;
  const gates: [number, number][] = [];
  while (x < 556) {
    const w = r.range(18, 24);
    if (x + w > 560) break;
    building(c, r, {
      x: x + w / 2,
      z: -12,
      nx: 0,
      nz: 1,
      width: w,
      depth: 16,
      floors: r.int(4, 7),
      kind: 'apartment',
      lit: x < 470 ? 0.07 : 0.13,
      exposed: [true, true],
      detail: 'full',
    });
    const g0 = x + w / 2 - 3 - 420;
    gates.push([g0, g0 + 6]);
    // Trees between the wall and the block.
    if (r() < 0.7) neem(c, x + r.range(1, 3), -9.6, r, 0.7);
    c.g('pavers').box(x - 1, -0.02, -12, x + w + 1, 0.04, -7.7, rgb('#6e6a64'), { skip: FACE.NY });
    x += w + r.range(6, 10);
  }
  compoundWall(c, wallFace, 140, { height: 1.8, grille: 0.3, color: rgb('#b9b2a2'), gates, gateColor: rgb('#2f3a35') }, r);

  // Taller towers further back.
  for (const [x0, w] of [
    [482, 30],
    [522, 34],
  ]) {
    building(c, r, {
      x: x0 + w / 2,
      z: -30 - r.range(0, 6),
      nx: 0,
      nz: 1,
      width: w,
      depth: 18,
      floors: r.int(8, 10),
      kind: 'tower',
      lit: 0.13,
      exposed: [true, true],
      detail: 'full',
    });
  }
  // Mixed-use on +Z, kept clear of the junction's inner corner.
  building(c, r, {
    x: 507.5,
    z: 13.5,
    nx: 0,
    nz: -1,
    width: 24,
    depth: 12,
    floors: r.int(3, 4),
    kind: 'shop',
    lit: 0.13,
    exposed: [true, true],
    detail: 'full',
  });
  c.g('concrete').box(495, -0.02, WALK_OUT, 520, 0.06, 13.5, shade(PAL.concrete, 0.6), { skip: FACE.NY });

  // +Z between x 380 and 495: open ground (camera side-track corridor) with a low wall and
  // buildings set far back.
  for (let k = 0; k < 10; k++) shrub(c, r.range(384, 488), r.range(12, 20), r, r.range(0.4, 0.75));
  roadRow(c, r, 380, 492, 26, -1, {
    widths: [8, 12],
    depth: [10, 12],
    gaps: [0, 3],
    fill: 0.8,
    floors: [1, 3],
    kind: 'house',
    lit: 0.1,
    vacantWall: false,
  });

  // Beyond the junction: mixed-use on both sides of the main road.
  roadRow(c, r, 566, medium ? 680 : 705, -9.5, 1, {
    widths: [8, 14],
    depth: [12, 15],
    gaps: [0, 3],
    fill: 0.85,
    floors: [2, 4],
    kind: 'shop',
    lit: 0.13,
    forecourt: true,
  });
  roadRow(c, r, AX + 20, medium ? 680 : 705, 9.5, -1, {
    widths: [8, 14],
    depth: [12, 14],
    gaps: [0, 3],
    fill: 0.85,
    floors: [2, 3],
    kind: 'shop',
    lit: 0.13,
    forecourt: true,
  });
}

/* Zone D: residential street ---------------------------------------------------------------- */
function zoneD(c: Chunk, r: Rng, lamps: CityLamp[], gates: StreetGate[]) {
  const sides: { sign: -1 | 1; z0: number }[] = [
    { sign: -1, z0: 40 },
    { sign: 1, z0: ROAD.halfW + CORNER_R + 1 },
  ];
  for (const { sign, z0 } of sides) {
    // Walls: the face looks at the street (normal toward the axis).
    const wallX = AX + sign * 4.0;
    const nx = -sign;
    let z = z0;
    let plot = 0;
    while (z < RES_END - 4) {
      const w = Math.min(r.range(9, 12), RES_END - z);
      // The arrival camera rides close to the left wall: keep that side's facades further back.
      const front = sign * (sign < 0 ? r.range(7.0, 7.5) : r.range(6.2, 7.5));
      const fx = AX + front;
      const shrink = r.range(0, 1.0);
      const houseW = w - shrink;
      building(c, r, {
        x: fx,
        z: z + w / 2,
        nx,
        nz: 0,
        width: houseW,
        depth: 12,
        floors: r.int(1, 2),
        kind: 'house',
        lit: 0.18,
        exposed: [shrink > 0.5 || plot === 0, shrink > 0.5 || z + w >= RES_END - 4],
        detail: 'full',
      });
      // Compound wall with a 3 m gate (face origin is the plot's left end as seen from the street).
      const wallColor = r() < 0.5 ? plasterColor(r) : mix(plasterColor(r), PAL.concrete, 0.4);
      const f = sign < 0 ? face(wallX, z + w, 1, 0) : face(wallX, z, -1, 0);
      const g0 = r.range(0.8, w - 4);
      // Record the gate centre (no extra RNG draws, so the generated street is unchanged).
      gates.push({
        x: wallX,
        z: sign > 0 ? z + g0 + 1.5 : z + w - g0 - 1.5,
        side: sign,
        plot,
        from: z,
        to: z + w,
      });
      compoundWall(c, f, w, {
        height: 1.8,
        grille: 0.3,
        color: wallColor,
        gates: [[g0, g0 + 3]],
        gateColor: shade(r.pick([rgb('#2f3336'), rgb('#3a4a3e'), rgb('#4a2c2a'), rgb('#3c4656')]), 1),
      }, r);
      // Side boundary wall between plots, and paved yard.
      c.g('plaster').box(Math.min(wallX, fx) , 0, z - 0.1, Math.max(wallX, fx), 1.8, z + 0.1, shade(wallColor, 0.9), { grime: 0.3 });
      c.g('pavers').box(Math.min(wallX, fx), -0.02, z + 0.1, Math.max(wallX, fx), 0.03, z + w - 0.1, rgb('#7a7570'), { skip: FACE.NY });
      // Coconut palms / neem inside the walls (1 per 2 plots); palms only on the camera side.
      if (plot % 2 === (sign < 0 ? 0 : 1) && (sign > 0 || z > 70)) {
        const tz = z + r.range(1, w - 1);
        const tx = AX + sign * (sign < 0 ? r.range(6.0, 6.4) : r.range(4.8, 5.4));
        if (sign < 0 || r() < 0.55) palm(c, tx, tz, r, [sign * r.range(0.2, 0.9), r.range(-0.5, 0.5)]);
        else neem(c, tx + sign * 0.3, tz, r, 0.95);
      }
      z += w;
      plot++;
    }
  }
  // Left inner corner (truck sweeps through it): low wall, shrubs only.
  const lowWall = rgb('#9d988c');
  const curve = innerCurve(ROAD.kerbW + ROAD.walk + 0.4);
  for (let i = 0; i < curve.length - 1; i += 2) {
    const a = curve[i];
    const b = curve[Math.min(curve.length - 1, i + 2)];
    const cx = (a[0] + b[0]) / 2;
    const cz = (a[2] + b[2]) / 2;
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const yaw = -Math.atan2(b[2] - a[2], b[0] - a[0]);
    c.g('plaster').obox(cx, 0.6, cz, len / 2 + 0.05, 0.6, 0.1, yaw, lowWall, { grime: 0.4 });
  }
  const cEnd = curve[curve.length - 1];
  {
    const ex = AX - 4.1;
    const len = Math.hypot(ex - cEnd[0], 40 - cEnd[2]);
    const yaw = -Math.atan2(40 - cEnd[2], ex - cEnd[0]);
    c.g('plaster').obox((ex + cEnd[0]) / 2, 0.6, (40 + cEnd[2]) / 2, len / 2, 0.6, 0.1, yaw, lowWall, { grime: 0.4 });
  }
  for (let k = 0; k < 6; k++) shrub(c, r.range(530, 566), r.range(14, 36), r, r.range(0.6, 1.2));

  // Electric poles with LED fittings every 30 m on the −X side (away from the truck's
  // left-hand lane), arms reaching over the street, wires between them.
  let prev: V3[] | null = null;
  for (let z = 12; z < RES_END; z += 30) {
    const pts = residentialPole(c, AX - 3.75, z, 1, lamps);
    if (prev) for (let i = 0; i < 3; i++) wire(c, prev[i], pts[i], 0.5);
    // Service drops to a couple of houses.
    for (const s of [-1, 1]) wire(c, pts[0], [AX + s * 7, 7.2, z + 6], 0.15);
    prev = pts;
  }

  // Vista-closing G+3 apartment across the end of the street.
  building(c, r, {
    x: AX,
    z: RES_END + 11,
    nx: 0,
    nz: -1,
    width: 26,
    depth: 16,
    floors: 3,
    kind: 'apartment',
    lit: 0.2,
    exposed: [true, true],
    detail: 'full',
  });
  compoundWall(c, face(AX + 20, RES_END + 7.5, 0, -1), 40, {
    height: 1.8,
    grille: 0.3,
    color: rgb('#b9b2a2'),
    gates: [[17, 23]],
    gateColor: rgb('#2f3a35'),
  }, r);
  for (const s of [-1, 1]) palm(c, AX + s * 15, RES_END + 9, r);
  // Houses along the cross lane on either side of the vista block.
  for (const s of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const w = r.range(9, 11);
      building(c, r, {
        x: AX + s * (24 + k * 11),
        z: RES_END + 7 + 2.5,
        nx: 0,
        nz: -1,
        width: w,
        depth: 12,
        floors: r.int(1, 2),
        kind: 'house',
        lit: 0.18,
        exposed: [false, false],
        detail: 'full',
      });
    }
  }
}

/* Mid-distance fill (120–250 m from the route): textured boxes, parapets, tanks ------------- */
function midFill(c: Chunk, r: Rng, medium: boolean) {
  const regions: [number, number, number, number, number, number, number][] = [
    // x0, x1, z0, z1, minH floors, maxH floors
    [330, 480, -70, -130, 2, 6, 0.04],
    [480, 700, -60, -140, 3, 9, 0.1],
    [400, 530, 42, 150, 1, 4, 0.1],
    [622, 700, 30, 170, 1, 4, 0.12],
    // Back rows of the colony, behind the street's houses.
    [AX - 40, AX - 22, 40, RES_END, 1, 2, 0.15],
    [AX + 22, AX + 40, 10, RES_END, 1, 2, 0.15],
  ];
  for (const [x0, x1, za, zb, f0, f1, lit] of regions) {
    const z0 = Math.min(za, zb);
    const z1 = Math.max(za, zb);
    for (let x = x0; x < x1; ) {
      const w = r.range(10, 18);
      for (let z = z0; z < z1; ) {
        const d = r.range(10, 16);
        const keep = !medium || r() < 0.5;
        if (keep && r() < 0.8 && routeDistance(x + w / 2, z + d / 2) > 18) {
          const facing = r() < 0.5 ? 1 : -1;
          building(c, r, {
            x: x + w / 2,
            z: facing > 0 ? z + d : z,
            nx: 0,
            nz: facing,
            width: w - 1,
            depth: d - 1,
            floors: r.int(f0, f1),
            kind: r() < 0.5 ? 'house' : 'apartment',
            lit,
            exposed: [true, true],
            detail: 'mid',
          });
        }
        z += d + r.range(2, 6);
      }
      x += w + r.range(2, 6);
    }
  }
  // A few tree clumps between blocks.
  for (let i = 0; i < (medium ? 6 : 12); i++) neem(c, r.range(420, 690), -r.range(55, 75), r, r.range(1, 1.3));
}

/* Skyline beyond x 650 (fog-free material, colours pre-mixed toward the fog) ---------------- */
function skyline(c: Chunk, r: Rng, medium: boolean) {
  const sky = c.g('skyline');
  const band = (
    count: number,
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    h0: number,
    h1: number,
    col: RGB,
    avoidRoad: boolean,
    dots = true,
  ) => {
    for (let i = 0; i < (medium ? Math.ceil(count * 0.6) : count); i++) {
      const w = r.range(14, 30);
      const d = r.range(14, 26);
      const x = r.range(x0, x1);
      let z = r.range(z0, z1);
      if (avoidRoad && Math.abs(z) < 22) z = Math.sign(z || 1) * r.range(22, 60);
      const h = r.range(h0, h1);
      sky.box(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, shade(col, r.range(0.85, 1.1)), {
        skip: FACE.NY,
        uv: dots ? 'world' : 'flat',
      });
      // Rooftop clutter breaks the box silhouette.
      if (r() < 0.6) sky.box(x - w * 0.2, h, z - d * 0.2, x + w * 0.1, h + r.range(2, 4), z + d * 0.1, shade(col, 0.95), { skip: FACE.NY, uv: 'flat' });
    }
  };
  band(40, 712, 800, -150, 150, 18, 45, rgb('#121826'), true);
  band(25, 800, 1100, -220, 220, 30, 70, rgb('#151b2a'), true);
  // Behind the residential street the band stays low so it sits on the bright horizon.
  band(18, 470, 690, 215, 300, 8, 14, rgb('#131a28'), false, false);
  // Two tower cranes with small red aviation lamps.
  for (const [x, z, h] of [
    [860, -70, 78],
    [930, 95, 86],
  ]) {
    const col = rgb('#1b2233');
    sky.box(x - 0.9, 0, z - 0.9, x + 0.9, h, z + 0.9, col, { uv: 'flat' });
    sky.box(x - 14, h, z - 0.6, x + 46, h + 1.6, z + 0.6, col, { uv: 'flat' });
    sky.box(x - 14, h - 3, z - 2, x - 6, h, z + 2, col, { uv: 'flat' });
    sky.box(x - 0.5, h + 1.6, z - 0.5, x + 0.5, h + 8, z + 0.5, col, { uv: 'flat' });
    sky.box(x - 0.35, h + 8, z - 0.35, x + 0.35, h + 8.6, z + 0.35, rgb('#ff3324', 1.6), { uv: 'flat' });
    sky.box(x + 45.4, h + 1.6, z - 0.3, x + 46, h + 2.2, z + 0.3, rgb('#ff3324', 1.2), { uv: 'flat' });
  }
}

/* ------------------------------------------------------------------------------------------ */

export function buildCity(quality: 'high' | 'medium'): CityLayout {
  const medium = quality === 'medium';
  const lamps: CityLamp[] = [];
  const gates: StreetGate[] = [];
  // Scene 01's posts carry no real light past x = 32; register them so the pool lights them.
  for (let x = 64; x <= WORLD_POSTS.to; x += WORLD_POSTS.spacing)
    lamps.push({
      x,
      y: WORLD_POSTS.height - 0.3,
      z: WORLD_POSTS.z + WORLD_POSTS.armLen,
      tx: x,
      tz: -0.8,
      color: '#ffe2c0',
      candela: 230,
    });

  const road = new Chunk('road');
  buildRoads(road, rng(101), lamps, medium);
  const a = new Chunk('A');
  zoneA(a, rng(202));
  const b = new Chunk('B');
  zoneB(b, rng(303), lamps);
  const cc = new Chunk('C');
  zoneC(cc, rng(404), medium);
  const d = new Chunk('D');
  zoneD(d, rng(505), lamps, gates);
  const mid = new Chunk('mid');
  midFill(mid, rng(606), medium);
  const sky = new Chunk('sky');
  skyline(sky, rng(707), medium);
  return { chunks: [road, a, b, cc, d, mid, sky], lamps, gates };
}
