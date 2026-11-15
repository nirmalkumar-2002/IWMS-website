export type Quality = 'high' | 'medium' | 'poster';

type NavigatorHints = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

/**
 * Client-only render tier. `?quality=high|medium|poster` overrides detection for QA.
 * - poster: no WebGL2, Save-Data, or a software rasteriser → no 3D chunk is downloaded.
 * - medium: touch devices, low-memory / low-core machines and Intel integrated GPUs → no
 *   post-processing, lower DPR.
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
  // Intel integrated graphics (not Arc) can't hold the high tier's post-processing in budget:
  // measured ~19–26 ms GPU per frame at 1440×900 on an Intel UHD (0x4628) vs ~9–10 ms on medium.
  // Over budget, ANGLE/D3D11 queues frames until the GPU process blocks for 0.3–3 s.
  const integrated = /\bintel\b/i.test(renderer) && !/\barc\b/i.test(renderer);
  return touch || lowMemory || fewCores || integrated ? 'medium' : 'high';
}
