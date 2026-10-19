// ---------- Puppet: the player character is a cut-out rig animated procedurally ----------
// Each character can have cut-out parts: char_X_body (no legs, no near arm), char_X_leg, char_X_arm, plus pivots in
// window.RIG_META[char_X] (all in the idle sprite's pixel space, 300 px tall). Every frame the hips and knees bend,
// both arms swing from the shoulder with an elbow, the torso leans / sways / breathes and the body bobs so the planted
// foot stays on the floor. The motion is driven by Puppet.cur (set by the renderer for the player):
//   amp   0..1   how much of the walk is applied (eases in when you start, settles back when you stop)
//   gait  'walk' | 'run' | 'sneak'   stride, knee lift, arm swing and lean change with it
//   ph    leg phase in radians (accumulated from distance walked, so feet never skate)
//   t     time (breathing when standing)
//   held  the weapon in hand (drawn in the near hand while walking)
// Characters without parts keep the old frame-flip walk.
const Puppet = {
  RATE: 1.9, TURN: 0.26,
  GAIT: {
    walk:  { hip: 26, knee: 52, arm: 34, elbow: 38, lean: 5,  sway: 1.6, crouch: 0,  rate: 1.9 },
    run:   { hip: 34, knee: 78, arm: 40, elbow: 55, lean: 9,  sway: 2.2, crouch: 6,  rate: 1.55 },
    sneak: { hip: 17, knee: 40, arm: 10, elbow: 40, lean: 7,  sway: 0.8, crouch: 22, rate: 2.5 },
  },
  cur: null,
  // gait values for the current state, blended by amp (0 = standing)
  g() {
    const c = this.cur, G0 = this.GAIT[(c && c.gait) || 'walk'] || this.GAIT.walk, a = c ? c.amp ?? 1 : 1;
    return { hip: G0.hip * a, knee: G0.knee * a, arm: G0.arm * a, elbow: G0.elbow, lean: G0.lean * Math.min(1, a * 1.5), sway: G0.sway * a, crouch: G0.crouch * Math.min(1, a * 1.5), a };
  },
  ph(phase) { return this.cur && this.cur.ph != null ? this.cur.ph : phase * Math.PI / 2 * this.RATE; },
  rig(base) {
    const r = window.RIG_META && window.RIG_META[base];
    return r && Override.get(base + '_leg') && Override.get(r.body ? base + '_body' : base) ? r : null;
  },
  // leg pose for phase ph (radians); forward = towards the facing direction
  legPose(ph, near) {
    const g = this.g(), s = Math.sin(ph), c = Math.cos(ph), st = ((this.cur && this.cur.stance) || 0) * (1 - g.a);
    // the swinging leg lifts its knee most mid-swing; the planted leg stays almost straight (a little flex on contact)
    const hip = g.hip * s + g.crouch * 0.6, knee = 4 + g.crouch + g.knee * Math.pow(Math.max(0, c), 1.6) + 6 * g.a * Math.max(0, -c) * Math.max(0, s);
    // combat stance (gun up, standing): feet apart, near foot forward, knees soft
    return { hip: hip + st * (near ? 13 : -11), knee: knee + st * 16 };
  },
  footY(r, ph, near) { // foot height below the hip for a leg at phase ph
    const { hip, knee } = this.legPose(ph, near), a = hip * Math.PI / 180, b = (hip - knee) * Math.PI / 180, kn = r.knee - r.legTop;
    return Math.cos(a) * kn + Math.cos(b) * (r.legLen - kn);
  },
  bob(r, ph) { // lift so the lower foot touches the ground
    const low = Math.max(this.footY(r, ph, true), this.footY(r, ph + Math.PI, false));
    return r.legLen - low;
  },
  drawLeg(ctx, r, img, hx, hy, ph, dark) {
    const { hip, knee } = this.legPose(ph, !dark), w = img.naturalWidth, h = img.naturalHeight, kn = r.knee;
    if (dark) img = FilterCache.get(img, 'brightness(0.68)');   // baked once (ctx.filter is very slow)
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-hip * Math.PI / 180);
    ctx.drawImage(img, 0, 0, w, kn + 3, -w / 2, -r.legTop, w, kn + 3);                    // thigh
    ctx.translate(0, kn - r.legTop); ctx.rotate(knee * Math.PI / 180);
    ctx.drawImage(img, 0, kn - 3, w, h - kn + 3, -w / 2, -3, w, h - kn + 3);              // shin + shoe
    ctx.restore();
  },
  // legs only (for shooting / swinging on the move); returns the hip line in idle pixel space, or null
  legs(ctx, base, x, y, face, scale, phase) {
    const r = this.rig(base); if (!r) return null;
    const m = Sprites.meta(base), leg = Override.get(base + '_leg'), k = scale / SPR_PPU, ph = this.ph(phase), dy = this.bob(r, ph);
    ctx.save(); ctx.translate(x, y); ctx.scale(face * k, k); ctx.translate(-m.ax, -m.ay + dy);
    this.drawLeg(ctx, r, leg, r.hipX - r.hipDx, r.hipY, ph + Math.PI, true);   // far leg
    this.drawLeg(ctx, r, leg, r.hipX + r.hipDx, r.hipY, ph, false);           // near leg
    ctx.restore();
    return { hipY: r.hipY, dy };
  },
  // an arm swinging from the shoulder; s = -1..1 (positive = hand goes back). The elbow folds as the arm comes forward.
  drawArm(ctx, r, img, sx, sy, s, dark, held) {
    const g = this.g(), w = img.naturalWidth, h = img.naturalHeight, el = Math.round(h * 0.48);
    let sh = g.arm * s, bend = 8 + g.elbow * Math.max(0, -s) * g.a + (this.cur && this.cur.gait === 'run' ? 30 * g.a : 0);
    if (held) { sh *= 0.45; bend = Math.max(bend, 28); }   // carrying a weapon: smaller swing, forearm raised a little
    if (dark) img = FilterCache.get(img, 'brightness(0.62)');   // baked once (ctx.filter is very slow)
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(sh * Math.PI / 180);
    ctx.drawImage(img, 0, 0, w, el + 3, -r.armPx, -r.armTop, w, el + 3);                       // upper arm
    ctx.translate(0, el - r.armTop); ctx.rotate(-bend * Math.PI / 180);
    if (held) { ctx.save(); ctx.translate((r.handX ?? w / 2) - r.armPx, (r.handY ?? h - 12) - el); this.drawHeld(ctx, held); ctx.restore(); }
    ctx.drawImage(img, 0, el - 3, w, h - el + 3, -r.armPx, -3, w, h - el + 3);                  // forearm + hand (over the grip)
    ctx.restore();
  },
  // two-bone IK: put the hand on (tx, ty) from the shoulder (sx, sy); the elbow bends down/back like a real arm.
  // after drawing, `then(ctx)` runs in the hand's frame (used to draw the weapon under the fingers)
  drawArmIK(ctx, r, img, sx, sy, tx, ty, dark, under, foreOnly) {
    const w = img.naturalWidth, h = img.naturalHeight, el = Math.round(h * 0.48);
    const L1 = el - r.armTop, L2 = (r.handY ?? h - 12) - el;
    const dx = tx - sx, dy = ty - sy, d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.5), base = Math.atan2(dy, dx);
    const a1 = Math.acos(U.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const a2 = Math.acos(U.clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    if (under) under();   // e.g. the gun, drawn before the near arm so the arm wraps it
    if (dark) img = FilterCache.get(img, 'brightness(0.62)');   // baked once (ctx.filter is very slow)
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(base + a1 - Math.PI / 2);
    if (!foreOnly) ctx.drawImage(img, 0, 0, w, el + 3, -r.armPx, -r.armTop, w, el + 3);
    ctx.translate(0, el - r.armTop); ctx.rotate(-(Math.PI - a2));
    ctx.drawImage(img, 0, el + (foreOnly ? 6 : -3), w, h - el + (foreOnly ? -6 : 3), -r.armPx, foreOnly ? 6 : -3, w, h - el + (foreOnly ? -6 : 3));
    ctx.restore();
  },
  // how a gun / big melee weapon is carried when not aiming (sprite pixel space, relative to the rig's shoulder)
  carry(r, w, base) {
    const it = ITEMS[w.id], sx = r.shX, sy = r.shY;
    if (it.cls === 'pistol') return { rear: [sx + 20, sy + 66], ang: 1.0, front: null };                        // pistol down at the side, muzzle low
    if (it.cls === 'melee') return { rear: [sx + 14, sy + 30], ang: -2.25, front: null };                       // bat / axe resting on the shoulder
    const gm = Sprites.meta(base + '_gun_bare'), span = gm && gm.fx ? gm.fx - gm.gx : 46, ang = 0.5;          // long gun at low ready
    const rear = [sx + 16, sy + 58];
    return { rear, ang, front: [rear[0] + Math.cos(ang) * span, rear[1] + Math.sin(ang) * span] };
  },
  drawGunAt(ctx, w, x, y, ang) {
    const it = ITEMS[w.id], wa = typeof WEAPON_ART !== 'undefined' && WEAPON_ART[w.id] && Parts.weapon(w.id); if (!wa) return;
    const melee = it.cls === 'melee', ws = SPR_PPU * (melee ? 1 : 1.05);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const G = wa.ext && WPN_GRIP[w.id], img = wa.img;
    if (G && img.naturalWidth) { const kk = melee ? wa.w * ws * (MELEE_LEN[w.id] || 1) / img.naturalWidth : Math.min(wa.w * ws / img.naturalWidth, wa.h * ws / img.naturalHeight); ctx.drawImage(img, -G[0] * kk, -G[1] * kk, img.naturalWidth * kk, img.naturalHeight * kk); }
    else Art.draw(ctx, wa, -wa.px * ws, -wa.py * ws, wa.w * ws, wa.h * ws);
    ctx.restore();
  },
  // the held weapon at the hand (sprite pixel space); the forearm points down (+y), forward is +x
  drawHeld(ctx, w) {
    const it = ITEMS[w.id], wa = typeof WEAPON_ART !== 'undefined' && WEAPON_ART[w.id] && Parts.weapon(w.id); if (!wa) return;
    const melee = it.cls === 'melee', ws = SPR_PPU * (melee ? 1 : 1.05);
    // hand frame: 0 = pointing forward, PI/2 = straight down along the forearm. Short blades forward-down, long ones hang by the leg
    const HANG = { knife: 0.8, machete: 1.25, katana: 1.15, bat: 1.25, fireaxe: 1.3 };
    ctx.rotate(HANG[w.id] ?? (melee ? 1.1 : 0.35));
    const G = wa.ext && WPN_GRIP[w.id], img = wa.img;
    if (G && img.naturalWidth) { const kk = melee ? wa.w * ws * (MELEE_LEN[w.id] || 1) / img.naturalWidth : Math.min(wa.w * ws / img.naturalWidth, wa.h * ws / img.naturalHeight); ctx.drawImage(img, -G[0] * kk, -G[1] * kk, img.naturalWidth * kk, img.naturalHeight * kk); }
    else Art.draw(ctx, wa, -wa.px * ws, -wa.py * ws, wa.w * ws, wa.h * ws);
  },
  // whole character: walking, or standing (amp 0 = breathing idle)
  draw(ctx, base, x, y, face, scale, phase) {
    const r = this.rig(base); if (!r) return false;
    const m = Sprites.meta(base), k = scale / SPR_PPU, ph = this.ph(phase), g = this.g(), c = this.cur || {};
    const res = this.legs(ctx, base, x, y, face, scale, phase), dy = res.dy;
    const body = Override.get(r.body ? base + '_body' : base), arm = r.arm && Override.get(base + '_arm');
    const t = c.t || 0, br = (1 - g.a) * Math.sin(t * 2.1);   // breathing while standing
    ctx.save(); ctx.translate(x, y); ctx.scale(face * k, k); ctx.translate(-m.ax, -m.ay + dy);
    // upper body pivots around the hips: forward lean (more when running / sneaking) + sway with each step + breathing
    ctx.translate(r.hipX, r.hipY);
    ctx.rotate((g.lean + g.sway * Math.sin(ph * 2) + 0.6 * br) * Math.PI / 180);
    ctx.scale(1, 1 + 0.008 * br);
    ctx.translate(-r.hipX, -r.hipY + 1.5 * g.a * Math.max(0, Math.sin(ph * 2)));   // tiny extra dip as each foot lands
    const idleSwing = (1 - g.a) * 0.06 * Math.sin(t * 2.1 + 0.6);
    const cw = c.carry, cp = cw && arm && this.carry(r, cw, base);
    if (cp) {   // carrying a gun / big weapon: both arms are placed on it with IK; it bobs with the body
      const sway = 2 * g.a * Math.sin(ph * 2) + 1.2 * br, ang = cp.ang + sway * Math.PI / 180;
      const rx = cp.rear[0], ry = cp.rear[1] + sway * 0.6;
      const span = cp.front && Math.hypot(cp.front[0] - cp.rear[0], cp.front[1] - cp.rear[1]), fx = cp.front && rx + Math.cos(ang) * span, fy = cp.front && ry + Math.sin(ang) * span;
      if (cp.front) this.drawArmIK(ctx, r, arm, r.shX - 7, r.shY + 1, fx, fy, true);
      else this.drawArm(ctx, r, arm, r.shX - 7, r.shY + 1, -Math.sin(ph) - idleSwing, true, null);
      ctx.save(); ctx.beginPath(); ctx.rect(-50, -50, m.w + 100, r.hipY + 56); ctx.clip(); ctx.drawImage(body, 0, 0); ctx.restore();
      if (cp.front) this.drawArmIK(ctx, r, arm, r.shX - 7, r.shY + 1, fx, fy, true, null, true);   // the far forearm reaches round the chest to the handguard
      this.drawArmIK(ctx, r, arm, r.shX, r.shY, rx, ry, false, () => this.drawGunAt(ctx, cw, rx, ry, ang));
    } else {
    if (arm) this.drawArm(ctx, r, arm, r.shX - 7, r.shY + 1, -Math.sin(ph) - idleSwing, true, null);   // far arm, behind the torso
    ctx.save(); ctx.beginPath(); ctx.rect(-50, -50, m.w + 100, r.hipY + 56); ctx.clip(); ctx.drawImage(body, 0, 0); ctx.restore();   // torso (arm removed if r.body), cut at the hips
    if (arm) this.drawArm(ctx, r, arm, r.shX, r.shY, Math.sin(ph) + idleSwing, false, c.held || null);   // near arm swings opposite the near leg
    }
    ctx.restore();
    return true;
  },
};

