import { CatmullRomCurve3, Vector3 } from 'three';
import { DRIVE, TRUCK_LANE_Z } from './rig';

/**
 * Scene 02 route + kinematics. Everything is precomputed tables, so any scroll position maps
 * to exactly one truck pose: forward and reverse scrubbing replay identically.
 *
 * The route is the path of the rear (tandem) axle centre, which is how a rigid truck tracks.
 * The truck root (front axle) sits WHEELBASE ahead along the heading, so on the straight it is
 * exactly where Scene 01 left it: x = distance, z = TRUCK_LANE_Z.
 */
export const WHEELBASE = 5.075;

/** Main road: straight along +X. The right turn into the residential street begins here. */
export const TURN_START_X = 547.5;
/** Right turn from the left lane, across the oncoming carriageway, into the street's left lane. */
const TURN_RADIUS = 25.524;
/** Curvature eases in/out over this length (clothoid-like), so steering never snaps. */
const EASE_LENGTH = 10;
const TURN_ANGLE = Math.PI / 2;
const ARC_LENGTH = TURN_ANGLE * TURN_RADIUS - EASE_LENGTH;
const TURN_LENGTH = ARC_LENGTH + 2 * EASE_LENGTH;
const RESIDENTIAL_LENGTH = 140;

/** Signed curvature at arc length s (positive = turning toward +Z, a right turn). */
function curvature(s: number) {
  const u = s - TURN_START_X;
  const k = 1 / TURN_RADIUS;
  if (u <= 0 || u >= TURN_LENGTH) return 0;
  if (u < EASE_LENGTH) return (k * u) / EASE_LENGTH;
  if (u > EASE_LENGTH + ARC_LENGTH) return (k * (TURN_LENGTH - u)) / EASE_LENGTH;
  return k;
}

const PATH_STEP = 0.25;
const PATH_END = TURN_START_X + TURN_LENGTH + RESIDENTIAL_LENGTH;
const path = (() => {
  const n = Math.ceil(PATH_END / PATH_STEP) + 1;
  const x = new Float64Array(n);
  const z = new Float64Array(n);
  const yaw = new Float64Array(n);
  let px = 0;
  let pz = TRUCK_LANE_Z;
  let a = 0;
  for (let i = 0; i < n; i++) {
    x[i] = px;
    z[i] = pz;
    yaw[i] = a;
    // Midpoint integration keeps the turn closing at exactly 90°.
    const am = a + (curvature((i + 0.5) * PATH_STEP) * PATH_STEP) / 2;
    px += Math.cos(am) * PATH_STEP;
    pz += Math.sin(am) * PATH_STEP;
    a += curvature((i + 0.5) * PATH_STEP) * PATH_STEP;
  }
  return { x, z, yaw, n };
})();

export interface PathSample {
  x: number;
  z: number;
  /** Heading angle from +X toward +Z (radians). */
  yaw: number;
  curvature: number;
}

/** Rear-axle pose at arc length s. Negative s extends the straight backwards. */
export function samplePath(s: number, out: PathSample): PathSample {
  if (s <= 0) {
    out.x = s;
    out.z = TRUCK_LANE_Z;
    out.yaw = 0;
    out.curvature = 0;
    return out;
  }
  const f = Math.min(s / PATH_STEP, path.n - 1.000001);
  const i = Math.floor(f);
  const k = f - i;
  out.x = path.x[i] + (path.x[i + 1] - path.x[i]) * k;
  out.z = path.z[i] + (path.z[i + 1] - path.z[i]) * k;
  out.yaw = path.yaw[i] + (path.yaw[i + 1] - path.yaw[i]) * k;
  out.curvature = curvature(s);
  return out;
}

/** Residential street geometry, derived from the integrated turn (for the city layout). */
const turnEnd = samplePath(TURN_START_X + TURN_LENGTH, {} as PathSample);
export const RESIDENTIAL = {
  /** Keeping left on a 6 m street heading +Z puts the truck on the +X side of the centre line. */
  axisX: turnEnd.x - 1.5,
  /** z where the straight residential section begins. */
  startZ: turnEnd.z,
  width: 6,
  length: RESIDENTIAL_LENGTH,
};

/** Front-axle distance along the route where Scene 02's journey ends (truck still rolling). */
export const JOURNEY_END = TURN_START_X + TURN_LENGTH + 95 + WHEELBASE;

/**
 * Speed profile over the whole journey (simulated seconds).
 * 0–9 s reproduces Scene 01 exactly (jerk-ramped 0.85 m/s² pull-away). After that a
 * jerk-limited speed controller cruises at ~38 km/h, brakes at ≤0.55 m/s² for the turn,
 * takes it at ~16 km/h, then rolls slowly into the residential street.
 */
const DT = DRIVE.seconds / 720;
const CRUISE = 10.5;
const TURN_SPEED = 4.6;
const STREET_SPEED = 5.2;
const ARRIVE_SPEED = 2.2;
const BRAKE = 0.5;
const TURN_FRONT = TURN_START_X + WHEELBASE;
const LEAVE_TURN = TURN_START_X + TURN_LENGTH + WHEELBASE;

function targetSpeed(d: number) {
  if (d < TURN_FRONT)
    return Math.min(
      CRUISE,
      Math.sqrt(TURN_SPEED ** 2 + 2 * BRAKE * Math.max(0, TURN_FRONT - 6 - d)),
    );
  if (d < LEAVE_TURN + 6) return TURN_SPEED;
  const toEnd = JOURNEY_END - d;
  return Math.max(
    ARRIVE_SPEED,
    Math.min(STREET_SPEED, Math.sqrt(ARRIVE_SPEED ** 2 + 2 * 0.35 * Math.max(0, toEnd - 10))),
  );
}

