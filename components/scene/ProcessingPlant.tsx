import type { ProcessingPlantProps } from './types';
export function ProcessingPlant({ active = false }: ProcessingPlantProps) {
  return (
    <svg viewBox="0 0 240 180" aria-hidden="true" focusable="false">
      <path d="M20 160V80l65-30v30l65-30v30h70v80Z" fill="var(--navy-700)" />
      <path d="M180 80V20h25v60" fill="var(--green-600)" />
      {[45, 95, 145].map((x) => (
        <rect
          key={x}
          x={x}
          y="105"
          width="25"
          height="30"
          fill={active ? 'var(--lime-400)' : 'var(--surface)'}
        />
      ))}
    </svg>
  );
}
export default ProcessingPlant;
