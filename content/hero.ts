/** Hero copy. `title` and `subtitle` are approved; later scene blocks are marked where proposed. */
export const heroContent = {
  title: 'INTEGRATED WASTE MANAGEMENT SUITE',
  subtitle: 'A unified digital platform for waste management.',
  sceneLabel:
    'Cinematic scene: a green municipal waste collection truck switches on its headlights on a quiet road before dawn, then pulls away.',
  loading: 'Loading scene',
  /**
   * Product positioning under the title (Phase 3.3). PROPOSED — not yet approved. Capabilities
   * only, taken from the IWMS brochure (QR verification, GPS tracking, weighbridge integration).
   */
  positioning:
    'QR-verified household collection, GPS fleet tracking and weighbridge integration on one platform.',
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

/**
 * Site header copy (Phase 3.3). Labels only, no claims. `short*` are the visible words kept on
 * narrow screens; each accessible name still contains the visible label.
 */
export const headerContent = {
  brand: 'IWMS',
  brandFull: 'Integrated Waste Management Suite',
  brandBy: 'by Zigma',
  homeLabel: 'IWMS by Zigma, home',
  navLabel: 'Platform',
  skipIntro: 'Skip intro',
  skipIntroLabel: 'Skip intro: go to the IWMS collection monitor',
  explore: 'Explore platform',
  exploreShort: 'Platform',
  /** Before the scroll experience is live (and in still/static modes) Explore opens the brochure. */
  exploreBrochureLabel: 'Explore platform: IWMS brochure (PDF)',
  demo: 'Request demo',
  demoShort: 'Demo',
  /** Used while the contact email is unconfigured and the action falls back to the website. */
  demoWebsiteLabel:
    'Request demo: contact Zigma at www.zigma.in (opens in a new tab)',
} as const;
