import { useEffect, useRef, useState } from 'react';
import { headerContent as h } from '@/content/hero';
import { demoRequestLink } from '@/content/config';
import type { HeroLabel } from './bridge';
import './site-header.css';

export interface SiteHeaderProps {
  /**
   * Navigates the cinematic hero to a timeline label. Null until the scroll experience is live,
   * and always null in still/static/pending modes (no timeline there), so the server render and
   * the first client render are identical.
   */
  onNavigate: ((label: HeroLabel) => void) | null;
  /**
   * Explore platform in the cinematic mode: jumps to the IWMS ecosystem (Scene 04) without
   * scrubbing through the pinned hero. Null elsewhere: the link's own `#ecosystem` anchor works
   * natively (no JS, still/static modes, before the experience is live).
   */
  onExplore: (() => void) | null;
}

/**
 * Minimal site header: IWMS / Zigma identity from first paint, Skip intro, Explore platform and
 * Request demo. Fixed over the pinned stage, so it adds no page height.
 *
 * Navigation is deliberately short: the site has no other sections yet (routes are `/`,
 * `/privacy` and the 404). Deferred until their destinations exist: Modules, Solutions,
 * Case studies, Contact. No placeholder anchors.
 */
export default function SiteHeader({ onNavigate, onExplore }: SiteHeaderProps) {
  const demo = demoRequestLink();
  const ref = useRef<HTMLElement>(null);
  // Over the hero the header stays a light gradient on the canvas. Once the hero has scrolled
  // out from under it, page content passes beneath the fixed header, so it gets a solid backing
  // (otherwise headings scroll "through" the brand). One observer; no scroll listener.
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const hero = document.querySelector('section.hero');
    const header = ref.current;
    if (!hero || !header || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setSolid(!e.isIntersecting), {
      rootMargin: `-${Math.round(header.offsetHeight)}px 0px 0px 0px`,
    });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
  return (
    <header ref={ref} className="site-header" data-solid={solid ? 'true' : 'false'}>
      <a className="site-header__brand" href="/" aria-label={h.homeLabel}>
        <img
          className="site-header__logo"
          src="/brand/zigma.png"
          alt=""
          width={126}
          height={142}
          decoding="async"
        />
        <span className="site-header__wordmark">{h.brand}</span>
        <span className="site-header__descriptor">
          <span>{h.brandFull}</span>
          <span className="site-header__by">{h.brandBy}</span>
        </span>
      </a>
      <nav className="site-header__nav" aria-label={h.navLabel}>
        {onNavigate && (
          <button
            type="button"
            className="site-header__action site-header__action--quiet"
            aria-label={h.skipIntroLabel}
            onClick={() => onNavigate('collect:end')}
          >
            {h.skipIntro}
          </button>
        )}
        {/* A real in-page link in every mode (works without JS); the cinematic mode takes over
            the click so the jump skips the pinned hero instead of scrubbing through it. */}
        <a
          className="site-header__action site-header__action--outline"
          href={`#${h.exploreTarget}`}
          aria-label={h.exploreLabel}
          onClick={(event) => {
            if (!onExplore) return;
            event.preventDefault();
            onExplore();
          }}
        >
          <span className="site-header__long">{h.explore}</span>
          <span className="site-header__short" aria-hidden="true">
            {h.exploreShort}
          </span>
        </a>
        <a
          className="site-header__action site-header__action--primary"
          href={demo.href}
          {...(demo.external
            ? {
                target: '_blank',
                rel: 'noopener',
                'aria-label': h.demoWebsiteLabel,
              }
            : { 'aria-label': h.demo })}
        >
          <span className="site-header__long">{h.demo}</span>
          <span className="site-header__short" aria-hidden="true">
            {h.demoShort}
          </span>
        </a>
      </nav>
    </header>
  );
}
