import type { TreeProps } from './types';
export function Tree({ className }: TreeProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 150"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse
        cx="50"
        cy="145"
        rx="29"
        ry="4"
        fill="var(--navy-900)"
        opacity=".08"
      />
      <path d="M50 52v92" stroke="#9b7751" strokeWidth="7" />
      <g className="hero-leaves">
        <path
          d="M50 4C7 28 1 103 50 106c49-3 43-78 0-102Z"
          fill="var(--green-600)"
        />
        <path
          d="M50 4v102c49-3 43-78 0-102Z"
          fill="var(--lime-400)"
          opacity=".45"
        />
      </g>
      <path
        d="M50 60v50m0-24L34 73m16 26 18-19"
        fill="none"
        stroke="#c4d6a1"
        strokeWidth="2"
      />
    </svg>
  );
}
export default Tree;
