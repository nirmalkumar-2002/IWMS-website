import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useReducedMotion } from './useReducedMotion';
import { configureRefresh, observeMotionLayout } from './refreshCoordinator';
type Runtime = typeof import('./runtime');
const MotionContext = createContext<{
  ready: boolean;
  runtime: Runtime | null;
}>({ ready: false, runtime: null });
export const useMotion = () => useContext(MotionContext);
/** One provider in src/App.tsx. Imports animation code after paint; reduced motion loads none. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  useEffect(() => {
    if (reduced) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    const start = () => {
      void import('./runtime')
        .then((engine) => {
          if (
            disposed ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
          )
            return;
          const lenis = new engine.Lenis({
            autoRaf: false,
            anchors: { offset: -96 },
            smoothWheel: true,
          });
          const update = () => engine.ScrollTrigger.update();
          const tick = (time: number) => lenis.raf(time * 1000);
          configureRefresh(engine.ScrollTrigger);
          lenis.on('scroll', update);
          engine.gsap.ticker.add(tick);
          const stopObserving = observeMotionLayout();
          setRuntime(engine);
          cleanup = () => {
            stopObserving();
            engine.gsap.ticker.remove(tick);
            lenis.off('scroll', update);
            lenis.destroy();
            configureRefresh(null);
          };
        })
        .catch((error) => {
          if (!disposed)
            console.warn(
              'Motion enhancement unavailable; static content remains available.',
              error,
            );
        });
    };
    // Delay beyond the first paint. Idle callback is cancelled during StrictMode teardown.
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      if ('requestIdleCallback' in window)
        idle = window.requestIdleCallback(start, { timeout: 1500 });
      else timer = setTimeout(start, 100);
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) clearTimeout(timer);
      cleanup?.();
      setRuntime(null);
    };
  }, [reduced]);
  return (
    <MotionContext.Provider
      value={{
        ready: !reduced && runtime !== null,
        runtime: reduced ? null : runtime,
      }}
    >
      {children}
    </MotionContext.Provider>
  );
}
