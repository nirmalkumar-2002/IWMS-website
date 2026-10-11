import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  Object3D,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three';
import { LAMPS, type SceneRefs } from './handles';

/** 5600 K LED low beam. */
const HEADLIGHT_COLOR = '#fff3e6';
const BEAM_LENGTH = 15;
const BEAM_HALF_ANGLE = 0.13;
/** Low beam aims at the road ~25 m ahead. */
const AIM_DISTANCE = 25;

const beamVertex = /* glsl */ `
  uniform float uLength;
  varying float vAlong;
  varying float vWorldY;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vAxis;
  void main() {
    vAxis = normalize((modelViewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
    vAlong = position.z / uLength;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldY = world.y;
    vec4 mv = viewMatrix * world;
    vView = -mv.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

/** Additive cone: soft at the edges (fresnel), fading with length and near the road surface. */
const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vAlong;
  varying float vWorldY;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vAxis;
  void main() {
    vec3 n = normalize(vNormal);
    float facing = abs(dot(n, normalize(vView)));
    float edge = pow(facing, 2.6);
    float along = clamp(vAlong, 0.0, 1.0);
    float falloff = pow(1.0 - along, 2.2) * smoothstep(0.0, 0.06, along);
    float ground = smoothstep(0.02, 0.75, vWorldY);
    // Looking down the beam axis the cone would read as a solid disc; real beams don't.
    float headOn = abs(dot(normalize(vAxis), normalize(vView)));
    float a = uIntensity * edge * falloff * ground * (1.0 - 0.85 * smoothstep(0.55, 0.95, headOn));
    gl_FragColor = vec4(uColor * a, 1.0);
  }
`;

function useBeamGeometry() {
  const geometry = useMemo(() => {
    const radiusEnd = Math.tan(BEAM_HALF_ANGLE) * BEAM_LENGTH;
    const g = new CylinderGeometry(0.11, radiusEnd, BEAM_LENGTH, 48, 12, true);
    // Narrow end at the origin, extending along +Z (the direction lookAt() aims).
    g.translate(0, -BEAM_LENGTH / 2, 0);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function useBeamMaterial() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color(HEADLIGHT_COLOR) },
          uIntensity: { value: 0 },
          uLength: { value: BEAM_LENGTH },
        },
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

function Headlamp({ side, refs }: { side: 0 | 1; refs: SceneRefs }) {
  const z = side === 0 ? LAMPS.head.z : -LAMPS.head.z;
  const geometry = useBeamGeometry();
  const material = useBeamMaterial();
  const target = useMemo(() => new Object3D(), []);
  // Visible cone dips toward the road, as a low beam does.
  const beamAim = useMemo(
    () =>
      new Quaternion().setFromUnitVectors(
        new Vector3(0, 0, 1),
        new Vector3(AIM_DISTANCE, -LAMPS.head.y * 0.55, z * 0.15).normalize(),
      ),
    [z],
  );
  return (
    <group position={[LAMPS.head.x + 0.02, LAMPS.head.y, z]}>
      <primitive object={target} position={[AIM_DISTANCE, -LAMPS.head.y, z * 0.6]} />
      <spotLight
        ref={(light) => {
          refs.headSpots[side] = light;
          if (light) light.target = target;
        }}
        color={HEADLIGHT_COLOR}
        intensity={0}
        angle={0.52}
        penumbra={0.65}
        distance={80}
        decay={2}
        castShadow={false}
      />
      <mesh
        geometry={geometry}
        material={material}
        quaternion={beamAim}
        ref={(mesh) => {
          refs.beams[side] = mesh ? material : null;
        }}
        frustumCulled={false}
        renderOrder={2}
      />
    </group>
  );
}

/** Lamps parented to the truck root so they travel with it. Intensities are driven by the Director. */
export function TruckLights({ refs }: { refs: SceneRefs }) {
  return (
    <>
      <Headlamp side={0} refs={refs} />
      <Headlamp side={1} refs={refs} />
      <pointLight
        ref={(light) => {
          refs.markerGlow = light;
        }}
        position={[LAMPS.head.x - 0.2, LAMPS.markerRoofY + 0.25, 0]}
        color="#ff9a1f"
        intensity={0}
        distance={5}
        decay={2}
      />
      <pointLight
        ref={(light) => {
          refs.tailGlow = light;
        }}
        position={[LAMPS.tail.x - 0.4, LAMPS.tail.y, 0]}
        color="#ff2a1a"
        intensity={0}
        distance={6}
        decay={2}
      />
      <pointLight
        ref={(light) => {
          refs.bounce = light;
        }}
        position={[6, 0.35, 0]}
        color="#fff1e0"
        intensity={0}
        distance={16}
        decay={2}
      />
    </>
  );
}
