import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, FogExp2, Vector3, type Vector3 as V3 } from 'three';
import type { SceneRefs } from './handles';
import { TRUCK_LANE_Z, type Rig } from './rig';
import { driveAt, type DriveState } from './route';
import {
  HOUSEHOLD_GRADE,
  createSunState,
  householdGrade,
  sampleSun,
  sunAt,
  type SunState,
} from './sun';

const GRADE_KEY = new Color(HOUSEHOLD_GRADE.keyColor);
const GRADE_GROUND = new Color(HOUSEHOLD_GRADE.hemiGround);

/** Shadow camera half-extent (m) and map size: must match the sun light set up in World.tsx. */
const SHADOW_EXTENT = 40;
const SHADOW_MAP = 2048;

const copyColour = (u: { value: unknown } | undefined, c: Color) => {
  if (u) (u.value as Color).copy(c);
};

/**
 * Phase 2.2 sunrise. Runs after the Director each frame (mounted right after it), so it scales
 * the values the Director has just written. Progress is a pure function of the truck's journey
 * distance: identical forward/reverse at any scroll position, 0 throughout Scene 01 and in the
 * reduced-motion still. Only uniform-level values change — no lights or flags are added or
 * toggled, so no shader recompiles while scrolling.
 */
export function SunDirector({
  rig,
  refs,
  still,
  sunShadows,
}: {
  rig: Rig;
  refs: SceneRefs;
  still: boolean;
  sunShadows: boolean;
}) {
  const scratch = useMemo(
    () => ({
      drive: {} as DriveState,
      state: createSunState(),
      centre: new Vector3(),
      right: new Vector3(),
      up: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
      /** The key light's load-time colour (World.tsx), restored whenever the grade is off. */
      keyBase: null as Color | null,
      graded: false,
    }),
    [],
  );

  useFrame((frame) => {
    const { drive, state } = scratch;
    const d = driveAt(rig.driveSec, drive).distance;
    const sun = still ? 0 : sunAt(d);
    const s: SunState = sampleSun(sun, state);
    const day = refs.day;
    day.progress = sun;

    // Sky dome: night colours are today's uniforms at sun = 0; sunrise terms are gated by amount.
    const sky = day.sky;
    if (sky) {
      copyColour(sky.uZenith, s.zenith);
      copyColour(sky.uMid, s.mid);
      copyColour(sky.uHorizon, s.horizon);
      copyColour(sky.uGlow, s.antiGlow);
      copyColour(sky.uSunGlow, s.sunGlow);
      if (sky.uSunDir) (sky.uSunDir.value as V3).copy(s.skyDir);
      if (sky.uSunAmt) sky.uSunAmt.value = sun > 0 ? s.sunGlowAmount : 0;
      if (sky.uSunWidth) sky.uSunWidth.value = s.sunGlowWidth;
      if (sky.uSunElev) sky.uSunElev.value = (s.elevationDeg * Math.PI) / 180;
    }

    // Atmosphere: the Director has set this frame's density from distance; tint and thin it.
    const fog = frame.scene.fog;
    if (fog instanceof FogExp2) {
      fog.color.copy(s.fog);
      fog.density *= s.fogDensity;
    }
    frame.scene.environmentIntensity = s.environment;

    // Ambient + fill (Director wrote today's intensities; scale and recolour them).
    if (refs.sky) {
      refs.sky.color.copy(s.hemiSky);
      refs.sky.groundColor.copy(s.hemiGround);
      refs.sky.intensity *= s.hemiScale;
    }
    if (refs.fill) {
      refs.fill.color.copy(s.fillColor);
      refs.fill.intensity *= s.fillScale;
    }
    if (day.keyLight) day.keyLight.intensity = s.key;
    if (day.rimLight) day.rimLight.intensity = s.rim;

    // Phase 3.3 household grade (see HOUSEHOLD_GRADE): 0 — no writes at all — unless collectU > 0,
    // so Scene 01/02 values are exactly the ones above. Lifts the shaded street-facing side.
    const grade = still ? 0 : householdGrade(rig.collectU);
    const key = day.keyLight;
    if (key && !scratch.keyBase) scratch.keyBase = key.color.clone();
    if (grade > 0) {
      const G = HOUSEHOLD_GRADE;
      frame.scene.environmentIntensity += G.environment * grade;
      if (refs.sky) {
        refs.sky.intensity *= 1 + (G.hemiScale - 1) * grade;
        refs.sky.groundColor.lerp(GRADE_GROUND, grade);
      }
      if (key && scratch.keyBase) {
        key.intensity += G.key * grade;
        key.color.copy(scratch.keyBase).lerp(GRADE_KEY, grade);
      }
      scratch.graded = true;
    } else if (scratch.graded) {
      if (key && scratch.keyBase) key.color.copy(scratch.keyBase);
      scratch.graded = false;
    }

    // Sun: a fixed-direction directional light; with shadows its frustum follows the truck,
    // snapped to shadow-map texels so the shadow edges don't shimmer as the camera moves.
    const light = day.sunLight;
    if (light) {
      light.color.copy(s.sunColor);
      light.intensity = s.sunIntensity;
      const { centre, right, up, worldUp } = scratch;
      if (refs.drive) centre.set(refs.drive.position.x, 0, refs.drive.position.z + TRUCK_LANE_Z);
      else centre.set(0, 0, 0);
      if (sunShadows) {
        right.crossVectors(worldUp, s.lightDir).normalize();
        up.crossVectors(s.lightDir, right);
        const texel = (2 * SHADOW_EXTENT) / SHADOW_MAP;
        const a = centre.dot(right);
        const b = centre.dot(up);
        centre.addScaledVector(right, Math.round(a / texel) * texel - a);
        centre.addScaledVector(up, Math.round(b / texel) * texel - b);
        light.shadow.autoUpdate = s.sunIntensity > 0.01;
      }
      light.target.position.copy(centre);
      light.target.updateMatrixWorld();
      light.position.copy(centre).addScaledVector(s.lightDir, 160);
    }

    // Night lights fade as daylight arrives (bases are today's values → unchanged at sun = 0).
    for (const l of day.lampHeads) l.material.emissiveIntensity = l.base * s.lampHeads;
    for (const w of day.windows) w.material.emissiveIntensity = w.base * s.windows;
    for (const g of day.windowGlow) g.color.setScalar(s.windows);
    for (const sp of day.streetSpots) sp.light.intensity = sp.base * s.lampHeads;
    if (day.skyline) {
      day.skyline.uDots.value = s.skylineDots;
      day.skyline.uTint.value = s.skylineTint;
    }

    // Truck fog beams read as headlights at night, not as solid shafts in daylight.
    for (const beam of refs.beams) if (beam) beam.uniforms.uIntensity.value *= s.beam;
  });

  return null;
}
