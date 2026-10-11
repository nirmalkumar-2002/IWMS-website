import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { heroContent as copy } from '@/content/hero';
import { useReducedMotion } from '@/lib/animations/useReducedMotion';
import './hero.css';

const media = __HERO_MEDIA__;
const hasVideo = media.webm || media.mp4;
const lines = copy.labels.lines.split('|');
const anchorId = copy.labels.secondaryHref.slice(1);

type NetworkInfo = { saveData?: boolean };

/** Smooth-scrolls to the reserved #how-it-works chapter; a missing target is a quiet no-op. */
function scrollToChapter(
  event: MouseEvent<HTMLAnchorElement>,
  reduced: boolean,
) {
  const target = document.getElementById(anchorId);
  event.preventDefault();
  if (!target) return;
  target.scrollIntoView({
    behavior: reduced ? 'auto' : 'smooth',
    block: 'start',
  });
  history.replaceState(null, '', `#${anchorId}`);
}

/** Scene 1. Text is static SSR markup; intro motion is CSS-only so the headline paints immediately.
 * Exposes --hero-progress (0 → 1 while leaving) so the next chapter can pick up the hand-off.
 */
export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const [playVideo, setPlayVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Video only after hydration, on larger screens, without reduced motion or data saver.
  useEffect(() => {
    if (!hasVideo || reduced) return;
    const connection = (navigator as Navigator & { connection?: NetworkInfo })
      .connection;
    const wide = window.matchMedia('(min-width: 768px)');
    const update = () => setPlayVideo(wide.matches && !connection?.saveData);
    update();
    wide.addEventListener('change', update);
    return () => wide.removeEventListener('change', update);
  }, [reduced]);

  // Scroll-linked exit: one rAF-throttled passive listener writes a single CSS variable.
  useEffect(() => {
    const element = ref.current;
    if (!element || reduced) return;
    let frame = 0;
    let visible = true;
    const write = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / rect.height));
      element.style.setProperty('--hero-progress', progress.toFixed(4));
      const nowVisible = progress < 1;
      if (nowVisible !== visible && video.current) {
        visible = nowVisible;
        if (visible) void video.current.play().catch(() => undefined);
        else video.current.pause();
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };
    write();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      element.style.removeProperty('--hero-progress');
    };
  }, [reduced]);

  return (
    <section
      ref={ref}
      id={copy.id}
      className="hero"
      aria-labelledby="hero-title"
      data-video={videoReady}
    >
      <div className="hero-media" aria-hidden="true">
        <div className="hero-camera">
          <div className="hero-pull">
            <div className="hero-placeholder">
              <span className="hero-haze hero-haze-a" />
              <span className="hero-haze hero-haze-b" />
            </div>
            {media.poster && (
              <img
                className="hero-poster"
                src="/media/hero-poster.avif"
                alt=""
                width={1920}
                height={1080}
                fetchPriority="high"
                decoding="async"
              />
            )}
            {playVideo && (
              <video
                ref={video}
                className="hero-video"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster={media.poster ? '/media/hero-poster.avif' : undefined}
                onPlaying={() => setVideoReady(true)}
                onError={() => {
                  setVideoReady(false);
                  setPlayVideo(false);
                }}
              >
                {media.webm && (
                  <source src="/media/hero-loop.webm" type="video/webm" />
                )}
                {media.mp4 && (
                  <source src="/media/hero-loop.mp4" type="video/mp4" />
                )}
              </video>
            )}
          </div>
        </div>
        <div className="hero-grade" />
        <div className="hero-grain" />
      </div>
      {import.meta.env.DEV && !media.poster && (
        <p className="hero-dev-label">{copy.labels.devMediaLabel}</p>
      )}

      <div className="hero-stage container">
        <div className="hero-copy">
          <p className="hero-eyebrow hero-fade">{copy.eyebrow}</p>
          <h1 id="hero-title" className="hero-title">
            {lines.map((line, index) => (
              <span className="hero-line" key={line}>
                <span
                  className="hero-line-inner"
                  data-accent={index === lines.length - 1}
                  style={{ animationDelay: `${180 + index * 120}ms` }}
                >
                  {line}
                </span>{' '}
              </span>
            ))}
          </h1>
          <div className="hero-aside">
            <p className="hero-lead hero-fade">{copy.description}</p>
            <div className="hero-ctas hero-fade">
              <Button href={copy.labels.primaryHref}>
                {copy.labels.primaryCta}
                <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
              </Button>
              <Button
                href={copy.labels.secondaryHref}
                variant="secondary"
                className="hero-secondary"
                onClick={(event) => scrollToChapter(event, reduced)}
              >
                <span className="hero-play" aria-hidden="true" />
                {copy.labels.secondaryCta}
              </Button>
            </div>
          </div>
        </div>

        <div className="hero-footer hero-fade">
          <ul className="hero-trust" aria-label={copy.labels.trustLabel}>
            {copy.items.map((item) => (
              <li key={item.title}>{item.title}</li>
            ))}
          </ul>
          <a
            className="hero-scroll"
            href={copy.labels.secondaryHref}
            aria-label={copy.labels.scrollLabel}
            onClick={(event) => scrollToChapter(event, reduced)}
          >
            <span>{copy.labels.scrollHint}</span>
            <span className="hero-scroll-track" aria-hidden="true">
              <ArrowDown size={14} strokeWidth={2} />
            </span>
          </a>
        </div>
      </div>
      <div className="hero-handoff" aria-hidden="true" />
    </section>
  );
}
