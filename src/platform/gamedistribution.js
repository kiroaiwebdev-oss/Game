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

  // Interstitial (pre-roll on Play, mid-roll on Next) — gdsdk.showAd().
  showInterstitial() {
    return new Promise((resolve) => {
      const gd = window.gdsdk;
      if (!gd || typeof gd.showAd !== 'function') { resolve(); return; }
      let settled = false;
      const done = () => { if (!settled) { settled = true; resolve(); } };
      try { Promise.resolve(gd.showAd()).then(done).catch(done); } catch (_) { done(); }
    });
  }

  // Rewarded (hint / continue). Grants on completion or error so it stays usable.
  showRewarded() {
    return new Promise((resolve) => {
      const gd = window.gdsdk;
      if (!gd || typeof gd.showAd !== 'function') { resolve(true); return; }
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      const rewardedType = window['GD_SDK_REWARDED_ADVERTISEMENT'];
      try {
        Promise.resolve(rewardedType ? gd.showAd(rewardedType) : gd.showAd())
          .then(() => done(true)).catch(() => done(true));
      } catch (_) { done(true); }
    });
  }
}
