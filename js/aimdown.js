// ---------- Shooting down a ladder hatch ----------
// Stand at the top of a ladder (the open hatch in your floor) with a gun: if there's nothing to shoot on your own
// floor in front of you, the character crouches and fires down the hole at the nearest zombie below.
Object.assign(Run, {
  hatchUnder() {
    const p = this.p; if (p.climb || p.hidden) return null;
    return this.map.ladders.find(l => l.lo === p.f - 1 && Math.abs(l.x - p.x) < 44 && !(l.barr && l.barr.hp > 0)) || null;
  },
  // zombies below that can be seen through the hatch (in the room under it, or climbing that ladder)
  DOWN_RANGE: 340,
  downCands(l) {
    const out = [];
    for (const z of this.zombies) {
      if (z.dead) continue;
      const onLadder = z.climb && z.climb.lad === l;
      if (!onLadder && (z.climb || z.f !== l.lo || Math.abs(z.x - l.x) > this.DOWN_RANGE || !this.clearLine(l.lo, l.x, z.x))) continue;
      out.push(z);
    }
    return out;
  },
  // aiming (right-click) with the cursor below your floor picks the zombie under the cursor; otherwise the nearest one
  downTarget() {
    const p = this.p, w = this.curWeapon();
    if (!w || ITEMS[w.id].cls === 'melee') return null;
    const l = this.hatchUnder(); if (!l) return null;
    if (p.aiming && p.aimDown && p.aimTgt && !p.aimTgt.dead) return { z: p.aimTgt, l };
    let best = null, bd = Infinity;
    for (const z of this.downCands(l)) { const d = Math.abs(z.x - l.x); if (d < bd) { bd = d; best = z; } }
    return best ? { z: best, l } : null;
  },
  // distance to the zombie the normal shot would hit (Infinity = none)
  sameFloorDist() {
    const p = this.p, s = wStats(this.curWeapon(), G.char); let bd = Infinity;
    for (const z of this.zombies) {
      if (z.dead || z.f !== p.f || z.climb || (z.x - p.x) * p.facing < 0) continue;
      const d = Math.abs(z.x - p.x); if (d <= s.range && d < bd && this.clearLine(p.f, p.x, z.x)) bd = d;
    }
    return bd;
  },
  sameFloorTarget() { return this.sameFloorDist() < Infinity; },
  // shoot down the hatch? aiming: only when aiming below. Otherwise: when the zombie below is closer than the one ahead.
  wantDown(anyTime) {
    const p = this.p, w = this.curWeapon();
    if (!w || ITEMS[w.id].cls === 'melee' || (!anyTime && p.atkCd > 0)) return null;
    if (p.kbDown) return this.downTarget();   // holding S at the hatch
    if (p.aiming) return p.aimDown ? this.downTarget() : null;
    const d = this.downTarget(); if (!d) return null;
    const dd = Math.hypot(d.z.x - p.x, FH);
    return dd < this.sameFloorDist() ? d : null;
  },
});

(function hookAimDown() {
  const _attack = Run.attack;
  Run.attack = function (...a) {
    const p = this.p, w = this.curWeapon();
    const down = this.wantDown();
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
