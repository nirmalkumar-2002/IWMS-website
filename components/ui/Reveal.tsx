/** Props: children; className; selector for staggered descendants; once defaults true. */
import type { HTMLAttributes } from 'react';
import { useReveal } from '@/lib/animations/useReveal';
export function Reveal({
  selector,
  once = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & { selector?: string; once?: boolean }) {
  const ref = useReveal({ selector, once });
  return <div ref={ref} {...props} />;
}
