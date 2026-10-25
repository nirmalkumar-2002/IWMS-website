/**
 * Scene 04 static city — zone geometry for the pre-rendered city images in public/scene04/.
 * GENERATED from the render tool output (tools/static-city/v3/city.json, v3 artwork); do not edit by
 * hand — regenerate together with the images. All coordinates are PERCENT of the image (x of its
 * width, y of its height): `anchor` = pin position, `footprint` = ground polygon highlighted on
 * selection, `box` = [left, top, right, bottom] bounding box of the zone (building included).
 */
import type { EcosystemNodeId } from '@/content/ecosystem';

export type CityPoint = readonly [number, number];
export interface CityZone {
  anchor: CityPoint;
  footprint: readonly CityPoint[];
  box: readonly [number, number, number, number];
}
export interface CityComposition {
  /** Intrinsic size of the image variants (aspect = width / height). */
  width: number;
  height: number;
  nodes: Readonly<Record<EcosystemNodeId, CityZone>>;
}

/** Desktop and tablet (≥768px): 16:9. */
export const CITY_DESKTOP: CityComposition = {
  width: 1920,
  height: 1080,
  nodes: {
    collection: {
      anchor: [17.82, 66.51],
      footprint: [
        [13.75, 71.13],
        [19.01, 65.72],
        [24.28, 71.13],
        [19.01, 76.54],
      ],
      box: [13.75, 62.46, 24.28, 76.62],
    },
    logistics: {
      anchor: [32.14, 67.67],
      footprint: [
        [29.24, 71.13],
        [34.51, 65.72],
        [39.77, 71.13],
        [34.51, 76.54],
      ],
      box: [29.24, 64.75, 39.77, 76.62],
    },
    resources: {
      anchor: [24.61, 41.79],
      footprint: [
        [21.49, 47.28],
        [26.76, 41.87],
        [32.03, 47.28],
        [26.76, 52.68],
      ],
      box: [21.49, 38.99, 32.03, 52.76],
    },
    weighbridge: {
      anchor: [59.37, 63.26],
      footprint: [
        [52.48, 63.18],
        [57.75, 57.77],
        [63.01, 63.18],
        [57.75, 68.58],
      ],
      box: [52.48, 57.85, 63.01, 68.66],
    },
    processing: {
      anchor: [72.81, 41.31],
      footprint: [
        [67.97, 47.28],
        [76.88, 38.13],
        [82.15, 43.54],
        [73.24, 52.68],
      ],
      box: [67.97, 36.74, 82.15, 52.76],
    },
    landfill: {
      anchor: [83.82, 64.38],
      footprint: [
        [75.72, 71.13],
        [88.73, 57.77],
        [94, 63.18],
        [80.99, 76.54],
      ],
      box: [75.72, 57.85, 94, 76.62],
    },
    grievance: {
      anchor: [9.7, 41.95],
      footprint: [
        [6, 47.28],
        [11.27, 41.87],
        [16.54, 47.28],
        [11.27, 52.68],
      ],
      box: [6, 38.63, 16.54, 52.76],
    },
    iccc: {
      anchor: [48.12, 35.33],
      footprint: [
        [44.73, 55.23],
        [50, 49.82],
        [55.27, 55.23],
        [50, 60.63],
      ],
      box: [44.73, 32.85, 55.27, 60.71],
    },
  },
};

/** Phones (<768px): 1:1 composition. */
export const CITY_MOBILE: CityComposition = {
  width: 1080,
  height: 1080,
  nodes: {
    collection: {
      anchor: [10.17, 44.78],
      footprint: [
        [6, 44.73],
        [15.1, 43.57],
        [16.54, 50.93],
        [7.44, 52.1],
      ],
      box: [6, 42.82, 16.54, 52.14],
    },
    logistics: {
      anchor: [24.83, 53.65],
      footprint: [
        [21.51, 53.85],
        [30.61, 52.68],
        [32.05, 60.05],
        [22.95, 61.21],
      ],
      box: [21.51, 51.85, 32.05, 61.25],
    },
    resources: {
      anchor: [34.35, 29.33],
      footprint: [
        [30.65, 30.48],
        [39.75, 29.31],
        [41.19, 36.67],
        [32.09, 37.84],
      ],
      box: [30.65, 27.58, 41.19, 37.88],
    },
    weighbridge: {
      anchor: [56.11, 65.82],
      footprint: [
        [50.4, 61.25],
        [59.5, 60.08],
        [60.94, 67.44],
        [51.84, 68.61],
      ],
      box: [50.4, 60.12, 60.94, 68.65],
    },
    processing: {
      anchor: [83, 57.28],
      footprint: [
        [77.17, 57.82],
        [92.56, 55.84],
        [94, 63.21],
        [78.61, 65.18],
      ],
      box: [77.17, 54.47, 94, 65.22],
    },
    landfill: {
      anchor: [78.55, 81.59],
      footprint: [
        [68.02, 81.19],
        [90.51, 78.31],
        [91.95, 85.67],
        [69.46, 88.55],
      ],
      box: [68.02, 77.68, 91.95, 88.59],
    },
    grievance: {
      anchor: [19.99, 20.41],
      footprint: [
        [15.15, 21.36],
        [24.25, 20.2],
        [25.69, 27.56],
        [16.59, 28.73],
      ],
      box: [15.15, 18.69, 25.69, 28.76],
    },
    iccc: {
      anchor: [52.02, 42.3],
      footprint: [
        [48.28, 50.42],
        [57.38, 49.25],
        [58.82, 56.61],
        [49.72, 57.78],
      ],
      box: [48.28, 40.51, 58.82, 57.82],
    },
  },
};

/** Image variants (public/scene04/). */
export const CITY_IMAGES = {
  desktop: {
    webp: [1280, 1920, 2560].map((w) => ({
      src: `/scene04/city-desktop-${w}.webp`,
      w,
    })),
    jpg: '/scene04/city-desktop-1920.jpg',
  },
  mobile: {
    webp: [720, 1080].map((w) => ({
      src: `/scene04/city-mobile-${w}.webp`,
      w,
    })),
    jpg: '/scene04/city-mobile-1080.jpg',
  },
} as const;
