// playhoop.js
// Play Hoop / Playhop adapter.
// Play Hoop embeds HTML5 games and exposes a lightweight bridge (window.PlayHoop
// or a postMessage channel depending on integration). Public docs are limited, so
// this adapter implements the common interface defensively: if a bridge object is
// present we call it, otherwise rewards are granted so play is never blocked.
//
// When you receive the official Play Hoop SDK details, fill in SDK_URL and map the
// methods below — the rest of the game stays unchanged.

import { PlatformAdapter } from './adapter.js';

const SDK_URL = null; // set to the official Play Hoop SDK script when available

export default class PlayHoopAdapter extends PlatformAdapter {
  constructor() {
    super();
    this.name = 'playhoop';
    this.bridge = null;
  }

  async init() {
    if (SDK_URL) {
      try { await this.loadScript(SDK_URL); } catch (_) {}
    }
    // Common bridge globals seen on embed platforms.
    this.bridge = window.PlayHoop || window.Playhop || window.PLAYHOOP || null;
    if (this.bridge?.init) {
      try { await this.bridge.init(); } catch (_) {}
    }
  }

  gameplayStart() { try { this.bridge?.gameplayStart?.(); } catch (_) {} }
  gameplayStop() { try { this.bridge?.gameplayStop?.(); } catch (_) {} }
  happyTime() { try { this.bridge?.happyTime?.(); } catch (_) {} }

  showRewarded() {
    return new Promise((resolve) => {
      const fn = this.bridge?.showRewarded || this.bridge?.rewarded;
      if (!fn) { resolve(true); return; }
      try {
        Promise.resolve(fn.call(this.bridge)).then((ok) => resolve(ok !== false)).catch(() => resolve(false));
      } catch (_) {
        resolve(true);
      }
    });
  }

  showInterstitial() {
    return new Promise((resolve) => {
      const fn = this.bridge?.showInterstitial || this.bridge?.interstitial;
      if (!fn) { resolve(); return; }
      try {
        Promise.resolve(fn.call(this.bridge)).then(() => resolve()).catch(() => resolve());
      } catch (_) {
        resolve();
      }
    });
  }
}
