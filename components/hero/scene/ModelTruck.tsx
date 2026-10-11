import { useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import {
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import type { TruckHandles } from './handles';

export const TRUCK_MODEL_URL = '/models/garbage-truck.glb';

/**
 * Production truck. Node names, units and orientation follow docs/TRUCK_ASSET_SPEC.md:
 * metres, Y up, facing +X, origin at the front axle centre on the ground; Body and Wheel_* siblings.
 */
export function ModelTruck({
  onHandles,
}: {
  onHandles: (handles: TruckHandles) => void;
}) {
  const gltf = useGLTF(TRUCK_MODEL_URL, '/draco/');

  const built = useMemo(() => {
    const root = new Group();
    const scene = gltf.scene.clone(true);
    root.add(scene);
    root.updateMatrixWorld(true);

    const named = (pattern: RegExp) => {
      const found: Object3D[] = [];
      scene.traverse((node) => {
        if (pattern.test(node.name)) found.push(node);
      });
      return found;
    };
    const ownMaterial = (node: Object3D) => {
      const clones: MeshStandardMaterial[] = [];
      node.traverse((child) => {
        if (!(child as Mesh).isMesh) return;
        const mesh = child as Mesh;
        const clone = (mesh.material as Material).clone() as MeshStandardMaterial;
        clone.emissiveIntensity = 0;
        mesh.material = clone;
        clones.push(clone);
      });
      return clones;
    };

    const wheels = named(/^Wheel_/).map((node) => {
      const size = new Box3().setFromObject(node).getSize(new Vector3());
      return { node, radius: size.y / 2 };
    });
    const rearX = wheels
      .map(({ node }) => node.getWorldPosition(new Vector3()).x)
      .filter((x) => x < -1);
    const pivotX = rearX.length
      ? rearX.reduce((sum, x) => sum + x, 0) / rearX.length
      : -5;

    const body = new Group();
    body.position.x = pivotX;
    root.add(body);
    body.updateMatrixWorld(true);
    const bodyNode = named(/^Body$/)[0];
    if (bodyNode) body.attach(bodyNode);

    const [headL] = ownMaterial(named(/^Headlight_L$/)[0] ?? new Group());
    const [headR] = ownMaterial(named(/^Headlight_R$/)[0] ?? new Group());
    const handles: TruckHandles = {
      body,
      wheels,
      headlightLenses: [headL, headR],
      markerLenses: named(/^Marker_/).flatMap(ownMaterial),
      tailLenses: named(/^Taillight_/).flatMap(ownMaterial),
    };
    return { root, handles };
  }, [gltf]);

  useLayoutEffect(() => {
    const { handles } = built;
    onHandles(handles);
    return () => {
      const lenses = [
        ...handles.headlightLenses,
        ...handles.markerLenses,
        ...handles.tailLenses,
      ];
      lenses.forEach((material) => material?.dispose());
    };
  }, [built, onHandles]);

  return <primitive object={built.root} />;
}
