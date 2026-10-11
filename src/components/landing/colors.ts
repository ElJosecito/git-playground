// Branch-color accents for the landing page's "commit-log editorial"
// direction (design.md UI: "sections as commits with mono hash and
// branch-color tags" / "PALETA accents"). Landing's EAGER module graph must
// only `import type` from the engine (landing-page spec "Code-Split
// Isolation" + design.md Chunking: "Eager modules use only `import type`
// from the engine") — importing `src/engine/constants.ts`'s `PALETA` value
// here would pull real engine code into the eager bundle. So this is a
// small, hand-copied mirror of those exact hex values, used purely for
// decorative accents that have nothing to do with a live `RepoState`.
export const LANDING_ACCENTS: readonly string[] = ['#60A5FA', '#A78BFA', '#34D399', '#F472B6', '#FB923C', '#22D3EE'];

export function accentFor(index: number): string {
  return LANDING_ACCENTS[index % LANDING_ACCENTS.length]!;
}
