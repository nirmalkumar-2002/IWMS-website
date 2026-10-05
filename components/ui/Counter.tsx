/** Props: value number or placeholder string; from; duration in seconds; decimals; prefix/suffix.
 * SSR shows final value; animation starts in view. Screen readers receive one stable final value.
 */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/animations/useReducedMotion';
import { siteConfig } from '@/content/config';
export function Counter({
  value,
  from = 0,
  duration = 0.8,
  decimals = 0,
  prefix = '',
  suffix = '',
}: {
  value: number | string;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    setDisplay(value);
    if (reduced || typeof value !== 'number' || !ref.current) return;
    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const progress =
          duration <= 0 ? 1 : Math.min(1, (now - start) / (duration * 1000));
        setDisplay(from + (value - from) * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, from, duration, reduced]);
  const format = (n: number | string) =>
    typeof n === 'number'
      ? n.toLocaleString(siteConfig.locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : n;
  return (
    <span ref={ref}>
      <span aria-hidden="true">
        {prefix}
        {format(display)}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {format(value)}
        {suffix}
      </span>
    </span>
  );
}
