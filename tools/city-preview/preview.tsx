/**
 * PROPOSAL PREVIEW v2 (not production) — Scene 04 as a fixed-perspective, pre-rendered city image.
 * No WebGL and no camera: the city never moves. Overview = small numbered pins only; the full
 * label appears for the selected zone and on hover (pin or pill) / pill keyboard focus. Selection
 * = soft amber footprint + crisp outline and a very subtle dim of the rest. One contextual popup
 * floats beside the selected zone (≥768px) and glides between modules; phones get the compact
 * summary below the image. Layout work (label placement, popup placement, covered pins) runs only
 * when the layout changes (ResizeObserver / selection / hover), never per frame.
 *
 * Data: tools/static-city/city.json (render agent; `aspect` per composition) with a local stub
 * fallback (stub.json). Content: the real verified copy from content/ecosystem.ts (unchanged).
 */
import {
  StrictMode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/montserrat/latin-600.css';
import {
  ECOSYSTEM_BY_ID,
  ECOSYSTEM_NODES,
  ecosystemContent as c,
  ecosystemStageContent as s,
  type EcosystemNode,
  type EcosystemNodeId,
} from '@/content/ecosystem';
import './preview.css';

/* ------------------------------------------------------------------ data contract */

type Pt = [number, number];
interface ZoneGeo {
  /** Pin anchor, percent of the image (x of width, y of height). */
  anchor: Pt;
  /** Ground footprint polygon, percent of the image. */
  footprint: Pt[];
  /** Bounding box [left, top, right, bottom], percent of the image. */
  box: [number, number, number, number];
}
interface Composition {
  aspect: number;
  nodes: Record<EcosystemNodeId, ZoneGeo>;
}
interface CityData {
  desktop: Composition;
  mobile: Composition;
}
interface Source {
  data: CityData;
  /** What the data is (shown in the preview badge). */
  label: string;
  /** Which rendered image sets exist (otherwise a placeholder gradient is shown). */
  images: { desktop: boolean; mobile: boolean };
  /** Cache-buster for the images (hash of city.json). */
  version: string;
}

const ASSET = '/tools/static-city/';
const PHONE_QUERY = '(max-width: 767px)';

const MODULES = ECOSYSTEM_NODES.filter((n) => n.kind === 'module');
const INTEGRATIONS = ECOSYSTEM_NODES.filter((n) => n.kind === 'integration');
const ORDER = [...MODULES, ...INTEGRATIONS].map((n) => n.id);
const HIGHLIGHTS = 2;

const tabId = (id: EcosystemNodeId) => `cp-tab-${id}`;
const PANEL_ID = 'cp-panel';
const DETAILS_ID = 'cp-details';
const brochureHref = (page: number) => `/brand/iwms-brochure.pdf#page=${page}`;

function isComposition(v: unknown): v is Composition {
  if (!v || typeof v !== 'object') return false;
  const o = v as Partial<Composition>;
  if (typeof o.aspect !== 'number' || !(o.aspect > 0) || !o.nodes) return false;
  return ORDER.every((id) => {
    const z = o.nodes?.[id];
    return (
      !!z &&
      Array.isArray(z.anchor) &&
      Array.isArray(z.footprint) &&
      Array.isArray(z.box) &&
      z.box.length === 4
    );
  });
}

// Synchronous data: eager globs resolve at module load (no fetch, so the view box is reserved with
// the right aspect on first render) and are empty — not an error — while a file is missing. Vite
// reloads the page when the render agent adds or rewrites city.json.
const CITY = import.meta.glob<Partial<CityData>>(
  '/tools/static-city/city.json',
  {
    eager: true,
    import: 'default',
  },
);
const STUB_DATA = import.meta.glob<Partial<CityData>>(
  '/tools/city-preview/stub.json',
  { eager: true, import: 'default' },
);
const IMAGES = import.meta.glob<string>(
  [
    '/tools/static-city/city-desktop-1920.jpg',
    '/tools/static-city/city-mobile-1080.jpg',
  ],
  { eager: true, query: '?url', import: 'default' },
);

/** Small content hash, used as the images' cache-buster (they change with city.json). */
const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++)
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};

