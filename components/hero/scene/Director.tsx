import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import type { SceneRefs } from './handles';
import {
  APPROACH_POS,
  APPROACH_TARGET,
  TRUCK_LANE_Z,
  createCameraCurves,
  driveState,
  focalToFov,
  type Rig,
} from './rig';

/** Peak values (physical units: candela for spots/points, unitless emissive scale for lenses). */
const PEAK = {
  headSpot: 240,
  headLens: 6,
  beam: 0.2,
  marker: 5,
  markerGlow: 1.6,
  tail: 3.2,
  tailGlow: 2.2,
  bounce: 26,
  skyBase: 0.5,
  skyDawn: 0.45,
  fillBase: 0.06,
  fillDawn: 0.55,
};

const damp3 = (v: Vector3, to: Vector3, lambda: number, dt: number) => {
  v.x = MathUtils.damp(v.x, to.x, lambda, dt);
  v.y = MathUtils.damp(v.y, to.y, lambda, dt);
  v.z = MathUtils.damp(v.z, to.z, lambda, dt);
};

/**
 * Applies the rig to the scene every frame. Every output is a pure function of the rig
 * (plus light damping), so scrubbing backwards replays exactly with no accumulated drift.
 */
export function Director({
  rig,
  refs,
  still,
}: {
  rig: Rig;
  refs: SceneRefs;
  still: boolean;
}) {
  const curves = useMemo(createCameraCurves, []);
  const scratch = useMemo(
    () => ({
      pos: new Vector3(),
      target: new Vector3(),
      followPos: new Vector3(),
      followTarget: new Vector3(),
      look: new Vector3(),
    }),
    [],
  );
  const settled = useRef(false);
  const pitch = useRef(0);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const t = state.clock.elapsedTime;
    const camera = state.camera as PerspectiveCamera;
    const drive = driveState(rig.driveT);
    const { pos, target, followPos, followTarget, look } = scratch;

    // Truck: translation, wheel spin from distance travelled, squat under acceleration.
    if (refs.drive) refs.drive.position.x = drive.distance;
    const truck = refs.truck;
    if (truck) {
      for (const wheel of truck.wheels)
        wheel.node.rotation.z = -drive.distance / wheel.radius;
      pitch.current = still
        ? 0
        : MathUtils.damp(pitch.current, drive.accel * 0.0045, 3, dt);
      truck.body.rotation.z = pitch.current;
      // Diesel idle shimmer, plus road texture once rolling. Millimetre scale.
      const rolling = Math.min(1, drive.speed / 3);
      truck.body.position.y = still
        ? 0
        : Math.sin(t * 29) * 0.0005 + Math.sin(t * 6.7) * 0.0018 * rolling;
    }

    // Camera: shot spline + establishing offset, blended into the drive-off tracking camera.
    curves.pos.getPoint(rig.camU, pos);
    curves.target.getPoint(rig.camU, target);
    pos.addScaledVector(APPROACH_POS, rig.approach);
    target.addScaledVector(APPROACH_TARGET, rig.approach);
    followPos.set(drive.distance * 0.78 - 15.5, 1.45, 8.2);
    followTarget.set(drive.distance + 1.5, 1.55, TRUCK_LANE_Z);
    pos.lerp(followPos, rig.follow);
    target.lerp(followTarget, rig.follow);
    if (!still) {
      // Gentle hand-held float, centimetre scale.
      pos.x += Math.sin(t * 0.61) * 0.018 + Math.sin(t * 1.37) * 0.006;
      pos.y += Math.sin(t * 0.83 + 1.3) * 0.012;
    }

    if (!settled.current || still) {
      camera.position.copy(pos);
      look.copy(target);
      settled.current = true;
    } else {
      damp3(camera.position, pos, 4.5, dt);
      damp3(look, target, 6, dt);
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(look);

    // Lens: keep roughly the same horizontal framing on portrait screens.
    const aspect = state.size.width / state.size.height;
    const vfov = focalToFov(rig.focal);
    const fit = aspect < 1.5 ? (1.5 / aspect) : 1;
    const fov = Math.min(
      80,
      (2 * Math.atan(Math.tan(MathUtils.degToRad(vfov) / 2) * fit) * 180) / Math.PI,
    );
    if (Math.abs(camera.fov - fov) > 1e-3) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // Lamps: one value per lamp drives lens emission, real light and fog beam together.
    if (truck) {
      truck.headlightLenses[0].emissiveIntensity = PEAK.headLens * rig.headL;
      truck.headlightLenses[1].emissiveIntensity = PEAK.headLens * rig.headR;
      for (const m of truck.markerLenses) m.emissiveIntensity = PEAK.marker * rig.marker;
      for (const m of truck.tailLenses) m.emissiveIntensity = PEAK.tail * rig.tail;
    }
    const heads = [rig.headL, rig.headR];
    refs.headSpots.forEach((spot, i) => {
      if (spot) spot.intensity = PEAK.headSpot * heads[i];
    });
    refs.beams.forEach((beam, i) => {
      if (beam) beam.uniforms.uIntensity.value = PEAK.beam * rig.beam * Math.min(1, heads[i]);
    });
    if (refs.markerGlow) refs.markerGlow.intensity = PEAK.markerGlow * rig.marker;
    if (refs.tailGlow) refs.tailGlow.intensity = PEAK.tailGlow * rig.tail;
    if (refs.bounce) refs.bounce.intensity = PEAK.bounce * (rig.headL + rig.headR) * 0.5;
    if (refs.sky) refs.sky.intensity = PEAK.skyBase + PEAK.skyDawn * rig.dawn;
    if (refs.fill) refs.fill.intensity = PEAK.fillBase + PEAK.fillDawn * rig.dawn;
  });

  return null;
}
