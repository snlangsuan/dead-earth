// ---------- Animated menu backdrop (title / character select / base) ----------
// Ruined skyline at night, burning horizon, drifting ash and a slow horde walking past.
const MenuFX = {
  t: 0, ash: null, horde: null, mode: 'title',
  init() {
    const r = U.rng(7);
    this.ash = Array.from({ length: 90 }, () => ({ x: r(), y: r(), s: 0.6 + r() * 2.2, v: 0.2 + r() * 0.6, ph: r() * 6, hot: r() < 0.25 }));
    this.horde = Array.from({ length: 9 }, (_, i) => this.newZ(r, r() * 1.4 - 0.2));
  },
  newZ(r, x) {
    const types = ['zombie_walker0', 'zombie_walker1', 'zombie_walker0', 'zombie_runner', 'zombie_brute'];
    return { x, depth: r(), type: types[Math.floor(r() * types.length)], ph: r() * 4, spd: 0.012 + r() * 0.014 };
  },
  draw(R, dt) {
    if (!this.ash) this.init();
    this.t += dt;
    const ctx = R.ctx, W = R.W, H = R.H, t = this.t;
    const key = Override.get(this.mode === 'base' ? 'ui_base' : 'ui_title');
    if (key) {
      // painted key art (Gemini) — cover-fit with a slow drift
      const k = Math.max(W / key.naturalWidth, H / key.naturalHeight) * 1.06;
      const dw = key.naturalWidth * k, dh = key.naturalHeight * k;
      ctx.drawImage(key, (W - dw) / 2 + Math.sin(t * 0.05) * 12, (H - dh) / 2, dw, dh);
      ctx.fillStyle = this.mode === 'base' ? 'rgba(6,7,9,0.5)' : 'rgba(6,7,9,0.15)'; ctx.fillRect(0, 0, W, H);
      if (this.mode !== 'base') { // darken the left side where the logo + menu sit
        const lg = ctx.createLinearGradient(0, 0, W * 0.7, 0); lg.addColorStop(0, 'rgba(5,6,8,0.88)'); lg.addColorStop(0.55, 'rgba(5,6,8,0.55)'); lg.addColorStop(1, 'rgba(5,6,8,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
      }
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#07090d'); g.addColorStop(0.55, '#1a1418'); g.addColorStop(0.78, '#4a2216'); g.addColorStop(1, '#120c0b');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (const s of R.stars) { ctx.globalAlpha = 0.25 + 0.3 * Math.sin(t * 1.2 + s.tw); ctx.fillStyle = '#fff'; ctx.fillRect(s.x * W, s.y * H * 0.7, s.s, s.s); }
      ctx.globalAlpha = 1;
      // blood moon
      const mx = W * 0.78, my = H * 0.2;
      const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 160); mg.addColorStop(0, 'rgba(255,120,80,0.28)'); mg.addColorStop(1, 'rgba(255,120,80,0)');
      ctx.fillStyle = mg; ctx.fillRect(mx - 160, my - 160, 320, 320);
      ctx.fillStyle = '#e8a080'; ctx.beginPath(); ctx.arc(mx, my, 38, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(120,40,30,0.25)'; ctx.beginPath(); ctx.arc(mx - 10, my - 8, 9, 0, 7); ctx.arc(mx + 12, my + 10, 6, 0, 7); ctx.fill();
      // skyline layers
      const horizon = H * 0.8;
      [[0, 0.006, 1.25, 'brightness(0.55)'], [1, 0.014, 1.45, 'brightness(0.35)']].forEach(([L, par, sc]) => {
        const sk = Art.skyline('city', L);
        if (!sk || !sk.img.complete || !sk.img.naturalWidth) return;
        const tw = sk.w * sc, th = sk.h * sc, off = -((t * par * 1000) % tw);
        for (let x = off; x < W; x += tw - 1) Art.draw(ctx, sk, x, horizon - th + (L ? 20 : -20), tw, th);
      });
      // fire glow on the horizon
      const fg = ctx.createLinearGradient(0, horizon - 160, 0, horizon + 20);
      fg.addColorStop(0, 'rgba(255,90,30,0)'); fg.addColorStop(1, `rgba(255,90,30,${0.22 + 0.05 * Math.sin(t * 2.3)})`);
      ctx.fillStyle = fg; ctx.fillRect(0, horizon - 160, W, 180);
      // ground
      const gg = ctx.createLinearGradient(0, horizon, 0, H); gg.addColorStop(0, '#16100e'); gg.addColorStop(1, '#070506');
      ctx.fillStyle = gg; ctx.fillRect(0, horizon, W, H - horizon);
      ctx.fillStyle = 'rgba(255,140,80,0.06)'; ctx.fillRect(0, horizon, W, 2);
      // horde
      const base = horizon + 26, zsc = Math.max(0.9, H / 520);
      this.horde.sort((a, b) => a.depth - b.depth);
      for (const z of this.horde) {
        z.x -= z.spd * dt * (z.type === 'zombie_runner' ? 1.8 : 1);
        if (z.x < -0.15) Object.assign(z, this.newZ(Math.random, 1.1 + Math.random() * 0.3));
        const sx = z.x * W, sy = base + z.depth * (H - base - 30), s = zsc * (0.7 + z.depth * 0.6);
        const frame = Sprites.walkKey(z.type, (t + z.ph) * 4);
        const bright = (Math.round((0.18 + z.depth * 0.25) * 20) / 20).toFixed(2);
        ctx.save(); ctx.globalAlpha = 0.95;
        if (Sprites.meta(frame) && Override.get(frame)) Sprites.draw(ctx, frame, sx, sy, -1, s, `brightness(${bright}) saturate(0.4)`);
        ctx.restore();
      }
    }
    // ash / embers
    for (const a of this.ash) {
      const x = ((a.x + Math.sin(t * 0.3 + a.ph) * 0.02 - t * 0.01 * a.v) % 1 + 1) % 1 * W;
      const y = ((a.y - t * 0.03 * a.v) % 1 + 1) % 1 * H;
      ctx.fillStyle = a.hot ? `rgba(255,${120 + 60 * Math.sin(t * 3 + a.ph) | 0},60,0.7)` : 'rgba(200,190,180,0.25)';
      ctx.fillRect(x, y, a.s, a.s);
    }
    // vignette + film grain lines
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  },
};
