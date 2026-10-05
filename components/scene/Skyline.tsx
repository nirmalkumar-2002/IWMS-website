import { useId } from 'react';
import type { SkylineProps } from './types';
export function Skyline({ className }: SkylineProps) {
  const id = useId();
  return (
    <svg
      className={className}
      viewBox="0 0 1200 300"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={id} width="20" height="24" patternUnits="userSpaceOnUse">
          <rect
            x="7"
            y="7"
            width="6"
            height="10"
            fill="var(--white)"
            opacity=".7"
          />
        </pattern>
      </defs>
      <path
        d="M0 300V160h100v140h30V80h120v220h30V130h110v170h30V35h115v265h30V110h135v190h30V65h100v235h30V135h130v165h30V110h90v190Z"
        fill="#dbe8e3"
      />
      <path
        d="M135 300V85h110v215h180V40h105v260h205V70h90v230h175V140h125v160Z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}
export default Skyline;
