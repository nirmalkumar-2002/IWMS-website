/** Props: required id anchor; variant light/dark; contained defaults true; native section attributes. */
import type { HTMLAttributes } from 'react';
import { Container } from './Container';
export type SectionProps = HTMLAttributes<HTMLElement> & {
  id: string;
  variant?: 'light' | 'dark';
  contained?: boolean;
};
export function Section({
  id,
  variant = 'light',
  contained = true,
  className = '',
  children,
  ...props
}: SectionProps) {
  return (
    <section
      id={id}
      className={`section section-${variant} ${className}`}
      {...props}
    >
      {contained ? <Container>{children}</Container> : children}
    </section>
  );
}
