// adapter.js
// The Platform Adapter layer. The game core ONLY ever talks to this common
// interface, never to a specific SDK. To ship on a new portal you add one small
// adapter file and select it — the game code never changes.
//
// Common lifecycle the game expects:
//   await adapter.init()           -> set up the SDK (resolves even if none)
//   adapter.loadingStart()/Stop()  -> wrap asset/level loading
//   adapter.gameplayStart()/Stop() -> mark active play (portals pause house ads)
//   await adapter.showRewarded()   -> returns true if the reward should be granted
//   await adapter.showInterstitial() -> commercial break between levels
//   adapter.happyTime()            -> signal a "moment of joy" (level cleared)
//   adapter.onMuteChange(cb)       -> portal asked us to mute/unmute audio

export class PlatformAdapter {
  constructor() {
    this.name = 'base';
    this._muteListeners = [];
    // External payment/links allowed? false on ad portals (CrazyGames/GD/Y8)
    // which forbid external links; true on itch.io/local where we show a tip link.
    this.allowsExternalLinks = false;
  }

  async init() {}
  loadingStart() {}
  loadingStop() {}
  gameplayStart() {}
  gameplayStop() {}
  happyTime() {}
  setContext() {}
  clearContext() {}

  // Default: no ads available, so always grant the reward (good for itch.io/local).
  async showRewarded() { return true; }
  async showInterstitial() {}

  onMuteChange(cb) { this._muteListeners.push(cb); }
  _emitMute(muted) { for (const cb of this._muteListeners) cb(muted); }

  // Helper: dynamically load an external SDK <script>, resolving on load.
  loadScript(src, { async = true } = {}) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-sdk="${src}"]`);
      if (existing) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.async = async;
      s.dataset.sdk = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load SDK: ${src}`));
      document.head.appendChild(s);
    });
  }
}

// Decide which platform we are building/running for.
// Priority: explicit global  >  ?platform= query param  >  'local'.
export function detectPlatformName() {
  if (typeof window !== 'undefined') {
    if (window.ARROW_PUZZLE_PLATFORM) return String(window.ARROW_PUZZLE_PLATFORM);
    const q = new URLSearchParams(window.location.search).get('platform');
    if (q) return q;
  }
  return 'local';
}

// Lazily import + instantiate the adapter for a given platform name.
export async function createAdapter(name = detectPlatformName()) {
  let mod;
  try {
    switch (name) {
      case 'crazygames':      mod = await import('./crazygames.js'); break;
      case 'gamedistribution': mod = await import('./gamedistribution.js'); break;
      case 'y8':              mod = await import('./y8.js'); break;
      case 'playhoop':        mod = await import('./playhoop.js'); break;
      case 'itchio':          mod = await import('./itchio.js'); break;
      default:                mod = await import('./local.js'); break;
    }
  } catch (err) {
    console.warn(`[platform] Failed to load adapter "${name}", falling back to local.`, err);
    mod = await import('./local.js');
  }
  const adapter = new mod.default();
  try {
    await adapter.init();
  } catch (err) {
    console.warn('[platform] Adapter init failed; continuing without SDK.', err);
  }
  return adapter;
}
