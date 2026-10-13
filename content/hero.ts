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
   * Phase 3.1–3.2 copy (household collection & QR verification). PROPOSED — not yet approved.
   * The monitor's operational values are illustrative demo data and are labelled as such.
   */
  collect: {
    eyebrow: 'Smart collection',
    title: 'Every household collection, verified.',
    point: 'Collection point',
    /** Field app on the collector's phone (no person is shown, only the device). */
    phone: {
      app: 'IWMS Collect',
      align: 'Align the bin QR in the frame',
      scanning: 'Scanning bin QR…',
      verified: 'Bin QR verified',
      wet: 'Wet waste',
    },
    monitor: {
      title: 'IWMS · Collection monitor',
      demo: 'Illustrative demo data',
      vehicle: 'Vehicle',
      moving: 'km/h',
      stopped: 'Stationary',
      route: 'Route',
      served: 'Households served',
      next: 'Next point',
      household: 'Household',
      /** Three distinct states: GPS arrival is never verification; verification is not completion. */
      states: {
        arrived: 'Vehicle at household (GPS)',
        awaiting: 'Awaiting scan',
        verify: 'Bin QR verification',
        verified: 'Bin QR verified',
        completed: 'Collection completed',
        pending: 'Pending',
      },
    },
  },
} as const;
