import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';
/** Native animation: fade + 24px rise, .06s stagger, .7s; no animation library download. */
export function useReveal<T extends HTMLElement = HTMLDivElement>({
  selector,
  once = true,
}: { selector?: string; once?: boolean } = {}) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const element = ref.current;
    if (!element || reduced) return;
    const targets = selector
      ? Array.from(element.querySelectorAll(selector))
      : [element];
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        animations.splice(0).forEach((animation) => animation.cancel());
        targets.forEach((target, index) =>
          animations.push(
            target.animate(
              [
                { opacity: 0, transform: 'translateY(24px)' },
                { opacity: 1, transform: 'translateY(0)' },
              ],
              {
                duration: 700,
                delay: index * 60,
                easing: 'cubic-bezier(.215,.61,.355,1)',
                fill: 'backwards',
              },
            ),
          ),
        );
        if (once) observer.unobserve(element);
      },
      { threshold: 0.1 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, [reduced, selector, once]);
  return ref;
}
