// ---------- Aiming: hold right-click with a gun ----------
// While held: the character faces the cursor and walks slowly (no sprint), the zombie closest to the cursor
// (same floor, in front, in range, not behind a shut door) is locked, and the aim steadies over ~0.8 s, shrinking
// the spread down to 25%. Fire as usual (left click / Space) and the shot goes to the locked zombie.
// Each shot kicks the aim back open a bit.
const Aim = {
  STEADY: 0.8, MIN: 0.25,
  rdown: false,
  gun(run) { const w = run.curWeapon && run.curWeapon(); return w && ITEMS[w.id].cls !== 'melee' ? w : null; },
  // spread multiplier for the current steadiness
  mult(p) { return 1 - (1 - this.MIN) * Math.min(1, (p.aimT || 0) / this.STEADY); },
  // camera while aiming: long guns (sniper, scoped rifle) zoom out and look further ahead
  view(run, z0) {
    const w = this.gun(run); if (!w) return null;
    if (run.p.aimDown) return { zoom: 0.9, look: 0 };   // looking down a hatch: stay over it
    const s = wStats(w, G.char), long = s.range >= 900, zoom = long ? 0.75 : 0.92;
    const halfW = R.W / 2 / (z0 * zoom);
    return { zoom, look: Math.max(0, Math.min(s.range * 0.5, halfW * 0.78) - 90) };
  },
  pick(run) {
    const p = run.p, w = this.gun(run); if (!w) return null;
    const s = wStats(w, G.char), mw = R.screenToWorld(Input.mouse.x, Input.mouse.y);
    let best = null, bd = Infinity;
    // cursor below your floor (upper floors): aim down — through a hatch, or straight through the floor
    const l = run.holeUnder && run.holeUnder();
    p.aimDown = !!l && mw.y > floorY(p.f) + 6;
    if (p.aimDown) {
      for (const z of run.downCands(l)) { const d = Math.hypot(z.x - mw.x, (run.yOf(z) - 40) - mw.y); if (d < bd) { bd = d; best = z; } }
      return best;
    }
    for (const z of run.zombies) {
      if (z.dead || z.f !== p.f || z.climb) continue;
      const rm = run.map.rooms[z.room]; if (!rm || (!rm.revealed && !run.powered)) continue;
      const dx = (z.x - p.x) * p.facing;
      if (dx < 0 || dx > s.range || !run.clearLine(p.f, p.x, z.x)) continue;
      const d = Math.abs(z.x - mw.x); if (d < bd) { bd = d; best = z; }
    }
    return best;
  },
};

(function () {
  const cv = document.getElementById('game') || document.querySelector('canvas');
  if (cv) cv.addEventListener('mousedown', e => { if (e.button === 2) Aim.rdown = true; });
  // Mac: Ctrl+click is a right-click there, so it aims too (and must not also fire)
  window.addEventListener('mousedown', e => {
    if (e.target === cv && e.button === 0 && e.ctrlKey && Keys.mac) { Aim.rdown = Aim.ctrlAim = true; e.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('mouseup', e => {
    if (e.button === 2 || (e.button === 0 && Aim.ctrlAim)) { Aim.rdown = false; Aim.ctrlAim = false; }
  }, true);
  window.addEventListener('blur', () => { Aim.rdown = false; Aim.ctrlAim = false; });

  const _upd = Run.update;
  Run.update = function (dt, ...a) {
    const p = this.p;
    if (p && this.active) {
      const on = Aim.rdown && !this.paused && !this.over && !p.climb && !p.hidden && !this.pick && !!Aim.gun(this);
      if (on) {
        if (!p.aiming) p.aimT = 0;
        p.aiming = true;
        const prev = p.aimTgt;
        p.aimTgt = Aim.pick(this);
        if (prev && p.aimTgt !== prev) p.aimT = Math.min(p.aimT, Aim.STEADY * 0.35);   // switching target loses some steadiness
        p.aimT = Math.min(Aim.STEADY, p.aimT + dt * (p.moving ? 0.45 : 1));
      } else { p.aiming = false; p.aimDown = false; p.aimT = 0; p.aimTgt = null; }
    }
    return _upd.call(this, dt, ...a);
  };

  // re-aim the shots that the regular attack just fired at the locked zombie, with the steadied spread
  const _attack = Run.attack;
  Run.attack = function (...a) {
    const p = this.p, n0 = this.bullets.length, z = p && p.aiming ? p.aimTgt : null;
    const r = _attack.apply(this, a);
    if (p && p.aiming && this.bullets.length > n0) {
      const s = wStats(this.curWeapon(), G.char), k = Aim.mult(p);
      for (const b of this.bullets.slice(n0)) {
        if (b.f !== p.f) continue;   // a shot down a hatch keeps its own aim
        let base;
        if (z && !z.dead) base = Math.atan2(this.yOf(z) - z.Z.r * (z.Z.boss ? 4 : 3) - b.y, z.x - b.x);
        else { const mw = R.screenToWorld(Input.mouse.x, Input.mouse.y); base = Math.atan2(U.clamp(mw.y + FEET - b.y, -80, 80), (mw.x - b.x) || p.facing); }
        const ang = base + U.rf(Math.random, -s.spread * k, s.spread * k), sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
      }
      p.aimT *= s.pellets ? 0.5 : 0.35;   // recoil
    }
    return r;
  };

  // laser + lock bracket, in world space (drawn with the other world UI)
  const _wui = R.drawWorldUI;
  R.drawWorldUI = function (run, ...a) {
    const r = _wui.call(this, run, ...a);
    const p = run.p; if (!p || !p.aiming) return r;
    const ctx = this.ctx, k = Math.min(1, (p.aimT || 0) / Aim.STEADY), z = p.aimTgt;
    const hl = p.aimDown && run.holeUnder();
    const x0 = hl ? hl.x : p.x + p.facing * 30, y0 = hl ? floorY(hl.lo) - FH + SLAB + 4 : run.yOf(p) - 42;
    let tx, ty;
    if (z && !z.dead) { tx = z.x; ty = run.yOf(z) - z.Z.r * (z.Z.boss ? 4 : 3); }
    else { const mw = R.screenToWorld(Input.mouse.x, Input.mouse.y); tx = mw.x; ty = hl ? mw.y + FEET : U.clamp(mw.y + FEET, y0 - 80, y0 + 80); }
    ctx.save();
    ctx.strokeStyle = `rgba(255,70,60,${0.18 + 0.4 * k})`; ctx.lineWidth = 1.2; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
    if (z && !z.dead) {
      const g = 24 - 12 * k, L = 6;
      ctx.strokeStyle = k >= 1 ? '#ff4a3c' : '#ffb36a'; ctx.lineWidth = 2;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const cx = tx + sx * g, cy = ty + sy * g;
        ctx.beginPath(); ctx.moveTo(cx, cy - sy * L); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx * L, cy); ctx.stroke();
      }
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(tx, ty, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    return r;
  };
})();
