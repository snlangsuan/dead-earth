// ---------- Shot visuals in step with the gun ----------
// Runs after every other attack hook (aim lock, shooting down a hatch) has decided where the shots go. It turns the
// gun to that direction, measures where the muzzle really is in that exact pose (same skeleton code as the drawing,
// on a context that only tracks transforms), starts the bullets and the smoke there, and lets the skeleton draw the
// flash on the barrel tip — so tracer, flash and barrel always line up, even on the first shot out of the low ready.
const MeasureCtx = (() => {
  const t = {
    m: new DOMMatrix(), st: [], globalAlpha: 1,
    save() { this.st.push(DOMMatrix.fromMatrix(this.m)); }, restore() { this.m = this.st.pop() || new DOMMatrix(); },
    translate(x, y) { this.m.translateSelf(x, y); }, rotate(a) { this.m.rotateSelf(a * 180 / Math.PI); }, scale(x, y) { this.m.scaleSelf(x, y); },
    transform(a, b, c, d, e, f) { this.m.multiplySelf(new DOMMatrix([a, b, c, d, e, f])); },
    setTransform(a, b, c, d, e, f) { this.m = typeof a === 'object' ? DOMMatrix.fromMatrix(a) : new DOMMatrix([a, b, c, d, e, f]); },
    resetTransform() { this.m = new DOMMatrix(); }, getTransform() { return DOMMatrix.fromMatrix(this.m); },
    measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() { } }; }, createRadialGradient() { return { addColorStop() { } }; },
  };
  return new Proxy(t, { get: (o, k) => (k in o ? o[k] : () => { }), set: (o, k, v) => { o[k] = v; return true; } });
})();

Object.assign(R, {
  // muzzle (world) for the player drawn aiming at relative angle rel (0 = level, + = down), no recoil
  measureMuzzle(p, rel) {
    const k = p._sk; if (!k || typeof Skel === 'undefined') return null;
    const face = p.facing || k.face;
    const st = Object.assign({}, k.st, { mode: 'aim', aimA: rel ?? k.st.aimA, kick: 0, swing: 0, turn: null, flash: 0 });
    MeasureCtx.setTransform(1, 0, 0, 1, 0, 0); MeasureCtx.st.length = 0;
    const mz = Skel.draw(MeasureCtx, k.base, p.x, k.y, face, k.sc, st);
    return mz && mz.dx != null ? { x: p.x + face * mz.dx, y: k.y - mz.dy } : null;
  },
});

(function hookShotFx() {
  const _attack = Run.attack;
  Run.attack = function (...a) {
    const p = this.p, nb = this.bullets.length, np = this.parts.length;
    const r = _attack.apply(this, a);
    if (!p || this.bullets.length <= nb) return r;
    if (!p._sk) return r;
    const fresh = this.bullets.slice(nb);
    // shooting down through the floor / a hatch: the shot leaves the barrel, crosses the floor where the barrel points,
    // and carries on in the room below from under the slab (it used to appear out of the floor at the player's feet)
    const down = fresh.filter(b => b.f !== p.f);
    if (down.length) {
      const mz = R.measureMuzzle(p, null);
      if (mz) {
        p._fireT = this.time; p._fireRel = p._sk.st.aimA; p._flashS = down.length > 1 ? 1.35 : 1;
        const floorTop = floorY(p.f) + FEET, ceil = floorY(p.f) + SLAB;   // actors (and their shots) are drawn FEET up: the slab's top in their space
        for (const b of down) {
          const n = Math.hypot(b.vx, b.vy) || 1, dx = b.vx / n, dy = Math.max(0.15, b.vy / n);
          const xe = mz.x + dx * (floorTop - mz.y) / dy, xb = xe + dx * (SLAB + 4) / dy;
          const rm = roomAt(this.map, b.f, xb);
          if (!rm) continue;
          this.parts.push({ streak: true, x: mz.x, y: mz.y, x2: xe, y2: floorTop, t: 0.09, max: 0.09 });
          Object.assign(b, { x: xb, y: ceil + 4, room: rm.id });
        }
        for (let i = this.parts.length - 1; i >= np; i--) if (this.parts[i].flash || this.parts[i].smoke) this.parts.splice(i, 1);   // the regular shot's flash / smoke were placed for a level shot
        this.parts.push({ x: mz.x, y: mz.y, vx: p.facing * 20, vy: -15, t: 0.5, smoke: true, s: 5, g: 0 });
      }
    }
    const shots = fresh.filter(b => b.f === p.f && !p.aimDownT);
    if (!shots.length) return r;
    // where the shots go, relative to the facing (0 = level ahead, + = downward)
    let sx = 0, sy = 0; for (const b of shots) { const n = Math.hypot(b.vx, b.vy) || 1; sx += b.vx / n; sy += b.vy / n; }
    const ang = Math.atan2(sy, sx * p.facing), rel = U.clamp(ang, -0.6, 0.6);
    const mz = R.measureMuzzle(p, rel); if (!mz) return r;
    p._fireT = this.time; p._fireRel = rel; p._flashS = shots.length > 1 ? 1.35 : 1;
    // bullets start at the muzzle; a shot steeper than the arms can turn the gun keeps its direction but leaves the barrel
    const ox = shots[0].x, oy = shots[0].y;
    for (const b of shots) { b.x = mz.x; b.y = mz.y; }
    // the world-space flash is replaced by the one drawn on the barrel; smoke moves to the muzzle
    for (let i = this.parts.length - 1; i >= np; i--) {
      const q = this.parts[i];
      if (q.flash) this.parts.splice(i, 1);
      else if (q.smoke) { q.x += mz.x - ox; q.y += mz.y - oy; }
    }
    return r;
  };
})();
