// ---------- Soldier-style weapon handling for the skeleton rig ----------
// How a trained shooter moves and handles a gun, layered onto Skel.draw (skel.js):
//  - tactical walk with a firearm: knees soft, short rolling heel-to-toe steps, the hips absorb the bob so the muzzle stays
//    level ("gliding"), the chest leans into the gun; the feet set wide and staggered when standing to shoot
//  - ready positions: rifles at low ready (stock in the shoulder, muzzle down), patrol carry when running (muzzle lower,
//    gun in close), pistols two-handed at compressed ready or in "Sul" (muzzle down at the chest) when nothing is around
//  - recoil per weapon: a fast rearward push into the shoulder, muzzle rise and a body rock that settles with a little
//    overshoot; automatic fire climbs and has to be pulled back down
//  - reloads done in the "workspace" (gun pulled in at chest height, muzzle up): the support hand strips the empty
//    magazine (it drops to the floor), fetches a fresh one from the vest / belt, seats it and works the charging handle,
//    slide or bolt; shotguns are fed shell by shell, then pumped; a jam is cleared with tap-rack
const Tac = {
  // recoil: x = push back into the shoulder (sprite px), a = muzzle rise (rad), b = upper body rock (deg), d = settle time (s)
  RECOIL: {
    pistol:   { x: 3, a: 0.30, b: 1.4, d: 0.16 }, revolver: { x: 4, a: 0.50, b: 2.4, d: 0.26 },
    smg:      { x: 2.4, a: 0.05, b: 0.9, d: 0.07 }, rifle: { x: 4, a: 0.07, b: 1.6, d: 0.09 },
    shotgun:  { x: 9, a: 0.20, b: 5.0, d: 0.32 }, sniper: { x: 8, a: 0.16, b: 4.0, d: 0.36 }, crossbow: { x: 2, a: 0.04, b: 1.0, d: 0.2 },
  },
  recoil(id, t, heat) {
    const R = this.RECOIL[id] || (ITEMS[id] && ITEMS[id].cls === 'pistol' ? this.RECOIL.pistol : this.RECOIL.rifle);
    if (!(t >= 0) || t > R.d * 3) return heat > 0.05 ? { x: 0, a: Math.min(0.12, heat * 0.012), b: 0 } : null;
    const rise = 0.018, f = t < rise ? t / rise : Math.exp(-(t - rise) / (R.d * 0.35)) * Math.cos(1.6 * (t - rise) / (R.d * 0.35));   // a sharp kick, then it settles (slightly past)
    return { x: R.x * f, a: R.a * f + Math.min(0.12, heat * 0.012), b: R.b * f };
  },
  fam(id) {
    const it = ITEMS[id];
    if (id === 'shotgun') return 'tube';
    if (id === 'revolver') return 'cyl';
    if (id === 'sniper') return 'bolt';
    return it && it.cls === 'pistol' ? 'pistol' : 'mag';
  },
  sm(v) { v = U.clamp(v, 0, 1); return v * v * (3 - 2 * v); },
  lerp(A, B, k) { return [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k]; },
  // keyframes [u, value]: smooth between them
  key(K, u) {
    if (u <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) if (u <= K[i][0]) { const a = K[i - 1], b = K[i], k = this.sm((u - a[0]) / (b[0] - a[0])); return Array.isArray(a[1]) ? this.lerp(a[1], b[1], k) : a[1] + (b[1] - a[1]) * k; }
    return K[K.length - 1][1];
  },
  // the gun comes into the workspace for the reload (and goes back out at the end): returns the blend 0..1
  reloadBody(gr, rl, it, S) {
    const u = rl.u, pistol = it.cls === 'pistol', f = this.fam(rl.id);
    const e = this.sm(u / 0.1) * (1 - this.sm((u - 0.9) / 0.1));
    const ws = pistol ? [S[0] + 40, S[1] + 30] : [S[0] + 34, S[1] + 26], cant = f === 'cyl' ? -1.0 : pistol ? -0.4 : f === 'tube' ? -0.2 : -0.5;   // muzzle up
    gr.near = this.lerp(gr.near, ws, e);
    let d = cant - gr.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); gr.ang += d * e;
    if (rl.unjam) gr.ang += 0.25 * Math.sin(Math.PI * this.sm(u / 0.3)) * e;   // tap: the gun is rolled to look into the port
    return e;
  },
  // the support hand's path (chest space) and what it carries; nT / ang = where the gun is right now
  reloadHand(rl, it, gm, S, nT, ang, handguard) {
    const u = rl.u, f = this.fam(rl.id), c = Math.cos(ang), s = Math.sin(ang);
    const G = (x, y) => [nT[0] + x * c - y * s, nT[1] + x * s + y * c];   // gun space → chest space
    const vest = [S[0] + 30, S[1] + 64], belt = [S[0] + 22, S[1] + 96];
    if (rl.unjam) {   // tap (slap the magazine home) – rack – back on the gun
      const well = f === 'pistol' || f === 'cyl' ? G(0, 18) : G(gm.front * 0.22, 14), ch = f === 'pistol' || f === 'cyl' ? G(-4, -9) : G(-gm.back * 0.12, -8);
      const P = this.key([[0, handguard], [0.12, G(...(f === 'pistol' ? [0, 30] : [gm.front * 0.22, 28]))], [0.22, well], [0.42, ch], [0.55, [ch[0] - 10 * c, ch[1] - 10 * s]], [0.65, ch], [0.9, handguard]], u);
      return { far: P };
    }
    if (f === 'tube') {   // shell by shell from the belt into the loading port under the receiver, then pump
      const port = G(gm.front * 0.05, 10), n = 4, span = 0.8 / n, k = Math.min(n - 1, Math.floor(u / span)), v = (u - k * span) / span;
      if (u < 0.8) {
        const P = this.key([[0, k ? port : handguard], [0.45, belt], [0.8, [port[0], port[1] + 6]], [1, port]], v);
        return { far: P, item: v > 0.45 && v < 0.97 ? { kind: 'shell', x: P[0], y: P[1], a: ang + 0.3 } : null };
      }
      const w = (u - 0.8) / 0.2, hg = handguard, back = [hg[0] - 12 * c, hg[1] - 12 * s];
      return { far: this.key([[0, port], [0.3, hg], [0.55, back], [0.8, hg], [1, hg]], w) };
    }
    const pis = f === 'pistol' || f === 'cyl';
    const well = pis ? G(0, 14) : G(gm.front * 0.22, 8), under = pis ? G(0, 32) : G(gm.front * 0.22, 26), pouch = pis ? belt : vest;
    const ch = f === 'bolt' ? G(-gm.back * 0.02, -6) : pis ? G(-6, -9) : G(-gm.back * 0.14, -8), chB = pis ? [ch[0] - 12 * c, ch[1] - 12 * s] : [ch[0] - 9 * c, ch[1] - 9 * s];
    const kind = pis ? 'pmag' : f === 'bolt' ? 'bmag' : rl.id === 'crossbow' ? 'bolt' : 'mag';
    const P = this.key([[0, handguard], [0.1, well], [0.22, under], [0.42, pouch], [0.6, under], [0.7, well], [0.78, ch], [0.86, chB], [0.9, ch], [1, handguard]], u);
    // carrying: the empty one on its way down (until it is let go at 0.22), the fresh one from the pouch to the gun
    const item = (u > 0.1 && u < 0.22) || (u > 0.44 && u < 0.7) ? { kind, x: P[0], y: P[1], a: ang } : null;
    return { far: P, item };
  },
  drawItem(ctx, it) {
    ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.a);
    ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.4;
    if (it.kind === 'shell') { ctx.fillStyle = '#b83228'; ctx.fillRect(-2, -5, 4, 8); ctx.fillStyle = '#d4b040'; ctx.fillRect(-2, 2, 4, 2.5); ctx.strokeRect(-2, -5, 4, 9.5); }
    else if (it.kind === 'bolt') { ctx.strokeStyle = '#5a4630'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, 2); ctx.lineTo(14, 2); ctx.stroke(); }
    else {
      const big = it.kind === 'mag', w = it.kind === 'pmag' ? 5 : 7, h = it.kind === 'pmag' ? 13 : it.kind === 'bmag' ? 10 : 20;
      ctx.fillStyle = '#2b2d30'; ctx.beginPath();
      if (big) { ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.quadraticCurveTo(w / 2 + 3, h * 0.6, w / 2 + 6, h); ctx.lineTo(-w / 2 + 6, h); ctx.quadraticCurveTo(-w / 2 + 3, h * 0.6, -w / 2, 0); }   // curved rifle magazine
      else ctx.rect(-w / 2, 0, w, h);
      ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-w / 2 + 1, 1, 1.5, h * 0.7);
    }
    ctx.restore();
  },
  // per-frame motion state for the renderer (render.js) – recoil heat for automatic fire
  state(p, run, it) {
    if (!it || it.cls === 'melee') return { rc: null, reload: null };
    if (p.lastShot !== p._tacLS) { p._tacLS = p.lastShot; if (p.lastShot != null) p._heat = Math.min(12, (p._heat || 0) * Math.exp(-((run.time - (p._tacHT ?? run.time)) * 3)) + 1); p._tacHT = run.time; }
    const heat = (p._heat || 0) * Math.exp(-(run.time - (p._tacHT ?? run.time)) * 3);
    const w = p.weapons[p.cur], rc = this.recoil(w.id, run.time - (p.lastShot ?? -9), it.rate < 0.15 ? heat : 0);
    const reload = p.reloadT > 0 && p.reloadMax ? { u: U.clamp(1 - p.reloadT / p.reloadMax, 0, 1), id: w.id, unjam: !!p.unjam } : null;
    return { rc, reload };
  },
};

