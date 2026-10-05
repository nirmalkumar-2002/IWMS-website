import type { LandfillProps } from './types';
export function Landfill({ fillLevel = 0.5, alert = false }: LandfillProps) {
  return (
    <svg viewBox="0 0 260 150" aria-hidden="true" focusable="false">
      <path d="M10 130h240" stroke="var(--navy-700)" strokeWidth="8" />
      <path
        d="M20 125 60 65 115 45 190 70 240 125Z"
        fill="var(--green-600)"
        style={{
          transform: `scaleY(${0.3 + 0.7 * Math.max(0, Math.min(1, fillLevel))})`,
          transformOrigin: '130px 125px',
        }}
      />
      {alert && <circle cx="120" cy="45" r="12" fill="var(--hazardous)" />}
    </svg>
  );
}
export default Landfill;
