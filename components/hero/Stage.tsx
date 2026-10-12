import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber';
import {
  HalfFloatType,
  UnsignedByteType,
  Vector3,
  WebGLRenderTarget,
  type Group,
  type Object3D,
} from 'three';
import { useProgress } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import 'lenis/dist/lenis.css';
import { CityLightPool } from './scene/CityLightPool';
import {
  CollectionDirector,
  CollectionHudView,
  createCollectionHud,
  type CollectionHud,
} from './scene/CollectionOverlay';
import { Director } from './scene/Director';
import { SunDirector } from './scene/SunDirector';
import { sunAt } from './scene/sun';
import {
  COLLECT_END_SEC,
  COLLECTION_GATE,
  RESIDENTIAL,
  SCENE2_END_SEC,
  STOP_DISTANCE,
  STOP_SEC,
  WHEELBASE,
  driveAt,
  samplePath,
  type DriveState,
  type PathSample,
} from './scene/route';
import { createSceneRefs, type SceneRefs } from './scene/handles';
import { STILL_SHOT, createRig, focalToFov, SHOTS } from './scene/rig';
import { applyStill, startExperience } from './scene/timeline';
import { Truck } from './scene/Truck';
import { World } from './scene/World';
import type { Quality } from './quality';

// Post-processing ships in its own chunk; only the high tier downloads it.
const Effects = lazy(() =>
  import('./scene/Effects').then((m) => ({ default: m.Effects })),
);

// Scene 02's city is its own chunk, fetched once Scene 01 is on screen.
const City = lazy(() => import('./scene/city/City'));

/**
 * Mounts the city, then compiles its programs off the critical path (KHR_parallel_shader_compile
 * where available) before it is ever drawn, so entering the city never hitches mid-scroll.
 */
function CityMount({ quality, refs }: Pick<StageProps, 'quality'> & { refs: SceneRefs }) {
  const group = useRef<Group>(null);
  // Hidden until compiled; set imperatively so a re-render can never hide it again.
  useLayoutEffect(() => {
    if (group.current) group.current.visible = false;
  }, []);
  return (
    <group ref={group}>
      <Suspense fallback={null}>
        <City quality={quality} refs={refs} />
        <AfterMount
          run={async (gl, camera, scene) => {
            const root = group.current;
            if (!root) return;
            root.visible = true;
            const compiled = gl.compileAsync(root, camera, scene);
            root.visible = false;
            await compiled;
            // Warm-up: draw every city mesh once, unculled, into a tiny target. Geometry and
            // texture uploads (and ANGLE's draw-time shader variants on Windows) happen now,
            // while the canvas is still fading in, instead of as a stall on first sight.
            // ANGLE builds per-output-format shader variants, so match the format the frame
            // is really drawn into: half-float under post-processing (high), 8-bit otherwise.
            const target = new WebGLRenderTarget(64, 64, {
              type: quality === 'high' ? HalfFloatType : UnsignedByteType,
            });
            const unculled: Object3D[] = [];
            root.traverse((o) => {
              if (o.frustumCulled) {
                o.frustumCulled = false;
                unculled.push(o);
              }
            });
            root.visible = true;
            const sunLight = refs.day.sunLight;
            if (sunLight?.castShadow) sunLight.shadow.needsUpdate = true;
            const previous = gl.getRenderTarget();
            gl.setRenderTarget(target);
            gl.render(scene, camera);
            gl.setRenderTarget(previous);
            unculled.forEach((o) => (o.frustumCulled = true));
            target.dispose();
          }}
        />
      </Suspense>
    </group>
  );
}

function AfterMount({
  run,
}: {
  run: (
    gl: RootState['gl'],
    camera: RootState['camera'],
    scene: RootState['scene'],
  ) => Promise<void>;
}) {
  const get = useThree((s) => s.get);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const { gl, camera, scene } = get();
    void run(gl, camera, scene);
  }, [get, run]);
  return null;
}

