import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  resolve: { alias: { '@': root } },
  define: {
    // The production truck is a licensed GLB dropped into public/models (see docs/TRUCK_ASSET_SPEC.md).
    __TRUCK_MODEL__: JSON.stringify(
      existsSync(`${root}public/models/garbage-truck.glb`),
    ),
  },
  build: {
    target: 'es2022',
    copyPublicDir: !isSsrBuild,
    chunkSizeWarningLimit: 1400,
  },
}));
