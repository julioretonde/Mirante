// =============================================================================
//  Motor de áudio chiptune — tudo sintetizado com a Web Audio API (nenhum
//  arquivo de som). Ondas de pulso (12,5% / 25% / 50%), triângulo e ruído.
// =============================================================================

import { SONGS } from './songs.js';

const A4 = 440;
const NOTE_INDEX = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

/** 'C#4' -> frequência em Hz */
export function noteFreq(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return 0;
  let n = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return A4 * Math.pow(2, n / 12);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ready = false;
    this.music = null;
    this.windLevel = 0;
    this._charge = null;
  }

  /** Cria/retoma o AudioContext (precisa de um gesto do usuário). */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC({ latencyHint: 'interactive' });
        this._build();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  _build() {
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    // compressor suave para evitar estouros
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.55;
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.32;
    this.musicBus.connect(this.master);
    // ondas de pulso estilo NES
    this.waves = {};
    for (const duty of [0.125, 0.25, 0.5]) this.waves[duty] = this._pulseWave(duty);
    // ruído branco (determinístico o suficiente para percussão)
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    // vento contínuo (ruído filtrado com volume controlado)
    const wsrc = ctx.createBufferSource();
    wsrc.buffer = this.noise;
    wsrc.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 700;
    wf.Q.value = 0.8;
    this.windFilter = wf;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wsrc.connect(wf);
    wf.connect(this.windGain);
    this.windGain.connect(this.sfxBus);
    wsrc.start();
    this.music = new Sequencer(this);
  }

  _pulseWave(duty) {
    // Série de Fourier de uma onda de pulso com ciclo de trabalho `duty`.
    const n = 48;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      real[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
      imag[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (Math.PI * k);
    }
    return this.ctx.createPeriodicWave(real, imag);
  }

  setMuted(m) {
    this.muted = m;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(m ? 0 : 0.8, t, 0.03);
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  get t() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // -------------------------------------------------------- blocos básicos --
  /** Toca uma nota com envelope simples. */
  tone({ freq, freqEnd, dur = 0.1, type = 0.5, vol = 0.3, attack = 0.004, release = 0.05, when = 0, bus, vibrato = 0, detune = 0 }) {
    if (!this.ready || !this.ctx) return null;
    const ctx = this.ctx;
    const t0 = when || ctx.currentTime;
    const osc = ctx.createOscillator();
    if (typeof type === 'number') osc.setPeriodicWave(this.waves[type]);
    else osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    if (detune) osc.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.setValueAtTime(vol, t0 + Math.max(attack, dur - release));
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    if (vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 18;
      lg.gain.value = vibrato;
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.02);
    }
    osc.connect(g);
    g.connect(bus || this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    return { osc, g };
  }

  /** Rajada de ruído filtrado (percussão, impactos). */
  noiseHit({ dur = 0.08, vol = 0.3, filter = 'lowpass', freq = 1200, freqEnd, q = 0.7, when = 0, bus }) {
    if (!this.ready || !this.ctx) return;
    const ctx = this.ctx;
    const t0 = when || ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t0);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus || this.sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.02);
  }

  // ------------------------------------------------------------- efeitos ----
  /** Carga do pulo: tom subindo enquanto segura. */
  chargeStart(seconds) {
    if (!this.ready) return;
    this.chargeStop();
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.waves[0.25]);
    osc.frequency.setValueAtTime(160, t0);
    osc.frequency.exponentialRampToValueAtTime(760, t0 + seconds);
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 22;
    lg.gain.value = 6;
    lfo.connect(lg);
    lg.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.09, t0 + 0.03);
    g.gain.linearRampToValueAtTime(0.14, t0 + seconds);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t0);
    lfo.start(t0);
    this._charge = { osc, lfo, g };
  }

  chargeStop() {
    const c = this._charge;
    if (!c || !this.ctx) return;
    const t = this.ctx.currentTime;
    c.g.gain.cancelScheduledValues(t);
    c.g.gain.setTargetAtTime(0.0001, t, 0.01);
    c.osc.stop(t + 0.06);
    c.lfo.stop(t + 0.06);
    this._charge = null;
  }

  jump(ratio) {
    this.chargeStop();
    const f0 = 260 + ratio * 160;
    this.tone({ freq: f0, freqEnd: f0 * 2.6, dur: 0.1 + ratio * 0.06, type: 0.5, vol: 0.22 });
    this.noiseHit({ dur: 0.05, vol: 0.08, filter: 'highpass', freq: 3000 });
  }

  land(dist) {
    const big = Math.min(1, dist / 160);
    this.tone({ freq: 140, freqEnd: 60, dur: 0.07 + big * 0.04, type: 'triangle', vol: 0.35 });
    this.noiseHit({ dur: 0.06 + big * 0.05, vol: 0.18 + big * 0.1, filter: 'lowpass', freq: 900, freqEnd: 200 });
  }

  splat() {
    this.tone({ freq: 420, freqEnd: 55, dur: 0.32, type: 0.5, vol: 0.22 });
    this.tone({ freq: 90, freqEnd: 40, dur: 0.25, type: 'triangle', vol: 0.45 });
    this.noiseHit({ dur: 0.3, vol: 0.35, filter: 'lowpass', freq: 1400, freqEnd: 120 });
  }

  bounce() {
    this.tone({ freq: 620, freqEnd: 260, dur: 0.13, type: 0.25, vol: 0.2, vibrato: 30 });
    this.noiseHit({ dur: 0.04, vol: 0.12, filter: 'bandpass', freq: 2200, q: 2 });
  }

  ceiling() {
    this.noiseHit({ dur: 0.05, vol: 0.2, filter: 'bandpass', freq: 900, q: 1.5 });
    this.tone({ freq: 200, freqEnd: 120, dur: 0.06, type: 'triangle', vol: 0.25 });
  }

  step() {
    this.noiseHit({ dur: 0.025, vol: 0.05, filter: 'highpass', freq: 2500 });
  }

  uiMove() {
    this.tone({ freq: 660, dur: 0.05, type: 0.25, vol: 0.14 });
  }

  uiSelect() {
    this.tone({ freq: 880, dur: 0.06, type: 0.25, vol: 0.16 });
    this.tone({ freq: 1320, dur: 0.08, type: 0.25, vol: 0.14, when: this.t + 0.06 });
  }

  starChime() {
    const notes = ['C6', 'E6', 'G6', 'C7'];
    notes.forEach((n, i) => this.tone({ freq: noteFreq(n), dur: 0.25, type: 0.125, vol: 0.12, when: this.t + i * 0.09 }));
  }

  fanfare() {
    const seq = [
      ['G4', 0, 0.14],
      ['C5', 0.15, 0.14],
      ['E5', 0.3, 0.14],
      ['G5', 0.45, 0.3],
      ['E5', 0.78, 0.12],
      ['G5', 0.92, 0.9],
    ];
    for (const [n, dt, d] of seq) {
      this.tone({ freq: noteFreq(n), dur: d, type: 0.25, vol: 0.2, when: this.t + dt });
      this.tone({ freq: noteFreq(n) / 2, dur: d, type: 'triangle', vol: 0.25, when: this.t + dt });
    }
  }

  /** Vento: volume segue a intensidade (0..1), com transição suave. */
  setWind(level) {
    if (!this.ctx || !this.ready) return;
    if (Math.abs(level - this.windLevel) < 0.01) return;
    this.windLevel = level;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(level * 0.16, t, 0.25);
    this.windFilter.frequency.setTargetAtTime(500 + level * 600, t, 0.3);
  }

  playMusic(id) {
    if (this.music) this.music.play(id);
  }

  stopMusic() {
    if (this.music) this.music.stop();
  }
}

