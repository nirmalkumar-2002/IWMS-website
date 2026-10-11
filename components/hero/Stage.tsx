import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import 'lenis/dist/lenis.css';
import { Director } from './scene/Director';
import { createSceneRefs } from './scene/handles';
import { STILL_SHOT, createRig, focalToFov, SHOTS } from './scene/rig';
import { applyStill, startExperience } from './scene/timeline';
import { Truck } from './scene/Truck';
import { World } from './scene/World';
import type { Quality } from './quality';

// Post-processing ships in its own chunk; only the high tier downloads it.
const Effects = lazy(() =>
  import('./scene/Effects').then((m) => ({ default: m.Effects })),
);

export interface StageProps {
  quality: Exclude<Quality, 'poster'>;
  still: boolean;
  section: HTMLElement;
  onReady: () => void;
  onFail: () => void;
}

/** Fires once the scene has mounted and two frames have been presented (shaders compiled). */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const invalidate = useThree((s) => s.invalidate);
  const callback = useRef(onReady);
  const fired = useRef(false);
  useEffect(() => {
    callback.current = onReady;
  });
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      invalidate();
      frame = requestAnimationFrame(() => {
        invalidate();
        if (fired.current) return;
        fired.current = true;
        callback.current();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [invalidate]);
  return null;
}

function LoadingLine() {
  const { progress, active } = useProgress();
  return (
    <div className="hero__loader" data-active={active} aria-hidden="true">
      <span style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  );
}

export default function Stage({ quality, still, section, onReady, onFail }: StageProps) {
  const [rig] = useState(() => {
    const initial = createRig();
    if (still) applyStill(initial, STILL_SHOT);
    return initial;
  });
  const [refs] = useState(createSceneRefs);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || still) return;
    const copy = {
      words: [...section.querySelectorAll<HTMLElement>('.hero__word')],
      subtitle: section.querySelector<HTMLElement>('.hero__subtitle')!,
    };
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    return startExperience(rig, section, copy);
  }, [ready, still, rig, section]);

  return (
    <>
      <Canvas
        className="hero__canvas"
        dpr={quality === 'high' ? [1, 1.75] : [1, 1.25]}
        frameloop={still ? 'demand' : 'always'}
        gl={{
          antialias: quality !== 'high',
          powerPreference: 'high-performance',
          stencil: false,
          toneMapping: ACESFilmicToneMapping,
        }}
        camera={{ fov: focalToFov(SHOTS[0].focal), near: 0.1, far: 1400 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            onFail();
          });
        }}
      >
        <Suspense fallback={null}>
          <World quality={quality} refs={refs} />
          <Truck refs={refs} />
          <Director rig={rig} refs={refs} still={still} />
          {quality === 'high' && <Effects />}
          <ReadySignal
            onReady={() => {
              setReady(true);
              onReady();
            }}
          />
        </Suspense>
      </Canvas>
      <LoadingLine />
      {!__TRUCK_MODEL__ && (
        <p className="hero__proxy-note">
          Development proxy vehicle — final licensed truck model pending
        </p>
      )}
    </>
  );
}
