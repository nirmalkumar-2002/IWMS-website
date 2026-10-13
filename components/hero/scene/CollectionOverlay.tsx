import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type PerspectiveCamera } from 'three';
import { heroContent } from '@/content/hero';
import {
  COLLECTION_POINTS,
  CURRENT_POINT,
  DEMO,
  MAP,
  MARKER_HEAD_Y,
  QR_TAG,
  ROUTE_AHEAD,
  SCAN_BIN,
  ROUTE_DONE,
  cumulative,
  mapPoints,
  mapStreet,
  revealAt,
  toMap,
} from './collection';
import type { Rig } from './rig';
import { WHEELBASE, driveAt, samplePath, type DriveState, type PathSample } from './route';

/**
 * Phase 3.1–3.2 digital layer over the canvas. Two world-anchored elements only: the H-12
 * collection-point marker and the scan brackets on the wet bin's QR tag, seen through a phone
 * viewfinder (a device frame whose screen is the live scene). Everything else (GPS, route,
 * nearby points, the three household states) lives in one IWMS monitor panel.
 *
 * React renders the DOM once; a useFrame driver inside the Canvas projects the anchors with the
 * camera of the frame being drawn and writes styles/attributes imperatively (no React updates
 * while scrolling). Every output is a pure function of the rig and the camera, so scrubbing
 * replays exactly.
 */

type Screen = { x: number; y: number; visible: boolean };
type Anchor = { id: string; world: [number, number, number] };

export interface CollectionHud {
  root: HTMLDivElement | null;
  marker: { group: SVGGElement | null; stem: SVGLineElement | null; ring: SVGCircleElement | null; label: HTMLDivElement | null };
  scan: {
    group: SVGGElement | null;
    frame: SVGPathElement | null;
    line: SVGLineElement | null;
    check: HTMLDivElement | null;
  };
  /** Field app on a phone: frame + status sheet (align → scanning → verified). */
  phone: HTMLDivElement | null;
  copy: HTMLElement | null;
  monitor: HTMLElement | null;
  vehicleState: HTMLElement | null;
  served: HTMLElement | null;
  servedBar: HTMLElement | null;
  next: HTMLElement | null;
  states: (HTMLElement | null)[];
  map: {
    ahead: SVGPolylineElement | null;
    vehicle: SVGCircleElement | null;
    points: (SVGCircleElement | null)[];
  };
  /** Last written screen positions and opacities, by anchor id (for QA via `?debug`). */
  rendered: Record<string, { x: number; y: number; opacity: number }>;
  /** World anchors by id, for QA to project independently. */
  anchors: () => Anchor[];
}

const points = COLLECTION_POINTS;
const TAG_CENTRE: Anchor['world'] = [QR_TAG.x, QR_TAG.y, QR_TAG.z];
const ANCHORS: Anchor[] = [
  { id: CURRENT_POINT.id, world: [CURRENT_POINT.x, MARKER_HEAD_Y, CURRENT_POINT.z] },
  { id: 'qr', world: TAG_CENTRE },
];

