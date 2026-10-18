// ---------- Shooting down a ladder hatch ----------
// Stand at the top of a ladder (the open hatch in your floor) with a gun: if there's nothing to shoot on your own
// floor in front of you, the character crouches and fires down the hole at the nearest zombie below.
Object.assign(Run, {
  hatchUnder() {
    const p = this.p; if (p.climb || p.hidden) return null;
    return this.map.ladders.find(l => l.lo === p.f - 1 && Math.abs(l.x - p.x) < 58 && !(l.barr && l.barr.hp > 0)) || null;
  },
  // a spot to shoot down from: the hatch if you're at one, otherwise straight through the floor under your feet
  // (any upper floor with a room below). { x, lo (floor below), a (room below), floor: true when it's through the slab }
  holeUnder() {
    const p = this.p; if (p.climb || p.hidden || p.f <= 0) return null;
    const h = this.hatchUnder(); if (h) return h;
    const r = this.map.rooms.find(r => r.f === p.f - 1 && p.x >= r.x0 && p.x <= r.x1);
    return r ? { x: p.x, lo: p.f - 1, a: r.id, floor: true } : null;
  },
  // zombies below that can be seen through the hatch (in the room under it, or climbing that ladder)
  DOWN_RANGE: 520,
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
  downTarget(l) {
    const p = this.p, w = this.curWeapon();
    if (!w || ITEMS[w.id].cls === 'melee') return null;
    l = l || this.hatchUnder(); if (!l) return null;
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
    // holding S / aiming below the floor: anywhere on an upper floor (through the hatch, or straight through the floor)
    if (p.kbDown || p.aiming) { if (p.aiming && !p.aimDown) return null; const l = this.holeUnder(); return l ? (this.downTarget(l) || { z: null, l }) : null; }
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
      let tx, ty;
      if (z) { tx = z.x; ty = this.yOf(z) - z.Z.r * (z.Z.boss ? 4 : 3); }
      else if (p.aiming) { const mw = R.screenToWorld(Input.mouse.x, Input.mouse.y); tx = mw.x; ty = Math.max(y0 + 20, mw.y + FEET); }
      else { tx = l.x + p.facing * 70; ty = floorY(l.lo) - 40; }   // keyboard, nothing in sight: down and a little forward
      const base = Math.atan2(ty - y0, tx - x0);
      for (const b of this.bullets.slice(n0)) {
        const ang = base + U.rf(Math.random, -s.spread, s.spread), sp = Math.hypot(b.vx, b.vy);
        Object.assign(b, { x: x0, y: y0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, f: l.lo, room: l.a });
        if (l.floor) b.dmg *= 0.8;   // through the floor slab: loses a bit of punch
      }
      p.aimDownT = 0.45; p.facing = Math.sign(l.x - p.x) || p.facing;
    }
    return r;
  };
  const _upd = Run.update;
  Run.update = function (dt, ...a) { if (this.p && this.p.aimDownT > 0) this.p.aimDownT -= dt; return _upd.call(this, dt, ...a); };
})();
