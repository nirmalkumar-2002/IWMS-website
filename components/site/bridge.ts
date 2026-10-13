/**
 * Navigation bridge between the site header and the cinematic stage. Type-only: the header never
 * imports the WebGL stage or its timeline, so the SSR bundle stays free of WebGL code.
 */
export type HeroLabel = 'collect:household' | 'collect:end';

export interface HeroBridge {
  /**
   * Scrolls the pinned hero to a reveal-timeline label. `immediate` jumps without scrubbing
   * through the scroll in between. Returns false if the label is unknown.
   */
  goTo: (label: HeroLabel, options?: { immediate?: boolean }) => boolean;
}
