import { useEffect, useRef, type RefObject } from 'react';
import type gsap from 'gsap';
import { useMotion } from './MotionProvider';
import { useReducedMotion } from './useReducedMotion';
import { registerSection } from './refreshCoordinator';
import { sectionOrder, type SectionId } from './sectionOrder';
export type TimelineBuilder = (
  timeline: gsap.core.Timeline,
  element: HTMLElement,
) => void | (() => void);
export type ScrollTimelineOptions = {
  sectionId: SectionId;
  enabled?: boolean;
  pin?: boolean;
  scrub?: boolean | number;
  start?: string;
  end?: string | (() => string);
  desktopOnly?: boolean;
  /** Change this key to deliberately rebuild responsive/content-dependent timelines. */
  rebuildKey?: string | number;
  onProgress?: (progress: number) => void;
};
/** Build using the supplied timeline and scoped element; never allocate another timeline.
 * Pin is restricted to platform/how-it-works. Returns a ref for skip controls.
 * SSR/reduced-motion markup must be the readable, static fallback.
 */
export function useScrollTimeline<T extends HTMLElement>(
  ref: RefObject<T | null>,
  builder: TimelineBuilder,
  options: ScrollTimelineOptions,
) {
  const { ready, runtime } = useMotion();
  const reduced = useReducedMotion();
  const latestBuilder = useRef(builder);
  const latestProgress = useRef(options.onProgress);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const {
    sectionId,
    enabled = true,
    pin = false,
    scrub = 1,
    start = 'top top',
    end = '+=180%',
    desktopOnly = false,
    rebuildKey,
  } = options;
  useEffect(() => {
    latestBuilder.current = builder;
    latestProgress.current = options.onProgress;
  });
  useEffect(() => {
    const element = ref.current;
    if (!element || !ready || !runtime || reduced || !enabled) return;
    if (pin && sectionId !== 'platform' && sectionId !== 'how-it-works')
      throw new Error('Only Hero and Journey may pin.');
    const { gsap, ScrollTrigger } = runtime;
    const media = gsap.matchMedia();
    media.add(
      desktopOnly
        ? '(min-width: 768px) and (prefers-reduced-motion: no-preference)'
        : '(prefers-reduced-motion: no-preference)',
      () => {
        let unregister: (() => void) | undefined;
        let cleanup: void | (() => void);
        const context = gsap.context(() => {
          const timeline = gsap.timeline();
          timelineRef.current = timeline;
          cleanup = latestBuilder.current(timeline, element);
          const trigger = ScrollTrigger.create({
            trigger: element,
            animation: timeline,
            pin,
            scrub,
            start,
            end,
            invalidateOnRefresh: true,
            anticipatePin: pin ? 1 : 0,
            refreshPriority:
              sectionOrder.length - sectionOrder.indexOf(sectionId),
            onUpdate: (self) => latestProgress.current?.(self.progress),
          });
          unregister = registerSection(sectionId, trigger);
        }, element);
        return () => {
          if (typeof cleanup === 'function') cleanup();
          unregister?.();
          context.revert();
          timelineRef.current = null;
        };
      },
    );
    return () => media.revert();
  }, [
    ref,
    ready,
    runtime,
    reduced,
    enabled,
    sectionId,
    pin,
    scrub,
    start,
    end,
    desktopOnly,
    rebuildKey,
  ]);
  return timelineRef;
}
