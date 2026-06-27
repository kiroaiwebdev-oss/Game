// crazygames.js
// CrazyGames SDK v3 adapter. Docs: https://docs.crazygames.com/sdk/html5/
// SDK script is included in <head> (build injects it); global: window.CrazyGames.SDK.
//
// v3 mapping (note: v3 uses loadingStart/loadingStop, NOT sdkGameLoadingStart):
//   init                 -> SDK.init()  + read environment + muteAudio settings
//   loadingStart/Stop    -> SDK.game.loadingStart()/loadingStop()
//   gameplayStart/Stop   -> SDK.game.gameplayStart()/gameplayStop()
//   happyTime            -> SDK.game.happytime()   (used sparingly)
//   setContext/clear     -> SDK.game.setGameContext()/clearGameContext()
//   showRewarded         -> SDK.ad.requestAd('rewarded', {adStarted, adFinished, adError})
//   showInterstitial     -> SDK.ad.requestAd('midgame', ...)
//   muteAudio            -> SDK.game.settings.muteAudio + addSettingsChangeListener
//   (audio is muted while an ad is playing, then restored to the SDK setting)

import { PlatformAdapter } from './adapter.js';

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

export default class CrazyGamesAdapter extends PlatformAdapter {
  constructor() {
    super();
    this.name = 'crazygames';
    this.sdk = null;
    this.env = 'disabled';
    this._adActive = false;
    this.hasAds = true;
  }

  async init() {
    if (!(window.CrazyGames && window.CrazyGames.SDK)) {
      await this.loadScript(SDK_URL);
    }
    this.sdk = window.CrazyGames && window.CrazyGames.SDK;
    if (!this.sdk) throw new Error('CrazyGames SDK not available');
    await this.sdk.init();
    try { this.env = this.sdk.environment || 'disabled'; } catch (_) {}

    // muteAudio support (required for Full Implementation): apply the SDK's
    // setting now and whenever it changes. This takes priority over the in-game
    // mute toggle (handled by audio.setSdkMuted).
    try {
      this._refreshMute();
      this.sdk.game.addSettingsChangeListener?.(() => this._refreshMute());
    } catch (_) {}
  }

  _settingMute() {
    try { return !!this.sdk?.game?.settings?.muteAudio; } catch (_) { return false; }
  }
  _refreshMute() { this._emitMute(this._adActive || this._settingMute()); }

  loadingStart() { try { this.sdk?.game.loadingStart?.(); } catch (_) {} }
  loadingStop() { try { this.sdk?.game.loadingStop?.(); } catch (_) {} }
  gameplayStart() { try { this.sdk?.game.gameplayStart?.(); } catch (_) {} }
  gameplayStop() { try { this.sdk?.game.gameplayStop?.(); } catch (_) {} }
  happyTime() { try { this.sdk?.game.happytime?.(); } catch (_) {} }

  setContext(ctx) { try { this.sdk?.game.setGameContext?.(ctx); } catch (_) {} }
  clearContext() { try { this.sdk?.game.clearGameContext?.(); } catch (_) {} }

  // Mute + pause audio on adStarted; restore on adFinished/adError.
  _adCallbacks(done) {
    return {
      adStarted: () => { this._adActive = true; this._refreshMute(); },
      adFinished: () => { this._adActive = false; this._refreshMute(); done(true); },
      adError: () => { this._adActive = false; this._refreshMute(); done(true); },
    };
  }

  showRewarded() {
    // true => grant the reward. On adError (incl. adsDisabledBasicLaunch / unfilled
    // / adblock) we still grant so the game stays functional and fair.
    return new Promise((resolve) => {
      if (!this.sdk?.ad) { resolve(true); return; }
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      this.sdk.ad.requestAd('rewarded', this._adCallbacks(done));
    });
  }

  showInterstitial() {
    return new Promise((resolve) => {
      if (!this.sdk?.ad) { resolve(); return; }
      let settled = false;
      const done = () => { if (!settled) { settled = true; resolve(); } };
      this.sdk.ad.requestAd('midgame', this._adCallbacks(done));
    });
  }
}
