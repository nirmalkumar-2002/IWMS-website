import type { StreetProps } from './types';
export function Street({ className }: StreetProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 120"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 0h1200v120H0Z" fill="#e1e8e3" />
      <path d="M0 20h1200v76H0Z" fill="#c6d3cb" />
      <path
        d="M0 58h1200"
        stroke="var(--white)"
        strokeWidth="3"
        strokeDasharray="32 28"
      />
      <path d="M0 18h1200M0 99h1200" stroke="var(--white)" strokeWidth="4" />
    </svg>
  );
}
export default Street;
