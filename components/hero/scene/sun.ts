import { Color, MathUtils, Vector3 } from 'three';
import { JOURNEY_END, SCENE1_END_DISTANCE } from './route';

/**
 * Phase 2.2 sunrise. One progress value `sun` (0 = Scene 01 pre-dawn, 1 = early morning) is a
 * pure function of the truck's journey distance, so any scroll position maps to exactly one
 * lighting state and reverse scrubbing restores it exactly. At sun = 0 every value below equals
 * the Scene 01 constants, so Scene 01 renders unchanged.
 */

/** Monotone cubic (Fritsch–Carlson) through (distance, progress) knots tied to the city shots. */
const KNOTS: [number, number][] = [
  [40, 0], // nothing changes during Scene 01 or the first metres of Scene 02
  [150, 0.15], // early dawn (track)
  [330, 0.4], // first warm light (establishing shot)
  [455, 0.62], // sun at the horizon (city entrance / side track)
  [620, 0.9], // sun clears the skyline (approach, turn)
  // Golden morning on the residential street; reached 1 m before the journey ends so the
  // final scroll position is exactly 1 (the truck stops ~0.01 m short of JOURNEY_END).
  [JOURNEY_END - 1, 1],
];
const slopes = (() => {
  const n = KNOTS.length;
  const delta = KNOTS.slice(0, -1).map(
    ([x0, y0], i) => (KNOTS[i + 1][1] - y0) / (KNOTS[i + 1][0] - x0),
  );
  const m = KNOTS.map((_, i) =>
    i === 0 ? 0 : i === n - 1 ? 0 : delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2,
  );
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * delta[i];
      m[i + 1] = t * b * delta[i];
    }
  }
  return m;
})();

export function sunAt(d: number) {
  if (d <= Math.max(SCENE1_END_DISTANCE, KNOTS[0][0])) return 0;
  if (d >= KNOTS[KNOTS.length - 1][0]) return 1;
  let i = 0;
  while (d > KNOTS[i + 1][0]) i++;
  const [x0, y0] = KNOTS[i];
  const [x1, y1] = KNOTS[i + 1];
  const h = x1 - x0;
  const t = (d - x0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * y0 +
    (t3 - 2 * t2 + t) * h * slopes[i] +
    (-2 * t3 + 3 * t2) * y1 +
    (t3 - t2) * h * slopes[i + 1]
  );
}

/** Sun azimuth: east (+X), 12° toward +Z so its glow sits right of the establishing frame's copy. */
const AZIMUTH = MathUtils.degToRad(12);

type Key = [number, string | number];
const STOPS = [0, 0.15, 0.4, 0.62, 0.9, 1];
const row = (...values: (string | number)[]): Key[] => values.map((v, i) => [STOPS[i], v]);

/** Lighting director's keyframes (sRGB hex / three.js intensity units). */
export const SUN_KEYS = {
  zenith: row('#080d19', '#0b1324', '#13203a', '#1e3157', '#2f4f86', '#31548c'),
  mid: row('#16203a', '#1d2944', '#2c3d62', '#4a6290', '#6b8bbd', '#7092c2'),
  horizon: row('#33425f', '#424d69', '#646b84', '#a59f9e', '#c9c0b2', '#cdc6b9'),
  antiGlow: row('#3a3346', '#3a3850', '#44486a', '#5d6a8c', '#8a9cbf', '#90a2c4'),
  sunGlow: row('#6a4a52', '#6a4a52', '#c8875e', '#ffc58a', '#ffd8a8', '#ffdcb0'),
  sunGlowAmount: row(0, 0.18, 0.3, 0.6, 0.55, 0.5),
  sunGlowWidth: row(10, 10, 8, 6, 5, 5),
  elevationDeg: row(-6, -5, -2.5, 0, 6.5, 9),
  fog: row('#2a3650', '#313d57', '#414c66', '#737b90', '#9aa3b3', '#9ea7b6'),
  fogDensity: row(1, 1, 1, 1.05, 0.8, 0.75),
  hemiSky: row('#4a5f86', '#566b92', '#6f82a8', '#8fa3c6', '#a9bddb', '#a9bddb'),
  hemiGround: row('#14161a', '#17191d', '#1c1d20', '#2a2824', '#3a3530', '#3a3530'),
  /** Multiplier on the Director's hemisphere intensity (0.95 in Scene 02). */
  hemiScale: row(1, 1, 1.053, 1.105, 1.158, 1.158),
  sunColor: row('#ffa654', '#ffa654', '#ffa654', '#ffa654', '#ffc187', '#ffc78f'),
  sunIntensity: row(0, 0, 0, 0.25, 1.25, 1.4),
  key: row(0.3, 0.3, 0.25, 0.15, 0.12, 0.12),
  rim: row(0.65, 0.6, 0.5, 0.35, 0.25, 0.25),
  /** Multiplier on the Director's fill intensity (0.61 in Scene 02); colour warms slightly. */
  fillScale: row(1, 1, 0.98, 0.82, 0.74, 0.74),
  fillColor: row('#9fb3d9', '#9fb3d9', '#a6b8db', '#aebedd', '#b6c4df', '#b8c6e0'),
  environment: row(1.3, 1.3, 1.2, 1, 0.85, 0.8),
  lampHeads: row(1, 1, 0.9, 0.25, 0, 0),
  windows: row(1, 1, 0.85, 0.45, 0.18, 0.15),
  skylineDots: row(1, 1, 0.8, 0.3, 0, 0),
  skylineTint: row(1, 1.05, 1.6, 2.4, 3, 3.1),
  beam: row(1, 1, 1, 0.5, 0.35, 0.35),
};

