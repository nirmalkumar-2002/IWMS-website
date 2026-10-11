import { CatmullRomCurve3, Vector3 } from 'three';

/**
 * World conventions (1 unit = 1 m, Y up): the road runs along X and the truck faces +X.
 * The truck root sits on the front axle centre, in the +Z lane.
 */
export const TRUCK_LANE_Z = 1.75;

/**
 * Mutable state written by GSAP timelines and read every frame by the Director.
 * Plain numbers only: no React state, so scrubbing never re-renders and always replays exactly.
 */
export interface Rig {
  /** 0..1 along the shot spline. Owned by the scroll timeline. */
  camU: number;
  /** Lens focal length in mm (35 mm full-frame equivalent). Owned by the scroll timeline. */
  focal: number;
  /** 1 = establishing-shot offset applied, 0 = resting on the first spline shot. Owned by the intro. */
  approach: number;
  /** 0..1 blend from the spline camera to the drive-off tracking camera. Owned by the scroll timeline. */
  follow: number;
  /** 0..1 drive phase, mapped to simulated seconds. Owned by the scroll timeline. */
  driveT: number;
  /** 0..1 pre-dawn sky brightening across the reveal. Owned by the scroll timeline. */
  dawn: number;
  /** Lamp levels (0..~1.04). Owned by the intro. */
  marker: number;
  tail: number;
  headL: number;
  headR: number;
  beam: number;
}

export const createRig = (): Rig => ({
  camU: 0,
  focal: 35,
  approach: 1,
  follow: 0,
  driveT: 0,
  dawn: 0,
  marker: 0,
  tail: 0,
  headL: 0,
  headR: 0,
  beam: 0,
});

type V3 = [number, number, number];
export interface Shot {
  id: string;
  pos: V3;
  target: V3;
  focal: number;
}

/** Camera key poses. Spline knots, sampled with getPoint(i / (n - 1)) so each shot lands exactly. */
export const SHOTS: Shot[] = [
  { id: 'activation', pos: [26, 0.75, 9.5], target: [-3, 1.5, 1.75], focal: 35 },
  { id: 'front34', pos: [8.6, 0.55, 7.4], target: [-2, 1.45, 1.75], focal: 24 },
  { id: 'headlight', pos: [5.8, 1.2, 5.3], target: [1.3, 1.15, 2.2], focal: 70 },
  { id: 'wheel', pos: [-1.6, 0.5, 6.3], target: [-0.3, 0.72, 2.85], focal: 50 },
  { id: 'side', pos: [-3.4, 1.7, 17], target: [-3.4, 2.5, 1.75], focal: 50 },
  { id: 'rear34', pos: [-19, 1.3, 9.5], target: [-3.5, 1.6, 1.75], focal: 35 },
];

/** Establishing pose: a distant, low dolly that settles onto SHOTS[0] during the intro. */
const ESTABLISHING = {
  pos: new Vector3(40, 0.55, 13),
  target: new Vector3(-4, 1.7, 1.75),
};
export const APPROACH_POS = ESTABLISHING.pos
  .clone()
  .sub(new Vector3(...SHOTS[0].pos));
export const APPROACH_TARGET = ESTABLISHING.target
  .clone()
  .sub(new Vector3(...SHOTS[0].target));

export const shotU = (index: number) => index / (SHOTS.length - 1);
export const STILL_SHOT = SHOTS.findIndex((shot) => shot.id === 'side');

export function createCameraCurves() {
  return {
    pos: new CatmullRomCurve3(
      SHOTS.map((s) => new Vector3(...s.pos)),
      false,
      'centripetal',
    ),
    target: new CatmullRomCurve3(
      SHOTS.map((s) => new Vector3(...s.target)),
      false,
      'centripetal',
    ),
  };
}

/** Vertical FOV for a full-frame (24 mm tall) sensor. */
export const focalToFov = (mm: number) =>
  (2 * Math.atan(12 / mm) * 180) / Math.PI;

/**
 * Drive-off kinematics. Scroll maps to simulated time; distance comes from integrating a
 * jerk-limited acceleration (a loaded refuse truck pulls away at well under 1 m/s²).
 */
export const DRIVE = { seconds: 9, accel: 0.85, ramp: 1.4 };
const STEPS = 720;
const table = (() => {
  const distance = new Float32Array(STEPS + 1);
  const speed = new Float32Array(STEPS + 1);
  const dt = DRIVE.seconds / STEPS;
  let v = 0;
  let d = 0;
  for (let i = 1; i <= STEPS; i++) {
    const x = Math.min(1, (i * dt) / DRIVE.ramp);
    v += DRIVE.accel * x * x * (3 - 2 * x) * dt;
    d += v * dt;
    distance[i] = d;
    speed[i] = v;
  }
  return { distance, speed };
})();

export function driveState(driveT: number) {
  const f = Math.min(1, Math.max(0, driveT)) * STEPS;
  const i = Math.min(STEPS - 1, Math.floor(f));
  const k = f - i;
  const t = (f / STEPS) * DRIVE.seconds;
  const x = Math.min(1, t / DRIVE.ramp);
  return {
    distance: table.distance[i] + (table.distance[i + 1] - table.distance[i]) * k,
    speed: table.speed[i] + (table.speed[i + 1] - table.speed[i]) * k,
    accel: driveT > 0 ? DRIVE.accel * x * x * (3 - 2 * x) : 0,
  };
}
