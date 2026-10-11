import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  type IUniform,
  type Texture,
  Vector2,
} from 'three';
import type { SceneRefs } from '../handles';
import type { Bucket } from './kit';
import { buildCity } from './layout';
import {
  makeFacade,
  makeFoliage,
  makeGlassAtlas,
  makeGrille,
  makeLitAtlas,
  makeRibs,
  makeSkyDots,
} from './textures';

const TEX = {
  asphalt: '/textures/asphalt/asphalt025c_',
  plaster: '/textures/city/painted_plaster_wall_',
  pavers: '/textures/city/concrete_pavers_03_',
  concrete: '/textures/city/concrete034_',
};
const URLS = [
  `${TEX.asphalt}color.jpg`,
  `${TEX.asphalt}normalgl.jpg`,
  `${TEX.asphalt}roughness.jpg`,
  `${TEX.plaster}diff_1k.jpg`,
  `${TEX.plaster}nor_gl_1k.jpg`,
  `${TEX.plaster}rough_1k.jpg`,
  `${TEX.pavers}diff_1k.jpg`,
  `${TEX.pavers}nor_gl_1k.jpg`,
  `${TEX.pavers}rough_1k.jpg`,
  `${TEX.concrete}color.jpg`,
  `${TEX.concrete}normalgl.jpg`,
  `${TEX.concrete}roughness.jpg`,
];

/** Bucket draw order: opaque first, alpha-tested foliage/grilles after, skyline last. */
const ORDER: Bucket[] = [
  'ground',
  'asphalt',
  'concrete',
  'pavers',
  'plaster',
  'facade',
  'facadeDim',
  'paint',
  'glass',
  'glow',
  'marking',
  'grille',
  'foliage',
  'skyline',
];

/** Buildings, walls and trees cast sun shadows; ground surfaces and buildings receive them. */
const SHADOW_CASTERS = new Set<Bucket>(['concrete', 'plaster', 'facade', 'facadeDim', 'paint', 'grille', 'foliage']);
const SHADOW_RECEIVERS = new Set<Bucket>([
  'ground',
  'asphalt',
  'concrete',
  'pavers',
  'plaster',
  'facade',
  'facadeDim',
  'paint',
  'marking',
]);

/**
 * Scene 02 environment: the main road beyond Scene 01, the city entrance, the junction and the
 * residential street. All static geometry is generated procedurally (seeded, deterministic) and
 * merged per zone chunk and material, so the whole city is a few dozen draw calls. No lights are
 * created here: streetlight heads are registered in refs.cityLamps for the fixed light pool.
 */
