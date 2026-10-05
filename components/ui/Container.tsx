/** Props: children; className; standard div attributes. Constrains width and responsive gutters. */
import type { HTMLAttributes } from 'react';
export function Container({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`container ${className}`} {...props} />;
}
