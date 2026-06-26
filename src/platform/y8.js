// y8.js
// Y8 adapter. Y8 distributes HTML5 games and offers an ad SDK (idnet / Y8 ads).
// Ad SDK script: https://cdn.y8.com/api/sdk.js  (exposes window.ID)
// Some Y8 titles instead use the AdInPlay / GameMonetize tag. This adapter targets
// the Y8 ID ad API and degrades gracefully if it is absent.
//
// Configure your Y8 app id via window.ARROW_PUZZLE_Y8_APPID before init.

import { PlatformAdapter } from './adapter.js';

const SDK_URL = 'https://cdn.y8.com/api/sdk.js';

export default class Y8Adapter extends PlatformAdapter {
  constructor() {
    super();
    this.name = 'y8';
    this.ready = false;
  }

  async init() {
    try {
      await this.loadScript(SDK_URL);
      const appId = window.ARROW_PUZZLE_Y8_APPID || 'REPLACE_WITH_YOUR_Y8_APP_ID';
      if (window.ID && typeof window.ID.init === 'function') {
        await new Promise((resolve) => {
          window.ID.init({ appId }, () => resolve());
          // Fallback in case the callback never fires.
          setTimeout(resolve, 2500);
        });
        this.ready = true;
      }
    } catch (err) {
      console.warn('[platform] Y8 SDK unavailable; ads disabled.', err);
    }
  }

  gameplayStart() {}
  gameplayStop() {}
  happyTime() {}

  showRewarded() {
    return new Promise((resolve) => {
      const api = window.ID;
      if (!this.ready || !api || !api.Event || !api.api) { resolve(true); return; }
      try {
        // Y8 rewarded video via the ID ad API.
        api.api('clay.ads.showAd', 'rewarded', (res) => {
          resolve(!!(res && (res.completed || res.success)));
        });
      } catch (_) {
        resolve(true);
      }
    });
  }

  showInterstitial() {
    return new Promise((resolve) => {
      const api = window.ID;
      if (!this.ready || !api || !api.api) { resolve(); return; }
      try {
        api.api('clay.ads.showAd', 'interstitial', () => resolve());
      } catch (_) {
        resolve();
      }
    });
  }
}
