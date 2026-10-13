import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { SHOTS, shotU, type Rig } from './rig';
import { COLLECT_SHOTS, SHOT_U } from './collection';
import {
  CITY_SHOTS,
  COLLECT_END_SEC,
  JOURNEY_END_SEC,
  SCENE1_END_SEC,
  STOP_SEC,
  secondsAtDistance,
} from './route';

gsap.registerPlugin(ScrollTrigger);

export interface CopyElements {
  words: HTMLElement[];
  subtitle: HTMLElement;
  /** Scene 02 copy block (title + supporting line). */
  city: HTMLElement[];
}

/** Lamp warm-up: brief DRL step, fast rise with a ~4% overshoot, settle. Deterministic, no flicker. */
const lampOn = (key: 'headL' | 'headR') => ({
  keyframes: [
    { [key]: 0.28, duration: 0.12, ease: 'power1.out' },
    { [key]: 1.04, duration: 0.38, ease: 'power3.out' },
    { [key]: 1, duration: 0.24, ease: 'sine.inOut' },
  ],
});

/**
 * Auto-played opening (~9.5 s). Owns: approach, marker, tail, headL, headR, beam, title reveal.
 * The scroll timeline never writes these, so the two can overlap without fighting.
 */
export function buildIntro(rig: Rig, copy: CopyElements) {
  const tl = gsap.timeline({ paused: true });
  tl.set(rig, { approach: 1, marker: 0, tail: 0, headL: 0, headR: 0, beam: 0 }, 0)
    .set(copy.words, { opacity: 0, y: 12, filter: 'blur(6px)' }, 0)
    // Stage 1 → 2: slow low dolly toward the parked truck.
    .to(rig, { approach: 0, duration: 9.5, ease: 'power2.inOut' }, 0)
    // Stage 2: markers, tail lamps, then headlights and their beams in the fog.
    .to(rig, { marker: 1, duration: 0.14, ease: 'power2.out' }, 2.8)
    .to(rig, { tail: 1, duration: 0.25, ease: 'power2.out' }, 3.3)
    .to(rig, lampOn('headL'), 4.3)
    .to(rig, lampOn('headR'), 4.34)
    .to(rig, { beam: 1, duration: 1.4, ease: 'power2.out' }, 4.5)
    .to(
      copy.words,
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.12,
      },
      6.2,
    );
  return tl;
}

/** Final resting state for reduced motion: lamps on, side profile, copy visible. */
export function applyStill(rig: Rig, stillShot: number) {
  Object.assign(rig, {
    approach: 0,
    dawn: 1,
    camU: shotU(stillShot),
    focal: SHOTS[stillShot].focal,
    marker: 1,
    tail: 1,
    headL: 1,
    headR: 1,
    beam: 1,
  });
}

/**
 * Scroll-scrubbed reveal. Owns: camU, focal, follow, driveSec, cityU, dawn and copy after the
 * intro. Scene 01: each shot = 1 unit of camera travel + a dwell, then the drive-off.
 * Scene 02 continues on the same timeline (one ScrollTrigger) from the drive-off's last frame.
 */
export function buildReveal(rig: Rig, copy: CopyElements) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
  const move = 1;
  const dwell = 0.55;
  let at = 0.35;
  tl.set(
    rig,
    {
      camU: 0,
      focal: SHOTS[0].focal,
      follow: 0,
      driveSec: 0,
      cityU: 0,
      dawn: 0,
      collectU: 0,
      pin: 0,
      gps: 0,
      route: 0,
      net: 0,
      scan: 0,
      done: 0,
    },
    0,
  );
  for (let i = 1; i < SHOTS.length; i++) {
    tl.addLabel(SHOTS[i].id, at).to(
      rig,
      { camU: shotU(i), focal: SHOTS[i].focal, duration: move },
      at,
    );
    at += move + dwell;
  }
  // The sky lifts slowly over the reveal so body detail emerges shot by shot.
  tl.to(rig, { dawn: 1, duration: at, ease: 'sine.inOut' }, 0);
  // Stage 4: the truck pulls away; the camera hands over to a trailing track.
  tl.addLabel('drive', at)
    .to(rig, { driveSec: SCENE1_END_SEC, duration: SCENE1_DRIVE, ease: 'none' }, at)
    .to(rig, { follow: 1, focal: 35, duration: 1.7, ease: 'power1.inOut' }, at);

  // Copy: clear the frame for close details, return over the side profile, clear for the exit.
  const all = [...copy.words, copy.subtitle];
  tl.fromTo(
    copy.words,
    { opacity: 1 },
    { opacity: 0, duration: 0.4, ease: 'power1.out', immediateRender: false },
    'headlight',
  )
    .fromTo(
      copy.words,
      { opacity: 0 },
      { opacity: 1, duration: 0.5, ease: 'power2.out', immediateRender: false },
      'side+=0.75',
    )
    .fromTo(
      copy.subtitle,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', immediateRender: false },
      'side+=0.95',
    )
    .to(all, { opacity: 0, duration: 0.6, ease: 'power1.in' }, 'drive+=1.7');

  addCityEntry(tl, rig, copy, at + SCENE1_DRIVE);
  addCollection(tl, rig, at + SCENE1_DRIVE + CITY_UNITS);
  tl.to({}, { duration: 0.4 });
  return tl;
}

