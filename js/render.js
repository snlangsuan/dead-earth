// ---------- Rendering ----------
const CHAR_SCALE = 0.86;
const aimTilt = a => U.clamp(a, -0.35, 0.35) * 0.6;
// ---------- frame sprites (Gemini) ----------
const SPR_PPU = 3;
// ctx.filter is re-evaluated on every draw call and is very slow; bake each (image, filter) once
const FilterCache = {
  get(img, f) {
    if (!f || f === 'none' || !img) return img;
    const c = img._fc || (img._fc = {});
    if (c[f]) return c[f];
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h) return img;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d'); x.filter = f; x.drawImage(img, 0, 0);
    return (c[f] = cv);
  },
};
// walking bob: body dips at each footfall (2 frames per step)
const stepBob = (phase, amp) => -Math.abs(Math.sin(phase * Math.PI / 2)) * amp;
const Sprites = {
  meta(key) { return window.SPRITE_META && window.SPRITE_META[key]; },
  has(base) { return !!(this.meta(base + '_walk_0') && Override.has(base + '_walk_0')); },
  _wn: {},
  walkN(base) { // frames in this walk cycle (4 = old sheets, 6 = pose-guided frames)
    let n = this._wn[base]; if (n) return n;
    n = 0; while (this.meta(base + '_walk_' + n)) n++;
    return (this._wn[base] = Math.max(1, n));
  },
  // ph: 4 units per full cycle (two steps), whatever the frame count
  walkKey(base, ph) { const n = this.walkN(base); return base + '_walk_' + (((Math.floor(ph * n / 4) % n) + n) % n); },
  draw(ctx, key, x, y, facing, scale, filter, lean) {
    const m = this.meta(key), img = Override.get(key);
    if (!m || !img) return false;
    const k = scale / SPR_PPU;
    ctx.save(); ctx.translate(x, y); if (lean) ctx.rotate(facing * lean); ctx.scale(facing * k, k);
    ctx.drawImage(FilterCache.get(img, filter), -m.ax, -m.ay);
    ctx.restore();
    return true;
  },
  // upper body from one frame, legs from a walk frame swinging around the hips (pendulum stride)
  drawSplit(ctx, upKey, legKey, x, y, facing, scale, filter, phase, amp) {
    const mu = this.meta(upKey), ml = this.meta(legKey), iu = Override.get(upKey), il = Override.get(legKey);
    if (!mu || !ml || !iu || !il || (upKey === legKey && !amp)) return this.draw(ctx, upKey, x, y, facing, scale, filter);
    const k = scale / SPR_PPU, hipU = mu.ay - mu.h * 0.44, hipL = ml.ay - ml.h * 0.44;
    const sw = Math.sin(phase * Math.PI) * (amp || 0);
    // legs
    ctx.save(); ctx.translate(x, y); ctx.scale(facing * k, k);
    const hl = hipL - ml.ay;
    ctx.beginPath(); ctx.rect(-ml.ax - 40, hl - 6, ml.w + 80, -hl + 20); ctx.clip();
    ctx.translate(0, hl); ctx.transform(1, 0, sw, 1, 0, 0); ctx.translate(0, -hl);
    ctx.drawImage(FilterCache.get(il, filter), -ml.ax, -ml.ay);
    ctx.restore();
    // upper body (slight overlap at the hips hides the seam)
    ctx.save(); ctx.translate(x, y); ctx.scale(facing * k, k);
    ctx.beginPath(); ctx.rect(-mu.ax - 200, -mu.ay - 40, mu.w + 400, mu.ay - (mu.ay - hipU) + 40 + 2); ctx.clip();
    ctx.drawImage(FilterCache.get(iu, filter), -mu.ax, -mu.ay);
    ctx.restore();
    return true;
  },
  shadow(ctx, x, y, w) { ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(x, y, w, 4.5, 0, 0, 7); ctx.fill(); },
  muzzle(base, pistol, scale) {
    const m = this.meta(base + (pistol ? '_pistol' : '_gun'));
    if (!m || m.mx == null) return null;
    return { dx: (m.mx - m.ax) / SPR_PPU * scale, dy: (m.ay - m.my) / SPR_PPU * scale };
  },
};
const FURN_TOPS = { desk: [4, '#8a6440'], counter: [2, '#b0aaa0'], labtable: [4, '#d8dde0'], toolbench: [0, '#8a6440'], register: [10, '#6a7078'], crate: [1, '#a88050'], dumpster: [6, '#2e6a40'], safe: [1, '#7a7e82'], filecab: [1, '#9aa2aa'], fridge: [1, '#d0d8dc'], stove: [1, '#5a6066'], medcab: [1, '#d8dde0'], wardrobe: [0, '#6a4a2a'], locker: [1, '#5f7186'], bookshelf: [1, '#5a3e26'], shelfunit: [1, '#6a7078'], server: [1, '#2a2f35'], tvstand: [38, '#5a4030'], weaponrack: [1, '#3a3326'], generator: [14, '#9a7a20'], supply: [6, '#2a70a0'] };
// body-size correction for the upright roar frame (Gemini drew it larger than the hunched idle)
// where the rear hand holds each painted gun (pixels in assets/sprites/wpn_<id>.png): pistol grip / stock wrist
const WPN_GRIP = { smg: [52, 17], shotgun: [55, 13], rifle: [47, 16], sniper: [48, 15], crossbow: [33, 46], pistol: [20, 32], revolver: [22, 38] };
const ROAR_FIX = { walker: 0.97, runner: 0.92, spitter: 0.97, brute: 0.84, boss: 0.88 };
const R = {
  cv: null, ctx: null, W: 0, H: 0, cam: null, dpr: 1, stars: null,
  init(cv) {
    this.cv = cv; this.ctx = cv.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
    const r = U.rng(42);
    this.stars = Array.from({ length: 120 }, () => ({ x: r(), y: r() * 0.6, s: r() * 1.5 + 0.3, tw: r() * 6 }));
    this.snow = Array.from({ length: 140 }, () => ({ x: r(), y: r(), s: r() * 2 + 1, v: r() * 0.5 + 0.5 }));
  },
  // adaptive resolution: drop canvas DPR when frames are slow, raise it again when there is headroom
  q: 1, ema: 1 / 60, qT: 0,
  perf(raw) {
    if (raw > 0.25) return; // tab was hidden / paused
    this.ema += (raw - this.ema) * 0.05; this.qT += raw;
    if (this.qT < 2) return;
    const max = Math.min(2, window.devicePixelRatio || 1);
    if (this.ema > 1 / 45 && this.q > 0.5) { this.q = Math.max(0.5, this.q - 0.25); this.qT = 0; this.resize(); }
    else if (this.ema < 1 / 58 && this.q < 1 && this.qT > 6) { this.q = Math.min(1, this.q + 0.25); this.qT = 0; this.resize(); }
  },
  resize() {
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1) * this.q);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
  },
  screenToWorld(sx, sy) { const c = this.cam; return { x: (sx - this.W / 2) / c.z + c.x, y: (sy - this.H / 2) / c.z + c.y }; },

  frame(run, dt) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!run || !run.map) { MenuFX.draw(this, dt); return; }
    const p = run.p, map = run.map;
    const z = U.clamp(this.H / (FH * 2.55), 0.5, 1.5);
    this.look = (this.look || 0) + ((p.hidden ? 0 : p.facing * 90) - (this.look || 0)) * Math.min(1, dt * 2.5);
    const tx = p.x + this.look, ty = run.yOf(p) - FH * 0.42;
    if (!this.cam) this.cam = { x: tx, y: ty, z };
    this.cam.z = z;
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 6);
    this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 6);
    const halfW = this.W / 2 / z, halfH = this.H / 2 / z;
    this.cam.x = U.clamp(this.cam.x, -STREET + halfW * 0.6, map.BW + STREET - halfW * 0.6);
    this.cam.y = U.clamp(this.cam.y, floorY(map.F) - FH * 0.9 + halfH * 0.2, 140 - halfH * 0.2 + 60);
    const sh = Settings.v.shake ? run.shake : 0;
    const cx = this.cam.x + (sh ? U.rf(Math.random, -sh, sh) : 0), cy = this.cam.y + (sh ? U.rf(Math.random, -sh, sh) : 0);

    this.drawSky(run);
    ctx.save();
    ctx.translate(this.W / 2, this.H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy);
    this.view = { x0: cx - halfW - 50, x1: cx + halfW + 50, y0: cy - halfH - 50, y1: cy + halfH + 50 };
    this.drawGround(run);
    this.drawBuildingMass(run);
    const curRoom = run.navRoom(p);
    for (const rm of map.rooms) if (this.inView(rm)) this.drawRoomBack(run, rm, rm.id === curRoom);
    this.drawStructure(run);
    for (const rm of map.rooms) if (rm.revealed && this.inView(rm)) for (const fu of rm.furn) this.drawFurn(run, fu, rm);
    this.drawLadders(run);
    // entities stand slightly in front of the floor's back edge
    ctx.save(); ctx.translate(0, -FEET);
    if (run.survivor && run.survivor.state !== 'gone' && map.rooms[run.survivor.room].revealed) this.drawSurvivor(run, run.survivor);
    const zs = run.zombies.slice().sort((a, b) => (a.dead ? 0 : 1) - (b.dead ? 0 : 1) || a.depth - b.depth);
    for (const zm of zs) {
      const rm = map.rooms[zm.climb ? run.navRoom(zm) : zm.room];
      if (!rm.revealed && !run.powered) continue;
      this.drawZombie(run, zm);
    }
    this.drawPlayer(run);
    this.drawProjectiles(run);
    ctx.restore();
    // dim rooms the player is not in
    for (const rm of map.rooms) {
      if (!this.inView(rm) || rm.outdoor || !rm.revealed || rm.id === curRoom) continue;
      const bx = this.roomBox(rm);
      ctx.fillStyle = 'rgba(4,6,10,0.45)'; ctx.fillRect(bx.bx0, bx.by0, bx.bx1 - bx.bx0, bx.by1 - bx.by0);
    }
    this.drawDoors(run);
    this.drawExits(run);
    this.drawBarricades(run);
    this.drawTraps(run);
    ctx.save(); ctx.translate(0, -FEET);
    this.drawParticles(run);
    this.drawWorldUI(run);
    ctx.restore();
    ctx.restore();
    this.drawWeatherFx(run);
    this.drawVignette(run);
    this.drawHUD(run);
  },
  inView(rm) { const v = this.view; const y1 = floorY(rm.f), y0 = y1 - FH; return rm.x1 > v.x0 && rm.x0 < v.x1 && y1 > v.y0 && y0 < v.y1; },

  // ---------- background ----------
  drawSky(run) {
    const ctx = this.ctx, bg = THEMES[run.loc.theme].bg;
    const pal = {
      city: ['#0d1426', '#1f2540', '#3a2f45'], open: ['#0e1830', '#22304d', '#3d4060'], sea: ['#0a1428', '#1a2b4a', '#2f4058'],
      forest: ['#08141a', '#14262a', '#24382f'], snow: ['#1a2638', '#3a4c66', '#6d7f99'], desert: ['#1d1430', '#5a2f3f', '#b0603a'],
    }[bg] || ['#0d1426', '#1f2540', '#3a2f45'];
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, pal[0]); g.addColorStop(0.6, pal[1]); g.addColorStop(1, pal[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);
    const t = run.time;
    for (const s of this.stars) { ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 1.5 + s.tw); ctx.fillStyle = '#fff'; ctx.fillRect(s.x * this.W, s.y * this.H, s.s, s.s); }
    ctx.globalAlpha = 1;
    // moon
    const mx = this.W * 0.82 - this.cam.x * 0.02, my = this.H * 0.16;
    const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 120); mg.addColorStop(0, 'rgba(255,240,210,0.35)'); mg.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = mg; ctx.fillRect(mx - 120, my - 120, 240, 240);
    ctx.fillStyle = bg === 'desert' ? '#ffcf9a' : '#f3ecd8'; ctx.beginPath(); ctx.arc(mx, my, 30, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.beginPath(); ctx.arc(mx - 8, my - 6, 7, 0, 7); ctx.arc(mx + 10, my + 8, 5, 0, 7); ctx.fill();
    // parallax silhouettes
    const horizon = this.H / 2 + (0 - this.cam.y) * this.cam.z;
    const kind = bg === 'sea' || bg === 'open' ? (bg === 'open' ? 'open' : 'city') : bg;
    const zz = this.cam.z;
    [[0, 0.08], [1, 0.2]].forEach(([L, par]) => {
      const t = Art.skyline(kind, L);
      if (!t.img.complete || !t.img.naturalWidth) return;
      const tw = t.w * zz * (L ? 1 : 0.85), th = t.h * zz * (L ? 1 : 0.85);
      const off = ((-this.cam.x * zz * par) % tw + tw) % tw - tw;
      for (let x = off; x < this.W; x += tw - 1) Art.draw(ctx, t, x, horizon - th + (L ? 10 : -30) * zz, tw, th);
    });
    if (bg === 'sea') { const gsea = ctx.createLinearGradient(0, horizon - 20 * zz, 0, horizon + 40 * zz); gsea.addColorStop(0, '#13263e'); gsea.addColorStop(1, '#081420'); ctx.fillStyle = gsea; ctx.fillRect(0, horizon - 20 * zz, this.W, 80 * zz); ctx.fillStyle = 'rgba(255,240,200,0.12)'; for (let i = 0; i < 20; i++) ctx.fillRect((i * 97 + this.cam.x * -0.1) % this.W, horizon - 10 * zz + (i % 4) * 6, 30, 2); }
    // low fog
    const fg = ctx.createLinearGradient(0, horizon - 120 * zz, 0, horizon);
    fg.addColorStop(0, 'rgba(120,130,160,0)'); fg.addColorStop(1, 'rgba(120,130,160,0.12)');
    ctx.fillStyle = fg; ctx.fillRect(0, horizon - 120 * zz, this.W, 120 * zz);
  },
  drawGround(run) {
    const ctx = this.ctx, map = run.map, v = this.view;
    const bg = THEMES[run.loc.theme].bg;
    const top = { snow: '#dfe7ef', desert: '#c9a46a', forest: '#3a5a2a' }[bg] || '#3d4249';
    const soil = { snow: '#7a8794', desert: '#8a6a40', forest: '#3a2a1a' }[bg] || '#2a221c';
    const gs = ctx.createLinearGradient(0, SLAB, 0, SLAB + 500);
    gs.addColorStop(0, soil); gs.addColorStop(1, '#0c0a08');
    ctx.fillStyle = gs; ctx.fillRect(v.x0, SLAB, v.x1 - v.x0, v.y1 - SLAB + 500);
    // rocks & roots in soil
    const r = U.rng(77);
    for (let i = 0; i < 90; i++) {
      const x = -STREET - 400 + r() * (map.BW + STREET * 2 + 800), y = SLAB + 30 + r() * 300, s = 4 + r() * 10;
      if (x < v.x0 - 20 || x > v.x1 + 20) continue;
      ctx.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.04})`; ctx.beginPath(); ctx.ellipse(x, y, s * 1.4, s, r() * 3, 0, 7); ctx.fill();
    }
    // building foundation
    ctx.fillStyle = '#23272c'; ctx.fillRect(-WALL, SLAB, map.BW + WALL * 2, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; for (let x = 0; x < map.BW; x += 40) ctx.fillRect(x, SLAB + 2, 38, 10);
    // streets: asphalt + curb + sidewalk
    for (const st of [map.streetL, map.streetR]) {
      // the road surface starts a bit BEHIND the actors' feet (y=0) so they visibly stand on the asphalt, not on its back edge
      const RT0 = -18, ag = ctx.createLinearGradient(0, RT0, 0, SLAB + 10);
      ag.addColorStop(0, bg === 'snow' ? '#c8d2dc' : bg === 'desert' ? '#a0825a' : '#3a3e45'); ag.addColorStop(1, bg === 'snow' ? '#a8b4c0' : bg === 'desert' ? '#7a6040' : '#25282d');
      ctx.fillStyle = ag; ctx.fillRect(st.x0, RT0, st.x1 - st.x0, SLAB + 10 - RT0);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(st.x0, RT0, st.x1 - st.x0, 3); // far kerb edge
      ctx.fillStyle = 'rgba(255,220,120,0.5)';
      for (let x = st.x0 + 20; x < st.x1 - 40; x += 80) ctx.fillRect(x, -8, 40, 3);
      ctx.fillStyle = '#6a6e75'; const cx = st === map.streetL ? st.x1 - 40 : st.x0; ctx.fillRect(cx, RT0 - 2, 40, 6);
      // cracks instead of dark blobs (dark ellipses on the road read as character shadows)
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 7; i++) { const px = st.x0 + r() * (st.x1 - st.x0), py = -12 + r() * 22; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 8 + r() * 10, py + r() * 3 - 1.5); ctx.lineTo(px + 16 + r() * 14, py + r() * 4 - 2); ctx.stroke(); }
    }
    ctx.fillStyle = top; ctx.fillRect(v.x0, -2, Math.max(0, -STREET - v.x0), 6); ctx.fillRect(map.BW + STREET, -2, Math.max(0, v.x1 - map.BW - STREET), 6);
  },

  // ---------- rooms ----------
  drawRoomBack(run, rm, current) {
    const ctx = this.ctx;
    const y1 = floorY(rm.f), y0 = y1 - FH + SLAB;
    const RT = ROOM_TYPES[rm.type];
    if (rm.outdoor) {
      if (rm.type === 'street') {
        // sidewalk & streetlamp glow
        ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(rm.x0, y1 - 8, rm.x1 - rm.x0, 8);
      } else {
        // roof parapet line
        ctx.fillStyle = '#2b2f36'; ctx.fillRect(rm.x0, y1 - 2, rm.x1 - rm.x0, 4);
      }
      return;
    }
    if (!rm.revealed) return;
    const ix0 = rm.x0 + WALL / 2, ix1 = rm.x1 - WALL / 2, w = ix1 - ix0, h = y1 - y0;
    const tint = U.mix(RT.tint, '#3c4a54', 0.35);
    const base = U.shade(tint, -6 + ((rm.seed % 16) - 8));
    const g0 = ctx.createLinearGradient(0, y0, 0, y1);
    g0.addColorStop(0, U.shade(base, -18)); g0.addColorStop(0.5, base); g0.addColorStop(1, U.shade(base, -10));
    ctx.fillStyle = g0; ctx.fillRect(ix0, y0, w, h);
    const r = U.rng(rm.seed);
    ctx.save(); ctx.beginPath(); ctx.rect(ix0, y0, w, h); ctx.clip();
    const pat = Art.wallPattern(ctx, RT.paper);
    if (pat) { ctx.fillStyle = pat; ctx.fillRect(ix0, y0, w, h); }
    if (RT.paper === 'panel' || RT.paper === 'stripe') {
      // wainscot lower panel
      const wy = y1 - h * 0.34;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(ix0, wy, w, y1 - wy);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(ix0, wy, w, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(ix0, wy + 3, w, 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2;
      for (let x = ix0 + 30; x < ix1; x += 60) ctx.strokeRect(x - 22, wy + 12, 44, y1 - wy - 26);
    }
    // grime & stains
    for (let i = 0; i < 5; i++) {
      const gx = ix0 + r() * w, gy = y0 + r() * h * 0.7, gr = 30 + r() * 70;
      const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      gg.addColorStop(0, `rgba(20,16,10,${0.10 + r() * 0.12})`); gg.addColorStop(1, 'rgba(20,16,10,0)');
      ctx.fillStyle = gg; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    // water drips from ceiling
    for (let i = 0; i < 2; i++) { const dx = ix0 + r() * w, dl = 30 + r() * 60; const gd = ctx.createLinearGradient(0, y0, 0, y0 + dl); gd.addColorStop(0, 'rgba(30,24,14,0.35)'); gd.addColorStop(1, 'rgba(30,24,14,0)'); ctx.fillStyle = gd; ctx.fillRect(dx, y0, 6 + r() * 10, dl); }
    // cracks
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) { let x = ix0 + r() * w, y = y0 + r() * 30; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += r() * 16; ctx.lineTo(x, y); if (r() < 0.3) { ctx.moveTo(x, y); } } ctx.stroke(); }
    // wall decorations (illustrated)
    const slots = [];
    const putDeco = (k, v, x, y) => { const d = Art.deco(k, v); Art.draw(ctx, d, x, y); slots.push(x); };
    if (rm.windows) { const nW = Math.max(1, Math.floor(w / 280)); for (let i = 0; i < nW; i++) putDeco('window', rm.seed + i, ix0 + (i + 0.5) * (w / nW) - 40, y0 + 34); }
    const extra = U.pick(r, ['picture', 'poster', 'clock', 'picture', 'shelf', 'ac', null]);
    if (extra) { const ew = { picture: 54, poster: 40, clock: 32, shelf: 70, ac: 70 }[extra]; let ex = ix0 + 20 + r() * (w - ew - 40); if (!slots.some(sx => Math.abs(sx + 40 - (ex + ew / 2)) < 80)) putDeco(extra, rm.seed >> 3, ex, extra === 'ac' ? y0 + 14 : y0 + 46); }
    if (r() < 0.35) Art.draw(ctx, Art.deco('pipe', 0), ix0, y0 + 2, Math.min(w, 120), 16);
    // blood
    for (const b of rm.blood) {
      ctx.fillStyle = 'rgba(110,10,10,0.75)';
      if (b.wall) { const bx = b.x, by = y0 + h * b.y * 0.8; ctx.beginPath(); ctx.ellipse(bx, by, 14 * b.s, 10 * b.s, 0, 0, 7); ctx.fill(); for (let k = 0; k < 3; k++) ctx.fillRect(bx - 8 + k * 7, by, 2.5, 18 * b.s + k * 6); }
      else { ctx.beginPath(); ctx.ellipse(b.x, y1 - 2, 28 * b.s, 4 * b.s, 0, 0, 7); ctx.fill(); }
    }
    // baseboard
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(ix0, y1 - 8, w, 8);
    // ceiling lamp + light cone
    const lit = !rm.dark || run.powered;
    const flick = rm.dark ? 0 : (Math.sin(run.time * 13 + rm.seed) > 0.97 ? 0.4 : 1);
    const lxs = w > 400 ? [ix0 + w * 0.3, ix0 + w * 0.7] : [ix0 + w / 2];
    for (const lx of lxs) {
      ctx.fillStyle = '#222'; ctx.fillRect(lx - 1, y0, 2, 14);
      ctx.fillStyle = lit ? '#ffe9b0' : '#555'; ctx.beginPath(); ctx.ellipse(lx, y0 + 16, 14, 5, 0, 0, 7); ctx.fill();
      if (lit) {
        const g = ctx.createRadialGradient(lx, y0 + 16, 4, lx, y0 + h * 0.7, h * 0.9);
        g.addColorStop(0, `rgba(255,230,170,${0.22 * flick})`); g.addColorStop(1, 'rgba(255,230,170,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx - 12, y0 + 18); ctx.lineTo(lx + 12, y0 + 18); ctx.lineTo(lx + 150, y1); ctx.lineTo(lx - 150, y1); ctx.fill();
      }
    }
    if (!lit) { ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(ix0, y0, w, h); }
    ctx.restore();
  },

  drawStructure(run) {
    const ctx = this.ctx, map = run.map, T = THEMES[run.loc.theme];
    const wallC = U.mix(T.wall, '#262c33', 0.5), wallD = U.mix(T.wall, '#181c21', 0.7), slabC = U.mix(T.wall, '#1e2328', 0.65);
    // slabs
    for (let f = 1; f <= map.F; f++) {
      const y = floorY(f);
      const sg = ctx.createLinearGradient(0, y, 0, y + SLAB);
      sg.addColorStop(0, U.shade(slabC, 22)); sg.addColorStop(0.25, slabC); sg.addColorStop(1, U.shade(slabC, -18));
      ctx.fillStyle = sg; ctx.fillRect(-WALL / 2 - 4, y, map.BW + WALL + 8, SLAB);
      ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.strokeRect(-WALL / 2 - 4, y, map.BW + WALL + 8, SLAB);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-WALL / 2, y + 2, map.BW + WALL, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let xx = 30; xx < map.BW; xx += 90) ctx.fillRect(xx, y + 7, 2, SLAB - 9);
      for (const l of map.ladders) if (l.lo + 1 === f) { ctx.fillStyle = '#050608'; ctx.fillRect(l.x - 22, y, 44, SLAB); }
    }
    // ground floor building slab (floor surface)
    ctx.fillStyle = slabC; ctx.fillRect(-WALL / 2, 0, map.BW + WALL, SLAB);
    // roof parapet
    const ry = floorY(map.F);
    ctx.fillStyle = wallD; ctx.fillRect(-WALL / 2, ry - 30, 10, 30); ctx.fillRect(map.BW - 2, ry - 30, 10, 30);
    ctx.strokeStyle = '#3a3f48'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, ry - 26); ctx.lineTo(map.BW + 4, ry - 26); ctx.stroke();
    for (let x = 0; x <= map.BW; x += 40) { ctx.beginPath(); ctx.moveTo(x, ry - 26); ctx.lineTo(x, ry); ctx.stroke(); }
    // walls
    for (let f = 0; f < map.F; f++) {
      const y1 = floorY(f), y0 = y1 - FH + SLAB;
      const xs = new Set([0, map.BW]);
      for (const rm of map.byFloor[f]) if (!rm.outdoor) { xs.add(rm.x0); xs.add(rm.x1); }
      for (const x of xs) {
        const outer = x === 0 || x === map.BW;
        const door = run.door(f, x);
        const ww = outer ? WALL + 8 : WALL + 2;
        const wg = ctx.createLinearGradient(x - ww / 2, 0, x + ww / 2, 0);
        const wc = outer ? wallD : wallC;
        wg.addColorStop(0, U.shade(wc, 18)); wg.addColorStop(0.35, wc); wg.addColorStop(1, U.shade(wc, -22));
        ctx.fillStyle = wg;
        const yTop = door ? y1 - DOOR_H : y1;
        ctx.fillRect(x - ww / 2, y0, ww, yTop - y0);
        ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.strokeRect(x - ww / 2, y0, ww, yTop - y0);
        // concrete chips
        const rr = U.rng(x * 7 + f * 131);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 3; i++) ctx.fillRect(x - ww / 2 + rr() * (ww - 4), y0 + rr() * (yTop - y0), 3, 2);
        if (door) {
          // frame + open door leaf
          ctx.fillStyle = '#3a2a1c'; ctx.strokeStyle = OL; ctx.lineWidth = 2;
          ctx.fillRect(x - ww / 2 - 4, y1 - DOOR_H - 6, ww + 8, 8); ctx.strokeRect(x - ww / 2 - 4, y1 - DOOR_H - 6, ww + 8, 8);
          ctx.fillRect(x - ww / 2 - 4, y1 - DOOR_H, 5, DOOR_H); ctx.strokeRect(x - ww / 2 - 4, y1 - DOOR_H, 5, DOOR_H);
          ctx.fillRect(x + ww / 2 - 1, y1 - DOOR_H, 5, DOOR_H); ctx.strokeRect(x + ww / 2 - 1, y1 - DOOR_H, 5, DOOR_H);
          Art.draw(ctx, Art.door(outer), x + ww / 2 + 3, y1 - DOOR_H);
          if (outer && f === 0) { ctx.fillStyle = '#1e8a4a'; ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - 20, y1 - DOOR_H - 28, 40, 14, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e8ffe8'; ctx.font = '800 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('EXIT', x, y1 - DOOR_H - 18); }
        }
      }
    }
  },

  drawLadders(run) {
    const ctx = this.ctx;
    for (const l of run.map.ladders) {
      const a = run.map.rooms[l.a], b = run.map.rooms[l.b];
      if (!a.revealed && !b.revealed) continue;
      const yb = floorY(l.lo), yt = floorY(l.lo + 1) - 34;
      ctx.strokeStyle = '#8a8f96'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(l.x - 16, yb); ctx.lineTo(l.x - 16, yt); ctx.moveTo(l.x + 16, yb); ctx.lineTo(l.x + 16, yt); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = '#6f747b';
      ctx.beginPath(); for (let y = yb - 14; y > yt; y -= 22) { ctx.moveTo(l.x - 16, y); ctx.lineTo(l.x + 16, y); } ctx.stroke();
    }
  },

  // ---------- furniture ----------
  drawFurn(run, fu, rm) {
    const ctx = this.ctx;
    const y = rm.outdoor ? floorY(rm.f) - FEET : floorY(rm.f) - FD + 4, x = fu.x, w = fu.w, h = fu.h, L = x - w / 2, T = y - h;
    const rr = U.rng(typeof fu.id === 'number' ? fu.id * 13 + 7 : 99);
    ctx.save();
    const box = (bx, by, bw, bh, c) => { ctx.fillStyle = c; ctx.fillRect(bx, by, bw, bh); };
    const outline = () => { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; };
    const art = Art.furn(fu.kind, typeof fu.id === 'number' ? fu.id : 1);
    if (fu.hitT > 0) { ctx.translate(U.rf(Math.random, -2.5, 2.5), 0); fu.hitT -= 1 / 60; }
    const top = !rm.outdoor && FURN_TOPS[fu.kind];
    if (top && art && !art.ext && art.img.complete) {
      const ty = T + top[0], d = 8, c = U.mix(top[1], '#5a6066', 0.35);
      ctx.fillStyle = U.shade(c, 14); ctx.strokeStyle = OL; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(L - 1, ty + 1); ctx.lineTo(L + w + 1, ty + 1); ctx.lineTo(L + w - 5, ty - d); ctx.lineTo(L + 5, ty - d); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(L + 6, ty - d + 2, w - 12, 2);
    }
    let art2 = art;
    if (art && art.ext) {
      // ground the painted prop in the room: wall occlusion, contact shadow, and room lighting
      const searched = fu.searched && fu.kind !== 'bag' && fu.loot;
      if (!rm.outdoor) {
        const ao = ctx.createRadialGradient(x, y - h * 0.35, 4, x, y - h * 0.35, Math.max(w, h) * 0.85);
        ao.addColorStop(0, 'rgba(0,0,0,0.28)'); ao.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ao; ctx.fillRect(x - w, T - 20, w * 2, h + 24);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(x, y - 1, Math.min(w * 0.58, 110), 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 1, Math.min(w * 0.7, 130), 8, 0, 0, 7); ctx.fill();
      const filt = rm.outdoor ? (searched ? 'brightness(0.5) saturate(0.55)' : 'brightness(0.68) saturate(0.72) hue-rotate(-8deg)')
        : (searched ? 'brightness(0.6) saturate(0.6)' : 'brightness(0.84) saturate(0.8) sepia(0.12)');
      art2 = Object.assign({}, art, { filt });
    } else if (fu.searched && fu.kind !== 'bag' && fu.loot) ctx.globalAlpha = 0.72;
    const drawn = art2 && Art.draw(ctx, art2, L, T, w, h);
    ctx.globalAlpha = 1;
    if (drawn && fu.kind === 'streetlamp') {
      // the cone starts at the painted bulb (≈ x+22, T+16 for the Gemini lamp drawn 200px tall)
      const bx = x + 22, by = T + 17;
      const g = ctx.createRadialGradient(bx, by, 2, bx, y, 220); g.addColorStop(0, 'rgba(255,220,150,0.32)'); g.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(bx - 9, by); ctx.lineTo(bx + 9, by); ctx.lineTo(bx + 100, y); ctx.lineTo(bx - 100, y); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,190,0.55)'; ctx.beginPath(); ctx.ellipse(bx, by - 1, 9, 3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,230,160,0.16)'; ctx.beginPath(); ctx.ellipse(bx, y - 2, 100, 10, 0, 0, 7); ctx.fill();
    }
    if (!drawn) switch (fu.kind) {
      case 'bed': box(L, y - 30, w, 22, '#5a3e2a'); box(L + 4, y - 40, w - 8, 14, '#d8d4c8'); box(L + 6, y - 46, 30, 10, '#f0ece2'); box(L, y - 56, 8, 56, '#4a3220'); box(L + w - 8, y - 44, 8, 44, '#4a3220'); box(L + 40, y - 42, w - 50, 10, U.pick(rr, ['#6a4a7a', '#3a5a7a', '#7a4a4a'])); break;
      case 'bunk': ctx.strokeStyle = '#666c74'; ctx.lineWidth = 5; ctx.strokeRect(L + 3, T + 3, w - 6, h - 3); box(L + 6, y - 34, w - 12, 12, '#cfcabd'); box(L + 6, T + 34, w - 12, 12, '#cfcabd'); box(L + 8, T + 26, 26, 9, '#eee'); box(L + 8, y - 42, 26, 9, '#eee'); box(L + 40, T + 28, w - 50, 8, '#5a6a4a'); break;
      case 'sofa': box(L, y - 34, w, 30, '#6a3a3a'); box(L, y - 52, w, 22, '#7a4444'); box(L - 4, y - 40, 14, 36, '#5a2e2e'); box(L + w - 10, y - 40, 14, 36, '#5a2e2e'); box(L + 8, y - 6, 6, 6, '#222'); box(L + w - 14, y - 6, 6, 6, '#222'); break;
      case 'wardrobe': box(L, T, w, h, '#6b4a30'); outline(); ctx.strokeRect(L + 4, T + 6, w / 2 - 6, h - 12); ctx.strokeRect(L + w / 2 + 2, T + 6, w / 2 - 6, h - 12); box(L + w / 2 - 6, T + h / 2, 3, 12, '#d4b06a'); box(L + w / 2 + 3, T + h / 2, 3, 12, '#d4b06a'); break;
      case 'rack': ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L + 6, y); ctx.lineTo(L + 6, T); ctx.lineTo(L + w - 6, T); ctx.lineTo(L + w - 6, y); ctx.stroke(); for (let i = 0; i < 6; i++) box(L + 10 + i * 12, T + 4, 10, 44 + rr() * 14, U.pick(rr, ['#b03a4a', '#3a6ab0', '#e0c050', '#3a9a6a', '#222', '#ddd'])); break;
      case 'desk': box(L, y - 46, w, 8, '#7a5a3c'); box(L + 4, y - 38, 10, 38, '#5e442c'); box(L + w - 34, y - 38, 30, 38, '#5e442c'); box(L + w - 30, y - 30, 22, 2, '#3a2a1a'); box(L + w - 30, y - 16, 22, 2, '#3a2a1a'); box(L + 20, y - 72, 34, 24, '#222'); box(L + 23, y - 69, 28, 18, '#3a6a8a'); box(L + 34, y - 48, 6, 4, '#222'); box(L + 64, y - 52, 22, 6, '#ddd'); break;
      case 'filecab': box(L, T, w, h, '#7d848c'); for (let i = 0; i < 3; i++) { box(L + 4, T + 6 + i * 27, w - 8, 22, '#8f969e'); box(L + w / 2 - 6, T + 14 + i * 27, 12, 3, '#444'); } break;
      case 'bookshelf': box(L, T, w, h, '#5a3e26'); for (let s = 0; s < 4; s++) { const sy = T + 6 + s * 30; box(L + 4, sy + 24, w - 8, 4, '#3e2a18'); let bx = L + 6; while (bx < L + w - 10) { const bw = 5 + rr() * 6, bh = 14 + rr() * 9; box(bx, sy + 24 - bh, bw, bh, U.pick(rr, ['#8a3a3a', '#3a5a8a', '#3a7a4a', '#a08040', '#5a3a6a', '#ccc'])); bx += bw + 1; } } break;
      case 'tvstand': box(L, y - 30, w, 30, '#4e3a2a'); box(L + 10, y - 70, w - 20, 40, '#111'); box(L + 14, y - 66, w - 28, 32, '#1d2a3a'); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.moveTo(L + 20, y - 60); ctx.lineTo(L + 50, y - 40); ctx.stroke(); break;
      case 'fridge': box(L, T, w, h, '#c9d3da'); box(L, T + 40, w, 3, '#8a959c'); box(L + w - 10, T + 12, 4, 20, '#888'); box(L + w - 10, T + 54, 4, 30, '#888'); box(L + 8, T + 60, 12, 10, '#e2a03a'); break;
      case 'counter': box(L, y - h, w, 8, '#a8a29a'); box(L + 2, y - h + 8, w - 4, h - 8, '#7a6248'); for (let i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5; ctx.strokeRect(L + 6 + i * (w - 12) / 3, y - h + 14, (w - 12) / 3 - 4, h - 20); } box(L + 14, y - h - 14, 18, 14, '#ddd'); box(L + 60, y - h - 8, 26, 8, '#b33'); break;
      case 'stove': box(L, T, w, h, '#555b62'); box(L + 6, T + 18, w - 12, h - 24, '#22262a'); box(L + 8, T + 4, 12, 6, '#222'); box(L + w - 20, T + 4, 12, 6, '#222'); break;
      case 'medcab': box(L, T, w, h, '#e6e9ec'); box(L + w / 2 - 1, T + 4, 2, h - 8, '#b8bec4'); box(L + w / 2 - 9, T + 16, 18, 6, '#d33'); box(L + w / 2 - 3, T + 10, 6, 18, '#d33'); break;
      case 'hospbed': box(L, y - 30, w, 6, '#aab4bc'); box(L + 6, y - 24, 3, 24, '#8a949c'); box(L + w - 9, y - 24, 3, 24, '#8a949c'); box(L + 2, y - 40, w - 4, 10, '#e8eef2'); box(L + 4, y - 46, 26, 8, '#fff'); box(L + 34, y - 42, w - 40, 8, '#9ac0d8'); box(L + w - 6, y - 70, 3, 40, '#ccc'); box(L + w - 14, y - 74, 18, 14, '#cde'); break;
      case 'labtable': box(L, y - 46, w, 8, '#e0e4e8'); box(L + 4, y - 38, w - 8, 38, '#9aa4ad'); for (let i = 0; i < 4; i++) { const bx = L + 14 + i * 24; ctx.fillStyle = U.pick(rr, ['#4fd1c5', '#9dff5c', '#ff6ad5', '#ffd166']); ctx.beginPath(); ctx.moveTo(bx, y - 64); ctx.lineTo(bx + 8, y - 64); ctx.lineTo(bx + 12, y - 46); ctx.lineTo(bx - 4, y - 46); ctx.fill(); } break;
      case 'server': box(L, T, w, h, '#20252b'); for (let i = 0; i < 8; i++) { box(L + 4, T + 6 + i * 15, w - 8, 11, '#2c333b'); box(L + 8, T + 10 + i * 15, 4, 3, Math.sin(run.time * 4 + i * 1.7 + fu.x) > 0 ? '#3f6' : '#163'); } break;
      case 'shelfunit': box(L, T, 6, h, '#7d848c'); box(L + w - 6, T, 6, h, '#7d848c'); for (let s = 0; s < 4; s++) { const sy = T + 10 + s * 26; box(L, sy + 20, w, 4, '#8f969e'); let bx = L + 8; while (bx < L + w - 14) { const bw = 8 + rr() * 8, bh = 8 + rr() * 10; if (rr() < 0.75) box(bx, sy + 20 - bh, bw, bh, U.pick(rr, ['#d35400', '#2980b9', '#27ae60', '#f1c40f', '#c0392b', '#8e44ad', '#ecf0f1'])); bx += bw + 2; } } break;
      case 'stallcart': box(L + 4, y - 44, w - 8, 36, '#8a6a3a'); box(L + 10, y - 8, 10, 8, '#333'); box(L + w - 20, y - 8, 10, 8, '#333'); box(L + w / 2 - 2, T + 16, 4, h - 60, '#555'); ctx.fillStyle = U.pick(rr, ['#c0392b', '#2e86c1', '#27ae60', '#d68910']); ctx.beginPath(); ctx.moveTo(L - 6, T + 24); ctx.lineTo(L + w / 2, T); ctx.lineTo(L + w + 6, T + 24); ctx.fill(); for (let i = 0; i < 6; i++) { ctx.fillStyle = U.pick(rr, ['#e74c3c', '#f39c12', '#2ecc71', '#f5e663']); ctx.beginPath(); ctx.arc(L + 16 + i * 15, y - 48, 6, 0, 7); ctx.fill(); } break;
      case 'register': box(L, y - 42, w, 42, '#4a4f56'); box(L, y - 46, w, 6, '#5d636b'); box(L + w - 40, y - 66, 30, 20, '#22262a'); box(L + w - 36, y - 62, 22, 8, '#3f6'); box(L + 10, y - 54, 22, 8, '#666'); break;
      case 'locker': for (let i = 0; i < 3; i++) { const lx = L + i * (w / 3); box(lx, T, w / 3 - 2, h, i % 2 ? '#5f7186' : '#56687c'); for (let k = 0; k < 4; k++) box(lx + 5, T + 10 + k * 4, w / 3 - 12, 2, '#3c4a59'); box(lx + w / 3 - 10, T + h / 2, 3, 10, '#ccc'); } break;
      case 'weaponrack': box(L, T, w, h, '#3a3326'); for (let i = 0; i < 4; i++) { box(L + 10 + i * 22, T + 12, 6, h - 30, '#1e1e1e'); box(L + 8 + i * 22, T + 50, 12, 8, '#2a2a2a'); } box(L, y - 14, w, 14, '#4b5636'); break;
      case 'crate': box(L, T, w, h, '#9a7444'); outline(); ctx.strokeRect(L + 3, T + 3, w - 6, h - 6); ctx.beginPath(); ctx.moveTo(L + 3, T + 3); ctx.lineTo(L + w - 3, T + h - 3); ctx.stroke(); break;
      case 'dumpster': box(L, T + 10, w, h - 10, '#2e6b3f'); box(L - 4, T + 4, w + 8, 10, '#245535'); box(L + 10, y - 6, 10, 6, '#111'); box(L + w - 20, y - 6, 10, 6, '#111'); break;
      case 'toolbench': box(L, y - h, w, 8, '#7a5a3c'); box(L + 4, y - h + 8, 8, h - 8, '#5e442c'); box(L + w - 12, y - h + 8, 8, h - 8, '#5e442c'); box(L + 20, y - h - 14, 26, 14, '#c0392b'); box(L + 60, y - h - 6, 30, 6, '#888'); box(L + 10, y - 22, w - 20, 6, '#5e442c'); box(L, y - h - 50, w, 40, 'rgba(90,70,50,0.6)'); break;
      case 'safe': box(L, T, w, h, '#6c6f73'); outline(); ctx.strokeRect(L + 5, T + 5, w - 10, h - 10); ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.arc(L + w / 2, T + h / 2, 8, 0, 7); ctx.fill(); break;
      case 'car': {
        const col = U.pick(rr, ['#7a2a2a', '#2a4a7a', '#5a5a5a', '#c9b037', '#2a5a3a']);
        box(L, y - 44, w, 30, col); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(L + 40, y - 44); ctx.lineTo(L + 60, T); ctx.lineTo(L + 140, T); ctx.lineTo(L + 162, y - 44); ctx.fill();
        ctx.fillStyle = '#1b2633'; ctx.beginPath(); ctx.moveTo(L + 50, y - 46); ctx.lineTo(L + 64, T + 6); ctx.lineTo(L + 98, T + 6); ctx.lineTo(L + 98, y - 46); ctx.fill(); ctx.beginPath(); ctx.moveTo(L + 104, y - 46); ctx.lineTo(L + 104, T + 6); ctx.lineTo(L + 136, T + 6); ctx.lineTo(L + 152, y - 46); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(L + 40, y - 12, 14, 0, 7); ctx.arc(L + w - 40, y - 12, 14, 0, 7); ctx.fill(); ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(L + 40, y - 12, 6, 0, 7); ctx.arc(L + w - 40, y - 12, 6, 0, 7); ctx.fill();
        box(L + w - 6, y - 38, 6, 8, '#ffd76a'); break;
      }
      case 'body': ctx.fillStyle = '#5d4a3a'; ctx.beginPath(); ctx.ellipse(x, y - 8, w / 2, 8, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#c9a37a'; ctx.beginPath(); ctx.arc(L + 6, y - 10, 8, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(110,10,10,0.8)'; ctx.beginPath(); ctx.ellipse(x + 10, y - 1, w / 2 + 10, 3, 0, 0, 7); ctx.fill(); break;
      case 'supply': box(L, T + 6, w, h - 6, '#2e86c1'); box(L, T + 6, w, 8, '#1b5e8a'); box(L + w / 2 - 4, T + 6, 8, h - 6, '#f1c40f'); ctx.fillStyle = 'rgba(240,240,240,0.85)'; ctx.beginPath(); ctx.ellipse(x + 30, T - 10, 34, 12, 0.3, 0, 7); ctx.fill(); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 10, T - 4); ctx.lineTo(L + 4, T + 6); ctx.moveTo(x + 50, T); ctx.lineTo(L + w - 4, T + 6); ctx.stroke(); break;
      case 'generator': box(L, T + 10, w, h - 10, run.powered ? '#c9a227' : '#8a6a1a'); box(L + 6, T + 18, w - 40, h - 30, '#333'); box(L + w - 28, T + 20, 20, 20, '#222'); ctx.fillStyle = run.powered ? '#3f6' : '#f33'; ctx.beginPath(); ctx.arc(L + w - 18, T + 50, 5, 0, 7); ctx.fill(); box(L + 10, T, 20, 12, '#555'); break;
      case 'bag': box(L + 4, y - 22, w - 8, 22, '#6b5b45'); box(L + 10, y - 26, w - 20, 6, '#4d4132'); break;
      case 'lamp': box(x - 2, T + 24, 4, h - 24, '#333'); box(x - 10, y - 4, 20, 4, '#333'); ctx.fillStyle = '#d8c39a'; ctx.beginPath(); ctx.moveTo(x - 12, T + 26); ctx.lineTo(x - 7, T); ctx.lineTo(x + 7, T); ctx.lineTo(x + 12, T + 26); ctx.fill(); break;
      case 'plant': box(x - 11, y - 22, 22, 22, '#7a4a2a'); ctx.fillStyle = '#2f6b3a'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(i) * 8, y - 36 - i * 4, 6, 14, Math.cos(i * 2) * 0.8, 0, 7); ctx.fill(); } break;
      case 'toilet': box(x - 12, y - 46, 18, 22, '#e8ecef'); ctx.fillStyle = '#e8ecef'; ctx.beginPath(); ctx.ellipse(x + 4, y - 22, 18, 8, 0, 0, 7); ctx.fill(); box(x - 4, y - 18, 14, 18, '#d8dde0'); break;
      case 'sink': box(x - 20, y - 46, 40, 10, '#e8ecef'); box(x - 4, y - 36, 8, 36, '#cfd5d9'); box(x - 14, y - 70, 28, 20, '#9bb'); break;
      case 'bench': box(L, y - 26, w, 6, '#7a5a3c'); box(L + 8, y - 20, 6, 20, '#444'); box(L + w - 14, y - 20, 6, 20, '#444'); box(L, y - 42, w, 5, '#7a5a3c'); break;
      case 'streetlamp': box(x - 3, T, 6, h, '#2f3338'); box(x - 3, T, 34, 5, '#2f3338'); ctx.fillStyle = '#ffe2a0'; ctx.fillRect(x + 22, T + 5, 12, 5); { const g = ctx.createRadialGradient(x + 28, T + 8, 2, x + 28, y, 200); g.addColorStop(0, 'rgba(255,220,150,0.25)'); g.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + 20, T + 10); ctx.lineTo(x + 36, T + 10); ctx.lineTo(x + 110, y); ctx.lineTo(x - 54, y); ctx.fill(); } break;
      case 'barrel': box(L, T, w, h, '#3a5a7a'); box(L, T + 12, w, 4, '#2a4a6a'); box(L, T + h - 16, w, 4, '#2a4a6a'); break;
      case 'vent': box(L, T + 10, w, h - 10, '#7d848c'); for (let i = 0; i < 5; i++) box(L + 6, T + 16 + i * 6, w - 12, 2, '#555'); break;
    }
    // search state overlays
    if (fu.loot || fu.kind === 'bag') {
      if (fu.searched && fu.kind !== 'bag' && !drawn) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(L, T, w, h); }
      if (fu.items && fu.items.length) {
        const bob = Math.sin(run.time * 3 + fu.x) * 3;
        ctx.font = '18px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; ctx.textAlign = 'center';
        const show = fu.items.slice(0, 3);
        show.forEach((it, i) => { const bx = x + (i - (show.length - 1) / 2) * 28, by = T - 20 + bob; ctx.fillStyle = 'rgba(15,24,34,0.85)'; ctx.strokeStyle = 'rgba(127,227,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(bx - 13, by - 13, 26, 26, 7); ctx.fill(); ctx.stroke();
          const ia = WEAPON_ART[it.id] ? Parts.weapon(it.id) : Art.iconArt(it.id); if (ia) { const k = Math.min(22 / ia.w, 22 / ia.h); Art.draw(ctx, ia, bx - ia.w * k / 2, by - ia.h * k / 2, ia.w * k, ia.h * k); } else { ctx.fillStyle = '#fff'; ctx.fillText(ITEMS[it.id].icon, bx, by + 6); } });
      }
      fu._barY = null;
      if (!fu.searched && fu.prog > 0) { const py = fu.items && fu.items.length ? T - 46 : T - 16; fu._barY = py; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 30, py, 60, 8); ctx.fillStyle = '#7fe3ff'; ctx.fillRect(x - 29, py + 1, 58 * fu.prog, 6); }
      if (fu.loot && !fu.searched && !fu.decor) this.searchBadge(run, fu, L + w - 6, Math.max(T + 8, y - 120));
      if (fu.whp != null && fu.whpMax && fu.whp < fu.whpMax) { // smash damage bar
        const bw = Math.min(70, w - 10), bx = fu.x - bw / 2, by = T - 12, k = Math.max(0, fu.whp / fu.whpMax);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 6); ctx.fillStyle = k > 0.5 ? '#e0b050' : '#ff6a3c'; ctx.fillRect(bx, by, bw * k, 4);
      }
      if (FURN[fu.kind] && FURN[fu.kind].special && !fu.searched && fu.kind === 'supply') { ctx.strokeStyle = `rgba(241,196,15,${0.5 + 0.5 * Math.sin(run.time * 5)})`; ctx.lineWidth = 3; ctx.strokeRect(L - 4, T - 4, w + 8, h + 8); }
    }
    if (HIDE_SPOTS[fu.kind] && run.p.hidden !== fu && (rm.id === run.p.room || run.waveT < 15)) this.hideBadge(run, fu, L + 6, Math.max(T + 8, y - 120));
    if (fu.kind === 'generator' && !run.powered) { ctx.strokeStyle = `rgba(255,80,80,${0.5 + 0.5 * Math.sin(run.time * 5)})`; ctx.lineWidth = 3; ctx.strokeRect(L - 4, T - 4, w + 8, h + 8); }
    ctx.restore();
  },

  // ---------- characters ----------
  // Cut-out rig character built from illustrated SVG parts (feet at 0, facing right)
  // Rig built from external (Gemini) part images: proportions by target heights
  drawHumanExt(x, y, o) {
    const ctx = this.ctx, s = o.scale || 1, f = o.facing || 1, rig = o.rig;
    if (![rig.head, rig.torso, rig.arm, rig.leg].every(i => i && i.complete && i.naturalWidth)) return null;
    const walk = o.walk || 0, sw = o.moving ? Math.sin(walk) : 0, bob = o.moving ? Math.abs(Math.cos(walk)) * 2 : 0;
    const LEG = 44, TOR = 30, HEAD = 30, ARM = 38;
    ctx.save(); ctx.translate(x, y); ctx.scale(f * s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 4.5, 0, 0, 7); ctx.fill();
    const put = (img, th, px, py, ang, ax, ay, dark) => {
      const k = th / img.naturalHeight, w = img.naturalWidth * k;
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
      if (dark) ctx.filter = 'brightness(0.68)';
      ctx.drawImage(img, -w * ax, -th * ay, w, th);
      ctx.restore();
      return w;
    };
    const hipY = -LEG + 3 - bob;
    const lean = o.zombie ? 0.18 : (o.moving ? 0.05 : 0);
    const legA = o.climb ? Math.sin(walk) * 0.5 : sw * 0.5;
    const w = o.weapon ? ITEMS[o.weapon] : null;
    const shX = Math.sin(lean) * TOR + 1, shY = hipY - TOR + 6;
    let backArm, armA;
    if (o.climb) { backArm = Math.PI - 0.25 + Math.sin(walk) * 0.3; armA = Math.PI + 0.2 - Math.sin(walk) * 0.3; }
    else if (o.zombie) { backArm = -Math.PI / 2 - 0.12 + Math.sin(walk * 0.7) * 0.12; armA = -Math.PI / 2 + (o.attack ? -0.25 : 0.05) + Math.sin(walk * 0.7 + 1) * 0.12; }
    else if (w && w.cls !== 'melee') { backArm = -Math.PI / 2 + (o.aim || 0) + 0.22; armA = -Math.PI / 2 + (o.aim || 0); }
    else { backArm = sw * 0.6; armA = o.swing > 0 ? -Math.PI * 1.05 + o.swing * 2.3 : -0.35 + sw * -0.4; }
    put(rig.leg, LEG, -3, hipY, -legA, 0.5, 0.03, true);
    put(rig.arm, ARM, shX - 4, shY, backArm, 0.5, 0.05, true);
    put(rig.torso, TOR + 4, 0, hipY + 4, lean, 0.5, 1);
    put(rig.leg, LEG, 3, hipY, legA, 0.5, 0.03);
    put(rig.head, HEAD, shX - 1, shY - 3, o.zombie ? 0.18 + Math.sin(walk * 0.5) * 0.06 : (o.aim || 0) * 0.25, 0.48, 0.92);
    const handX = shX + 2 - Math.sin(armA) * ARM * 0.88, handY = shY + 1 + Math.cos(armA) * ARM * 0.88;
    const wpn = w && !o.climb ? Parts.weapon(o.weapon) : null;
    if (wpn && w.cls === 'melee') { ctx.save(); ctx.translate(handX, handY); ctx.rotate(armA + Math.PI / 2); Art.draw(ctx, wpn, -wpn.px, -wpn.py); ctx.restore(); }
    put(rig.arm, ARM, shX + 2, shY + 1, armA, 0.5, 0.05);
    if (wpn && w.cls !== 'melee') { ctx.save(); ctx.translate(handX, handY); ctx.rotate(o.aim || 0); Art.draw(ctx, wpn, -wpn.px, -wpn.py); ctx.restore(); }
    ctx.restore();
    return { handX, handY };
  },
  drawHuman(x, y, o) {
    if (o.rig && o.rig.ext) { const r = this.drawHumanExt(x, y, o); if (r) return r; o = Object.assign({}, o, { rig: null }); }
    const ctx = this.ctx, s = o.scale || 1, f = o.facing || 1;
    const rig = o.rig || Art.zombie(0);
    const walk = o.walk || 0;
    const sw = o.moving ? Math.sin(walk) : 0;
    const bob = o.moving ? Math.abs(Math.cos(walk)) * 2 : 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(f * s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 4.5, 0, 0, 7); ctx.fill();
    const part = (img, px, py, ang, ox, oy) => {
      if (!img || !img.img.complete) return;
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
      Art.draw(ctx, img, -ox, -oy);
      ctx.restore();
    };
    const hipY = -28 - bob;
    const lean = o.zombie ? 0.2 : (o.moving ? 0.06 : 0);
    const shX = 2 + Math.sin(lean) * 26, shY = hipY - 24;
    const legA = o.climb ? Math.sin(walk) * 0.5 : sw * 0.55;
    // back leg
    part(rig.legB, -2, hipY, -legA, 9, 3);
    // back arm
    let backArm;
    const w = o.weapon ? ITEMS[o.weapon] : null;
    if (o.climb) backArm = Math.PI - 0.25 + Math.sin(walk) * 0.3;
    else if (o.zombie) backArm = -Math.PI / 2 - 0.15 + Math.sin(walk * 0.7) * 0.12;
    else if (w && w.cls !== 'melee') backArm = -Math.PI / 2 + (o.aim || 0) + 0.25;
    else backArm = sw * 0.6;
    part(rig.armB, shX - 3, shY + 2, backArm, 7, 3);
    // backpack
    if (o.pack) part(Parts.pack(), -10 + Math.sin(lean) * 20, hipY - 6, lean, 10, 26);
    // torso
    part(rig.torso, 0, hipY + 3, lean, 16, 33);
    // front leg
    part(rig.leg, 2, hipY, legA, 9, 3);
    // head
    const headTilt = o.zombie ? 0.25 + Math.sin(walk * 0.5) * 0.08 : (o.aim || 0) * 0.3;
    part(rig.head, shX - 1, shY - 3, headTilt, 22, 40);
    // front arm + weapon
    let armA;
    if (o.climb) armA = Math.PI + 0.2 - Math.sin(walk) * 0.3;
    else if (o.zombie) armA = -Math.PI / 2 + (o.attack ? -0.25 : 0.05) + Math.sin(walk * 0.7 + 1) * 0.12;
    else if (w && w.cls !== 'melee') armA = -Math.PI / 2 + (o.aim || 0);
    else if (o.swing > 0) armA = -Math.PI * 1.05 + o.swing * 2.3;
    else armA = -0.5 + sw * -0.4;
    const hx = shX + 3, hy = shY + 3;
    const handX = hx - Math.sin(armA) * 21, handY = hy + Math.cos(armA) * 21;
    const wpn = w && !o.climb ? Parts.weapon(o.weapon) : null;
    if (wpn && w.cls === 'melee') { ctx.save(); ctx.translate(handX, handY); ctx.rotate(armA + Math.PI / 2); Art.draw(ctx, wpn, -wpn.px, -wpn.py); ctx.restore(); }
    part(rig.arm, hx, hy, armA, 7, 3);
    if (wpn && w.cls !== 'melee') {
      ctx.save(); ctx.translate(handX, handY); ctx.rotate(o.aim || 0); Art.draw(ctx, wpn, -wpn.px, -wpn.py);
      const at = o.att || {};
      if (at.scope) { ctx.fillStyle = '#111'; ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.fillRect(4, -wpn.py - 4, 14, 5); }
      if (at.muzzle) { ctx.fillStyle = '#3a3d40'; ctx.fillRect(wpn.w - wpn.px, -2, 12, 5); }
      ctx.restore();
      // redraw hand over grip
      ctx.fillStyle = rig.skinCol || '#e2b48a';
    }
    ctx.restore();
    return { handX, handY };
  },
  drawPlayer(run) {
    const p = run.p, ch = CHARACTERS[G.char];
    if (p.hidden) {
      // only a pair of eyes peeking out of the hiding spot
      const fu = p.hidden, y0 = run.yOf(p) - FEET - Math.min(fu.h * 0.55, 70), blink = Math.sin(run.time * 1.3) > 0.97;
      const ctx = this.ctx; ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.beginPath(); ctx.roundRect(fu.x - 15, y0 - 7, 30, 14, 7); ctx.fill();
      if (!blink) { ctx.fillStyle = '#f4f0dc'; ctx.beginPath(); ctx.ellipse(fu.x - 6, y0, 3.5, 2.6, 0, 0, 7); ctx.ellipse(fu.x + 6, y0, 3.5, 2.6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(fu.x - 6 + p.facing, y0, 1.4, 0, 7); ctx.arc(fu.x + 6 + p.facing, y0, 1.4, 0, 7); ctx.fill(); }
      return;
    }
    const w = run.curWeapon();
    let aim = 0;
    const y = run.yOf(p);
    if (w && ITEMS[w.id].cls !== 'melee') {
      // aim towards nearest target (visual)
      let best = 1e9, t = null;
      for (const z of run.zombies) { if (z.dead || z.f !== p.f) continue; const dx = (z.x - p.x) * p.facing; if (dx > 0 && dx < best && dx < 700) { best = dx; t = z; } }
      if (t) aim = U.clamp(Math.atan2((run.yOf(t) - t.Z.r * 3) - (y - 54), Math.abs(t.x - p.x)), -0.6, 0.6);
    }
    const sw = p.swingT > 0 ? 1 - p.swingT / 0.25 : 0;
    const flick = p.hurtT > 0 && Math.floor(p.hurtT * 30) % 2;
    if (flick) this.ctx.globalAlpha = 0.5;
    const base = 'char_' + G.char;
    if (Sprites.has(base)) {
      const it = w && ITEMS[w.id], sc = (G.char === 'joe' ? 1.1 : 1) * CHAR_SCALE;
      let key = base, face = p.facing;
      const shooting = run.time - (p.lastShot || -9) < 0.5;
      if (p.climb) { key = base + '_climb'; face = Math.floor(p.walk / 2) % 2 ? 1 : -1; }
      else if (p.swingT > 0 && (!it || it.cls === 'melee')) key = base + '_melee_' + (sw < 0.45 ? 0 : 1);
      else if (it && it.cls !== 'melee' && (!p.moving || shooting || p.reloadT > 0)) key = base + (it.cls === 'pistol' ? '_pistol' : '_gun');
      else if (p.moving) key = Sprites.walkKey(base, p.walk * 0.85);
      const legKey = p.moving && !p.climb ? Sprites.walkKey(base, p.walk * 0.85) : null;
      if (!p.climb) Sprites.shadow(this.ctx, p.x, y, 18);
      if (p.noiseFx) { // how far that footstep / rummage carried
        const c = this.ctx, k = 1 - p.noiseFx.t / p.noiseFx.max;
        c.save(); c.strokeStyle = `rgba(255,220,140,${0.35 * (1 - k)})`; c.lineWidth = 2; c.setLineDash([6, 6]);
        c.beginPath(); c.ellipse(p.x, y, p.noiseFx.r * (0.35 + 0.65 * k), 10 + 14 * k, 0, 0, 7); c.stroke(); c.restore();
      }
      // empty-handed pose + the weapon actually held, placed at the grip point found during processing
      const bareKey = key.includes('_melee_') ? key.replace('_melee_', '_melee_bare_') : (key.endsWith('_gun') || key.endsWith('_pistol')) ? key + '_bare' : null;   // _pistol_bare only once those frames exist
      const bm = bareKey && Sprites.meta(bareKey), wa = w && WEAPON_ART[w.id] && Parts.weapon(w.id);
      this.muzzle = null;
      if (bm && bm.ga != null && Override.get(bareKey) && (wa || !w)) {
        const c = this.ctx, k = sc / SPR_PPU, ws = sc * (!it || it.cls === 'melee' ? 1 : 1.05);
        const gx = p.x + face * (bm.gx - bm.ax) * k, gy = y + (bm.gy - bm.ay) * k;
        const ang = !it || it.cls === 'melee' ? bm.ga : bm.ga + aimTilt(aim);
        if (legKey) Sprites.drawSplit(c, bareKey, legKey, p.x, y, face, sc, null, p.walk * 0.7, 0); else Sprites.draw(c, bareKey, p.x, y, face, sc);
        let L = wa ? (wa.w - wa.px) * ws : 0;
        if (wa) { // bare hands: punch with the empty-hand pose, no weapon drawn
          c.save(); c.translate(gx, gy); c.scale(face, 1); c.rotate(ang);
          const G = wa.ext && WPN_GRIP[w.id], img = wa.img;
          if (G && img.naturalWidth) { // painted gun: put its real grip in the hand so the stock reaches the shoulder
            const kk = Math.min(wa.w * ws / img.naturalWidth, wa.h * ws / img.naturalHeight);
            c.drawImage(img, -G[0] * kk, -G[1] * kk, img.naturalWidth * kk, img.naturalHeight * kk);
            L = (img.naturalWidth - G[0]) * kk;
          } else Art.draw(c, wa, -wa.px * ws, -wa.py * ws, wa.w * ws, wa.h * ws);
          c.restore();
        }
        // redraw the hands over the gun so they wrap the grip (rear) and the handguard (front)
        const hands = [[gx, gy]];
        if (it && it.cls !== 'melee' && bm.fx != null) hands.push([p.x + face * (bm.fx - bm.ax) * k, y + (bm.fy - bm.ay) * k]);
        for (const [hx, hy] of hands) { c.save(); c.beginPath(); c.arc(hx, hy, 6.5 * sc, 0, 7); c.clip(); Sprites.draw(c, bareKey, p.x, y, face, sc); c.restore(); }
        if (it && it.cls !== 'melee') this.muzzle = { dx: (gx - p.x) * face + Math.cos(ang) * L, dy: y - gy - Math.sin(ang) * L };
      } else if (legKey) {
        const ph = p.walk * 0.85, sprint = Math.abs(p.vx || 0) > p.spd * 1.15;
        Sprites.drawSplit(this.ctx, key, legKey, p.x, y + stepBob(ph, 1.4 * sc) + 0.7 * sc, face, sc, null, ph, 0);
      } else Sprites.draw(this.ctx, key, p.x, y, face, sc);
    } else this.drawHuman(p.x, y, { rig: Art.char(G.char), scale: (G.char === 'joe' ? 1.1 : 1) * CHAR_SCALE, facing: p.facing, walk: p.walk, moving: p.moving, pack: true, weapon: w && w.id, att: w && w.att, aim, swing: sw, climb: !!p.climb });
    this.ctx.globalAlpha = 1;
    // hp bar above
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(p.x - 22, y - 110, 44, 6);
    ctx.fillStyle = p.hp / p.maxHp > 0.35 ? '#5ee05e' : '#e05e5e'; ctx.fillRect(p.x - 21, y - 109, 42 * p.hp / p.maxHp, 4);
    if (p.sneak) { ctx.fillStyle = 'rgba(180,220,255,0.85)'; ctx.font = '700 11px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ย่อง', p.x, y - 114); }
    if (p.reloadT > 0) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(p.x - 22, y - 118, 44, 5); ctx.fillStyle = '#ffd36f'; ctx.fillRect(p.x - 21, y - 117, 42 * (1 - p.reloadT / p.reloadMax), 3); }
  },
  drawZombie(run, z) {
    const zb = z.type === 'walker' ? 'zombie_walker' + ((z.look || 0) % 2) : 'zombie_' + z.type;
    const own = Sprites.has(zb);
    if (own || Sprites.has('zombie_walker0')) {
      const ctx0 = this.ctx, y0 = run.yOf(z) + z.depth * 0.3, b = own ? zb : 'zombie_walker0';
      const sc = (z.Z.boss ? 2.0 : z.type === 'brute' ? 1.45 : z.type === 'runner' ? 0.95 : 1) * CHAR_SCALE;
      const tint = own ? '' : ({ brute: 'saturate(1.3) brightness(0.78) contrast(1.1)', spitter: 'hue-rotate(-35deg) saturate(1.8)', boss: 'hue-rotate(-100deg) saturate(2) brightness(0.85)', runner: 'brightness(1.12) saturate(0.8)' }[z.type] || '');
      if (z.dead) {
        ctx0.save(); ctx0.globalAlpha = Math.max(0, Math.min(1, (6 - z.deadT) / 2));
        Sprites.draw(ctx0, b + '_dead', z.x, y0 + 4, z.facing, sc, tint); ctx0.restore(); return;
      }
      let key = b;
      const stride = 22 * sc * (z.type === 'runner' ? 1.3 : z.type === 'brute' ? 1.2 : 1);
      // attack_0 is the upright arms-up "roar" pose: it reads much bigger than the hunched body, so it is only used
      // for the short alert moment (never while being hit or standing in melee range), and drawn a bit smaller
      let lean = 0, ks = 1;
      if (z.atkCd > 0.65 && (z.blockedBy || Math.abs(z.x - run.p.x) < z.rad + 40)) key = b + '_attack_1';
      else if (z.alertT > 0 && z.hitT <= 0) { key = b + '_attack_0'; ks = ROAR_FIX[z.type] || 0.92; }
      else if (z.mv || z.climb) key = Sprites.walkKey(b, (z.dist || 0) / stride);
      if (z.hitT > 0) lean = -0.1;   // flinch back when hit instead of swapping poses
      Sprites.shadow(ctx0, z.x, y0, 18 * sc);
      const f = z.hitT > 0 ? 'brightness(2.2)' : tint;
      if (z.mv && !z.climb && !lean) { const ph = (z.dist || 0) / stride, lk = Sprites.walkKey(b, ph); Sprites.drawSplit(ctx0, key, lk, z.x, y0 + stepBob(ph, 1.2 * sc) + 0.6 * sc, z.facing, sc, f, ph, 0); }
      else Sprites.draw(ctx0, key, z.x, y0, z.facing, sc * ks, f, lean);
      if (z.Z.boss && z.chargeT > 0) { ctx0.strokeStyle = 'rgba(255,60,60,0.6)'; ctx0.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx0.beginPath(); ctx0.moveTo(z.x - z.facing * (50 + i * 16), y0 - 50 - i * 40); ctx0.lineTo(z.x - z.facing * (100 + i * 16), y0 - 50 - i * 40); ctx0.stroke(); } }
      if (z.hp < z.maxHp && !z.Z.boss) { const bw = 34 * sc; ctx0.fillStyle = 'rgba(0,0,0,0.6)'; ctx0.fillRect(z.x - bw / 2, y0 - 104 * sc, bw, 5); ctx0.fillStyle = '#d33'; ctx0.fillRect(z.x - bw / 2 + 1, y0 - 104 * sc + 1, (bw - 2) * Math.max(0, z.hp / z.maxHp), 3); }
      if (z.state === 'idle' && run.map.rooms[z.room].revealed) { ctx0.fillStyle = 'rgba(200,220,255,0.5)'; ctx0.font = '600 13px "Chakra Petch", Kanit, sans-serif'; ctx0.textAlign = 'center'; ctx0.fillText('z z', z.x + 14, y0 - 106 * sc + Math.sin(run.time * 2 + z.ph) * 3); }
      return;
    }
    const ctx = this.ctx, y = run.yOf(z);
    if (z.dead) {
      const sc0 = (z.Z.boss ? 2.0 : z.type === 'brute' ? 1.45 : z.type === 'runner' ? 0.95 : 1) * CHAR_SCALE;
      const rig0 = z.type === 'walker' ? Art.zombie(z.look || 0) : Art.zombie(0, z.type);
      const k = Math.min(1, z.deadT * 3.2);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, (6 - z.deadT) / 2));
      ctx.translate(z.x - z.facing * k * 10, y - k * 6 * sc0);
      ctx.rotate(-z.facing * k * (Math.PI / 2 - 0.08));
      this.drawHuman(0, 0, { rig: rig0, facing: z.facing, walk: 0, moving: false, zombie: true, scale: sc0 });
      ctx.restore();
      return;
    }
    const sc = (z.Z.boss ? 2.0 : z.type === 'brute' ? 1.45 : z.type === 'runner' ? 0.95 : 1) * CHAR_SCALE;
    const yy = y + z.depth * 0.3;
    const rig = z.type === 'walker' ? Art.zombie(z.look || 0) : Art.zombie(0, z.type);
    if (z.hitT > 0) ctx.filter = 'brightness(2.2)';
    this.drawHuman(z.x, yy, { rig, facing: z.facing, walk: z.ph, moving: true, zombie: true, scale: sc, attack: z.atkCd > 0.75 });
    ctx.filter = 'none';
    if (z.Z.boss) {
      ctx.fillStyle = '#5a1a1a'; ctx.strokeStyle = OL; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { const bx = z.x - z.facing * (14 - i * 9); ctx.beginPath(); ctx.moveTo(bx - 6, yy - 112); ctx.lineTo(bx - z.facing * 6, yy - 134 - (i % 2) * 8); ctx.lineTo(bx + 6, yy - 112); ctx.fill(); ctx.stroke(); }
      if (z.chargeT > 0) { ctx.strokeStyle = 'rgba(255,60,60,0.6)'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(z.x - z.facing * (50 + i * 16), yy - 50 - i * 40); ctx.lineTo(z.x - z.facing * (100 + i * 16), yy - 50 - i * 40); ctx.stroke(); } }
    }
    if (z.hp < z.maxHp && !z.Z.boss) { const bw = 34 * sc; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(z.x - bw / 2, yy - 104 * sc, bw, 5); ctx.fillStyle = '#d33'; ctx.fillRect(z.x - bw / 2 + 1, yy - 104 * sc + 1, (bw - 2) * Math.max(0, z.hp / z.maxHp), 3); }
    if (z.state === 'idle' && run.map.rooms[z.room].revealed) { ctx.fillStyle = 'rgba(200,220,255,0.5)'; ctx.font = '600 13px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('z z', z.x + 14, yy - 106 * sc + Math.sin(run.time * 2 + z.ph) * 3); }
  },
  drawSurvivor(run, s) {
    const ctx = this.ctx, y = floorY(s.f);
    const who = s.who;
    const sbase = who.kind === 'char' ? 'char_' + who.id : 'surv_' + (who.kind === 'role' ? who.id : 'gen');
    if (Sprites.has(sbase)) {
      const ctx1 = this.ctx; ctx1.save(); ctx1.globalAlpha = s.state === 'leaving' ? Math.max(0, 1 - s.t / 2) : 1;
      Sprites.shadow(ctx1, s.x, y, 16);
      if (s.state === 'leaving') { const ph = run.time * 7, k = Sprites.walkKey(sbase, ph); Sprites.drawSplit(ctx1, k, k, s.x, y + stepBob(ph, 1.4), -1, 0.95 * CHAR_SCALE, null, ph, 0); }
      else Sprites.draw(ctx1, sbase, s.x, y, 1, 0.95 * CHAR_SCALE);
      ctx1.restore();
      if (s.state === 'hiding') { const bob = Math.sin(run.time * 4) * 3; ctx1.fillStyle = 'rgba(255,255,255,0.95)'; ctx1.beginPath(); ctx1.roundRect(s.x - 44, y - 140 + bob, 88, 26, 8); ctx1.fill(); ctx1.beginPath(); ctx1.moveTo(s.x - 6, y - 114 + bob); ctx1.lineTo(s.x + 6, y - 114 + bob); ctx1.lineTo(s.x, y - 106 + bob); ctx1.fill(); ctx1.fillStyle = '#c0392b'; ctx1.font = '700 15px "Chakra Petch", Kanit, sans-serif'; ctx1.textAlign = 'center'; ctx1.fillText('ช่วยด้วย!', s.x, y - 121 + bob); }
      return;
    }
    const rig = who.kind === 'char' ? Art.char(who.id) : Art.survivor(who.kind === 'role' ? who.id : 'gen');
    ctx.globalAlpha = s.state === 'leaving' ? Math.max(0, 1 - s.t / 2) : 1;
    this.drawHuman(s.x, y, { rig, facing: s.state === 'leaving' ? -1 : 1, walk: run.time * 8, moving: s.state === 'leaving', scale: 0.95 * CHAR_SCALE });
    ctx.globalAlpha = 1;
    if (s.state === 'hiding') {
      const bob = Math.sin(run.time * 4) * 3;
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.roundRect(s.x - 44, y - 140 + bob, 88, 26, 8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s.x - 6, y - 114 + bob); ctx.lineTo(s.x + 6, y - 114 + bob); ctx.lineTo(s.x, y - 106 + bob); ctx.fill();
      ctx.fillStyle = '#c0392b'; ctx.font = '700 15px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ช่วยด้วย!', s.x, y - 121 + bob);
    }
  },
  // ---------- barricades (planks / steel sheet / steel frame) ----------
  drawBarricades(run) {
    const ctx = this.ctx, map = run.map;
    for (const lk of run.locks) { // the closed door is drawn by the room walls; add the padlock + badge on the doorway
      const d = run.doorAt.get(lk.f + '|' + lk.x), a = map.rooms[d.a], c = map.rooms[d.b];
      if (!a.revealed && !c.revealed && !run.powered) continue;
      const y1 = floorY(lk.f) - 2, H = DOOR_H - 4, sh = lk.hitT > 0 ? U.rf(Math.random, -2, 2) : 0;
      lk.hitT = Math.max(0, lk.hitT - 1 / 60);
      ctx.save(); ctx.translate(lk.x + sh, y1);
      ctx.fillStyle = '#8a929a'; ctx.fillRect(-9, -H * 0.5 - 3, 18, 6);
      const col = lk.pickOnly ? '#7fd0ff' : '#c9a227';
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -H * 0.5 + 6, 4.5, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = col; ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.rect(-6, -H * 0.5 + 6, 12, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a2a0c'; ctx.fillRect(-1, -H * 0.5 + 9, 2, 4);
      ctx.restore();
      if (lk.hp < lk.max || Math.abs(run.p.x - lk.x) < 160 || run.p.f !== lk.f) this.lockBadge(run, lk, lk.x, y1 - H - 18, null);
    }
    for (const b of run.barricades) {
      if (b.isDoor) continue; // doors draw themselves (drawDoors)
      const shake = b.hitT > 0 ? U.rf(Math.random, -2, 2) : 0;
      b.hitT = Math.max(0, b.hitT - 1 / 60);
      const dmg = 1 - b.hp / b.max;
      ctx.save();
      if (b.kind === 'door') {
        const a = map.rooms[run.doorAt.get(b.f + '|' + b.x).a], c = map.rooms[run.doorAt.get(b.f + '|' + b.x).b];
        if (!a.revealed && !c.revealed && !run.powered) { ctx.restore(); continue; }
        const y1 = floorY(b.f) - 2, x = b.x + shake, H = DOOR_H - 6, W = 30;
        ctx.translate(x, y1);
        if (b.lvl >= 2) { // riveted steel sheet behind the planks
          ctx.fillStyle = '#6d757d'; ctx.strokeStyle = OL; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.rect(-W / 2 + 2, -H * 0.62, W - 4, H * 0.62); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-W / 2 + 2, -H * 0.3, W - 4, 3);
          ctx.fillStyle = '#b8c0c8'; for (const [rx, ry] of [[-9, -H * 0.58], [9, -H * 0.58], [-9, -6], [9, -6]]) { ctx.beginPath(); ctx.arc(rx, ry, 1.8, 0, 7); ctx.fill(); }
          ctx.fillStyle = 'rgba(140,70,30,0.45)'; ctx.fillRect(-6, -H * 0.45, 8, 14);
        }
        if (b.lvl >= 3) { // steel frame bars
          ctx.strokeStyle = OL; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-W / 2, -H); ctx.lineTo(-W / 2, 0); ctx.moveTo(W / 2, -H); ctx.lineTo(W / 2, 0); ctx.stroke();
          ctx.strokeStyle = '#4a5058'; ctx.lineWidth = 4; ctx.stroke();
        }
        // planks
        const planks = [[-H * 0.86, -0.22], [-H * 0.6, 0.18], [-H * 0.34, -0.12], [-H * 0.12, 0.2]];
        planks.forEach(([py, ang], i) => {
          if (dmg > 0.55 && i === 1) return; // a plank knocked off
          ctx.save(); ctx.translate(0, py); ctx.rotate(ang + (dmg > 0.3 && i === 2 ? 0.25 : 0));
          ctx.fillStyle = ['#9a7244', '#8a6238', '#a37a4a', '#86603a'][i]; ctx.strokeStyle = OL; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.rect(-W / 2 - 8, -6, W + 16, 12); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-W / 2 - 4, -1); ctx.lineTo(W / 2 + 4, 1); ctx.stroke();
          ctx.fillStyle = '#d8dde0'; ctx.beginPath(); ctx.arc(-W / 2 - 2, 0, 1.6, 0, 7); ctx.arc(W / 2 + 2, 0, 1.6, 0, 7); ctx.fill();
          ctx.restore();
        });
        if (dmg > 0.15) { ctx.strokeStyle = 'rgba(20,10,5,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, -H * 0.36); ctx.lineTo(-2, -H * 0.3); ctx.lineTo(-6, -H * 0.24); if (dmg > 0.45) { ctx.moveTo(6, -H * 0.9); ctx.lineTo(1, -H * 0.82); ctx.lineTo(7, -H * 0.76); } ctx.stroke(); }
        if (b.hp < b.max || Math.abs(run.p.x - b.x) < 120) { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(-20, -H - 14, 40, 6); ctx.fillStyle = dmg > 0.6 ? '#ff5a4a' : '#ffc04a'; ctx.fillRect(-19, -H - 13, 38 * (b.hp / b.max), 4); ctx.fillStyle = '#fff'; ctx.font = '700 10px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Lv' + b.lvl, 0, -H - 18); }
      } else {
        const l = b.lad, y = floorY(l.lo + 1) - 2, x = l.x + shake;
        if (!map.rooms[l.a].revealed && !map.rooms[l.b].revealed && !run.powered) { ctx.restore(); continue; }
        ctx.translate(x, y);
        if (b.lvl >= 2) { ctx.fillStyle = '#6d757d'; ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(-26, -4, 52, 10); ctx.fill(); ctx.stroke(); }
        for (let i = 0; i < 3; i++) {
          if (dmg > 0.55 && i === 1) continue;
          ctx.save(); ctx.translate((i - 1) * 4, -6 - i * 5); ctx.rotate((i - 1) * 0.08);
          ctx.fillStyle = ['#9a7244', '#8a6238', '#a37a4a'][i]; ctx.strokeStyle = OL; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.rect(-30, -4, 60, 8); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#d8dde0'; ctx.beginPath(); ctx.arc(-25, 0, 1.5, 0, 7); ctx.arc(25, 0, 1.5, 0, 7); ctx.fill();
          ctx.restore();
        }
        if (b.lvl >= 3) { ctx.strokeStyle = OL; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-28, -16); ctx.lineTo(28, -16); ctx.stroke(); ctx.strokeStyle = '#4a5058'; ctx.lineWidth = 3; ctx.stroke(); }
        if (b.hp < b.max || Math.abs(run.p.x - l.x) < 100) { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(-20, -32, 40, 6); ctx.fillStyle = dmg > 0.6 ? '#ff5a4a' : '#ffc04a'; ctx.fillRect(-19, -31, 38 * (b.hp / b.max), 4); }
      }
      ctx.restore();
    }
  },
  // magnifier badge + pips for the remaining number of searches
  searchBadge(run, fu, bx, by) {
    const ctx = this.ctx, p = run.p;
    if (fu.lock) return this.lockBadge(run, fu.lock, bx, by, fu);
    const near = p.room === fu.room && Math.abs(p.x - fu.x) < fu.w / 2 + 80;
    const left = (fu.smax || 1) - (fu.sdone || 0), sc = near ? 1 + 0.08 * Math.sin(run.time * 6) : 0.85;
    ctx.save(); ctx.translate(bx, by); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(12,16,20,0.88)'; ctx.strokeStyle = fu.sdone ? '#ffcf5a' : '#f2e6c4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = fu.sdone ? '#ffcf5a' : '#f2e6c4'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(-1.5, -1.5, 4.2, 0, 7); ctx.stroke();
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(1.8, 1.8); ctx.lineTo(5.5, 5.5); ctx.stroke();
    if ((fu.smax || 1) > 1) for (let i = 0; i < fu.smax; i++) { ctx.fillStyle = i < fu.sdone ? 'rgba(255,255,255,0.18)' : '#ffcf5a'; ctx.beginPath(); ctx.arc((i - (fu.smax - 1) / 2) * 7, 16, 2.4, 0, 7); ctx.fill(); }
    ctx.restore();
  },
  lockBadge(run, lock, bx, by, fu) {
    const ctx = this.ctx, p = run.p, near = fu ? p.room === fu.room && Math.abs(p.x - fu.x) < fu.w / 2 + 80 : Math.abs(p.x - lock.x) < 120;
    const col = lock.pickOnly ? '#7fd0ff' : '#ffb347';
    ctx.save(); ctx.translate(bx, by); const sc = near ? 1 + 0.08 * Math.sin(run.time * 6) : 0.9; ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(20,12,8,0.9)'; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, -2.5, 3.6, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = col; ctx.fillRect(-5, -2.5, 10, 8); ctx.fillStyle = '#2a1a0c'; ctx.fillRect(-0.8, 0, 1.6, 3.5);
    for (let i = 0; i < lock.tier; i++) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc((i - (lock.tier - 1) / 2) * 7, 16, 2.4, 0, 7); ctx.fill(); }
    if (lock.hp < lock.max) { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(-14, -22, 28, 5); ctx.fillStyle = '#ff8a3c'; ctx.fillRect(-13, -21, 26 * lock.hp / lock.max, 3); }
    ctx.restore();
  },
  hideBadge(run, fu, bx, by) {
    const ctx = this.ctx, urgent = run.waveT < 15;
    ctx.save(); ctx.translate(bx, by); const a = urgent ? 0.7 + 0.3 * Math.sin(run.time * 8) : 0.85; ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(12,20,14,0.88)'; ctx.strokeStyle = '#8dffa6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); ctx.stroke();
    // closed eye
    ctx.strokeStyle = '#8dffa6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -3, 6.5, 0.35, Math.PI - 0.35); ctx.stroke();
    for (const dx of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(dx, 3.3); ctx.lineTo(dx * 1.3, 6.5); ctx.stroke(); }
    ctx.restore();
  },
  drawProjectiles(run) {
    const ctx = this.ctx;
    for (const b of run.bullets) {
      ctx.strokeStyle = b.bolt ? '#c8a26a' : b.crit ? '#fff26a' : '#ffd76a'; ctx.lineWidth = b.bolt ? 3 : 2.5;
      const l = b.bolt ? 22 : 18, n = Math.hypot(b.vx, b.vy);
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx / n * l, b.y - b.vy / n * l); ctx.stroke();
    }
    for (const n of run.nades) { ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.rot); ctx.fillStyle = '#3a4a2a'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 9, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#888'; ctx.fillRect(-2, -12, 4, 4); ctx.restore(); if (n.t < 0.5 && Math.floor(n.t * 20) % 2) { ctx.fillStyle = '#f33'; ctx.beginPath(); ctx.arc(n.x, n.y, 3, 0, 7); ctx.fill(); } }
    for (const a of run.acid) { ctx.fillStyle = '#9dff3c'; ctx.beginPath(); ctx.arc(a.x, a.y, 7, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(157,255,60,0.3)'; ctx.beginPath(); ctx.arc(a.x - Math.sign(a.vx) * 10, a.y, 5, 0, 7); ctx.fill(); }
  },
  drawParticles(run) {
    const ctx = this.ctx;
    for (const q of run.parts) {
      if (q.flash) {
        const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 60 * q.s); g.addColorStop(0, 'rgba(255,240,180,0.55)'); g.addColorStop(1, 'rgba(255,160,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, 60 * q.s, 0, 7); ctx.fill();
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.ang || 0); ctx.scale(q.s, q.s);
        ctx.fillStyle = '#ffb030'; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(8, -9); ctx.lineTo(10, -3); ctx.lineTo(30, 0); ctx.lineTo(10, 3); ctx.lineTo(8, 9); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, -4); ctx.lineTo(18, 0); ctx.lineTo(8, 4); ctx.closePath(); ctx.fill();
        ctx.restore(); continue;
      }
      if (q.smoke) { ctx.globalAlpha = Math.max(0, Math.min(0.5, q.t * 0.6)); ctx.fillStyle = '#8a8e94'; ctx.beginPath(); ctx.arc(q.x, q.y, q.s, 0, 7); ctx.fill(); ctx.globalAlpha = 1; continue; }
      if (q.casing) { ctx.globalAlpha = Math.min(1, q.t * 2); ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.c; ctx.strokeStyle = '#3a2a10'; ctx.lineWidth = 0.8; ctx.fillRect(-2.5, -1.2, 5, 2.4); ctx.strokeRect(-2.5, -1.2, 5, 2.4); ctx.restore(); ctx.globalAlpha = 1; continue; }
      if (q.boom) { const k = 1 - q.t / 0.35; const rr = 40 + k * 140; const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, rr); g.addColorStop(0, `rgba(255,240,180,${1 - k})`); g.addColorStop(0.4, `rgba(255,140,40,${0.8 - k * 0.8})`); g.addColorStop(1, 'rgba(80,40,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, 7); ctx.fill(); continue; }
      ctx.globalAlpha = Math.min(1, q.t * 3);
      if (q.bill) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot + q.t * 6); ctx.fillStyle = '#4fbf5a'; ctx.strokeStyle = '#1b3a1f'; ctx.lineWidth = 1.5; ctx.fillRect(-9, -5, 18, 10); ctx.strokeRect(-9, -5, 18, 10); ctx.fillStyle = '#2f7a3a'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill(); ctx.restore(); }
      else { ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, q.s * 0.6, 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of run.texts) {
      ctx.globalAlpha = Math.min(1, t.t * 2);
      ctx.font = '700 17px "Chakra Petch", Kanit, sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 4; ctx.strokeText(t.txt, t.x, t.y);
      ctx.fillStyle = t.col; ctx.fillText(t.txt, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  },
  drawWorldUI(run) {
    const ctx = this.ctx, p = run.p, y = run.yOf(p);
    // interaction prompt
    let prompt = null;
    const sv = run.survivor;
    if (sv && sv.state === 'hiding' && sv.room === p.room && !p.climb && Math.abs(sv.x - p.x) < 60) prompt = '[E] ช่วย';
    else {
      const fu = p.hidden ? null : run.nearFurn(30);
      if (p.hidden) prompt = '[H] ออก';
      if (fu) {
        const parts = [];
        // short "[key] verb" hints, same style everywhere
        if (fu.kind === 'generator' && !run.powered) parts.push(Inv.count(p.backpack, 'fuse') ? '[E] ใส่ฟิวส์' : 'ไม่มีฟิวส์');
        if (fu.items && fu.items.length) parts.push('[E] เปิดดู', '[F] เก็บหมด');
        // while searching the progress bar says it all, so the hint is hidden
        if (fu.loot && !fu.searched && !fu.lock && run.searching !== fu) parts.push(`[${(fu.items && fu.items.length) || run.doorNear() ? 'Q' : 'Q/E'}] ค้น`);
        if (HIDE_SPOTS[fu.kind]) parts.push('[H] ซ่อน');
        if (parts.length) prompt = parts.join('  ·  ');
      }
      const lt = !p.hidden && run.lockTarget();
      const dn0 = lt && lt.fu && run.doorNear(), doorFirst = dn0 && Math.abs(dn0.x - p.x) < Math.abs(lt.fu.x - p.x) - lt.fu.w / 2 + 4;
      if (lt && !run.pick && doorFirst) prompt = `[E] ${dn0.closed ? 'เปิด' : 'ปิด'}`;
      else if (lt && !run.pick) prompt = `[E] สะเดาะ (${Inv.count(p.backpack, 'lockpick')})` + (lt.lock.pickOnly ? '' : '  ·  [F] งัด');
      else if (fu && smashInfo(fu) && !run.pick && !prompt) prompt = '[โจมตี] พัง';
      else if (fu && smashInfo(fu) && prompt && !prompt.includes('[B')) prompt += '  ·  [โจมตี] พัง';
      const dn = !p.hidden && !run.pick && run.doorNear();
      if (dn && prompt && !prompt.includes('[E] เปิด') && !prompt.includes('[E] ปิด')) prompt = `[E] ${dn.closed ? 'เปิด' : 'ปิด'}  ·  ` + prompt;
      if (!prompt && run.site && !p.hidden) {
        const plan = run.barrPlan(run.site), b = run.site.kind === 'door' ? null : run.site.ref.barr, dr = run.site.kind === 'door' ? run.site.ref : null;
        if (plan) prompt = `[B ค้าง] ${({ build: 'ปิดตาย', fix: 'บาริเคต', repair: 'ซ่อม', up: 'เสริม' })[plan.act] || plan.label}${plan.act === 'up' ? ' Lv' + plan.lvl : ''}`;
        if (dr && !dr.broken && run.doorNear() === dr) prompt = `[E] ${dr.closed ? 'เปิด' : 'ปิด'}` + (prompt ? '  ·  ' + prompt : '');
        if (dr && dr.broken && !dr.barr) prompt = '[H] ซ่อน' + (prompt ? '  ·  ' + prompt : '');
      }
      if (p.build) {
        const k = Math.min(1, p.build.t / p.build.max), bw = 90;
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(p.x - bw / 2 - 2, y - 168, bw + 4, 12);
        ctx.fillStyle = '#ffc04a'; ctx.fillRect(p.x - bw / 2, y - 166, bw * k, 8);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; for (let i = 1; i < 9; i++) ctx.fillRect(p.x - bw / 2 + i * 10, y - 166, 1.5, 8);
      }
      if (!prompt && !p.climb) {
        if (run.ladderNear(p, true)) prompt = '[W] ปีนขึ้น';
        else if (run.ladderNear(p, false)) prompt = '[S] ปีนลง';
      }
    }
    if (run.searching) prompt = null;   // nothing to press while searching; keeps the label off the progress bar
    if (prompt) {
      // lift the label above a furniture progress bar (tall furniture puts the bar at label height)
      const nf = !p.hidden && run.nearFurn(30), bar = nf && nf._barY != null ? nf._barY : null;
      const dy = bar != null && bar < y - 116 && bar > y - 160 ? bar - 8 - (y - 122) : 0;
      ctx.save(); ctx.translate(0, dy);
      ctx.font = '600 15px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center';
      const tw = ctx.measureText(prompt).width + 22;
      ctx.fillStyle = 'rgba(12,13,15,0.9)'; ctx.beginPath(); ctx.moveTo(p.x - tw / 2 + 7, y - 150); ctx.lineTo(p.x + tw / 2, y - 150); ctx.lineTo(p.x + tw / 2, y - 129); ctx.lineTo(p.x + tw / 2 - 7, y - 122); ctx.lineTo(p.x - tw / 2, y - 122); ctx.lineTo(p.x - tw / 2, y - 143); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(242,176,30,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#f3ead2'; ctx.fillText(prompt, p.x, y - 131);
      ctx.restore();
    }
    // boss hp bar in world
  },
  drawWeatherFx(run) {
    const ctx = this.ctx, bg = THEMES[run.loc.theme].bg;
    if (bg === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (const s of this.snow) { const y = ((s.y + run.time * 0.05 * s.v) % 1) * this.H; const x = ((s.x + Math.sin(run.time + s.y * 10) * 0.01 - this.cam.x * 0.0002) % 1 + 1) % 1 * this.W; ctx.fillRect(x, y, s.s, s.s); }
    }
  },
  drawVignette(run) {
    const ctx = this.ctx, p = run.p;
    const g = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.3, this.W / 2, this.H / 2, this.H * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);
    const low = 1 - p.hp / p.maxHp;
    if (p.hurtT > 0 || low > 0.6) {
      const a = Math.max(p.hurtT * 1.2, low > 0.6 ? (low - 0.6) * 1.2 * (0.6 + 0.4 * Math.sin(run.time * 6)) : 0);
      const g2 = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.25, this.W / 2, this.H / 2, this.H * 0.8);
      g2.addColorStop(0, 'rgba(160,0,0,0)'); g2.addColorStop(1, `rgba(160,0,0,${Math.min(0.38, a)})`);
      ctx.fillStyle = g2; ctx.fillRect(0, 0, this.W, this.H);
    }
    if (p.hidden) {
      const gh = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.12, this.W / 2, this.H / 2, this.H * 0.7);
      gh.addColorStop(0, 'rgba(0,0,0,0.15)'); gh.addColorStop(1, 'rgba(0,0,0,0.78)'); ctx.fillStyle = gh; ctx.fillRect(0, 0, this.W, this.H);
    }
    if (p.inf > 30) { ctx.fillStyle = `rgba(80,160,40,${(p.inf - 30) / 70 * 0.18})`; ctx.fillRect(0, 0, this.W, this.H); }
  },

  // ---------- HUD ----------
  drawHUD(run) {
    const ctx = this.ctx, p = run.p, W = this.W, H = this.H;
    ctx.textBaseline = 'alphabetic';
    // chamfered metal plate with dark rim + inner highlight and corner brackets
    const pill = (x, y, w, h, col) => {
      const c = Math.min(9, h / 3);
      ctx.beginPath(); ctx.moveTo(x + c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - c); ctx.lineTo(x + w - c, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + c); ctx.closePath();
      if (col) ctx.fillStyle = col; else { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(34,38,44,0.9)'); g.addColorStop(1, 'rgba(14,16,19,0.9)'); ctx.fillStyle = g; }
      ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + c + 1, y + 2); ctx.lineTo(x + w - 2, y + 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(242,176,30,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w - 10, y + 1); ctx.lineTo(x + w - 1, y + 1); ctx.lineTo(x + w - 1, y + 10); ctx.moveTo(x + 1, y + h - 10); ctx.lineTo(x + 1, y + h - 1); ctx.lineTo(x + 10, y + h - 1); ctx.stroke();
    };
    // money
    pill(14, 14, 150, 38);
    Art.draw(ctx, Art.iconArt('cash'), 20, 17, 32, 32); ctx.textAlign = 'left';
    ctx.font = '700 20px "Chakra Petch", Kanit, sans-serif'; ctx.fillStyle = '#9dff8a'; ctx.fillText(U.fmt(run.cash), 58, 40);
    // danger
    const dx = 14, dy = 62;
    pill(dx, dy, 220, 52);
    ctx.fillStyle = run.level >= run.bossLvl - 1 ? '#c0392b' : '#8e2b2b';
    ctx.beginPath(); ctx.arc(dx + 26, dy + 26, 19, 0, 7); ctx.fill();
    const frac = (run.dangerPts % 45) / 45;
    ctx.strokeStyle = '#ff6a5c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(dx + 26, dy + 26, 21, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '800 18px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(run.level, dx + 26, dy + 33);
    ctx.textAlign = 'left'; ctx.font = '600 13px "Chakra Petch", Kanit, sans-serif'; ctx.fillStyle = '#ffb3a8'; ctx.fillText('ระดับอันตราย', dx + 54, dy + 20);
    ctx.font = '400 12px "Chakra Petch", Kanit, sans-serif'; ctx.fillStyle = '#ccc';
    if (!run.bossSpawned) ctx.fillText(`บอสมาเมื่อ: ระดับ ${run.bossLvl} หรือฆ่า ${run.kills}/${run.bossKills}`, dx + 54, dy + 38);
    else if (!run.bossKilled) { ctx.fillStyle = '#ff6a5c'; ctx.fillText(`☠ บอสอยู่ในอาคาร${(run.bosses || []).filter(b => !b.dead).length > 1 ? ' ×' + run.bosses.filter(b => !b.dead).length : ''}! (ไม่ต้องสู้ก็ได้)`, dx + 54, dy + 38); }
    else { ctx.fillStyle = '#9dff8a'; ctx.fillText('✔ กำจัดบอสแล้ว', dx + 54, dy + 38); }
    // wave timer
    {
      const wy = dy + 60, warn = run.waveT <= 15, raid = run.waveQ > 0 || run.waveActive > 0;
      pill(dx, wy, 220, 34, warn ? `rgba(120,20,20,${0.75 + 0.2 * Math.sin(run.time * 8)})` : 'rgba(10,14,20,0.78)');
      ctx.textAlign = 'left'; ctx.font = '700 14px "Chakra Petch", Kanit, sans-serif';
      const mm = Math.max(0, Math.ceil(run.waveT)), t = `${Math.floor(mm / 60)}:${String(mm % 60).padStart(2, '0')}`;
      ctx.fillStyle = warn ? '#fff' : raid ? '#ff8a6a' : '#ddd';
      ctx.fillText(raid && !warn ? `🧟 ฝูงกำลังบุก! · ถัดไป ${t}` : `🧟 ฝูงซอมบี้ถัดไป  ${t}`, dx + 14, wy + 22);
      if (warn) {
        const a = 0.75 + 0.25 * Math.sin(run.time * 7);
        ctx.globalAlpha = a; ctx.textAlign = 'center';
        ctx.font = '800 30px "Chakra Petch", Kanit, sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        const msg = `⚠ ฝูงซอมบี้มาใน ${mm} วินาที`; ctx.strokeText(msg, W / 2, H * 0.31); ctx.fillStyle = '#ff5a4a'; ctx.fillText(msg, W / 2, H * 0.31);
        ctx.font = '600 16px "Chakra Petch", Kanit, sans-serif'; const sub = p.hidden ? 'ซ่อนตัวอยู่ — อยู่นิ่งๆ ไว้' : 'หาที่ซ่อน (ตู้ · ล็อกเกอร์ · ใต้เตียง · ถังขยะ · รถ) แล้วกด H';
        ctx.lineWidth = 4; ctx.strokeText(sub, W / 2, H * 0.31 + 28); ctx.fillStyle = '#ffe2d8'; ctx.fillText(sub, W / 2, H * 0.31 + 28);
        ctx.globalAlpha = 1;
      }
    }
    // boss bar
    if (run.boss && !run.boss.dead) {
      const bw = Math.min(520, W * 0.5), bx = W / 2 - bw / 2;
      pill(bx - 10, 12, bw + 20, 40);
      ctx.fillStyle = '#ffb3a8'; ctx.font = '700 13px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ZOMBIES.boss.n, W / 2, 28);
      ctx.fillStyle = '#300'; ctx.fillRect(bx, 34, bw, 10); ctx.fillStyle = '#e03030'; ctx.fillRect(bx, 34, bw * Math.max(0, run.boss.hp / run.boss.maxHp), 10);
    }
    // objectives
    const ow = 300, ox = W - ow - 14;
    let oy = 14;
    const objs = run.objectives;
    const oh = 40 + Math.max(1, objs.length) * 24;
    pill(ox, oy, ow, oh);
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffd37a'; ctx.font = '700 14px "Chakra Petch", Kanit, sans-serif';
    ctx.fillText(run.farm ? `${run.loc.n} (ฟาร์มของ)` : `${run.loc.n}`, ox + 14, oy + 24);
    ctx.font = '400 13px "Chakra Petch", Kanit, sans-serif';
    if (!objs.length) { ctx.fillStyle = '#bbb'; ctx.fillText(run.restricted ? 'พื้นที่หวงห้าม — หาของแล้วไปจุดอพยพ' : 'หาของได้อิสระ แล้วไปจุดอพยพเพื่อกลับฐาน', ox + 14, oy + 48); }
    objs.forEach((o, i) => {
      const yy = oy + 48 + i * 24;
      ctx.fillStyle = o.done ? '#8dff8a' : '#e8e8e8';
      ctx.fillText((o.done ? '✔ ' : '◻ ') + o.label + (o.target > 1 ? `  ${o.cur}/${o.target}` : ''), ox + 14, yy);
    });
    oy += oh + 10;
    // minimap
    this.drawMinimap(run, ox, oy, ow, 150);
    // bars
    const bx = 14, by = H - 112;
    pill(bx, by, 250, 98);
    const bar = (i, label, v, max, col) => {
      const yy = by + 14 + i * 21;
      ctx.fillStyle = '#ccc'; ctx.font = '500 12px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, bx + 12, yy + 10);
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(bx + 76, yy, 160, 11);
      ctx.fillStyle = col; ctx.fillRect(bx + 76, yy, 160 * U.clamp(v / max, 0, 1), 11);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; for (let k = 1; k < 20; k++) ctx.fillRect(bx + 76 + k * 8, yy, 1.5, 11);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(bx + 76, yy, 160 * U.clamp(v / max, 0, 1), 2);
      ctx.fillStyle = '#fff'; ctx.font = '600 10px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(Math.round(v), bx + 232, yy + 9.5);
    };
    bar(0, '❤ เลือด', p.hp, p.maxHp, '#e04a4a');
    bar(1, '🍖 ความอิ่ม', p.hunger, 100, '#e0a03a');
    bar(2, '⚡ สตามินา', p.stam, 100, '#e0d040');
    bar(3, '☣ ติดเชื้อ', p.inf, 100, '#7ad040');
    // weapons
    const ws = p.weapons, sw = 120, sx = W / 2 - (sw * 3 + 20) / 2, sy = H - 86;
    for (let i = 0; i < 3; i++) {
      const w = ws[i], x = sx + i * (sw + 10);
      pill(x, sy, sw, 72, i === p.cur ? 'rgba(70,52,18,0.92)' : null);
      if (i === p.cur) { ctx.strokeStyle = '#ffc04a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 9, sy); ctx.lineTo(x + sw, sy); ctx.lineTo(x + sw, sy + 63); ctx.lineTo(x + sw - 9, sy + 72); ctx.lineTo(x, sy + 72); ctx.lineTo(x, sy + 9); ctx.closePath(); ctx.stroke(); }
      ctx.fillStyle = '#9ab'; ctx.font = '700 12px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(i + 1, x + 10, sy + 18);
      if (!w) { ctx.fillStyle = '#556'; ctx.font = '400 12px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(SLOT_LABEL[i], x + sw / 2, sy + 42); continue; }
      const it = ITEMS[w.id];
      const wa = WEAPON_ART[w.id] && Parts.weapon(w.id);
      if (wa) { const k = Math.min(86 / wa.w, 26 / wa.h); Art.draw(ctx, wa, x + sw / 2 - wa.w * k / 2, sy + 22 - wa.h * k / 2, wa.w * k, wa.h * k); }
      else Art.draw(ctx, Art.iconArt(w.id), x + sw / 2 - 14, sy + 8, 28, 28);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eee'; ctx.font = '500 12px "Chakra Petch", Kanit, sans-serif'; ctx.fillText(it.n + (w.lvl ? ' +' + w.lvl : ''), x + sw / 2, sy + 50);
      { const d = dur(w); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x + 12, sy + 4, sw - 24, 4); ctx.fillStyle = durColor(d); ctx.fillRect(x + 12, sy + 4, (sw - 24) * Math.max(0, d) / 100, 4);
        if (d <= 0 || w.jammed) { ctx.save(); ctx.fillStyle = 'rgba(120,10,10,0.55)'; ctx.fillRect(x + 4, sy + 10, sw - 8, 30); ctx.fillStyle = '#ffd0c8'; ctx.font = '800 14px "Chakra Petch", Kanit, sans-serif'; ctx.fillText(d <= 0 ? 'พัง' : 'ติด! (R)', x + sw / 2, sy + 30); ctx.restore(); } }
      if (it.cls !== 'melee') {
        const s = wStats(w, G.char);
        const res = Inv.count(p.backpack, it.ammo);
        ctx.fillStyle = w.mag ? '#ffd76a' : '#ff6a5c'; ctx.font = '700 13px "Chakra Petch", Kanit, sans-serif'; ctx.fillText(`${w.mag}/${s.mag}  ·  ${res}`, x + sw / 2, sy + 66);
      }
    }
    // backpack capacity (item use is the quick slots above the weapons)
    const qx = W - 104, qy = H - 86;
    pill(qx, qy, 90, 72);
    const used = Inv.used(p.backpack);
    Art.draw(ctx, Parts.pack(), qx + 35, qy + 10, 20, 26); ctx.textAlign = 'center';
    ctx.fillStyle = used >= p.cap ? '#ff6a5c' : '#fff'; ctx.font = '700 13px "Chakra Petch", Kanit, sans-serif'; ctx.fillText(`${used}/${p.cap}`, qx + 45, qy + 58);
    // hints
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '400 12px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(`A/D เดิน · W/S ปีนบันได · Shift วิ่ง · Z ย่อง · คลิก/Space โจมตี · R รีโหลด · Q ค้น · H ซ่อน · B ค้าง บาริเคด ${p.mods.engineer ? '· C ประดิษฐ์ ' : ''}· 4-9 ปุ่มลัด · Tab เป้ · ออกได้ที่จุดอพยพสีเขียว · Esc หยุด`, W - 14, qy - 10);
    if (run.pick) this.drawPickUI(run);
    this.drawCraftUI(run);
    this.drawExtractHUD(run);
    if (!run.pick && !run.craftOpen) this.drawQuickbar(run);
    // retreat
    if (run.retreatT > 0) {
      const rw = 320, rx = W / 2 - rw / 2, ry = H * 0.62;
      pill(rx - 10, ry - 30, rw + 20, 60);
      ctx.fillStyle = '#fff'; ctx.font = '600 15px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('กำลังถอนตัวกลับฐาน... (ห้ามโดนโจมตี)', W / 2, ry - 6);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(rx, ry + 4, rw, 10); ctx.fillStyle = '#7fe3ff'; ctx.fillRect(rx, ry + 4, rw * Math.min(1, run.retreatT / 3), 10);
    }
  },
  drawPickUI(run) {
    const ctx = this.ctx, pk = run.pick, W = pk.mode === 'force' ? 460 : 500, H = pk.mode === 'force' ? 170 : 340;
    const x = this.W / 2 - W / 2 + (pk.shake > 0 ? U.rf(Math.random, -3, 3) : 0), y = this.H - H - 120;
    const F = s => `${s}px "Chakra Petch", Kanit, sans-serif`;
    ctx.save();
    ctx.fillStyle = 'rgba(10,11,13,0.94)'; ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + W, y); ctx.lineTo(x + W, y + H - 12); ctx.lineTo(x + W - 12, y + H); ctx.lineTo(x, y + H); ctx.lineTo(x, y + 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffd37a'; ctx.font = '700 ' + F(17);
    if (pk.mode === 'force') {
      ctx.fillText(`งัด${pk.door ? 'ประตู' : ''} · ระดับ ${pk.tier}`, x + 18, y + 28);
      // two big keys, the next one lights up
      [['A', 'L'], ['D', 'R']].forEach(([k, side], i) => {
        const kx = x + W / 2 - 80 + i * 110, ky = y + 46, on = pk.next == null || pk.next === side;
        ctx.fillStyle = on ? (pk.flash > 0 ? '#fff2c0' : '#ffc04a') : '#2a2e33'; ctx.fillRect(kx, ky, 50, 50);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(kx, ky, 50, 50);
        ctx.fillStyle = on ? '#1d1305' : '#6a6f76'; ctx.font = '800 ' + F(28); ctx.textAlign = 'center'; ctx.fillText(k, kx + 25, ky + 36);
      });
      ctx.fillStyle = '#ffd37a'; ctx.font = '800 ' + F(22); ctx.fillText('⇄', x + W / 2, y + 80);
      const tx = x + 20, tw = W - 40, ty = y + 112;
      ctx.fillStyle = '#16181b'; ctx.fillRect(tx, ty, tw, 16); ctx.fillStyle = '#ff8a3c'; ctx.fillRect(tx, ty, tw * Math.min(1, pk.prog / 100), 16);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; for (let i = 1; i < 20; i++) ctx.fillRect(tx + i * tw / 20, ty, 2, 16);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(tx, ty, tw, 16);
      ctx.fillStyle = '#c9bfa6'; ctx.font = '500 ' + F(13); ctx.textAlign = 'center';
      ctx.fillText('กด A / D สลับกันเร็วๆ (กดซ้ำปุ่มเดิมไม่นับ) · เสียงดังมาก · Esc ยกเลิก', x + W / 2, y + H - 18);
      ctx.restore(); return;
    }
    const pc = Inv.count(run.p.backpack, 'lockpick');
    ctx.fillText(`สะเดาะกุญแจ · ระดับ ${'●'.repeat(pk.tier)}${'○'.repeat(3 - pk.tier)}`, x + 18, y + 28);
    ctx.textAlign = 'right'; ctx.fillStyle = pc <= 1 ? '#ff8a6a' : '#ddd'; ctx.font = '700 ' + F(14);
    ctx.fillText(`กิ๊บเหลือ ${pc}`, x + W - 18, y + 28);
    const left = Math.max(0, pk.limit - pk.time), tf = left / pk.limit;
    const cx = x + W / 2, cy = y + 168, R0 = 64, turn = pk.dTurn ?? pk.turn, ang = pk.dAngle ?? pk.angle, jam = pk.jam || 0;
    // timer ring
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, R0 + 24, 0, 7); ctx.stroke();
    ctx.strokeStyle = tf < 0.3 ? `rgba(255,90,74,${0.7 + 0.3 * Math.sin(run.time * 12)})` : '#8fd16a';
    ctx.beginPath(); ctx.arc(cx, cy, R0 + 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * tf); ctx.stroke();
    ctx.fillStyle = tf < 0.3 ? '#ff8a6a' : '#cfe8bf'; ctx.font = '700 ' + F(13); ctx.textAlign = 'center';
    ctx.fillText(`${left.toFixed(1)} วิ`, cx, cy - R0 - 34);
    // the arc the pick can sweep (upper half)
    ctx.strokeStyle = 'rgba(255,211,122,0.25)'; ctx.setLineDash([3, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R0 + 52, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    // lock body + cylinder
    const jx = jam > 0.05 ? U.rf(Math.random, -2.5, 2.5) * jam : 0;
    ctx.fillStyle = '#3a3f46'; ctx.beginPath(); ctx.arc(cx + jx, cy, R0 + 10, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.arc(cx + jx, cy, R0, 0, 7); ctx.fill(); ctx.stroke();
    // tension gauge: how far the cylinder has turned (goal = 90°)
    ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(cx + jx, cy, R0 - 6, -Math.PI / 2, 0); ctx.stroke();
    const gcol = jam > 0.3 ? `rgb(255,${90 - 40 * jam | 0},60)` : turn > 0.7 ? '#9dff8a' : '#ffe08a';
    ctx.strokeStyle = gcol; ctx.beginPath(); ctx.arc(cx + jx, cy, R0 - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI / 2 * turn); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + jx + (R0 - 6), cy, 3, 0, 7); ctx.fill(); // goal mark
    ctx.save(); ctx.translate(cx + jx, cy); ctx.rotate(turn * Math.PI / 2);
    ctx.fillStyle = '#a8861c'; ctx.beginPath(); ctx.arc(0, 0, R0 * 0.55, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, -9, 8, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, -5); ctx.lineTo(3.5, 19); ctx.lineTo(-3.5, 19); ctx.closePath(); ctx.fill();
    ctx.restore();
    // pick
    const a = Math.PI + ang / 180 * Math.PI, bend = jam * 0.06;
    ctx.save(); ctx.translate(cx + jx, cy); ctx.rotate(a + bend);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(R0 + 46, 0); ctx.stroke();
    ctx.strokeStyle = pk.hp < 0.35 ? '#ff8a6a' : '#e4e9ee'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(R0 + 46, 0); ctx.stroke();
    ctx.fillStyle = '#c0392b'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(R0 + 38, -7, 24, 14); ctx.fill(); ctx.stroke();
    ctx.restore();
    // status line — plain words for what is happening right now
    const turning = Input.mouse.down || Input.keys['Space'] || Input.keys['KeyE'];
    let st, sc = '#ffd37a';
    if (!turning) { st = 'ขยับเมาส์ ← → เพื่อเลื่อนกิ๊บ แล้วกดค้างเพื่อบิด'; sc = '#c9bfa6'; }
    else if (jam > 0.3) { st = (pk.close || 0) > 0.6 ? 'ติด! ใกล้มากแล้ว — ปล่อย แล้วขยับนิดเดียว' : 'ติด! ยังไม่ใช่จุด — ปล่อย แล้วขยับไปทางอื่น'; sc = '#ff8a6a'; }
    else if (turn > 0.7) { st = 'ใช่เลย! บิดค้างไว้...'; sc = '#9dff8a'; }
    else st = 'กำลังบิด...';
    ctx.textAlign = 'center'; ctx.fillStyle = sc; ctx.font = '700 ' + F(16); ctx.fillText(st, cx, y + H - 58);
    // pick durability
    const bw = 160, bx = cx - bw / 2, by = y + H - 44;
    ctx.fillStyle = '#16181b'; ctx.fillRect(bx, by, bw, 8); ctx.fillStyle = pk.hp < 0.35 ? '#ff5a4a' : '#ffc04a'; ctx.fillRect(bx, by, bw * pk.hp, 8);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, 8);
    ctx.fillStyle = '#aaa'; ctx.font = '500 ' + F(11); ctx.fillText('ความทนกิ๊บ (ลดเมื่อบิดตอนติด)', cx, by + 22);
    ctx.textAlign = 'left'; ctx.fillStyle = '#8a8f96'; ctx.font = '500 ' + F(11); ctx.fillText('Esc ยกเลิก · A/D เลื่อนกิ๊บได้ด้วย', x + 14, y + H - 10);
    ctx.restore();
  },
  drawMinimap(run, x, y, w, h) {
    const ctx = this.ctx, map = run.map;
    ctx.fillStyle = 'rgba(14,16,19,0.88)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); ctx.strokeStyle = 'rgba(242,176,30,0.5)'; ctx.beginPath(); ctx.moveTo(x + w - 10, y + 1); ctx.lineTo(x + w - 1, y + 1); ctx.lineTo(x + w - 1, y + 10); ctx.stroke();
    const totalW = map.BW + STREET * 2, totalH = (map.F + 1) * FH;
    const sc = Math.min((w - 20) / totalW, (h - 20) / totalH);
    const ox = x + w / 2 - (totalW * sc) / 2 + STREET * sc, oy = y + h / 2 + (totalH * sc) / 2 - 4;
    const mx = wx => ox + wx * sc, my = wy => oy + wy * sc;
    for (const rm of map.rooms) {
      const y1 = floorY(rm.f), y0 = y1 - FH + SLAB;
      if (rm.outdoor) { ctx.fillStyle = rm.revealed ? 'rgba(120,140,160,0.25)' : 'rgba(255,255,255,0.04)'; }
      else ctx.fillStyle = rm.revealed ? 'rgba(120,170,200,0.45)' : 'rgba(255,255,255,0.07)';
      ctx.fillRect(mx(rm.x0) + 1, my(y0), (rm.x1 - rm.x0) * sc - 2, (y1 - y0) * sc);
      if (rm.revealed && (G.roles.scout || run.powered)) {
        for (const fu of rm.furn) if (fu.loot && !fu.searched) { ctx.fillStyle = '#ffd76a'; ctx.fillRect(mx(fu.x) - 1, my(y1) - 3, 2.5, 2.5); }
      }
    }
    ctx.fillStyle = '#ffaa33';
    for (const l of map.ladders) if (map.rooms[l.a].revealed || map.rooms[l.b].revealed) ctx.fillRect(mx(l.x) - 1, my(floorY(l.lo + 1)), 2, FH * sc);
    if (G.roles.scout) { ctx.fillStyle = '#d33'; for (const z of run.zombies) if (!z.dead) ctx.fillRect(mx(z.x) - 1.5, my(run.yOf(z)) - 4, 3, 3); }
    for (const b of (run.bosses && run.bosses.length ? run.bosses : [run.boss])) if (b && !b.dead) { ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.arc(mx(b.x), my(run.yOf(b)) - 5, 4, 0, 7); ctx.fill(); }
    for (const ex of run.exits || []) { const ey = my(floorY(ex.f)) - 6; ctx.fillStyle = `rgba(109,255,154,${0.6 + 0.4 * Math.sin(run.time * 4)})`; ctx.beginPath(); ctx.moveTo(mx(ex.x), ey - 6); ctx.lineTo(mx(ex.x) - 5, ey + 2); ctx.lineTo(mx(ex.x) + 5, ey + 2); ctx.closePath(); ctx.fill(); }
    const sv = run.survivor;
    if (sv && sv.state === 'hiding' && map.rooms[sv.room].revealed) { ctx.fillStyle = '#5cf'; ctx.beginPath(); ctx.arc(mx(sv.x), my(floorY(sv.f)) - 5, 4, 0, 7); ctx.fill(); }
    if (run.generator && !run.powered && map.rooms[run.generator.room].revealed) { ctx.fillStyle = '#ffd700'; ctx.fillRect(mx(run.generator.x) - 3, my(floorY(map.rooms[run.generator.room].f)) - 8, 6, 6); }
    const p = run.p;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx(p.x), my(run.yOf(p)) - 5, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 1.5; ctx.stroke();
  },
};
