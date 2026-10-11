import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const has = (file: string) => existsSync(`${root}public/media/${file}`);
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  resolve: { alias: { '@': root } },
  define: {
    __HERO_MEDIA__: JSON.stringify({
      poster: has('hero-poster.avif'),
      webm: has('hero-loop.webm'),
      mp4: has('hero-loop.mp4'),
    }),
  },
  build: { target: 'es2022', copyPublicDir: !isSsrBuild },
}));
