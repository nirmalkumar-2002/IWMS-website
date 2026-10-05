/** Props: variant primary/secondary/magnetic; href renders an anchor; otherwise native button.
 * Magnetic movement is pointer-only and disabled for reduced motion. Default button type is button.
 */
import {
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type PointerEvent,
} from 'react';
import { useReducedMotion } from '@/lib/animations/useReducedMotion';
type Common = { variant?: 'primary' | 'secondary' | 'magnetic' };
export type ButtonProps = Common &
  (
    | (AnchorHTMLAttributes<HTMLAnchorElement> & { href: string })
    | (ButtonHTMLAttributes<HTMLButtonElement> & { href?: never })
  );
export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  const reduced = useReducedMotion();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const move = (event: PointerEvent<HTMLElement>) => {
    if (variant !== 'magnetic' || reduced || event.pointerType !== 'mouse')
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    setOffset({
      x: (event.clientX - rect.left - rect.width / 2) * 0.1,
      y: (event.clientY - rect.top - rect.height / 2) * 0.1,
    });
  };
  const reset = () => setOffset({ x: 0, y: 0 });
  const magneticStyle = {
    transform: `translate(${reduced ? 0 : offset.x}px, ${reduced ? 0 : offset.y}px)`,
  };
  const classes = `button button-${variant} ${className}`;
  if (props.href !== undefined) {
    const { children, onPointerMove, onPointerLeave, onBlur, style, ...rest } =
      props as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
    return (
      <a
        {...rest}
        className={classes}
        style={{ ...style, ...magneticStyle }}
        onPointerMove={(e) => {
          move(e);
          onPointerMove?.(e);
        }}
        onPointerLeave={(e) => {
          reset();
          onPointerLeave?.(e);
        }}
        onBlur={(e) => {
          reset();
          onBlur?.(e);
        }}
      >
        {children}
      </a>
    );
  }
  const {
    onPointerMove,
    onPointerLeave,
    onBlur,
    style,
    type = 'button',
    ...rest
  } = props as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      {...rest}
      type={type}
      className={classes}
      style={{ ...style, ...magneticStyle }}
      onPointerMove={(e) => {
        move(e);
        onPointerMove?.(e);
      }}
      onPointerLeave={(e) => {
        reset();
        onPointerLeave?.(e);
      }}
      onBlur={(e) => {
        reset();
        onBlur?.(e);
      }}
    />
  );
}
