/**
 * FrightFate WebAudio Video Game Sound & Ambience Engine
 * Zero external asset dependencies - 100% procedural WebAudio synthesis.
 *
 * Design notes (why this sounds clean instead of glitchy):
 *  - Every source ramps up from silence and ramps down to silence before it is
 *    stopped, so no waveform is ever cut mid-cycle (that is what causes clicks).
 *  - Ambience lives on a single per-theme bus. Switching themes cancels the
 *    pending automation, pins the current value, then cross-fades — this avoids
 *    the automation-timeline jump that the old linearRamp produced.
 *  - Modulation depths are correct: a tremolo target gain starts at its base
 *    level and the LFO adds a *depth* bounded to that base. (The previous
 *    slasher pulse pushed the gain negative, gating the signal at full scale.)
 *  - Noise beds use an integrated (brown) noise buffer instead of raw white
 *    noise, which removes the hissy/glitchy hiss from the background.
 *  - A master compressor/limiter keeps stacked oscillators from clipping.
 */

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type Stoppable = AudioNode & { stop?: (when?: number) => void };

// localStorage is unavailable during SSR/prerender — access it defensively.
const storage = {
  get(key: string): string | null {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(key, value);
    } catch {}
  },
};

export class HorrorAudioEngine {
  ctx: AudioContext | null = null;
  isMuted: boolean;
  volume: number;

  /** Destination head of the graph: sources -> masterGain -> limiter -> out. */
  masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;

  activeTheme: string | null = null;
  ambienceGain: GainNode | null = null;
  ambienceNodes: Stoppable[] = [];
  sonarInterval: ReturnType<typeof setInterval> | null = null;
  /** Pending cleanup timer for the ambience cross-fade. */
  private ambienceStopTimer: ReturnType<typeof setTimeout> | null = null;

  heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  /** Cached integrated (brown) noise bed, reused by every ambience layer. */
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    this.isMuted = storage.get("frightfate_muted") === "true";
    const stored = parseFloat(storage.get("frightfate_volume") || "0.7");
    this.volume = Number.isFinite(stored) ? Math.max(0, Math.min(1, stored)) : 0.7;
  }

  init(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        const now = this.ctx.currentTime;

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, now);

        // Gentle limiter so layered drones never clip or crackle.
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-3, now);
        this.limiter.knee.setValueAtTime(12, now);
        this.limiter.ratio.setValueAtTime(12, now);
        this.limiter.attack.setValueAtTime(0.003, now);
        this.limiter.release.setValueAtTime(0.25, now);

        this.masterGain.connect(this.limiter);
        this.limiter.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    storage.set("frightfate_volume", String(this.volume));
    if (this.masterGain && this.ctx && !this.isMuted) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.08);
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    storage.set("frightfate_muted", String(this.isMuted));
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      const target = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(target, now + 0.15);
    }
    if (this.isMuted) {
      this.stopHeartbeat();
    }
    return this.isMuted;
  }

  // ==========================================================================
  // INTERNAL HELPERS
  // ==========================================================================

  /** Two seconds of integrated (brown-ish) noise — smooth, non-hissy texture. */
  private getNoiseBuffer(): AudioBuffer | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /** Loopable filtered-noise bed; caller connects the returned gain onward. */
  private createNoiseBed(
    filterType: BiquadFilterType,
    frequency: number,
    q: number,
    level: number
  ): { source: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } | null {
    const buffer = this.getNoiseBuffer();
    if (!buffer || !this.ctx) return null;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    if (filterType !== "lowpass") filter.Q.setValueAtTime(q, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    return { source, filter, gain };
  }

  /** Creates the per-theme bus that fades up from silence over `fadeSeconds`. */
  private createAmbienceBus(peak: number, fadeSeconds: number): GainNode {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(peak, now + fadeSeconds);
    bus.connect(this.masterGain!);
    return bus;
  }

  /** A slow LFO that modulates `target` (a param or node) by `depth`. */
  private slowLfo(
    rateHz: number,
    depth: number,
    waveform: OscillatorType = "sine"
  ): { lfo: OscillatorNode; depth: GainNode } {
    const ctx = this.ctx!;
    const lfo = ctx.createOscillator();
    lfo.type = waveform;
    lfo.frequency.setValueAtTime(rateHz, ctx.currentTime);
    const depthGain = ctx.createGain();
    depthGain.gain.setValueAtTime(depth, ctx.currentTime);
    lfo.connect(depthGain);
    return { lfo, depth: depthGain };
  }

  // ==========================================================================
  // ROOM / THEME SPECIFIC AMBIENT SOUNDSCAPES
  // ==========================================================================

  playThemeAmbience(theme = "lobby"): void {
    if (this.activeTheme === theme && this.ambienceGain) return;
    this.init();
    if (!this.ctx) return;

    this.stopAmbience(() => {
      this.activeTheme = theme;
      if (this.isMuted) return;

      switch (theme) {
        case "haunted_house":
          this._startHauntedHouseAmbience();
          break;
        case "zombie_outbreak":
          this._startZombieAmbience();
          break;
        case "slasher_movie":
          this._startSlasherAmbience();
          break;
        case "alien_invasion":
          this._startAlienAmbience();
          break;
        case "deep_sea_terror":
          this._startDeepSeaAmbience();
          break;
        case "cryptid_woods":
          this._startCryptidWoodsAmbience();
          break;
        default:
          // Unknown/legacy themes fall back to the flagship world rather than a
          // generic filler bed — every screen now plays a real theme soundtrack.
          this._startHauntedHouseAmbience();
          break;
      }
    });
  }

  stopAmbience(callback?: () => void): void {
    if (this.sonarInterval) {
      clearInterval(this.sonarInterval);
      this.sonarInterval = null;
    }
    if (this.ambienceStopTimer) {
      clearTimeout(this.ambienceStopTimer);
      this.ambienceStopTimer = null;
    }

    const bus = this.ambienceGain;
    if (!bus || !this.ctx) {
      this._cleanupAmbienceNodes();
      if (callback) callback();
      return;
    }

    const ctx = this.ctx;
    const now = ctx.currentTime;
    try {
      // Pin the currently-rendered value before ramping, otherwise the
      // scheduler interpolates from the *previous scheduled event* and jumps.
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), now);
      bus.gain.linearRampToValueAtTime(0, now + 0.5);
    } catch {
      /* fall through to cleanup */
    }

    this.ambienceStopTimer = setTimeout(() => {
      this.ambienceStopTimer = null;
      this._cleanupAmbienceNodes();
      if (callback) callback();
    }, 560);
  }

  _cleanupAmbienceNodes(): void {
    this.ambienceNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch {}
    });
    this.ambienceNodes = [];
    if (this.ambienceGain) {
      try {
        this.ambienceGain.disconnect();
      } catch {}
      this.ambienceGain = null;
    }
    this.activeTheme = null;
  }

  // --- 1. Haunted House: Gothic organ drone + cold resonant wind ---
  _startHauntedHouseAmbience(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const bus = this.createAmbienceBus(0.07, 3);
    this.ambienceGain = bus;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(340, now);
    filter.Q.setValueAtTime(0.7, now);

    const addTone = (type: OscillatorType, freq: number, level: number): OscillatorNode => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, now);
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      this.ambienceNodes.push(osc, g);
      return osc;
    };

    addTone("sawtooth", 55, 0.22);
    addTone("sine", 55.6, 0.4); // gentle beating against the saw
    addTone("sine", 110, 0.14); // organ octave
    addTone("sine", 165, 0.05); // sweetening fifth

    // Breathing filter sweep.
    const sweep = this.slowLfo(0.07, 90);
    sweep.depth.connect(filter.frequency);
    sweep.lfo.start(now);
    this.ambienceNodes.push(sweep.lfo, sweep.depth);

    filter.connect(bus);

    // Cold wind: integrated noise through a wide band-pass, slowly swelling.
    const wind = this.createNoiseBed("bandpass", 460, 0.6, 0.16);
    if (wind) {
      const windSwell = this.slowLfo(0.05, 0.09);
      windSwell.depth.connect(wind.gain.gain);
      windSwell.lfo.start(now);
      wind.gain.connect(bus);
      wind.source.start(now);
      this.ambienceNodes.push(wind.source, wind.filter, wind.gain, windSwell.lfo, windSwell.depth);
    }

    // Sparse minor-key organ motif — the house "breathing".
    this.startMotif([110, 130.81, 146.83, 164.81, 196], 9000, 0.05, 3.2);
  }

  // --- 2. Zombie Outbreak: industrial quarantine hum + distant klaxon ---
  _startZombieAmbience(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const bus = this.createAmbienceBus(0.06, 2.5);
    this.ambienceGain = bus;

    // Deep turbine rumble.
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.setValueAtTime(170, now);
    rumbleFilter.Q.setValueAtTime(1.1, now);

    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(41.2, now);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.5, now);

    const growl = ctx.createOscillator();
    growl.type = "sawtooth";
    growl.frequency.setValueAtTime(41.5, now);
    const growlGain = ctx.createGain();
    growlGain.gain.setValueAtTime(0.16, now);

    sub.connect(subGain);
    growl.connect(growlGain);
    subGain.connect(rumbleFilter);
    growlGain.connect(rumbleFilter);
    rumbleFilter.connect(bus);

    sub.start(now);
    growl.start(now);

    // Metallic quarantine ring — tremolo via a *bounded* depth, never negative.
    const ring = ctx.createOscillator();
    ring.type = "triangle";
    ring.frequency.setValueAtTime(158, now);
    const ringFilter = ctx.createBiquadFilter();
    ringFilter.type = "bandpass";
    ringFilter.frequency.setValueAtTime(620, now);
    ringFilter.Q.setValueAtTime(5, now);
    const ringGain = ctx.createGain();
    ringGain.gain.setValueAtTime(0.35, now); // base
    const ringTrem = this.slowLfo(3.2, 0.3); // +/- 0.3 stays in [0.05, 0.65]
    ringTrem.depth.connect(ringGain.gain);
    ringTrem.lfo.start(now);

    ring.connect(ringFilter);
    ringFilter.connect(ringGain);
    ringGain.connect(bus);
    ring.start(now);

    // Low ventilation noise bed.
    const vent = this.createNoiseBed("lowpass", 180, 0.7, 0.4);
    if (vent) {
      vent.gain.connect(bus);
      vent.source.start(now);
    }

    this.ambienceNodes.push(
      sub,
      subGain,
      growl,
      growlGain,
      rumbleFilter,
      ring,
      ringFilter,
      ringGain,
      ringTrem.lfo,
      ringTrem.depth
    );
    if (vent) this.ambienceNodes.push(vent.source, vent.filter, vent.gain);

    // Dissonant metallic clangs from somewhere deeper in the facility.
    this.startMotif([98, 103.8, 155.6, 233.1], 7000, 0.03, 1.6, "triangle");
  }

  // --- 3. Slasher Movie: Carpenter-style analog stalking pulse ---
  _startSlasherAmbience(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const bus = this.createAmbienceBus(0.07, 2);
    this.ambienceGain = bus;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(260, now);
    filter.Q.setValueAtTime(1.2, now);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(65.4, now);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.45, now);
    osc.connect(oscGain);
    oscGain.connect(filter);

    // Bounded tremolo gate: base 0.55, LFO square +/- 0.45 => oscillates 0.1..1.0.
    const gate = ctx.createGain();
    gate.gain.setValueAtTime(0.55, now);
    const gateDepth = this.slowLfo(1.7, 0.45, "square");
    gateDepth.depth.connect(gate.gain);
    gateDepth.lfo.start(now);

    filter.connect(gate);
    gate.connect(bus);

    osc.start(now);

    // Sustained minor-third pad for dread.
    const pad = ctx.createOscillator();
    pad.type = "sawtooth";
    pad.frequency.setValueAtTime(98.1, now);
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.setValueAtTime(700, now);
    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.05, now);
    pad.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(bus);
    pad.start(now);

    this.ambienceNodes.push(
      osc,
      oscGain,
      filter,
      gate,
      gateDepth.lfo,
      gateDepth.depth,
      pad,
      padFilter,
      padGain
    );

    // Stalking two-note pulse, Carpenter-style.
    this.startMotif([65.4, 98.1, 130.8], 3400, 0.05, 0.9, "triangle");
  }

  // --- 4. Alien Invasion: FM drone + cosmic shimmer ---
  _startAlienAmbience(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const bus = this.createAmbienceBus(0.06, 3);
    this.ambienceGain = bus;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, now);
    filter.Q.setValueAtTime(0.8, now);
    filter.connect(bus);

    const addFm = (carrierFreq: number, modFreq: number, index: number, level: number) => {
      const carrier = ctx.createOscillator();
      carrier.type = "sine";
      carrier.frequency.setValueAtTime(carrierFreq, now);
      const modulator = ctx.createOscillator();
      modulator.type = "triangle";
      modulator.frequency.setValueAtTime(modFreq, now);
      const modDepth = ctx.createGain();
      modDepth.gain.setValueAtTime(index, now);
      modulator.connect(modDepth);
      modDepth.connect(carrier.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, now);
      carrier.connect(g);
      g.connect(filter);
      carrier.start(now);
      modulator.start(now);
      this.ambienceNodes.push(carrier, modulator, modDepth, g);
    };

    addFm(73.4, 2.4, 14, 0.5);
    addFm(110, 0.7, 8, 0.22); // slow detuned partner

    // Faint crystalline shimmer with a bounded tremolo.
    const shimmer = ctx.createOscillator();
    shimmer.type = "triangle";
    shimmer.frequency.setValueAtTime(1174, now);
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.012, now);
    const shimmerTrem = this.slowLfo(0.23, 0.01);
    shimmerTrem.depth.connect(shimmerGain.gain);
    shimmerTrem.lfo.start(now);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(bus);
    shimmer.start(now);

    // Sub-bass press.
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(36.7, now);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.3, now);
    sub.connect(subGain);
    subGain.connect(bus);
    sub.start(now);

    this.ambienceNodes.push(shimmer, shimmerGain, shimmerTrem.lfo, shimmerTrem.depth, sub, subGain);

    // Glassy, descending "translator" tones.
    this.startMotif([1174.7, 880, 698.5, 587.3], 8200, 0.026, 2.6, "triangle");
  }

  // --- 5. Deep Sea Terror: submerged pressure + resonant echo sonar ---
  _startDeepSeaAmbience(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const bus = this.createAmbienceBus(0.07, 3);
    this.ambienceGain = bus;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(130, now);
    filter.Q.setValueAtTime(0.9, now);
    filter.connect(bus);

    const pressure = ctx.createOscillator();
    pressure.type = "sine";
    pressure.frequency.setValueAtTime(36.7, now);
    const pressureGain = ctx.createGain();
    pressureGain.gain.setValueAtTime(0.5, now);

    const swell = ctx.createOscillator();
    swell.type = "sine";
    swell.frequency.setValueAtTime(55, now);
    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(0.18, now);

    pressure.connect(pressureGain);
    swell.connect(swellGain);
    pressureGain.connect(filter);
    swellGain.connect(filter);
    pressure.start(now);
    swell.start(now);

    // Water movement: filtered noise with a slow swell.
    const water = this.createNoiseBed("lowpass", 320, 0.7, 0.22);
    if (water) {
      const waterSwell = this.slowLfo(0.06, 0.12);
      waterSwell.depth.connect(water.gain.gain);
      waterSwell.lfo.start(now);
      water.gain.connect(bus);
      water.source.start(now);
      this.ambienceNodes.push(
        water.source,
        water.filter,
        water.gain,
        waterSwell.lfo,
        waterSwell.depth
      );
    }

    this.ambienceNodes.push(pressure, pressureGain, swell, swellGain, filter);

    // Sonar echo returning from something enormous in the dark.
    this.startMotif([840, 660, 420, 220], 7500, 0.045, 2.6);
  }

  /**
   * Schedules a sparse melodic line on top of the current ambience bus, so each
   * world reads as a distinct *soundtrack* rather than a single sustained drone.
   * Notes are pick-random from `notes`, softly filtered and cleanly enveloped.
   */
  private startMotif(
    notes: number[],
    intervalMs: number,
    peak: number,
    duration: number,
    type: OscillatorType = "sine"
  ): void {
    const play = () => {
      const ctx = this.ctx;
      const bus = this.ambienceGain;
      if (this.isMuted || !ctx || !bus) return;

      try {
        const now = ctx.currentTime;
        const oscillator = ctx.createOscillator();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(notes[Math.floor(Math.random() * notes.length)], now);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2400, now);
        filter.Q.setValueAtTime(0.7, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(peak, now + Math.min(0.14, duration * 0.25));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(bus);

        oscillator.start(now);
        oscillator.stop(now + duration + 0.05);
      } catch {}
    };

    play();
    this.sonarInterval = setInterval(play, intervalMs);
  }

  // ==========================================================================
  // VIDEO GAME UI SOUND EFFECTS
  // ==========================================================================

  /**
   * Shared one-shot voice: builds an oscillator + envelope with a tiny attack
   * ramp (removes the click you get from starting an oscillator at full gain),
   * an exponential decay, and a clean stop after the tail.
   */
  private playTone(opts: {
    type: OscillatorType;
    from: number;
    to: number;
    peak: number;
    duration: number;
    attack?: number;
    filter?: { type: BiquadFilterType; frequency: number; q?: number };
  }): void {
    if (this.isMuted) return;
    this.init();
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const { type, from, to, peak, duration, attack = 0.006, filter } = opts;

      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(from, now);
      if (to !== from) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(to, 0.001), now + duration);
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(Math.max(peak, 0.0002), now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      let tail: AudioNode = gain;
      if (filter) {
        const bq = ctx.createBiquadFilter();
        bq.type = filter.type;
        bq.frequency.setValueAtTime(filter.frequency, now);
        if (filter.q) bq.Q.setValueAtTime(filter.q, now);
        gain.connect(bq);
        tail = bq;
      }
      tail.connect(this.masterGain);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + duration + 0.03);
    } catch {}
  }

  playHover(): void {
    this.playTone({ type: "sine", from: 820, to: 1120, peak: 0.02, duration: 0.04, attack: 0.004 });
  }

  playSelect(): void {
    this.playTone({ type: "triangle", from: 580, to: 260, peak: 0.06, duration: 0.07 });
  }

  playConfirm(): void {
    this.playTone({
      type: "sine",
      from: 120,
      to: 34,
      peak: 0.16,
      duration: 0.36,
      filter: { type: "lowpass", frequency: 900 },
    });
    this.playTone({ type: "sine", from: 440, to: 220, peak: 0.09, duration: 0.28 });
  }

  playCancel(): void {
    this.playTone({
      type: "sawtooth",
      from: 280,
      to: 78,
      peak: 0.07,
      duration: 0.17,
      filter: { type: "lowpass", frequency: 380, q: 0.8 },
    });
  }

  playTypewriter(): void {
    const pitch = 850 + (Math.random() * 300 - 150);
    this.playTone({ type: "triangle", from: pitch, to: pitch * 0.4, peak: 0.028, duration: 0.03, attack: 0.003 });
  }

  playTimerTick(isUrgent = false): void {
    this.playTone({
      type: "sine",
      from: isUrgent ? 880 : 520,
      to: 160,
      peak: isUrgent ? 0.08 : 0.035,
      duration: 0.06,
      attack: 0.004,
    });
  }

  startHeartbeat(intervalMs = 800): void {
    if (this.isMuted) return;
    this.stopHeartbeat();
    this.init();

    const beat = () => {
      if (this.isMuted || !this.ctx) return;
      this.playThump(62, 0.14);
      setTimeout(() => {
        if (!this.isMuted && this.ctx) {
          this.playThump(48, 0.09);
        }
      }, 150);
    };

    beat();
    this.heartbeatTimer = setInterval(beat, intervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  playThump(freq = 60, gainVal = 0.1): void {
    this.playTone({ type: "sine", from: freq, to: 25, peak: gainVal, duration: 0.2 });
  }

  playStinger(): void {
    if (this.isMuted) return;
    this.init();
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;

      [110, 116.5, 123.5, 164.8, 233.1].forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 0.75, now + 1.2);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1200, now);
        filter.Q.setValueAtTime(0.7, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + 1.55);
      });

      // Softened low-passed noise crash to accent the hit.
      const buffer = this.getNoiseBuffer();
      if (buffer) {
        const crash = ctx.createBufferSource();
        crash.buffer = buffer;
        crash.loop = true;
        const crashFilter = ctx.createBiquadFilter();
        crashFilter.type = "lowpass";
        crashFilter.frequency.setValueAtTime(1600, now);
        const crashGain = ctx.createGain();
        crashGain.gain.setValueAtTime(0.0001, now);
        crashGain.gain.linearRampToValueAtTime(0.16, now + 0.03);
        crashGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        crash.connect(crashFilter);
        crashFilter.connect(crashGain);
        crashGain.connect(this.masterGain!);
        crash.start(now);
        crash.stop(now + 0.65);
      }
    } catch {}
  }

  playVictory(): void {
    if (this.isMuted) return;
    this.init();
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      [220, 277.18, 329.63, 440, 554.37, 659.25].forEach((freq, i) => {
        const start = now + i * 0.1;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.08, start + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.8);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(start);
        osc.stop(start + 1.9);
      });
    } catch {}
  }

  // --- 6. Cryptid Woods: hollow wind, distant wood knocks, something answering ---
  _startCryptidWoodsAmbience(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const bus = this.createAmbienceBus(0.065, 3);
    this.ambienceGain = bus;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(240, now);
    filter.Q.setValueAtTime(0.8, now);
    filter.connect(bus);

    // Night-hollow drone: low clarinet-ish tone plus a detuned partner.
    const addTone = (type: OscillatorType, freq: number, level: number) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, now);
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      this.ambienceNodes.push(osc, g);
    };
    addTone("sine", 49, 0.4); // G1 — open-pine hollow
    addTone("triangle", 49.7, 0.18); // beating partner

    // Wind through the trees: slow band-passed noise swells.
    const wind = this.createNoiseBed("bandpass", 380, 0.5, 0.2);
    if (wind) {
      const windSwell = this.slowLfo(0.045, 0.12);
      windSwell.depth.connect(wind.gain.gain);
      windSwell.lfo.start(now);
      wind.gain.connect(bus);
      wind.source.start(now);
      this.ambienceNodes.push(wind.source, wind.filter, wind.gain, windSwell.lfo, windSwell.depth);
    }

    // Distant wood-knocks — the thing talks by striking trees.
    this.startMotif([98, 146.8, 196, 220], 6400, 0.04, 0.5, "triangle");
  }

  // --- Backwards Compatibility Aliases ---
  startAmbientDrone(theme?: string): void {
    this.playThemeAmbience(theme || this.activeTheme || "haunted_house");
  }

  stopAmbientDrone(callback?: () => void): void {
    this.stopAmbience(callback);
  }

  playClick(): void {
    this.playSelect();
  }
}

export const soundEngine = new HorrorAudioEngine();
