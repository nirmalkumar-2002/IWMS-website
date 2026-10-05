/** Props: as h1/h2/h3 (h2 default); optional eyebrow; native heading attributes and children. */
import type { HTMLAttributes } from 'react';
export function Heading({
  as: Tag = 'h2',
  eyebrow,
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLHeadingElement> & {
  as?: 'h1' | 'h2' | 'h3';
  eyebrow?: string;
}) {
  return (
    <>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <Tag className={`heading ${className}`} {...props}>
        {children}
      </Tag>
    </>
  );
}
