#!/usr/bin/env node
// app-routing spec "Route-Level Code Splitting" / landing-page spec
// "Code-Split Isolation": the built entry chunk MUST NOT statically pull in
// `PlaygroundShell`, `LevelShell`, or the engine (design.md: "scripts/
// check-chunks.mjs reads the vite manifest and asserts the entry excludes
// PlaygroundShell, LevelShell and the engine."). Run after `vite build`
// (which must have `build.manifest: true`).
//
// The manifest's chunk graph (`imports`/`dynamicImports`) only tells us
// which SEPARATE chunk files exist and how they reference each other — if
// a route were (incorrectly) imported eagerly, Vite wouldn't create a
// separate chunk for it at all, it would just inline everything into the
// entry chunk with no manifest trace of what got inlined. So this check
// combines the manifest graph (to find exactly which built FILES are
// reachable from the entry WITHOUT crossing a `dynamicImports` boundary)
// with a content scan of those files for markers that only exist in
// engine/PlaygroundShell/LevelShell source (object-property names and UI
// strings survive minification; local identifiers don't, so markers are
// picked accordingly).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DIST_DIR = resolve(process.cwd(), 'dist');
const MANIFEST_PATH = join(DIST_DIR, '.vite/manifest.json');

// Object-property names (GitEngine facade / hosting API — never mangled,
// since external call sites access them by string key) and UI strings
// unique to the sandbox shell. Any one of these appearing in a file
// statically reachable from the entry means that file bundled in
// PlaygroundShell/LevelShell/the engine.
const BANNED_CONTENT_MARKERS = ['companero', 'mergePullRequest', 'createPullRequest', 'Reiniciar repositorio'];

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`check:chunks — could not find ${MANIFEST_PATH}. Did you run "vite build" with build.manifest:true first?`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

/** BFS over each chunk's STATIC `imports` only (never `dynamicImports`,
 * which are exactly the lazy-loaded route boundaries this check exists to
 * protect) starting from every `isEntry: true` chunk. Returns the set of
 * manifest keys reachable without crossing a dynamic-import boundary. */
function staticallyReachableFromEntry(manifest) {
  const visited = new Set();
  const queue = Object.keys(manifest).filter((key) => manifest[key].isEntry);
  if (queue.length === 0) {
    console.error('check:chunks — no isEntry chunk found in the manifest.');
    process.exit(1);
  }
  while (queue.length > 0) {
    const key = queue.shift();
    if (visited.has(key)) continue;
    visited.add(key);
    for (const dep of manifest[key]?.imports ?? []) {
      if (!visited.has(dep)) queue.push(dep);
    }
  }
  return visited;
}

function filesOf(manifest, keys) {
  const files = new Set();
  for (const key of keys) {
    const chunk = manifest[key];
    if (chunk?.file) files.add(chunk.file);
    for (const css of chunk?.css ?? []) files.add(css);
  }
  return files;
}

function findViolations(files) {
  const violations = [];
  for (const file of files) {
    const path = join(DIST_DIR, file);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8');
    for (const marker of BANNED_CONTENT_MARKERS) {
      if (content.includes(marker)) {
        violations.push({ file, marker });
      }
    }
  }
  return violations;
}

const manifest = loadManifest();
const reachableKeys = staticallyReachableFromEntry(manifest);
const reachableFiles = filesOf(manifest, reachableKeys);
const violations = findViolations(reachableFiles);

if (violations.length > 0) {
  console.error('check:chunks — the entry chunk statically includes code it must only lazy-load:');
  for (const v of violations) {
    console.error(`  - ${v.file} contains "${v.marker}"`);
  }
  process.exit(1);
}

console.log(`check:chunks — OK. Entry chunk graph (${reachableFiles.size} file(s)) excludes PlaygroundShell, LevelShell, and the engine.`);
