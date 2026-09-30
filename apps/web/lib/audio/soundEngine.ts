// Centralized Web Audio sound engine.
//
// A single shared AudioContext drives every UI cue. Cues are produced two ways:
//   1. Layered synthesis — oscillators + filtered noise shaped by envelopes,
//      routed through a per-voice filter, a shared convolution reverb send, a
//      bus compressor, and a master gain.
//   2. One-shot samples — high-quality decoded AudioBuffers, registered by name
//      and preferred over the synth recipe when present.
//
// The design goal is a deep, low, cinematic soundscape (closer to film
// trailers and ambient game menus than retro synth beeps): sub-bass swells,
// airy low whooshes, and soft halo intervals with slow attacks and long,
// reverberant tails. Nothing lives above the lower midrange.
//
// Browsers require a user gesture before audio can start, so the context is
// created lazily and resumed on unlock(). Global volume, mute, and an enabled
// flag (used to honour reduced-motion / reduced-sensory preferences) gate all
// output. Everything is a no-op during SSR.

export type SoundName =
  | "hover"
  | "tap"
  | "open"
  | "close"
  | "confirm"
  | "toggle"
  | "next"
  | "error";

type ToneOpts = {
  freq: number;
  type?: OscillatorType;
  dur?: number;
  attack?: number;
  release?: number;
  peak?: number;
  detune?: number;
  glideTo?: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number };
  reverb?: number;
  pan?: number;
};

type NoiseOpts = {
  dur?: number;
  attack?: number;
  type?: BiquadFilterType;
  freq?: number;
  sweepTo?: number;
  q?: number;
  peak?: number;
  reverb?: number;
  pan?: number;
};

const VOLUME_KEY = "nomu-sound-volume";
const MUTED_KEY = "nomu-sound-muted";

const clampVolume = (value: number) => Math.min(3, Math.max(0, value));

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbReturn: GainNode | null = null;
  private samples = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<void>>();

  private _volume = 0.95;
  private _muted = false;
  private _enabled = true;

  get ready() {
    return this.ctx !== null;
  }
  get volume() {
    return this._volume;
  }
  get muted() {
    return this._muted;
  }
  get enabled() {
    return this._enabled;
  }

  /** Restore persisted volume/mute. Safe to call once on the client at startup. */
  hydrate() {
    if (typeof window === "undefined") return;
    const v = Number(window.localStorage.getItem(VOLUME_KEY));
    if (Number.isFinite(v) && v >= 0) this._volume = clampVolume(v);
    this._muted = window.localStorage.getItem(MUTED_KEY) === "1";
  }

  /** Build the audio graph on demand. Returns null when Web Audio is unavailable. */
  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.ctx) return this.ctx;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();

    const master = ctx.createGain();
    master.gain.value = this._muted ? 0 : this._volume;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 26;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(ctx, 2.2, 2.6);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.9;

    // master -> compressor -> speakers; reverb send folds back into master.
    master.connect(comp).connect(ctx.destination);
    reverb.connect(reverbReturn).connect(master);

    this.ctx = ctx;
    this.master = master;
    this.reverb = reverb;
    this.reverbReturn = reverbReturn;
    return ctx;
  }

  /** Create/resume the context. Must be called from a user gesture the first time. */
  unlock() {
    const ctx = this.ensure();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }

  setVolume(value: number) {
    this._volume = clampVolume(value);
    if (typeof window !== "undefined") window.localStorage.setItem(VOLUME_KEY, String(this._volume));
    if (this.ctx && this.master && !this._muted) {
      this.master.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.02);
    }
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    if (typeof window !== "undefined") window.localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : this._volume, this.ctx.currentTime, 0.02);
    }
  }

  /** Master switch for reduced-motion / reduced-sensory preferences. */
  setEnabled(enabled: boolean) {
    this._enabled = enabled;
  }

  /** Register a high-quality one-shot sample; it takes priority over the synth recipe. */
  registerSample(name: string, url: string): Promise<void> {
    if (this.samples.has(name)) return Promise.resolve();
    const existing = this.pending.get(name);
    if (existing) return existing;

    const task = (async () => {
      const ctx = this.ensure();
      if (!ctx) return;
      const response = await fetch(url);
      const raw = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(raw);
      this.samples.set(name, buffer);
    })().finally(() => this.pending.delete(name));

    this.pending.set(name, task);
    return task;
  }

  /** Play a named cue. Prefers a registered sample, else the synth preset. */
  play(name: SoundName | string, opts: { gain?: number } = {}) {
    if (!this._enabled || this._muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const when = ctx.currentTime + 0.001;
    const gain = opts.gain ?? 1;

    const sample = this.samples.get(name);
    if (sample) {
      this.playSample(sample, when, gain);
      return;
    }

    PRESETS[name as SoundName]?.(this, when, gain);
  }

  // ---- synthesis primitives (used by presets) ----

  tone(opts: ToneOpts, when: number, gainScale = 1) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    const {
      freq,
      type = "sine",
      dur = 0.22,
      attack = 0.008,
      release = dur,
      peak = 0.08,
      detune = 0,
      glideTo,
      filter,
      reverb = 0.35,
      pan = 0,
    } = opts;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (detune) osc.detune.setValueAtTime(detune, when);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, when + dur);

    const env = ctx.createGain();
    const level = peak * gainScale;
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), when + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, when + attack + release);

    let node: AudioNode = osc;
    if (filter) {
      const biquad = ctx.createBiquadFilter();
      biquad.type = filter.type;
      biquad.frequency.value = filter.freq;
      if (filter.q) biquad.Q.value = filter.q;
      node.connect(biquad);
      node = biquad;
    }
    node.connect(env);

    this.route(env, when, attack + release, reverb, pan);

    osc.start(when);
    osc.stop(when + attack + release + 0.05);
  }

  noise(opts: NoiseOpts, when: number, gainScale = 1) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;

    const { dur = 0.12, attack = 0.004, type = "lowpass", freq = 320, sweepTo, q = 0.6, peak = 0.06, reverb = 0.2, pan = 0 } = opts;

    const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const biquad = ctx.createBiquadFilter();
    biquad.type = type;
    biquad.frequency.setValueAtTime(freq, when);
    if (sweepTo) biquad.frequency.linearRampToValueAtTime(sweepTo, when + dur);
    biquad.Q.value = q;

    const env = ctx.createGain();
    const level = peak * gainScale;
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), when + Math.min(attack, dur));
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    src.connect(biquad).connect(env);
    this.route(env, when, dur, reverb, pan);

    src.start(when);
    src.stop(when + dur + 0.05);
  }

  // Connect a finished voice to the dry master and the reverb send, with an
  // optional stereo position for spatial spread.
  private route(source: AudioNode, when: number, life: number, reverb: number, pan: number) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    let out = source;
    if (pan && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), when);
      source.connect(panner);
      out = panner;
    }

    out.connect(master);

    if (reverb > 0 && this.reverb) {
      const send = ctx.createGain();
      send.gain.value = reverb;
      out.connect(send).connect(this.reverb);
      // Let the send node release with the voice.
      window.setTimeout(() => send.disconnect(), (life + 2) * 1000);
    }
  }

  private playSample(buffer: AudioBuffer, when: number, gainScale: number) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const env = ctx.createGain();
    env.gain.value = 0.9 * gainScale;
    src.connect(env);
    this.route(env, when, buffer.duration, 0.45, 0);
    src.start(when);
  }

  // Exponentially-decaying noise burst → a short, diffuse plate-style impulse.
  private impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
    const frames = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, frames, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < frames; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, decay);
      }
    }
    return impulse;
  }
}

