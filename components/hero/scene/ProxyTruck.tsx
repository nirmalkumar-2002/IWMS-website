import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import {
  CylinderGeometry,
  LatheGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector2,
  type Group,
  type Object3D,
} from 'three';
import type { TruckHandles } from './handles';
import { LAMPS } from './handles';

/**
 * DEVELOPMENT PROXY — not the production vehicle.
 * A dimensionally accurate stand-in (≈9.7 m rear-loader, cab-over, tandem rear axle) used for
 * camera blocking, lighting and motion work until the licensed GLB lands in public/models.
 * It exposes the same handles as the production model so the swap is a file drop.
 */
const WHEEL_R = 0.52;
const FRONT_AXLE_X = 0;
const REAR_AXLES_X = [-4.4, -5.75];
const PIVOT_X = (REAR_AXLES_X[0] + REAR_AXLES_X[1]) / 2;

function useProxyMaterials() {
  const m = useMemo(
    () => ({
      paint: new MeshPhysicalMaterial({
        color: '#1f5a3a',
        roughness: 0.48,
        metalness: 0,
        clearcoat: 0.8,
        clearcoatRoughness: 0.24,
      }),
      plastic: new MeshStandardMaterial({ color: '#16181a', roughness: 0.72 }),
      chassis: new MeshStandardMaterial({
        color: '#1d1f22',
        roughness: 0.6,
        metalness: 0.3,
      }),
      chrome: new MeshStandardMaterial({
        color: '#c7ccd1',
        roughness: 0.22,
        metalness: 1,
      }),
      alloy: new MeshStandardMaterial({
        color: '#9ea4aa',
        roughness: 0.35,
        metalness: 0.9,
      }),
      glass: new MeshPhysicalMaterial({
        color: '#0a0e12',
        roughness: 0.04,
        metalness: 0,
        clearcoat: 1,
        envMapIntensity: 1.6,
      }),
      rubber: new MeshStandardMaterial({ color: '#141414', roughness: 0.88 }),
      rim: new MeshStandardMaterial({
        color: '#a7adb3',
        roughness: 0.35,
        metalness: 0.85,
      }),
      hole: new MeshStandardMaterial({ color: '#08090a', roughness: 0.9 }),
      stripe: new MeshStandardMaterial({ color: '#cfcab8', roughness: 0.5 }),
      headL: lens('#d9dde2', '#fff3e6'),
      headR: lens('#d9dde2', '#fff3e6'),
      marker: lens('#6a4512', '#ffa526'),
      tail: lens('#3d0b0c', '#c4161c'),
    }),
    [],
  );
  useEffect(
    () => () => Object.values(m).forEach((material) => material.dispose()),
    [m],
  );
  return m;
}

function lens(color: string, emissive: string) {
  return new MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 0,
    roughness: 0.12,
    metalness: 0.2,
  });
}

function useWheelGeometry() {
  const geo = useMemo(() => {
    const profile = [
      [0.3, -0.16],
      [0.47, -0.16],
      [0.505, -0.135],
      [WHEEL_R, -0.085],
      [WHEEL_R, 0.085],
      [0.505, 0.135],
      [0.47, 0.16],
      [0.3, 0.16],
    ].map(([x, y]) => new Vector2(x, y));
    const tire = new LatheGeometry(profile, 56).rotateX(Math.PI / 2);
    const rim = new CylinderGeometry(0.3, 0.3, 0.3, 40).rotateX(Math.PI / 2);
    const disc = new CylinderGeometry(0.285, 0.285, 0.02, 40).rotateX(
      Math.PI / 2,
    );
    const hub = new CylinderGeometry(0.115, 0.13, 0.09, 24).rotateX(Math.PI / 2);
    const nut = new CylinderGeometry(0.018, 0.018, 0.04, 6).rotateX(Math.PI / 2);
    const hole = new CylinderGeometry(0.036, 0.036, 0.025, 16).rotateX(
      Math.PI / 2,
    );
    return { tire, rim, disc, hub, nut, hole };
  }, []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  return geo;
}

type Mats = ReturnType<typeof useProxyMaterials>;
type Geo = ReturnType<typeof useWheelGeometry>;

/** One tyre + steel rim, outer face toward +Z. Hand holes and lug nuts make rotation readable. */
function WheelVisual({ geo, m, z = 0 }: { geo: Geo; m: Mats; z?: number }) {
  return (
    <group position={[0, 0, z]}>
      <mesh geometry={geo.tire} material={m.rubber} castShadow />
      <mesh geometry={geo.rim} material={m.rim} />
      <mesh geometry={geo.disc} material={m.rim} position={[0, 0, 0.12]} />
      <mesh geometry={geo.hub} material={m.alloy} position={[0, 0, 0.15]} />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <mesh
            key={`n${i}`}
            geometry={geo.nut}
            material={m.chrome}
            position={[Math.cos(a) * 0.165, Math.sin(a) * 0.165, 0.145]}
          />
        );
      })}
      {Array.from({ length: 8 }, (_, i) => {
        const a = ((i + 0.5) / 8) * Math.PI * 2;
        return (
          <mesh
            key={`h${i}`}
            geometry={geo.hole}
            material={m.hole}
            position={[Math.cos(a) * 0.235, Math.sin(a) * 0.235, 0.125]}
          />
        );
      })}
    </group>
  );
}

