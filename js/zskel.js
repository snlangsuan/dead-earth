// ---------- Zombie rigs: one-piece upper body (head + torso + reaching arms) on two jointed legs ----------
// The torso, head and arms are cut from the idle sprite, the legs (thigh → knee → shin → ankle → foot) are separate
// parts, so the legs really step instead of a picture sliding along. Each kind moves its own way:
//   walker / spitter: a shamble — knees always bent, one leg drags with its toes scraping the floor, the body lurches
//                     forward on every drag step and sways, the arms bounce out in front with the body
//   runner:           a lunging sprint, bent far forward, knees driving high
//   brute / boss:     a heavy stomp — short steps, the whole body drops onto each foot and rocks side to side
// window.ZSKEL_META[base] (zrig/build_z.py) holds the part rectangles, the hip joint and the leg lengths (idle sprite px).
const ZSkel = {
  GAIT: {
    walk:  { A: 20, K: 34, S: 0.64, drag: 0.6, lean: 5, lurch: 6, bob: 1.0, sway: 2.5, slip: 0.95, twitch: 1 },
    run:   { A: 42, K: 96, S: 0.42, drag: 0,   lean: 14, lurch: 3, bob: 1.0, sway: 1.5, slip: 0.9, twitch: 0.5 },
    stomp: { A: 22, K: 40, S: 0.7,  drag: 0,   lean: 3, lurch: 4, bob: 1.6, sway: 3.5, slip: 0.95, twitch: 0.3 },
  },
  KIND: { zombie_walker0: 'walk', zombie_walker1: 'walk', zombie_spitter: 'walk', zombie_runner: 'run', zombie_brute: 'stomp', zombie_boss: 'stomp' },
  img(base, part) { return Override.get('zskel_' + base.slice(7) + '_' + part); },
  has(base) {
    const m = window.ZSKEL_META && window.ZSKEL_META[base];
    return !!(m && ['body', 'thigh', 'shin', 'foot'].every(p => this.img(base, p)));
  },
  part(ctx, base, m, name, filter) {
    const p = m.parts[name], im = this.img(base, name); if (!im) return;
    ctx.drawImage(filter ? FilterCache.get(im, filter) : im, p.ox - (p.px || 0), p.oy - (p.py || 0));
  },
  // the idle stance: how far the knees are bent so the feet reach the floor exactly as in the drawing
  stance(m) {
    if (m._C != null) return m._C;
    const J = m.joints, foot = m.parts.foot.h - 3, legs = J.thighLen + J.shinLen, vert = J.ground - J.hip[1];
    const c = U.clamp((vert - foot) / legs, 0.5, 1);
    return (m._C = 2 * Math.acos(c) * 180 / Math.PI);   // knee angle; the thigh leans forward half of it
  },
  // one leg: hip (thigh forward, deg), knee (fold), foot (sole angle, + = toes down). drag = this leg is the lame one
  pose(ph, G, C, amp, drag) {
    const u = ((ph / (2 * Math.PI)) % 1 + 1) % 1, A = G.A * amp, H0 = C / 2;
    const ramp = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a))), sm = v => v * v * (3 - 2 * v);
    // the dragged leg spends longer on the floor and barely lifts
    const S = drag ? Math.min(0.8, G.S + 0.1) : G.S;
    let hip, knee, foot;
    if (u < S) {
      const v = u / S;
      hip = H0 + A * (1 - 2 * v);
      knee = C + amp * 10 * Math.sin(Math.PI * Math.min(1, v / 0.5)) * (v < 0.5 ? 1 : 0);   // sags as the weight lands
      foot = amp * (-6 * (1 - ramp(v, 0, 0.15)) + (drag ? 10 : 20) * ramp(v, 0.65, 1));
    } else {
      const v = (u - S) / (1 - S);
      hip = H0 - A + 2 * A * sm(v);
      knee = C + amp * G.K * (drag ? 1 - G.drag : 1) * Math.pow(Math.sin(Math.PI * v), 1.2);
      foot = drag ? amp * (34 - 18 * v) : amp * (20 * (1 - ramp(v, 0, 0.35)) - 6 * ramp(v, 0.7, 1));   // the lame foot scrapes along on its toes
    }
    return { hip, knee, foot };
  },
  legH(m, q) { const J = m.joints, r = Math.PI / 180; return J.thighLen * Math.cos(q.hip * r) + J.shinLen * Math.cos((q.hip - q.knee) * r); },
  leg(ctx, base, m, hx, hy, q, filter) {
    const J = m.joints;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-q.hip * Math.PI / 180);
    this.part(ctx, base, m, 'thigh', filter);
    ctx.translate(0, J.thighLen); ctx.rotate(q.knee * Math.PI / 180);
    this.part(ctx, base, m, 'shin', filter);
    ctx.translate(0, J.shinLen); ctx.rotate((q.hip - q.knee + q.foot) * Math.PI / 180);
    this.part(ctx, base, m, 'foot', filter);
    ctx.restore();
  },
  // world distance per step (phase advances π)
  stepLen(base, scale) {
    const m = window.ZSKEL_META[base], J = m.joints, G = this.GAIT[this.KIND[base] || 'walk'];
    return 2 * (J.thighLen + J.shinLen) * Math.sin(G.A * Math.PI / 180) * scale / SPR_PPU / G.slip;
  },
  // z: the zombie (keeps its own phase / walk weight); y: floor line; filter: hit flash
  draw(ctx, base, z, x, y, scale, filter, t) {
    const m = window.ZSKEL_META[base], J = m.joints, G = this.GAIT[this.KIND[base] || 'walk'], k = scale / SPR_PPU;
    // walk weight and leg phase from the ground actually covered (the planted foot stays put)
    const moved = Math.abs(x - (z._zx ?? x)); z._zx = x;
    const dt = Math.min(0.05, Math.max(0, t - (z._zt ?? t))); z._zt = t;
    z._za = (z._za || 0) + ((moved > 0.05 ? 1 : 0) - (z._za || 0)) * Math.min(1, dt * 8);
    const sd = (z.look || 0) * 1.7 + (z.ph || 0);   // every zombie its own rhythm and lame side
    z._zph = (z._zph ?? sd) + moved * Math.PI / this.stepLen(base, scale);
    // hit: knees buckle, the body snaps back and recovers (0.12 s), so a hit reads even without the old flinch pose
    const hk = z.dead ? 0 : U.clamp((z.hitT || 0) / 0.12, 0, 1), die = z.dead ? Math.min(1, (z.deadT || 0) / 0.35) : 0, dk = die * die * (3 - 2 * die);
    const amp = z._za * (1 - dk), ph = z._zph, C = this.stance(m) + 10 * hk + 55 * dk, dragNear = (z.look || 0) % 2 === 0;
    const qn = this.pose(ph, G, C, amp, G.drag && dragNear), qf = this.pose(ph + Math.PI, G, C, amp, G.drag && !dragNear);
    const foot = m.parts.foot.h - 3, vert = J.ground - J.hip[1];
    const bob = (vert - foot - Math.max(this.legH(m, qn), this.legH(m, qf))) * (die ? 1 : G.bob);
    // body: forward lean while moving, a lurch once per cycle (onto the bad leg), side sway, idle breathing and twitches
    const s1 = Math.sin(ph), s2 = Math.cos(ph * 2);
    const tw = G.twitch * (Math.sin(t * 7.3 + sd) > 0.985 ? Math.sin(t * 40) * 2.5 : 0);
    const lean = amp * (G.lean + G.lurch * (G.drag ? Math.max(0, s1) : 0.5 * s2)) + (1 - amp) * (1 - dk) * 1.2 * Math.sin(t * 1.6 + sd) + tw - 11 * hk + 78 * dk;   // dying: pitches forward onto its face (the corpse picture lies that way)
    const sway = amp * G.sway * Math.sin(ph - 0.6) + (1 - amp) * 1.5 * Math.sin(t * 0.9 + sd);
    const [hx, hy] = J.hip, hd = J.hipDx * (1 - 0.6 * amp);
    ctx.save(); ctx.translate(x, y); ctx.scale((z.facing || 1) * k, k); ctx.translate(-m.ax, -m.ay + bob);
    const dark = filter || 'brightness(0.72)';
    this.leg(ctx, base, m, hx - hd, hy, qf, filter ? filter : dark);
    this.leg(ctx, base, m, hx + hd, hy, qn, filter);
    ctx.translate(hx - 5 * hk, hy + amp * 1.2 * Math.max(0, -s2)); ctx.rotate((lean + sway * 0.4 * (1 - dk)) * Math.PI / 180); ctx.translate(-hx, -hy);
    this.part(ctx, base, m, 'body', filter);
    ctx.restore();
  },
};