// Preset recipes (offline fallback — the generated .ogg samples take priority
// when loaded). Same shape as the samples: 100ms soft hums, low and subtle.
const PRESETS: Record<SoundName, (e: SoundEngine, when: number, gain: number) => void> = {
  hover: (e, when, gain) => {
    e.tone({ freq: 120, type: "sine", dur: 0.1, attack: 0.05, release: 0.05, peak: 0.06, reverb: 0.3 }, when, gain);
  },
  tap: (e, when, gain) => {
    e.tone({ freq: 110, type: "sine", dur: 0.1, attack: 0.04, release: 0.06, peak: 0.1, reverb: 0.3 }, when, gain);
    e.noise({ dur: 0.1, attack: 0.04, type: "lowpass", freq: 300, peak: 0.03, reverb: 0.25 }, when, gain);
  },
  open: (e, when, gain) => {
    e.tone({ freq: 80, type: "sine", dur: 0.1, attack: 0.05, release: 0.05, peak: 0.09, reverb: 0.4 }, when, gain);
    e.tone({ freq: 120, type: "sine", dur: 0.1, attack: 0.05, release: 0.05, peak: 0.06, reverb: 0.4 }, when, gain);
  },
  close: (e, when, gain) => {
    e.tone({ freq: 120, type: "sine", dur: 0.1, attack: 0.05, release: 0.05, peak: 0.07, reverb: 0.4 }, when, gain);
    e.tone({ freq: 80, type: "sine", dur: 0.1, attack: 0.05, release: 0.05, peak: 0.08, reverb: 0.4 }, when, gain);
  },
  confirm: (e, when, gain) => {
    e.tone({ freq: 130.81, type: "sine", dur: 0.1, attack: 0.05, release: 0.05, peak: 0.07, reverb: 0.45 }, when, gain);
    e.tone({ freq: 196, type: "sine", dur: 0.1, attack: 0.05, release: 0.05, peak: 0.05, reverb: 0.45 }, when, gain);
  },
  toggle: (e, when, gain) => {
    e.tone({ freq: 140, type: "sine", dur: 0.1, attack: 0.04, release: 0.06, peak: 0.08, reverb: 0.35 }, when, gain);
  },
  next: (e, when, gain) => {
    e.tone({ freq: 160, type: "sine", dur: 0.1, attack: 0.05, release: 0.05, peak: 0.07, reverb: 0.4 }, when, gain);
    e.noise({ dur: 0.1, attack: 0.05, type: "lowpass", freq: 500, peak: 0.03, reverb: 0.4 }, when, gain);
  },
  error: (e, when, gain) => {
    e.tone({ freq: 70, type: "sine", dur: 0.1, attack: 0.05, release: 0.05, peak: 0.09, reverb: 0.4 }, when, gain);
    e.noise({ dur: 0.1, attack: 0.05, type: "lowpass", freq: 200, peak: 0.03, reverb: 0.35 }, when, gain);
  },
};

export const sound = new SoundEngine();
