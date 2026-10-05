/** LOCKED scene contracts. Request all changes through SHARED_CHANGES.md.
 * Normalised progress/load/tip values are clamped to [0,1]. Wheel rotation is degrees.
 * All components render a standalone decorative SVG; parent supplies accessible DOM captions.
 */
export type TruckProps = {
  progress: number;
  loadLevel: number;
  direction: 'left' | 'right';
  showGps: boolean;
  wheelRotation?: number;
};
export type BinProps = { tipProgress: number; showQr: boolean };
export type WorkerProps = {
  state: 'idle' | 'walking' | 'scanning' | 'returning';
};
export type HouseProps = { showQr?: boolean };
export type WeighbridgeProps = { reading: number; alert: boolean };
export type ProcessingPlantProps = { active?: boolean };
export type LandfillProps = { fillLevel?: number; alert?: boolean };
export type SkylineProps = { className?: string };
export type StreetProps = { className?: string };
export type TreeProps = { className?: string };
