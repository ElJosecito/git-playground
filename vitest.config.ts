import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/engine/**/*.test.ts', 'src/app/**/*.test.ts', 'src/ui/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['src/test/setup.dom.ts'],
          include: ['src/hooks/**/*.test.ts', 'src/components/**/*.test.tsx'],
        },
      },
    ],
  },
});
