import { PlaneGeometry, type BufferGeometry } from 'three';
import type { EcosystemNodeId } from '@/content/ecosystem';
import { GeoBuilder, mix, rgb, rng, shade, type RGB } from '@/components/hero/scene/city/builder';

/**
 * Scene 04 miniature IWMS city (M3). Procedural, seeded, built once on mount with the hero's own
 * GeoBuilder. Everything is vertex-coloured and merged into ONE geometry (one draw call); a single
 * transparent plate marks the selected zone. No textures, no shadow maps — contact shading is baked
 * with the builder's `grime` (darkened bottom edges). World units are metres; +Y up.
 *
 * Zone arrangement mirrors the M2 schematic: households south-west, depot and crews west/centre,
 * weighbridge south-centre, processing east, landfill south-east, citizens far west, ICCC north.
 */

export interface Zone {
  x: number;
  z: number;
  w: number;
  d: number;
}
export interface Diorama {
  geometries: BufferGeometry[];
  highlight: BufferGeometry;
  zones: Record<EcosystemNodeId, Zone>;
  anchors: Record<EcosystemNodeId, [number, number, number]>;
  center: [number, number, number];
  radius: number;
  /** Island half extents (x, z) for camera framing. */
  extent: [number, number];
}

const C = {
  slab: rgb('#4a4740'),
  ground: rgb('#77726a'),
  grass: rgb('#62744f'),
  road: rgb('#3e4044'),
  lane: rgb('#55575a'),
  marking: rgb('#9a978c'),
  plaster: ['#e2d8c6', '#d6c8b0', '#cdbda2', '#e6dccb', '#d9cdb8', '#c9bba5'].map((h) => rgb(h)),
  roof: rgb('#a29684'),
  window: rgb('#4f5f72'),
  wall: rgb('#bdb3a2'),
  truck: rgb('#2c7a3f'),
  cab: rgb('#ebe7de'),
  wet: rgb('#2f8a46'),
  dry: rgb('#2466b8'),
  steel: rgb('#5b6168'),
  shed: rgb('#8e99a2'),
  shedRoof: rgb('#6f7a83'),
  compost: rgb('#6e5a44'),
  earth: [rgb('#7c765a'), rgb('#706c50'), rgb('#666447'), rgb('#5c5c40')],
  civic: rgb('#e7e3da'),
  glass: rgb('#5d7286'),
  trunk: rgb('#5a4a3a'),
  leaf: [rgb('#4f6b3f'), rgb('#5a7746'), rgb('#476238')],
  van: rgb('#d9d4c8'),
};

/** Island extent (half sizes) and slab thickness. */
const HX = 80;
const HZ = 52;
const SLAB = 4;

/** Explicit zone centres/footprints (used for the highlight plate and label anchors). */
const ZONES: Record<EcosystemNodeId, Zone & { top: number }> = {
  grievance: { x: -60, z: -8, w: 20, d: 18, top: 15 },
  resources: { x: -38, z: -30, w: 22, d: 16, top: 10 },
  collection: { x: -48, z: 30, w: 34, d: 16, top: 9 },
  logistics: { x: -14, z: -4, w: 26, d: 18, top: 9 },
  iccc: { x: 6, z: -32, w: 26, d: 18, top: 27 },
  weighbridge: { x: 12, z: 28, w: 26, d: 16, top: 9 },
  processing: { x: 42, z: -12, w: 30, d: 22, top: 11 },
  landfill: { x: 58, z: 30, w: 30, d: 22, top: 11 },
};

