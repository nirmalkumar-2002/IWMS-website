import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type PerspectiveCamera } from 'three';
import { heroContent } from '@/content/hero';
import {
  COLLECTION_POINTS,
  CURRENT_POINT,
  DEMO,
  GPS_ANCHOR,
  MARKER_HEAD_Y,
  POINT_HEAD_Y,
  ROUTE_AHEAD,
  ROUTE_DONE,
  cumulative,
  revealAt,
} from './collection';
import type { Rig } from './rig';
import { WHEELBASE, driveAt, samplePath, type DriveState, type PathSample } from './route';

/**
 * Phase 3.1 digital layer: world-anchored HTML/SVG over the canvas. React renders the DOM once;
 * a useFrame driver inside the Canvas projects every anchor with the camera of the frame being
 * drawn and writes transforms/opacity imperatively (no React updates while scrolling). Every
 * output is a pure function of the rig and the camera, so scrubbing replays exactly.
 */

type Screen = { x: number; y: number; visible: boolean };

export interface CollectionHud {
  root: HTMLDivElement | null;
  routeLine: SVGPathElement | null;
  routeGlow: SVGPathElement | null;
  routeDone: SVGPathElement | null;
  routeHead: SVGCircleElement | null;
  gpsStem: SVGLineElement | null;
  gps: HTMLDivElement | null;
  gpsSpeed: HTMLElement | null;
  /** Fix + speed lines: shown at the kerb, folded away in the systems view (the monitor has them). */
  gpsDetail: (HTMLElement | null)[];
  links: (SVGPathElement | null)[];
  monitor: HTMLElement | null;
  copy: HTMLElement | null;
  steps: (HTMLElement | null)[];
  points: {
    label: HTMLDivElement | null;
    stem: SVGLineElement | null;
    ring: SVGCircleElement | null;
  }[];
  /** Monitor panel attachment point (CSS px, stage space), measured on resize. */
  panelAnchor: { x: number; y: number };
  /** Last written screen positions and opacities, by anchor id (for QA via `?debug`). */
  rendered: Record<string, { x: number; y: number; opacity: number }>;
  /** World anchors by id, for QA to project independently. */
  anchors: () => { id: string; world: [number, number, number] }[];
}

const points = COLLECTION_POINTS;

export function createCollectionHud(): CollectionHud {
  return {
    root: null,
    routeLine: null,
    routeGlow: null,
    routeDone: null,
    routeHead: null,
    gpsStem: null,
    gps: null,
    gpsSpeed: null,
    gpsDetail: [null, null],
    links: [null, null],
    monitor: null,
    copy: null,
    steps: [],
    points: points.map(() => ({ label: null, stem: null, ring: null })),
    panelAnchor: { x: 0, y: 0 },
    rendered: {},
    anchors: () => [], // replaced by the driver once it knows the rig
  };
}

