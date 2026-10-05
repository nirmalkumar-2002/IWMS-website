import type { HouseProps } from './types';
export function House({ showQr = true }: HouseProps) {
  return (
    <svg viewBox="0 0 220 220" aria-hidden="true" focusable="false">
      <ellipse
        cx="110"
        cy="210"
        rx="102"
        ry="7"
        fill="var(--navy-900)"
        opacity=".08"
      />
      <path
        d="M29 89h130v115H29Z"
        fill="#f1ead9"
        stroke="var(--navy-700)"
        strokeWidth="1.5"
      />
      <path d="m159 89 36-13v115l-36 13Z" fill="#ded6c1" />
      <path d="m13 91 81-70 82 70Z" fill="var(--navy-700)" />
      <path d="m94 21 44-12 75 66-37 16Z" fill="var(--brand-navy)" />
      <path
        d="M45 116h30v35H45Zm68 0h30v35h-30Z"
        fill="#b9d9d8"
        stroke="var(--navy-700)"
        strokeWidth="2"
      />
      <path
        d="M60 116v35m-15-17h30m53-18v35m-15-17h30"
        stroke="var(--white)"
        strokeWidth="2"
      />
      <path d="M85 143h23v61H85Z" fill="var(--green-600)" />
      <circle cx="102" cy="177" r="1.5" fill="var(--lime-400)" />
      <path d="M18 204h149v6H18Z" fill="var(--navy-700)" />
      <path
        d="M160 150h42v42h-42"
        fill="none"
        stroke="var(--green-600)"
        strokeWidth="4"
      />
      <path
        d="M174 152v39m14-39v39"
        stroke="var(--green-600)"
        strokeWidth="3"
      />
      {showQr && (
        <g>
          <rect
            x="111"
            y="160"
            width="17"
            height="20"
            rx="2"
            fill="var(--white)"
          />
          <path
            d="M114 163h4v4h-4zm7 0h4v4h-4zm-7 7h4v4h-4zm7 0h2v6h-2Z"
            fill="var(--navy-900)"
          />
        </g>
      )}
      <path d="M37 189h27l-3 15H40Z" fill="var(--orange-500)" />
      <path
        d="M49 190c-24-19 5-26 3-6 10-25 25-6 1 6"
        fill="var(--green-600)"
      />
    </svg>
  );
}
export default House;
