import type {
  DirectionalLight,
  Group,
  HemisphereLight,
  IUniform,
  MeshBasicMaterial,
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
  /** Phase 2.2 sunrise: lights and materials the SunDirector drives (registered at mount). */
  day: DayTargets;
}

/**
 * Everything the sunrise animates. Registered once at mount; the SunDirector only writes
 * uniform-level values (colours, intensities), never flags that would recompile shaders.
 * Every registered `base` is the value used today, so sun = 0 leaves Scene 01 unchanged.
 */
export interface DayTargets {
  /** Sky dome material uniforms (uZenith, uMid, uHorizon, uGlow + sunrise uniforms). */
  sky: Record<string, IUniform> | null;
  /** Sun directional light: intensity 0 in Scene 01; exists from the first frame. */
  sunLight: DirectionalLight | null;
  keyLight: DirectionalLight | null;
  rimLight: DirectionalLight | null;
  /** Emissive streetlight heads (World + city). Faded off around sunrise. */
  lampHeads: { material: MeshStandardMaterial; base: number }[];
  /** Emissive lit windows (World backdrop, city facades). Dimmed by daylight. */
  windows: { material: MeshStandardMaterial; base: number }[];
  /** Unlit window glow (MeshBasic): colour scaled from its base. */
  windowGlow: MeshBasicMaterial[];
  /** Scene 01's fixed real street spot lights. */
  streetSpots: { light: SpotLight; base: number }[];
  /** City skyline shader uniforms: `uDots` scales window dots, `uTint` lifts the silhouette. */
  skyline: { uDots: IUniform<number>; uTint: IUniform<number> } | null;
  /** Current sunrise progress (0..1), written by the SunDirector before other consumers run. */
  progress: number;
}

export const createDayTargets = (): DayTargets => ({
  sky: null,
  sunLight: null,
  keyLight: null,
  rimLight: null,
  lampHeads: [],
  windows: [],
  windowGlow: [],
  streetSpots: [],
  skyline: null,
  progress: 0,
});

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
  day: createDayTargets(),
});

/** Shared lamp geometry, in truck-local metres (front axle origin, +X forward). */
export const LAMPS = {
  head: { x: 1.53, y: 1.05, z: 0.86 },
  tail: { x: -8.12, y: 1.05, z: 1.08 },
  markerRoofY: 3.08,
};
