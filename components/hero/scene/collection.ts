import { CatmullRomCurve3, Vector3 } from 'three';
import { COLLECTION_GATE, RESIDENTIAL } from './route';

/**
 * Phase 3.1: smart collection & digital connectivity. Pure data + geometry shared by the
 * timeline, the Director (camera) and the collection overlay. No React, no per-frame state.
 *
 * Everything shown in the digital layer is ILLUSTRATIVE DEMO DATA (labelled as such on screen):
 * ids, counts and coordinates do not come from a live IWMS deployment.
 */

export type PointStatus = 'collected' | 'current' | 'scheduled';

export interface CollectionPoint {
  /** Household code shown in the overlay (demo). */
  id: string;
  /** Zone D plot index and street side (+1 = east/kerbside, −1 = west), as in `buildCity().gates`. */
  plot: number;
  side: 1 | -1;
  /** Gate centre on the compound-wall face (world metres). */
  x: number;
  z: number;
  status: PointStatus;
}

const EAST_X = RESIDENTIAL.axisX + 4;
const WEST_X = RESIDENTIAL.axisX - 4;

/**
 * Gate centres copied from the seeded city layout (`buildCity(q).gates`, identical on both
 * tiers). The city builds in its own lazy chunk, so the values are mirrored here instead of
 * regenerating the street; `tests/collection.spec.ts` keeps the two in sync.
 */
export const COLLECTION_POINTS: CollectionPoint[] = [
  { id: 'H-11', plot: 11, side: 1, x: EAST_X, z: 127.693, status: 'collected' },
  { id: 'H-12', plot: 12, side: 1, x: COLLECTION_GATE.x, z: COLLECTION_GATE.z, status: 'current' },
  { id: 'H-13', plot: 13, side: 1, x: EAST_X, z: 153.446, status: 'scheduled' },
  { id: 'H-14', plot: 14, side: 1, x: EAST_X, z: 162.805, status: 'scheduled' },
  { id: 'H-31', plot: 10, side: -1, x: WEST_X, z: 150.147, status: 'scheduled' },
  { id: 'H-32', plot: 11, side: -1, x: WEST_X, z: 163.259, status: 'scheduled' },
];
export const CURRENT_POINT = COLLECTION_POINTS.find((p) => p.status === 'current')!;

/** Illustrative operational context for the monitor panel (demo values, never live data). */
export const DEMO = {
  vehicle: 'IWMS-07',
  route: 'R-14 · Ward 7',
  /** Display-only GPS fix (demo). */
  gps: '12.9716° N  77.5946° E',
  served: 11,
  households: 24,
  next: { id: 'H-13', metres: Math.round(153.446 - COLLECTION_GATE.z) },
};

/** Marker heights: label head above the compound wall (1.8 m), and the truck's GPS tag over the cab. */
export const MARKER_HEAD_Y = 2.7;
export const POINT_HEAD_Y = 2.2;
/** GPS tag anchor in the truck's local frame (x forward from the front axle, y up). */
export const GPS_ANCHOR = { x: -1.6, y: 4.1 };

/* Camera ---------------------------------------------------------------------------------- */

type V3 = [number, number, number];
export interface CollectShot {
  id: string;
  /** Camera and look target in the truck's local frame (x fwd, y up, z = truck's right). */
  pos: V3;
  target: V3;
  focal: number;
}

/**
 * Phase 3.1 keys, sampled by `rig.collectU` at i / (n − 1). The first key is Scene 02's
 * `arrive` exactly, so the hand-over has no pop. Truck-local +z is the street centre (the truck
 * keeps left): every camera position stays within local z ∈ [0, 3], i.e. over the carriageway
 * between the compound walls (world x within axisX ± 1.5). Targets may look toward the kerb (−z).
 */
export const COLLECT_SHOTS: CollectShot[] = [
  { id: 'arrive', pos: [-15, 5.6, 0.6], target: [16, 1.2, 1.0], focal: 28 },
  // Kerbside read: behind the truck over the centre line, the plot-12 gate just beyond the hopper.
  { id: 'kerb', pos: [-22, 3.4, 2.4], target: [-5, 1.4, -1.6], focal: 32 },
  // Systems view: high over the street so the route, nearby gates and the truck read as one network.
  { id: 'network', pos: [-30, 17, 2.5], target: [10, 0, -1.5], focal: 24 },
];

export function createCollectCurves() {
  const curve = (pick: (s: CollectShot) => V3) =>
    new CatmullRomCurve3(
      COLLECT_SHOTS.map((s) => new Vector3(...pick(s))),
      false,
      'centripetal',
    );
  return { pos: curve((s) => s.pos), target: curve((s) => s.target) };
}

/* Planned route ------------------------------------------------------------------------- */

const LANE_X = RESIDENTIAL.axisX + 1.5;
const RES_END = RESIDENTIAL.startZ + RESIDENTIAL.length;
/** The cross lane at the end of the street (city layout: concrete z ∈ [RES_END + 1, RES_END + 7]). */
const CROSS_LANE_Z = RES_END + 2.5;
const TURN_R = 4;

/**
 * Planned route ahead of the stopped truck, at road level: on along the left lane, then a left
 * turn (the kerbside turn under left-hand traffic) into the cross lane. World XZ points, ~1 m apart.
 */
export const ROUTE_AHEAD: [number, number][] = (() => {
  const pts: [number, number][] = [];
  const turnZ = CROSS_LANE_Z - TURN_R;
  for (let z = 154.5; z < turnZ; z += 1) pts.push([LANE_X, z]);
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push([LANE_X + TURN_R - TURN_R * Math.cos(a), turnZ + TURN_R * Math.sin(a)]);
  }
  // A short run into the cross lane: enough to read the turn without tracing over rooftops.
  for (let x = LANE_X + TURN_R + 1; x <= LANE_X + 14; x += 1) pts.push([x, CROSS_LANE_Z]);
  return pts;
})();

/** Route already driven on this street (shown dimmed behind the truck). */
export const ROUTE_DONE: [number, number][] = (() => {
  const pts: [number, number][] = [];
  for (let z = 118; z <= 143; z += 1) pts.push([LANE_X, z]);
  return pts;
})();

/** Cumulative world length along a polyline (for drawing it to a fraction of its real length). */
export function cumulative(pts: [number, number][]) {
  const out = [0];
  for (let i = 1; i < pts.length; i++)
    out.push(out[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return out;
}

/**
 * Route progress at which each nearby point lights up: kerbside points when the drawn route
 * reaches them, the opposite (return-run) side once the whole route is drawn.
 */
export function revealAt(p: CollectionPoint, aheadLength: number[]) {
  if (p.status === 'current') return 0;
  if (p.status === 'collected') return 0.05;
  if (p.side < 0) return p.z < 155 ? 0.85 : 0.95;
  const total = aheadLength[aheadLength.length - 1];
  const i = ROUTE_AHEAD.findIndex(([, z]) => z >= p.z);
  return Math.min(0.9, Math.max(0.02, aheadLength[Math.max(0, i)] / total));
}