// =============================================================================
//  Sequenciador de música (agenda notas com antecedência no relógio do áudio)
// =============================================================================
class Sequencer {
  constructor(engine) {
    this.e = engine;
    this.song = null;
    this.id = null;
    this.timer = null;
    this.gain = null;
  }

  play(id) {
    if (this.id === id) return;
    this.stop();
    const song = SONGS[id];
    if (!song) return;
    this.id = id;
    this.song = compile(song);
    this.step = 0;
    const ctx = this.e.ctx;
    this.gain = ctx.createGain();
    this.gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6);
    this.gain.connect(this.e.musicBus);
    this.next = ctx.currentTime + 0.08;
    this.timer = setInterval(() => this._pump(), 25);
    this._pump();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.gain && this.e.ctx) {
      const g = this.gain;
      const t = this.e.ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0.0001, t, 0.15);
      setTimeout(() => g.disconnect(), 900);
    }
    this.gain = null;
    this.id = null;
  }

  _pump() {
    const ctx = this.e.ctx;
    if (!ctx || !this.song) return;
    if (ctx.state !== 'running') {
      this.next = ctx.currentTime + 0.05;
      return;
    }
    const sd = this.song.stepDur;
    if (this.next < ctx.currentTime - 0.2) this.next = ctx.currentTime + 0.02; // voltou de pausa
    while (this.next < ctx.currentTime + 0.15) {
      this._schedule(this.step, this.next);
      this.next += sd;
      this.step++;
      if (this.step >= this.song.length) {
        if (this.song.loop === false) {
          this.stop();
          return;
        }
        this.step = 0;
      }
    }
  }

  _schedule(step, when) {
    const s = this.song;
    for (const tr of s.tracks) {
      const ev = tr.events[step];
      if (!ev) continue;
      if (tr.kind === 'drum') {
        if (ev === 'k') {
          this.e.tone({ freq: 150, freqEnd: 45, dur: 0.12, type: 'triangle', vol: 0.5 * tr.vol, when, bus: this.gain });
        } else if (ev === 's') {
          this.e.noiseHit({ dur: 0.12, vol: 0.3 * tr.vol, filter: 'bandpass', freq: 1800, q: 0.9, when, bus: this.gain });
        } else if (ev === 'h') {
          this.e.noiseHit({ dur: 0.035, vol: 0.14 * tr.vol, filter: 'highpass', freq: 6000, when, bus: this.gain });
        } else if (ev === 'o') {
          this.e.noiseHit({ dur: 0.2, vol: 0.12 * tr.vol, filter: 'highpass', freq: 5000, when, bus: this.gain });
        }
        continue;
      }
      const dur = ev.len * s.stepDur;
      this.e.tone({
        freq: ev.freq,
        dur: Math.max(0.05, dur * tr.gate),
        type: tr.wave,
        vol: tr.vol,
        attack: tr.attack ?? 0.005,
        release: Math.min(0.08, dur * 0.4),
        when,
        bus: this.gain,
        detune: tr.detune || 0,
        vibrato: tr.vibrato || 0,
      });
    }
  }
}

