// audio.js
// Tiny WebAudio sound engine — all tones synthesized, no audio files (keeps the
// build small & offline). Calm, soft sounds that suit the relaxing mood.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.userMuted = false; // in-game mute toggle (gear button)
    this.sdkMuted = false;  // forced by CrazyGames SDK (muteAudio / during ads) — priority
    this.master = null;
  }

  // Effective mute = either source. SDK mute takes priority and cannot be
  // overridden by the in-game toggle.
  get muted() { return this.userMuted || this.sdkMuted; }
  _apply() { if (this.master) this.master.gain.value = this.muted ? 0 : 0.5; }

  // Must be called after a user gesture (browser autoplay policy).
  resume() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this._startAmbient();
  }

  // A very soft, slowly-breathing pad for a calm atmosphere (routed through
  // master, so the mute button silences it too).
  _startAmbient() {
    if (!this.ctx || this.ambient) return;
    const g = this.ctx.createGain();
    g.gain.value = 0.05; // very subtle
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 650;
    // Slow "breathing" on the volume.
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    lfo.start();
    // Soft low chord (C3, G3, C4), slightly detuned.
    const oscs = [130.81, 196.0, 261.63].map((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * (1 + i * 0.001);
      o.connect(g);
      o.start();
      return o;
    });
    g.connect(lp);
    lp.connect(this.master);
    this.ambient = { g, oscs, lfo };
  }

  setMuted(muted) {           // in-game toggle
    this.userMuted = muted;
    this._apply();
  }
  setSdkMuted(muted) {        // CrazyGames SDK muteAudio / during ads (priority)
    this.sdkMuted = muted;
    this._apply();
  }

  _tone(freq, dur, type = 'sine', gain = 0.3, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  escape() { this._tone(523.25, 0.28, 'sine', 0.28, 880); }      // bright rising chime
  blocked() { this._tone(180, 0.22, 'sawtooth', 0.18, 120); }    // soft low buzz
  tap() { this._tone(440, 0.06, 'triangle', 0.12); }
  hint() { this._tone(660, 0.18, 'sine', 0.18, 990); }
  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.32, 'sine', 0.25), i * 110);
    });
  }
  lose() { this._tone(330, 0.5, 'sine', 0.22, 160); }
}
