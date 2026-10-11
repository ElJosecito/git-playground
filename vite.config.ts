import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // scripts/check-chunks.mjs reads this to assert the landing/entry chunk
    // excludes PlaygroundShell, LevelShell, and the engine (app-routing spec
    // "Route-Level Code Splitting").
    manifest: true,
  },
});
