import { describe, it, expect } from 'vitest';
import { preloadPlayground, preloadLevelMap, preloadLevel } from '../routes';

// app-routing spec "Route-Level Code Splitting": the sandbox and levels
// bundles MUST be lazily loaded (React.lazy) — this module is the single
// place that owns those `import()` boundaries plus their hover/focus
// preload functions (design.md: "Route loaders live in routes.ts and are
// preloaded on CTA hover/focus.").
describe('routes preload functions', () => {
  it('preloadPlayground() resolves to a module with a default component export', async () => {
    const mod = await preloadPlayground();
    expect(typeof mod.default).toBe('function');
  });

  it('preloadLevelMap() resolves to a module with a default component export', async () => {
    const mod = await preloadLevelMap();
    expect(typeof mod.default).toBe('function');
  });

  it('preloadLevel() resolves to a module with a default component export', async () => {
    const mod = await preloadLevel();
    expect(typeof mod.default).toBe('function');
  });
});
