import type { ScrollTrigger } from 'gsap/ScrollTrigger';
let engine: typeof ScrollTrigger | null = null;
export function configureRefresh(value: typeof ScrollTrigger | null) {
  engine = value;
}
import { sectionOrder, type SectionId } from './sectionOrder';
const registrations = new Map<
  symbol,
  { id: SectionId; trigger: ScrollTrigger }
>();
let frame: number | undefined;
export function requestMotionRefresh() {
  if (typeof window === 'undefined' || frame !== undefined) return;
  frame = requestAnimationFrame(() => {
    frame = undefined;
    // Priority also handles children that hydrate/register out of DOM order.
    for (const { id, trigger } of registrations.values()) {
      trigger.vars.refreshPriority =
        sectionOrder.length - sectionOrder.indexOf(id);
    }
    engine?.sort();
    engine?.refresh();
  });
}
export function registerSection(id: SectionId, trigger: ScrollTrigger) {
  const token = Symbol(id);
  registrations.set(token, { id, trigger });
  requestMotionRefresh();
  return () => {
    registrations.delete(token);
    requestMotionRefresh();
  };
}
/** Provider-owned listeners. Image load/error capture includes dynamically mounted images. */
export function observeMotionLayout() {
  let disposed = false;
  const refresh = () => {
    if (!disposed) requestMotionRefresh();
  };
  const onAsset = (event: Event) => {
    if (event.target instanceof HTMLImageElement) refresh();
  };
  document.addEventListener('load', onAsset, true);
  document.addEventListener('error', onAsset, true);
  window.addEventListener('resize', refresh);
  window.addEventListener('pageshow', refresh);
  document.fonts?.ready.then(refresh);
  document.fonts?.addEventListener('loadingdone', refresh);
  refresh();
  return () => {
    disposed = true;
    document.removeEventListener('load', onAsset, true);
    document.removeEventListener('error', onAsset, true);
    window.removeEventListener('resize', refresh);
    window.removeEventListener('pageshow', refresh);
    document.fonts?.removeEventListener('loadingdone', refresh);
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
  };
}
