// ---------- Procedural audio: synthesized SFX + adaptive music (WebAudio, no files) ----------
const SETTINGS_KEY = 'deadearth_settings_v1';
const Settings = {
  v: { master: 0.8, music: 0.5, sfx: 0.85, mute: false, shake: true, dmgNums: true },
  load() { try { Object.assign(this.v, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { } },
  save() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.v)); } catch (e) { } Snd.applyVolumes(); },
};
Settings.load();

const Snd = {
  ctx: null, ok: false, last: {}, voices: 0,
  // ----- setup (audio may only start after a user gesture) -----
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -16; this.comp.knee.value = 12; this.comp.ratio.value = 4;
    this.master.connect(this.comp); this.comp.connect(c.destination);
    this.musicBus = c.createGain(); this.sfxBus = c.createGain();
    this.musicBus.connect(this.master); this.sfxBus.connect(this.master);
    // shared reverb (generated impulse response)
    this.verb = c.createConvolver(); this.verb.buffer = this.impulse(2.8, 2.6);
    this.verbIn = c.createGain(); this.verbIn.gain.value = 1; this.verbIn.connect(this.verb); this.verb.connect(this.master);
    // reverb sends go through their own volume so the music / effects sliders also silence the echo
    this.musicSend = c.createGain(); this.musicSend.connect(this.verbIn);
    this.sfxSend = c.createGain(); this.sfxSend.connect(this.verbIn);
    this.noiseBuf = this.makeNoise(2);
    this.ok = true; this.applyVolumes();
    Music.start();
  },
  applyVolumes() {
    if (!this.ok) return;
    const s = Settings.v, t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.mute ? 0 : s.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(s.music * 0.55, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.05);
    this.musicSend.gain.setTargetAtTime(s.music * 0.55, t, 0.1);
    this.sfxSend.gain.setTargetAtTime(s.sfx, t, 0.05);
  },
  makeNoise(sec) {
    const c = this.ctx, b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  },
  impulse(sec, decay) {
    const c = this.ctx, n = c.sampleRate * sec, b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  },
  // throttle identical sounds and cap total voices so busy fights never turn into noise
  gate(key, minGap) {
    if (!this.ok || Settings.v.mute) return false;
    const t = this.ctx.currentTime;
    if (this.last[key] && t - this.last[key] < minGap) return false;
    if (this.voices > 28) return false;
    this.last[key] = t; return true;
  },
  // output chain for one sound: gain -> pan -> sfx bus (+ reverb send)
  out(vol, pan, wet) {
    const c = this.ctx, g = c.createGain(); g.gain.value = vol;
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    if (p) { p.pan.value = U.clamp(pan || 0, -1, 1); g.connect(p); p.connect(this.sfxBus); } else g.connect(this.sfxBus);
    if (wet) { const s = c.createGain(); s.gain.value = wet; g.connect(s); s.connect(this.sfxSend); }
    this.voices++; setTimeout(() => this.voices--, 1200);
    return g;
  },
  noise(dest, t, dur, f0, f1, q, type, a0 = 1) {
    const c = this.ctx, src = c.createBufferSource(); src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(a0, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  },
  tone(dest, t, dur, f0, f1, type, a0 = 1, attack = 0.004) {
    const c = this.ctx, o = c.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a0, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  },
  // world position -> stereo pan + distance volume (relative to the player)
  spatial(x, f) {
    if (!Run.active || !Run.p) return { pan: 0, vol: 1 };
    const p = Run.p, dx = x - p.x, df = Math.abs((f ?? p.f) - p.f);
    const d = Math.hypot(dx, df * 260);
    return { pan: U.clamp(dx / 700, -0.9, 0.9), vol: Math.max(0, 1 - d / 1500) * (df ? 0.6 : 1) };
  },

  // ----- weapons -----
  shot(cls, ammo, x) {
    if (!this.gate('shot', 0.035)) return;
    const c = this.ctx, t = c.currentTime;
    const P = { pistol: [0.55, 2200, 0.18, 150], smg: [0.45, 2600, 0.12, 170], rifle: [0.7, 1800, 0.28, 110], shotgun: [0.9, 1200, 0.42, 70], sniper: [0.95, 1500, 0.6, 60], bolt: [0.3, 900, 0.12, 300] };
    const k = ammo === 'bolt' ? 'bolt' : ammo === 'a12' ? 'shotgun' : ammo === 'a762' ? 'sniper' : cls === 'smg' ? 'smg' : cls === 'pistol' ? 'pistol' : 'rifle';
    const [vol, fc, len, thump] = P[k];
    const o = this.out(vol, 0, k === 'bolt' ? 0.05 : 0.35);
    if (k === 'bolt') { this.noise(o, t, 0.12, 1400, 500, 2); this.tone(o, t, 0.15, 260, 90, 'triangle', 0.4); return; }
    this.noise(o, t, 0.03, 6000, 3000, 0.7, 'highpass', 1.2);           // crack
    this.noise(o, t, len, fc, 200, 0.8, 'lowpass', 1.0);                 // body
    this.tone(o, t, len * 0.8, thump, 35, 'sine', 0.9);                   // thump
    if (k === 'shotgun' || k === 'sniper') this.noise(o, t + 0.02, len * 1.6, 600, 80, 0.5, 'lowpass', 0.5); // tail
    if (Math.random() < 0.7) setTimeout(() => this.casing(), 260 + Math.random() * 200);
  },
  casing() { if (!this.gate('casing', 0.08)) return; const t = this.ctx.currentTime, o = this.out(0.42, 0.1, 0.1); this.tone(o, t, 0.08, 3200, 2600, 'triangle', 0.6); this.tone(o, t + 0.07, 0.06, 2900, 2500, 'triangle', 0.3); },
  empty() { if (!this.gate('empty', 0.25)) return; const t = this.ctx.currentTime, o = this.out(0.88); this.noise(o, t, 0.03, 2500, 2500, 6); this.tone(o, t, 0.04, 1800, 900, 'square', 0.15); },
  reload(phase) {
    if (!this.gate('reload' + phase, 0.1)) return;
    const t = this.ctx.currentTime, o = this.out(0.88, 0, 0.1);
    if (phase === 0) { this.noise(o, t, 0.05, 1800, 900, 3); this.noise(o, t + 0.12, 0.06, 1200, 700, 3); }
    else { this.noise(o, t, 0.04, 2600, 1500, 4); this.tone(o, t, 0.12, 900, 700, 'square', 0.12); this.noise(o, t + 0.08, 0.05, 3000, 2000, 5); }
  },
  swing() { if (!this.gate('swing', 0.08)) return; const t = this.ctx.currentTime, o = this.out(1.20); this.noise(o, t, 0.22, 600, 2400, 2.5); },
  hit(heavy, x, f) {
    if (!this.gate('hit', 0.04)) return;
    const s = this.spatial(x, f), t = this.ctx.currentTime, o = this.out(0.5 * s.vol + 0.1, s.pan, 0.1);
    this.tone(o, t, heavy ? 0.22 : 0.14, heavy ? 140 : 180, 50, 'sine', 0.9);
    this.noise(o, t, 0.12, 900, 300, 1.2, 'lowpass', 0.7);
  },
  explosion(x, f) {
    if (!this.gate('boom', 0.1)) return;
    const s = this.spatial(x, f), t = this.ctx.currentTime, o = this.out(1.0 * Math.max(0.4, s.vol), s.pan, 0.5);
    this.noise(o, t, 1.4, 2500, 60, 0.5, 'lowpass', 1.2);
    this.tone(o, t, 1.0, 90, 25, 'sine', 1.0);
    this.noise(o, t + 0.05, 0.4, 5000, 1500, 0.6, 'highpass', 0.4);
  },
  throwNade() { if (!this.gate('throw', 0.2)) return; const t = this.ctx.currentTime, o = this.out(0.2); this.noise(o, t, 0.25, 500, 1600, 2); this.tone(o, t + 0.05, 0.05, 2400, 2400, 'square', 0.05); },

  // ----- zombies (positional) -----
  groan(x, f, kind) {
    const s = this.spatial(x, f); if (s.vol < 0.06) return;
    if (!this.gate('groan', kind === 'boss' ? 0.4 : 0.22)) return;
    const c = this.ctx, t = c.currentTime, dur = 0.6 + Math.random() * 0.7;
    const base = { brute: 55, boss: 38, runner: 120, spitter: 95 }[kind] || (80 + Math.random() * 40);
    const o = this.out((kind === 'boss' ? 1.6 : 1.1) * s.vol, s.pan, 0.25);
    const osc = c.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base * (1 + Math.random() * 0.15), t); osc.frequency.linearRampToValueAtTime(base * (0.75 + Math.random() * 0.2), t + dur);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5 + Math.random() * 6; lg.gain.value = base * 0.06; lfo.connect(lg); lg.connect(osc.frequency);
    // two formant filters make it sound vocal
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    for (const [ff, q, a] of [[500 + Math.random() * 200, 6, 0.9], [1100 + Math.random() * 300, 8, 0.45]]) { const bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = ff; bf.Q.value = q; const bg = c.createGain(); bg.gain.value = a; osc.connect(bf); bf.connect(bg); bg.connect(g); }
    g.connect(o); osc.start(t); lfo.start(t); osc.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    this.noise(o, t, dur * 0.8, 900, 600, 2, 'bandpass', 0.15);
  },
  zombieDie(x, f, kind) { this.groan(x, f, kind); const s = this.spatial(x, f); if (!this.gate('zdie', 0.05)) return; const t = this.ctx.currentTime, o = this.out(0.4 * s.vol + 0.05, s.pan, 0.15); this.tone(o, t + 0.25, 0.25, 90, 40, 'sine', 0.8); this.noise(o, t + 0.25, 0.2, 500, 150, 1, 'lowpass', 0.5); },
  zombieAttack(x, f) { if (!this.gate('zatk', 0.12)) return; const s = this.spatial(x, f), t = this.ctx.currentTime, o = this.out(0.45 * s.vol + 0.1, s.pan, 0.1); this.noise(o, t, 0.15, 1800, 500, 1.5, 'bandpass', 0.8); this.tone(o, t, 0.12, 220, 110, 'sawtooth', 0.15); },
  hurt() { if (!this.gate('hurt', 0.25)) return; const t = this.ctx.currentTime, o = this.out(0.45, 0, 0.1); this.tone(o, t, 0.18, 260, 160, 'sawtooth', 0.25); this.tone(o, t, 0.25, 120, 60, 'sine', 0.7); },
  spit(x, f) { if (!this.gate('spit', 0.2)) return; const s = this.spatial(x, f), t = this.ctx.currentTime, o = this.out(0.35 * s.vol, s.pan, 0.1); this.noise(o, t, 0.3, 3000, 800, 3, 'bandpass', 0.8); },
  bossRoar() { if (!this.gate('roar', 1)) return; const c = this.ctx, t = c.currentTime, o = this.out(0.9, 0, 0.6); for (const f of [40, 52, 61]) this.tone(o, t, 2.2, f, f * 0.7, 'sawtooth', 0.35, 0.15); this.noise(o, t, 2.0, 700, 200, 0.7, 'lowpass', 0.6); },

  // ----- player & world -----
  step(outdoor) { if (!this.gate('step', 0.18)) return; const t = this.ctx.currentTime, o = this.out(0.78, 0, 0.05); this.noise(o, t, 0.07, outdoor ? 700 : 450, 150, 1.4, 'lowpass', 1); this.tone(o, t, 0.06, 90, 60, 'sine', 0.4); },
  rummage() { if (!this.gate('rummage', 0.33)) return; const t = this.ctx.currentTime, o = this.out(0.56, 0, 0.05); for (let i = 0; i < 3; i++) this.noise(o, t + i * 0.07, 0.07, 1500 + Math.random() * 2500, 800, 2, 'bandpass', 0.8); },
  found(good) { if (!this.gate('found', 0.15)) return; const t = this.ctx.currentTime, o = this.out(0.3, 0, 0.2); this.tone(o, t, 0.12, good ? 660 : 520, 0, 'triangle', 0.5); this.tone(o, t + 0.08, 0.2, good ? 990 : 660, 0, 'triangle', 0.4); },
  empty2() { if (!this.gate('nothing', 0.2)) return; const t = this.ctx.currentTime, o = this.out(0.54); this.tone(o, t, 0.15, 300, 200, 'triangle', 0.4); },
  pickup() { if (!this.gate('pickup', 0.08)) return; const t = this.ctx.currentTime, o = this.out(0.75); this.noise(o, t, 0.08, 1200, 600, 1.5); this.tone(o, t + 0.03, 0.08, 500, 700, 'triangle', 0.3); },
  coin() { if (!this.gate('coin', 0.1)) return; const t = this.ctx.currentTime, o = this.out(1.10, 0, 0.15); this.tone(o, t, 0.1, 1800, 0, 'square', 0.12); this.tone(o, t + 0.06, 0.2, 2400, 0, 'square', 0.1); },
  heal() { if (!this.gate('heal', 0.3)) return; const t = this.ctx.currentTime, o = this.out(0.25, 0, 0.3); [523, 659, 784].forEach((f, i) => this.tone(o, t + i * 0.07, 0.3, f, 0, 'sine', 0.4)); },
  eat() { if (!this.gate('eat', 0.3)) return; const t = this.ctx.currentTime, o = this.out(0.25); for (let i = 0; i < 3; i++) this.noise(o, t + i * 0.12, 0.08, 700, 300, 2, 'bandpass', 0.8); },
  woodHit(x, f, metal) {
    if (!this.gate('wood', 0.06)) return;
    const s = this.spatial(x, f), t = this.ctx.currentTime, o = this.out(0.5 * s.vol + 0.08, s.pan, 0.2);
    this.tone(o, t, 0.16, metal ? 320 : 160, metal ? 280 : 90, metal ? 'triangle' : 'sine', 0.8);
    this.noise(o, t, 0.12, metal ? 3500 : 1200, 400, metal ? 6 : 1.5, 'bandpass', 0.8);
    if (metal) this.tone(o, t, 0.35, 1250, 1180, 'sine', 0.12);
  },
  woodBreak(x, f) { if (!this.gate('wbreak', 0.2)) return; const s = this.spatial(x, f), t = this.ctx.currentTime, o = this.out(0.7 * s.vol + 0.1, s.pan, 0.3); for (let i = 0; i < 5; i++) this.noise(o, t + i * 0.045, 0.18, 1800 - i * 200, 300, 1.5, 'bandpass', 0.9); this.tone(o, t, 0.3, 110, 50, 'sine', 0.8); },
  hammer() { if (!this.gate('hammer', 0.25)) return; const t = this.ctx.currentTime, o = this.out(0.45, 0, 0.3); this.tone(o, t, 0.12, 700, 500, 'triangle', 0.6); this.noise(o, t, 0.06, 4000, 2000, 4, 'bandpass', 0.6); this.tone(o, t, 0.25, 140, 80, 'sine', 0.5); },
  built() { if (!this.gate('built', 0.3)) return; const t = this.ctx.currentTime, o = this.out(0.3, 0, 0.2); this.tone(o, t, 0.15, 392, 0, 'triangle', 0.4); this.tone(o, t + 0.1, 0.25, 587, 0, 'triangle', 0.4); },
  lockTick(ok) { if (!this.gate('ltick', 0.05)) return; const t = this.ctx.currentTime, o = this.out(1.05); if (ok) { this.tone(o, t, 0.06, 2600, 2200, 'square', 0.15); this.noise(o, t, 0.04, 5000, 4000, 8, 'bandpass', 0.6); } else { this.noise(o, t, 0.18, 2200, 900, 3, 'bandpass', 0.7); this.tone(o, t, 0.1, 400, 250, 'sawtooth', 0.1); } },
  lockBreak() { if (!this.gate('lbreak', 0.2)) return; const t = this.ctx.currentTime, o = this.out(0.90); this.noise(o, t, 0.08, 6000, 3000, 2, 'highpass', 1); this.tone(o, t, 0.1, 3000, 1200, 'square', 0.12); },
  unlock() { if (!this.gate('unlock', 0.3)) return; const t = this.ctx.currentTime, o = this.out(0.4, 0, 0.2); this.noise(o, t, 0.05, 2500, 2000, 6); this.tone(o, t + 0.05, 0.12, 900, 600, 'square', 0.15); this.tone(o, t + 0.15, 0.3, 1320, 0, 'triangle', 0.3); },
  doorBash(x, f) { this.woodHit(x, f, false); },
  hide() { if (!this.gate('hide', 0.3)) return; const t = this.ctx.currentTime, o = this.out(0.62, 0, 0.15); this.noise(o, t, 0.25, 900, 400, 1.2, 'bandpass', 0.8); this.tone(o, t + 0.15, 0.1, 160, 120, 'sine', 0.4); },
  rescue() { if (!this.gate('rescue', 0.5)) return; const t = this.ctx.currentTime, o = this.out(0.35, 0, 0.4); [440, 554, 659, 880].forEach((f, i) => this.tone(o, t + i * 0.1, 0.5, f, 0, 'triangle', 0.35)); },
  objective() { if (!this.gate('obj', 0.4)) return; const t = this.ctx.currentTime, o = this.out(0.35, 0, 0.4); [523, 784, 1046].forEach((f, i) => this.tone(o, t + i * 0.09, 0.45, f, 0, 'sine', 0.35)); },
  danger() { if (!this.gate('danger', 2)) return; const t = this.ctx.currentTime, o = this.out(0.6, 0, 0.6); this.tone(o, t, 2.2, 55, 48, 'sawtooth', 0.25, 0.3); this.tone(o, t, 2.2, 58, 50, 'sawtooth', 0.2, 0.3); this.noise(o, t, 1.8, 300, 80, 0.6, 'lowpass', 0.4); },
  waveWarn() { if (!this.gate('wwarn', 1)) return; const c = this.ctx, t = c.currentTime, o = this.out(0.28, 0, 0.6); const osc = c.createOscillator(); osc.type = 'sine'; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.3); g.gain.exponentialRampToValueAtTime(0.001, t + 3); osc.frequency.setValueAtTime(380, t); for (let i = 0; i < 3; i++) { osc.frequency.linearRampToValueAtTime(620, t + i + 0.5); osc.frequency.linearRampToValueAtTime(380, t + i + 1); } osc.connect(g); g.connect(o); osc.start(t); osc.stop(t + 3.1); },
  waveArrive() { if (!this.gate('warrive', 2)) return; for (let i = 0; i < 6; i++) setTimeout(() => { this.last.groan = 0; this.groan(Run.p ? Run.p.x + (Math.random() - 0.5) * 900 : 0, Run.p && Run.p.f, i % 3 ? 'walker' : 'brute'); }, i * 160); },
  death() { if (!this.ok) return; const t = this.ctx.currentTime, o = this.out(0.6, 0, 0.8); [220, 207, 196, 147].forEach((f, i) => this.tone(o, t + i * 0.35, 1.2, f, f * 0.98, 'triangle', 0.35, 0.05)); this.tone(o, t, 3, 55, 40, 'sine', 0.6, 0.2); },
  victory() { if (!this.ok) return; const t = this.ctx.currentTime, o = this.out(0.45, 0, 0.6); [392, 523, 659, 784].forEach((f, i) => this.tone(o, t + i * 0.14, 0.9, f, 0, 'triangle', 0.35, 0.02)); },
  ui(kind) { if (!this.gate('ui', 0.04)) return; const t = this.ctx.currentTime, o = this.out(0.81); if (kind === 'tab') { this.tone(o, t, 0.05, 900, 700, 'square', 0.1); this.noise(o, t, 0.03, 3000, 2000, 3, 'bandpass', 0.4); } else { this.noise(o, t, 0.03, 2500, 1800, 4, 'bandpass', 0.7); this.tone(o, t, 0.04, 600, 450, 'square', 0.08); } },
};