export default function City({ quality, refs }: { quality: 'high' | 'medium'; refs: SceneRefs }) {
  const loaded = useTexture(URLS);
  const high = quality === 'high';

  const scene = useMemo(() => {
    // Clone the loaded maps: the asphalt set is shared (via the loader cache) with Scene 01's
    // road, whose repeat must not change. Our geometry carries its UVs in tile units.
    const owned: Texture[] = [];
    const tex = loaded.map((t, i) => {
      const c = t.clone();
      c.wrapS = c.wrapT = RepeatWrapping;
      c.repeat.set(1, 1);
      c.anisotropy = high ? 8 : 4;
      if (i % 3 === 0) c.colorSpace = SRGBColorSpace;
      c.needsUpdate = true;
      owned.push(c);
      return c;
    });
    const [aC, aN, aR, plC, plN, plR, pvC, pvN, pvR, coC, coN, coR] = tex;
    const glassAtlas = makeGlassAtlas();
    const litAtlas = makeLitAtlas();
    const grille = makeGrille();
    const foliage = makeFoliage();
    const ribs = makeRibs();
    const facade = makeFacade(0.12, 9);
    const dots = makeSkyDots(0.06, 13);
    owned.push(glassAtlas, litAtlas, grille, foliage, ribs, facade.map, facade.emissive, dots);

    const surface = (map: Texture, normal: Texture, rough: Texture, scale: number, extra = {}) =>
      new MeshStandardMaterial({
        vertexColors: true,
        map,
        roughnessMap: rough,
        roughness: 1,
        normalMap: high ? normal : null,
        normalScale: new Vector2(scale, scale),
        ...extra,
      });

    // Sunrise uniforms (driven by the SunDirector via refs.day.skyline). Defaults of 1 keep the
    // Scene 01 output: uDots scales the window dots, uTint lifts the silhouette as the sky brightens.
    const skyline = {
      uDots: { value: 1 } as IUniform<number>,
      uTint: { value: 1 } as IUniform<number>,
    };
    const skylineMat = new MeshBasicMaterial({ vertexColors: true, map: dots });
    skylineMat.onBeforeCompile = (shader) => {
      shader.uniforms.uDots = skyline.uDots;
      shader.uniforms.uTint = skyline.uTint;
      // Window dots are added on top of the wall colour (not multiplied). The skyline sits far
      // beyond where the scene fog saturates, so it uses a thinner fog that still follows the
      // animated density: invisible in the outer-road haze, emerging as the city air clears.
      shader.fragmentShader = `uniform float uDots;\nuniform float uTint;\n${shader.fragmentShader}`
        .replace(
          '#include <map_fragment>',
          'diffuseColor.rgb = vColor.rgb * uTint + texture2D( map, vMapUv ).rgb * 1.6 * uDots;',
        )
        .replace('#include <color_fragment>', '')
        .replace(
          '#include <fog_fragment>',
          `#if defined( USE_FOG ) && defined( FOG_EXP2 )
            float skyFog = fogDensity * 0.4 * vFogDepth;
            gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, clamp( 1.0 - exp( -skyFog * skyFog ), 0.4, 0.97 ) );
          #else
            #include <fog_fragment>
          #endif`,
        );
    };

    const materials: Record<Bucket, Material> = {
      asphalt: new MeshStandardMaterial({
        vertexColors: true,
        color: '#61656c',
        map: aC,
        normalMap: high ? aN : null,
        normalScale: new Vector2(0.7, 0.7),
        roughnessMap: aR,
        roughness: 0.9,
      }),
      plaster: surface(plC, plN, plR, 0.6),
      concrete: surface(coC, coN, coR, 0.8),
      pavers: surface(pvC, pvN, pvR, 0.8),
      glass: new MeshStandardMaterial({
        vertexColors: true,
        color: '#55647a',
        map: glassAtlas,
        roughness: 0.12,
        metalness: 0.1,
        envMapIntensity: 1.3,
      }),
      glow: new MeshBasicMaterial({ vertexColors: true, map: litAtlas }),
      paint: new MeshStandardMaterial({
        vertexColors: true,
        map: ribs,
        roughness: 0.62,
        metalness: 0.25,
      }),
      marking: new MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.6,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2,
      }),
      grille: new MeshStandardMaterial({
        vertexColors: true,
        map: grille,
        alphaTest: 0.5,
        side: DoubleSide,
        roughness: 0.55,
        metalness: 0.35,
      }),
      foliage: new MeshStandardMaterial({
        vertexColors: true,
        map: foliage,
        alphaTest: 0.45,
        side: DoubleSide,
        roughness: 0.92,
      }),
      facade: new MeshStandardMaterial({
        vertexColors: true,
        map: facade.map,
        emissiveMap: facade.emissive,
        emissive: '#ffffff',
        emissiveIntensity: 0.75,
        roughness: 0.92,
      }),
      facadeDim: new MeshStandardMaterial({
        vertexColors: true,
        map: facade.map,
        emissiveMap: facade.emissive,
        emissive: '#ffffff',
        emissiveIntensity: 0.25,
        roughness: 0.92,
      }),
      skyline: skylineMat,
      ground: new MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    };
    const wireMat = new LineBasicMaterial({ color: '#0e1114' });

    const layout = buildCity(quality);
    const objects: Object3D[] = [];
    const geometries: BufferGeometry[] = [];
    for (const chunk of layout.chunks) {
      for (const bucket of ORDER) {
        const builder = chunk.builders.get(bucket);
        const geometry = builder?.build();
        if (!geometry) continue;
        geometries.push(geometry);
        const mesh = new Mesh(geometry, materials[bucket]);
        mesh.name = `city:${chunk.name}:${bucket}`;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        if (bucket === 'skyline') mesh.renderOrder = 1;
        // Sun shadows exist only on the high tier (Stage `sunShadows`); flags are fixed at mount.
        if (high) {
          mesh.castShadow = SHADOW_CASTERS.has(bucket);
          mesh.receiveShadow = SHADOW_RECEIVERS.has(bucket);
        }
        objects.push(mesh);
      }
      if (chunk.wires.length) {
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(chunk.wires, 3));
        geometry.computeBoundingSphere();
        geometries.push(geometry);
        const lines = new LineSegments(geometry, wireMat);
        lines.name = `city:${chunk.name}:wires`;
        lines.matrixAutoUpdate = false;
        objects.push(lines);
      }
    }
    // Sunrise registration. City streetlight heads have no emissive material of their own: they
    // are unlit boxes in the shared `glow` bucket with the lit windows, so that MeshBasic material
    // is registered as window glow (colour scaled from white). Bases are captured here, at
    // creation, so they are always today's values regardless of when the city mounts.
    const facadeMats = [materials.facade, materials.facadeDim] as MeshStandardMaterial[];
    const day = {
      windows: facadeMats.map((material) => ({ material, base: material.emissiveIntensity })),
      windowGlow: [materials.glow as MeshBasicMaterial],
      skyline,
    };
    return {
      objects,
      lamps: layout.lamps,
      day,
      dispose() {
        geometries.forEach((g) => g.dispose());
        Object.values(materials).forEach((m) => m.dispose());
        wireMat.dispose();
        owned.forEach((t) => t.dispose());
      },
    };
  }, [loaded, high, quality]);

  useEffect(() => () => scene.dispose(), [scene]);

  useLayoutEffect(() => {
    refs.cityLamps = scene.lamps;
    return () => {
      refs.cityLamps = [];
    };
  }, [refs, scene]);

  useLayoutEffect(() => {
    const day = refs.day;
    const { windows, windowGlow, skyline } = scene.day;
    // Remove by identity, in place (other consumers may hold the arrays); safe under StrictMode.
    const strip = () => {
      for (let i = day.windows.length - 1; i >= 0; i--) {
        if (windows.some((w) => w.material === day.windows[i].material)) day.windows.splice(i, 1);
      }
      for (let i = day.windowGlow.length - 1; i >= 0; i--) {
        if (windowGlow.includes(day.windowGlow[i])) day.windowGlow.splice(i, 1);
      }
      if (day.skyline === skyline) day.skyline = null;
    };
    strip();
    day.windows.push(...windows);
    day.windowGlow.push(...windowGlow);
    day.skyline = skyline;
    return strip;
  }, [refs, scene]);

  return (
    <group name="city">
      {scene.objects.map((object) => (
        <primitive key={object.name} object={object} />
      ))}
    </group>
  );
}