/** `?debug` exposes read-only hooks for QA (Playwright) and manual profiling. */
function DebugHook({
  rig,
  refs,
  hud,
}: {
  rig: ReturnType<typeof createRig>;
  refs: SceneRefs;
  hud: CollectionHud;
}) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const debug = useRef(false);
  const frame = useRef({ calls: 0, triangles: 0 });
  // Post-processing renders several passes per frame, so accumulate info across the frame.
  useFrame(() => {
    if (!debug.current) return;
    frame.current = { calls: gl.info.render.calls, triangles: gl.info.render.triangles };
    gl.info.reset();
  }, -1);
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    debug.current = true;
    gl.info.autoReset = false;
    const scratch = {} as DriveState;
    const rear = {} as PathSample;
    // Front-axle pose from the pure route maths (what the Director applies), yaw from +X toward +Z.
    const truck = () => {
      const d = driveAt(rig.driveSec, scratch).distance;
      samplePath(d - WHEELBASE, rear);
      return {
        x: rear.x + Math.cos(rear.yaw) * WHEELBASE,
        z: rear.z + Math.sin(rear.yaw) * WHEELBASE,
        yaw: rear.yaw,
        distance: d,
      };
    };
    const target = window as unknown as Record<string, unknown>;
    target.__iwmsHero = {
      rig,
      distance: () => driveAt(rig.driveSec, scratch).distance,
      camera: () => camera.position.toArray(),
      truck,
      /** Rendered truck root (world), to cross-check the scene graph against the route. */
      truckWorld: () => {
        const drive = refs.drive;
        if (!drive) return null;
        const p = drive.getWorldPosition(drive.position.clone());
        return { x: p.x, z: p.z, yaw: -drive.rotation.y };
      },
      geometry: () => ({ residentialAxisX: RESIDENTIAL.axisX }),
      /** Phase 2.2: sunrise state as applied this frame (progress is a pure function of distance). */
      sun: () => {
        const d = driveAt(rig.driveSec, scratch).distance;
        const sky = refs.day.sky;
        return {
          distance: d,
          expected: sunAt(d),
          progress: refs.day.progress,
          sunLight: refs.day.sunLight?.intensity ?? 0,
          hemisphere: refs.sky?.intensity ?? 0,
          zenith: sky ? (sky.uZenith.value as { getHexString(): string }).getHexString() : null,
          lampHeads: refs.day.lampHeads.map((l) => l.material.emissiveIntensity),
        };
      },
      /** Phase 3.1: collection stop, digital-layer progress, and overlay anchors vs projection. */
      collection: () => {
        const wheel = refs.truck?.wheels[0];
        const size = gl.domElement.getBoundingClientRect();
        camera.updateMatrixWorld();
        const v = new Vector3();
        return {
          collectU: rig.collectU,
          pin: rig.pin,
          gps: rig.gps,
          route: rig.route,
          net: rig.net,
          stopDistance: STOP_DISTANCE,
          stopSec: STOP_SEC,
          collectEndSec: COLLECT_END_SEC,
          scene2EndSec: SCENE2_END_SEC,
          gate: { x: COLLECTION_GATE.x, z: COLLECTION_GATE.z },
          wheel: wheel ? { spin: wheel.node.rotation.z, radius: wheel.radius } : null,
          anchors: hud.anchors().map(({ id, world }) => {
            v.set(...world).applyMatrix4(camera.matrixWorldInverse);
            const visible = v.z < -camera.near;
            v.applyMatrix4(camera.projectionMatrix);
            return {
              id,
              expected: {
                x: (v.x * 0.5 + 0.5) * size.width,
                y: (-v.y * 0.5 + 0.5) * size.height,
                visible,
              },
              rendered: hud.rendered[id] ?? { x: NaN, y: NaN, opacity: 0 },
            };
          }),
        };
      },
      info: () => ({
        calls: frame.current.calls,
        triangles: frame.current.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? 0,
      }),
    };
    return () => {
      debug.current = false;
      gl.info.autoReset = true;
      delete target.__iwmsHero;
    };
  }, [rig, refs, hud, gl, camera]);
  return null;
}

export interface StageProps {
  quality: Exclude<Quality, 'poster'>;
  still: boolean;
  section: HTMLElement;
  onReady: () => void;
  onFail: () => void;
}

/** Fires once the scene has mounted and two frames have been presented (shaders compiled). */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const invalidate = useThree((s) => s.invalidate);
  const callback = useRef(onReady);
  const fired = useRef(false);
  useEffect(() => {
    callback.current = onReady;
  });
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      invalidate();
      frame = requestAnimationFrame(() => {
        invalidate();
        if (fired.current) return;
        fired.current = true;
        callback.current();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [invalidate]);
  return null;
}

function LoadingLine() {
  const { progress, active } = useProgress();
  return (
    <div className="hero__loader" data-active={active} aria-hidden="true">
      <span style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  );
}

export default function Stage({ quality, still, section, onReady, onFail }: StageProps) {
  // Real-time sun shadows only where the GPU budget allows (decided from Phase 2.2 measurements).
  const sunShadows = quality === 'high' && !still;
  const [rig] = useState(() => {
    const initial = createRig();
    if (still) applyStill(initial, STILL_SHOT);
    return initial;
  });
  const [refs] = useState(createSceneRefs);
  const [hud] = useState(createCollectionHud);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || still) return;
    const copy = {
      words: [...section.querySelectorAll<HTMLElement>('.hero__word')],
      subtitle: section.querySelector<HTMLElement>('.hero__subtitle')!,
      city: [...section.querySelectorAll<HTMLElement>('.hero__city-line')],
    };
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    return startExperience(rig, section, copy);
  }, [ready, still, rig, section]);

  return (
    <>
      <Canvas
        className="hero__canvas"
        dpr={quality === 'high' ? [1, 1.75] : [1, 1.25]}
        frameloop={still ? 'demand' : 'always'}
        shadows={sunShadows ? 'percentage' : false}
        gl={{
          antialias: quality !== 'high',
          powerPreference: 'high-performance',
          stencil: false,
          toneMapping: ACESFilmicToneMapping,
        }}
        camera={{ fov: focalToFov(SHOTS[0].focal), near: 0.25, far: 1600 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            onFail();
          });
        }}
      >
        <Suspense fallback={null}>
          <World quality={quality} refs={refs} sunShadows={sunShadows} />
          <Truck refs={refs} />
          <Director rig={rig} refs={refs} still={still} />
          <SunDirector rig={rig} refs={refs} still={still} sunShadows={sunShadows} />
          {!still && <CityLightPool refs={refs} count={quality === 'high' ? 3 : 2} />}
          {!still && <CollectionDirector rig={rig} hud={hud} />}
          <DebugHook rig={rig} refs={refs} hud={hud} />
          {quality === 'high' && <Effects />}
          <ReadySignal
            onReady={() => {
              setReady(true);
              onReady();
            }}
          />
        </Suspense>
        {ready && !still && <CityMount quality={quality} refs={refs} />}
      </Canvas>
      {!still && <CollectionHudView hud={hud} />}
      <LoadingLine />
      {!__TRUCK_MODEL__ && (
        <p className="hero__proxy-note">
          Development proxy vehicle — final licensed truck model pending
        </p>
      )}
    </>
  );
}