// hook the sprite drawing: a walk frame of a rigged character becomes the puppet
(function hookPuppet() {
  const _split = Sprites.drawSplit;
  Sprites.drawSplit = function (ctx, upKey, legKey, x, y, facing, scale, filter, phase, amp) {
    const mm = /^(.*)_walk_\d+$/.exec(legKey || ''), base = mm && mm[1];
    if (base && !filter && Puppet.rig(base)) {
      if (upKey === legKey) return Puppet.draw(ctx, base, x, y, facing, scale, phase);
      const res = Puppet.legs(ctx, base, x, y, facing, scale, phase), mu = this.meta(upKey), iu = Override.get(upKey);
      if (res && mu && iu) { // upper body of the action pose, cut at the hips (and bobbing with the stride)
        const k = scale / SPR_PPU, cut = res.hipY + 4;
        ctx.save(); ctx.translate(x, y); ctx.scale(facing * k, k);
        ctx.beginPath(); ctx.rect(-mu.ax - 200, -mu.ay - 60, mu.w + 400, cut + 60); ctx.clip();
        const c = Puppet.cur, rr = Puppet.rig(base), mi = Sprites.meta(base);
        if (c && (c.upRot || c.upDy) && rr && mi) {   // torso sway / breathing / recoil around the hips
          const hx = rr.hipX - mi.ax, hy = rr.hipY - mi.ay + res.dy;
          ctx.translate(hx, hy + (c.upDy || 0)); ctx.rotate((c.upRot || 0) * Math.PI / 180); ctx.translate(-hx, -hy);
        }
        ctx.drawImage(iu, -mu.ax, -mu.ay + res.dy);
        ctx.restore();
        return true;
      }
    }
    return _split.call(this, ctx, upKey, legKey, x, y, facing, scale, filter, phase, amp);
  };
})();
