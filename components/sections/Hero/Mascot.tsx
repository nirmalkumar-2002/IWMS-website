import { useEffect, useRef, useState } from 'react';
import { sectionOrder, type SectionId } from '@/lib/animations/sectionOrder';
import { heroContent } from '@/content/hero';
import './mascot.css';

type Gesture = 'wave' | 'point' | 'collect' | 'look' | 'thumbs' | 'idle';
type MascotMoment = { message: string; gesture: Gesture };

const labels = heroContent.labels!;
const moments: Partial<Record<SectionId, MascotMoment>> = {
  platform: { message: labels.mascotGreeting, gesture: 'wave' },
  problem: { message: labels.mascotProblem, gesture: 'point' },
  'how-it-works': { message: labels.mascotJourney, gesture: 'collect' },
  modules: { message: labels.mascotModules, gesture: 'look' },
  dashboard: { message: labels.mascotDashboard, gesture: 'look' },
  technologies: { message: labels.mascotTechnology, gesture: 'point' },
  citizen: { message: labels.mascotCitizen, gesture: 'wave' },
  compliance: { message: labels.mascotCompliance, gesture: 'point' },
  impact: { message: labels.mascotImpact, gesture: 'thumbs' },
  finance: { message: labels.mascotFinance, gesture: 'thumbs' },
  roadmap: { message: labels.mascotRoadmap, gesture: 'point' },
  contact: { message: labels.mascotCTA, gesture: 'point' },
};

