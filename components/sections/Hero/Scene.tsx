import { useId } from 'react';
import { House } from '@/components/scene/House';
import { Truck } from '@/components/scene/Truck';
import { Bin } from '@/components/scene/Bin';
import { Worker } from '@/components/scene/Worker';
import { Skyline } from '@/components/scene/Skyline';
import { Street } from '@/components/scene/Street';
import { Tree } from '@/components/scene/Tree';
import { Weighbridge } from '@/components/scene/Weighbridge';
import { heroJourneyHandoff as handoff } from '@/components/scene/handoff';
export function HeroScene() {
  const routeId = useId();
  return (
    <svg
      className="hero-scene-svg"
      viewBox={handoff.viewBox}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={routeId}>
          <rect data-route-mask x="0" y="500" width="1200" height="80" />
        </clipPath>
      </defs>
      <circle cx="710" cy="320" r="280" fill="#e9f1dd" />
      <circle cx="900" cy="160" r="62" fill="#f1ead4" />
      <g className="hero-cloud" fill="var(--white)">
        <path d="M250 130c-25-38 34-70 53-29 20-16 44 5 32 29Z" />
        <path d="M790 85c-17-29 27-48 40-20 16-13 34 3 24 20Z" />
      </g>
      <g data-skyline>
        <svg x="0" y="170" width="1200" height="300">
          <Skyline />
        </svg>
      </g>
      <g data-neighbourhood>
        <path d="M0 460c300-22 770-22 1200 0v80H0Z" fill="#dbe7cd" />
        <svg x="205" y="253" width="140" height="220">
          <Tree />
        </svg>
        <svg x="530" y="196" width="280" height="280">
          <House />
        </svg>
        <svg
          className="hero-extra-tree"
          x="855"
          y="285"
          width="120"
          height="180"
        >
          <Tree />
        </svg>
        <g stroke="var(--navy-700)" fill="none" strokeWidth="5">
          <path d="M950 465V241q0-18 20-18h39" />
          <path d="M1004 217h28v12h-28Z" fill="var(--navy-700)" />
        </g>
        <g transform="translate(963 259)">
          <rect
            width="34"
            height="15"
            rx="4"
            fill="var(--white)"
            stroke="var(--navy-700)"
            strokeWidth="2"
          />
          <circle cx="29" cy="8" r="4" fill="var(--navy-700)" />
        </g>
      </g>
      <svg x="0" y="460" width="1200" height="120">
        <Street />
      </svg>
      <g clipPath={`url(#${routeId})`}>
        <path
          d="M0 547h1200"
          fill="none"
          stroke="var(--green-600)"
          strokeWidth="3"
          strokeDasharray="10 10"
        />
      </g>
      <g data-weighbridge>
        <svg
          x={handoff.weighbridge.x}
          y={handoff.weighbridge.y}
          width={handoff.weighbridge.width}
          height={handoff.weighbridge.height}
        >
          <Weighbridge reading={0} alert={false} />
        </svg>
      </g>
      <g data-bin transform="translate(727 407)">
        <svg width="60" height="80">
          <Bin tipProgress={0} showQr />
        </svg>
      </g>
      <g
        data-truck
        transform={`translate(${handoff.position.x} ${handoff.position.y})`}
      >
        <svg width={handoff.position.width} height={handoff.position.height}>
          <Truck {...handoff.truck} />
        </svg>
      </g>
      <g data-worker transform="translate(640 399)" opacity="0">
        <svg width="66" height="116">
          <Worker state="scanning" />
        </svg>
      </g>
      <path
        data-scan-beam
        d="m700 440 49-17v25Z"
        fill="var(--lime-400)"
        opacity="0"
      />
      <g data-waste opacity="0">
        <path d="m620 407 8-9 7 12Z" fill="var(--wet)" />
        <rect x="637" y="400" width="8" height="10" rx="2" fill="var(--dry)" />
        <circle cx="650" cy="405" r="4" fill="var(--orange-500)" />
      </g>
    </svg>
  );
}
