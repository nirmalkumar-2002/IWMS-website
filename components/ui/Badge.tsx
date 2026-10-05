/** Props: native span attributes and children. Decorative badges are not live regions. */
import type { HTMLAttributes } from 'react';
export function Badge({
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`badge ${className}`} {...props} />;
}
