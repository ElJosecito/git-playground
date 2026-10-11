import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs: routing is hash-based, so the same build works at a
  // domain root or under a sub-path such as GitHub Pages' /git-playground/.
  base: './',
  build: {
    // scripts/check-chunks.mjs reads this to assert the landing/entry chunk
    // excludes PlaygroundShell, LevelShell, and the engine (app-routing spec
    // "Route-Level Code Splitting").
    manifest: true,
  },
});
