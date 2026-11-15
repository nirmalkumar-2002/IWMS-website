import { CatmullRomCurve3, Vector3 } from 'three';
import { COLLECTION_GATE, RESIDENTIAL } from './route';

/**
 * Phase 3.1–3.2: household collection, GPS/route connectivity and QR verification. Pure data +
 * geometry shared by the timeline, the Director (camera), the waste bins and the collection overlay.
 * No React, no per-frame state.
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
  /** Households served before H-12; becomes served + 1 only once H-12's collection is completed. */
  served: 11,
  households: 24,
  next: { id: 'H-13', metres: Math.round(153.446 - COLLECTION_GATE.z) },
  /** Event times for the three distinct H-12 states (illustrative). */
  times: { arrived: '07:41', verified: '07:42', completed: '07:43' },
};

/** Collection-point marker head, above the compound wall (1.8 m). */
export const MARKER_HEAD_Y = 2.7;

/**
 * Household waste bins (Phase 3.2) on the kerbside strip in front of plot 12's compound wall,
 * just left of the H-12 gate's near pillar (frontage z 136.01–147.86, opening 140.88–143.88,
 * pillar 140.53–140.88), clear of the parked truck (rear end ≈ z 143.6). Two ~120 L wheelie bins
 * in India's segregation colours, fronts facing the street (−X), wheels and handle to the wall.
 * Each carries a printed front label with an illustrative QR tag; the WET bin is the one scanned.
 */
export const BIN = {
  /** The kerbside verge's drain-cover slabs (city/layout.ts) top out at y 0.07: bins stand on them. */
  baseY: 0.07,
  /** Body footprint at the base (x depth, z width) and height; the body widens ~6 % to the top. */
  depth: 0.52,
  width: 0.46,
  bodyY0: 0.04,
  bodyH: 0.84,
  taper: 1.06,
  lidH: 0.05,
  /** Front label (printed sticker): size and centre height above the base; QR square centred on it. */
  label: { width: 0.3, height: 0.4, y: 0.55 },
  qrSize: 0.22,
};
const BIN_X = COLLECTION_GATE.x - 0.06 - (BIN.depth / 2) * BIN.taper;
export interface Bin {
  id: string;
  kind: 'wet' | 'dry';
  /** Base centre (world). */
  x: number;
  z: number;
}
export const BINS: Bin[] = [
  { id: 'BIN-0712-W', kind: 'wet', x: BIN_X, z: 140.02 },
  { id: 'BIN-0712-D', kind: 'dry', x: BIN_X, z: 139.4 },
];
/** Front-face x of a bin body at height y above its base (the body tapers outward toward the top). */
export const binFrontX = (bin: Bin, y: number) =>
  bin.x -
  (BIN.depth / 2) * (1 + (BIN.taper - 1) * Math.min(1, Math.max(0, (y - BIN.bodyY0) / BIN.bodyH)));
/** The QR tag that is scanned: centre of the WET bin's label QR square, just proud of the face. */
export const SCAN_BIN = BINS[0];
export const QR_TAG = {
  x: binFrontX(SCAN_BIN, BIN.label.y) - 0.006,
  y: BIN.baseY + BIN.label.y,
  z: SCAN_BIN.z,
  size: BIN.qrSize,
};

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
 * Collection keys, sampled by `rig.collectU` at i / (n − 1). The first key is Scene 02's
 * `arrive` exactly, so the hand-over has no pop. All keys are truck-local, so they read in world
 * terms only once the truck is at rest (front axle at gate.z + 9.5): there, local x = z − 151.88
 * and local z = −(x − (axisX + 1.5)). Kerbside is −z. The camera leaves the truck: it turns to the
 * household, closes in on the wet bin's QR tag, then settles on a medium household frame.
 * Positions stay over the carriageway and clear of the parked truck (rear end ≈ local x −8.3).
 */
export const COLLECT_SHOTS: CollectShot[] = [
  { id: 'arrive', pos: [-15, 5.6, 0.6], target: [16, 1.2, 1.0], focal: 28 },
  // Descend and pan off the truck toward the kerbside homes as it rolls to a stop.
  { id: 'turn', pos: [-15, 3.2, 2.2], target: [-6, 1.6, -3.0], focal: 30 },
  // Eye level across the street: the H-12 gate with its wet/dry bins; the truck only at frame edge.
  { id: 'household', pos: [-16, 1.65, 2.6], target: [-11.4, 0.9, -2.4], focal: 30 },
  // Close-up on the wet bin's QR tag (≈1.9 m, from the lane behind the truck) at hand-held phone
  // height, looking slightly down; the phone viewfinder frames the tag with bin and wall around it.
  { id: 'qr', pos: [-12.05, 1.0, 0.0], target: [-11.86, 0.62, -1.89], focal: 40 },
  // Confirmation: a medium household frame — gate, bins and house together.
  { id: 'confirm', pos: [-15.4, 1.45, 1.9], target: [-11.0, 0.95, -2.6], focal: 30 },
];
/** collectU at which each key is reached. */
export const SHOT_U = Object.fromEntries(
  COLLECT_SHOTS.map((s, i) => [s.id, i / (COLLECT_SHOTS.length - 1)]),
) as Record<string, number>;

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

/* Monitor map ------------------------------------------------------------------------------ */

/**
 * Top-down schematic for the IWMS monitor's route map, in metres: map x = world z (along the
 * street, driving direction to the right), map y = −(world x − axisX), so the kerbside (+X) is
 * up and the left turn into the cross lane bends upward, as on a north-up route map.
 */
export const MAP = { x: 116, y: -17, width: 68, height: 23 };
export const toMap = (x: number, z: number): [number, number] => [
  z,
  -(x - RESIDENTIAL.axisX),
];
export const mapStreet = {
  street: { x: MAP.x, y: -RESIDENTIAL.width / 2, width: RES_END + 1 - MAP.x, height: RESIDENTIAL.width },
  cross: { x: RES_END + 1, y: MAP.y, width: 6, height: MAP.height },
};
export const mapPoints = (pts: [number, number][]) =>
  pts.map(([x, z]) => toMap(x, z).map((v) => v.toFixed(2)).join(',')).join(' ');