const kin = (() => {
  const time: number[] = [0];
  const distance: number[] = [0];
  const speed: number[] = [0];
  const accel: number[] = [0];
  let t = 0;
  let v = 0;
  let d = 0;
  let a = 0;
  while (d < JOURNEY_END && t < 400) {
    t += DT;
    if (t <= DRIVE.seconds + 1e-9) {
      const x = Math.min(1, t / DRIVE.ramp);
      a = DRIVE.accel * x * x * (3 - 2 * x);
    } else {
      const want = Math.max(-0.6, Math.min(0.6, (targetSpeed(d) - v) * 0.45));
      // Jerk limit 0.35 m/s³: no lurches when the controller changes its mind.
      a += Math.max(-0.35 * DT, Math.min(0.35 * DT, want - a));
    }
    v = Math.max(0, v + a * DT);
    d += v * DT;
    time.push(t);
    distance.push(d);
    speed.push(v);
    accel.push(a);
  }
  return {
    distance: Float64Array.from(distance),
    speed: Float64Array.from(speed),
    accel: Float64Array.from(accel),
    seconds: t,
  };
})();

/** Simulated seconds at which Scene 01 hands over (truck pulling away) and Scene 02 ends. */
export const SCENE1_END_SEC = DRIVE.seconds;
export const JOURNEY_END_SEC = kin.seconds;

export interface DriveState {
  distance: number;
  speed: number;
  accel: number;
}

export function driveAt(sec: number, out: DriveState): DriveState {
  const f = Math.max(0, Math.min(sec, kin.seconds)) / DT;
  const i = Math.min(kin.distance.length - 2, Math.floor(f));
  const k = f - i;
  out.distance = kin.distance[i] + (kin.distance[i + 1] - kin.distance[i]) * k;
  out.speed = kin.speed[i] + (kin.speed[i + 1] - kin.speed[i]) * k;
  out.accel = sec > 0 ? kin.accel[i] + (kin.accel[i + 1] - kin.accel[i]) * k : 0;
  return out;
}

/** Inverse of driveAt for distances (monotonic table → binary search). */
export function secondsAtDistance(d: number) {
  let lo = 0;
  let hi = kin.distance.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (kin.distance[mid] < d) lo = mid;
    else hi = mid;
  }
  const span = kin.distance[hi] - kin.distance[lo] || 1;
  return (lo + (d - kin.distance[lo]) / span) * DT;
}

export const SCENE1_END_DISTANCE = driveAt(SCENE1_END_SEC, {} as DriveState).distance;

/**
 * Scene 01's tracking camera, as written in Director: world pos (d·0.78 − 15.5, 1.45, 8.2),
 * target (d + 1.5, 1.55, lane). At the hand-over distance this is expressed in the truck's
 * local frame (x forward, y up, z = truck's right = world +Z on the main road), so the first
 * Scene 02 key equals Scene 01's last frame exactly.
 */
export const SCENE1_FOLLOW = {
  pos: (d: number, out: Vector3) => out.set(d * 0.78 - 15.5, 1.45, TRUCK_LANE_Z + 6.45),
  target: (d: number, out: Vector3) => out.set(d + 1.5, 1.55, TRUCK_LANE_Z),
};

type V3 = [number, number, number];
export interface CityShot {
  id: string;
  /** Front-axle distance at which this framing is reached. */
  at: number;
  /** Camera and look target in the truck's local frame. */
  pos: V3;
  target: V3;
  focal: number;
}

const D1 = SCENE1_END_DISTANCE;
export const CITY_SHOTS: CityShot[] = [
  {
    id: 'continue',
    at: D1,
    pos: [D1 * 0.78 - 15.5 - D1, 1.45, 6.45],
    target: [1.5, 1.55, 0],
    focal: 35,
  },
  { id: 'track', at: 110, pos: [-13.5, 2.1, 4.4], target: [8, 1.7, -0.3], focal: 35 },
  // Rise and establishing keep the truck in the lower third while the road ahead opens up.
  { id: 'rise', at: 225, pos: [-24, 11, 6], target: [40, 1, -2], focal: 30 },
  { id: 'establish', at: 330, pos: [-60, 30, 24], target: [70, 0, -10], focal: 24 },
  { id: 'sideTrack', at: 445, pos: [1.5, 2.2, 15.5], target: [0.5, 1.7, 0], focal: 40 },
  { id: 'approach', at: 540, pos: [-12.5, 3.3, 4.8], target: [10, 1.8, -0.5], focal: 32 },
  // Residential street is 6 m between 1.5 m walls: the camera rides over the carriageway.
  // Truck keeps left, so the street centre is on its right (+local z): look down the middle.
  { id: 'arrive', at: JOURNEY_END, pos: [-15, 5.6, 0.6], target: [16, 1.2, 1.0], focal: 28 },
];

export function createCityCurves() {
  const curve = (pick: (s: CityShot) => V3) =>
    new CatmullRomCurve3(
      CITY_SHOTS.map((s) => new Vector3(...pick(s))),
      false,
      'centripetal',
    );
  return { pos: curve((s) => s.pos), target: curve((s) => s.target) };
}

/** Fog thins from the outer road into the city (pre-dawn haze lifting near buildings). */
export function fogDensityAt(d: number) {
  const k = Math.min(1, Math.max(0, (d - 150) / 330));
  return 0.019 + (0.0085 - 0.019) * k * k * (3 - 2 * k);
}