/** Converte a notação em texto das músicas (songs.js) em eventos por passo. */
function compile(song) {
  const stepDur = 60 / song.bpm / 4; // semicolcheias
  let length = song.length || 0;
  const tracks = [];
  for (const tr of song.tracks) {
    let tokens;
    if (tr.chords) tokens = arpTokens(tr.chords, tr.pattern, tr.octave ?? 4, tr.every ?? 1);
    else tokens = tr.notes.trim().split(/\s+/);
    if (tr.repeat) tokens = Array.from({ length: tr.repeat }, () => tokens).flat();
    length = Math.max(length, tokens.length);
    const events = new Array(tokens.length).fill(null);
    if (tr.kind === 'drum') {
      tokens.forEach((t, i) => {
        if (t !== '.') events[i] = t;
      });
    } else {
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t === '.' || t === '-') continue;
        let len = 1;
        while (i + len < tokens.length && tokens[i + len] === '-') len++;
        events[i] = { freq: noteFreq(t) * (tr.transpose ? Math.pow(2, tr.transpose / 12) : 1), len };
      }
    }
    tracks.push({
      kind: tr.kind || 'tone',
      wave: tr.wave ?? 0.5,
      vol: tr.vol ?? 0.2,
      gate: tr.gate ?? 0.9,
      attack: tr.attack,
      detune: tr.detune,
      vibrato: tr.vibrato,
      events,
    });
  }
  for (const t of tracks) if (t.events.length < length) t.events.length = length;
  return { stepDur, length, tracks, loop: song.loop !== false };
}

const CHORDS = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  7: [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  dim: [0, 3, 6],
};
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Gera tokens de arpejo a partir de cifras: ['C', 'Am', ...] */
function arpTokens(chords, pattern, octave, every) {
  const out = [];
  for (const ch of chords) {
    const m = /^([A-G][#b]?)(.*)$/.exec(ch);
    let root = NOTE_NAMES.indexOf(m[1].replace('b', ''));
    if (m[1].includes('b')) root = (NOTE_NAMES.indexOf(m[1][0]) + 11) % 12;
    const ivs = CHORDS[m[2]] || CHORDS[''];
    for (let i = 0; i < 16; i++) {
      if (i % every !== 0) {
        out.push('.');
        continue;
      }
      const p = pattern[(i / every) % pattern.length];
      if (p === null) {
        out.push('.');
        continue;
      }
      const iv = ivs[p % ivs.length] + 12 * Math.floor(p / ivs.length);
      const semis = root + iv;
      const name = NOTE_NAMES[((semis % 12) + 12) % 12];
      out.push(name + (octave + Math.floor(semis / 12)));
    }
  }
  return out;
}
