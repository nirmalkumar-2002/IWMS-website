import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  type BufferGeometry,
} from 'three';
import type { EcosystemNodeId } from '@/content/ecosystem';
import { buildDiorama, type Diorama } from './scene/diorama';

/**
 * Scene 04 3D slot (M3): a lazily loaded, separately mounted canvas that renders ON DEMAND only —
 * one frame at mount and one per selection or resize, zero frames while idle. No post-processing,
 * no shadow maps, no textures: everything is vertex-coloured Lambert geometry merged into a few
 * draw calls. Labels, cards and connections stay in HTML (EcosystemSection).
 */
export interface StageProps {
  quality: 'high' | 'medium';
  selected: EcosystemNodeId;
  onReady: () => void;
  onLost: () => void;
  /** Projected screen positions of node anchors (CSS px in the stage box), for HTML labels. */
  onAnchors: (a: Record<EcosystemNodeId, { x: number; y: number }>) => void;
}

export default function EcosystemStage({ quality, selected, onReady, onLost, onAnchors }: StageProps) {
  return (
    <Canvas
      className="eco__canvas"
      aria-hidden="true"
      frameloop="demand"
      // No scroll measuring: the city uses no R3F pointer events, so page scrolling must not
      // queue frames. Real resizes are still observed.
      resize={{ scroll: false }}
      dpr={quality === 'high' ? [1, 1.5] : [1, 1.25]}
      flat
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 28, near: 1, far: 600 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          onLost();
        });
      }}
    >
      <City selected={selected} onReady={onReady} onLost={onLost} onAnchors={onAnchors} />
    </Canvas>
  );
}

const SKY = new Color('#c9d3e2');
const GROUND = new Color('#3a3a36');

function City({
  selected,
  onReady,
  onLost,
  onAnchors,
}: Pick<StageProps, 'selected' | 'onReady' | 'onLost' | 'onAnchors'>) {
  const { gl, scene, camera, size, invalidate } = useThree();
  const d = useMemo<Diorama>(() => buildDiorama(), []);
  const material = useMemo(() => new MeshLambertMaterial({ vertexColors: true }), []);
  const highlight = useRef<Mesh>(null);
  const frames = useRef(0);

  // Lights: soft morning sky + one warm low sun, no shadow maps (contact shading is baked).
  const lights = useMemo(() => {
    const hemi = new HemisphereLight(SKY, GROUND, 1.55);
    const sun = new DirectionalLight('#ffe2bf', 1.9);
    sun.position.set(-60, 90, 40);
    return { hemi, sun };
  }, []);

  // Fit the fixed overview camera to the island for the current aspect (portrait aware): a few
  // passes project the island's corners and scale the distance until they fill ~92% of the view.
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    cam.aspect = size.width / Math.max(1, size.height);
    cam.updateProjectionMatrix();
    const pitch = (38 * Math.PI) / 180;
    const yaw = (-26 * Math.PI) / 180;
    const dir = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    const [hx, hz] = d.extent;
    const corners = [-1, 1].flatMap((sx) =>
      [-1, 1].flatMap((sz) => [-4, 4].map((y) => [d.center[0] + sx * hx, y, d.center[2] + sz * hz])),
    );
    const v = cam.position.clone();
    let dist = d.radius * 3;
    for (let i = 0; i < 4; i++) {
      cam.position.set(d.center[0] + dir[0] * dist, dir[1] * dist, d.center[2] + dir[2] * dist);
      cam.lookAt(d.center[0], 0, d.center[2]);
      cam.updateMatrixWorld();
      let m = 0;
      for (const c of corners) {
        v.set(c[0], c[1], c[2]).project(cam);
        m = Math.max(m, Math.abs(v.x), Math.abs(v.y));
      }
      dist *= m / 0.92;
    }
    cam.position.set(d.center[0] + dir[0] * dist, dir[1] * dist, d.center[2] + dir[2] * dist);
    cam.lookAt(d.center[0], 0, d.center[2]);
    cam.updateMatrixWorld();
    // Project node anchors for the HTML labels (only on layout changes — never per frame).
    const out = {} as Record<EcosystemNodeId, { x: number; y: number }>;
    for (const [id, p] of Object.entries(d.anchors) as [EcosystemNodeId, [number, number, number]][]) {
      v.set(p[0], p[1], p[2]).project(cam);
      out[id] = { x: (v.x * 0.5 + 0.5) * size.width, y: (-v.y * 0.5 + 0.5) * size.height };
    }
    onAnchors(out);
    invalidate();
  }, [camera, size, d, onAnchors, invalidate]);

  // Selection highlight: one shared plate moved under the selected zone (no material change).
  useEffect(() => {
    const zone = d.zones[selected];
    const m = highlight.current;
    if (!m || !zone) return;
    m.position.set(zone.x, 0.16, zone.z);
    m.scale.set(zone.w, 1, zone.d);
    invalidate();
  }, [selected, d, invalidate]);

  // Compile before the first visible frame, then report ready.
  useEffect(() => {
    let live = true;
    gl.compileAsync(scene, camera)
      .then(() => {
        if (!live) return;
        invalidate();
        requestAnimationFrame(() => live && onReady());
      })
      .catch(() => live && onLost());
    return () => {
      live = false;
    };
  }, [gl, scene, camera, invalidate, onReady, onLost]);

  // QA hook (?debug): frames rendered, renderer counters, estimated buffer bytes.
  useFrame(() => {
    frames.current++;
  });
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    const target = window as unknown as Record<string, unknown>;
    target.__iwmsEco = {
      frames: () => frames.current,
      info: () => ({
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? 0,
        bufferBytes: bufferBytes(d.geometries),
        contextLost: gl.getContext().isContextLost(),
        drawingBuffer: [gl.getContext().drawingBufferWidth, gl.getContext().drawingBufferHeight],
      }),
      /** QA only: render n frames synchronously, each waited for with gl.finish() (CPU+GPU). */
      bench: (n = 30) => {
        const ctx = gl.getContext();
        const times: number[] = [];
        for (let i = 0; i < n; i++) {
          const t0 = performance.now();
          gl.render(scene, camera);
          ctx.finish();
          times.push(performance.now() - t0);
        }
        times.sort((x, y) => x - y);
        return { median: times[n >> 1], p95: times[Math.floor(n * 0.95)], max: times[n - 1] };
      },
    };
    return () => {
      delete target.__iwmsEco;
    };
  }, [gl, d, scene, camera]);

  useEffect(
    () => () => {
      for (const g of d.geometries) g.dispose();
      material.dispose();
    },
    [d, material],
  );

  return (
    <>
      <primitive object={lights.hemi} />
      <primitive object={lights.sun} />
      {d.geometries.map((g, i) => (
        <mesh key={i} geometry={g} material={material} matrixAutoUpdate={false} />
      ))}
      <mesh ref={highlight} geometry={d.highlight} renderOrder={1}>
        <meshBasicMaterial color="#ffa526" transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </>
  );
}

function bufferBytes(geoms: BufferGeometry[]) {
  let n = 0;
  for (const g of geoms) {
    for (const a of Object.values(g.attributes)) n += (a.array as ArrayLike<number> & { byteLength: number }).byteLength;
    if (g.index) n += (g.index.array as ArrayLike<number> & { byteLength: number }).byteLength;
  }
  return n;
}