export function createCollectionHud(): CollectionHud {
  return {
    root: null,
    marker: { group: null, stem: null, ring: null, label: null },
    scan: { group: null, frame: null, line: null, check: null },
    phone: null,
    copy: null,
    monitor: null,
    vehicleState: null,
    served: null,
    servedBar: null,
    next: null,
    states: [null, null, null],
    map: { ahead: null, vehicle: null, points: points.map(() => null) },
    rendered: {},
    anchors: () => ANCHORS,
  };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const r1 = (v: number) => Math.round(v * 10) / 10;

/** The DOM half. Rendered once (outside the Canvas); fills `hud` with element handles. */
export function CollectionHudView({ hud }: { hud: CollectionHud }) {
  const c = heroContent.collect;
  const m = c.monitor;
  const t = DEMO.times;
  return (
    <div className="hero__collect" ref={(el) => void (hud.root = el)} style={{ visibility: 'hidden' }}>
      <svg className="hero__collect-svg" aria-hidden="true">
        <g className="hero__collect-point" ref={(el) => void (hud.marker.group = el)}>
          <line className="hero__collect-stem" ref={(el) => void (hud.marker.stem = el)} />
          <circle className="hero__collect-ring" r={5} ref={(el) => void (hud.marker.ring = el)} />
        </g>
        <g className="hero__scan" ref={(el) => void (hud.scan.group = el)}>
          <path className="hero__scan-frame" ref={(el) => void (hud.scan.frame = el)} />
          <line className="hero__scan-line" ref={(el) => void (hud.scan.line = el)} />
        </g>
      </svg>

      <div
        className="hero__collect-marker"
        data-id={CURRENT_POINT.id}
        aria-hidden="true"
        ref={(el) => void (hud.marker.label = el)}
      >
        <span className="hero__collect-kind">{c.point}</span>
        <span className="hero__collect-code">{CURRENT_POINT.id}</span>
      </div>
      <div className="hero__scan-check" aria-hidden="true" ref={(el) => void (hud.scan.check = el)}>
        <svg viewBox="0 0 24 24">
          <path d="M6 12.5l4 4 8-9" />
        </svg>
      </div>

      <div className="hero__phone" data-state="align" aria-hidden="true" ref={(el) => void (hud.phone = el)}>
        <div className="hero__phone-screen">
          <div className="hero__phone-bar">
            <span>{c.phone.app}</span>
            <span>{CURRENT_POINT.id}</span>
          </div>
          <div className="hero__phone-sheet">
            <p data-when="align">{c.phone.align}</p>
            <p data-when="scanning">{c.phone.scanning}</p>
            <p data-when="verified">
              <strong>{c.phone.verified}</strong>
              <small>
                {SCAN_BIN.id} · {c.phone.wet} · {c.monitor.household} {CURRENT_POINT.id}
              </small>
            </p>
          </div>
        </div>
      </div>

      <div className="hero__collect-copy" aria-hidden="true" ref={(el) => void (hud.copy = el)}>
        <p className="hero__collect-eyebrow">{c.eyebrow}</p>
        <h2 className="hero__collect-title">{c.title}</h2>
      </div>

      <aside className="hero__monitor" aria-label={m.title} aria-hidden="true" ref={(el) => void (hud.monitor = el)}>
        <header className="hero__monitor-head">
          <span className="hero__monitor-title">{m.title}</span>
          <span className="hero__monitor-demo">{m.demo}</span>
        </header>

        <svg
          className="hero__map"
          viewBox={`${MAP.x} ${MAP.y} ${MAP.width} ${MAP.height}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <rect className="hero__map-street" {...mapStreet.street} />
          <rect className="hero__map-street" {...mapStreet.cross} />
          <polyline className="hero__map-done" points={mapPoints(ROUTE_DONE)} />
          <polyline
            className="hero__map-route"
            points={mapPoints(ROUTE_AHEAD)}
            pathLength={1}
            strokeDashoffset={1}
            ref={(el) => void (hud.map.ahead = el)}
          />
          {points.map((p, i) => {
            const [x, y] = toMap(p.x, p.z);
            return (
              <circle
                key={p.id}
                className="hero__map-point"
                data-id={p.id}
                data-status={p.status}
                cx={x}
                cy={y}
                r={p.status === 'current' ? 1.6 : 1.1}
                ref={(el) => void (hud.map.points[i] = el)}
              />
            );
          })}
          <circle className="hero__map-vehicle" r={1.3} ref={(el) => void (hud.map.vehicle = el)} />
        </svg>

        <dl className="hero__monitor-rows">
          <div>
            <dt>{m.vehicle}</dt>
            <dd>
              {DEMO.vehicle} · <span ref={(el) => void (hud.vehicleState = el)} />
            </dd>
          </div>
          <div>
            <dt>{m.route}</dt>
            <dd>{DEMO.route}</dd>
          </div>
          <div>
            <dt>{m.served}</dt>
            <dd>
              <span ref={(el) => void (hud.served = el)}>{DEMO.served}</span> / {DEMO.households}
              <span className="hero__monitor-bar" aria-hidden="true">
                <span
                  ref={(el) => void (hud.servedBar = el)}
                  style={{ transform: `scaleX(${DEMO.served / DEMO.households})` }}
                />
              </span>
            </dd>
          </div>
        </dl>

        <p className="hero__monitor-sub">
          {m.household} {CURRENT_POINT.id}
        </p>
        <ol className="hero__states">
          <li data-state="pending" ref={(el) => void (hud.states[0] = el)}>
            <span>{m.states.arrived}</span>
            <time>{t.arrived}</time>
          </li>
          <li data-state="pending" ref={(el) => void (hud.states[1] = el)}>
            <span>
              <span className="hero__states-todo">{m.states.verify}</span>
              <span className="hero__states-done">{m.states.verified}</span>
              <em className="hero__states-awaiting">{m.states.awaiting}</em>
            </span>
            <time>{t.verified}</time>
          </li>
          <li data-state="pending" ref={(el) => void (hud.states[2] = el)}>
            <span>{m.states.completed}</span>
            <time>{t.completed}</time>
          </li>
        </ol>

        <p className="hero__monitor-next" ref={(el) => void (hud.next = el)}>
          {m.next} <strong>{DEMO.next.id}</strong> · {DEMO.next.metres} m
        </p>
      </aside>
    </div>
  );
}

/** Writes a style/attribute only when its value changes (avoids redundant style recalcs). */
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
      drive: {} as DriveState,
      rear: {} as PathSample,
      ground: { x: 0, y: 0, visible: false } as Screen,
      head: { x: 0, y: 0, visible: false } as Screen,
      centre: { x: 0, y: 0, visible: false } as Screen,
      corners: [0, 1, 2, 3].map(() => ({ x: 0, y: 0, visible: false }) as Screen),
      reveal: points.map((p) => revealAt(p, aheadLength)),
      w: writer(),
      // The root renders hidden; the first active frame must reveal it.
      shown: false,
      // Same query as the portrait rules in hero.css (monitor/copy step aside for the phone).
      portrait: window.matchMedia('(max-aspect-ratio: 4/5)'),
    };
  }, []);

  useEffect(() => () => void (hud.rendered = {}), [hud]);

  useFrame((state) => {
    const { w } = s;
    const active =
      rig.pin > 0 || rig.net > 0 || rig.gps > 0 || rig.route > 0 || rig.scan > 0 || rig.done > 0;
    if (!active) {
      if (s.shown) {
        w.style(hud.root, 'visibility', 'hidden');
        w.attr(hud.root, 'data-live', 'false');
        // Leave nothing stale in the hidden DOM: it reflects 'nothing logged' until shown again.
        for (const el of hud.states) w.attr(el, 'data-state', 'pending');
        for (const r of Object.values(hud.rendered)) r.opacity = 0;
        s.shown = false;
      }
      return;
    }
    if (!s.shown) {
      w.style(hud.root, 'visibility', 'visible');
      // Ambient CSS loops only run while the layer is live.
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
    const record = (id: string, p: Screen, opacity: number) => {
      const rec = (hud.rendered[id] ??= { x: 0, y: 0, opacity: 0 });
      rec.x = r1(p.x);
      rec.y = r1(p.y);
      rec.opacity = p.visible ? opacity : 0;
    };
    const place = (el: HTMLElement | null, p: Screen, opacity: number) => {
      w.style(el, 'transform', `translate3d(${r1(p.x)}px, ${r1(p.y)}px, 0)`);
      w.style(el, 'opacity', (p.visible ? opacity : 0).toFixed(3));
    };

    const u = rig.collectU;
    const verified = rig.scan >= 0.95;
    // Completion is a separate, later state and can never precede verification.
    const completed = verified && rig.done >= 0.5;
    const household = completed ? 'completed' : verified ? 'verified' : 'pending';

    // H-12 marker: identifies the gate; steps aside for the QR close-up, returns after it.
    const closeup = clamp01((u - 0.53) / 0.07) * (1 - clamp01((u - 0.88) / 0.07));
    const markerK = rig.pin * (1 - closeup);
    const p = CURRENT_POINT;
    project(p.x, 0.05, p.z, s.ground);
    project(p.x, MARKER_HEAD_Y, p.z, s.head);
    // Label, stem and ring share one visibility rule (both ends in front of the camera).
    const markerVisible = s.ground.visible && s.head.visible;
    s.head.visible = markerVisible;
    place(hud.marker.label, s.head, markerK);
    record(p.id, s.head, markerK);
    const mk = (markerVisible ? markerK : 0).toFixed(3);
    w.attr(hud.marker.stem, 'x1', `${r1(s.ground.x)}`);
    w.attr(hud.marker.stem, 'y1', `${r1(s.ground.y)}`);
    w.attr(hud.marker.stem, 'x2', `${r1(s.head.x)}`);
    w.attr(hud.marker.stem, 'y2', `${r1(s.head.y)}`);
    w.attr(hud.marker.ring, 'cx', `${r1(s.ground.x)}`);
    w.attr(hud.marker.ring, 'cy', `${r1(s.ground.y)}`);
    w.style(hud.marker.group, 'opacity', mk);
    w.attr(hud.marker.group, 'data-state', household);
    w.attr(hud.marker.label, 'data-state', household);

    // Phone: rises into view on the push-in to the bin, leaves on the pull-back.
    const phoneK = clamp01((u - 0.6) / 0.12) * (1 - clamp01((u - 0.79) / 0.07));
    w.style(hud.phone, 'opacity', clamp01(phoneK * 1.6).toFixed(3));
    w.style(
      hud.phone,
      'transform',
      `translate(-50%, calc(-50% + ${r1((1 - phoneK) * 0.55 * H)}px))`,
    );
    w.attr(hud.phone, 'data-state', verified ? 'verified' : rig.scan > 0 ? 'scanning' : 'align');
    // Portrait has no room for phone + monitor + copy at once (CSS steps the others aside).
    const phoneUp = phoneK > 0.3;
    w.attr(hud.root, 'data-phone', phoneUp ? 'true' : 'false');
    const asideForPhone = phoneUp && s.portrait.matches;

    // Scan brackets on the bin's QR tag (inside the viewfinder), a sweep while scanning, a check
    // once verified.
    const frameK = clamp01((u - 0.68) / 0.06) * (1 - clamp01((u - 0.79) / 0.05));
    const half = (QR_TAG.size / 2) * 1.22;
    const [tl, tr, br, bl] = s.corners;
    project(QR_TAG.x, QR_TAG.y + half, QR_TAG.z - half, tl);
    project(QR_TAG.x, QR_TAG.y + half, QR_TAG.z + half, tr);
    project(QR_TAG.x, QR_TAG.y - half, QR_TAG.z + half, br);
    project(QR_TAG.x, QR_TAG.y - half, QR_TAG.z - half, bl);
    project(...TAG_CENTRE, s.centre);
    const allVisible = tl.visible && tr.visible && br.visible && bl.visible;
    const fk = allVisible ? frameK : 0;
    record('qr', s.centre, fk);
    if (fk > 0) {
      let d = '';
      const ring = s.corners;
      for (let i = 0; i < 4; i++) {
        const c = ring[i];
        const a = ring[(i + 3) % 4];
        const b = ring[(i + 1) % 4];
        const k = 0.22;
        d += `M${r1(c.x + (a.x - c.x) * k)} ${r1(c.y + (a.y - c.y) * k)}L${r1(c.x)} ${r1(c.y)}L${r1(c.x + (b.x - c.x) * k)} ${r1(c.y + (b.y - c.y) * k)}`;
      }
      w.attr(hud.scan.frame, 'd', d);
      // Sweep top → bottom across the tag while scanning.
      const t = clamp01(rig.scan / 0.92);
      w.attr(hud.scan.line, 'x1', `${r1(tl.x + (bl.x - tl.x) * t)}`);
      w.attr(hud.scan.line, 'y1', `${r1(tl.y + (bl.y - tl.y) * t)}`);
      w.attr(hud.scan.line, 'x2', `${r1(tr.x + (br.x - tr.x) * t)}`);
      w.attr(hud.scan.line, 'y2', `${r1(tr.y + (br.y - tr.y) * t)}`);
      // The check only once actually verified.
      place(hud.scan.check, s.centre, verified ? fk * clamp01((rig.scan - 0.95) / 0.05) : 0);
    } else {
      w.style(hud.scan.check, 'opacity', '0');
    }
    w.style(hud.scan.group, 'opacity', fk.toFixed(3));
    w.style(hud.scan.line, 'opacity', rig.scan > 0 && !verified ? '1' : '0');
    w.attr(hud.scan.group, 'data-verified', verified ? 'true' : 'false');

    // IWMS monitor: GPS (vehicle row + map dot), route, and the three distinct household states.
    w.style(hud.monitor, 'opacity', rig.net.toFixed(3));
    w.style(hud.monitor, 'transform', `translate3d(0, ${r1((1 - rig.net) * 14)}px, 0)`);
    w.attr(hud.monitor, 'aria-hidden', rig.net >= 0.5 && !asideForPhone ? 'false' : 'true');
    const m = heroContent.collect.monitor;
    const d = driveAt(rig.driveSec, s.drive);
    w.text(
      hud.vehicleState,
      d.speed < 0.05 ? m.stopped : `${Math.round(d.speed * 3.6)} ${m.moving}`,
    );
    samplePath(d.distance - WHEELBASE, s.rear);
    const [vx, vy] = toMap(
      s.rear.x + Math.cos(s.rear.yaw) * WHEELBASE,
      s.rear.z + Math.sin(s.rear.yaw) * WHEELBASE,
    );
    w.attr(hud.map.vehicle, 'cx', vx.toFixed(2));
    w.attr(hud.map.vehicle, 'cy', vy.toFixed(2));
    w.attr(hud.map.ahead, 'stroke-dashoffset', (1 - rig.route).toFixed(4));
    // Hidden until drawing starts: a zero-length dash can still paint a round cap.
    w.style(hud.map.ahead, 'opacity', rig.route > 0 ? '1' : '0');
    points.forEach((pt, i) => {
      const el = hud.map.points[i];
      const k = pt.status === 'current' ? 1 : clamp01((rig.route - s.reveal[i]) / 0.08);
      w.style(el, 'opacity', k.toFixed(3));
      if (pt.status === 'current') w.attr(el, 'data-state', household);
    });
    w.attr(hud.states[0], 'data-state', rig.gps >= 0.5 ? 'done' : 'pending');
    w.attr(
      hud.states[1],
      'data-state',
      verified ? 'done' : rig.gps >= 0.5 ? 'awaiting' : 'pending',
    );
    w.attr(hud.states[2], 'data-state', completed ? 'done' : 'pending');
    const served = DEMO.served + (completed ? 1 : 0);
    w.text(hud.served, `${served}`);
    w.style(hud.servedBar, 'transform', `scaleX(${(served / DEMO.households).toFixed(4)})`);
    w.style(hud.next, 'opacity', clamp01((rig.done - 0.5) / 0.5).toFixed(3));

    // The headline steps aside for the phone close-up (it would sit over the bins and the device).
    w.style(hud.copy, 'opacity', (clamp01(rig.pin * 1.4) * (1 - clamp01(phoneK * 1.6))).toFixed(3));
    w.attr(hud.copy, 'aria-hidden', rig.pin >= 0.5 && !phoneUp ? 'false' : 'true');
  });

  return null;
}
