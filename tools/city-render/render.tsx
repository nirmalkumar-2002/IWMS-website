/**
 * Offline renderer for the Scene 04 static city v2 (proposal). True isometric orthographic camera,
 * clean vertex-coloured materials (no textures), 8192 PCF soft shadows, N8AO ambient occlusion,
 * SMAA, Neutral tone mapping, 2× supersampling; downsampled and encoded on a 2D canvas.
 * Results land on `window.__outputs` (base64) + `window.__cityJson`, then `window.__renderDone`.
 *
 * Dev: npx vite --port 5180 --strictPort → http://127.0.0.1:5180/tools/city-render/index.html
 * (?ss=1 renders without supersampling, ?only=desktop|mobile renders one composition,
 *  ?crop=x,y,w,h writes a native-resolution debug crop).
 */
import {
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  HalfFloatType,
  HemisphereLight,
  type Material,
  Mesh,
  MeshStandardMaterial,
  NoToneMapping,
  OrthographicCamera,
  PCFSoftShadowMap,
  Plane,
  PMREMGenerator,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BrightnessContrastEffect,
  EffectComposer,
  EffectPass,
  HueSaturationEffect,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
// @ts-expect-error n8ao ships no type declarations (transitive dep of @react-three/postprocessing).
import { N8AOPostPass } from 'n8ao';
import { buildWorld, type Mat, type ZoneId, type ZoneInfo } from './scene';

declare global {
  interface Window {
    __renderDone?: boolean;
    __renderError?: string;
    __outputs?: Record<string, string>;
    __cityJson?: unknown;
    __stats?: Record<string, unknown>;
  }
}

const params = new URLSearchParams(location.search);
const SS = Number(params.get('ss') ?? 2);
const ONLY = params.get('only');
const num = (k: string, d: number) => Number(params.get(k) ?? d);
const log = (m: string) => {
  const el = document.getElementById('log');
  if (el) el.textContent += `${m}\n`;
  console.log(m);
};

/* ------------------------------------------------------------------------------------------ */
/* Camera: true isometric (35.264° elevation, 45° azimuth from the south-west).                */

/** View direction (towards the camera) for an elevation/azimuth pair; azimuth 0 = from the south. */
function viewDir(elevDeg: number, azDeg: number) {
  const e = (elevDeg * Math.PI) / 180;
  const a = (azDeg * Math.PI) / 180;
  return new Vector3(-Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
}

interface Comp {
  name: 'desktop' | 'mobile' | 'mobileB';
  aspect: number;
  width: number;
  elev: number;
  az: number;
  /** Frame-fraction padding (l, r, t, b) for the anchors and for footprints + bodies. */
  anchorPad: [number, number, number, number];
  zonePad: [number, number, number, number];
  refWidth: number;
  outputs: { file: string; width: number; type: 'webp' | 'jpeg'; maxKB: number }[];
}
const COMPS: Comp[] = [
  {
    name: 'desktop',
    aspect: 16 / 9,
    width: 2560,
    elev: num('elev', 35.264),
    az: num('az', 45),
    anchorPad: [0.12, 0.12, 0.17, 0.14],
    zonePad: [0.06, 0.06, 0.06, 0.08],
    refWidth: 1200,
    outputs: [
      { file: 'city-desktop-2560.webp', width: 2560, type: 'webp', maxKB: 520 },
      { file: 'city-desktop-1920.webp', width: 1920, type: 'webp', maxKB: 300 },
      { file: 'city-desktop-1280.webp', width: 1280, type: 'webp', maxKB: 160 },
      { file: 'city-desktop-1920.jpg', width: 1920, type: 'jpeg', maxKB: 420 },
    ],
  },
  {
    name: 'mobile',
    aspect: 1,
    width: 1080,
    // Mobile looks almost due north (steeper) so the wide cluster fills the square frame.
    elev: num('melev', 54),
    az: num('maz', 9),
    anchorPad: [0.1, 0.1, 0.15, 0.13],
    zonePad: [0.06, 0.06, 0.05, 0.08],
    refWidth: 358,
    outputs: [
      { file: 'city-mobile-1080.webp', width: 1080, type: 'webp', maxKB: 240 },
      { file: 'city-mobile-720.webp', width: 720, type: 'webp', maxKB: 120 },
      { file: 'city-mobile-1080.jpg', width: 1080, type: 'jpeg', maxKB: 330 },
    ],
  },
  {
    // Candidate B: 4:5 portrait, same true-isometric camera as desktop, cropped to the operations.
    name: 'mobileB',
    aspect: 0.8,
    width: 1080,
    elev: num('elev', 35.264),
    az: num('az', 45),
    anchorPad: [0.105, 0.105, 0.12, 0.1],
    zonePad: [0.0, 0.0, 0.05, 0.06],
    refWidth: 358,
    outputs: [
      { file: 'city-mobileB-1080.webp', width: 1080, type: 'webp', maxKB: 300 },
      { file: 'city-mobileB-720.webp', width: 720, type: 'webp', maxKB: 140 },
      { file: 'city-mobileB-1080.jpg', width: 1080, type: 'jpeg', maxKB: 420 },
    ],
  },
];

/**
 * Exact orthographic fit (view space is linear): size from the tighter of the anchor band and
 * the zone band, centre on the anchors, then clamp the centre so zones respect their padding.
 */
function fitOrtho(cam: OrthographicCamera, dir: Vector3, aspect: number, anchors: Vector3[], zones: Vector3[], ap: Comp['anchorPad'], zp: Comp['zonePad']) {
  cam.position.copy(dir).multiplyScalar(1500);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  const view = (pts: Vector3[]) => pts.map((p) => p.clone().applyMatrix4(cam.matrixWorldInverse));
  const ext = (vs: Vector3[]) => ({
    x0: Math.min(...vs.map((v) => v.x)),
    x1: Math.max(...vs.map((v) => v.x)),
    y0: Math.min(...vs.map((v) => v.y)),
    y1: Math.max(...vs.map((v) => v.y)),
  });
  const a = ext(view(anchors));
  const z = ext(view(zones));
  // Half width needed by each band (pads are fractions of the full frame).
  const hwA = Math.max((a.x1 - a.x0) / (2 * (1 - ap[0] - ap[1])), ((a.y1 - a.y0) / (2 * (1 - ap[2] - ap[3]))) * aspect);
  const hwZ = Math.max((z.x1 - z.x0) / (2 * (1 - zp[0] - zp[1])), ((z.y1 - z.y0) / (2 * (1 - zp[2] - zp[3]))) * aspect);
  const hw = Math.max(hwA, hwZ);
  const hh = hw / aspect;
  let cx = (a.x0 + a.x1) / 2 - hw * (ap[0] - ap[1]);
  let cy = (a.y0 + a.y1) / 2 - hh * (ap[3] - ap[2]);
  const clamp = (v: number, lo: number, hi: number) => (lo <= hi ? Math.min(hi, Math.max(lo, v)) : (lo + hi) / 2);
  cx = clamp(cx, z.x1 - hw + 2 * hw * zp[1], z.x0 + hw - 2 * hw * zp[0]);
  cy = clamp(cy, z.y1 - hh + 2 * hh * zp[2], z.y0 + hh - 2 * hh * zp[3]);
  cam.left = cx - hw;
  cam.right = cx + hw;
  cam.top = cy + hh;
  cam.bottom = cy - hh;
  cam.near = 100;
  cam.far = 4000;
  cam.updateProjectionMatrix();
  return { hw, cx, cy };
}

/* ------------------------------------------------------------------------------------------ */
/* Materials                                                                                  */

/** Subtle operations screen for the ICCC podium: navy panel, mint/amber data lines, map grid. */
function screenTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#16233a';
  x.fillRect(0, 0, 1024, 256);
  x.strokeStyle = 'rgba(166,220,200,0.35)';
  x.lineWidth = 1;
  for (let i = 0; i < 1024; i += 32) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i, 256);
    x.stroke();
  }
  for (let j = 0; j < 256; j += 32) {
    x.beginPath();
    x.moveTo(0, j);
    x.lineTo(1024, j);
    x.stroke();
  }
  x.lineWidth = 5;
  x.strokeStyle = '#a6dcc8';
  x.beginPath();
  for (let i = 0; i <= 40; i++) x.lineTo(40 + i * 11, 180 - Math.sin(i * 0.5) * 30 - i * 2);
  x.stroke();
  x.fillStyle = '#ffa526';
  for (let i = 0; i < 8; i++) x.fillRect(560 + i * 50, 200 - (30 + ((i * 37) % 90)), 32, 30 + ((i * 37) % 90));
  x.fillStyle = '#a6dcc8';
  for (let i = 0; i < 6; i++) x.fillRect(560, 30 + i * 18, 160 + ((i * 53) % 200), 8);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function materials(): Record<Mat, Material> {
  const std = (o: ConstructorParameters<typeof MeshStandardMaterial>[0]) => new MeshStandardMaterial({ vertexColors: true, ...o });
  return {
    matte: std({ roughness: 0.88, metalness: 0 }),
    ground: std({ roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    glass: std({ roughness: 0.12, metalness: 0.35, envMapIntensity: 1.6 }),
    gloss: std({ roughness: 0.38, metalness: 0.08, envMapIntensity: 0.8 }),
    foliage: std({ roughness: 0.92, side: DoubleSide }),
    water: std({ roughness: 0.05, metalness: 0.25, envMapIntensity: 1.4 }),
    screen: new MeshStandardMaterial({
      map: screenTexture(),
      emissive: new Color('#ffffff'),
      emissiveMap: screenTexture(),
      emissiveIntensity: num('screen', 0.55),
      roughness: 0.3,
    }),
    liner: std({ roughness: 0.4, metalness: 0 }),
    skylight: std({ roughness: 0.25, metalness: 0.1, emissive: new Color('#202628'), side: DoubleSide }),
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Main                                                                                       */

async function main() {
  const t0 = performance.now();
  const world = buildWorld();
  const tBuild = performance.now() - t0;
  const mats = materials();
  const scene = new Scene();
  scene.background = new Color('#0a0f1c');
  let tris = 0;
  for (const k of Object.keys(world.g) as Mat[]) {
    const g = world.g[k].build();
    if (!g) continue;
    tris += g.index!.count / 3;
    const m = new Mesh(g, mats[k]);
    m.castShadow = k !== 'ground' && k !== 'water';
    m.receiveShadow = true;
    scene.add(m);
  }
  log(`world built in ${tBuild.toFixed(0)} ms, ${(tris / 1e6).toFixed(2)} M tris`);

  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(1);
  renderer.toneMapping = NoToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = num('env', 0.12);

  // Soft morning daylight: airy sky fill + warm low sun from the west-north-west (long shadows).
  scene.add(new HemisphereLight('#e6ebf2', '#b8a88e', num('hemi', 1.75)));
  const sun = new DirectionalLight('#ffe2bd', num('sun', 3.0));
  const sunDir = new Vector3(-0.82, num('sunY', 0.62), -0.38).normalize();
  sun.castShadow = true;
  const gl = renderer.getContext();
  const smap = Math.min(8192, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number);
  sun.shadow.mapSize.set(smap, smap);
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.05;
  sun.shadow.radius = num('srad', 3);
  scene.add(sun, sun.target);

  const camera = new OrthographicCamera(-1, 1, 1, -1, 100, 4000);
  const outputs: Record<string, string> = {};
  const json: Record<string, unknown> = {};
  const stats: Record<string, unknown> = { tris, tBuild: Math.round(tBuild), shadowMap: smap, gpu: gpuName(gl) };

  for (const comp of COMPS) {
    if (ONLY && comp.name !== ONLY) continue;
    const tc = performance.now();
    const outW = comp.width;
    const outH = Math.round(outW / comp.aspect);
    const rw = outW * SS;
    const rh = outH * SS;
    renderer.setSize(rw, rh, false);

    const anchors: Vector3[] = [];
    const zonePts: Vector3[] = [];
    for (const z of Object.values(world.zones)) {
      anchors.push(new Vector3(...z.anchor));
      zonePts.push(...zonePoints(z));
    }
    const fit = fitOrtho(camera, viewDir(comp.elev, comp.az), comp.aspect, anchors, zonePts, comp.anchorPad, comp.zonePad);
    stats[`${comp.name}Camera`] = {
      type: 'orthographic',
      elevationDeg: comp.elev,
      azimuthDeg: comp.az,
      viewWidthM: +(fit.hw * 2).toFixed(1),
      pxPerM: +(outW / (fit.hw * 2)).toFixed(2),
    };
    fitShadow(sun, sunDir, camera);

    const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: 0 });
    composer.addPass(new RenderPass(scene, camera));
    const ao = new N8AOPostPass(scene, camera, rw, rh);
    ao.configuration.aoRadius = num('aoR', 2.6);
    ao.configuration.distanceFalloff = 1.0;
    ao.configuration.intensity = num('aoI', 2.2);
    ao.configuration.gammaCorrection = false;
    ao.setQualityMode('Ultra');
    composer.addPass(ao);
    composer.addPass(
      new EffectPass(
        camera,
        new SMAAEffect({ preset: SMAAPreset.ULTRA }),
        new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
        new HueSaturationEffect({ saturation: num('sat', 0.04) }),
        new BrightnessContrastEffect({ brightness: 0, contrast: num('contrast', 0.06) }),
      ),
    );
    composer.setSize(rw, rh, false);
    composer.render();
    await nextFrame();
    composer.render();

    const master = document.createElement('canvas');
    master.width = outW;
    master.height = outH;
    const mctx = master.getContext('2d')!;
    mctx.imageSmoothingEnabled = true;
    mctx.imageSmoothingQuality = 'high';
    mctx.drawImage(canvas, 0, 0, rw, rh, 0, 0, outW, outH);
    edgeFade(mctx, outW, outH);
    composer.dispose();
    stats[`${comp.name}RenderMs`] = Math.round(performance.now() - tc);

    const crop = params.get('crop');
    if (crop) {
      const [cx, cy, cw, ch] = crop.split(',').map((n) => Number(n) / 100);
      const c = document.createElement('canvas');
      c.width = Math.round(outW * cw);
      c.height = Math.round(outH * ch);
      c.getContext('2d')!.drawImage(master, Math.round(outW * cx), Math.round(outH * cy), c.width, c.height, 0, 0, c.width, c.height);
      outputs[`debug-crop-${comp.name}.jpg`] = await toBase64(await toBlob(c, 'jpeg', 0.92));
    }

    for (const o of comp.outputs) {
      const h = Math.round(o.width / comp.aspect);
      const c = document.createElement('canvas');
      c.width = o.width;
      c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(master, 0, 0, outW, outH, 0, 0, o.width, h);
      let q = o.type === 'webp' ? 0.86 : 0.88;
      let blob = await toBlob(c, o.type, q);
      while (blob.size / 1024 > o.maxKB && q > 0.5) {
        q -= 0.03;
        blob = await toBlob(c, o.type, q);
      }
      outputs[o.file] = await toBase64(blob);
      stats[o.file] = { width: o.width, height: h, kb: +(blob.size / 1024).toFixed(1), quality: +q.toFixed(2) };
      log(`${o.file}: ${o.width}x${h} ${(blob.size / 1024).toFixed(0)} KB q=${q.toFixed(2)}`);
    }

    // Percent-coordinate contract for the hotspots.
    const nodes: Record<string, { anchor: [number, number]; footprint: [number, number][]; box: number[] }> = {};
    const pct = (p: Vector3): [number, number] => {
      const v = p.clone().project(camera);
      return [clampPct((v.x * 0.5 + 0.5) * 100), clampPct((0.5 - v.y * 0.5) * 100)];
    };
    for (const [id, z] of Object.entries(world.zones) as [ZoneId, ZoneInfo][]) {
      const [x0, z0, x1, z1] = z.rect;
      const footprint = [
        [x0, z0],
        [x1, z0],
        [x1, z1],
        [x0, z1],
      ].map(([x, zz]) => pct(new Vector3(x, 0.2, zz)));
      const all = zonePoints(z).map(pct);
      const xs = all.map((p) => p[0]);
      const ys = all.map((p) => p[1]);
      nodes[id] = { anchor: pct(new Vector3(...z.anchor)), footprint, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
    }
    json[comp.name] = { aspect: +comp.aspect.toFixed(4), nodes };
    const ids = Object.keys(nodes);
    const pairs: [string, number][] = [];
    for (let a = 0; a < ids.length; a++)
      for (let b = a + 1; b < ids.length; b++) {
        const pa = nodes[ids[a]].anchor;
        const pb = nodes[ids[b]].anchor;
        const dx = ((pa[0] - pb[0]) / 100) * comp.refWidth;
        const dy = ((pa[1] - pb[1]) / 100) * (comp.refWidth / comp.aspect);
        pairs.push([`${ids[a]}-${ids[b]}`, Math.round(Math.hypot(dx, dy))]);
      }
    pairs.sort((p, q) => p[1] - q[1]);
    stats[`${comp.name}Spacing@${comp.refWidth}`] = pairs.slice(0, 4).map((p) => p.join(' '));
    stats[`${comp.name}Anchors`] = Object.fromEntries(ids.map((id) => [id, nodes[id].anchor]));
  }
  stats.totalMs = Math.round(performance.now() - t0);
  window.__outputs = outputs;
  window.__cityJson = json;
  window.__stats = stats;
  window.__renderDone = true;
  log(`done in ${stats.totalMs} ms`);
}

/** Zone footprint corners (ground) + key building body corners (ground and roof). */
function zonePoints(z: ZoneInfo) {
  const [x0, z0, x1, z1] = z.rect;
  const [bx0, bz0, bx1, bz1, h] = z.body;
  const out: Vector3[] = [];
  for (const [x, zz] of [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ])
    out.push(new Vector3(x, 0, zz));
  for (const [x, zz] of [
    [bx0, bz0],
    [bx1, bz0],
    [bx1, bz1],
    [bx0, bz1],
  ])
    out.push(new Vector3(x, 0, zz), new Vector3(x, h, zz));
  return out;
}

function gpuName(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
}

function clampPct(n: number) {
  return Math.round(Math.min(100, Math.max(0, n)) * 100) / 100;
}

/** Orthographic shadow frustum covering the camera's visible ground (plus tall-building margin). */
function fitShadow(sun: DirectionalLight, sunDir: Vector3, cam: OrthographicCamera) {
  const ray = new Raycaster();
  const plane = new Plane(new Vector3(0, 1, 0), 0);
  const hits: Vector3[] = [];
  for (const [x, y] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [0, 0],
  ]) {
    ray.setFromCamera(new Vector2(x, y), cam);
    const p = new Vector3();
    if (ray.ray.intersectPlane(plane, p)) hits.push(p);
  }
  const centre = hits[4];
  sun.target.position.copy(centre);
  sun.position.copy(centre).addScaledVector(sunDir, 800);
  sun.updateMatrixWorld();
  sun.target.updateMatrixWorld();
  const sc = sun.shadow.camera;
  sc.position.copy(sun.position);
  sc.lookAt(centre);
  sc.updateMatrixWorld();
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const h of hits.slice(0, 4))
    for (const y of [0, 70]) {
      const v = h.clone().setY(y).applyMatrix4(sc.matrixWorldInverse);
      x0 = Math.min(x0, v.x);
      x1 = Math.max(x1, v.x);
      y0 = Math.min(y0, v.y);
      y1 = Math.max(y1, v.y);
    }
  sc.left = x0 - 10;
  sc.right = x1 + 10;
  sc.bottom = y0 - 10;
  sc.top = y1 + 10;
  sc.near = 100;
  sc.far = 1800;
  sc.updateProjectionMatrix();
}

/** City dissolves softly into the page navy (#0a0f1c) at the outer edges; no dark frame. */
function edgeFade(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const navy = (a: number) => `rgba(10,15,28,${a})`;
  const band = (vertical: boolean, from: number, to: number, a: number) => {
    const g = vertical ? ctx.createLinearGradient(0, from, 0, to) : ctx.createLinearGradient(from, 0, to, 0);
    g.addColorStop(0, navy(a));
    g.addColorStop(0.35, navy(a * 0.45));
    g.addColorStop(1, navy(0));
    ctx.fillStyle = g;
    if (vertical) ctx.fillRect(0, Math.min(from, to), w, Math.abs(to - from));
    else ctx.fillRect(Math.min(from, to), 0, Math.abs(to - from), h);
  };
  // Late-morning atmosphere: a light cool haze thickening toward the top (far) edge.
  const haze = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  haze.addColorStop(0, `rgba(205,214,226,${num('haze', 0.34)})`);
  haze.addColorStop(1, 'rgba(205,214,226,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h * 0.5);
  const sx = w * 0.07;
  const sy = h * 0.09;
  const a = num('fade', 0.6);
  band(false, 0, sx, a);
  band(false, w, w - sx, a);
  band(true, 0, sy, a);
  band(true, h, h - sy, a);
}

function nextFrame() {
  return new Promise<void>((res) => requestAnimationFrame(() => res()));
}
function toBlob(c: HTMLCanvasElement, type: 'webp' | 'jpeg', q: number) {
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), `image/${type}`, q));
}
function toBase64(b: Blob) {
  return new Promise<string>((res) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1]);
    fr.readAsDataURL(b);
  });
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
  window.__renderError = msg;
  log(`ERROR ${msg}`);
});
