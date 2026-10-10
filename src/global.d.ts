// Ambient declarations for raw-text asset imports (used by the parity harness
// to load the untouched oracle source as a string).
declare module '*.js?raw' {
  const content: string;
  export default content;
}

// `window.GitPlayground` debug API contract (see src/app/debugApi.ts and
// design.md app-shell domain, "window.GitPlayground Debug API").
import type { DebugApi } from './app/debugApi';

declare global {
  interface Window {
    GitPlayground?: DebugApi;
  }
}
