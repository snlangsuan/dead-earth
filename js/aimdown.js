// ---------- Shooting down a ladder hatch ----------
// Stand at the top of a ladder (the open hatch in your floor) with a gun: if there's nothing to shoot on your own
// floor in front of you, the character crouches and fires down the hole at the nearest zombie below.
Object.assign(Run, {
  hatchUnder() {
    const p = this.p; if (p.climb || p.hidden) return null;
    return this.map.ladders.find(l => l.lo === p.f - 1 && Math.abs(l.x - p.x) < 44 && !(l.barr && l.barr.hp > 0)) || null;
  },
  // nearest zombie below that can be seen through the hatch (in the room under it, or climbing that ladder)
  downTarget() {
    const p = this.p, w = this.curWeapon();
    if (!w || ITEMS[w.id].cls === 'melee') return null;
    const l = this.hatchUnder(); if (!l) return null;
    const range = 260; let best = null, bd = range;
    for (const z of this.zombies) {
      if (z.dead) continue;
      const onLadder = z.climb && z.climb.lad === l;
      if (!onLadder && (z.climb || z.f !== l.lo || !this.clearLine(l.lo, l.x, z.x))) continue;
      const d = Math.abs(z.x - l.x); if (d < bd) { bd = d; best = z; }
    }
    return best ? { z: best, l } : null;
  },
  sameFloorTarget() {
    const p = this.p, s = wStats(this.curWeapon(), G.char);
    return this.zombies.some(z => !z.dead && z.f === p.f && !z.climb && (z.x - p.x) * p.facing >= 0 && Math.abs(z.x - p.x) <= s.range && this.clearLine(p.f, p.x, z.x));
  },
});

(function hookAimDown() {
  const _attack = Run.attack;
  Run.attack = function (...a) {
    const p = this.p, w = this.curWeapon();
    const down = w && ITEMS[w.id].cls !== 'melee' && p.atkCd <= 0 && !this.sameFloorTarget() ? this.downTarget() : null;
    const n0 = this.bullets.length;
    const r = _attack.apply(this, a);
    if (down && this.bullets.length > n0) {
      const { z, l } = down, s = wStats(w, G.char);
      const x0 = l.x + Math.sign(p.x - l.x || p.facing) * 6, y0 = floorY(l.lo) - FH + SLAB + 4;   // out of the hatch, just under the slab
      const ty = this.yOf(z) - z.Z.r * (z.Z.boss ? 4 : 3), base = Math.atan2(ty - y0, z.x - x0);
      for (const b of this.bullets.slice(n0)) {
        const ang = base + U.rf(Math.random, -s.spread, s.spread), sp = Math.hypot(b.vx, b.vy);
        Object.assign(b, { x: x0, y: y0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, f: l.lo, room: l.a });
      }
      p.aimDownT = 0.45; p.facing = Math.sign(l.x - p.x) || p.facing;
    }
    return r;
  };
  const _upd = Run.update;
  Run.update = function (dt, ...a) { if (this.p && this.p.aimDownT > 0) this.p.aimDownT -= dt; return _upd.call(this, dt, ...a); };
})();
