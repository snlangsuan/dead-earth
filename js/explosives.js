// ---------- Explosives vs floors ----------
// * Blasts stay on their own floor and stop at shut doors (no more damage through walls / slabs).
// * Throw a grenade while standing at an open ladder hatch and it drops down the hole to the floor below
//   (one that happens to roll onto a hatch falls through too).
// old saves: drop items the game no longer has (e.g. the removed breaching charge)
(function dropUnknownItems() {
  const _load = State.load;
  State.load = function (...a) {
    const ok = _load.apply(this, a);
    if (ok && G) {
      for (const k of ['stash', 'backpack']) if (Array.isArray(G[k])) G[k] = G[k].filter(e => e && ITEMS[e.id]);
      if (Array.isArray(G.quick)) G.quick = G.quick.map(id => (id && ITEMS[id] ? id : null));
      if (G.shop && Array.isArray(G.shop.stock)) G.shop.stock = G.shop.stock.filter(e => ITEMS[e.id]);
    }
    return ok;
  };
})();

(function hookExplosives() {
  const _throw = Run.throwNade;
  Run.throwNade = function (want) {
    const p = this.p;
    {
      // standing at an open ladder hatch: drop the grenade straight down the hole instead of throwing it across the room
      const l = !p.climb && this.map.ladders.find(l => l.lo === p.f - 1 && Math.abs(l.x - p.x) < 44 && !(l.barr && l.barr.hp > 0));
      const n0 = this.nades.length, r = _throw.call(this, want), n = this.nades.length > n0 && this.nades[this.nades.length - 1];
      if (l && n) { Object.assign(n, { x: l.x, y: floorY(p.f) + SLAB + 12, vx: p.facing * 40, vy: 160, f: l.lo, room: l.a }); this.popText(p.x, this.yOf(p) - 100, 'ทิ้งลงช่องบันได!', '#ffb36a'); }
      return r;
    }
  };

  // grenades fall through an open ladder hatch in the floor
  const _upd = Run.updateProjectiles;
  Run.updateProjectiles = function (dt) {
    for (const n of this.nades) {
      const fy = floorY(n.f);
      if (n.y >= fy - 8) {
        const l = this.map.ladders.find(l => l.lo === n.f - 1 && Math.abs(l.x - n.x) < 24 && !(l.barr && l.barr.hp > 0));
        if (l) { n.f = l.lo; n.room = l.a; n.y = fy + 4; n.vy = Math.max(n.vy, 120); n.vx *= 0.3; }
      }
    }
    return _upd.call(this, dt);
  };

  // a blast reaches what is on its own floor with nothing shut in between
  Run.explode = function (n) {
    const R0 = n.r || 160, D0 = n.dmg || 220; Snd.explosion(n.x, n.f);
    const reach = (f, x, climb) => climb || (f === n.f && this.clearLine(n.f, n.x, x));
    const dist = (x, y) => Math.hypot(x - n.x, (y - 40 - n.y) * 1.3);
    for (const z of this.zombies) {
      if (z.dead || !reach(z.f, z.x, z.climb)) continue;
      const d = dist(z.x, this.yOf(z));
      if (d < R0) this.damageZombie(z, D0 * (1 - d / R0 * 0.6), Math.sign(z.x - n.x) * 260);
    }
    const p = this.p, PR = 120 * Math.min(1.3, R0 / 160);
    if (reach(p.f, p.x, p.climb)) { const pd = dist(p.x, this.yOf(p)); if (pd < PR) this.hurt(40 * (1 - pd / PR)); }
    const floors = [n.f];
    for (const rm of this.map.rooms) { // blasts wreck furniture too (and whatever is inside)
      if (!floors.includes(rm.f) || !rm.furn) continue;
      if (rm.f === n.f && !this.clearLine(n.f, n.x, (rm.x0 + rm.x1) / 2) && !(n.x >= rm.x0 && n.x <= rm.x1)) continue;
      for (const fu of rm.furn.slice()) {
        if (!smashInfo(fu)) continue;
        const d = Math.abs(fu.x - n.x) - fu.w / 2;
        if (d < R0 * 0.75) this.damageFurn(fu, rm, D0 * 0.6 * (1 - Math.max(0, d) / R0));
      }
    }
    for (const t of this.traps || []) if (t.type === 'mine' && !t.dead && floors.includes(t.f) && Math.abs(t.x - n.x) < R0 * 0.6 && t !== n.src) t.chain = 0.15; // chain reaction
    const fx = (y, k) => {
      for (let i = 0; i < 28 * k; i++) this.parts.push({ x: n.x, y, vx: U.rf(Math.random, -380, 380), vy: U.rf(Math.random, -380, 120), t: U.rf(Math.random, 0.3, 0.8), c: U.pick(Math.random, ['#ffcc33', '#ff7a1a', '#ff3d00', '#555']), s: U.rf(Math.random, 3, 7), g: 600 });
      this.parts.push({ x: n.x, y, boom: true, t: 0.35, s: k });
      for (let i = 0; i < 12 * k; i++) this.parts.push({ x: n.x + U.rf(Math.random, -40, 40), y: y + U.rf(Math.random, -30, 10), vx: U.rf(Math.random, -40, 40), vy: U.rf(Math.random, -60, -10), t: 1.4, smoke: true, s: 14 + Math.random() * 14, g: 0 });
    };
    fx(n.y, 1);
    this.shake = 10;
    this.noise(n.x, n.y, 1100);
    this.dangerPts += 1.2;
  };
})();
