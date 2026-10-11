import { Component, Fragment, lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { heroContent } from '@/content/hero';
import { detectQuality, type Quality } from './quality';
import './hero.css';

const Stage = lazy(() => import('./Stage'));

type Mode = 'pending' | 'cinematic' | 'still' | 'static';

class SceneBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Phase 1 hero. Server and first client render are identical static markup (copy visible
 * without JS); the WebGL stage is chosen and lazy-loaded only after hydration.
 */
export default function CinematicHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setQuality(detectQuality());
  }, []);

  const mode: Mode =
    quality === null
      ? 'pending'
      : quality === 'poster' || failed
        ? 'static'
        : reduced
          ? 'still'
          : 'cinematic';

  const words = heroContent.title.split(' ');
  return (
    <section
      ref={sectionRef}
      className={`hero hero--${mode}`}
      data-ready={ready}
      aria-labelledby="hero-title"
    >
      <div className="hero__stage">
        <div className="hero__backdrop" role="img" aria-label={heroContent.sceneLabel} />
        {(mode === 'cinematic' || mode === 'still') && sectionRef.current && (
          <SceneBoundary onError={() => setFailed(true)}>
            <Suspense fallback={null}>
              <Stage
                quality={quality as Exclude<Quality, 'poster'>}
                still={mode === 'still'}
                section={sectionRef.current}
                onReady={() => setReady(true)}
                onFail={() => setFailed(true)}
              />
            </Suspense>
          </SceneBoundary>
        )}
        <div className="hero__copy">
          <h1 id="hero-title" className="hero__title">
            {words.map((word, i) => (
              <Fragment key={word}>
                {i > 0 && ' '}
                <span className="hero__word">{word}</span>
              </Fragment>
            ))}
          </h1>
          <p className="hero__subtitle">{heroContent.subtitle}</p>
        </div>
        <div className="hero__copy hero__copy--city">
          <h2 className="hero__city-title hero__city-line">{heroContent.city.title}</h2>
          <p className="hero__city-subtitle hero__city-line">{heroContent.city.subtitle}</p>
        </div>
      </div>
    </section>
  );
}
