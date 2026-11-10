import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { SoftwareRegion } from '@/content/software';

/**
 * Shared building blocks of the illustrative IWMS application (one design system for all four
 * demonstrations): regions with their numbered callout markers, panels, skeleton placeholders and
 * small line icons. Nothing here renders data — only structure, verified labels and placeholders.
 */

/** Region → marker number for the callouts of the active stage. */
export const MarkerContext = createContext<ReadonlyMap<SoftwareRegion, number>>(
  new Map(),
);

interface RegionProps {
  name: SoftwareRegion;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** A named part of the screen. A callout of the active stage marks it with its number. */
export function Region({ name, className, style, children }: RegionProps) {
  const n = useContext(MarkerContext).get(name);
  return (
    <div
      className={`sw-region${className ? ` ${className}` : ''}`}
      data-region={name}
      data-marked={n === undefined ? undefined : 'true'}
      style={style}
    >
      {children}
      {n !== undefined && (
        <span className="sw-marker" aria-hidden="true">
          {n}
        </span>
      )}
    </div>
  );
}

interface PanelProps {
  title: ReactNode;
  /** Optional right-hand header content (chips, glyphs). */
  aside?: ReactNode;
  region?: SoftwareRegion;
  className?: string;
  children?: ReactNode;
}

/** A bordered application card with a small header; a Region when `region` is given. */
export function Panel({
  title,
  aside,
  region,
  className,
  children,
}: PanelProps) {
  const body = (
    <>
      <div className="sw-panel__head">
        <span className="sw-panel__title">{title}</span>
        {aside}
      </div>
      <div className="sw-panel__body">{children}</div>
    </>
  );
  const cls = `sw-panel${className ? ` ${className}` : ''}`;
  return region ? (
    <Region name={region} className={cls}>
      {body}
    </Region>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** A skeleton bar (placeholder for a value the live application shows). */
export function Skel({
  w = '100%',
  tone,
}: {
  w?: string;
  tone?: 'soft' | 'strong';
}) {
  return (
    <span
      className="sw-skel"
      data-tone={tone}
      style={{ width: w }}
      aria-hidden="true"
    />
  );
}

/** "Shown in the live application" placeholder value. */
export function Empty({ children }: { children: ReactNode }) {
  return <span className="sw-empty">{children}</span>;
}

/** Decorative 16px line icon. */
export function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      className="sw-icon"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

export const ICONS = {
  grid: 'M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z',
  pin: 'M8 14.5s-4.5-3.9-4.5-7.6a4.5 4.5 0 0 1 9 0c0 3.7-4.5 7.6-4.5 7.6zM8 5.4v2.2',
  truck:
    'M1.5 4h8v7h-8zM9.5 6.5h3l2 2.5V11h-5M4 13a1.3 1.3 0 1 0 0-.01M11.5 13a1.3 1.3 0 1 0 0-.01',
  scale:
    'M8 2.5v11M4.5 13.5h7M3 5h10M3 5 1.5 9a1.6 1.6 0 0 0 3 0zM13 5l-1.5 4a1.6 1.6 0 0 0 3 0z',
  chat: 'M2 3h12v8H6.5L3 14v-3H2z',
  layers: 'm8 2 6 3-6 3-6-3zM2 8l6 3 6-3M2 11l6 3 6-3',
  chart: 'M2 2v12h12M5 11V8M8 11V5M11 11V7',
  doc: 'M4 1.8h5.5L12.5 5v9.2h-8.5zM9.5 1.8V5h3M6 8.5h4.5M6 11h4.5',
  shield: 'M8 1.8 13 3.6v4c0 3.2-2.2 5.4-5 6.6-2.8-1.2-5-3.4-5-6.6v-4z',
  bell: 'M4 11V7a4 4 0 0 1 8 0v4l1.2 1.5H2.8zM6.6 14h2.8',
  search: 'M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM10.6 10.6 14 14',
  settings:
    'M8 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4',
  alert: 'M8 2 14.5 13.5h-13zM8 6.5v3.3M8 11.8h.01',
  camera:
    'M2 4.8h3l1.2-1.8h3.6L11 4.8h3v8H2zM8 11a2.3 2.3 0 1 0 0-4.6A2.3 2.3 0 0 0 8 11z',
  check: 'm3.5 8.3 3 3 6-6.3',
  clock: 'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM8 4.8V8l2.2 1.4',
  plus: 'M8 3.5v9M3.5 8h9',
  minus: 'M3.5 8h9',
  arrowRight: 'M3 8h10M9.5 4.5 13 8l-3.5 3.5',
  arrowDown: 'M8 3v10M4.5 9.5 8 13l3.5-3.5',
  link: 'M6.5 9.5 9.5 6.5M7 4.5l1-1a2.8 2.8 0 0 1 4 4l-1 1M9 11.5l-1 1a2.8 2.8 0 0 1-4-4l1-1',
  image: 'M2 3h12v10H2zM2 11l3.5-3.5 3 3L10.5 8.5 14 12M10.5 6.2h.01',
  location:
    'M8 14.5s-4.5-3.9-4.5-7.6a4.5 4.5 0 0 1 9 0c0 3.7-4.5 7.6-4.5 7.6zM8 8.6a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z',
  chevronDown: 'm4 6 4 4 4-4',
  user: 'M8 8a2.8 2.8 0 1 0 0-5.6A2.8 2.8 0 0 0 8 8zM2.8 14c.6-2.6 2.7-4 5.2-4s4.6 1.4 5.2 4',
  download: 'M8 2.5v8M4.8 7.5 8 10.7l3.2-3.2M2.5 13.5h11',
} as const;

/** Five star outlines (a 1–5 pickup rating, unrated). */
export function Stars() {
  return (
    <span className="sw-stars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          viewBox="0 0 16 16"
          width="18"
          height="18"
          focusable="false"
        >
          <path
            d="m8 1.8 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}