export interface SunState {
  progress: number;
  /** Visual sun direction (true elevation) for the sky; unit vector. */
  skyDir: Vector3;
  /** Light direction (elevation clamped ≥ 7° to avoid grazing acne/zero N·L). */
  lightDir: Vector3;
  elevationDeg: number;
  zenith: Color;
  mid: Color;
  horizon: Color;
  antiGlow: Color;
  sunGlow: Color;
  sunGlowAmount: number;
  sunGlowWidth: number;
  fog: Color;
  fogDensity: number;
  hemiSky: Color;
  hemiGround: Color;
  hemiScale: number;
  sunColor: Color;
  sunIntensity: number;
  key: number;
  rim: number;
  fillScale: number;
  fillColor: Color;
  environment: number;
  lampHeads: number;
  windows: number;
  skylineDots: number;
  skylineTint: number;
  beam: number;
}

export const createSunState = (): SunState => ({
  progress: 0,
  skyDir: new Vector3(),
  lightDir: new Vector3(),
  elevationDeg: 0,
  zenith: new Color(),
  mid: new Color(),
  horizon: new Color(),
  antiGlow: new Color(),
  sunGlow: new Color(),
  sunGlowAmount: 0,
  sunGlowWidth: 0,
  fog: new Color(),
  fogDensity: 1,
  hemiSky: new Color(),
  hemiGround: new Color(),
  hemiScale: 1,
  sunColor: new Color(),
  sunIntensity: 0,
  key: 0,
  rim: 0,
  fillScale: 1,
  fillColor: new Color(),
  environment: 1,
  lampHeads: 1,
  windows: 1,
  skylineDots: 1,
  skylineTint: 1,
  beam: 1,
});

// Pre-parsed colour keys (linear working space) so sampling never allocates.
const colourKeys = new Map<Key[], Color[]>();
const coloursOf = (keys: Key[]) => {
  let c = colourKeys.get(keys);
  if (!c) {
    c = keys.map(([, v]) => new Color(v as string));
    colourKeys.set(keys, c);
  }
  return c;
};
function segment(s: number) {
  let i = 0;
  while (i < STOPS.length - 2 && s > STOPS[i + 1]) i++;
  return { i, k: (s - STOPS[i]) / (STOPS[i + 1] - STOPS[i]) };
}
const num = (keys: Key[], s: number) => {
  const { i, k } = segment(s);
  return MathUtils.lerp(keys[i][1] as number, keys[i + 1][1] as number, k);
};
const col = (keys: Key[], s: number, out: Color) => {
  const { i, k } = segment(s);
  const c = coloursOf(keys);
  // Exact at the keys (k = 0) so sun = 0 reproduces the original constants bit-for-bit.
  return k === 0 ? out.copy(c[i]) : out.lerpColors(c[i], c[i + 1], k);
};

export function sampleSun(sun: number, out: SunState): SunState {
  const s = Math.min(1, Math.max(0, sun));
  const K = SUN_KEYS;
  out.progress = s;
  out.elevationDeg = num(K.elevationDeg, s);
  const e = MathUtils.degToRad(out.elevationDeg);
  out.skyDir.set(Math.cos(e) * Math.cos(AZIMUTH), Math.sin(e), Math.cos(e) * Math.sin(AZIMUTH));
  const le = MathUtils.degToRad(Math.max(out.elevationDeg, 4) + 3);
  out.lightDir.set(Math.cos(le) * Math.cos(AZIMUTH), Math.sin(le), Math.cos(le) * Math.sin(AZIMUTH));
  col(K.zenith, s, out.zenith);
  col(K.mid, s, out.mid);
  col(K.horizon, s, out.horizon);
  col(K.antiGlow, s, out.antiGlow);
  col(K.sunGlow, s, out.sunGlow);
  out.sunGlowAmount = num(K.sunGlowAmount, s);
  out.sunGlowWidth = num(K.sunGlowWidth, s);
  col(K.fog, s, out.fog);
  out.fogDensity = num(K.fogDensity, s);
  col(K.hemiSky, s, out.hemiSky);
  col(K.hemiGround, s, out.hemiGround);
  out.hemiScale = num(K.hemiScale, s);
  col(K.sunColor, s, out.sunColor);
  out.sunIntensity = num(K.sunIntensity, s);
  out.key = num(K.key, s);
  out.rim = num(K.rim, s);
  out.fillScale = num(K.fillScale, s);
  col(K.fillColor, s, out.fillColor);
  out.environment = num(K.environment, s);
  out.lampHeads = num(K.lampHeads, s);
  out.windows = num(K.windows, s);
  out.skylineDots = num(K.skylineDots, s);
  out.skylineTint = num(K.skylineTint, s);
  out.beam = num(K.beam, s);
  return out;
}

/**
 * Per-lamp photocell: each real (pooled) street light switches off at its own point in
 * s ∈ [0.55, 0.66], hashed from its position, fading over Δs = 0.03 — never a global pop.
 */
export function streetLampOn(sun: number, x: number, z: number) {
  const h = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  const off = 0.55 + 0.11 * h;
  const k = Math.min(1, Math.max(0, (sun - (off - 0.03)) / 0.03));
  return 1 - k * k * (3 - 2 * k);
}
