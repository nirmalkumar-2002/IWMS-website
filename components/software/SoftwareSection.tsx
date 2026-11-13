import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { softwareContent as c, TOURS, type TourTarget } from '@/content/software';
import { Dashboard, FocusView, type DashboardState } from './Dashboard';
import './software.css';

/**
 * M6 "IWMS in Action": a guided tour of the IWMS analytics dashboards, recreated from the
 * approved reference recording of the real application. A step is two phases: `move` (the
 * cursor travels to its target; the dashboard scrolls inside its frame; tabs switch on click)
 * then `act` (the click / hover / focus result, a highlight ring and the application's tooltip).
 *
 * Playback: autoplays once (both tours) when the section is half on screen; pauses off-screen,
 * on hover or focus, and as soon as the visitor takes control. Timers run only while needed.
 * Reduced motion: no autoplay, no cursor, steps switch instantly. Phones: the step's panel only,
 * at a readable size. No JS: the dashboard as a still, with every tour step listed as text.
 */

const MOVE_MS = 750;
const HOLD_MS = 2800;
type Phase = 'move' | 'act';
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Overlay {
  cursor: { x: number; y: number } | null;
  ring: Box | null;
  tip: { x: number; y: number } | null;
}
const NONE: Overlay = { cursor: null, ring: null, tip: null };

const q = (root: HTMLElement, t: TourTarget) => root.querySelector<HTMLElement | SVGElement>(`[data-tour="${t}"]`);

/** Translate currently applied to a scrolled board (mid-transition values included). */
function translateY(el: Element) {
  const t = getComputedStyle(el).transform;
  return t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0;
}

