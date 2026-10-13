import { useEffect, useMemo } from 'react';
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BIN, BINS, CURRENT_POINT, binFrontX, type Bin } from './collection';

/**
 * Phase 3.2 household waste bins at the H-12 gate: two ~120 L wheelie bins (wet = green,
 * dry = blue, India's segregation colours) with printed front labels carrying an illustrative,
 * seeded QR-style tag (not an encoded, scannable code). Lightweight: per bin one merged plastic
 * body (body + lid + lip), one merged dark part (wheels, axle, handle) and one label quad.
 * Mounted inside the city group, so CityMount compiles the programs with the city's.
 */

const COLOURS = {
  wet: { body: '#2f8a46', band: '#1f5e30', name: 'WET WASTE', sub: 'Biodegradable' },
  dry: { body: '#2466b8', band: '#174a88', name: 'DRY WASTE', sub: 'Recyclable' },
} as const;

/**
 * Moulded HDPE reads satin, not glossy. The printed label is a matte sticker with a faint
 * self-lit term (its own texture as emissive map) so the QR stays legible on the shaded
 * kerbside; kept low so it never reads as a screen. Both are compiled with the city at load.
 */
const BODY_ROUGHNESS = 0.58;
const LABEL_ROUGHNESS = 0.7;
const LABEL_EMISSIVE = 0.22;

/** Montserrat 600 and Inter 400 are the weights the site ships (see src/main.tsx). */
const LABEL_FONTS = ['600 18px Montserrat', '400 13px Inter'];

