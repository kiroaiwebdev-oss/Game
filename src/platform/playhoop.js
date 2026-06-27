// playhoop.js
// Playhop adapter — Playhop is powered by the Yandex Games ecosystem, so this
// adapter integrates the official Yandex Games SDK v2 (global: YaGames / ysdk).
// Docs: https://yandex.com/dev/games/doc/en/
//
// The SDK <script> is injected into <head> by the build (sdk.games.s3.yandex.net),
// which exposes window.YaGames. We then call YaGames.init() to get the `ysdk`.
//
// Mapping to the game's common adapter interface:
//   init             -> wait for YaGames, YaGames.init()
//   loadingStop      -> ysdk.features.LoadingAPI.ready()   (Game Ready signal, req. 1.19.2)
//   gameplayStart/Stop -> ysdk.features.GameplayAPI.start()/stop()
//   showInterstitial -> ysdk.adv.showFullscreenAdv({ callbacks })
//   showRewarded     -> ysdk.adv.showRewardedVideo({ callbacks }) (grant on onRewarded)
//   audio is muted on ad onOpen and restored on close/error (Yandex req. 4.7).

import { PlatformAdapter } from './adapter.js';

const SDK_URL = 'https://sdk.games.s3.yandex.net/sdk.js';

export default class PlayHoopAdapter extends PlatformAdapter {
  constructor() {
    super();
    this.name = 'playhoop';
    this.ysdk = null;
    this.hasAds = true;
    this._readySent = false;
  }

  async init() {
    if (!window.YaGames) {
      try { await this.loadScript(SDK_URL); } catch (_) {}
    }
    await this._waitForGlobal();
    if (!window.YaGames) return; // SDK unavailable (e.g. local preview) — game stays playable
    try {
      this.ysdk = await window.YaGames.init();
      window.ysdk = this.ysdk;
    } catch (_) { this.ysdk = null; }
  }

  // The head <script> is async; poll briefly until YaGames appears.
  _waitForGlobal(timeoutMs = 4000) {
    return new Promise((resolve) => {
      if (window.YaGames) { resolve(); return; }
      const start = Date.now();
      const t = setInterval(() => {
        if (window.YaGames || Date.now() - start > timeoutMs) {
          clearInterval(t);
          resolve();
        }
      }, 60);
    });
  }

  loadingStart() {}

  // "Game Ready": tell Yandex the game has finished loading and is interactive.
  loadingStop() {
    if (this._readySent) return;
    try { this.ysdk?.features?.LoadingAPI?.ready?.(); this._readySent = true; } catch (_) {}
  }

  gameplayStart() { try { this.ysdk?.features?.GameplayAPI?.start?.(); } catch (_) {} }
  gameplayStop() { try { this.ysdk?.features?.GameplayAPI?.stop?.(); } catch (_) {} }

  // Interstitial / commercial break between levels.
  showInterstitial() {
    return new Promise((resolve) => {
      if (!this.ysdk?.adv?.showFullscreenAdv) { resolve(); return; }
      let settled = false;
      const done = () => { if (!settled) { settled = true; this._emitMute(false); resolve(); } };
      try {
        this.ysdk.adv.showFullscreenAdv({
          callbacks: {
            onOpen: () => this._emitMute(true),
            onClose: () => done(),
            onError: () => done(),
            onOffline: () => done(),
          },
        });
      } catch (_) { done(); }
    });
  }

  // Rewarded video. Resolve true => grant the reward. We grant on onRewarded;
  // if the ad errors/unfilled we still grant so the game stays fair.
  showRewarded() {
    return new Promise((resolve) => {
      if (!this.ysdk?.adv?.showRewardedVideo) { resolve(true); return; }
      let settled = false;
      let granted = false;
      const done = (v) => { if (!settled) { settled = true; this._emitMute(false); resolve(v); } };
      try {
        this.ysdk.adv.showRewardedVideo({
          callbacks: {
            onOpen: () => this._emitMute(true),
            onRewarded: () => { granted = true; },
            onClose: () => done(granted),
            onError: () => done(true),
          },
        });
      } catch (_) { done(true); }
    });
  }
}
