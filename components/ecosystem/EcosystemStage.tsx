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
 * Scene 04 3D city (M3 architecture, M4/M4.1 interactions). A lazily loaded canvas that renders
 * ON DEMAND only: one frame per selection/resize, frames only while a camera move is running,
 * zero while idle. No post-processing, shadow maps or textures. The overlay (hotspot buttons and
 * SVG connection arcs) is HTML/SVG positioned from projected anchors inside the render callback,
 * so it only updates on frames that actually render.
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PopupPlacement {
  /** Top-left of the popup in slot CSS px (clamped inside the slot, clear of the selected zone). */
  x: number;
  y: number;
  /** Which side of the selected zone the popup sits on. */
  side: 'left' | 'right';
}

export interface StageProps {
  quality: 'high' | 'medium';
  selected: EcosystemNodeId;
  /** true = camera focused on the selected zone; false = city overview. */
  focused: boolean;
  /**
   * Other UI overlaid on the slot (hint chip, overview button), in CSS px relative to the slot's
   * top-left. Hotspots are kept out of them; they never move the camera.
   */
  obstacles?: ReadonlyArray<Rect>;
  /**
   * Size of the floating popup (CSS px) where one is floated; null = none (phones). While
   * focused, the camera keeps a column free for it beside the zone (from its width only).
   */
  popupSize?: { w: number; h: number } | null;
  /** Whether the popup is shown: hotspots avoid it only while open. */
  popupOpen?: boolean;
  /**
   * Where the popup goes, computed from the camera's TARGET pose (so it is known as the move
   * starts). Called on selection, focus, popup size and viewport changes; null = no popup.
   */
  onPopupPlace?: (p: PopupPlacement | null) => void;
  onSelect: (id: EcosystemNodeId) => void;
  onReady: () => void;
  onLost: () => void;
}

interface Overlay {
  hotspots: Partial<Record<EcosystemNodeId, HTMLButtonElement | null>>;
  labels: Partial<Record<EcosystemNodeId, HTMLSpanElement | null>>;
  links: (SVGPathElement | null)[];
}

const MAX_LINKS = 7;