/** Real render data (city.json), else the stub. `?stub` forces the stub. */
function loadSource(): Source {
  const forceStub = new URLSearchParams(location.search).has('stub');
  const real = Object.values(CITY)[0];
  if (
    !forceStub &&
    real &&
    isComposition(real.desktop) &&
    isComposition(real.mobile)
  )
    return {
      data: { desktop: real.desktop, mobile: real.mobile },
      label: 'render data',
      images: {
        desktop: '/tools/static-city/city-desktop-1920.jpg' in IMAGES,
        mobile: '/tools/static-city/city-mobile-1080.jpg' in IMAGES,
      },
      version: hash(JSON.stringify(real)),
    };
  const stub = Object.values(STUB_DATA)[0];
  if (!stub || !isComposition(stub.desktop) || !isComposition(stub.mobile))
    throw new Error('No city data (stub.json missing)');
  return {
    data: { desktop: stub.desktop, mobile: stub.mobile },
    label: 'stub data',
    images: { desktop: false, mobile: false },
    version: '0',
  };
}

/* ------------------------------------------------------------------ geometry helpers */

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const overlaps = (a: Rect, b: Rect, pad = 0) =>
  a.x < b.x + b.w + pad &&
  b.x < a.x + a.w + pad &&
  a.y < b.y + b.h + pad &&
  b.y < a.y + a.h + pad;
const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
};
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
/** Element rect relative to a container's top-left (CSS px). */
const relRect = (el: Element, to: Element): Rect => {
  const r = el.getBoundingClientRect();
  const o = to.getBoundingClientRect();
  return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
};

/** Pin geometry (matches preview.css): a 22px badge whose centre sits PIN_LIFT px above the
 *  anchor, joined to a small ground dot on the anchor by a short stem. */
const BADGE = 22;
const PIN_LIFT = 17;
const LABEL_GAP = 6;
const EDGE = 8;
/** The visible pin (badge + stem + dot) relative to its anchor. */
const pinRect = (a: { x: number; y: number }): Rect => ({
  x: a.x - BADGE / 2,
  y: a.y - PIN_LIFT - BADGE / 2,
  w: BADGE,
  h: PIN_LIFT + BADGE / 2 + 3,
});

interface LabelPos {
  /** Label sits below the anchor instead of above the badge. */
  flip: boolean;
  dx: number;
}
type LabelMap = Partial<Record<EcosystemNodeId, LabelPos>>;
const labelRect = (
  a: { x: number; y: number },
  w: number,
  h: number,
  p: LabelPos,
): Rect => ({
  x: a.x - w / 2 + p.dx,
  y: p.flip ? a.y + 3 + LABEL_GAP : a.y - PIN_LIFT - BADGE / 2 - LABEL_GAP - h,
  w,
  h,
});

/**
 * Label placement. Labels are shown one or two at a time (selected + hovered), so each is placed
 * against the pins and overlay chips only, plus the selected label for the others. Each tries above
 * its badge (centred, then slid sideways), then below its anchor, and takes the cheapest spot.
 */
