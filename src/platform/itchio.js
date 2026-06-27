// itchio.js
// itch.io hosts the plain HTML5 build inside an iframe and provides NO ad SDK.
// So this adapter behaves like the local one: no ads, rewards granted instantly.
// (If you later add an optional ad network for itch.io, wire it here.)

import { PlatformAdapter } from './adapter.js';

export default class ItchIoAdapter extends PlatformAdapter {
  constructor() {
    super();
    this.name = 'itchio';
    this.allowsExternalLinks = true;
  }

  async init() {
    console.info('[platform] itch.io adapter active (no ad SDK).');
  }

  async showRewarded() { return true; }
  async showInterstitial() {}
}
