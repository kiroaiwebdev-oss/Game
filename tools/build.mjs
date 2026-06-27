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

// Which platform-adapter files each build is allowed to ship. We ALWAYS keep the
// base adapter + the local fallback, plus the one adapter for this platform.
// Shipping the others would leak their external SDK/CDN URLs (cdn.y8.com,
// sdk.crazygames.com, html5.api.gamedistribution.com, ...) into the archive,
// which Yandex/Playhop flags as "Service storage URL detected".
const ALL_ADAPTERS = ['local', 'itchio', 'crazygames', 'gamedistribution', 'y8', 'gamepix', 'playhoop'];
function keepAdaptersFor(platform) {
  const keep = new Set(['local']);
  if (platform !== 'local') keep.add(platform);
  return keep;
}

// Per-platform injected config. Fill in the real IDs before publishing.
const PLATFORMS = {
  local: '',
  itchio: `<script>window.ARROW_PUZZLE_PLATFORM='itchio';</script>`,
  crazygames: `<script>window.ARROW_PUZZLE_PLATFORM='crazygames';</script>`,
  gamedistribution: `<script>window.ARROW_PUZZLE_PLATFORM='gamedistribution';</script>`,
  y8: `<script>window.ARROW_PUZZLE_PLATFORM='y8';window.ARROW_PUZZLE_Y8_APPID='REPLACE_WITH_YOUR_Y8_APP_ID';</script>`,
  gamepix: `<script>window.ARROW_PUZZLE_PLATFORM='gamepix';</script>`,
  playhoop: `<script>window.ARROW_PUZZLE_PLATFORM='playhoop';</script>`,
};

// Per-platform <head> injections — portal SDK loaded directly in the HTML head,
// exactly as each portal recommends.
const HEAD_INJECT = {
  crazygames: '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>',
  // GameDistribution's exact snippet (GD_OPTIONS + SDK loader). onEvent bridges
  // to the game so it can mute/pause during ads.
  gamedistribution: `<script>
  window["GD_OPTIONS"] = {
    "gameId": "66cbecf41bcf40688afef34406236d20",
    "onEvent": function (event) { if (window.__arrowzenGD) window.__arrowzenGD(event); }
  };
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = 'https://html5.api.gamedistribution.com/main.min.js';
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'gamedistribution-jssdk'));
  </script>`,
  // Playhop is powered by Yandex Games. The game archive is uploaded to the
  // Yandex Console, so the SDK MUST be loaded via the RELATIVE path "/sdk.js".
  // Using the absolute s3 URL (sdk.games.s3.yandex.net) triggers the moderation
  // flag "Service storage URL detected". See yandex.com/dev/games sdk-about.
  playhoop: '<script src="/sdk.js"></script>',
  // GamePix HTML5 SDK v3 (global class GamePixSDK).
  gamepix: '<script src="https://integration.gamepix.com/sdk/v3/gamepix.sdk.js"></script>',
};

async function buildOne(platform, injection) {
  const out = join(DIST, platform);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  // Copy source assets.
  await cp(join(ROOT, 'src'), join(out, 'src'), { recursive: true });
  await cp(join(ROOT, 'styles.css'), join(out, 'styles.css'));

  // Prune adapter files this platform must NOT ship (avoids leaking other
  // portals' external SDK/CDN URLs into the archive — Yandex flags these).
  const keep = keepAdaptersFor(platform);
  for (const name of ALL_ADAPTERS) {
    if (!keep.has(name)) {
      await rm(join(out, 'src', 'platform', `${name}.js`), { force: true });
    }
  }

  // The "Support the developer" (Razorpay) link is allowed ONLY on itch.io.
  // Strip the external payment URL from every other build so ad portals
  // (CrazyGames/GD/Y8/Playhop) never even contain it in their files.
  if (platform !== 'itchio') {
    const hudPath = join(out, 'src', 'ui', 'hud.js');
    let hud = await readFile(hudPath, 'utf-8');
    hud = hud.replace(/const SUPPORT_URL = '[^']*';/, "const SUPPORT_URL = '';");
    await writeFile(hudPath, hud);
  }

  // Inject platform selector into index.html right before the module script.
  // Match the script tag with or without a ?v= cache-busting query.
  let html = await readFile(join(ROOT, 'index.html'), 'utf-8');
  const scriptRe = /<script type="module" src="src\/main\.js(?:\?v=\d+)?"><\/script>/;
  const m = html.match(scriptRe);
  if (!m) throw new Error('Could not find the module script tag in index.html');
  const replacement = injection ? `${injection}\n  ${m[0]}` : m[0];
  html = html.replace(scriptRe, replacement);

  // Inject the portal SDK script into <head> so the portal QA detects it.
  const head = HEAD_INJECT[platform];
  if (head) html = html.replace('</head>', `  ${head}\n</head>`);

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