function layoutLabels(
  W: number,
  H: number,
  anchors: Record<EcosystemNodeId, { x: number; y: number }>,
  sizes: Record<EcosystemNodeId, { w: number; h: number }>,
  first: EcosystemNodeId | null,
  obstacles: Rect[],
): LabelMap {
  const out: LabelMap = {};
  const pins = ORDER.map((id) => ({ id, r: pinRect(anchors[id]) }));
  const order = first ? [first, ...ORDER.filter((i) => i !== first)] : ORDER;
  let firstRect: Rect | null = null;
  for (const id of order) {
    const a = anchors[id];
    const { w, h } = sizes[id];
    let best: { pos: LabelPos; cost: number } | null = null;
    for (const flip of [false, true]) {
      for (const f of [0, -0.3, 0.3, -0.6, 0.6]) {
        const pos = { flip, dx: Math.round(f * w) };
        const r = labelRect(a, w, h, pos);
        // Keep inside the view by sliding (never by dropping the label).
        const over =
          Math.max(0, EDGE - r.x) - Math.max(0, r.x + w - (W - EDGE));
        pos.dx += Math.round(over);
        const r2 = labelRect(a, w, h, pos);
        let cost = (flip ? 2 : 0) + Math.abs(pos.dx) / Math.max(w, 1);
        if (r2.y < EDGE || r2.y + h > H - EDGE) cost += 5000;
        for (const p of pins)
          if (p.id !== id && overlaps(r2, p.r, 2)) cost += 600;
        for (const o of obstacles) if (overlaps(r2, o, 4)) cost += 1000;
        if (firstRect && id !== first && overlaps(r2, firstRect, 3))
          cost += 800;
        if (!best || cost < best.cost) best = { pos, cost };
      }
      if (best && best.cost < 100) break;
    }
    const pos = best?.pos ?? { flip: false, dx: 0 };
    out[id] = pos;
    if (id === first) firstRect = labelRect(a, w, h, pos);
  }
  return out;
}

type Side = 'left' | 'right';
interface Placement {
  x: number;
  y: number;
  side: Side;
  /** Pins (and their labels) the popup covers; hidden while it is open. */
  covered: EcosystemNodeId[];
}
const POPUP_MARGIN = 16;
const POPUP_GAP = 16;

/**
 * The floating popup beside the selected zone, on the side with more free space (the other side
 * is the fallback). Vertically centred on the zone, clamped 16px inside the view and below the
 * top-left chip where they would meet, then nudged vertically (16px steps) and away from the zone
 * (24px steps) to cover as few other pins as possible. It never overlaps `exclude` (the zone box ∪
 * the selected pin and label). Null when it fits on neither side (summary stays below the image).
 */
function placePopup(
  W: number,
  H: number,
  pw: number,
  ph: number,
  exclude: Rect,
  pins: { id: EcosystemNodeId; r: Rect }[],
  blockers: Rect[],
): Placement | null {
  if (ph > H - 2 * POPUP_MARGIN) return null;
  const freeL = exclude.x;
  const freeR = W - (exclude.x + exclude.w);
  const sides: Side[] = freeR >= freeL ? ['right', 'left'] : ['left', 'right'];
  let best: (Omit<Placement, 'covered'> & { cost: number }) | null = null;
  for (const side of sides) {
    const x0 =
      side === 'right'
        ? exclude.x + exclude.w + POPUP_GAP
        : exclude.x - POPUP_GAP - pw;
    if (x0 < POPUP_MARGIN || x0 + pw > W - POPUP_MARGIN) continue;
    const dir = side === 'right' ? 1 : -1;
    const xs = [x0];
    for (let k = 1; k <= 10; k++) {
      const x = x0 + dir * 24 * k;
      if (x < POPUP_MARGIN || x + pw > W - POPUP_MARGIN) break;
      xs.push(x);
    }
    for (const x of xs) {
      let minY = POPUP_MARGIN;
      for (const b of blockers)
        if (x < b.x + b.w + 8 && b.x - 8 < x + pw)
          minY = Math.max(minY, b.y + b.h + 8);
      const maxY = H - POPUP_MARGIN - ph;
      if (maxY < minY) continue;
      const cy = clamp(exclude.y + exclude.h / 2 - ph / 2, minY, maxY);
      const ys = new Set<number>([Math.round(cy)]);
      for (let k = 1; k <= 16; k++) {
        ys.add(Math.round(clamp(cy - 16 * k, minY, maxY)));
        ys.add(Math.round(clamp(cy + 16 * k, minY, maxY)));
      }
      for (const y of ys) {
        const r = { x, y, w: pw, h: ph };
        const cost =
          pins.reduce((n, p) => n + (overlaps(r, p.r, 6) ? 1000 : 0), 0) +
          Math.abs(y - cy) +
          Math.abs(x - x0) * 0.75 +
          (side === sides[0] ? 0 : 250);
        if (!best || cost < best.cost)
          best = { x: Math.round(x), y, side, cost };
      }
    }
    if (best && best.cost < 1000) break;
  }
  if (!best) return null;
  const r = { x: best.x, y: best.y, w: pw, h: ph };
  return {
    x: best.x,
    y: best.y,
    side: best.side,
    covered: pins.filter((p) => overlaps(r, p.r, 2)).map((p) => p.id),
  };
}