// the empty magazine falls out (simulation side: a particle that bounces on the floor like a casing)
(function hookTacDrop() {
  const _upd = Run.update;
  Run.update = function (dt, ...a) {
    const r = _upd.call(this, dt, ...a);
    const p = this.p; if (!this.active || !p) return r;
    const w = p.weapons && p.weapons[p.cur], it = w && ITEMS[w.id];
    const u = p.reloadT > 0 && p.reloadMax && !p.unjam ? 1 - p.reloadT / p.reloadMax : -1;
    if (it && it.cls !== 'melee' && Tac.fam(w.id) !== 'tube' && Tac.fam(w.id) !== 'cyl' && w.id !== 'crossbow' && (p._tacU ?? -1) < 0.22 && u >= 0.22) {
      const sc = CHAR_SCALE, y = this.yOf(p) - (it.cls === 'pistol' ? 44 : 40) * sc;
      this.parts.push({ x: p.x + p.facing * 10 * sc, y, vx: p.facing * U.rf(Math.random, 10, 40), vy: U.rf(Math.random, -40, 0), t: 4, casing: true, mag: it.cls === 'pistol' ? 'p' : 'r', rot: 0, g: 900, floor: floorY(p.f) - 2, c: '#2b2d30' });
    }
    p._tacU = u;
    return r;
  };
})();
