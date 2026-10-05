import { useId } from 'react';
import type { TruckProps } from './types';

/** Decorative municipal collection vehicle. Movement stays parent-controlled. */
export function Truck({
  progress,
  loadLevel,
  direction,
  showGps,
  wheelRotation = 0,
}: TruckProps) {
  const load = Math.max(0, Math.min(1, loadLevel));
  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const gradientPrefix = `truck-${useId().replaceAll(':', '')}`;
  return (
    <svg
      viewBox="0 0 240 140"
      aria-hidden="true"
      focusable="false"
      data-progress={normalizedProgress}
      className="scene-truck"
    >
      <defs>
        <linearGradient id={`${gradientPrefix}-body`} x1="0" x2="0.12" y1="0" y2="1">
          <stop offset="0" stopColor="var(--lime-400)" />
          <stop offset="0.34" stopColor="var(--green-600)" />
          <stop offset="1" stopColor="var(--navy-700)" />
        </linearGradient>
        <linearGradient id={`${gradientPrefix}-cab`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="var(--white)" />
          <stop offset="1" stopColor="#dce8e2" />
        </linearGradient>
        <linearGradient id={`${gradientPrefix}-glass`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#a8c8ce" />
          <stop offset="1" stopColor="var(--navy-700)" />
        </linearGradient>
        <radialGradient id={`${gradientPrefix}-hub`}>
          <stop offset="0" stopColor="var(--white)" />
          <stop offset="0.42" stopColor="#b9c9c7" />
          <stop offset="0.46" stopColor="var(--navy-900)" />
          <stop offset="1" stopColor="#25364b" />
        </radialGradient>
      </defs>
      <g transform={direction === 'left' ? 'translate(240 0) scale(-1 1)' : undefined}>
        <ellipse cx="119" cy="132" rx="111" ry="5.5" fill="var(--navy-900)" opacity=".17" />
        <path d="M20 110h207v10H20z" fill="#26374a" />
        <path d="M32 119h178" stroke="var(--white)" strokeWidth="1.2" opacity=".16" />

        <g data-truck-body>
          {/* Compactor body: chamfered corners, deep lower rail and restrained highlights. */}
          <path d="M15 36 29 23h111l12 11v71H13V40z" fill={`url(#${gradientPrefix}-body)`} stroke="#174d31" strokeWidth="2" />
          <path d="m29 25 7-5h97l7 8H29z" fill="#b7df69" />
          <path d="M20 40h128v7H20z" fill="var(--white)" opacity=".23" />
          <path d="M23 50h121v34H23z" fill="#0f4e31" opacity=".18" />
          <path d="M29 49v36m22-36v36m22-36v36m22-36v36m22-36v36m22-36v36" stroke="#d8efb4" strokeWidth="1.2" opacity=".25" />
          <path d="M20 88h128v5H20z" fill="#d5e3d2" opacity=".72" />
          <path d="M24 96h117v4H24z" fill="#173b2a" opacity=".42" />
          {/* Simple civic-service mark, kept abstract until approved brand art is supplied. */}
          <g transform="translate(74 56)" fill="none" stroke="var(--white)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity=".94">
            <path d="M0 9 9 0l9 9h-5v10H5V9z" />
            <path d="m22 2 8 8-8 8v-5h-7V7h7z" />
          </g>
          <path d="M151 64h17v39h-17z" fill="#33495c" />
          <path d="M15 102h138v6H15z" fill="#193e2a" />
          <path d="M34 105h16m6 0h16m6 0h16m6 0h16" stroke="var(--lime-400)" strokeWidth="2" opacity=".85" />

          {/* Cab, windscreen and door */}
          <path d="M153 58h34q8 0 13 7l27 30v18h-74z" fill={`url(#${gradientPrefix}-cab)`} stroke="#33495c" strokeWidth="2" strokeLinejoin="round" />
          <path d="M165 64h19q7 0 11 6l16 19h-46z" fill={`url(#${gradientPrefix}-glass)`} stroke="#526d79" strokeWidth="1.3" />
          <path d="m187 65 25 26h-14l-18-26z" fill="var(--white)" opacity=".2" />
          <path d="M164 94h53v10h-53z" fill="#c5d3cd" />
          <path d="M164 65v39m25-39v39" stroke="#597080" strokeWidth="1.2" opacity=".7" />
          <path d="M194 78h8" stroke="var(--white)" strokeWidth="1.5" opacity=".7" />
          <path d="M168 83h4" stroke="var(--navy-700)" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M224 95h5v9h-5z" fill="#f4c86b" />
          <path d="M222 106h7v4h-7z" fill="#b94f35" />
          <path d="M151 62h-5v9h5" fill="#526d79" />
          <path d="M153 108h75" stroke="#28394a" strokeWidth="5" />

          {/* Segmented load indicator */}
          <rect x="25" y="91" width="116" height="7" rx="3.5" fill="#132e24" opacity=".76" />
          <g data-truck-load style={{ transform: `scaleX(${load})`, transformOrigin: '26px 94.5px' }}>
            <rect x="26" y="92" width="70" height="5" rx="2.5" fill="var(--wet)" />
            <rect x="98" y="92" width="42" height="5" rx="2.5" fill="var(--dry)" />
          </g>
        </g>

        {[49, 192].map((x) => (
          <g key={x} data-wheel style={{ transform: `rotate(${wheelRotation}deg)`, transformOrigin: `${x}px 116px` }}>
            <circle cx={x} cy="116" r="17" fill="#192432" />
            <circle cx={x} cy="116" r="11.5" fill={`url(#${gradientPrefix}-hub)`} />
            <circle cx={x} cy="116" r="7.5" fill="#65777e" />
            <path d={`M${x} 109v14m-7-7h14m-12-5 10 10m0-10-10 10`} stroke="#d8e0d9" strokeWidth="1.3" opacity=".9" />
            <circle cx={x} cy="116" r="2.4" fill="#e9f0e9" />
          </g>
        ))}
        {showGps && (
          <g data-gps>
            <circle className="hero-signal" cx="180" cy="26" r="19" fill="var(--green-600)" opacity=".11" />
            <path d="M180 41s-11-12-11-20a11 11 0 1 1 22 0c0 8-11 20-11 20Z" fill="var(--green-600)" stroke="var(--white)" strokeWidth="1.4" />
            <circle cx="180" cy="21" r="4" fill="var(--white)" />
          </g>
        )}
      </g>
    </svg>
  );
}
export default Truck;
