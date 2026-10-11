import type {
  DirectionalLight,
  Group,
  HemisphereLight,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  ShaderMaterial,
  SpotLight,
} from 'three';

/** Animatable parts every truck implementation (licensed GLB or dev proxy) must expose. */
export interface TruckHandles {
  /** Sprung mass. Pivots at the rear axle for acceleration squat. */
  body: Group;
  /** Wheels spin about their local Z axis; front wheels also steer about Y. Radius in metres. */
  wheels: { node: Object3D; radius: number; front: boolean }[];
  headlightLenses: [MeshStandardMaterial, MeshStandardMaterial];
  markerLenses: MeshStandardMaterial[];
  tailLenses: MeshStandardMaterial[];
}

/** Everything the Director drives each frame. Filled in by scene components as they mount. */
export interface SceneRefs {
  /** Translated along +X when driving. Origin = front axle centre at ground level. */
  drive: Group | null;
  truck: TruckHandles | null;
  headSpots: (SpotLight | null)[];
  beams: (ShaderMaterial | null)[];
  markerGlow: PointLight | null;
  tailGlow: PointLight | null;
  /** Road bounce ahead of the bumper; rises with the headlights. */
  bounce: PointLight | null;
  sky: HemisphereLight | null;
  /** Soft front-side sky fill; rises as dawn progresses through the reveal. */
  fill: DirectionalLight | null;
  /** Sky dome, re-centred on the camera every frame so it never clips on the long journey. */
  skyDome: Object3D | null;
  /** City streetlight heads registered by the city layout (world positions + aim points). */
  cityLamps: CityLamp[];
}

export interface CityLamp {
  x: number;
  y: number;
  z: number;
  /** Ground point the lamp is aimed at. */
  tx: number;
  tz: number;
  /** Light colour (hex) and peak intensity in candela for the pooled real light. */
  color: string;
  candela: number;
}

export const createSceneRefs = (): SceneRefs => ({
  drive: null,
  truck: null,
  headSpots: [null, null],
  beams: [null, null],
  markerGlow: null,
  tailGlow: null,
  bounce: null,
  sky: null,
  fill: null,
  skyDome: null,
  cityLamps: [],
});

/** Shared lamp geometry, in truck-local metres (front axle origin, +X forward). */
export const LAMPS = {
  head: { x: 1.53, y: 1.05, z: 0.86 },
  tail: { x: -8.12, y: 1.05, z: 1.08 },
  markerRoofY: 3.08,
};