/** Scroll units spent on Scene 01's pull-away and on Scene 02's whole journey. */
const SCENE1_DRIVE = 3.6;
const CITY_UNITS = 14;

/**
 * Scroll → simulated time for Scene 02. f(u) = u + c·u·(1−u)² is monotonic and its slope at
 * u = 0 matches Scene 01's seconds-per-scroll, so the truck's on-screen speed doesn't kink at
 * the hand-over even though the journey covers far more simulated time per scroll unit.
 */
const CITY_SPAN = JOURNEY_END_SEC - SCENE1_END_SEC;
const C = (SCENE1_END_SEC / SCENE1_DRIVE) * (CITY_UNITS / CITY_SPAN) - 1;
const cityEase = (u: number) => u + C * u * (1 - u) * (1 - u);
function cityEaseInverse(y: number) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (cityEase(mid) < y) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Scroll unit (relative to Scene 02's start) at which the truck reaches distance d. */
const cityUnitAt = (d: number) =>
  CITY_UNITS * cityEaseInverse((secondsAtDistance(d) - SCENE1_END_SEC) / CITY_SPAN);

/**
 * Scene 02: one linear-in-scroll drive tween (eased only by cityEase) plus camera key tweens
 * placed where the truck reaches each shot's distance, so framing and journey stay locked.
 */
function addCityEntry(
  tl: gsap.core.Timeline,
  rig: Rig,
  copy: CopyElements,
  start: number,
) {
  tl.addLabel('city', start).fromTo(
    rig,
    { driveSec: SCENE1_END_SEC },
    {
      driveSec: JOURNEY_END_SEC,
      duration: CITY_UNITS,
      ease: cityEase,
      immediateRender: false,
    },
    start,
  );
  const last = CITY_SHOTS.length - 1;
  let prev = start;
  for (let i = 1; i <= last; i++) {
    const shot = CITY_SHOTS[i];
    const at = i === last ? start + CITY_UNITS : start + cityUnitAt(shot.at);
    tl.addLabel(`city:${shot.id}`, at).fromTo(
      rig,
      { cityU: (i - 1) / last, focal: CITY_SHOTS[i - 1].focal },
      {
        cityU: i / last,
        focal: shot.focal,
        duration: Math.max(0.2, at - prev),
        ease: 'sine.inOut',
        immediateRender: false,
      },
      prev,
    );
    prev = at;
  }

  // Copy: the city line arrives with the high establishing view and clears before the side track.
  const shown = tl.labels['city:establish'];
  const side = tl.labels['city:sideTrack'];
  tl.fromTo(
    copy.city,
    { opacity: 0, y: 16 },
    {
      opacity: 1,
      y: 0,
      duration: 0.7,
      stagger: 0.2,
      ease: 'power2.out',
      immediateRender: false,
    },
    shown - 0.9,
  ).to(
    copy.city,
    { opacity: 0, duration: 0.5, ease: 'power1.in' },
    shown + (side - shown) * 0.3,
  );
}

/** Scroll units for Phase 3.1–3.2 (≈50vh each, like the rest of the timeline). */
const COLLECT_UNITS = 7.6;
/**
 * Scene 02 ends with cityEase'(1) = 1, i.e. CITY_SPAN / CITY_UNITS simulated seconds per scroll
 * unit. The collection drive keeps exactly that rate, so the truck's on-screen speed is continuous
 * across the hand-over and the deceleration in the kinematics table is what the visitor sees.
 */
const COLLECT_DRIVE = (COLLECT_END_SEC - JOURNEY_END_SEC) / (CITY_SPAN / CITY_UNITS);
const COLLECT_STOP = (STOP_SEC - JOURNEY_END_SEC) / (CITY_SPAN / CITY_UNITS);

/**
 * Phase 3.1–3.2: household collection, on the same timeline after `city:arrive`.
 * Owns: driveSec (continued), collectU, focal and the digital layer (pin, net, gps, route, scan,
 * done). The camera leaves the truck for the household as it stops; the IWMS monitor logs three
 * distinct states — vehicle arrived (GPS proximity), household QR verified, collection completed —
 * each on its own beat. Every value is scrubbed, never time-based.
 */
function addCollection(tl: gsap.core.Timeline, rig: Rig, start: number) {
  const shot = (id: string) => COLLECT_SHOTS.find((s) => s.id === id)!;
  const camera = (from: string, to: string, at: number, duration: number, ease: string) =>
    tl.fromTo(
      rig,
      { collectU: SHOT_U[from], focal: shot(from).focal },
      { collectU: SHOT_U[to], focal: shot(to).focal, duration, ease, immediateRender: false },
      at,
    );
  const reveal = (key: CollectKey, at: number, duration: number) =>
    tl.fromTo(
      rig,
      { [key]: 0 },
      { [key]: 1, duration, ease: 'power1.inOut', immediateRender: false },
      at,
    );
  const stop = start + COLLECT_STOP;
  const household = start + 3.4;
  const qr = start + 5.1;

  tl.addLabel('collect', start).fromTo(
    rig,
    { driveSec: JOURNEY_END_SEC },
    { driveSec: COLLECT_END_SEC, duration: COLLECT_DRIVE, ease: 'none', immediateRender: false },
    start,
  );
  tl.addLabel('collect:stop', stop);
  // Off the truck: turn to the household while it rolls to a stop beside the gate.
  camera('arrive', 'household', start, household - start, 'sine.inOut');
  reveal('pin', start + 2.0, 0.8);
  // The IWMS monitor comes up while the vehicle is still creeping in (live GPS speed) ...
  reveal('net', start + 2.3, 0.7);
  // ... and logs the arrival only once it is stationary. Arrival is not verification.
  reveal('gps', stop - 0.07, 0.4);
  tl.addLabel('collect:household', household);
  reveal('route', household, 0.9);
  // QR close-up, scan, verification.
  camera('household', 'qr', household + 0.7, qr - household - 0.7, 'power2.inOut');
  tl.addLabel('collect:qr', qr);
  reveal('scan', qr, 0.9);
  tl.addLabel('collect:verified', qr + 0.9);
  // Pull back to the household; the collection is completed as a separate, later state.
  camera('qr', 'confirm', qr + 1.1, 1.0, 'power2.inOut');
  reveal('done', qr + 1.4, 0.5);
  tl.addLabel('collect:completed', qr + 1.9);
  tl.addLabel('collect:end', start + COLLECT_UNITS);
  tl.to({}, { duration: 0.01 }, start + COLLECT_UNITS - 0.01);
}

type CollectKey = 'pin' | 'net' | 'gps' | 'route' | 'scan' | 'done';

/**
 * Page-navigation handle (site header: Skip Intro / Explore Platform). It never retimes the
 * timelines: it only scrolls to where a reveal label already sits.
 */
export interface Experience {
  /** Teardown (ScrollTrigger, Lenis, tweens). */
  dispose: () => void;
  /**
   * Scrolls to a reveal-timeline label (`immediate`: jump without scrubbing the scroll between).
   * Returns false for an unknown label.
   */
  goTo: (label: string, immediate?: boolean) => boolean;
}

/**
 * Wires intro + reveal to the page. The intro never locks scrolling: if the visitor scrolls
 * early it fast-forwards, and it completes instantly before the copy-clearing headlight shot.
 */
export function startExperience(
  rig: Rig,
  section: HTMLElement,
  copy: CopyElements,
): Experience {
  const ctx = gsap.context(() => {});
  let lenis: Lenis | null = null;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  let goTo: Experience['goTo'] = () => false;

  ctx.add(() => {
    const intro = buildIntro(rig, copy);
    const reveal = buildReveal(rig, copy);
    const headlightAt = reveal.labels.headlight / reveal.duration();

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      animation: reveal,
      scrub: touch ? 0.6 : true,
      invalidateOnRefresh: true,
      onUpdate(self) {
        if (!intro.isActive()) return;
        if (self.progress >= headlightAt - 0.01) intro.progress(1);
        else if (self.progress > 0.002) intro.timeScale(5);
      },
    });
    intro.play(0);

    goTo = (label, immediate = true) => {
      if (!(label in reveal.labels)) return false;
      // Settle the intro first: ScrollTrigger renders the reveal before onUpdate completes the
      // intro, so a jump past `headlight` mid-intro would let the intro's title reveal win.
      if (intro.progress() < 1) intro.progress(1);
      // Measured at call time (start/end are re-measured on refresh).
      const y = st.start + (reveal.labels[label] / reveal.duration()) * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, { immediate, force: true });
      else window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' });
      return true;
    };
  });

  const raf = (time: number) => lenis?.raf(time * 1000);
  if (!touch) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
  }

  return {
    dispose: () => {
      gsap.ticker.remove(raf);
      lenis?.destroy();
      lenis = null;
      ctx.revert();
    },
    goTo: (label, immediate) => goTo(label, immediate),
  };
}
