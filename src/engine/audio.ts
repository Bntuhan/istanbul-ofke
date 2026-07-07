import type { OfkeState } from "../game/ofkeMeter";
import type { TargetId } from "../game/targets";

/**
 * Fully procedural audio (no asset files). A step-sequenced "arabesk-ish" bed
 * whose layers/tempo track the Ofke meter, plus per-target impact SFX.
 *
 * Phrygian-dominant scale (Hicaz feel) drives the bass/melody.
 */
const SCALE = [0, 1, 4, 5, 7, 8, 10]; // semitones from root

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private noise!: AudioBuffer;

  private started = false;
  private step = 0;
  private nextNoteTime = 0;
  private timer: number | null = null;

  // Tire squeal continuous node
  private squeakGain: GainNode | null = null;

  // intensity inputs, smoothed
  private intensity = 0; // 0..1 from ofke percent
  private fullOfke = false;
  private muted = false;

  /** Call from a user gesture (browsers block audio otherwise). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.0;
      this.musicGain.connect(this.master);
      this.noise = this.makeNoise();
      this.startMusic();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.9;
    return this.muted;
  }

  /** Drive the music intensity from the meter. */
  setOfke(percent: number, _state: OfkeState, fullOfke: boolean): void {
    this.intensity = Math.max(0, Math.min(1, percent / 100));
    this.fullOfke = fullOfke;
  }

  // --------------------------------------------------------------- music bed
  private startMusic(): void {
    if (!this.ctx || this.started) return;
    this.started = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    // continuous low drone
    const drone = this.ctx.createOscillator();
    const dg = this.ctx.createGain();
    drone.type = "sawtooth";
    drone.frequency.value = this.freq(0, 1); // low root
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 220;
    dg.gain.value = 0.08;
    drone.connect(lp).connect(dg).connect(this.musicGain);
    drone.start();

    const loop = (): void => {
      if (!this.ctx) return;
      // fade music in once running
      const targetVol = 0.5 + this.intensity * 0.5;
      this.musicGain.gain.setTargetAtTime(this.muted ? 0 : targetVol, this.ctx.currentTime, 0.3);
      while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
        this.scheduleStep(this.step, this.nextNoteTime);
        const bpm = 82 + this.intensity * 46 + (this.fullOfke ? 14 : 0);
        const sixteenth = 60 / bpm / 4;
        this.nextNoteTime += sixteenth;
        this.step = (this.step + 1) % 16;
      }
      this.timer = window.setTimeout(loop, 25);
    };
    loop();
  }

  private scheduleStep(step: number, t: number): void {
    const lvl = this.fullOfke ? 1 : this.intensity;
    // kick on quarter notes once we're past "Sıkıntı"
    if (lvl >= 0.3 && step % 4 === 0) this.kick(t, 0.9);
    if ((this.fullOfke || lvl >= 0.8) && (step === 2 || step === 10)) this.kick(t, 0.6);

    // darbuka / hats once "Öfke"
    if (lvl >= 0.6 && step % 2 === 1) this.perc(t, 0.5);
    if (this.fullOfke && step % 2 === 0) this.perc(t, 0.3);

    // bassline
    if (lvl >= 0.3 && (step === 0 || step === 6 || step === 8 || step === 14)) {
      const deg = [0, 3, 0, 4][[0, 6, 8, 14].indexOf(step)] ?? 0;
      this.bass(this.freq(SCALE[deg % SCALE.length], 1), t);
    }

    // melody riff in higher states (skipped in the bass-only "Kaynıyor" band, like the GDD)
    const kayniyor = lvl >= 0.8 && !this.fullOfke;
    if (!kayniyor && lvl >= 0.6) {
      const riff = [0, 2, 1, 3, 2, 4, 3, 5];
      if (step % 2 === 0) {
        const d = SCALE[riff[(step / 2) % riff.length] % SCALE.length];
        this.lead(this.freq(d, 3), t, this.fullOfke ? 0.22 : 0.13);
      }
    }
  }

  // ------------------------------------------------------------------ voices
  private kick(t: number, vol: number): void {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol * 0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.2);
  }

  private perc(t: number, vol: number): void {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2600;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol * 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    src.connect(bp).connect(g).connect(this.musicGain);
    src.start(t);
    src.stop(t + 0.07);
  }

  private bass(freq: number, t: number): void {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = freq;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    o.connect(lp).connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.3);
  }

  private lead(freq: number, t: number, vol: number): void {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(vol * 0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.18);
  }

  // -------------------------------------------------------------------- sfx
  playImpact(id: TargetId, big: boolean): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    // low thud body for every hit
    this.thud(t, big ? 1 : 0.5);
    // crunch
    this.crunch(t, big ? 0.5 : 0.28);
    // target-specific colour
    switch (id) {
      case "phantom":
        this.screech(t, 520, 180); // confused tire skid
        break;
      case "cakarli":
        this.beep(t, 880, 0.05);
        this.beep(t + 0.06, 1320, 0.05); // flasher zap
        break;
      case "dolmus":
        this.screech(t, 360, 150);
        break;
      case "simit":
        this.beep(t, 1500, 0.04);
        this.beep(t + 0.05, 2000, 0.04); // light pop
        break;
      case "cift_park":
        this.crunch(t + 0.02, 0.4);
        break;
    }
  }

  fullOfkeHit(): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    // arabesk bass DROP
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.5);
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.7);
  }

  sting(up: boolean): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const notes = up ? [0, 4, 7, 12] : [12, 7, 4, 0];
    notes.forEach((n, i) => this.lead(this.freq(SCALE[n % SCALE.length] + (n >= 12 ? 12 : 0), 3), t + i * 0.12, 0.5));
  }

  /** Radio announcement on level start — speech if available, else a tuning sting. */
  radioIntro(text: string): void {
    this.speakTurkish(text);
  }

  /** Oyun içi periyodik komik radyo anonsları */
  radioQuip(quip: string): void {
    this.speakTurkish(quip);
  }

  private speakTurkish(text: string): void {
    try {
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "tr-TR";
        u.rate = 1.0;
        u.pitch = 0.85;
        u.volume = 0.9;
        // Sesi yükle (bazı tarayıcılarda async)
        const trySpeak = (): void => {
          const voices = window.speechSynthesis.getVoices();
          const tr = voices.find((v) => v.lang.startsWith("tr")) ?? voices[0];
          if (tr) u.voice = tr;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        };
        if (window.speechSynthesis.getVoices().length > 0) {
          trySpeak();
        } else {
          window.speechSynthesis.onvoiceschanged = trySpeak;
        }
        return;
      }
    } catch {
      /* fall through */
    }
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.beep(t, 1000, 0.08);
      this.beep(t + 0.12, 1400, 0.08);
    }
  }

  /** Drift sesi — lastik gıcırtısı. intensity: 0..1 */
  updateDrift(intensity: number): void {
    if (!this.ctx || this.muted) return;
    // Lazy create
    if (!this.squeakGain) {
      const src = this.ctx.createOscillator();
      this.squeakGain = this.ctx.createGain();
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1800;
      bp.Q.value = 3;
      src.type = "sawtooth";
      src.frequency.value = 320;
      this.squeakGain.gain.value = 0;
      src.connect(bp).connect(this.squeakGain).connect(this.master);
      src.start();
    }
    const target = this.muted ? 0 : Math.max(0, intensity - 0.25) * 0.18;
    this.squeakGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  }

  private thud(t: number, vol: number): void {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.24);
  }

  private crunch(t: number, vol: number): void {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.15);
  }

  private screech(t: number, from: number, to: number): void {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + 0.22);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.26);
  }

  private beep(t: number, freq: number, dur: number): void {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.01);
  }

  private freq(semi: number, octave: number): number {
    // root A across octaves: A1=55, A2=110, A3=220
    const base = 55 * Math.pow(2, octave - 1);
    return base * Math.pow(2, semi / 12);
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 0.5;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  dispose(): void {
    if (this.timer !== null) clearTimeout(this.timer);
  }
}