function Wheel({
  x,
  side,
  dual,
  geo,
  m,
  register,
}: {
  x: number;
  side: 1 | -1;
  dual?: boolean;
  geo: Geo;
  m: Mats;
  register: (node: Object3D | null) => void;
}) {
  const z = side * (dual ? 0.83 : 1.03);
  return (
    // Spin node stays axis-aligned; the visual inside is flipped for the far side.
    <group ref={register} position={[x, WHEEL_R, z]}>
      <group rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
        {dual ? (
          <>
            <WheelVisual geo={geo} m={m} z={0.17} />
            <WheelVisual geo={geo} m={m} z={-0.17} />
          </>
        ) : (
          <WheelVisual geo={geo} m={m} />
        )}
      </group>
    </group>
  );
}

function Box({
  size,
  position,
  material,
  rotation,
}: {
  size: [number, number, number];
  position: [number, number, number];
  material: MeshStandardMaterial;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation} material={material} castShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

function Body({ m }: { m: Mats }) {
  const hx = LAMPS.head.x;
  return (
    <>
      {/* Cab-over cab */}
      <RoundedBox
        args={[2.35, 2.15, 2.4]}
        radius={0.1}
        smoothness={4}
        position={[0.33, 2.025, 0]}
        material={m.paint}
        castShadow
      />
      <Box size={[0.02, 0.86, 2.08]} position={[1.51, 2.47, 0]} material={m.glass} />
      {[1, -1].map((s) => (
        <group key={s}>
          <Box size={[1.0, 0.7, 0.02]} position={[0.78, 2.47, s * 1.205]} material={m.glass} />
          <Box size={[0.04, 0.04, 0.32]} position={[1.36, 2.62, s * 1.36]} material={m.plastic} />
          <Box size={[0.08, 0.42, 0.18]} position={[1.36, 2.42, s * 1.55]} material={m.plastic} />
          <Box size={[0.5, 0.04, 0.26]} position={[0.75, 0.56, s * 1.12]} material={m.chassis} />
          {/* Head lamp housing + lens, amber indicator */}
          <Box size={[0.05, 0.25, 0.47]} position={[hx - 0.02, LAMPS.head.y, s * LAMPS.head.z]} material={m.chrome} />
          <Box
            size={[0.02, 0.18, 0.4]}
            position={[hx + 0.005, LAMPS.head.y, s * LAMPS.head.z]}
            material={s === 1 ? m.headL : m.headR}
          />
          <Box size={[0.02, 0.1, 0.14]} position={[hx + 0.005, LAMPS.head.y, s * 1.17]} material={m.marker} />
          {/* Front wheel arch */}
          <mesh
            position={[FRONT_AXLE_X, WHEEL_R, s * 1.03]}
            rotation={[Math.PI / 2, 0, 0]}
            material={m.plastic}
          >
            <cylinderGeometry args={[0.64, 0.64, 0.42, 28, 1, true, Math.PI / 2, Math.PI]} />
          </mesh>
          {/* Body side markers + rear lamp cluster */}
          {[-1.6, -3.1, -4.6, -6.1].map((x) => (
            <Box key={x} size={[0.12, 0.06, 0.02]} position={[x, 1.12, s * 1.265]} material={m.marker} />
          ))}
          <Box
            size={[0.03, 0.22, 0.14]}
            position={[LAMPS.tail.x, LAMPS.tail.y, s * LAMPS.tail.z]}
            material={m.tail}
          />
          {/* Underrun guard rails */}
          <Box size={[2.9, 0.07, 0.03]} position={[-2.35, 0.66, s * 1.2]} material={m.alloy} />
          <Box size={[2.9, 0.07, 0.03]} position={[-2.35, 0.94, s * 1.2]} material={m.alloy} />
          {/* Tandem fender + mud flap */}
          <Box size={[2.2, 0.06, 0.74]} position={[PIVOT_X, 1.13, s * 0.88]} material={m.plastic} />
          <Box size={[0.02, 0.5, 0.6]} position={[-6.45, 0.6, s * 0.88]} material={m.plastic} />
          {/* Bin-lift arms */}
          <Box size={[0.1, 0.95, 0.1]} position={[-8.18, 1.35, s * 0.55]} material={m.chassis} />
        </group>
      ))}
      {/* Grille + slats, bumper */}
      <Box size={[0.04, 0.56, 1.22]} position={[1.515, 1.45, 0]} material={m.chassis} />
      {[1.26, 1.36, 1.46, 1.56, 1.66].map((y) => (
        <Box key={y} size={[0.03, 0.035, 1.18]} position={[1.54, y, 0]} material={m.chrome} />
      ))}
      <Box size={[0.16, 0.32, 2.46]} position={[1.57, 0.64, 0]} material={m.chassis} />
      {/* Roof marker bar */}
      {[-0.8, -0.4, 0, 0.4, 0.8].map((z) => (
        <Box key={z} size={[0.06, 0.05, 0.14]} position={[1.42, LAMPS.markerRoofY, z]} material={m.marker} />
      ))}
      {/* Chassis rails, fuel tank */}
      <Box size={[9.1, 0.28, 0.9]} position={[-3.25, 0.8, 0]} material={m.chassis} />
      <mesh position={[-1.55, 0.78, 1.0]} rotation={[0, 0, Math.PI / 2]} material={m.alloy}>
        <cylinderGeometry args={[0.28, 0.28, 1.0, 28]} />
      </mesh>
      {/* Compactor body with vertical stiffeners and livery stripe */}
      <RoundedBox
        args={[5.3, 2.5, 2.5]}
        radius={0.06}
        smoothness={3}
        position={[-3.65, 2.32, 0]}
        material={m.paint}
        castShadow
      />
      {[-1.35, -1.95, -2.55, -3.15, -3.75, -4.35, -4.95, -5.55, -6.1].map((x) => (
        <Box key={x} size={[0.08, 2.42, 2.6]} position={[x, 2.32, 0]} material={m.paint} />
      ))}
      <Box size={[5.24, 0.14, 2.62]} position={[-3.65, 1.42, 0]} material={m.stripe} />
      <Box size={[5.3, 0.08, 2.56]} position={[-3.65, 3.58, 0]} material={m.paint} />
      {/* Tailgate / hopper */}
      <RoundedBox
        args={[1.85, 2.55, 2.5]}
        radius={0.08}
        smoothness={3}
        position={[-7.2, 2.15, 0]}
        rotation={[0, 0, -0.05]}
        material={m.paint}
        castShadow
      />
      <Box size={[0.12, 0.62, 2.0]} position={[-8.1, 1.15, 0]} material={m.hole} />
      <Box size={[0.32, 0.12, 2.42]} position={[-8.0, 0.62, 0]} material={m.chassis} />
    </>
  );
}

export function ProxyTruck({
  onHandles,
}: {
  onHandles: (handles: TruckHandles) => void;
}) {
  const m = useProxyMaterials();
  const geo = useWheelGeometry();
  const body = useRef<Group>(null);
  const wheels = useRef(new Set<Object3D>());
  const register = (node: Object3D | null) => {
    if (node) wheels.current.add(node);
  };

  useLayoutEffect(() => {
    onHandles({
      body: body.current!,
      wheels: [...wheels.current].map((node) => ({ node, radius: WHEEL_R })),
      headlightLenses: [m.headL, m.headR],
      markerLenses: [m.marker],
      tailLenses: [m.tail],
    });
  }, [m, onHandles]);

  return (
    <group>
      {([1, -1] as const).map((side) => (
        <group key={side}>
          <Wheel x={FRONT_AXLE_X} side={side} geo={geo} m={m} register={register} />
          {REAR_AXLES_X.map((x) => (
            <Wheel key={x} x={x} side={side} dual geo={geo} m={m} register={register} />
          ))}
        </group>
      ))}
      <group ref={body} position={[PIVOT_X, 0, 0]}>
        <group position={[-PIVOT_X, 0, 0]}>
          <Body m={m} />
        </group>
      </group>
    </group>
  );
}
