import { useCallback, useEffect, useMemo } from 'react';
import { CanvasTexture, MeshBasicMaterial } from 'three';
import type { SceneRefs, TruckHandles } from './handles';
import { ModelTruck } from './ModelTruck';
import { ProxyTruck } from './ProxyTruck';
import { TruckLights } from './TruckLights';
import { TRUCK_LANE_Z } from './rig';

/** Soft ambient-occlusion pool under the chassis; blue-hour sky light casts no hard shadow. */
function useContactShadow() {
  const material = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 32, 4, 128, 32, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.92)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 64);
    return new MeshBasicMaterial({
      map: new CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
  }, []);
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );
  return material;
}

export function Truck({ refs }: { refs: SceneRefs }) {
  const shadow = useContactShadow();
  const onHandles = useCallback(
    (handles: TruckHandles) => {
      refs.truck = handles;
    },
    [refs],
  );
  return (
    <group position={[0, 0, TRUCK_LANE_Z]}>
      <group
        ref={(group) => {
          refs.drive = group;
        }}
      >
        {__TRUCK_MODEL__ ? (
          <ModelTruck onHandles={onHandles} />
        ) : (
          <ProxyTruck onHandles={onHandles} />
        )}
        <TruckLights refs={refs} />
        <mesh
          material={shadow}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-3.3, 0.012, 0]}
          renderOrder={1}
        >
          <planeGeometry args={[12.5, 3.6]} />
        </mesh>
      </group>
    </group>
  );
}
