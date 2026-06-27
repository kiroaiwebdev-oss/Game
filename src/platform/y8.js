// y8.js
// Y8 adapter. Y8 distributes HTML5 games; monetization uses the Y8 (idnet) SDK
// loaded from https://cdn.y8.com/api/sdk.js, which exposes the global `ID`.
//
// IMPORTANT: A game can be uploaded to Y8 and played WITHOUT any SDK. The SDK +
// App ID are only needed to earn from in-game ads, which requires a Y8 *studio*.
// Configure the real App ID via window.ARROW_PUZZLE_Y8_APPID before init. Until a
// real id is set, the SDK is skipped and the game stays fully playable (rewarded
// actions are simply granted).
//
// Confirmed Y8 JS ad flow (from Y8 developer forum):
//   ID.init({ appId }, cb)
//   ID.Event.subscribe('id.init', () => ID.ads.init(appId))
//   ID.ads.display(cb)   // shows an ad; cb fires when the ad finishes/closes

import { PlatformAdapter } from './adapter.js';

const SDK_URL = 'https://cdn.y8.com/api/sdk.js';

export default class Y8Adapter extends PlatformAdapter {
  constructor() {
    super();
    this.name = 'y8';
    this.ready = false;
    this.adsReady = false;
    this.hasAds = true;
  }

  async init() {
    const appId = window.ARROW_PUZZLE_Y8_APPID || '';
    // No real App ID yet -> skip the SDK entirely (game still fully playable).
    if (!appId || /REPLACE|YOUR_Y8/i.test(appId)) return;

    try {
      await this.loadScript(SDK_URL);
      if (!(window.ID && typeof window.ID.init === 'function')) return;
      await new Promise((resolve) => {
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        try {
          // Initialize the ad module once the SDK core signals it is ready.
          if (window.ID.Event && window.ID.Event.subscribe) {
            window.ID.Event.subscribe('id.init', () => {
              try {
                if (window.ID.ads && window.ID.ads.init) {
                  window.ID.ads.init(appId);
                  this.adsReady = true;
                }
              } catch (_) {}
            });
          }
          window.ID.init({ appId }, () => { this.ready = true; finish(); });
        } catch (_) { finish(); }
        setTimeout(finish, 3000); // never block boot if the callback never fires
      });
    } catch (err) {
      console.warn('[platform] Y8 SDK unavailable; ads disabled.', err);
    }
  }

  gameplayStart() {}
  gameplayStop() {}
  happyTime() {}

  // Show a Y8 video ad. Resolves true if an ad was actually displayed.
  // Audio is muted for the ad's duration and restored on close.
  _display() {
    return new Promise((resolve) => {
      const ID = window.ID;
      if (!ID || !ID.ads || typeof ID.ads.display !== 'function') { resolve(false); return; }
      let settled = false;
      const done = (shown) => { if (!settled) { settled = true; this._emitMute(false); resolve(shown); } };
      try {
        this._emitMute(true);
        ID.ads.display(() => done(true)); // fires when the ad finishes / closes
        setTimeout(() => done(false), 30000); // safety timeout
      } catch (_) { done(false); }
    });
  }

  async showInterstitial() { await this._display(); }

  // Y8's JS ad call doesn't expose explicit reward completion, so grant the
  // reward regardless of fill (keeps the game fair when no ad is available).
  async showRewarded() { await this._display(); return true; }
}
