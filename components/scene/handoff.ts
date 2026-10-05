import type { TruckProps } from './types';
/** LOCKED: Hero ends and Journey begins with this pose. Coordinates use the shared scene viewBox.
 * Position is applied by the parent; Truck.progress is local journey state, not scene positioning.
 * Problem sits between the sections, so continuity is semantic/visual, not one travelling DOM node.
 */
export const heroJourneyHandoff = {
  viewBox: '0 0 1200 600',
  truck: {
    progress: 1,
    loadLevel: 0.75,
    direction: 'right',
    showGps: true,
    wheelRotation: 360,
  } satisfies TruckProps,
  position: { x: 660, y: 380, width: 240, height: 140 },
  weighbridge: { x: 630, y: 500, width: 340, height: 60 },
} as const;