export function WasteBins() {
  const parts = useMemo(() => {
    const shell = shellGeometry();
    const dark = darkGeometry();
    const darkMaterial = new MeshStandardMaterial({ color: '#1d2023', roughness: 0.7 });
    const bins = BINS.map((bin) => {
      const canvas = document.createElement('canvas');
      drawLabel(canvas, bin);
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
      return {
        bin,
        canvas,
        body: new MeshStandardMaterial({ color: COLOURS[bin.kind].body, roughness: BODY_ROUGHNESS }),
        label: new MeshStandardMaterial({
          map: texture,
          roughness: LABEL_ROUGHNESS,
          emissive: '#ffffff',
          emissiveMap: texture,
          emissiveIntensity: LABEL_EMISSIVE,
        }),
      };
    });
    const labelGeometry = new PlaneGeometry(BIN.label.width, BIN.label.height);
    return { shell, dark, darkMaterial, bins, labelGeometry };
  }, []);

  // Redraw the labels once the site fonts are ready, so a fallback face is never baked in.
  useEffect(() => {
    let live = true;
    Promise.all(LABEL_FONTS.map((f) => document.fonts.load(f)))
      .then(() => {
        if (!live) return;
        for (const b of parts.bins) {
          drawLabel(b.canvas, b.bin);
          if (b.label.map) b.label.map.needsUpdate = true;
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [parts]);

  useEffect(
    () => () => {
      parts.shell.dispose();
      parts.dark.dispose();
      parts.labelGeometry.dispose();
      parts.darkMaterial.dispose();
      for (const b of parts.bins) {
        b.label.map?.dispose();
        b.label.dispose();
        b.body.dispose();
      }
    },
    [parts],
  );

  // The front face leans outward by the taper; the label follows it.
  const lean = Math.atan(((BIN.depth / 2) * (BIN.taper - 1)) / BIN.bodyH);
  return (
    <group>
      {parts.bins.map(({ bin, body, label }) => (
        <group key={bin.id} position={[bin.x, BIN.baseY, bin.z]}>
          <mesh geometry={parts.shell} material={body} castShadow receiveShadow />
          <mesh geometry={parts.dark} material={parts.darkMaterial} castShadow />
          <group
            position={[binFrontX(bin, BIN.label.y) - bin.x - 0.006, BIN.label.y, 0]}
            rotation={[0, 0, lean]}
          >
            <mesh geometry={parts.labelGeometry} material={label} rotation={[0, -Math.PI / 2, 0]} />
          </group>
        </group>
      ))}
    </group>
  );
}

/** Body (square frustum, flat-shaded), overhanging lid and the lid's front lip, in bin-local metres. */
function shellGeometry() {
  const { depth, width, bodyY0, bodyH, taper, lidH } = BIN;
  const body = new CylinderGeometry(taper / Math.SQRT2, 1 / Math.SQRT2, 1, 4, 1)
    .rotateY(Math.PI / 4)
    .toNonIndexed();
  body.computeVertexNormals();
  body.scale(depth, bodyH, width).translate(0, bodyY0 + bodyH / 2, 0);
  const top = bodyY0 + bodyH;
  const lid = new BoxGeometry(depth * taper + 0.04, lidH, width * taper + 0.02)
    .toNonIndexed()
    .translate(-0.01, top + lidH / 2, 0);
  const lip = new BoxGeometry(0.03, 0.035, width * 0.62)
    .toNonIndexed()
    .translate(-(depth * taper) / 2 - 0.025, top - 0.005, 0);
  return merge([body, lid, lip]);
}

/** Wheels, axle and the back handle bar (dark rubber/plastic), in bin-local metres. */
function darkGeometry() {
  const { depth, width, bodyY0, bodyH, taper } = BIN;
  const back = depth / 2;
  const r = 0.1;
  const wheel = (z: number) =>
    new CylinderGeometry(r, r, 0.05, 18).rotateX(Math.PI / 2).toNonIndexed().translate(back - 0.05, r, z);
  const axle = new CylinderGeometry(0.012, 0.012, width + 0.08, 8)
    .rotateX(Math.PI / 2)
    .toNonIndexed()
    .translate(back - 0.05, r, 0);
  const handle = new CylinderGeometry(0.016, 0.016, width * 0.8, 10)
    .rotateX(Math.PI / 2)
    .toNonIndexed()
    .translate((depth * taper) / 2 + 0.035, bodyY0 + bodyH - 0.05, 0);
  // Two small front pads (a wide block would read as the bin standing on a black plinth).
  const foot = (z: number) =>
    new BoxGeometry(0.06, bodyY0, 0.06).toNonIndexed().translate(-back + 0.06, bodyY0 / 2, z);
  // Wheels sit just outside the body sides, as on a real wheelie bin.
  return merge([
    wheel(width / 2 + 0.03),
    wheel(-width / 2 - 0.03),
    axle,
    handle,
    foot(width / 2 - 0.07),
    foot(-width / 2 + 0.07),
  ]);
}

function merge(parts: BufferGeometry[]) {
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return merged!;
}

/** 300 × 400 px label: colour band with the stream name, QR tag (220 px square, centred), ids. */
function drawLabel(canvas: HTMLCanvasElement, bin: Bin) {
  const W = 300;
  const H = 400;
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  const c = COLOURS[bin.kind];
  g.fillStyle = '#f4f3ee';
  g.fillRect(0, 0, W, H);
  g.fillStyle = c.band;
  g.fillRect(0, 0, W, 72);
  g.fillStyle = '#f4f3ee';
  g.textBaseline = 'middle';
  g.font = '600 26px Montserrat, "Segoe UI", sans-serif';
  g.fillText(c.name, 18, 30);
  g.font = '400 14px Inter, "Segoe UI", sans-serif';
  g.fillText(c.sub, 18, 56);
  g.textAlign = 'right';
  g.font = '600 15px Montserrat, "Segoe UI", sans-serif';
  g.fillText('IWMS', W - 18, 30);

  // 25 × 25 module grid with three finder patterns; the square spans y 90–310 (QR_TAG centre).
  const n = 25;
  const size = 220;
  const m = size / n;
  const ox = (W - size) / 2;
  const oy = 90;
  let seed = bin.kind === 'wet' ? 0x2f6e2b1 : 0x51c3a07;
  const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const finder = (cx: number, cy: number) =>
    cx >= 0 && cx < 7 && cy >= 0 && cy < 7
      ? !(cx >= 1 && cx <= 5 && cy >= 1 && cy <= 5) || (cx >= 2 && cx <= 4 && cy >= 2 && cy <= 4)
      : null;
  g.fillStyle = '#121418';
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const f = finder(x, y) ?? finder(n - 1 - x, y) ?? finder(x, n - 1 - y);
      const quiet = (x <= 7 && y <= 7) || (x >= n - 8 && y <= 7) || (x <= 7 && y >= n - 8);
      const on = f ?? (!quiet && rand() < 0.48);
      if (on) g.fillRect(ox + x * m, oy + y * m, Math.ceil(m), Math.ceil(m));
    }

  g.textAlign = 'center';
  g.fillStyle = '#2f3439';
  g.font = '600 17px Montserrat, "Segoe UI", sans-serif';
  g.fillText(bin.id, W / 2, H - 52);
  g.fillStyle = '#6c7178';
  g.font = '400 13px Inter, "Segoe UI", sans-serif';
  g.fillText(`Household ${CURRENT_POINT.id} · IWMS tagged bin`, W / 2, H - 26);
}