// ---------- adaptive music: drone + sparse melody + heartbeat/percussion driven by tension ----------
const Music = {
  mode: 'title', tension: 0, timer: null, nextNote: 0, beat: 0, drone: null,
  scales: { title: [57, 60, 62, 64, 67, 69, 72], base: [52, 55, 57, 59, 62, 64, 67], run: [45, 48, 50, 51, 53, 55, 57] },
  start() {
    if (this.timer) return;
    const c = Snd.ctx;
    // two detuned saw drones through a slow low-pass sweep
    const g = c.createGain(); g.gain.value = 0.0001; g.connect(Snd.musicBus);
    const send = c.createGain(); send.gain.value = 0.5; g.connect(send); send.connect(Snd.musicSend);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; lp.Q.value = 3; lp.connect(g);
    const oscs = [0, 7, -12].map((d, i) => { const o = c.createOscillator(); o.type = i === 2 ? 'sine' : 'sawtooth'; o.detune.value = (i ? 1 : -1) * 7; const og = c.createGain(); og.gain.value = i === 2 ? 0.5 : 0.18; o.connect(og); og.connect(lp); o.start(); return o; });
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.05; lg.gain.value = 250; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    this.drone = { g, lp, oscs };
    this.setRoot();
    this.nextNote = c.currentTime + 0.5;
    this.timer = setInterval(() => this.tick(), 100);
  },
  setMode(m) { if (this.mode === m) return; this.mode = m; this.setRoot(); },
  setRoot() {
    if (!this.drone) return;
    const c = Snd.ctx, t = c.currentTime, root = this.mode === 'run' ? 33 : this.mode === 'base' ? 40 : 45;
    const hz = n => 440 * Math.pow(2, (n - 69) / 12);
    this.drone.oscs[0].frequency.setTargetAtTime(hz(root), t, 1.5);
    this.drone.oscs[1].frequency.setTargetAtTime(hz(root + 7), t, 1.5);
    this.drone.oscs[2].frequency.setTargetAtTime(hz(root - 12 + 12), t, 1.5);
    this.drone.g.gain.setTargetAtTime(this.mode === 'base' ? 0.16 : 0.22, t, 2);
  },
  tick() {
    if (!Snd.ok) return;
    const c = Snd.ctx, now = c.currentTime;
    // tension from the run state
    let want = 0;
    if (this.mode === 'run' && Run.active && Run.p) {
      want = Math.min(1, Run.chasers / 6) * 0.6 + Math.min(0.3, (Run.level - 1) * 0.04) + (Run.waveT < 15 ? 0.25 : 0) + (Run.boss && !Run.boss.dead ? 0.5 : 0);
      if (Run.p.hidden) want *= 0.4;
    }
    this.tension += (Math.min(1, want) - this.tension) * 0.05;
    this.drone.lp.frequency.setTargetAtTime(350 + this.tension * 900, now, 0.5);
    const hp = Run.active && Run.p ? Run.p.hp / Run.p.maxHp : 1;
    while (this.nextNote < now + 0.25) {
      const t = this.nextNote, T = this.tension;
      const bpm = this.mode === 'run' ? 62 + T * 58 : 60, step = 60 / bpm / 2;
      this.beat++;
      if (this.mode === 'run') {
        if (T > 0.3 && this.beat % 2 === 0) this.drum(t, 0.25 + T * 0.35, this.beat % 8 === 0);            // tribal toms as it gets dangerous
        if (T > 0.6 && this.beat % 2 === 1) this.hat(t, 0.08 * T);
        if (hp < 0.35 && this.beat % 4 === 0) this.heartbeat(t);
      }
      const rate = this.mode === 'run' ? 0.12 + T * 0.1 : this.mode === 'base' ? 0.18 : 0.22;
      if (Math.random() < rate) this.pluck(t, this.pick());
      if (Math.random() < 0.04) this.pad(t);
      this.nextNote += step;
    }
  },
  pick() { const s = this.scales[this.mode] || this.scales.title; return s[Math.floor(Math.random() * s.length)] + (Math.random() < 0.25 ? 12 : 0); },
  hz(n) { return 440 * Math.pow(2, (n - 69) / 12); },
  pluck(t, n) {
    const c = Snd.ctx, g = c.createGain(); g.connect(Snd.musicBus); const s = c.createGain(); s.gain.value = 0.7; g.connect(s); s.connect(Snd.musicSend);
    const f = this.hz(n), o1 = c.createOscillator(), o2 = c.createOscillator(); o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = f; o2.frequency.value = f * 2.005;
    const og2 = c.createGain(); og2.gain.value = 0.25; o2.connect(og2); og2.connect(g); o1.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + 2.6);
    o1.start(t); o2.start(t); o1.stop(t + 2.7); o2.stop(t + 2.7);
  },
  pad(t) {
    const c = Snd.ctx, s = this.scales[this.mode] || this.scales.title, root = s[0] - 12;
    const g = c.createGain(); g.connect(Snd.musicBus); const sd = c.createGain(); sd.gain.value = 0.8; g.connect(sd); sd.connect(Snd.musicSend);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 2); g.gain.exponentialRampToValueAtTime(0.0005, t + 7);
    for (const iv of [0, 3, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.hz(root + iv); o.detune.value = Math.random() * 14 - 7; o.connect(lp); o.start(t); o.stop(t + 7.2); }
  },
  drum(t, vol, accent) {
    const c = Snd.ctx, g = c.createGain(); g.connect(Snd.musicBus);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(accent ? 95 : 75, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.4);
    o.connect(g); o.start(t); o.stop(t + 0.45);
  },
  hat(t, vol) { const c = Snd.ctx, g = c.createGain(); g.connect(Snd.musicBus); Snd.noise(g, t, 0.05, 8000, 6000, 0.7, 'highpass', vol); },
  heartbeat(t) { this.drum(t, 0.5, false); this.drum(t + 0.22, 0.35, false); },
};

// unlock audio on the first interaction, and click sounds for every UI button
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => Snd.init(), { capture: true }));
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (b && !b.disabled) Snd.ui(b.classList.contains('tab') ? 'tab' : 'click'); }, true);
// M toggles mute anywhere
window.addEventListener('keydown', e => {
  if (e.code !== 'KeyM' || e.repeat) return;
  Settings.v.mute = !Settings.v.mute; Settings.save();
  if (typeof toast === 'function') toast(Settings.v.mute ? '🔇 ปิดเสียง (กด M เพื่อเปิด)' : '🔊 เปิดเสียง');
});
