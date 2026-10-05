import type { BinProps } from './types';
export function Bin({ tipProgress, showQr }: BinProps) {
  return (
    <svg viewBox="0 0 100 120" aria-hidden="true" focusable="false">
      <g
        data-bin-body
        style={{
          transform: `rotate(${-110 * Math.max(0, Math.min(1, tipProgress))}deg)`,
          transformOrigin: '50px 30px',
        }}
      >
        <path d="M23 30h54l-7 75H30Z" fill="var(--green-600)" />
        <rect
          x="18"
          y="24"
          width="64"
          height="8"
          rx="3"
          fill="var(--lime-400)"
        />
        {showQr && (
          <g fill="var(--white)">
            <rect x="40" y="50" width="20" height="20" />
            <path
              d="M43 53h5v5h-5zm9 0h5v5h-5zm-9 9h5v5h-5z"
              fill="var(--ink)"
            />
          </g>
        )}
        <circle cx="35" cy="107" r="5" />
        <circle cx="66" cy="107" r="5" />
      </g>
    </svg>
  );
}
export default Bin;