export default function SoftwareSection() {
  const [enhanced, setEnhanced] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [tourIdx, setTourIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('act');
  const [want, setWant] = useState(false);
  const [scope, setScope] = useState<'all' | 'tour'>('all');
  const [visible, setVisible] = useState(false);
  const [held, setHeld] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(NONE);
  const [announce, setAnnounce] = useState('');
  const autoplayed = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const scrollY = useRef(0);

  const tour = TOURS[tourIdx];
  const step = tour.steps[stepIdx];
  const playing = want && visible && !held && !reduced;
  const total = tour.steps.length;

  useEffect(() => {
    setEnhanced(true);
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const nm = window.matchMedia('(max-width: 767px)');
    const sync = () => {
      setReduced(rm.matches);
      setNarrow(nm.matches);
    };
    sync();
    rm.addEventListener('change', sync);
    nm.addEventListener('change', sync);
    return () => {
      rm.removeEventListener('change', sync);
      nm.removeEventListener('change', sync);
    };
  }, []);

  // Visibility: pause off-screen; the first time half the stage is visible, autoplay once.
  useEffect(() => {
    const el = stageRef.current;
    if (!enhanced || !el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        const on = e.intersectionRatio >= 0.5;
        setVisible(on);
        if (on && !autoplayed.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          autoplayed.current = true;
          setTourIdx(0);
          setStepIdx(0);
          setPhase('move');
          setScope('all');
          setWant(true);
        }
      },
      { threshold: [0, 0.5] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enhanced]);

  // move → act (also for manual steps, so a click still shows the cursor travel).
  useEffect(() => {
    if (phase !== 'move') return;
    if (reduced || narrow) {
      setPhase('act');
      return;
    }
    const t = window.setTimeout(() => setPhase('act'), MOVE_MS);
    return () => window.clearTimeout(t);
  }, [phase, reduced, narrow, tourIdx, stepIdx]);

  // act → next step, only while playing.
  useEffect(() => {
    if (phase !== 'act' || !playing) return;
    const t = window.setTimeout(() => {
      if (stepIdx < total - 1) {
        setStepIdx(stepIdx + 1);
        setPhase('move');
      } else if (scope === 'all' && tourIdx < TOURS.length - 1) {
        setTourIdx(tourIdx + 1);
        setStepIdx(0);
        setPhase('move');
      } else {
        setWant(false);
      }
    }, HOLD_MS);
    return () => window.clearTimeout(t);
  }, [phase, playing, stepIdx, tourIdx, total, scope]);

  const state: DashboardState = {
    tab: stepIdx === 0 && phase === 'move' && step.cursor.action === 'click' ? tour.startTab : step.tab,
    dateFocus: step.id === 'filter' && phase === 'act',
    rowHover: step.id === 'summary' && phase === 'act',
  };

  // Scroll the board and place the cursor, ring and tooltip from the dashboard's own layout.
  const measure = useCallback(() => {
    const app = appRef.current;
    if (!app || narrow) {
      setOverlay(NONE);
      return;
    }
    const scroller = app.querySelector<HTMLElement>('[data-scroll]');
    if (scroller) {
      let y = 0;
      const t = step.scrollTo ? q(app, step.scrollTo) : null;
      if (t) {
        const box = scroller.parentElement!;
        const top = t.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        y = Math.max(0, Math.min(top - 10, scroller.scrollHeight - box.clientHeight));
      }
      scrollY.current = y;
      scroller.style.transform = `translateY(${-y}px)`;
    }
    const a = app.getBoundingClientRect();
    const rel = (el: Element | null): Box | null => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const sc = el.closest('[data-scroll]');
      const dy = sc ? -scrollY.current - translateY(sc) : 0;
      return { x: r.left - a.left, y: r.top - a.top + dy, w: r.width, h: r.height };
    };
    const cur = rel(q(app, step.cursor.target));
    const ring = rel(q(app, step.ring));
    const tip = step.tooltip ? rel(q(app, step.tooltip.target)) : null;
    setOverlay({
      cursor: cur ? { x: cur.x + cur.w / 2, y: cur.y + cur.h / 2 } : null,
      ring,
      tip: tip ? { x: tip.x + tip.w / 2, y: tip.y + tip.h / 2 } : null,
    });
  }, [step, narrow]);

  useLayoutEffect(() => {
    if (enhanced) measure();
  }, [enhanced, measure, state.tab, phase]);

  useEffect(() => {
    const app = appRef.current;
    if (!enhanced || !app) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(app);
    return () => ro.disconnect();
  }, [enhanced, measure]);

  // Manual control: stops autoplay; announces the step (not announced while playing).
  const goTo = (t: number, s: number, animate = true) => {
    setWant(false);
    setTourIdx(t);
    setStepIdx(s);
    setPhase(animate ? 'move' : 'act');
    const st = TOURS[t].steps[s];
    setAnnounce(`${TOURS[t].label}: ${c.stepOf(s + 1, TOURS[t].steps.length)} — ${st.title}`);
  };
  const playTour = (t: number) => {
    setTourIdx(t);
    setStepIdx(0);
    setPhase('move');
    setScope('tour');
    setWant(!reduced);
    setAnnounce(`${TOURS[t].label}: ${c.stepOf(1, TOURS[t].steps.length)} — ${TOURS[t].steps[0].title}`);
  };
  const atEnd = stepIdx === total - 1 && phase === 'act' && !want;
  const togglePlay = () => {
    if (want) {
      setWant(false);
      return;
    }
    if (atEnd) {
      playTour(tourIdx);
      return;
    }
    setScope('tour');
    setWant(true);
    setHeld(false);
  };
  const replay = () => {
    setScope('all');
    setTourIdx(0);
    setStepIdx(0);
    setPhase('move');
    setWant(true);
    setHeld(false);
  };

  const showCursor = enhanced && !reduced && !narrow && overlay.cursor;
  const clicking = phase === 'act' && step.cursor.action === 'click';

  return (
    <section id="software" className="sw" data-enhanced={enhanced ? 'true' : 'false'} aria-labelledby="software-title">
      <div className="sw__inner">
        <header className="sw__head">
          <p className="sw__eyebrow">{c.eyebrow}</p>
          <h2 id="software-title" className="sw__title">
            {c.title}
          </h2>
          <p className="sw__lead">{c.lead}</p>
          <p className="sw__badge">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true" focusable="false">
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 7.2v4M8 4.8h.01" />
            </svg>
            {c.disclosure}
          </p>
        </header>

        <div className="sw-tour">
          <div
            ref={stageRef}
            className="sw-stage"
            onMouseEnter={() => setHeld(true)}
            onMouseLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)}
            onBlur={() => setHeld(false)}
          >
            <figure className="sw-browser" aria-describedby="software-disclosure">
              <div className="sw-browser__bar" aria-hidden="true">
                <span className="sw-browser__dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="sw-browser__addr">IWMS · Analytics</span>
              </div>
              <div ref={appRef} className="sw-app" data-phase={phase} aria-label={c.frameLabel} role="img">
                {narrow ? <FocusView target={step.focus} state={state} /> : <Dashboard state={state} />}
                {enhanced && !narrow && overlay.ring && (
                  <span
                    className="sw-ring"
                    data-on={phase === 'act' ? 'true' : 'false'}
                    style={{
                      transform: `translate(${overlay.ring.x - 4}px, ${overlay.ring.y - 4}px)`,
                      width: overlay.ring.w + 8,
                      height: overlay.ring.h + 8,
                    }}
                    aria-hidden="true"
                  />
                )}
                {enhanced && !narrow && step.tooltip && overlay.tip && (
                  <span
                    className="sw-tip"
                    data-on={phase === 'act' ? 'true' : 'false'}
                    style={{ transform: `translate(${overlay.tip.x + 14}px, ${overlay.tip.y - 8}px)` }}
                    aria-hidden="true"
                  >
                    <b>{step.tooltip.title}</b>
                    <span>
                      {step.tooltip.metric}
                      <i className="iw-mask" style={{ width: '2.2em' }} />
                      <i className="iw-mask" style={{ width: '2.6em' }} />
                    </span>
                  </span>
                )}
                {showCursor && overlay.cursor && (
                  <span
                    className="sw-cursor"
                    data-click={clicking ? 'true' : 'false'}
                    style={{ transform: `translate(${overlay.cursor.x}px, ${overlay.cursor.y}px)` }}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 20 20" width="20" height="20">
                      <path d="M4 2.5v13.2l3.6-3.4 2.4 5.3 2.3-1-2.4-5.2 5-.4z" fill="#111" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </div>
            </figure>
          </div>

          <div className="sw-panel">
            {enhanced ? (
              <>
                <div className="sw-tours" role="group" aria-label={c.toursLabel}>
                  {TOURS.map((t, i) => (
                    <button
                      key={t.id}
                      type="button"
                      className="sw-tourbtn"
                      aria-pressed={i === tourIdx}
                      onClick={() => playTour(i)}
                    >
                      <span className="sw-tourbtn__label">{t.label}</span>
                      <span className="sw-tourbtn__summary">{t.summary}</span>
                    </button>
                  ))}
                </div>
                <ol className="sw-steps" aria-label={`${tour.label} — ${c.stepsLabel}`}>
                  {tour.steps.map((s, i) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="sw-step"
                        aria-current={i === stepIdx ? 'step' : undefined}
                        onClick={() => goTo(tourIdx, i, true)}
                      >
                        <span className="sw-step__n" aria-hidden="true">
                          {i + 1}
                        </span>
                        <span className="sw-step__title">{s.title}</span>
                      </button>
                      {i === stepIdx && <p className="sw-step__caption">{s.caption}</p>}
                    </li>
                  ))}
                </ol>
                <div className="sw-controls">
                  {!reduced && (
                    <>
                      <button type="button" className="sw-ctl sw-ctl--primary" onClick={togglePlay} aria-pressed={want}>
                        {want ? <PauseIcon /> : <PlayIcon />}
                        {want ? c.pause : c.play}
                      </button>
                      <button type="button" className="sw-ctl" onClick={replay}>
                        <ReplayIcon />
                        {c.replay}
                      </button>
                    </>
                  )}
                  <span className="sw-controls__nav">
                    <button
                      type="button"
                      className="sw-ctl sw-ctl--icon"
                      onClick={() => goTo(tourIdx, stepIdx - 1, !reduced)}
                      disabled={stepIdx === 0}
                      aria-label={c.back}
                    >
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10 3.5 5.5 8l4.5 4.5" />
                      </svg>
                    </button>
                    <span className="sw-controls__count">{c.stepOf(stepIdx + 1, total)}</span>
                    <button
                      type="button"
                      className="sw-ctl sw-ctl--icon"
                      onClick={() => goTo(tourIdx, stepIdx + 1, !reduced)}
                      disabled={stepIdx === total - 1}
                      aria-label={c.next}
                    >
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 3.5 10.5 8 6 12.5" />
                      </svg>
                    </button>
                  </span>
                </div>
                <p className="sw-sr" aria-live="polite">
                  {announce}
                </p>
              </>
            ) : (
              // No JS: every tour and step as readable text.
              TOURS.map((t) => (
                <div key={t.id} className="sw-static">
                  <h3 className="sw-static__title">{t.label}</h3>
                  <p className="sw-static__summary">{t.summary}</p>
                  <ol className="sw-static__steps">
                    {t.steps.map((s) => (
                      <li key={s.id}>
                        <strong>{s.title}.</strong> {s.caption}
                      </li>
                    ))}
                  </ol>
                </div>
              ))
            )}
          </div>
        </div>

        <p id="software-disclosure" className="sw__note">
          {c.disclosureLong}
        </p>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <path d="M4.5 3v10l8.5-5z" fill="currentColor" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor" />
    </svg>
  );
}
function ReplayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v2.8h2.8" />
    </svg>
  );
}