export default function EcosystemStage(props: StageProps) {
  const overlay = useRef<Overlay>({ hotspots: {}, labels: {}, links: [] });
  const { selected, focused, onSelect } = props;
  const linked = new Set(focused ? ECOSYSTEM_BY_ID[selected].connects : []);
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
            <span className="eco__hotspot-label" ref={(el) => void (overlay.current.labels[n.id] = el)}>
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
/** Focus distance limits as fractions of the overview distance: readable, never a fly-through. */
const FOCUS_MIN = 0.4;
const FOCUS_MAX = 0.78;
/** Margin (world units) kept around the selected zone so its surroundings stay in frame. */
const ZONE_MARGIN = 12;
/** Fraction of the free area the focused zone (with margin) may fill. */
const ZONE_FILL = 0.8;
/** Hotspot geometry (CSS px, keep in sync with stage.css): dot radius and dot↔label gap. */
const DOT = 7;
const LABEL_GAP = 9;
/** Keep hotspots clear of the slot edges and its corner brackets. */
const EDGE = 14;
/** Popup clearance (CSS px) from the slot edges and from the selected zone. */
const POP_EDGE = 16;
const POP_GAP = 24;

interface Pose {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
  /** View offset (CSS px) that moves the look-at point into the free area. */
  ox: number;
  oy: number;
}
type Box = { l: number; t: number; r: number; b: number };

const hit = (a: Box, b: Box) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

function City({
  selected,
  focused,
  obstacles,
  popupSize,
  popupOpen = false,
  onPopupPlace,
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
  const pose = useRef<Pose>({ px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, ox: 0, oy: 0 });
  const fit = useRef({ dist: 0 });
  const mode = useRef({ focused, selected });
  // Obstacles by value: a new array with the same rectangles must not reframe the camera.
  const obsKey = JSON.stringify(obstacles ?? []);
  const obs = useRef<ReadonlyArray<Rect>>([]);
  obs.current = useMemo(() => JSON.parse(obsKey) as Rect[], [obsKey]);
  /** Hotspot label sizes, re-measured (one layout read) on the next frame after a change. */
  const labelSize = useRef({ dirty: true, sizes: {} as Partial<Record<EcosystemNodeId, [number, number]>> });
  const tmp = useMemo(() => new Vector3(), []);
  const scratch = useMemo(() => new PerspectiveCamera(28, 1, 1, 800), []);
  // Popup: its width drives the camera (stable per breakpoint); its height only its placement.
  const popW = popupSize ? Math.round(popupSize.w) : 0;
  const popH = popupSize ? Math.round(popupSize.h) : 0;
  const pop = useRef({ w: 0, h: 0, open: false, rect: null as Box | null, last: '' });
  pop.current.w = popW;
  pop.current.h = popH;
  pop.current.open = popupOpen;
  const placeCb = useRef(onPopupPlace);
  placeCb.current = onPopupPlace;

  /** Side of the zone the popup takes: towards the island centre, i.e. the side with more city. */
  const popupSide = (id: EcosystemNodeId): 'left' | 'right' => (d.zones[id].x <= d.center[0] ? 'right' : 'left');
  /** Area the focused zone is framed in: the slot minus the popup's column (if any). */
  const focusArea = (w: number, h: number, id: EcosystemNodeId): Box => {
    const col = pop.current.w ? pop.current.w + POP_EDGE + POP_GAP : 0;
    if (!col || col > w * 0.5) return { l: 0, t: 0, r: w, b: h };
    return popupSide(id) === 'right' ? { l: 0, t: 0, r: w - col, b: h } : { l: col, t: 0, r: w, b: h };
  };
  /** Popup placement for a pose: beside the zone's projected footprint, clamped in the slot. */
  const placement = (to: Pose, id: EcosystemNodeId): PopupPlacement | null => {
    const { w: pw, h: ph } = pop.current;
    if (!mode.current.focused || !pw || !ph) return null;
    const w = Math.max(1, size.width);
    const h = Math.max(1, size.height);
    scratch.aspect = w / h;
    scratch.position.set(to.px, to.py, to.pz);
    scratch.lookAt(to.tx, to.ty, to.tz);
    scratch.updateMatrixWorld();
    scratch.setViewOffset(w, h, to.ox, to.oy, w, h);
    scratch.updateProjectionMatrix();
    const z = d.zones[id];
    const top = d.anchors[id][1];
    const box: Box = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        for (const y of [0, top]) {
          tmp.set(z.x + (sx * z.w) / 2, y, z.z + (sz * z.d) / 2).project(scratch);
          const x = (tmp.x * 0.5 + 0.5) * w;
          const yy = (-tmp.y * 0.5 + 0.5) * h;
          box.l = Math.min(box.l, x);
          box.r = Math.max(box.r, x);
          box.t = Math.min(box.t, yy);
          box.b = Math.max(box.b, yy);
        }
    scratch.clearViewOffset();
    const side = popupSide(id);
    const clampX = (x: number) => Math.max(POP_EDGE, Math.min(w - pw - POP_EDGE, x));
    const clampY = (y: number) => Math.max(POP_EDGE, Math.min(h - ph - POP_EDGE, y));
    const x = clampX(side === 'right' ? box.r + POP_GAP : box.l - POP_GAP - pw);
    let y = clampY((box.t + box.b) / 2 - ph / 2);
    // Step below any overlaid control it would cover (e.g. the overview button).
    for (const o of obs.current)
      if (hit({ l: x, t: y, r: x + pw, b: y + ph }, { l: o.x - 8, t: o.y - 8, r: o.x + o.w + 8, b: o.y + o.h + 8 }))
        y = clampY(o.y + o.h + 8);
    return { x: Math.round(x), y: Math.round(y), side };
  };
  /** Publish the popup placement for a target pose (deduplicated); keep its rect for hotspots. */
  const publish = (to: Pose | null) => {
    const p = to ? placement(to, mode.current.selected) : null;
    pop.current.rect = p ? { l: p.x, t: p.y, r: p.x + pop.current.w, b: p.y + pop.current.h } : null;
    const key = JSON.stringify(p);
    if (key === pop.current.last) return;
    pop.current.last = key;
    placeCb.current?.(p);
  };

  const apply = () => {
    const p = pose.current;
    const cam = camera as PerspectiveCamera;
    cam.position.set(p.px, p.py, p.pz);
    cam.lookAt(p.tx, p.ty, p.tz);
    cam.updateMatrixWorld();
    const w = Math.max(1, size.width);
    const h = Math.max(1, size.height);
    if (Math.abs(p.ox) > 0.01 || Math.abs(p.oy) > 0.01) cam.setViewOffset(w, h, p.ox, p.oy, w, h);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  };

  /** Place the scratch camera at distance `dist` from look-at (x, 0, z), aspect of the slot. */
  const placeScratch = (x: number, z: number, dist: number) => {
    scratch.position.set(x + DIR.x * dist, DIR.y * dist, z + DIR.z * dist);
    scratch.lookAt(x, 0, z);
    scratch.updateMatrixWorld();
  };

  const target = (isFocused: boolean, id: EcosystemNodeId): Pose => {
    const w = Math.max(1, size.width);
    const h = Math.max(1, size.height);
    if (!isFocused) {
      const dist = fit.current.dist;
      const [cx, , cz] = d.center;
      return { px: cx + DIR.x * dist, py: DIR.y * dist, pz: cz + DIR.z * dist, tx: cx, ty: 0, tz: cz, ox: 0, oy: 0 };
    }
    // Focus: fit the selected zone plus a margin into the area left beside the popup's column
    // (if a popup is floated), then shift the view so the zone sits at the centre of that area.
    const z = d.zones[id];
    const top = d.anchors[id][1];
    const free = focusArea(w, h, id);
    const fw = Math.max(80, free.r - free.l);
    const fh = Math.max(80, free.b - free.t);
    const hx = z.w / 2 + ZONE_MARGIN;
    const hz = z.d / 2 + ZONE_MARGIN;
    const corners = [-1, 1].flatMap((sx) => [-1, 1].flatMap((sz) => [0, top].map((y) => [z.x + sx * hx, y, z.z + sz * hz])));
    scratch.aspect = w / h;
    scratch.updateProjectionMatrix();
    let dist = fit.current.dist * 0.5;
    for (let i = 0; i < 5; i++) {
      placeScratch(z.x, z.z, dist);
      let m = 0;
      for (const c of corners) {
        tmp.set(c[0], c[1], c[2]).project(scratch);
        m = Math.max(m, Math.abs(tmp.x * w) / fw, Math.abs(tmp.y * h) / fh);
      }
      dist *= m / ZONE_FILL;
    }
    dist = Math.min(fit.current.dist * FOCUS_MAX, Math.max(fit.current.dist * FOCUS_MIN, dist));
    return {
      px: z.x + DIR.x * dist,
      py: DIR.y * dist,
      pz: z.z + DIR.z * dist,
      tx: z.x,
      ty: 0,
      tz: z.z,
      ox: Math.round(w / 2 - (free.l + free.r) / 2),
      oy: Math.round(h / 2 - (free.t + free.b) / 2),
    };
  };

  // Fit the overview to the whole slot (portrait aware). Resizes snap to the current pose.
  useEffect(() => {
    const w = Math.max(1, size.width);
    const h = Math.max(1, size.height);
    scratch.aspect = w / h;
    scratch.updateProjectionMatrix();
    const [hx, hz] = d.extent;
    const corners = [-1, 1].flatMap((sx) =>
      [-1, 1].flatMap((sz) => [-4, 6].map((y) => [d.center[0] + sx * hx, y, d.center[2] + sz * hz])),
    );
    let dist = d.radius * 3;
    for (let i = 0; i < 5; i++) {
      placeScratch(d.center[0], d.center[2], dist);
      let m = 0;
      for (const c of corners) {
        tmp.set(c[0], c[1], c[2]).project(scratch);
        m = Math.max(m, Math.abs(tmp.x), Math.abs(tmp.y));
      }
      dist *= m / 0.95;
    }
    fit.current.dist = dist;
    (camera as PerspectiveCamera).aspect = w / h;
    gsap.killTweensOf(pose.current);
    Object.assign(pose.current, target(mode.current.focused, mode.current.selected));
    apply();
    publish({ ...pose.current });
    labelSize.current.dirty = true;
    invalidate();
    // target/apply/placeScratch/publish only read refs and stable values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size, d, invalidate, tmp, scratch]);

  // Selection / focus / overlay changes: highlight the zone, then one restrained camera move.
  // `overwrite` kills any move still running, so rapid selections never fight; renders only
  // while moving.
  useEffect(() => {
    mode.current = { focused, selected };
    labelSize.current.dirty = true;
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
    publish(to);
    const p = pose.current;
    // Already there (first mount, re-selecting in the overview, an overlay change while in the
    // overview): no move, one frame.
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
  }, [selected, focused, popW, d, invalidate]);

  // Popup height, visibility or overlaid controls changed: re-place the popup (the camera does
  // not move) and re-run the hotspot layout once.
  useEffect(() => {
    if (fit.current.dist) publish(target(mode.current.focused, mode.current.selected));
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popH, popupOpen, obsKey, invalidate]);
  useEffect(() => () => void gsap.killTweensOf(pose.current), []);

  // Overlay: hotspots (placed by priority, kept inside the slot and clear of the overlaid UI and
  // of each other) and the focused module's connections, from the camera of this frame.
  useFrame(() => {
    frames.current++;
    const { hotspots, labels, links } = overlay.current;
    const w = size.width;
    const h = size.height;
    const ls = labelSize.current;
    if (ls.dirty) {
      // All reads before any writes: at most one layout per rendered frame, only after a change.
      for (const n of ECOSYSTEM_NODES) {
        const el = labels[n.id];
        if (el) ls.sizes[n.id] = [el.offsetWidth, el.offsetHeight];
      }
      ls.dirty = false;
    }
    const { selected: sel, focused: isFocused } = mode.current;
    const connects = isFocused ? ECOSYSTEM_BY_ID[sel].connects : [];
    const order: EcosystemNodeId[] = [sel, ...connects.filter((id) => id !== sel)];
    for (const n of ECOSYSTEM_NODES) if (!order.includes(n.id)) order.push(n.id);
    const taken: Box[] = obs.current.map((o) => ({ l: o.x - 4, t: o.y - 4, r: o.x + o.w + 4, b: o.y + o.h + 4 }));
    const pr = pop.current.open ? pop.current.rect : null;
    if (pr) taken.push({ l: pr.l - 6, t: pr.t - 6, r: pr.r + 6, b: pr.b + 6 });
    const shown = {} as Record<EcosystemNodeId, [number, number] | null>;
    for (const id of order) {
      const el = hotspots[id];
      const label = labels[id];
      const a = d.anchors[id];
      tmp.set(a[0], a[1], a[2]).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w;
      const y = (-tmp.y * 0.5 + 0.5) * h;
      const dot: Box = { l: x - DOT, t: y - DOT, r: x + DOT, b: y + DOT };
      let place: { flip: boolean; dx: number } | null = null;
      if (tmp.z < 1 && dot.l >= EDGE && dot.r <= w - EDGE && dot.t >= EDGE && dot.b <= h - EDGE && !taken.some((b) => hit(b, dot))) {
        const [lw, lh] = ls.sizes[id] ?? [0, 0];
        // Keep the label inside the slot horizontally (slide it, the dot stays on its anchor).
        const left = x - lw / 2;
        const dx = Math.max(EDGE - left, Math.min(0, w - EDGE - (left + lw)));
        const above: Box = { l: left + dx, t: y - LABEL_GAP - lh, r: left + dx + lw, b: y - LABEL_GAP };
        const below: Box = { l: left + dx, t: y + LABEL_GAP, r: left + dx + lw, b: y + LABEL_GAP + lh };
        const fits = (b: Box) => b.t >= EDGE && b.b <= h - EDGE;
        const free = (b: Box) => fits(b) && !taken.some((t) => hit(t, b));
        if (free(above)) place = { flip: false, dx };
        else if (free(below)) place = { flip: true, dx };
        else if (id === sel) place = { flip: !fits(above), dx }; // the selection is always labelled
        if (place) {
          taken.push(dot, place.flip ? below : above);
        }
      }
      shown[id] = place ? [x, y] : null;
      if (el) {
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        el.style.visibility = place ? 'visible' : 'hidden';
        const flip = place?.flip ? 'true' : 'false';
        if (el.dataset.flip !== flip) el.dataset.flip = flip;
      }
      if (label && place) label.style.transform = place.dx ? `translateX(${place.dx.toFixed(1)}px)` : '';
    }
    // Connections only while a module is in focus, and only between visible hotspots.
    const from = shown[sel];
    const targets = from ? connects : [];
    links.forEach((path, i) => {
      if (!path) return;
      const to = targets[i] ? shown[targets[i]] : null;
      if (!from || !to) {
        path.setAttribute('d', '');
        return;
      }
      const [sx, sy] = from;
      const [tx, ty] = to;
      const mx = (sx + tx) / 2;
      const my = Math.max(EDGE, Math.min(sy, ty) - Math.max(24, Math.abs(tx - sx) * 0.18));
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
