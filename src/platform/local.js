// local.js
// Local / no-SDK adapter. Used for development and for itch.io style hosting
// where no monetization SDK is required. All calls are safe no-ops and rewarded
// ads are granted instantly so the full game is testable without any portal.

import { PlatformAdapter } from './adapter.js';

export default class LocalAdapter extends PlatformAdapter {
  constructor() {
    super();
    this.name = 'local';
    this.allowsExternalLinks = true;
  }

  async init() {
    console.info('[platform] LocalAdapter active (no external SDK).');
  }

  gameplayStart() { console.debug('[platform] gameplayStart'); }
  gameplayStop() { console.debug('[platform] gameplayStop'); }
  happyTime() { console.debug('[platform] happyTime'); }

  async showRewarded() {
    console.debug('[platform] (local) rewarded granted instantly');
    return true;
  }

  async showInterstitial() {
    console.debug('[platform] (local) interstitial skipped');
  }
}