/* ------------------------------------------------------------------ small UI bits */

function Glyph({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}
const ICON_OVERVIEW = 'M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4';
const ICON_CHEVRON = 'm4 6 4 4 4-4';
const ICON_CLOSE = 'm4 4 8 8M12 4l-8 8';
const ICON_TAP =
  'M8 1.5v2M3.4 3.4l1.4 1.4M12.6 3.4l-1.4 1.4M8 7v7.5M5.5 11.5 8 14.5l2.5-3';
/** ICCC pin glyph: a small hub (command centre). */
const ICON_HUB =
  'M8 5.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2';

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatch(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return match;
}

/* ------------------------------------------------------------------ city picture */

function CityPicture({ source, phone }: { source: Source; phone: boolean }) {
  const { desktop, mobile } = source.data;
  const both = source.images.desktop && source.images.mobile;
  if (!both && (phone || !source.images.desktop))
    return (
      <div className="cp__placeholder" aria-hidden="true">
        <span>Placeholder · city render pending</span>
      </div>
    );
  const v = `?v=${source.version}`;
  const dW = 1920;
  const dH = Math.round(dW / desktop.aspect);
  const mW = 1080;
  const mH = Math.round(mW / mobile.aspect);
  return (
    <picture className="cp__picture">
      {both && (
        <>
          <source
            media={PHONE_QUERY}
            type="image/webp"
            srcSet={`${ASSET}city-mobile-720.webp${v} 720w, ${ASSET}city-mobile-1080.webp${v} 1080w`}
            sizes="calc(100vw - 32px)"
            width={mW}
            height={mH}
          />
          <source
            media={PHONE_QUERY}
            srcSet={`${ASSET}city-mobile-1080.jpg${v} 1080w`}
            sizes="calc(100vw - 32px)"
            width={mW}
            height={mH}
          />
        </>
      )}
      <source
        type="image/webp"
        srcSet={`${ASSET}city-desktop-1280.webp${v} 1280w, ${ASSET}city-desktop-1920.webp${v} 1920w, ${ASSET}city-desktop-2560.webp${v} 2560w`}
        sizes="min(92vw, 1200px)"
        width={dW}
        height={dH}
      />
      <img
        className="cp__img"
        src={`${ASSET}city-desktop-1920.jpg${v}`}
        width={dW}
        height={dH}
        alt="Illustrated miniature city seen from above: homes and bins, collection vehicles on the road network, a crew depot, a weighbridge at the transfer station, a processing plant, an engineered landfill, citizens, and the city command centre."
        decoding="async"
        loading="lazy"
        fetchPriority="low"
        draggable={false}
      />
    </picture>
  );
}

/* ------------------------------------------------------------------ scene */

function Scene({ source }: { source: Source }) {
  const phone = useMedia(PHONE_QUERY);
  const comp = phone ? source.data.mobile : source.data.desktop;
  const hasImage = phone
    ? source.images.desktop && source.images.mobile
    : source.images.desktop;

  const [selected, setSelected] = useState<EcosystemNodeId>('collection');
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  /** Pill hovered or keyboard-focused: previews that zone's label on the city. */
  const [peek, setPeek] = useState<EcosystemNodeId | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [pillsH, setPillsH] = useState(0);
  const [labels, setLabels] = useState<LabelMap>({});
  const [placement, setPlacement] = useState<Placement | null>(null);

  const tabs = useRef<
    Partial<Record<EcosystemNodeId, HTMLButtonElement | null>>
  >({});
  const labelEls = useRef<
    Partial<Record<EcosystemNodeId, HTMLSpanElement | null>>
  >({});
  const detailBtn = useRef<HTMLButtonElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLElement | null>(null);
  const twinRef = useRef<HTMLDivElement>(null);
  const tablistRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // View size (CSS px) and the pill row's height (sizes the view so it fits below the pills).
  useLayoutEffect(() => {
    const el = stageRef.current;
    const list = tablistRef.current;
    if (!el || !list) return;
    const measure = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
      setPillsH(Math.round(list.offsetHeight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(list);
    return () => ro.disconnect();
  }, []);

  const px = useCallback(
    (p: Pt) => ({ x: (p[0] / 100) * size.w, y: (p[1] / 100) * size.h }),
    [size],
  );

  const node = ECOSYSTEM_BY_ID[selected];
  const active = focused ? selected : null;

  // Label placement: once per layout change (size, composition, selection, chip swap).
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !size.w) return;
    const anchors = {} as Record<EcosystemNodeId, { x: number; y: number }>;
    const sizes = {} as Record<EcosystemNodeId, { w: number; h: number }>;
    for (const id of ORDER) {
      anchors[id] = px(comp.nodes[id].anchor);
      const el = labelEls.current[id];
      sizes[id] = { w: el?.offsetWidth ?? 0, h: el?.offsetHeight ?? 0 };
    }
    const obstacles = chipRef.current ? [relRect(chipRef.current, stage)] : [];
    const next = layoutLabels(
      size.w,
      size.h,
      anchors,
      sizes,
      active,
      obstacles,
    );
    setLabels((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    );
  }, [size, comp, active, phone, px]);

  // Popup placement (≥768px, a selected module, not dismissed), from a hidden twin's size.
  const wantFloat = !phone && focused && !dismissed;
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const twin = twinRef.current;
    if (!wantFloat || !stage || !twin || !size.w) {
      setPlacement((p) => (p === null ? p : null));
      return;
    }
    const place = () => {
      const g = comp.nodes[selected];
      const [l, t, r, b] = g.box;
      const a = px(g.anchor);
      let exclude: Rect = {
        x: (l / 100) * size.w,
        y: (t / 100) * size.h,
        w: ((r - l) / 100) * size.w,
        h: ((b - t) / 100) * size.h,
      };
      exclude = union(exclude, pinRect(a));
      const selLabel = labelEls.current[selected];
      if (selLabel) exclude = union(exclude, relRect(selLabel, stage));
      const pins = ORDER.filter((id) => id !== selected).map((id) => ({
        id,
        r: pinRect(px(comp.nodes[id].anchor)),
      }));
      const blockers = chipRef.current ? [relRect(chipRef.current, stage)] : [];
      const next = placePopup(
        size.w,
        size.h,
        twin.offsetWidth,
        twin.offsetHeight,
        exclude,
        pins,
        blockers,
      );
      setPlacement((p) =>
        JSON.stringify(p) === JSON.stringify(next) ? p : next,
      );
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(twin);
    return () => ro.disconnect();
  }, [wantFloat, size, comp, selected, labels, px]);

  const float = wantFloat && placement !== null;
  const covered = new Set(float && placement ? placement.covered : []);

  // Keep the selected pill visible in the scrolling (phone) tab row without scrolling the page.
  useEffect(() => {
    const list = tablistRef.current;
    const el = tabs.current[selected];
    if (!list || !el || list.scrollWidth <= list.clientWidth) return;
    const left = el.offsetLeft - list.offsetLeft;
    const right = left + el.offsetWidth;
    if (left < list.scrollLeft) list.scrollLeft = left - 16;
    else if (right > list.scrollLeft + list.clientWidth)
      list.scrollLeft = right - list.clientWidth + 16;
  }, [selected]);

  const select = useCallback((id: EcosystemNodeId, focus = false) => {
    setSelected(id);
    setFocused(true);
    setDismissed(false);
    if (focus) tabs.current[id]?.focus();
  }, []);
  const closePopup = () => {
    setDismissed(true);
    tabs.current[selected]?.focus();
  };
  const returnToOverview = () => {
    setFocused(false);
    setDismissed(false);
    tabs.current[selected]?.focus();
  };
  const toggleDetails = () => {
    const open = !detailsOpen;
    setDetailsOpen(open);
    if (!open) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(DETAILS_ID);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const delta = Math.min(r.bottom - window.innerHeight + 24, r.top - 24);
      if (delta <= 0) return;
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches;
      window.scrollTo({
        top: window.scrollY + delta,
        behavior: smooth ? 'smooth' : 'auto',
      });
    });
  };
  const closeDetails = () => {
    setDetailsOpen(false);
    detailBtn.current?.focus();
  };

  // Escape closes the floating popup when focus is in it or on the module pills.
  const escRef = useRef<() => void>(() => {});
  useEffect(() => {
    escRef.current = () => {
      if (float) closePopup();
    };
  });
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const t = e.target as Element | null;
      if (!t?.closest('.cp__popup, [role="tablist"]')) return;
      e.preventDefault();
      escRef.current();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, []);

  // WAI-ARIA tabs, automatic activation, roving tabindex; arrows on both axes, Home/End.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = ORDER.indexOf(selected);
    const to =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? ORDER[(i + 1) % ORDER.length]
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? ORDER[(i - 1 + ORDER.length) % ORDER.length]
          : e.key === 'Home'
            ? ORDER[0]
            : e.key === 'End'
              ? ORDER[ORDER.length - 1]
              : null;
    if (!to) return;
    e.preventDefault();
    select(to, true);
  };

  const tab = (n: EcosystemNode) => (
    <button
      key={n.id}
      type="button"
      role="tab"
      id={tabId(n.id)}
      ref={(el) => void (tabs.current[n.id] = el)}
      className="cp__pill"
      data-kind={n.kind}
      aria-selected={n.id === selected}
      aria-controls={n.id === selected ? PANEL_ID : undefined}
      tabIndex={n.id === selected ? 0 : -1}
      onClick={() => select(n.id)}
      onKeyDown={onTabKey}
      onMouseEnter={() => setPeek(n.id)}
      onMouseLeave={() => setPeek((p) => (p === n.id ? null : p))}
      onFocus={(e) => {
        if (e.currentTarget.matches(':focus-visible')) setPeek(n.id);
      }}
      onBlur={() => setPeek((p) => (p === n.id ? null : p))}
    >
      {n.number && <span className="cp__pill-n">{n.number}</span>}
      <span className="cp__pill-label">{n.label}</span>
    </button>
  );

  const summaryBody = (n: EcosystemNode, twin = false) => (
    <>
      <div className="cp__summary-main">
        <p className="cp__card-tag">
          {n.kind === 'module'
            ? `${c.moduleTag} ${n.number}`
            : c.integrationTag}
          <span className="cp__card-place"> · {n.place}</span>
        </p>
        {twin ? (
          <p className="cp__card-title">{n.name}</p>
        ) : (
          <h3 className="cp__card-title">{n.name}</h3>
        )}
        {n.kind === 'integration' && (
          <p className="cp__card-note">{c.integrationNote}</p>
        )}
        <p className="cp__card-summary">{n.summary}</p>
      </div>
      <div className="cp__summary-aside">
        <ul className="cp__highlights" aria-label={s.highlightsLabel}>
          {n.capabilities.slice(0, HIGHLIGHTS).map((cap) => (
            <li key={cap}>{cap}</li>
          ))}
        </ul>
        <div className="cp__summary-actions">
          {twin ? (
            <span className="cp__details-btn">
              {s.detailsLabel}
              <Glyph d={ICON_CHEVRON} />
            </span>
          ) : (
            <button
              type="button"
              ref={detailBtn}
              className="cp__details-btn"
              aria-expanded={detailsOpen}
              aria-controls={DETAILS_ID}
              onClick={toggleDetails}
            >
              {s.detailsLabel}
              <Glyph d={ICON_CHEVRON} />
            </button>
          )}
        </div>
      </div>
    </>
  );

  /* Overlay geometry in CSS px (viewBox = the measured box) so the outline stays crisp. */
  const W = size.w;
  const H = size.h;
  const poly = (pts: Pt[]) =>
    pts
      .map((p) => {
        const q = px(p);
        return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
      })
      .join(' ');
  const selGeo = comp.nodes[selected];

  const sectionStyle = {
    '--aspect': String(comp.aspect),
    '--pills-h': `${pillsH}px`,
  } as CSSProperties;

  return (
    <section
      ref={sectionRef}
      className="cp"
      aria-labelledby="cp-title"
      style={sectionStyle}
    >
      <div className="cp__header" aria-hidden="true">
        <span>IWMS</span>
        <span className="cp__header-badge">
          Proposal preview v2 · static city · {source.label}
          {hasImage ? '' : ', images pending'} · aspect {comp.aspect.toFixed(2)}
        </span>
      </div>
      <div className="cp__inner">
        <header className="cp__head">
          <p className="cp__eyebrow">{c.eyebrow}</p>
          <h2 id="cp-title" className="cp__title">
            {c.title}
          </h2>
          <p className="cp__lead">{s.lead}</p>
        </header>

        <div
          ref={tablistRef}
          className="cp__tabs"
          role="tablist"
          aria-label={c.railLabel}
        >
          {MODULES.map(tab)}
          <span className="cp__tabs-divider" aria-hidden="true">
            {c.integrationTag}
          </span>
          {INTEGRATIONS.map(tab)}
        </div>

        <div className="cp__view" data-float={float ? 'true' : 'false'}>
          <div
            ref={stageRef}
            className="cp__stage"
            data-focused={focused ? 'true' : 'false'}
          >
            <CityPicture source={source} phone={phone} />

            {W > 0 && (
              <svg
                className="cp__zones"
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                {!hasImage &&
                  ORDER.map((id) => (
                    <polygon
                      key={id}
                      className="cp__zone-ghost"
                      points={poly(comp.nodes[id].footprint)}
                    />
                  ))}
                {focused && (
                  <>
                    <path
                      className="cp__dim"
                      fillRule="evenodd"
                      d={`M0 0H${W}V${H}H0Z M${poly(selGeo.footprint).replaceAll(' ', ' L')}Z`}
                    />
                    <polygon
                      key={`sel-${selected}`}
                      className="cp__zone-sel"
                      points={poly(selGeo.footprint)}
                    />
                  </>
                )}
              </svg>
            )}

            <div className="cp__pins" aria-hidden="true">
              {ORDER.map((id) => {
                const n = ECOSYSTEM_BY_ID[id];
                const [x, y] = comp.nodes[id].anchor;
                const l = labels[id];
                const isSel = active === id;
                return (
                  <button
                    key={id}
                    type="button"
                    tabIndex={-1}
                    className="cp__pin"
                    data-pin={id}
                    data-kind={n.kind}
                    data-state={isSel ? 'selected' : 'idle'}
                    data-label={isSel || peek === id ? 'show' : 'auto'}
                    data-covered={covered.has(id) ? 'true' : 'false'}
                    data-flip={l?.flip ? 'true' : 'false'}
                    style={
                      {
                        left: `${x}%`,
                        top: `${y}%`,
                        '--dx': `${l?.dx ?? 0}px`,
                      } as CSSProperties
                    }
                    onClick={() => select(id)}
                  >
                    <span className="cp__pin-dot" />
                    <span className="cp__pin-badge">
                      {n.number ? (
                        Number(n.number)
                      ) : (
                        <Glyph d={ICON_HUB} size={12} />
                      )}
                    </span>
                    <span
                      className="cp__pin-label"
                      ref={(el) => void (labelEls.current[id] = el)}
                    >
                      {n.number && (
                        <span className="cp__pin-n">{n.number}</span>
                      )}
                      {n.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {focused ? (
              <button
                type="button"
                ref={(el) => void (chipRef.current = el)}
                className="cp__overview-btn"
                onClick={returnToOverview}
              >
                <Glyph d={ICON_OVERVIEW} />
                {s.overviewLabel}
              </button>
            ) : (
              <p className="cp__hint" ref={(el) => void (chipRef.current = el)}>
                <Glyph d={ICON_TAP} size={13} />
                {s.hint}
              </p>
            )}
          </div>

          {/* One tabpanel for the selected module: the summary (floating popup, or below the
              image) and the full details. One popup element, so switching modules glides it. */}
          <article
            id={PANEL_ID}
            className="cp__card"
            data-kind={node.kind}
            role="tabpanel"
            aria-labelledby={tabId(selected)}
          >
            {float && placement ? (
              <div
                className="cp__summary cp__popup"
                data-side={placement.side}
                style={{
                  transform: `translate(${placement.x}px, ${placement.y}px)`,
                }}
              >
                {summaryBody(node)}
                <button
                  type="button"
                  className="cp__popup-close"
                  aria-label={s.closePopupLabel(node.label)}
                  onClick={closePopup}
                >
                  <Glyph d={ICON_CLOSE} />
                </button>
              </div>
            ) : (
              <div className="cp__summary">{summaryBody(node)}</div>
            )}
            <div
              id={DETAILS_ID}
              className="cp__details"
              role="region"
              aria-label={`${s.detailsTitle}: ${node.name}`}
              hidden={!detailsOpen}
            >
              <div className="cp__details-head">
                <p className="cp__details-title">
                  {s.detailsTitle}
                  <span className="cp__details-name"> · {node.label}</span>
                </p>
                <button
                  type="button"
                  className="cp__close-btn"
                  aria-label={s.closeDetailsLabel(node.name)}
                  onClick={closeDetails}
                >
                  <Glyph d={ICON_CLOSE} />
                  {s.closeLabel}
                </button>
              </div>
              <div className="cp__details-grid">
                <div>
                  <h4 className="cp__card-sub">{c.capabilitiesLabel}</h4>
                  <ul className="cp__card-list">
                    {node.capabilities.map((cap) => (
                      <li key={cap}>{cap}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="cp__card-benefit">{node.benefit}</p>
                  <h4 className="cp__card-sub">{c.connectsLabel}</h4>
                  <ul className="cp__card-links">
                    {node.connects.map((to) => (
                      <li key={to}>
                        <button
                          type="button"
                          className="cp__link"
                          onClick={() => select(to, true)}
                        >
                          {ECOSYSTEM_BY_ID[to].label}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <a className="cp__source" href={brochureHref(node.page)}>
                    {c.sourceLabel(node.page)}
                  </a>
                </div>
              </div>
            </div>
          </article>

          {wantFloat && (
            <div
              ref={twinRef}
              className="cp__summary cp__popup cp__popup-twin"
              data-kind={node.kind}
              aria-hidden="true"
              inert
            >
              {summaryBody(node, true)}
            </div>
          )}
        </div>

        <p className="cp__note">{s.stageNote}</p>
      </div>
    </section>
  );
}

function App() {
  try {
    return <Scene source={loadSource()} />;
  } catch (e) {
    return <p className="cp__error">{String(e)}</p>;
  }
}

document.documentElement.classList.add('js');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
