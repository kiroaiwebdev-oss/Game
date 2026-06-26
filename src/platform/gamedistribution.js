// gamedistribution.js
// GameDistribution (GD) HTML5 SDK adapter.
// Docs: https://github.com/GameDistribution/GD-HTML5
// SDK script: https://html5.api.gamedistribution.com/main.min.js
// Configure your game id via window.ARROW_PUZZLE_GD_ID before init (or edit below).
//
// GD uses a global GD_OPTIONS object set BEFORE the script loads, plus the
// window.gdsdk instance afterwards. Ads are shown via gdsdk.showAd(type).
//   rewarded  -> 'rewarded'
//   interstitial -> 'interstitial'
// GD pauses/resumes the game through SDK_GAME_PAUSE / SDK_GAME_START events.

import { PlatformAdapter } from './adapter.js';

const SDK_URL = 'https://html5.api.gamedistribution.com/main.min.js';

export default class GameDistributionAdapter extends PlatformAdapter {
  constructor() {
    super();
    this.name = 'gamedistribution';
    this.sdk = null;
    this._rewardResolver = null;
  }

  async init() {
    const gameId = window.ARROW_PUZZLE_GD_ID || 'REPLACE_WITH_YOUR_GD_GAME_ID';
    // GD_OPTIONS must exist before the SDK script runs.
    window.GD_OPTIONS = {
      gameId,
      onEvent: (event) => {
        switch (event.name) {
          case 'SDK_GAME_PAUSE': this._emitMute(true); break;
          case 'SDK_GAME_START': this._emitMute(false); break;
          case 'SDK_REWARDED_WATCH_COMPLETE':
            if (this._rewardResolver) { this._rewardResolver(true); this._rewardResolver = null; }
            break;
          default: break;
        }
      },
    };
    await this.loadScript(SDK_URL);
    this.sdk = window.gdsdk || null;
  }

  gameplayStart() { /* GD auto-detects; nothing required */ }
  gameplayStop() {}
  happyTime() {}

  showRewarded() {
    return new Promise((resolve) => {
      if (!this.sdk?.showAd) { resolve(true); return; }
      this._rewardResolver = resolve;
      Promise.resolve(this.sdk.showAd('rewarded'))
        .then(() => {
          // If the SDK resolves without the WATCH_COMPLETE event, assume not granted.
          if (this._rewardResolver) { this._rewardResolver(false); this._rewardResolver = null; }
        })
        .catch(() => {
          if (this._rewardResolver) { this._rewardResolver(false); this._rewardResolver = null; }
        });
    });
  }

  showInterstitial() {
    return new Promise((resolve) => {
      if (!this.sdk?.showAd) { resolve(); return; }
      Promise.resolve(this.sdk.showAd('interstitial')).then(() => resolve()).catch(() => resolve());
    });
  }
}
