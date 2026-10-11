import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Environment, Lightformer, useTexture } from '@react-three/drei';
import {
  BackSide,
  CanvasTexture,
  Color,
  ConeGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
  Vector3,
} from 'three';
import type { Quality } from '../quality';
import type { SceneRefs } from './handles';

export const FOG = { color: '#2a3650', density: 0.019 };
const ROAD = { length: 640, width: 7, kerb: 0.15, walk: 2.6 };
const STREETLIGHT = { z: -5.45, spacing: 32, from: -160, to: 224, height: 9 };

/** Deterministic PRNG so the layout is identical on every load. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function useDisposable<T extends { dispose(): void }>(factory: () => T): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, []);
  useEffect(() => () => value.dispose(), [value]);
  return value;
}

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const skyFragment = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform vec3 uGlowDir;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
    col = mix(col, uZenith, smoothstep(0.22, 0.85, h));
    float toward = max(dot(normalize(vec3(d.x, 0.0, d.z)), uGlowDir), 0.0);
    col += uGlow * pow(toward, 5.0) * exp(-max(h, 0.0) * 11.0);
    if (h < 0.0) col = uHorizon;
    // Blue-noise-ish dither keeps the long gradient free of banding.
    col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function Sky() {
  const material = useDisposable(
    () =>
      new ShaderMaterial({
        uniforms: {
          uZenith: { value: new Color('#080d19') },
          uMid: { value: new Color('#16203a') },
          uHorizon: { value: new Color('#33425f') },
          uGlow: { value: new Color('#3a3346') },
          uGlowDir: { value: new Vector3(-1, 0, -0.35).normalize() },
        },
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
  );
  return (
    <mesh material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[820, 48, 24]} />
    </mesh>
  );
}

function Road({ quality }: { quality: Quality }) {
  const [map, normalMap, roughnessMap] = useTexture([
    '/textures/asphalt/asphalt025c_color.jpg',
    '/textures/asphalt/asphalt025c_normalgl.jpg',
    '/textures/asphalt/asphalt025c_roughness.jpg',
  ]);
  useLayoutEffect(() => {
    const tile = 3.2;
    for (const texture of [map, normalMap, roughnessMap]) {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.repeat.set(ROAD.length / tile, ROAD.width / tile);
      texture.anisotropy = quality === 'high' ? 8 : 4;
      texture.needsUpdate = true;
    }
    map.colorSpace = SRGBColorSpace;
  }, [map, normalMap, roughnessMap, quality]);

  const paint = useDisposable(
    () =>
      new MeshStandardMaterial({
        color: '#b9b39c',
        roughness: 0.6,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
  );
  const dashes = useRef<InstancedMesh>(null);
  const dashCount = Math.floor(ROAD.length / 9);
  useLayoutEffect(() => {
    const m = new Matrix4();
    for (let i = 0; i < dashCount; i++) {
      m.makeTranslation(-ROAD.length / 2 + i * 9, 0.004, 0);
      dashes.current!.setMatrixAt(i, m);
    }
    dashes.current!.instanceMatrix.needsUpdate = true;
  }, [dashCount]);

  const halfW = ROAD.width / 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROAD.length, ROAD.width]} />
        <meshStandardMaterial
          map={map}
          normalMap={normalMap}
          normalScale={[0.7, 0.7]}
          roughnessMap={roughnessMap}
          roughness={0.9}
          color="#61656c"
        />
      </mesh>
      <instancedMesh ref={dashes} args={[undefined, paint, dashCount]}>
        <boxGeometry args={[3, 0.002, 0.12]} />
      </instancedMesh>
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh material={paint} position={[0, 0.004, s * (halfW - 0.25)]}>
            <boxGeometry args={[ROAD.length, 0.002, 0.15]} />
          </mesh>
          {/* Kerb and footpath */}
          <mesh position={[0, ROAD.kerb / 2, s * (halfW + 0.09)]}>
            <boxGeometry args={[ROAD.length, ROAD.kerb, 0.18]} />
            <meshStandardMaterial color="#5a5d61" roughness={0.9} />
          </mesh>
          <mesh
            position={[0, ROAD.kerb - 0.01, s * (halfW + 0.18 + ROAD.walk / 2)]}
          >
            <boxGeometry args={[ROAD.length, 0.02, ROAD.walk]} />
            <meshStandardMaterial color="#3b3e43" roughness={0.94} />
          </mesh>
        </group>
      ))}
      {/* Verge / open ground beyond the road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[1600, 1600]} />
        <meshStandardMaterial color="#090c0b" roughness={1} />
      </mesh>
    </group>
  );
}

function Streetlights({ quality }: { quality: Quality }) {
  const xs = useMemo(() => {
    const list: number[] = [];
    for (let x = STREETLIGHT.from; x <= STREETLIGHT.to; x += STREETLIGHT.spacing)
      list.push(x);
    return list;
  }, []);
  const pole = useRef<InstancedMesh>(null);
  const arm = useRef<InstancedMesh>(null);
  const head = useRef<InstancedMesh>(null);
  const metal = useDisposable(
    () =>
      new MeshStandardMaterial({ color: '#3a3f45', roughness: 0.55, metalness: 0.6 }),
  );
  const lamp = useDisposable(
    () =>
      new MeshStandardMaterial({
        color: '#2b2d30',
        emissive: '#ffe2c0',
        emissiveIntensity: 2.4,
        roughness: 0.4,
      }),
  );
  useLayoutEffect(() => {
    const o = new Object3D();
    const armLen = 1.9;
    xs.forEach((x, i) => {
      o.position.set(x, STREETLIGHT.height / 2, STREETLIGHT.z);
      o.updateMatrix();
      pole.current!.setMatrixAt(i, o.matrix);
      o.position.set(x, STREETLIGHT.height - 0.05, STREETLIGHT.z + armLen / 2);
      o.updateMatrix();
      arm.current!.setMatrixAt(i, o.matrix);
      o.position.set(x, STREETLIGHT.height - 0.16, STREETLIGHT.z + armLen);
      o.updateMatrix();
      head.current!.setMatrixAt(i, o.matrix);
    });
    for (const mesh of [pole, arm, head])
      mesh.current!.instanceMatrix.needsUpdate = true;
  }, [xs]);

  // Only the posts nearest the action carry real lights; the rest are emissive heads.
  const litPosts = quality === 'high' ? [-32, 32] : [32];
  return (
    <group>
      <instancedMesh ref={pole} args={[undefined, metal, xs.length]}>
        <cylinderGeometry args={[0.07, 0.11, STREETLIGHT.height, 10]} />
      </instancedMesh>
      <instancedMesh ref={arm} args={[undefined, metal, xs.length]}>
        <boxGeometry args={[0.07, 0.07, 1.9]} />
      </instancedMesh>
      <instancedMesh ref={head} args={[undefined, lamp, xs.length]}>
        <boxGeometry args={[0.32, 0.1, 0.68]} />
      </instancedMesh>
      {litPosts.map((x) => (
        <StreetLamp key={x} x={x} />
      ))}
    </group>
  );
}

function StreetLamp({ x }: { x: number }) {
  const target = useMemo(() => new Object3D(), []);
  return (
    <>
      <primitive object={target} position={[x, 0, -0.8]} />
      <spotLight
        ref={(light) => {
          if (light) light.target = target;
        }}
        position={[x, STREETLIGHT.height - 0.3, STREETLIGHT.z + 1.9]}
        color="#ffe2c0"
        intensity={240}
        angle={0.95}
        penumbra={0.9}
        distance={28}
        decay={2}
      />
    </>
  );
}

/** Instanced tree lines (conifers + broadleaf canopies) that read as silhouettes through fog. */
function Treeline() {
  const conifers = useRef<InstancedMesh>(null);
  const canopies = useRef<InstancedMesh>(null);
  const coneGeo = useDisposable(() => new ConeGeometry(1, 1, 16, 3).translate(0, 0.5, 0));
  const blobGeo = useDisposable(() => new IcosahedronGeometry(1, 4));
  const foliage = useDisposable(
    () => new MeshStandardMaterial({ color: '#0a0f0d', roughness: 1 }),
  );
  const layout = useMemo(() => {
    const random = rng(7);
    const cones: Matrix4[] = [];
    const blobs: Matrix4[] = [];
    const o = new Object3D();
    const bands: [number, number][] = [
      [-60, -20],
      [40, 72],
    ];
    for (const [zMin, zMax] of bands) {
      for (let x = -280; x < 320; x += 3 + random() * 4) {
        const z = zMin + random() * (zMax - zMin);
        if (random() < 0.6) {
          const h = 8 + random() * 8;
          o.position.set(x, 0, z);
          o.scale.set(1.4 + random() * 1.2, h, 1.4 + random() * 1.2);
          o.rotation.set(0, random() * Math.PI, 0);
          o.updateMatrix();
          cones.push(o.matrix.clone());
        } else {
          const r = 2.4 + random() * 2.2;
          o.position.set(x, r * 0.9 + 2.5 + random() * 2, z);
          o.scale.set(r * (1 + random() * 0.4), r * (0.8 + random() * 0.3), r);
          o.rotation.set(random(), random() * Math.PI, random());
          o.updateMatrix();
          blobs.push(o.matrix.clone());
        }
      }
    }
    return { cones, blobs };
  }, []);
  useLayoutEffect(() => {
    layout.cones.forEach((m, i) => conifers.current!.setMatrixAt(i, m));
    layout.blobs.forEach((m, i) => canopies.current!.setMatrixAt(i, m));
    conifers.current!.instanceMatrix.needsUpdate = true;
    canopies.current!.instanceMatrix.needsUpdate = true;
  }, [layout]);
  return (
    <>
      <instancedMesh
        ref={conifers}
        args={[coneGeo, foliage, layout.cones.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={canopies}
        args={[blobGeo, foliage, layout.blobs.length]}
        frustumCulled={false}
      />
    </>
  );
}

/** Low warehouse / housing blocks with a scatter of warm early-riser windows. */
function Buildings() {
  const windows = useDisposable(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 128, 128);
    const random = rng(11);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 10; x++)
        if (random() < 0.07) {
          ctx.fillStyle = random() < 0.7 ? '#ffb36b' : '#cfe0ff';
          ctx.fillRect(x * 12.8 + 3, y * 16 + 5, 6, 7);
        }
    return new CanvasTexture(canvas);
  });
  const material = useDisposable(
    () =>
      new MeshStandardMaterial({
        color: '#121722',
        roughness: 0.9,
        emissive: '#ffffff',
        emissiveMap: windows,
        emissiveIntensity: 0.55,
      }),
  );
  const mesh = useRef<InstancedMesh>(null);
  const blocks = useMemo(() => {
    const random = rng(3);
    const list: Matrix4[] = [];
    const o = new Object3D();
    for (const [zMin, zMax, count] of [
      [-95, -62, 20],
      [72, 115, 14],
    ]) {
      for (let i = 0; i < count; i++) {
        const w = 12 + random() * 20;
        const h = 7 + random() * 17;
        o.position.set(-250 + random() * 520, h / 2, zMin + random() * (zMax - zMin));
        o.scale.set(w, h, 10 + random() * 12);
        o.rotation.set(0, (random() - 0.5) * 0.3, 0);
        o.updateMatrix();
        list.push(o.matrix.clone());
      }
    }
    return list;
  }, []);
  useLayoutEffect(() => {
    blocks.forEach((m, i) => mesh.current!.setMatrixAt(i, m));
    mesh.current!.instanceMatrix.needsUpdate = true;
  }, [blocks]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, material, blocks.length]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

export function World({ quality, refs }: { quality: Quality; refs: SceneRefs }) {
  return (
    <>
      <fogExp2 attach="fog" args={[FOG.color, FOG.density]} />
      {/* Reflections come from the scene's own blue-hour sky plus soft streetlight panels: no sun hotspot. */}
      <Environment resolution={256} frames={1} environmentIntensity={1.3}>
        <Sky />
        <Lightformer form="rect" color="#ffe2c0" intensity={1.4} scale={[6, 1, 1]} position={[0, 9, -6]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" color="#ffe2c0" intensity={0.8} scale={[6, 1, 1]} position={[32, 9, -6]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="ring" color="#8fb0ff" intensity={0.6} scale={30} position={[-60, 8, -40]} target={[0, 0, 0]} />
      </Environment>
      <hemisphereLight
        ref={(light) => {
          refs.sky = light;
        }}
        args={['#4a5f86', '#14161a', 0.5]}
      />
      {/* Pre-dawn sky key, cool and from behind the truck */}
      <directionalLight position={[-40, 30, -25]} color="#c9d6ff" intensity={0.3} />
      {/* Rim: traces the roofline so the truck reads as a silhouette with lamps off */}
      <directionalLight position={[-26, 7, -16]} color="#8fb0ff" intensity={0.65} />
      {/* Front-side sky fill, driven by rig.dawn */}
      <directionalLight
        ref={(light) => {
          refs.fill = light;
        }}
        position={[30, 22, 40]}
        color="#9fb3d9"
        intensity={0}
      />
      <Sky />
      <Road quality={quality} />
      <Streetlights quality={quality} />
      <Treeline />
      <Buildings />
    </>
  );
}
