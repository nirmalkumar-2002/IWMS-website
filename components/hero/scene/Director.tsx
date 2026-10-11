import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FogExp2, MathUtils, Vector3, type PerspectiveCamera } from 'three';
import type { SceneRefs } from './handles';
import {
  APPROACH_POS,
  APPROACH_TARGET,
  TRUCK_LANE_Z,
  createCameraCurves,
  focalToFov,
  type Rig,
} from './rig';
import {
  SCENE1_END_SEC,
  SCENE1_FOLLOW,
  WHEELBASE,
  createCityCurves,
  driveAt,
  fogDensityAt,
  samplePath,
  type DriveState,
  type PathSample,
} from './route';

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

/** The chase frame trails the truck's heading by this much path, so turns read as a follow. */
const CAMERA_HEADING_LAG = 8;

const damp3 = (v: Vector3, to: Vector3, lambda: number, dt: number) => {
  v.x = MathUtils.damp(v.x, to.x, lambda, dt);
  v.y = MathUtils.damp(v.y, to.y, lambda, dt);
  v.z = MathUtils.damp(v.z, to.z, lambda, dt);
};

/** Truck-local frame (x forward, y up, z = truck's right) anchored on the front axle. */
interface Frame {
  ox: number;
  oz: number;
  hx: number;
  hz: number;
}
const toWorld = (f: Frame, local: Vector3, out: Vector3) =>
  out.set(
    f.ox + f.hx * local.x - f.hz * local.z,
    local.y,
    f.oz + f.hz * local.x + f.hx * local.z,
  );
const toLocal = (f: Frame, world: Vector3, out: Vector3) => {
  const dx = world.x - f.ox;
  const dz = world.z - f.oz;
  return out.set(dx * f.hx + dz * f.hz, world.y, -dx * f.hz + dz * f.hx);
};

/**
 * Applies the rig to the scene every frame. Every output is a pure function of the rig
 * (plus light damping), so scrubbing backwards replays exactly with no accumulated drift.
 *
 * Scene 01 frames the truck in world space. Scene 02 (driveSec past the hand-over, or cityU > 0)
 * frames it in the truck's own frame and damps that local offset, so the camera never lags
 * metres behind a truck doing 38 km/h. At the hand-over both formulations give the same pose.
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
  const cityCurves = useMemo(createCityCurves, []);
  const scratch = useMemo(
    () => ({
      pos: new Vector3(),
      target: new Vector3(),
      followPos: new Vector3(),
      followTarget: new Vector3(),
      look: new Vector3(),
      localPos: new Vector3(),
      localTarget: new Vector3(),
      wantPos: new Vector3(),
      wantTarget: new Vector3(),
      drive: {} as DriveState,
      rear: {} as PathSample,
      lag: {} as PathSample,
      truckFrame: {} as Frame,
      camFrame: {} as Frame,
    }),
    [],
  );
  const settled = useRef(false);
  const inCity = useRef(false);
  const pitch = useRef(0);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const t = state.clock.elapsedTime;
    const camera = state.camera as PerspectiveCamera;
    const s = scratch;
    const drive = driveAt(rig.driveSec, s.drive);

    // Truck pose: the rear axle follows the route; the front axle leads along the heading.
    const rear = samplePath(drive.distance - WHEELBASE, s.rear);
    const tf = s.truckFrame;
    tf.hx = Math.cos(rear.yaw);
    tf.hz = Math.sin(rear.yaw);
    tf.ox = rear.x + tf.hx * WHEELBASE;
    tf.oz = rear.z + tf.hz * WHEELBASE;
    if (refs.drive) {
      refs.drive.position.set(tf.ox, 0, tf.oz - TRUCK_LANE_Z);
      refs.drive.rotation.y = -rear.yaw;
    }
    const truck = refs.truck;
    if (truck) {
      const steer = -Math.atan(WHEELBASE * rear.curvature);
      for (const wheel of truck.wheels) {
        wheel.node.rotation.z = -drive.distance / wheel.radius;
        if (wheel.front) wheel.node.rotation.y = steer;
      }
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

    const city = rig.cityU > 0 || rig.driveSec > SCENE1_END_SEC + 1e-6;
    if (!city) {
      // Scene 01: shot spline + establishing offset, blended into the drive-off tracking camera.
      curves.pos.getPoint(rig.camU, s.pos);
      curves.target.getPoint(rig.camU, s.target);
      s.pos.addScaledVector(APPROACH_POS, rig.approach);
      s.target.addScaledVector(APPROACH_TARGET, rig.approach);
      SCENE1_FOLLOW.pos(drive.distance, s.followPos);
      SCENE1_FOLLOW.target(drive.distance, s.followTarget);
      s.pos.lerp(s.followPos, rig.follow);
      s.target.lerp(s.followTarget, rig.follow);
      if (!still) addHandheld(s.pos, t);

      if (!settled.current || still) {
        camera.position.copy(s.pos);
        s.look.copy(s.target);
        settled.current = true;
      } else {
        damp3(camera.position, s.pos, 4.5, dt);
        damp3(s.look, s.target, 6, dt);
      }
      inCity.current = false;
    } else {
      // Scene 02: truck-relative chase keys, in a frame whose heading lags the truck slightly.
      const lag = samplePath(drive.distance - WHEELBASE - CAMERA_HEADING_LAG, s.lag);
      const cf = s.camFrame;
      cf.ox = tf.ox;
      cf.oz = tf.oz;
      cf.hx = Math.cos(lag.yaw);
      cf.hz = Math.sin(lag.yaw);
      cityCurves.pos.getPoint(rig.cityU, s.wantPos);
      cityCurves.target.getPoint(rig.cityU, s.wantTarget);
      if (!inCity.current || !settled.current) {
        if (settled.current) {
          // Hand-over: continue from wherever the camera actually is (no pop on fast scrolls).
          toLocal(cf, camera.position, s.localPos);
          toLocal(cf, s.look, s.localTarget);
        } else {
          s.localPos.copy(s.wantPos);
          s.localTarget.copy(s.wantTarget);
        }
        inCity.current = true;
        settled.current = true;
      }
      damp3(s.localPos, s.wantPos, 3.2, dt);
      damp3(s.localTarget, s.wantTarget, 4, dt);
      toWorld(cf, s.localPos, camera.position);
      toWorld(cf, s.localTarget, s.look);
      addHandheld(camera.position, t);
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(s.look);

    // Lens: keep roughly the same horizontal framing on portrait screens.
    const aspect = state.size.width / state.size.height;
    const vfov = focalToFov(rig.focal);
    const fit = aspect < 1.5 ? 1.5 / aspect : 1;
    const fov = Math.min(
      80,
      (2 * Math.atan(Math.tan(MathUtils.degToRad(vfov) / 2) * fit) * 180) / Math.PI,
    );
    if (Math.abs(camera.fov - fov) > 1e-3) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // Atmosphere thins toward the city; the sky dome travels with the camera.
    if (state.scene.fog instanceof FogExp2)
      state.scene.fog.density = fogDensityAt(drive.distance);
    refs.skyDome?.position.copy(camera.position);

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

/** Gentle hand-held float, centimetre scale. */
function addHandheld(pos: Vector3, t: number) {
  pos.x += Math.sin(t * 0.61) * 0.018 + Math.sin(t * 1.37) * 0.006;
  pos.y += Math.sin(t * 0.83 + 1.3) * 0.012;
}
