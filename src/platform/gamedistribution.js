// gamedistribution.js
// GameDistribution adapter. The GD SDK (GD_OPTIONS + main.min.js) is injected
// directly in <head> by the build (exactly as GD recommends), so here we only:
//   - bridge GD_OPTIONS.onEvent (via window.__arrowzenGD) to mute during ads
//   - call window.gdsdk.showAd() for interstitial (pre-roll / mid-roll)
//   - call rewarded ads for hint/continue
// In dev/preview (no <head> snippet) we set GD_OPTIONS + load the SDK ourselves.

import { PlatformAdapter } from './adapter.js';

const SDK_URL = 'https://html5.api.gamedistribution.com/main.min.js';
const GD_GAME_ID = '66cbecf41bcf40688afef34406236d20';

export default class GameDistributionAdapter extends PlatformAdapter {
  constructor() {
    super();
    this.name = 'gamedistribution';
    this.hasAds = true;
  }

  async init() {
    // Bridge the <head> GD_OPTIONS.onEvent to mute/pause the game during ads.
    window.__arrowzenGD = (event) => {
      switch (event && event.name) {
        case 'SDK_GAME_PAUSE': this._emitMute(true); break;   // mute during ad
        case 'SDK_GAME_START': this._emitMute(false); break;  // resume after ad
        default: break;
      }
    };
    // Fallback when the <head> snippet isn't present (e.g. ?platform=gamedistribution in dev).
    if (!window.GD_OPTIONS) {
      window.GD_OPTIONS = {
        gameId: window.ARROW_PUZZLE_GD_ID || GD_GAME_ID,
        onEvent: window.__arrowzenGD,
      };
      try { await this.loadScript(SDK_URL); } catch (_) {}
    }
  }

  gameplayStart() {} // GD auto-detects gameplay
  gameplayStop() {}
  happyTime() {}

  // Wait until the GD SDK instance is actually ready (it loads asynchronously),
  // so the ad call isn't skipped just because Play was clicked early.
  async _waitForSdk(timeoutMs = 4000) {
    const start = Date.now();
    while (!(window.gdsdk && typeof window.gdsdk.showAd === 'function')) {
      if (Date.now() - start > timeoutMs) return false;
      await new Promise((r) => setTimeout(r, 120));
    }
    return true;
  }

  // Interstitial (pre-roll on Play, mid-roll on Next) — gdsdk.showAd().
  async showInterstitial() {
    const ok = await this._waitForSdk();
    if (!ok) return;
    try { await window.gdsdk.showAd(); } catch (_) {}
  }

  // Rewarded (hint / continue). GD rewarded ads must be preloaded with the
  // rewarded type, then shown. Grants on completion or error so it stays usable.
  async showRewarded() {
    const ok = await this._waitForSdk();
    if (!ok) return true;
    const REWARDED = window['GD_SDK_REWARDED_ADVERTISEMENT'];
    try {
      if (REWARDED !== undefined) {
        if (typeof window.gdsdk.preloadAd === 'function') {
          try { await window.gdsdk.preloadAd(REWARDED); } catch (_) {}
        }
        await window.gdsdk.showAd(REWARDED);
      } else {
        await window.gdsdk.showAd(); // fallback
      }
    } catch (_) {}
    return true;
  }
}
