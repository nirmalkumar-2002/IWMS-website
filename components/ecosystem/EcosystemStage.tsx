import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import {
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  Vector3,
  type BufferGeometry,
} from 'three';
import { ECOSYSTEM_BY_ID, ECOSYSTEM_NODES, type EcosystemNodeId } from '@/content/ecosystem';
import { buildDiorama, type Diorama } from './scene/diorama';
import './stage.css';

/**
 * Scene 04 3D city (M3 architecture, M4 interactions). A lazily loaded canvas that renders ON
 * DEMAND only: one frame per selection/resize, frames only while a camera move is running, zero
 * while idle. No post-processing, shadow maps or textures. The overlay (hotspot buttons and SVG
 * connection arcs) is HTML/SVG positioned from projected anchors inside the render callback, so it
 * only updates on frames that actually render.
 */
export interface StageProps {
  quality: 'high' | 'medium';
  selected: EcosystemNodeId;
  /** true = camera focused on the selected zone; false = city overview. */
  focused: boolean;
  /** CSS px on the right of the slot covered by the overlaid info card (frame the city left of it). */
  insetRight?: number;
  onSelect: (id: EcosystemNodeId) => void;
  onReady: () => void;
  onLost: () => void;
}

interface Overlay {
  hotspots: Partial<Record<EcosystemNodeId, HTMLButtonElement | null>>;
  links: (SVGPathElement | null)[];
}

const MAX_LINKS = 7;

