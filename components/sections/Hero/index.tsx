import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { Heading } from '@/components/ui/Heading';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { heroContent as copy } from '@/content/hero';
import { sharedContent } from '@/content/shared';
import { siteConfig } from '@/content/config';
import { heroJourneyHandoff as handoff } from '@/components/scene/handoff';
import { useScrollTimeline } from '@/lib/animations/useScrollTimeline';
import { useReducedMotion } from '@/lib/animations/useReducedMotion';
import { HeroScene } from './Scene';
import { Mascot } from './Mascot';
import { useSiteExperience } from '@/components/scene/experienceContext';
import './hero.css';
function subscribeMobile(callback: () => void) {
  const media = window.matchMedia('(max-width: 767px)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
export default function Hero() {
  const siteExperience = useSiteExperience();
  const ref = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const reduced = useReducedMotion();
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia('(max-width: 767px)').matches,
    () => false,
  );
  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    // Keep prerendered text/poster through the first paints; defer pin until fonts settle.
    void document.fonts.ready.then(() => {
      if (!cancelled)
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            if (
              !cancelled &&
              ref.current &&
              ref.current.getBoundingClientRect().bottom > 0
            )
              setEnabled(true);
          });
        });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);
  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;
    const observer = new IntersectionObserver((entries) => {
      element.dataset.visible = String(entries[0].isIntersecting);
      setShowSkip(entries[0].isIntersecting && !reduced);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduced]);
  const end = useCallback(
    () => `+=${window.innerHeight * (mobile ? 1.2 : 1.8)}`,
    [mobile],
  );
  const timeline = useScrollTimeline(
    ref,
    (tl, element) => {
      const q = (selector: string) => element.querySelectorAll(selector);
      element.dataset.enhanced = 'true';
      const parked = mobile ? 420 : 380;
      tl.fromTo(
        q('[data-truck]'),
        { x: mobile ? 420 : -260, y: 380 },
        { x: parked, y: 380, duration: 0.2, ease: 'power2.out' },
        0,
      )
        .fromTo(
          q('[data-truck-body]'),
          { y: -1.5 },
          { y: 1.5, duration: 0.14, ease: 'power1.inOut', yoyo: true, repeat: 1 },
          0.14,
        )
        .to(q('[data-truck-body]'), { y: 0, duration: 0.08, ease: 'power2.out' }, 0.29)
        .fromTo(
          q('[data-wheel]'),
          { rotation: 0 },
          { rotation: 2160, duration: 0.2, ease: 'power2.out' },
          0,
        )
        .fromTo(
          q('[data-route-mask]'),
          { scaleX: 0, transformOrigin: '0 0' },
          { scaleX: 0.52, duration: 0.2, ease: 'none' },
          0,
        )
        .fromTo(
          q('[data-verify]'),
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.08 },
          0.38,
        )
        .fromTo(
          q('[data-notification]'),
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.03 },
          0.2,
        )
        .to(q('[data-notification]'), { opacity: 0, duration: 0.03 }, 0.3)
        .fromTo(
          q('[data-worker]'),
          { opacity: 0, x: parked + 150, y: 399 },
          { opacity: 1, x: 650, y: 399, duration: 0.08 },
          0.3,
        )
        .fromTo(
          q('[data-scan-beam]'),
          { opacity: 0, scaleX: 0.2, transformOrigin: '700px 440px' },
          { opacity: 0.55, scaleX: 1, duration: 0.05 },
          0.39,
        )
        .to(q('[data-scan-beam]'), { opacity: 0, duration: 0.03 }, 0.48)
        .fromTo(
          q('[data-bin]'),
          { x: 727, y: 407, rotation: 0 },
          {
            x: parked + 35,
            y: 325,
            rotation: -110,
            transformOrigin: '30px 20px',
            duration: 0.08,
          },
          0.5,
        )
        .fromTo(
          q('[data-waste]'),
          { opacity: 0, y: -30 },
          { opacity: 1, y: 5, duration: 0.03 },
          0.57,
        )
        .to(q('[data-waste]'), { opacity: 0, y: 25, duration: 0.03 }, 0.6)
        .to(
          q('[data-bin]'),
          { x: 727, y: 407, rotation: 0, duration: 0.05 },
          0.6,
        )
        .fromTo(
          q('[data-truck-load]'),
          { scaleX: 0.2 },
          { scaleX: handoff.truck.loadLevel, duration: 0.1 },
          0.53,
        )
        .to(
          q('[data-worker]'),
          { x: parked + 150, opacity: 0, duration: 0.06 },
          0.59,
        )
        .to(
          q('[data-truck]'),
          { x: mobile ? parked : 900, duration: 0.2, ease: 'power1.inOut' },
          0.65,
        )
        .to(
          q('[data-wheel]'),
          { rotation: 3600, duration: 0.2, ease: 'power1.inOut' },
          0.65,
        )
        .to(
          q('[data-route-mask]'),
          { scaleX: 1, duration: 0.25, ease: 'none' },
          0.65,
        )
        .fromTo(
          q('[data-weighbridge]'),
          { opacity: 0 },
          { opacity: 1, duration: 0.12 },
          0.85,
        )
        .to(
          q('[data-neighbourhood]'),
          { x: mobile ? -440 : -240, opacity: 0.3, duration: 0.15 },
          0.85,
        )
        .to(q('[data-bin]'), { opacity: 0, duration: 0.1 }, 0.85)
        .to(
          q('[data-truck]'),
          {
            x: handoff.position.x,
            y: handoff.position.y,
            duration: 0.15,
            ease: 'power1.out',
          },
          0.85,
        );
      if (!mobile)
        tl.to(q('[data-skyline]'), { x: -45, duration: 1, ease: 'none' }, 0);
      else
        tl.fromTo(
          q('[data-neighbourhood]'),
          { x: 160 },
          { x: 0, duration: 0.2, ease: 'power2.out' },
          0,
        );
      const count = element.querySelector<HTMLElement>(
        '[data-household-count]',
      );
      const steps = element.querySelectorAll<HTMLElement>('[data-step]');
      let lastStage = -1;
      tl.eventCallback('onUpdate', () => {
        const p = tl.progress();
        const stage = p < 0.3 ? 0 : p < 0.5 ? 1 : p < 0.65 ? 2 : 3;
        if (count)
          count.textContent =
            p >= 0.78 ? copy.labels.demoAfter : copy.labels.demoBefore;
        element.dataset.handoff = p >= 0.999 ? 'ready' : 'pending';
        if (lastStage !== stage) {
          steps.forEach((step, index) => {
            step.dataset.active = String(index === stage);
          });
          lastStage = stage;
        }
      });
      return () => {
        delete element.dataset.enhanced;
        delete element.dataset.handoff;
        if (count) count.textContent = copy.labels.demoAfter;
        steps.forEach((step) => delete step.dataset.active);
      };
    },
    {
      sectionId: 'platform',
      enabled: enabled && !skipped && !siteExperience,
      pin: true,
      scrub: 1,
      start: mobile ? 'top 88px' : 'top 104px',
      end,
      rebuildKey: mobile ? 'mobile' : 'desktop',
    },
  );
  const skip = () => {
    timeline.current?.progress(1);
    setSkipped(true);
    // Wait for the hook to remove its pin spacer before positioning the next section.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        after.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
        after.current?.focus({ preventScroll: true });
      }),
    );
  };
  return (
    <Section
      id={copy.id}
      className="hero-section"
      contained={false}
      aria-labelledby="hero-heading"
    >
      <div ref={ref} className="hero-pin" data-visible="true">
        <Container>
          <div className="hero-grid">
            <div className="hero-copy">
              <Heading as="h1" eyebrow={copy.eyebrow} id="hero-heading">
                {copy.title}
              </Heading>
              <p className="hero-description">{copy.description}</p>
              <div className="hero-actions">
                <Button href="/#contact" variant="magnetic">
                  {sharedContent.demo}
                  <span aria-hidden="true">↗</span>
                </Button>
                <Button
                  href={siteConfig.brochurePath}
                  variant="secondary"
                  download
                >
                  {sharedContent.brochure}
                  <span aria-hidden="true">↓</span>
                </Button>
              </div>
              <p className="hero-evidence">{copy.labels.evidence}</p>
            </div>
            {!siteExperience && <div className="hero-visual">
              <div className="hero-visual-heading">
                <span>{copy.labels.sceneEyebrow}</span>
                <span className="hero-status-dot" aria-hidden="true" />
              </div>
              <HeroScene />
              <div
                className="hero-notification"
                data-notification
                aria-hidden="true"
              >
                <span className="hero-toast-icon">✓</span>
                {copy.labels.notification}
              </div>
              <div className="hero-verification" data-verify>
                <div className="hero-verification-top">
                  <span className="hero-check" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <span className="hero-card-eyebrow">
                      {copy.labels.liveRecord}
                    </span>
                    <strong>{copy.labels.verified}</strong>
                  </div>
                  <Badge>{copy.labels.weight}</Badge>
                </div>
                <div className="hero-record-details">
                  <span>{copy.labels.ward}</span>
                  <span>{copy.labels.time}</span>
                  <span>{copy.labels.photo}</span>
                  <span>{copy.labels.gps}</span>
                </div>
              </div>
              <div className="hero-scene-caption">
                <span>{copy.labels.illustrative}</span>
                <span className="hero-households">
                  {copy.labels.households}:{' '}
                  <strong data-household-count>{copy.labels.demoAfter}</strong>
                </span>
              </div>
            </div>}
          </div>
          <ul className="hero-trust" aria-label={copy.labels.sceneTitle}>
            {copy.items.map((item) => (
              <li key={item.title}>
                <span aria-hidden="true">✓</span>
                {item.title}
              </li>
            ))}
          </ul>
          <div className="hero-story-control">
            <p>{copy.labels.scrollHint}</p>
            <ol className="hero-step-rail">
              {[
                copy.labels.notify,
                copy.labels.scan,
                copy.labels.verify,
                copy.labels.depart,
              ].map((label, i) => (
                <li key={label} data-step>
                  <span aria-hidden="true">0{i + 1}</span>
                  {label}
                </li>
              ))}
            </ol>
          </div>
          <p className="sr-only">{copy.labels.screenReader}</p>
        </Container>
      </div>
      {showSkip && !skipped && !siteExperience && (
        <a
          className="hero-skip-fixed"
          href="#hero-end"
          onClick={(event) => {
            event.preventDefault();
            skip();
          }}
        >
          {copy.labels.skipAnimation}
          <span aria-hidden="true">↘</span>
        </a>
      )}
      <Mascot />
      <div ref={after} id="hero-end" tabIndex={-1} className="hero-end" />
    </Section>
  );
}
