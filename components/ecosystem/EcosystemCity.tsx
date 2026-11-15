import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  ECOSYSTEM_BY_ID,
  ECOSYSTEM_NODES,
  type EcosystemNodeId,
} from '@/content/ecosystem';
import {
  CITY_DESKTOP,
  CITY_IMAGES,
  CITY_MOBILE,
  type CityComposition,
  type CityPoint,
} from './cityData';
import './city.css';

/**
 * Scene 04 city view: one fixed-perspective, pre-rendered city image (no WebGL, no camera, no
 * animation loop). The box has the image's own aspect ratio (16:9; 1:1 composition on phones),
 * reserved before the image loads, so percentage-positioned pins and the SVG zone highlight line
 * up exactly at every width. Rendered on the server too (the image alone without JS).
 *
 * Enhanced (after hydration): small numbered pins (aria-hidden mouse/touch shortcuts — the module
 * pills are the accessible control), labels only for the selected zone / hover / pill focus, the
 * selected footprint highlighted with a ≤10% dim of the rest, and placement of the section's one
 * floating popup beside the selected zone. Label and popup placement are recomputed only when
 * the layout changes (ResizeObserver, selection, overlays), never per frame.
 */

export type PopupPlacement = { x: number; y: number; side: 'left' | 'right' };
export type PopupSize = { w: number; h: number };

const PHONE_QUERY = '(max-width: 767px)';
/** Marks overlay chips (hint, Return to overview) passed as children; pins and labels avoid them. */
export const CITY_OVERLAY_ATTR = 'data-eco-overlay';
const ORDER = ECOSYSTEM_NODES.map((n) => n.id);
/** Rects of the overlay chips inside the city box (relative to the box). */
const overlayRects = (box: HTMLElement | null) =>
  box
    ? [...box.querySelectorAll<HTMLElement>(`[${CITY_OVERLAY_ATTR}]`)].map(
        (el) => relRect(el, box),
      )
    : [];

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
const relRect = (el: Element, to: Element): Rect => {
  const r = el.getBoundingClientRect();
  const o = to.getBoundingClientRect();
  return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
};

/** Pin geometry (matches city.css): a 22px badge centred PIN_LIFT px above the anchor, joined by
 *  a short stem to a small ground dot on the anchor. */
const BADGE = 22;
const PIN_LIFT = 17;
const LABEL_GAP = 6;
const EDGE = 8;
type Pt = { x: number; y: number };
const pinRect = (a: Pt): Rect => ({
  x: a.x - BADGE / 2,
  y: a.y - PIN_LIFT - BADGE / 2,
  w: BADGE,
  h: PIN_LIFT + BADGE / 2 + 3,
});

interface LabelPos {
  /** Below the anchor instead of above the badge. */
  flip: boolean;
  dx: number;
}
type LabelMap = Partial<Record<EcosystemNodeId, LabelPos>>;
const labelRect = (a: Pt, w: number, h: number, p: LabelPos): Rect => ({
  x: a.x - w / 2 + p.dx,
  y: p.flip ? a.y + 3 + LABEL_GAP : a.y - PIN_LIFT - BADGE / 2 - LABEL_GAP - h,
  w,
  h,
});

/** Labels show one or two at a time (selected + hovered), so each is placed against the pins and
 *  overlay chips, plus the selected label for the others: above its badge (centred, then slid
 *  sideways, always kept inside the view), else below its anchor; the cheapest spot wins. */
function layoutLabels(
  W: number,
  H: number,
  anchors: Record<EcosystemNodeId, Pt>,
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
        pos.dx += Math.round(
          Math.max(0, EDGE - r.x) - Math.max(0, r.x + w - (W - EDGE)),
        );
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

const POPUP_MARGIN = 16;
const POPUP_GAP = 16;

/**
 * The floating popup beside the selected zone, on the side with more free space (the other side
 * is the fallback); vertically centred on the zone, clamped 16px inside the view and below an
 * overlay chip where they would meet; then nudged vertically (16px steps) and away from the zone
 * (24px steps) to cover as few other pins as possible. It never overlaps `exclude` (zone box ∪
 * selected pin ∪ its label). Null when it fits on neither side.
 */
function placePopup(
  W: number,
  H: number,
  size: PopupSize,
  exclude: Rect,
  pins: Rect[],
  blockers: Rect[],
): PopupPlacement | null {
  const { w: pw, h: ph } = size;
  if (ph > H - 2 * POPUP_MARGIN) return null;
  const freeL = exclude.x;
  const freeR = W - (exclude.x + exclude.w);
  const sides: PopupPlacement['side'][] =
    freeR >= freeL ? ['right', 'left'] : ['left', 'right'];
  let best: (PopupPlacement & { cost: number }) | null = null;
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
          pins.reduce((n, p) => n + (overlaps(r, p, 6) ? 1000 : 0), 0) +
          Math.abs(y - cy) +
          Math.abs(x - x0) * 0.75 +
          (side === sides[0] ? 0 : 250);
        if (!best || cost < best.cost)
          best = { x: Math.round(x), y, side, cost };
      }
    }
    if (best && best.cost < 1000) break;
  }
  return best ? { x: best.x, y: best.y, side: best.side } : null;
}