function CollectionWorker({ gesture }: { gesture: Gesture }) {
  return (
    <svg
      className="mascot-art"
      viewBox="0 0 220 320"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="mascot-vest" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#b9e878" />
          <stop offset=".52" stopColor="#91c944" />
          <stop offset="1" stopColor="#5e9d36" />
        </linearGradient>
        <linearGradient id="mascot-shirt" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#276c48" />
          <stop offset="1" stopColor="#164733" />
        </linearGradient>
        <linearGradient id="mascot-skin" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#f2bf8c" />
          <stop offset="1" stopColor="#c9855d" />
        </linearGradient>
        <linearGradient id="mascot-helmet" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#d1ef8d" />
          <stop offset="1" stopColor="#79b841" />
        </linearGradient>
        <filter id="mascot-shadow" x="-40%" y="-30%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <ellipse cx="108" cy="303" rx="48" ry="7" fill="#123322" opacity=".16" filter="url(#mascot-shadow)" />
      <g className="mascot-body" data-gesture={gesture}>
        {/* Work trousers and safety shoes */}
        <path d="m77 213-3 64 13 7 12-58 8 58 14-1 8-70-13-13Z" fill="#18364a" />
        <path d="m74 268 24 2-2 9-11 7-20-1q-4-2 0-6Z" fill="#102635" />
        <path d="m107 271 22-1 3 7-10 9-20 1q-4-2 0-6Z" fill="#102635" />
        <path d="m75 263 24 2-1 7-24-2Zm34 2 20-1-1 7-20 2Z" fill="#d9e9e0" />
        <path d="m77 270 20 2m14-2 17-1" stroke="#ef8c40" strokeWidth="3" />

        {/* Shirt and high-visibility vest */}
        <path d="m77 119-17 7-12 45 14 5 13-24-2 66q34 17 72-1l-9-71 16 29 13-7-22-46-22-7Z" fill="url(#mascot-shirt)" />
        <path d="m79 116 27 10 27-10 17 9-13 24 4 54q-32 18-69 0l5-54-14-24Z" fill="url(#mascot-vest)" stroke="#4c8d39" strokeWidth="2" />
        <path d="m106 127-8 17 9 7 10-7-8-17m-27 28 47 1m-48 34 49 1" fill="none" stroke="#f5f4d9" strokeWidth="5" strokeLinecap="round" />
        <path d="m81 153-3 47m49-47 3 47" stroke="#f6a348" strokeWidth="2.5" opacity=".95" />
        <path d="m110 155 11 5-3 8-10-4Z" fill="#28563b" />
        <circle cx="114" cy="161" r="1.8" fill="#b7e46e" />
        <path d="m70 192 9 4m48 0 9-4" stroke="#528839" strokeWidth="2" />

        {/* Neck and friendly face */}
        <path d="M96 103h27v24q-13 13-27 0Z" fill="url(#mascot-skin)" />
        <ellipse cx="109" cy="76" rx="34" ry="39" fill="url(#mascot-skin)" />
        <path d="M78 77q-7-29 18-43 24-12 43 8l7 25-9-5-5-13q-20 13-48 7l-2 22Z" fill="#273840" />
        <ellipse cx="75" cy="80" rx="5" ry="8" fill="#cb8d67" />
        <ellipse cx="142" cy="80" rx="5" ry="8" fill="#cb8d67" />
        <g className="mascot-eyes">
          <path d="M92 76q5-4 10 0m14 0q5-4 10 0" fill="none" stroke="#45362f" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="98" cy="83" rx="2.3" ry="3" fill="#172a32" />
          <ellipse cx="122" cy="83" rx="2.3" ry="3" fill="#172a32" />
        </g>
        <path d="M109 83q-3 8 1 9" fill="none" stroke="#a9674b" strokeWidth="2" strokeLinecap="round" />
        <path d="M100 98q10 9 21 0" fill="none" stroke="#7b3f39" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M85 91q6 5 12 2m28 0q5 3 10-2" fill="#e79b80" opacity=".42" />

        {/* Safety helmet */}
        <path d="M75 65q2-34 34-37 33 1 35 36l-8 5H80Z" fill="url(#mascot-helmet)" stroke="#619b39" strokeWidth="2" />
        <path d="M72 66q35-10 75 0l-3 8q-36-7-69 1Z" fill="#72ad3d" />
        <path d="M91 43q12-8 27-4" fill="none" stroke="#eff9d2" strokeWidth="3" strokeLinecap="round" opacity=".7" />
        <path d="M108 31v-5" stroke="#619b39" strokeWidth="4" strokeLinecap="round" />

        {/* Left hand holds a compact litter picker */}
        <path d="m68 137-15 31 7 8 17-27" fill="none" stroke="#286848" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m61 174-18 76" stroke="#3f5960" strokeWidth="4" strokeLinecap="round" />
        <path d="m40 250 4 6-7 5m9-5 5 4-7 5" fill="none" stroke="#3f5960" strokeWidth="3" strokeLinecap="round" />
        <path d="M55 168q-9-4-12 5 3 8 10 6l6-7Z" fill="#f2a36c" stroke="#d68a58" strokeWidth="1.5" />

        {/* Gesture arm changes at selected page chapters */}
        {gesture === 'wave' && (
          <g className="mascot-gesture-arm mascot-arm-wave" data-mascot-wave>
            <path d="m138 130 19-17 3-22" fill="none" stroke="#286848" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m155 98 4-12m2 12 6-11m-10 9-1-12" fill="none" stroke="#f3a66f" strokeWidth="5" strokeLinecap="round" />
            <path d="m157 91 7-1 1 7-7 2Z" fill="#f3a66f" />
          </g>
        )}
        {gesture === 'point' && (
          <g className="mascot-gesture-arm mascot-arm-point" data-mascot-arm>
            <path d="m138 130 26 5 16-28" fill="none" stroke="#286848" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m178 111 15-21 3 2-7 25q-3 9-11 7l-7-4Z" fill="#f3a66f" stroke="#d68a58" strokeWidth="1.5" strokeLinejoin="round" />
          </g>
        )}
        {gesture === 'collect' && (
          <g className="mascot-gesture-arm mascot-arm-collect" data-mascot-arm>
            <path d="m138 130 24 22 12 36" fill="none" stroke="#286848" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m170 182 7 11-6 5-9-10Z" fill="#f3a66f" stroke="#d68a58" strokeWidth="1.5" />
            <g className="mascot-bottle">
              <path d="m177 223 13-3 4 17q-7 6-15 3Z" fill="#4ca3a5" stroke="#287176" strokeWidth="2" />
              <path d="m180 222 1-4 8-2 2 4" fill="none" stroke="#287176" strokeWidth="2" />
            </g>
            <g transform="translate(165 257)">
              <path d="m0 3 15-4 15 4-3 31H3Z" fill="#2563a2" stroke="#174d82" strokeWidth="2" />
              <path d="M3 7h24" stroke="#93c8f1" strokeWidth="3" />
              <path d="m14 12 7 4-7 4-7-4Z" fill="#e6f4ff" />
              <path d="M14 16v7m0 0-3-3m3 3 3-3" stroke="#e6f4ff" strokeWidth="1.6" fill="none" />
            </g>
          </g>
        )}
        {gesture === 'thumbs' && (
          <g className="mascot-gesture-arm mascot-arm-thumbs" data-mascot-arm>
            <path d="m138 130 24-5 7-28" fill="none" stroke="#286848" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m166 100-1-13q0-7 6-6l3 13 5-8q4-5 7-1l-3 10q8-3 9 3l-5 13q-3 7-11 6l-9-3Z" fill="#f3a66f" stroke="#d68a58" strokeWidth="1.5" strokeLinejoin="round" />
          </g>
        )}
        {(gesture === 'look' || gesture === 'idle') && (
          <g className="mascot-gesture-arm mascot-arm-idle" data-mascot-arm>
            <path d="m138 130 17 22 4 22" fill="none" stroke="#286848" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m159 172 5 10-7 5-7-9Z" fill="#f3a66f" stroke="#d68a58" strokeWidth="1.5" />
          </g>
        )}
      </g>
    </svg>
  );
}

