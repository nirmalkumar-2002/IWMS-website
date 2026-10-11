import {
  Bloom,
  EffectComposer,
  Noise,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';

/**
 * Restrained grade: bloom only above HDR 1.0 (lit lenses, streetlight heads), ACES filmic,
 * a soft vignette and fine grain. No chromatic aberration, flares or saturation boost.
 */
export function Effects() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.45} radius={0.62} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.55} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.08} />
      <SMAA />
    </EffectComposer>
  );
}
