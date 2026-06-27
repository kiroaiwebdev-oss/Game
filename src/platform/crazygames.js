// crazygames.js
// CrazyGames SDK v3 adapter.
// Docs: https://docs.crazygames.com/sdk/html5/intro/
// SDK script: https://sdk.crazygames.com/crazygames-sdk-v3.js  (added in index.html
// or loaded dynamically below). The global is window.CrazyGames.SDK.
//
// Mapping:
//   init                 -> CrazyGames.SDK.init()
//   loadingStart/Stop    -> SDK.game.sdkGameLoadingStart()/Stop()
//   gameplayStart/Stop   -> SDK.game.gameplayStart()/gameplayStop()
//   happyTime            -> SDK.game.happytime()
//   showRewarded         -> SDK.ad.requestAd('rewarded', callbacks)
//   showInterstitial     -> SDK.ad.requestAd('midgame', callbacks)

import { PlatformAdapter } from './adapter.js';

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

export default class CrazyGamesAdapter extends PlatformAdapter {
  constructor() {
    super();
    this.name = 'crazygames';
    this.sdk = null;
  }

  async init() {
    // If the SDK was included statically in index.html (recommended for the
    // CrazyGames QA detector), use it; otherwise load it dynamically.
    if (!(window.CrazyGames && window.CrazyGames.SDK)) {
      await this.loadScript(SDK_URL);
    }
    this.sdk = window.CrazyGames && window.CrazyGames.SDK;
    if (!this.sdk) throw new Error('CrazyGames SDK not available');
    await this.sdk.init();
  }

  loadingStart() { try { this.sdk?.game.sdkGameLoadingStart?.(); } catch (_) {} }
  loadingStop() { try { this.sdk?.game.sdkGameLoadingStop?.(); } catch (_) {} }
  gameplayStart() { try { this.sdk?.game.gameplayStart?.(); } catch (_) {} }
  gameplayStop() { try { this.sdk?.game.gameplayStop?.(); } catch (_) {} }
  happyTime() { try { this.sdk?.game.happytime?.(); } catch (_) {} }

  showRewarded() {
    // Resolves true only if the player watched the rewarded ad to the end.
    return new Promise((resolve) => {
      if (!this.sdk?.ad) { resolve(true); return; }
      let settled = false;
      const done = (value) => { if (!settled) { settled = true; resolve(value); } };
      this.sdk.ad.requestAd('rewarded', {
        adFinished: () => done(true),
        adError: () => done(false),
      });
    });
  }

  showInterstitial() {
    return new Promise((resolve) => {
      if (!this.sdk?.ad) { resolve(); return; }
      this.sdk.ad.requestAd('midgame', {
        adFinished: () => resolve(),
        adError: () => resolve(),
      });
    });
  }
}
