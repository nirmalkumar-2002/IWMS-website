/** Hero copy. `title` and `subtitle` are approved; later scene blocks are marked where proposed. */
export const heroContent = {
  title: 'INTEGRATED WASTE MANAGEMENT SUITE',
  subtitle: 'A unified digital platform for waste management.',
  sceneLabel:
    'Cinematic scene: a green municipal waste collection truck switches on its headlights on a quiet road before dawn, then pulls away.',
  loading: 'Loading scene',
  /** Scene 02 copy. PROPOSED marketing lines — not yet approved; edit freely here. */
  city: {
    title: 'Smart Collection. Connected Cities.',
    subtitle: 'GPS-enabled fleet tracking and optimized collection routes.',
  },
  /**
   * Phase 3.1 copy (smart collection & digital connectivity). PROPOSED — not yet approved.
   * The overlay's operational values are illustrative demo data and are labelled as such.
   */
  collect: {
    eyebrow: 'Smart collection',
    title: 'Every household on the route, connected.',
    steps: [
      'Physical collection',
      'GPS tracking',
      'Connected collection points',
      'IWMS monitoring',
    ],
    point: { current: 'Collection point', scheduled: 'Scheduled', collected: 'Collected' },
    gps: { label: 'GPS', moving: 'km/h', stopped: 'Stopped at collection point' },
    monitor: {
      title: 'IWMS · Route monitor',
      demo: 'Illustrative demo data',
      vehicle: 'Vehicle',
      vehicleState: 'GPS locked',
      route: 'Route',
      stop: 'Collection point',
      stopState: 'Arrived',
      progress: 'Households served',
      next: 'Next point',
    },
  },
} as const;