/** ICCC pin glyph: a small hub (command centre). */
function HubIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 5.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2" />
    </svg>
  );
}

const srcset = (list: ReadonlyArray<{ src: string; w: number }>) =>
  list.map((v) => `${v.src} ${v.w}w`).join(', ');
/** Matches the city box: the .eco__inner content width (1200px max, minus the 4vw gutters). */
const SIZES_DESKTOP = '(min-width: 1304px) 1200px, 92vw';
const SIZES_MOBILE = '(max-width: 400px) calc(100vw - 32px), 92vw';

export function EcosystemCity({
  enhanced,
  selected,
  focused,
  peek,
  popupSize,
  onSelect,
  onPopupPlace,
  alt,
  children,
}: {
  enhanced: boolean;
  selected: EcosystemNodeId;
  /** A module is selected on the city (false = overview). */
  focused: boolean;
  /** Pill hovered / keyboard-focused: previews that zone's label. */
  peek: EcosystemNodeId | null;
  /** Size of the popup to place (null = no floating popup wanted). */
  popupSize: PopupSize | null;
  onSelect: (id: EcosystemNodeId) => void;
  onPopupPlace: (p: PopupPlacement | null) => void;
  alt: string;
  /** Overlay chips (hint / Return to overview), marked with CITY_OVERLAY_ATTR. */
  children?: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const labelEls = useRef<
    Partial<Record<EcosystemNodeId, HTMLSpanElement | null>>
  >({});
  const [phone, setPhone] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [labels, setLabels] = useState<LabelMap>({});
  const [covered, setCovered] = useState<ReadonlyArray<EcosystemNodeId>>([]);
  const comp: CityComposition = phone ? CITY_MOBILE : CITY_DESKTOP;

  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Box size (integer CSS px), only on a real change.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!enhanced || !el) return;
    const measure = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [enhanced]);

  const px = useCallback(
    (p: CityPoint): Pt => ({
      x: (p[0] / 100) * size.w,
      y: (p[1] / 100) * size.h,
    }),
    [size],
  );

  const active = focused ? selected : null;

  // Label placement: once per layout change (size, composition, selection, overlay chips).
  useLayoutEffect(() => {
    if (!enhanced || !size.w) return;
    const anchors = {} as Record<EcosystemNodeId, Pt>;
    const sizes = {} as Record<EcosystemNodeId, { w: number; h: number }>;
    for (const id of ORDER) {
      anchors[id] = px(comp.nodes[id].anchor);
      const el = labelEls.current[id];
      sizes[id] = { w: el?.offsetWidth ?? 0, h: el?.offsetHeight ?? 0 };
    }
    const next = layoutLabels(
      size.w,
      size.h,
      anchors,
      sizes,
      active,
      overlayRects(boxRef.current),
    );
    setLabels((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    );
  }, [enhanced, size, comp, active, px]);

  // Popup placement: when a size is given (the section wants a floating popup), after labels.
  const pw = popupSize?.w ?? 0;
  const ph = popupSize?.h ?? 0;
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!enhanced || !box || !size.w || !pw || !ph) {
      onPopupPlace(null);
      setCovered((c) => (c.length ? [] : c));
      return;
    }
    const g = comp.nodes[selected];
    const [l, t, r, b] = g.box;
    let exclude: Rect = {
      x: (l / 100) * size.w,
      y: (t / 100) * size.h,
      w: ((r - l) / 100) * size.w,
      h: ((b - t) / 100) * size.h,
    };
    exclude = union(exclude, pinRect(px(g.anchor)));
    const selLabel = labelEls.current[selected];
    if (selLabel) exclude = union(exclude, relRect(selLabel, box));
    const others = ORDER.filter((id) => id !== selected);
    const pins = others.map((id) => pinRect(px(comp.nodes[id].anchor)));
    const p = placePopup(
      size.w,
      size.h,
      { w: pw, h: ph },
      exclude,
      pins,
      overlayRects(box),
    );
    onPopupPlace(p);
    // A pin is hidden when the popup covers any visible part of it (badge, or stem and dot).
    const pr = p && { x: p.x, y: p.y, w: pw, h: ph };
    const next = pr
      ? others.filter((id) => {
          const a = px(comp.nodes[id].anchor);
          const badge = {
            x: a.x - BADGE / 2,
            y: a.y - PIN_LIFT - BADGE / 2,
            w: BADGE,
            h: BADGE,
          };
          const stem = {
            x: a.x - 3,
            y: badge.y + BADGE,
            w: 6,
            h: PIN_LIFT - BADGE / 2 + 3,
          };
          return overlaps(pr, badge) || overlaps(pr, stem);
        })
      : [];
    setCovered((c) => (c.join() === next.join() ? c : next));
  }, [enhanced, size, comp, selected, labels, pw, ph, px, onPopupPlace]);

  const W = size.w;
  const H = size.h;
  const poly = (pts: readonly CityPoint[]) =>
    pts
      .map((p) => {
        const q = px(p);
        return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
      })
      .join(' ');
  const sel = comp.nodes[selected];
  const hidden = new Set(covered);

  const boxStyle = {
    '--city-ar': `${CITY_DESKTOP.width} / ${CITY_DESKTOP.height}`,
    '--city-ar-m': `${CITY_MOBILE.width} / ${CITY_MOBILE.height}`,
  } as CSSProperties;

  return (
    <div
      ref={boxRef}
      className="eco__city"
      data-focused={focused ? 'true' : 'false'}
      style={boxStyle}
    >
      <picture className="eco__city-picture">
        <source
          media={PHONE_QUERY}
          type="image/webp"
          srcSet={srcset(CITY_IMAGES.mobile.webp)}
          sizes={SIZES_MOBILE}
          width={CITY_MOBILE.width}
          height={CITY_MOBILE.height}
        />
        <source
          media={PHONE_QUERY}
          srcSet={`${CITY_IMAGES.mobile.jpg} ${CITY_MOBILE.width}w`}
          sizes={SIZES_MOBILE}
          width={CITY_MOBILE.width}
          height={CITY_MOBILE.height}
        />
        <source
          type="image/webp"
          srcSet={srcset(CITY_IMAGES.desktop.webp)}
          sizes={SIZES_DESKTOP}
          width={CITY_DESKTOP.width}
          height={CITY_DESKTOP.height}
        />
        <img
          className="eco__city-img"
          src={CITY_IMAGES.desktop.jpg}
          width={CITY_DESKTOP.width}
          height={CITY_DESKTOP.height}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </picture>

      {enhanced && W > 0 && focused && (
        <svg
          className="eco__zones"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            className="eco__zone-dim"
            fillRule="evenodd"
            d={`M0 0H${W}V${H}H0Z M${poly(sel.footprint).replaceAll(' ', ' L')}Z`}
          />
          <polygon
            key={selected}
            className="eco__zone-sel"
            points={poly(sel.footprint)}
          />
        </svg>
      )}

      {enhanced && (
        <div className="eco__pins" aria-hidden="true">
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
                className="eco__pin"
                data-id={id}
                data-kind={n.kind}
                data-state={isSel ? 'selected' : 'idle'}
                data-label={isSel || peek === id ? 'show' : 'auto'}
                data-covered={hidden.has(id) ? 'true' : 'false'}
                data-flip={l?.flip ? 'true' : 'false'}
                style={
                  {
                    left: `${x}%`,
                    top: `${y}%`,
                    '--dx': `${l?.dx ?? 0}px`,
                  } as CSSProperties
                }
                onClick={() => onSelect(id)}
              >
                <span className="eco__pin-dot" />
                <span className="eco__pin-badge">
                  {n.number ? Number(n.number) : <HubIcon />}
                </span>
                <span
                  className="eco__pin-label"
                  ref={(el) => void (labelEls.current[id] = el)}
                >
                  {n.number && <span className="eco__pin-n">{n.number}</span>}
                  {n.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {children}
    </div>
  );
}
