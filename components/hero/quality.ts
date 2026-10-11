export type Quality = 'high' | 'medium' | 'poster';

type NavigatorHints = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

/**
 * Client-only render tier. `?quality=high|medium|poster` overrides detection for QA.
 * - poster: no WebGL2, Save-Data, or a software rasteriser → no 3D chunk is downloaded.
 * - medium: touch devices and low-memory / low-core machines → no post-processing, lower DPR.
 */
export function detectQuality(): Quality {
  const forced = new URLSearchParams(window.location.search).get('quality');
  if (forced === 'high' || forced === 'medium' || forced === 'poster')
    return forced;

  const nav = navigator as NavigatorHints;
  if (nav.connection?.saveData) return 'poster';

  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return 'poster';
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = info
    ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
    : '';
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  if (/swiftshader|llvmpipe|software|basic render/i.test(renderer))
    return 'poster';

  const touch = window.matchMedia('(pointer: coarse)').matches;
  const lowMemory = (nav.deviceMemory ?? 8) <= 4;
  const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4;
  return touch || lowMemory || fewCores ? 'medium' : 'high';
}
