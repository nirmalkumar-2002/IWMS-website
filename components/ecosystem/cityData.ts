/**
 * Scene 04 static city — zone geometry for the pre-rendered city images in public/scene04/.
 * GENERATED from the render tool output (tools/static-city/city.json, v2 artwork); do not edit by
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
      anchor: [18.45, 66.16],
      footprint: [
        [13.75, 71.23],
        [19.01, 65.82],
        [24.28, 71.23],
        [19.01, 76.63],
      ],
      box: [13.75, 62.66, 24.28, 76.71],
    },
    logistics: {
      anchor: [32.34, 67.57],
      footprint: [
        [29.24, 71.23],
        [34.51, 65.82],
        [39.77, 71.23],
        [34.51, 76.63],
      ],
      box: [29.24, 64.99, 39.77, 76.71],
    },
    resources: {
      anchor: [25.39, 41.35],
      footprint: [
        [21.49, 47.38],
        [26.76, 41.97],
        [32.03, 47.38],
        [26.76, 52.78],
      ],
      box: [21.49, 37.75, 32.03, 52.86],
    },
    weighbridge: {
      anchor: [58.71, 63.91],
      footprint: [
        [52.48, 63.28],
        [57.75, 57.87],
        [63.01, 63.28],
        [57.75, 68.68],
      ],
      box: [52.48, 57.95, 63.01, 68.76],
    },
    processing: {
      anchor: [72.81, 41.41],
      footprint: [
        [67.97, 47.38],
        [76.88, 38.23],
        [82.15, 43.64],
        [73.24, 52.78],
      ],
      box: [67.97, 36.84, 82.15, 52.86],
    },
    landfill: {
      anchor: [83.82, 64.48],
      footprint: [
        [75.72, 71.23],
        [88.73, 57.87],
        [94, 63.28],
        [80.99, 76.63],
      ],
      box: [75.72, 57.95, 94, 76.71],
    },
    grievance: {
      anchor: [9.8, 42.21],
      footprint: [
        [6, 47.38],
        [11.27, 41.97],
        [16.54, 47.38],
        [11.27, 52.78],
      ],
      box: [6, 38.79, 16.54, 52.86],
    },
    iccc: {
      anchor: [48.12, 35.43],
      footprint: [
        [44.73, 55.33],
        [50, 49.92],
        [55.27, 55.33],
        [50, 60.73],
      ],
      box: [44.73, 32.94, 55.27, 60.81],
    },
  },
};

/** Phones (<768px): 1:1 composition. */
export const CITY_MOBILE: CityComposition = {
  width: 1080,
  height: 1080,
  nodes: {
    collection: {
      anchor: [11.12, 44.71],
      footprint: [
        [6, 44.65],
        [15.1, 43.49],
        [16.54, 50.85],
        [7.44, 52.02],
      ],
      box: [6, 42.88, 16.54, 52.05],
    },
    logistics: {
      anchor: [25.17, 53.53],
      footprint: [
        [21.51, 53.77],
        [30.61, 52.6],
        [32.05, 59.96],
        [22.95, 61.13],
      ],
      box: [21.51, 51.81, 32.05, 61.17],
    },
    resources: {
      anchor: [35.55, 29.26],
      footprint: [
        [30.65, 30.39],
        [39.75, 29.23],
        [41.19, 36.59],
        [32.09, 37.76],
      ],
      box: [30.65, 27.23, 41.19, 37.8],
    },
    weighbridge: {
      anchor: [55.06, 65.79],
      footprint: [
        [50.4, 61.16],
        [59.5, 60],
        [60.94, 67.36],
        [51.84, 68.53],
      ],
      box: [50.4, 60.04, 60.94, 68.57],
    },
    processing: {
      anchor: [83, 57.19],
      footprint: [
        [77.17, 57.73],
        [92.56, 55.76],
        [94, 63.12],
        [78.61, 65.1],
      ],
      box: [77.17, 54.38, 94, 65.14],
    },
    landfill: {
      anchor: [78.55, 81.51],
      footprint: [
        [68.02, 81.11],
        [90.51, 78.22],
        [91.95, 85.59],
        [69.46, 88.47],
      ],
      box: [68.02, 77.6, 91.95, 88.51],
    },
    grievance: {
      anchor: [20.01, 20.49],
      footprint: [
        [15.15, 21.28],
        [24.25, 20.11],
        [25.69, 27.48],
        [16.59, 28.64],
      ],
      box: [15.15, 18.63, 25.69, 28.68],
    },
    iccc: {
      anchor: [52.02, 42.22],
      footprint: [
        [48.28, 50.34],
        [57.38, 49.17],
        [58.82, 56.53],
        [49.72, 57.7],
      ],
      box: [48.28, 40.43, 58.82, 57.74],
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