export function Mascot() {
  const [activeId, setActiveId] = useState<SectionId>('platform');
  const [greeting, setGreeting] = useState(true);
  const [settled, setSettled] = useState(false);
  const [opened, setOpened] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const activeIdRef = useRef<SectionId>('platform');
  const openedRef = useRef(false);
  const activeMoment = moments[activeId] ?? { message: '', gesture: 'idle' as const };
  const activeIndex = sectionOrder.indexOf(activeId);
  const nextId = sectionOrder[activeIndex + 1];

  useEffect(() => {
    const targets = sectionOrder
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    let bubbleTimer: number | undefined;
    const updateCurrent = () => {
      const middle = window.innerHeight * 0.5;
      const current = targets
        .map((element) => ({ element, bounds: element.getBoundingClientRect() }))
        .filter(({ bounds }) => bounds.top < window.innerHeight * 0.62 && bounds.bottom > window.innerHeight * 0.38)
        .sort((a, b) => Math.abs(a.bounds.top + a.bounds.height / 2 - middle) - Math.abs(b.bounds.top + b.bounds.height / 2 - middle))[0];
      const id = current?.element.id as SectionId | undefined;
      if (id && id !== activeIdRef.current) {
        activeIdRef.current = id;
        setActiveId(id);
        if (moments[id]) {
          setGreeting(false);
          setBubbleVisible(true);
          window.clearTimeout(bubbleTimer);
          bubbleTimer = window.setTimeout(() => {
            if (!openedRef.current) setBubbleVisible(false);
          }, 2800);
        } else if (!openedRef.current) setBubbleVisible(false);
      }
    };
    const observer = new IntersectionObserver(updateCurrent, { rootMargin: '-38% 0px -38% 0px', threshold: 0 });
    targets.forEach((element) => observer.observe(element));
    updateCurrent();
    return () => {
      observer.disconnect();
      window.clearTimeout(bubbleTimer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { setGreeting(false); setBubbleVisible(false); }, 2800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const current = moments[activeId];
    if (current?.gesture !== 'wave') {
      setSettled(true);
      return;
    }
    setSettled(false);
    const timer = window.setTimeout(() => setSettled(true), 1250);
    return () => window.clearTimeout(timer);
  }, [activeId]);

  const shownMessage = greeting
    ? labels.mascotGreeting
    : activeId === 'platform'
      ? opened ? labels.mascotDefault : ''
      : activeMoment.message || (opened ? labels.mascotDefault : '');
  const showBubble = Boolean(shownMessage) && bubbleVisible;
  const nextLabel = nextId ? sectionOrder[activeIndex + 1] : undefined;
  const gesture = activeMoment.gesture === 'wave' && settled ? 'idle' : activeMoment.gesture;

  return (
    <div className="waste-mascot" data-section={activeId} data-mascot>
      <div className="mascot-arrival">
        {showBubble && (
          <div
            key={activeId + shownMessage}
            className="mascot-speech"
          >
            <p>{shownMessage}</p>
            {!greeting && nextLabel && (
              <a href={`#${nextLabel}`} onClick={() => setOpened(false)}>
                {labels.mascotContinue}<span aria-hidden="true"> ↗</span>
              </a>
            )}
          </div>
        )}
        <button
          className="mascot-button"
          type="button"
          aria-label={labels.mascotToggle}
          aria-expanded={showBubble}
          onClick={() => {
            setGreeting(false);
            setOpened((value) => {
              const next = !value;
              openedRef.current = next;
              setBubbleVisible(next);
              return next;
            });
          }}
        >
          <span className="mascot-pose">
            <CollectionWorker gesture={gesture} />
          </span>
        </button>
      </div>
    </div>
  );
}
