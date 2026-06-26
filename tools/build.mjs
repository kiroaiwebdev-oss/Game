// build.mjs — produces a self-contained, ready-to-zip build per platform.
// Usage:
//   node tools/build.mjs            -> builds ALL platforms into dist/<platform>/
//   node tools/build.mjs crazygames -> builds just one
//
// Each build copies index.html, styles.css and src/ verbatim and injects the
// correct platform selector into index.html (so no ?platform= is needed).
// The output folders are fully self-contained (no external deps) and can be
// zipped and uploaded directly to each portal.

import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = normalize(join(fileURLToPath(import.meta.url), '..', '..'));
const DIST = join(ROOT, 'dist');

// Per-platform injected config. Fill in the real IDs before publishing.
const PLATFORMS = {
  local: '',
  itchio: `<script>window.ARROW_PUZZLE_PLATFORM='itchio';</script>`,
  crazygames: `<script>window.ARROW_PUZZLE_PLATFORM='crazygames';</script>`,
  gamedistribution: `<script>window.ARROW_PUZZLE_PLATFORM='gamedistribution';window.ARROW_PUZZLE_GD_ID='REPLACE_WITH_YOUR_GD_GAME_ID';</script>`,
  y8: `<script>window.ARROW_PUZZLE_PLATFORM='y8';window.ARROW_PUZZLE_Y8_APPID='REPLACE_WITH_YOUR_Y8_APP_ID';</script>`,
  playhoop: `<script>window.ARROW_PUZZLE_PLATFORM='playhoop';</script>`,
};

async function buildOne(platform, injection) {
  const out = join(DIST, platform);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  // Copy source assets.
  await cp(join(ROOT, 'src'), join(out, 'src'), { recursive: true });
  await cp(join(ROOT, 'styles.css'), join(out, 'styles.css'));

  // Inject platform selector into index.html right before the module script.
  let html = await readFile(join(ROOT, 'index.html'), 'utf-8');
  const marker = '<script type="module" src="src/main.js"></script>';
  html = html.replace(marker, `${injection ? injection + '\n  ' : ''}${marker}`);
  await writeFile(join(out, 'index.html'), html);

  console.log(`built dist/${platform}/`);
}

async function main() {
  const only = process.argv[2];
  const entries = only ? [[only, PLATFORMS[only]]] : Object.entries(PLATFORMS);
  for (const [platform, injection] of entries) {
    if (injection === undefined) { console.error(`Unknown platform: ${platform}`); continue; }
    await buildOne(platform, injection);
  }
  console.log('\nDone. Each dist/<platform>/ folder is self-contained — zip and upload.');
}

main();