// heavy zombies shake the floor: a dust puff at each footfall and a small camera shake when the player is close
(function hookStomp() {
  const _upd = Run.update;
  Run.update = function (dt, ...a) {
    const r = _upd.call(this, dt, ...a);
    if (!this.active || !this.p || this.paused) return r;
    const p = this.p;
    for (const z of this.zombies) {
      if (z.dead || z.climb || (z.type !== 'brute' && !z.Z.boss)) { z._fx = z.x; continue; }
      const base = 'zombie_' + z.type; if (!ZSkel.has(base)) continue;
      z._fd = (z._fd || 0) + Math.abs(z.x - (z._fx ?? z.x)); z._fx = z.x;
      const sc = (z.Z.boss ? 2.0 : 1.45) * CHAR_SCALE, step = ZSkel.stepLen(base, sc);
      if (z._fd < step) continue;
      z._fd -= step;
      const y = this.yOf(z);
      for (let i = 0; i < 3; i++) this.parts.push({ x: z.x + U.rf(Math.random, -14, 14) * sc, y: y - 3, vx: U.rf(Math.random, -40, 40), vy: U.rf(Math.random, -26, -8), t: 0.45, smoke: true, s: 4 + Math.random() * 3, g: 0 });
      if (z.f === p.f) { const d = Math.abs(z.x - p.x); if (d < 520) this.shake = Math.max(this.shake, (z.Z.boss ? 3.2 : 1.4) * (1 - d / 520)); }
    }
    return r;
  };
})();
