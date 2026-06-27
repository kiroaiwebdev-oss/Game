// gamepix.js
// GamePix adapter. GamePix distributes HTML5 games and provides the GamePix
// HTML5 SDK v3 (global class: GamePixSDK), loaded in <head> by the build:
//   https://integration.gamepix.com/sdk/v3/gamepix.sdk.js
//
// Core v3 API used here:
//   const sdk = new GamePixSDK();
//   sdk.ping('start')              -> game-state ping
//   sdk.interstitialAd()           -> Promise, shows a full-screen ad
//   sdk.rewardAd()                 -> Promise<boolean>, true if the user earned it
//
// We mute audio for the ad's duration ourselves (before/after the await) instead
// of relying on pause/resume event names, so it stays robust across SDK versions.

import { PlatformAdapter } from './adapter.js';

const SDK_URL = 'https://integration.gamepix.com/sdk/v3/gamepix.sdk.js';

export default class GamePixAdapter extends PlatformAdapter {
  constructor() {
    super();
    this.name = 'gamepix';
    this.sdk = null;
    this.hasAds = true;
  }

  async init() {
    try {
      if (typeof window.GamePixSDK === 'undefined') {
        await this.loadScript(SDK_URL);
      }
      if (typeof window.GamePixSDK === 'function') {
        this.sdk = new window.GamePixSDK();
      }
    } catch (err) {
      console.warn('[platform] GamePix SDK unavailable; ads disabled.', err);
    }
  }

  loadingStop() {
    // Signal the game has started (best-effort; ignored if unsupported).
    try { this.sdk && this.sdk.ping && this.sdk.ping('start'); } catch (_) {}
  }

  gameplayStart() {}
  gameplayStop() {}
  happyTime() { try { this.sdk && this.sdk.happyMoment && this.sdk.happyMoment(); } catch (_) {} }

  // Interstitial / commercial break between levels.
  showInterstitial() {
    return new Promise((resolve) => {
      const sdk = this.sdk;
      if (!sdk || typeof sdk.interstitialAd !== 'function') { resolve(); return; }
      let settled = false;
      const done = () => { if (!settled) { settled = true; this._emitMute(false); resolve(); } };
      try {
        this._emitMute(true);
        const p = sdk.interstitialAd();
        if (p && typeof p.then === 'function') p.then(done, done);
        else done();
        setTimeout(done, 30000); // safety timeout
      } catch (_) { done(); }
    });
  }

  // Rewarded video. Resolve true => grant the reward. We grant on success and on
  // unknown results; only an explicit "not rewarded" denies it.
  showRewarded() {
    return new Promise((resolve) => {
      const sdk = this.sdk;
      if (!sdk || typeof sdk.rewardAd !== 'function') { resolve(true); return; }
      let settled = false;
      const done = (granted) => { if (!settled) { settled = true; this._emitMute(false); resolve(granted); } };
      try {
        this._emitMute(true);
        const p = sdk.rewardAd();
        if (p && typeof p.then === 'function') {
          p.then((res) => {
            const denied = res === false || (res && (res.success === false || res.rewarded === false));
            done(!denied);
          }, () => done(true));
        } else { done(true); }
        setTimeout(() => done(true), 60000); // safety timeout
      } catch (_) { done(true); }
    });
  }
}
