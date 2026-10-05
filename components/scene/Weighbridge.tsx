import type { WeighbridgeProps } from './types';
export function Weighbridge({ reading, alert }: WeighbridgeProps) {
  return (
    <svg
      viewBox="0 0 340 100"
      aria-hidden="true"
      focusable="false"
      data-reading={reading}
    >
      <rect
        x="12"
        y="66"
        width="300"
        height="20"
        rx="4"
        fill="var(--navy-700)"
      />
      <path
        d="M35 66v20m35-20v20m35-20v20m35-20v20m35-20v20m35-20v20m35-20v20m35-20v20"
        stroke="var(--surface)"
      />
      <path d="M300 66V22" stroke="var(--navy-900)" strokeWidth="5" />
      <rect
        x="263"
        y="4"
        width="70"
        height="28"
        rx="4"
        fill={alert ? 'var(--hazardous)' : 'var(--green-600)'}
      />
      <text
        x="297"
        y="23"
        textAnchor="middle"
        fill="var(--white)"
        fontSize="15"
      >
        {Number.isFinite(reading) ? reading : 0}
      </text>
    </svg>
  );
}
export default Weighbridge;
