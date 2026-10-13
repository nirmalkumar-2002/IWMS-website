import { headerContent as h } from '@/content/hero';
import { demoRequestLink, siteConfig } from '@/content/config';
import type { HeroLabel } from './bridge';
import './site-header.css';

export interface SiteHeaderProps {
  /**
   * Navigates the cinematic hero to a timeline label. Null until the scroll experience is live,
   * and always null in still/static/pending modes (no timeline there), so the server render and
   * the first client render are identical.
   */
  onNavigate: ((label: HeroLabel) => void) | null;
}

/**
 * Minimal site header: IWMS / Zigma identity from first paint, Skip intro, Explore platform and
 * Request demo. Fixed over the pinned stage, so it adds no page height.
 *
 * Navigation is deliberately short: the site has no other sections yet (routes are `/`,
 * `/privacy` and the 404). Deferred until their destinations exist: Modules, Solutions,
 * Case studies, Contact. No placeholder anchors.
 */
export default function SiteHeader({ onNavigate }: SiteHeaderProps) {
  const demo = demoRequestLink();
  return (
    <header className="site-header">
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
        {onNavigate ? (
          <button
            type="button"
            className="site-header__action site-header__action--outline"
            aria-label={h.explore}
            onClick={() => onNavigate('collect:household')}
          >
            <span className="site-header__long">{h.explore}</span>
            <span className="site-header__short" aria-hidden="true">
              {h.exploreShort}
            </span>
          </button>
        ) : (
          // No timeline to scroll (no JS, still/static modes, or not yet live): the brochure is
          // the real platform overview.
          <a
            className="site-header__action site-header__action--outline"
            href={siteConfig.brochurePath}
            type="application/pdf"
            aria-label={h.exploreBrochureLabel}
          >
            <span className="site-header__long">{h.explore}</span>
            <span className="site-header__short" aria-hidden="true">
              {h.exploreShort}
            </span>
          </a>
        )}
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