export function buildDiorama(): Diorama {
  const g = new GeoBuilder();
  const r = rng(4242);

  // Island: slab with a darker bevelled rim, concrete top, a few green patches.
  g.box(-HX, -SLAB, -HZ, HX, -0.6, HZ, C.slab, { grime: 0.35 });
  g.box(-HX + 0.8, -0.6, -HZ + 0.8, HX - 0.8, 0, HZ - 0.8, C.ground);
  for (const [x0, z0, x1, z1] of [
    [-76, -48, -50, -36],
    [24, -48, 44, -36],
    [-8, 6, 2, 18],
    [64, -48, 76, -30],
    [-76, 40, -66, 48],
  ])
    g.box(x0, 0, z0, x1, 0.12, z1, C.grass);

  // Roads: arterial E–W, two N–S streets, residential lane.
  const road = (x0: number, z0: number, x1: number, z1: number, col = C.road) =>
    g.box(x0, 0, z0, x1, 0.06, z1, col);
  road(-HX + 1, 13, HX - 1, 19);
  road(-29, -HZ + 1, -24, HZ - 1);
  road(24, -HZ + 1, 29, 19);
  road(-HX + 1, 21, -29, 24, C.lane);
  for (let x = -74; x < 76; x += 8) g.box(x, 0.06, 15.8, x + 4, 0.08, 16.2, C.marking);

  const building = (
    cx: number,
    cz: number,
    w: number,
    d: number,
    h: number,
    color: RGB,
    floors = Math.max(1, Math.round(h / 3.2)),
  ) => {
    g.box(cx - w / 2, 0, cz - d / 2, cx + w / 2, h, cz + d / 2, color, { grime: 0.28 });
    g.box(cx - w / 2 - 0.2, h, cz - d / 2 - 0.2, cx + w / 2 + 0.2, h + 0.35, cz + d / 2 + 0.2, shade(color, 0.86));
    // Window bands on the two street-facing sides (+Z, −X) for legibility at miniature scale.
    for (let f = 0; f < floors; f++) {
      const y = 1.6 + f * 3.2;
      if (y + 0.9 > h) break;
      g.quad([cx, y, cz + d / 2 + 0.02], [0, 0, 1], [0, 1, 0], w * 0.36, 0.45, C.window);
      g.quad([cx - w / 2 - 0.02, y, cz], [-1, 0, 0], [0, 1, 0], d * 0.34, 0.45, C.window);
    }
  };
  const tree = (x: number, z: number, s = 1) => {
    g.tube([x, 0, z], [x, 1.4 * s, z], 0.18 * s, 0.14 * s, 5, C.trunk, { flat: true });
    g.tube([x, 1.1 * s, z], [x, 4.2 * s, z], 1.5 * s, 0, 7, r.pick(C.leaf), { flat: true });
  };
  const truck = (x: number, z: number, yaw = 0) => {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const at = (lx: number) => [x + c * lx, z + s * lx] as const;
    const [bx, bz] = at(-1.2);
    const [kx, kz] = at(2.3);
    g.obox(bx, 1.55, bz, 2.6, 1.25, 1.15, -yaw, C.truck, { grime: 0.2 });
    g.obox(kx, 1.25, kz, 0.95, 0.95, 1.1, -yaw, C.cab, { grime: 0.2 });
  };
  const bins = (x: number, z: number) => {
    g.box(x - 0.75, 0, z - 0.3, x - 0.15, 1.0, z + 0.3, C.wet);
    g.box(x + 0.15, 0, z - 0.3, x + 0.75, 1.0, z + 0.3, C.dry);
  };

  // 01 Collection & Verification — a lane of houses, compound walls, wet/dry bins at the gates.
  {
    const z = ZONES.collection.z;
    for (let i = 0; i < 5; i++) {
      const x = -64 + i * 7.4;
      const h = 3.4 + (i % 2) * 3;
      building(x, z + 4, 6, 6, h, C.plaster[i % C.plaster.length]);
      g.box(x - 3.4, 0, z - 0.4, x - 1.2, 1.1, z - 0.2, C.wall);
      g.box(x + 1.2, 0, z - 0.4, x + 3.4, 1.1, z - 0.2, C.wall);
      bins(x + 0.1, z - 1.3);
      if (i % 2 === 0) tree(x + 2.6, z + 1.4, 0.8);
    }
  }
  // 02 D2D Logistics — depot yard with an open shed and the collection fleet.
  {
    const { x, z } = ZONES.logistics;
    g.box(x - 12, 0, z - 8, x + 12, 0.1, z + 8, mix(C.ground, C.road, 0.45));
    g.box(x - 11, 0, z - 8, x - 3, 5, z - 3, C.shed, { grime: 0.25 });
    g.box(x - 11.3, 5, z - 8.3, x - 2.7, 5.4, z - 2.7, C.shedRoof);
    truck(x + 1, z - 3, 0);
    truck(x + 1, z + 1.5, 0);
    truck(x + 8, z + 5.5, Math.PI / 2);
    truck(x - 6, 16.4, 0);
  }
  // 03 Resource Management — ward office with crew vans.
  {
    const { x, z } = ZONES.resources;
    building(x - 2, z - 1, 14, 9, 7, C.plaster[3], 2);
    for (let i = 0; i < 3; i++) g.box(x + 6.5 + i * 2.6, 0, z + 4, x + 8.5 + i * 2.6, 1.8, z + 7.5, C.van, { grime: 0.25 });
    tree(x - 9, z + 6, 0.9);
    tree(x + 10, z - 6, 0.9);
  }
  // ICCC Integration — civic building: podium, tower, mast.
  {
    const { x, z } = ZONES.iccc;
    g.box(x - 11, 0, z - 7, x + 11, 5, z + 7, C.civic, { grime: 0.25 });
    g.box(x - 11.3, 5, z - 7.3, x + 11.3, 5.4, z + 7.3, shade(C.civic, 0.88));
    g.box(x - 4, 5.4, z - 4, x + 4, 22, z + 4, C.civic, { grime: 0.15 });
    for (let f = 0; f < 5; f++) {
      const y = 7.5 + f * 3;
      g.quad([x, y, z + 4.02], [0, 0, 1], [0, 1, 0], 3.2, 0.9, C.glass);
      g.quad([x - 4.02, y, z], [-1, 0, 0], [0, 1, 0], 3.2, 0.9, C.glass);
    }
    g.quad([x, 2.6, z + 7.02], [0, 0, 1], [0, 1, 0], 9, 1.2, C.glass);
    g.box(x - 4.3, 22, z - 4.3, x + 4.3, 22.5, z + 4.3, shade(C.civic, 0.85));
    g.tube([x + 2, 22.5, z + 2], [x + 2, 26.5, z + 2], 0.12, 0.06, 5, C.steel);
    for (const tx of [-14, 14]) tree(x + tx, z + 5, 1);
  }
  // 04 Weighbridge Management — transfer station: deck, cabin, canopy, truck on the deck.
  {
    const { x, z } = ZONES.weighbridge;
    g.box(x - 12, 0, z - 7, x + 12, 0.1, z + 7, mix(C.ground, C.road, 0.35));
    g.box(x - 7, 0.1, z - 2.2, x + 7, 0.45, z + 2.2, C.steel, { grime: 0.2 });
    truck(x, z, 0);
    g.box(x + 9, 0, z - 6, x + 12, 3, z - 3, C.plaster[1], { grime: 0.25 });
    for (const px of [-8, 8]) for (const pz of [3.6, 6.4]) g.box(x + px - 0.15, 0, z + pz - 0.15, x + px + 0.15, 5, z + pz + 0.15, C.steel);
    g.box(x - 9, 5, z + 2.8, x + 9, 5.3, z + 7.2, C.shedRoof);
  }
  // 05 Waste Management (Processing) — MRF shed and compost windrows.
  {
    const { x, z } = ZONES.processing;
    g.box(x - 14, 0, z - 10, x + 2, 7, z + 1, C.shed, { grime: 0.25 });
    g.box(x - 14.3, 7, z - 10.3, x + 2.3, 7.4, z + 1.3, C.shedRoof);
    for (let s = 0; s < 4; s++) g.box(x - 12 + s * 4, 7.4, z - 9, x - 10.5 + s * 4, 7.6, z, mix(C.shedRoof, C.civic, 0.5));
    for (let i = 0; i < 5; i++) {
      const wz = z - 8 + i * 4;
      g.obox(x + 8, 0.7, wz, 6, 0.7, 1.1, 0, shade(C.compost, 1 - i * 0.04), { grime: 0.2 });
    }
  }
  // 06 Landfill Management — terraced engineered cell with an access ramp and site cabin.
  {
    const { x, z } = ZONES.landfill;
    const tiers: [number, number][] = [
      [14, 10],
      [11, 7.5],
      [8, 5],
      [5, 3],
    ];
    tiers.forEach(([hw, hd], i) => g.box(x - hw, i * 2, z - hd, x + hw, i * 2 + 2, z + hd, C.earth[i], { grime: 0.15 }));
    g.obox(x - 16, 1.2, z + 2, 4, 0.3, 1.4, 0.35, C.road);
    g.box(x - 18, 0, z - 9, x - 15, 2.6, z - 6, C.plaster[2], { grime: 0.25 });
  }
  // 07 Grievance Redressal Management — citizens: apartment block and a small plaza.
  {
    const { x, z } = ZONES.grievance;
    building(x, z - 2, 10, 8, 12.8, C.plaster[0], 4);
    building(x + 2, z + 7, 8, 5, 6.4, C.plaster[4], 2);
    g.box(x - 9, 0, z + 4, x - 3, 0.15, z + 9, mix(C.ground, C.civic, 0.3));
    tree(x - 6, z + 6.5, 0.9);
  }

  // Filler: seeded low-rise city blocks and street trees, kept off zones and roads.
  const blocked = (x: number, z: number, m: number) =>
    Object.values(ZONES).some((zn) => Math.abs(x - zn.x) < zn.w / 2 + m && Math.abs(z - zn.z) < zn.d / 2 + m) ||
    (z > 11 && z < 25 && x < -27) ||
    (z > 11 && z < 21) ||
    (x > -31 && x < -22) ||
    (x > 22 && x < 31 && z < 21);
  for (let x = -74; x <= 74; x += 9) {
    for (let z = -46; z <= 46; z += 9) {
      const jx = x + r.range(-1.5, 1.5);
      const jz = z + r.range(-1.5, 1.5);
      if (blocked(jx, jz, 4) || r() < 0.25) continue;
      if (r() < 0.3) {
        tree(jx, jz, r.range(0.75, 1.05));
        continue;
      }
      building(jx, jz, r.range(5, 7.5), r.range(5, 7.5), r.pick([3.4, 3.4, 6.4, 6.4, 9.6]), r.pick(C.plaster));
    }
  }
  for (let x = -70; x <= 70; x += 11) {
    if (!blocked(x, 11, 0.5)) tree(x, 11.2, 0.8);
  }

  const zones = {} as Record<EcosystemNodeId, Zone>;
  const anchors = {} as Record<EcosystemNodeId, [number, number, number]>;
  for (const [id, zn] of Object.entries(ZONES) as [EcosystemNodeId, Zone & { top: number }][]) {
    zones[id] = { x: zn.x, z: zn.z, w: zn.w, d: zn.d };
    anchors[id] = [zn.x, zn.top + 2, zn.z];
  }
  const highlight = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  return {
    geometries: [g.build()!],
    highlight,
    zones,
    anchors,
    center: [0, 0, 0],
    radius: Math.hypot(HX, HZ),
    extent: [HX, HZ],
  };
}
