import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, type SpotLight } from 'three';
import type { CityLamp, SceneRefs } from './handles';
import { TRUCK_LANE_Z } from './rig';
import { streetLampOn } from './sun';

/** Real-light radius around the truck; beyond FADE_END a pooled light is dark and free to move. */
const FADE_START = 30;
const FADE_END = 58;

/**
 * A fixed pool of real SpotLights that borrow the city streetlight heads nearest the truck.
 * The pool exists from the first frame (intensity 0) so the light count — and therefore every
 * compiled shader — never changes when the city mounts. A light only moves to another lamp once
 * its current lamp has faded to zero, so there is no visible pop.
 */
export function CityLightPool({ refs, count }: { refs: SceneRefs; count: number }) {
  const lights = useRef<(SpotLight | null)[]>([]);
  const targets = useMemo(
    () => Array.from({ length: count }, () => new Object3D()),
    [count],
  );
  const assigned = useRef<(CityLamp | null)[]>(Array(count).fill(null));

  useFrame(() => {
    const drive = refs.drive;
    const lamps = refs.cityLamps;
    if (!drive || lamps.length === 0) return;
    const px = drive.position.x;
    const pz = drive.position.z + TRUCK_LANE_Z;
    const reach = (lamp: CityLamp) => Math.hypot(lamp.x - px, lamp.z - pz);
    const fade = (d: number) => {
      const k = Math.min(1, Math.max(0, (d - FADE_START) / (FADE_END - FADE_START)));
      return 1 - k * k * (3 - 2 * k);
    };

    // Release lamps that have faded out, then hand free lights to the nearest unlit lamps.
    const slots = assigned.current;
    for (let i = 0; i < count; i++) {
      const lamp = slots[i];
      if (lamp && reach(lamp) >= FADE_END) slots[i] = null;
    }
    const candidates = lamps
      .filter((lamp) => !slots.includes(lamp) && reach(lamp) < FADE_END)
      .sort((a, b) => reach(a) - reach(b));
    for (let i = 0; i < count && candidates.length; i++) {
      if (!slots[i]) slots[i] = candidates.shift()!;
    }

    for (let i = 0; i < count; i++) {
      const light = lights.current[i];
      const lamp = slots[i];
      if (!light) continue;
      if (!lamp) {
        light.intensity = 0;
        continue;
      }
      light.position.set(lamp.x, lamp.y, lamp.z);
      light.color.set(lamp.color);
      targets[i].position.set(lamp.tx, 0, lamp.tz);
      targets[i].updateMatrixWorld();
      // Per-lamp photocell: each real light switches off at its own point in the sunrise.
      light.intensity =
        lamp.candela * fade(reach(lamp)) * streetLampOn(refs.day.progress, lamp.x, lamp.z);
    }
  });

  return (
    <>
      {targets.map((target, i) => (
        <group key={i}>
          <primitive object={target} />
          <spotLight
            ref={(light) => {
              lights.current[i] = light;
              if (light) light.target = target;
            }}
            intensity={0}
            angle={0.95}
            penumbra={0.9}
            distance={30}
            decay={2}
            position={[0, -50, 0]}
          />
        </group>
      ))}
    </>
  );
}