/** GPS tag anchor in world space (truck roof, above the cab), from the pure route maths. */
function gpsWorld(driveSec: number, drive: DriveState, rear: PathSample, out: Vector3) {
  const d = driveAt(driveSec, drive).distance;
  samplePath(d - WHEELBASE, rear);
  const hx = Math.cos(rear.yaw);
  const hz = Math.sin(rear.yaw);
  const fx = rear.x + hx * WHEELBASE;
  const fz = rear.z + hz * WHEELBASE;
  return out.set(fx + hx * GPS_ANCHOR.x, GPS_ANCHOR.y, fz + hz * GPS_ANCHOR.x);
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const r1 = (v: number) => Math.round(v * 10) / 10;

/** The DOM half. Rendered once (outside the Canvas); fills `hud` with element handles. */
export function CollectionHudView({ hud }: { hud: CollectionHud }) {
  const c = heroContent.collect;

  // Measure where the link lines attach to the monitor panel (layout, not transforms).
  useEffect(() => {
    const root = hud.root;
    const panel = hud.monitor;
    if (!root || !panel) return;
    // Same query as the portrait rule in hero.css that moves the panel to the bottom.
    const portrait = window.matchMedia('(max-aspect-ratio: 4/5)');
    const measure = () => {
      const below = portrait.matches;
      hud.panelAnchor = below
        ? { x: panel.offsetLeft + panel.offsetWidth / 2, y: panel.offsetTop }
        : { x: panel.offsetLeft, y: panel.offsetTop + Math.min(46, panel.offsetHeight / 2) };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(panel);
    portrait.addEventListener('change', measure);
    return () => {
      ro.disconnect();
      portrait.removeEventListener('change', measure);
    };
  }, [hud]);

  return (
    <div className="hero__collect" ref={(el) => void (hud.root = el)} style={{ visibility: 'hidden' }}>
      <svg className="hero__collect-svg" aria-hidden="true">
        <path className="hero__route-done" ref={(el) => void (hud.routeDone = el)} />
        <path className="hero__route-glow" ref={(el) => void (hud.routeGlow = el)} />
        <path className="hero__route-line" ref={(el) => void (hud.routeLine = el)} />
        <circle className="hero__route-head" r={3.5} ref={(el) => void (hud.routeHead = el)} />
        {points.map((p, i) => (
          <g key={p.id} data-status={p.status}>
            <line
              className="hero__collect-stem"
              ref={(el) => void (hud.points[i].stem = el)}
            />
            <circle
              className="hero__collect-ring"
              r={p.status === 'current' ? 5 : 3.5}
              ref={(el) => void (hud.points[i].ring = el)}
            />
          </g>
        ))}
        <line className="hero__gps-stem" ref={(el) => void (hud.gpsStem = el)} />
        <path className="hero__link" ref={(el) => void (hud.links[0] = el)} />
        <path className="hero__link" ref={(el) => void (hud.links[1] = el)} />
      </svg>

      {points.map((p, i) => (
        <div
          key={p.id}
          className="hero__collect-marker"
          data-id={p.id}
          data-status={p.status}
          aria-hidden="true"
          ref={(el) => void (hud.points[i].label = el)}
        >
          <span className="hero__collect-code">{p.id}</span>
          {p.status === 'current' && <span className="hero__collect-kind">{c.point.current}</span>}
          {p.status === 'collected' && <span className="hero__collect-kind">{c.point.collected}</span>}
        </div>
      ))}

      <div className="hero__gps" aria-hidden="true" ref={(el) => void (hud.gps = el)}>
        <span className="hero__gps-head">
          <i className="hero__gps-live" />
          {DEMO.vehicle} · {c.gps.label}
        </span>
        <span className="hero__gps-fix" ref={(el) => void (hud.gpsDetail[0] = el)}>
          {DEMO.gps}
        </span>
        <span
          className="hero__gps-speed"
          ref={(el) => {
            hud.gpsSpeed = el;
            hud.gpsDetail[1] = el;
          }}
        />
      </div>

      <div className="hero__collect-copy" aria-hidden="true" ref={(el) => void (hud.copy = el)}>
        <p className="hero__collect-eyebrow">{c.eyebrow}</p>
        <h2 className="hero__collect-title">{c.title}</h2>
        <ol className="hero__collect-steps">
          {c.steps.map((step, i) => (
            <li key={step} data-step={i + 1} ref={(el) => void (hud.steps[i] = el)}>
              <span className="hero__collect-step-n">{String(i + 1).padStart(2, '0')}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <aside
        className="hero__monitor"
        aria-label={c.monitor.title}
        aria-hidden="true"
        ref={(el) => void (hud.monitor = el)}
      >
        <header className="hero__monitor-head">
          <span className="hero__monitor-title">{c.monitor.title}</span>
          <span className="hero__monitor-demo">{c.monitor.demo}</span>
        </header>
        <dl className="hero__monitor-rows">
          <div>
            <dt>{c.monitor.vehicle}</dt>
            <dd>
              {DEMO.vehicle} <em>{c.monitor.vehicleState}</em>
            </dd>
          </div>
          <div>
            <dt>{c.monitor.route}</dt>
            <dd>{DEMO.route}</dd>
          </div>
          <div>
            <dt>{c.monitor.stop}</dt>
            <dd>
              {CURRENT_POINT.id} <em className="hero__monitor-arrived">{c.monitor.stopState}</em>
            </dd>
          </div>
          <div>
            <dt>{c.monitor.progress}</dt>
            <dd>
              {DEMO.served} / {DEMO.households}
              <span className="hero__monitor-bar" aria-hidden="true">
                <span style={{ transform: `scaleX(${DEMO.served / DEMO.households})` }} />
              </span>
            </dd>
          </div>
          <div>
            <dt>{c.monitor.next}</dt>
            <dd>
              {DEMO.next.id} · {DEMO.next.metres} m
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

/** Writes a style/attribute only when its value changes (avoids per-frame style recalcs). */
function writer() {
  const last = new WeakMap<Element, Record<string, string>>();
  const changed = (el: Element, key: string, value: string) => {
    let rec = last.get(el);
    if (!rec) last.set(el, (rec = {}));
    if (rec[key] === value) return false;
    rec[key] = value;
    return true;
  };
  return {
    style(el: HTMLElement | SVGElement | null, key: 'transform' | 'opacity' | 'visibility', v: string) {
      if (el && changed(el, key, v)) el.style[key] = v;
    },
    attr(el: Element | null, key: string, v: string) {
      if (el && changed(el, key, v)) el.setAttribute(key, v);
    },
    text(el: HTMLElement | null, v: string) {
      if (el && changed(el, '#text', v)) el.textContent = v;
    },
  };
}

/** The per-frame half. Mount inside the Canvas after the Director, so the camera is final. */
export function CollectionDirector({ rig, hud }: { rig: Rig; hud: CollectionHud }) {
  const s = useMemo(() => {
    const aheadLength = cumulative(ROUTE_AHEAD);
    return {
      v: new Vector3(),
      gps: new Vector3(),
      drive: {} as DriveState,
      rear: {} as PathSample,
      head: { x: 0, y: 0, visible: false } as Screen,
      ground: { x: 0, y: 0, visible: false } as Screen,
      gpsScreen: { x: 0, y: 0, visible: false } as Screen,
      pinScreen: { x: 0, y: 0, visible: false } as Screen,
      aheadLength,
      reveal: points.map((p) => revealAt(p, aheadLength)),
      w: writer(),
      // The root renders hidden; the first active frame must reveal it.
      shown: false,
      tipVisible: false,
      reached: [false, false, false, false],
      from: [] as Screen[],
    };
  }, []);

  useEffect(() => {
    hud.anchors = () => {
      const g = gpsWorld(rig.driveSec, s.drive, s.rear, new Vector3());
      return [
        ...points.map((p) => ({
          id: p.id,
          world: [p.x, p.status === 'current' ? MARKER_HEAD_Y : POINT_HEAD_Y, p.z] as [
            number,
            number,
            number,
          ],
        })),
        { id: 'gps', world: [g.x, g.y, g.z] as [number, number, number] },
      ];
    };
  }, [hud, rig, s]);

  useFrame((state) => {
    const { w } = s;
    const active = rig.pin > 0 || rig.gps > 0 || rig.route > 0 || rig.net > 0;
    if (!active) {
      if (s.shown) {
        w.style(hud.root, 'visibility', 'hidden');
        w.attr(hud.root, 'data-live', 'false');
        for (const r of Object.values(hud.rendered)) r.opacity = 0;
        s.shown = false;
      }
      return;
    }
    if (!s.shown) {
      w.style(hud.root, 'visibility', 'visible');
      // Ambient CSS loops (GPS dot, link flow) only run while the layer is live.
      w.attr(hud.root, 'data-live', 'true');
      s.shown = true;
    }

    const camera = state.camera as PerspectiveCamera;
    // The Director has just moved the camera this frame; refresh its matrices before projecting.
    camera.updateMatrixWorld();
    const W = state.size.width;
    const H = state.size.height;
    const project = (x: number, y: number, z: number, out: Screen) => {
      const v = s.v.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
      out.visible = v.z < -camera.near;
      v.applyMatrix4(camera.projectionMatrix);
      out.x = (v.x * 0.5 + 0.5) * W;
      out.y = (-v.y * 0.5 + 0.5) * H;
      return out;
    };
    const place = (el: HTMLElement | null, id: string, p: Screen, opacity: number) => {
      const o = p.visible ? opacity : 0;
      w.style(el, 'transform', `translate3d(${r1(p.x)}px, ${r1(p.y)}px, 0)`);
      w.style(el, 'opacity', o.toFixed(3));
      const rec = (hud.rendered[id] ??= { x: 0, y: 0, opacity: 0 });
      rec.x = r1(p.x);
      rec.y = r1(p.y);
      rec.opacity = o;
    };
    const line = (el: SVGLineElement | null, a: Screen, b: Screen, opacity: number) => {
      w.attr(el, 'x1', `${r1(a.x)}`);
      w.attr(el, 'y1', `${r1(a.y)}`);
      w.attr(el, 'x2', `${r1(b.x)}`);
      w.attr(el, 'y2', `${r1(b.y)}`);
      w.style(el, 'opacity', (a.visible && b.visible ? opacity : 0).toFixed(3));
    };

    // Collection points: ground ring + stem + label head.
    points.forEach((p, i) => {
      const el = hud.points[i];
      const current = p.status === 'current';
      const k = current
        ? rig.pin
        : clamp01((rig.route - s.reveal[i]) / 0.08) * (p.status === 'collected' ? 0.6 : 1);
      project(p.x, 0.05, p.z, s.ground);
      project(p.x, current ? MARKER_HEAD_Y : POINT_HEAD_Y, p.z, s.head);
      place(el.label, p.id, s.head, k);
      line(el.stem, s.ground, s.head, k * 0.8);
      w.attr(el.ring, 'cx', `${r1(s.ground.x)}`);
      w.attr(el.ring, 'cy', `${r1(s.ground.y)}`);
      w.style(el.ring, 'opacity', (s.ground.visible ? k : 0).toFixed(3));
      if (current) Object.assign(s.pinScreen, s.head);
    });

    // Vehicle GPS tag above the cab, with a live speed read-out from the kinematics table.
    gpsWorld(rig.driveSec, s.drive, s.rear, s.gps);
    project(s.gps.x, s.gps.y, s.gps.z, s.gpsScreen);
    place(hud.gps, 'gps', s.gpsScreen, rig.gps);
    const detail = (1 - clamp01((rig.collectU - 0.55) / 0.2)).toFixed(3);
    for (const el of hud.gpsDetail) w.style(el, 'opacity', detail);
    project(s.gps.x, 3.55, s.gps.z, s.ground);
    line(hud.gpsStem, s.ground, s.gpsScreen, rig.gps * 0.7);
    const kmh = Math.round(s.drive.speed * 3.6);
    const c = heroContent.collect.gps;
    w.text(hud.gpsSpeed, s.drive.speed < 0.05 ? c.stopped : `${kmh} ${c.moving}`);

    // Planned route ahead, drawn to `route` of its real (world) length; driven route behind.
    if (rig.route > 0) {
      const target = rig.route * s.aheadLength[s.aheadLength.length - 1];
      let d = '';
      let tip = false;
      for (let i = 0; i < ROUTE_AHEAD.length; i++) {
        let [x, z] = ROUTE_AHEAD[i];
        const end = s.aheadLength[i] >= target;
        if (end && i > 0) {
          const [px, pz] = ROUTE_AHEAD[i - 1];
          const seg = s.aheadLength[i] - s.aheadLength[i - 1];
          const k = seg > 0 ? (target - s.aheadLength[i - 1]) / seg : 1;
          x = px + (x - px) * k;
          z = pz + (z - pz) * k;
        }
        const p = project(x, 0.06, z, s.head);
        if (p.visible) d += `${d ? 'L' : 'M'}${r1(p.x)} ${r1(p.y)}`;
        if (end || i === ROUTE_AHEAD.length - 1) {
          // The leading dot sits on the real tip, or hides if that is behind the camera.
          tip = p.visible;
          if (tip) {
            w.attr(hud.routeHead, 'cx', `${r1(p.x)}`);
            w.attr(hud.routeHead, 'cy', `${r1(p.y)}`);
          }
          break;
        }
      }
      w.attr(hud.routeLine, 'd', d);
      w.attr(hud.routeGlow, 'd', d);
      s.tipVisible = tip;
      let done = '';
      for (const [x, z] of ROUTE_DONE) {
        const p = project(x, 0.06, z, s.ground);
        if (p.visible) done += `${done ? 'L' : 'M'}${r1(p.x)} ${r1(p.y)}`;
      }
      w.attr(hud.routeDone, 'd', done);
    }
    const ro = rig.route > 0 ? '1' : '0';
    w.style(hud.routeLine, 'opacity', ro);
    w.style(hud.routeGlow, 'opacity', ro);
    w.style(hud.routeHead, 'opacity', s.tipVisible ? tipOpacity(rig.route) : '0');
    w.style(hud.routeDone, 'opacity', (rig.route * 0.55).toFixed(3));

    // Links into IWMS: vehicle and collection point → monitor panel.
    const a = hud.panelAnchor;
    s.from[0] = s.gpsScreen;
    s.from[1] = s.pinScreen;
    hud.links.forEach((link, i) => {
      const f = s.from[i];
      if (rig.net <= 0 || !f.visible) {
        w.style(link, 'opacity', '0');
        return;
      }
      const dx = a.x - f.x;
      w.attr(
        link,
        'd',
        `M${r1(f.x)} ${r1(f.y)}C${r1(f.x + dx * 0.45)} ${r1(f.y)} ${r1(a.x - dx * 0.35)} ${r1(a.y)} ${r1(a.x)} ${r1(a.y)}`,
      );
      w.style(link, 'opacity', (rig.net * 0.8).toFixed(3));
    });
    w.style(hud.monitor, 'opacity', rig.net.toFixed(3));
    w.attr(hud.monitor, 'aria-hidden', rig.net >= 0.5 ? 'false' : 'true');
    w.attr(hud.copy, 'aria-hidden', rig.pin >= 0.5 ? 'false' : 'true');
    w.style(hud.monitor, 'transform', `translate3d(0, ${r1((1 - rig.net) * 14)}px, 0)`);

    // Story steps: Physical Collection → GPS Tracking → Connected Points → IWMS Monitoring.
    w.style(hud.copy, 'opacity', clamp01(rig.pin * 1.4).toFixed(3));
    const reached = s.reached;
    reached[0] = rig.pin >= 0.5;
    reached[1] = rig.gps >= 0.5;
    reached[2] = rig.route >= 0.5;
    reached[3] = rig.net >= 0.5;
    const step = reached.lastIndexOf(true);
    hud.steps.forEach((el, i) =>
      w.attr(el, 'data-state', i < step ? 'done' : i === step ? 'active' : 'pending'),
    );
  });

  return null;
}

/** The route's leading dot fades once the whole route is drawn. */
const tipOpacity = (route: number) =>
  (route <= 0 ? 0 : route < 0.9 ? 1 : Math.max(0, (1 - route) / 0.1)).toFixed(3);
