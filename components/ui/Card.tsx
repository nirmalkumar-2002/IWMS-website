/** Props: native article attributes; children and className. Dark styling inherited from Section. */
import type { HTMLAttributes } from 'react';
export function Card({
  className = '',
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <article className={`card ${className}`} {...props} />;
}
