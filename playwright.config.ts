import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'chromium-gpu',
      grepInvert: /@software/,
      use: {
        launchOptions: {
          // Real GPU path for WebGL in headless Chromium on Windows (ANGLE/D3D11).
          args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
        },
      },
    },
    {
      // Default headless environment: software WebGL → poster tier.
      name: 'chromium-software',
      grep: /@software/,
      use: {
        launchOptions: {
          args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
        },
      },
    },
  ],
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
});