export default function EcosystemStage(props: StageProps) {
  const overlay = useRef<Overlay>({ hotspots: {}, links: [] });
  const { selected, onSelect } = props;
  const linked = new Set(ECOSYSTEM_BY_ID[selected].connects);
  return (
    <>
      <Canvas
        className="eco__canvas"
        aria-hidden="true"
        frameloop="demand"
        // No scroll measuring: page scrolling must not queue frames. Resizes are still observed.
        resize={{ scroll: false }}
        dpr={props.quality === 'high' ? [1, 1.5] : [1, 1.25]}
        flat
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
        camera={{ fov: 28, near: 1, far: 800 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            props.onLost();
          });
        }}
      >
        <City {...props} overlay={overlay} />
      </Canvas>
      <div className="eco__overlay" aria-hidden="true">
        <svg className="eco__links">
          {Array.from({ length: MAX_LINKS }, (_, i) => (
            <path key={i} ref={(el) => void (overlay.current.links[i] = el)} />
          ))}
        </svg>
        {ECOSYSTEM_NODES.map((n) => (
          // Mouse/touch shortcut only: out of the tab order and hidden from AT — the module tabs
          // are the accessible control.
          <button
            key={n.id}
            type="button"
            tabIndex={-1}
            className="eco__hotspot"
            data-id={n.id}
            data-kind={n.kind}
            data-state={n.id === selected ? 'selected' : linked.has(n.id) ? 'linked' : 'idle'}
            ref={(el) => void (overlay.current.hotspots[n.id] = el)}
            onClick={() => onSelect(n.id)}
          >
            <span className="eco__hotspot-dot" />
            <span className="eco__hotspot-label">
              {n.number && <span className="eco__hotspot-n">{n.number}</span>}
              <span className="eco__hotspot-text">{n.label}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

const SKY = new Color('#d3dbe8');
const GROUND = new Color('#3b3a36');
const PITCH = (40 * Math.PI) / 180;
const YAW = (-26 * Math.PI) / 180;
const DIR = new Vector3(Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH));
/**
 * Focus distance as a fraction of the overview distance: close enough to read, never a
 * fly-through. Narrow (portrait-ish) stages zoom less so neighbouring zones keep their context.
 */
const focusFactor = (aspect: number) => (aspect < 1.4 ? 0.68 : 0.48);

interface Pose {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
}

function City({
  selected,
  focused,
  insetRight = 0,
  onReady,
  onLost,
  overlay,
}: StageProps & { overlay: MutableRefObject<Overlay> }) {
  const { gl, scene, camera, size, invalidate } = useThree();
  const d = useMemo<Diorama>(() => buildDiorama(), []);
  const materials = useMemo(
    () => ({
      city: new MeshLambertMaterial({ vertexColors: true }),
      outline: new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75 }),
      frame: new MeshBasicMaterial({ vertexColors: true }),
      plate: new MeshBasicMaterial({ color: '#ffa526', transparent: true, opacity: 0.3, depthWrite: false }),
    }),
    [],
  );
  const lights = useMemo(() => {
    const hemi = new HemisphereLight(SKY, GROUND, 1.7);
    const sun = new DirectionalLight('#ffe4c4', 2.15);
    sun.position.set(-60, 95, 45);
    return { hemi, sun };
  }, []);
  const plate = useRef<Mesh>(null);
  const frameMeshes = useRef<Partial<Record<EcosystemNodeId, Mesh | null>>>({});
  const frames = useRef(0);
  /** Current camera pose (tweened); overview distance from the last fit. */
  const pose = useRef<Pose>({ px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0 });
  const fit = useRef({ dist: 0 });
  const mode = useRef({ focused, selected });
  const tmp = useMemo(() => new Vector3(), []);

  const apply = () => {
    const p = pose.current;
    camera.position.set(p.px, p.py, p.pz);
    camera.lookAt(p.tx, p.ty, p.tz);
    camera.updateMatrixWorld();
  };
  const target = (isFocused: boolean, id: EcosystemNodeId): Pose => {
    const c = isFocused ? d.zones[id] : { x: d.center[0], z: d.center[2] };
    const dist = fit.current.dist * (isFocused ? focusFactor(size.width / Math.max(1, size.height)) : 1);
    return {
      px: c.x + DIR.x * dist,
      py: DIR.y * dist,
      pz: c.z + DIR.z * dist,
      tx: c.x,
      ty: 0,
      tz: c.z,
    };
  };

  // Fit the overview to the area left of the info card (portrait aware), then frame it there
  // with a horizontal view offset. Resizes snap to the current pose (no animation).
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    const w = Math.max(1, size.width);
    const h = Math.max(1, size.height);
    const inset = Math.min(insetRight, w * 0.45);
    cam.clearViewOffset();
    cam.aspect = (w - inset) / h;
    cam.updateProjectionMatrix();
    const [hx, hz] = d.extent;
    const corners = [-1, 1].flatMap((sx) =>
      [-1, 1].flatMap((sz) => [-4, 6].map((y) => [d.center[0] + sx * hx, y, d.center[2] + sz * hz])),
    );
    let dist = d.radius * 3;
    for (let i = 0; i < 5; i++) {
      cam.position.set(d.center[0] + DIR.x * dist, DIR.y * dist, d.center[2] + DIR.z * dist);
      cam.lookAt(d.center[0], 0, d.center[2]);
      cam.updateMatrixWorld();
      let m = 0;
      for (const c of corners) {
        tmp.set(c[0], c[1], c[2]).project(cam);
        m = Math.max(m, Math.abs(tmp.x), Math.abs(tmp.y));
      }
      dist *= m / 0.94;
    }
    fit.current.dist = dist;
    cam.aspect = w / h;
    if (inset > 0) cam.setViewOffset(w, h, inset / 2, 0, w, h);
    cam.updateProjectionMatrix();
    gsap.killTweensOf(pose.current);
    Object.assign(pose.current, target(mode.current.focused, mode.current.selected));
    apply();
    invalidate();
    // target/apply only read refs and stable values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size, d, insetRight, invalidate, tmp]);

  // Selection / focus changes: highlight the zone, then one restrained camera move. `overwrite`
  // kills any move still running, so rapid selections never fight; renders only while moving.
  useEffect(() => {
    mode.current = { focused, selected };
    const zone = d.zones[selected];
    const m = plate.current;
    if (m && zone) {
      m.position.set(zone.x, 0.18, zone.z);
      m.scale.set(zone.w, 1, zone.d);
    }
    for (const [id, mesh] of Object.entries(frameMeshes.current)) if (mesh) mesh.visible = id === selected;
    if (!fit.current.dist) {
      invalidate();
      return;
    }
    const to = target(focused, selected);
    const p = pose.current;
    // Already there (first mount, or re-selecting in the overview): no move, one frame.
    if ((Object.keys(to) as (keyof Pose)[]).every((k) => Math.abs(to[k] - p[k]) < 1e-4)) {
      gsap.killTweensOf(p);
      invalidate();
      return;
    }
    gsap.to(p, {
      ...to,
      duration: 0.95,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: () => {
        apply();
        invalidate();
      },
    });
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, focused, d, invalidate]);
  useEffect(() => () => void gsap.killTweensOf(pose.current), []);

  // Overlay: hotspots and the selected module's connections, from the camera of this frame.
  useFrame(() => {
    frames.current++;
    const { hotspots, links } = overlay.current;
    const w = size.width;
    const h = size.height;
    // Visible area: left of the overlaid info card, with a margin so labels are never cut off.
    const right = w - Math.min(insetRight, w * 0.45) - 24;
    const screen = {} as Record<EcosystemNodeId, [number, number, boolean]>;
    for (const n of ECOSYSTEM_NODES) {
      const a = d.anchors[n.id];
      tmp.set(a[0], a[1], a[2]).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w;
      const y = (-tmp.y * 0.5 + 0.5) * h;
      const shown = tmp.z < 1 && x > 24 && x < right && y > 36 && y < h - 8;
      screen[n.id] = [x, y, shown];
      const el = hotspots[n.id];
      if (el) {
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        el.style.visibility = shown ? 'visible' : 'hidden';
      }
    }
    // Connections only while a module is in focus, and only between visible hotspots.
    const sel = mode.current.selected;
    const [sx, sy, selShown] = screen[sel];
    const targets = mode.current.focused && selShown ? ECOSYSTEM_BY_ID[sel].connects : [];
    links.forEach((path, i) => {
      if (!path) return;
      const to = targets[i];
      if (!to || !screen[to][2]) {
        path.setAttribute('d', '');
        return;
      }
      const [tx, ty] = screen[to];
      const mx = (sx + tx) / 2;
      const my = Math.min(sy, ty) - Math.max(24, Math.abs(tx - sx) * 0.18);
      path.setAttribute('d', `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`);
    });
  });

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

  // QA hook (?debug): frames rendered, renderer counters, CPU+GPU bench, camera mode.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    const target = window as unknown as Record<string, unknown>;
    target.__iwmsEco = {
      frames: () => frames.current,
      camera: () => ({ ...pose.current, focused: mode.current.focused, selected: mode.current.selected, tweening: gsap.isTweening(pose.current) }),
      info: () => ({
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? 0,
        bufferBytes: bufferBytes([...d.geometries, d.outlines, ...Object.values(d.frames)]),
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
      for (const g of [...d.geometries, d.outlines, d.highlight, ...Object.values(d.frames)]) g.dispose();
      for (const m of Object.values(materials)) m.dispose();
    },
    [d, materials],
  );

  return (
    <>
      <primitive object={lights.hemi} />
      <primitive object={lights.sun} />
      {d.geometries.map((g, i) => (
        <mesh key={i} geometry={g} material={materials.city} matrixAutoUpdate={false} />
      ))}
      <mesh geometry={d.outlines} material={materials.outline} matrixAutoUpdate={false} renderOrder={1} />
      <mesh ref={plate} geometry={d.highlight} material={materials.plate} renderOrder={2} />
      {ECOSYSTEM_NODES.map((n) => (
        <mesh
          key={n.id}
          ref={(m) => void (frameMeshes.current[n.id] = m)}
          geometry={d.frames[n.id]}
          material={materials.frame}
          visible={n.id === selected}
          matrixAutoUpdate={false}
          renderOrder={3}
        />
      ))}
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
