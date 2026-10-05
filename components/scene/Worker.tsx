import type { WorkerProps } from './types';
export function Worker({ state }: WorkerProps) {
  const scan = state === 'scanning';
  const walking = state === 'walking' || state === 'returning';
  return (
    <svg
      viewBox="0 0 80 140"
      aria-hidden="true"
      focusable="false"
      data-state={state}
    >
      <circle cx="39" cy="24" r="12" fill="#b98058" />
      <path d="M25 22c0-20 28-20 28 0Z" fill="var(--green-600)" />
      <path d="M25 21h32" stroke="var(--green-600)" strokeWidth="4" />
      <path d="M27 42h25l5 44H22Z" fill="var(--green-600)" />
      <path
        d="M28 43v36m18-36v36M23 71h32"
        stroke="var(--lime-400)"
        strokeWidth="4"
      />
      <path
        d="M27 45 17 74"
        stroke="#b98058"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <g data-worker-arm>
        <path
          d={scan ? 'M50 47 61 61 72 47' : 'M50 47 61 74'}
          stroke="#b98058"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        {scan && (
          <rect
            x="65"
            y="32"
            width="12"
            height="20"
            rx="3"
            fill="var(--navy-900)"
          />
        )}
      </g>
      <g data-worker-legs>
        <path
          d={walking ? 'M31 85 22 122M47 85 59 122' : 'M31 85v37M47 85v37'}
          stroke="var(--navy-700)"
          strokeWidth="10"
        />
        <path
          d={walking ? 'M17 125h14m22 0h14' : 'M25 125h13m3 0h14'}
          stroke="var(--navy-900)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
      <rect x="35" y="49" width="9" height="11" rx="2" fill="var(--navy-900)" />
      <circle cx="39.5" cy="53" r="2" fill="var(--white)" />
    </svg>
  );
}
export default Worker;
