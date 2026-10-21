// ---------- Skeleton rig (prototype: characters that have skel_<char>_* parts) ----------
// 14 bones: hips → pelvis, waist → chest → neck → head, backpack on the chest, two arms (shoulder → elbow → wrist → hand)
// and two legs (hip → knee → ankle → foot). Every bone moves on its own with follow-through: the head lags the body,
// the backpack bounces late, elbows trail the swing, the hips tilt with each step, the chest counter-rotates and the
// feet roll heel → toe. Weapons are held with two-bone IK so both hands sit on the grip / handguard.
// Coordinates are the idle sprite's pixel space (300 px tall); window.SKEL_META[base] holds the part rectangles + pivots.
const Skel = {
  img(base, part) { return Override.get('skel_' + base.slice(5) + '_' + part); },
  has(base) {
    const m = window.SKEL_META && window.SKEL_META[base];
    return !!(m && Puppet.rig(base) && Object.keys(m.parts).every(k => this.img(base, k)));
  },
  // draw one part with its pivot at the current origin
  part(ctx, base, m, name, dark) {
    const p = m.parts[name], im = this.img(base, name); if (!im) return;
    ctx.drawImage(dark ? FilterCache.get(im, 'brightness(0.8)') : im, p.ox - p.px, p.oy - p.py);   // far side in shade (baked once: ctx.filter is very slow)
  },
  // two-bone IK: angles for the upper arm and forearm so the hand reaches (tx, ty) from the shoulder (sx, sy)
  ik(sx, sy, tx, ty, L1, L2) {
    const dx = tx - sx, dy = ty - sy, d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.5), base = Math.atan2(dy, dx);
    const a1 = Math.acos(U.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const a2 = Math.acos(U.clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    return { up: base + a1 - Math.PI / 2, low: -(Math.PI - a2) };   // rotations for "hanging down" art (the elbow only folds forward, like a real one)
  },
  // an arm: either swinging (angles) or reaching a target (IK). wrist = extra hand rotation
  arm(ctx, base, m, sx, sy, a, dark, under, foreOnly) {
    const J = m.joints;
    if (!foreOnly && m.parts.cap) {   // deltoid: follows the arm only part of the way, so the shoulder keeps its shape and never shows a cut edge
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(a.up * 0.35); this.part(ctx, base, m, 'cap', dark); ctx.restore();
    }
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a.up);
    if (!foreOnly) this.part(ctx, base, m, 'uarm', dark);
    ctx.translate(0, J.uarmLen); ctx.rotate(a.low);
    if (under) { ctx.save(); ctx.translate(0, J.farmLen + 10); ctx.rotate(-a.up - a.low); under(); ctx.restore(); }   // weapon in the hand, in chest space
    this.part(ctx, base, m, 'farm', dark);
    ctx.translate(0, J.farmLen); ctx.rotate(a.wrist || 0);
    this.part(ctx, base, m, 'hand', dark);
    ctx.restore();
    if (!foreOnly && m.parts.cap) { ctx.save(); ctx.translate(sx, sy); ctx.rotate(a.up * 0.35); ctx.globalAlpha *= 0.85; this.part(ctx, base, m, 'cap', dark); ctx.restore(); }
  },
  // a leg from explicit angles (degrees): hip > 0 swings the thigh forward, knee > 0 folds the shin back, foot = sole angle (0 = flat)
  legAt(ctx, base, m, hx, hy, hip, knee, foot, dark) {
    const J = m.joints;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-hip * Math.PI / 180);
    this.part(ctx, base, m, 'thigh', dark);
    ctx.translate(0, J.thighLen); ctx.rotate(knee * Math.PI / 180);
    this.part(ctx, base, m, 'shin', dark);
    ctx.translate(0, J.shinLen); ctx.rotate((hip - knee + foot) * Math.PI / 180);
    this.part(ctx, base, m, 'foot', dark);
    ctx.restore();
  },
  // ---- human gait (one cycle = 2π of phase; the near leg lands heel-first at phase 0) ----
  //  stance: the planted foot travels straight back under the body at a constant speed (so it stays put on the floor),
  //          the knee gives a little as the weight lands, the heel peels up at the end and the toes push off;
  //  swing:  the knee folds high as the leg passes under the body, then reaches forward, toes up for the next heel strike.
  // A = hip swing (deg), K = knee fold mid-swing, S = share of the cycle the foot is on the floor, C = knee bend (sneaking),
  // slip = < 1 lets the stride run a little behind the ground speed (very short legs would otherwise step frantically)
  GAIT: {
    walk:  { A: 46, K: 62, S: 0.6,  C: 4,  slip: 0.82 },
    run:   { A: 60, K: 112, S: 0.4, C: 14, slip: 0.68 },
    sneak: { A: 24, K: 52, S: 0.62, C: 24, slip: 0.85 },
  },
  gp(gait) { return this.GAIT[gait] || this.GAIT.walk; },
  // distance (world px) covered by one step of a planted foot, scaled by slip: phase advances π per this many px
  stepLen(base, scale, gait) {
    const m = window.SKEL_META[base], J = m.joints, G = this.gp(gait);
    return 2 * (J.thighLen + J.shinLen) * Math.sin(G.A * Math.PI / 180) * scale / SPR_PPU / G.slip;
  },
  pose(ph, near, gait, amp) {
    const G = this.gp(gait), u = ((ph / (2 * Math.PI)) % 1 + 1) % 1, A = G.A * amp;
    const ramp = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a))), sm = v => v * v * (3 - 2 * v);
    let hip, knee, foot;
    if (u < G.S) {   // stance
      const v = u / G.S;
      hip = A * (1 - 2 * v);
      knee = G.C + amp * 12 * Math.sin(Math.PI * Math.min(1, v / 0.45)) * (v < 0.45 ? 1 : 0);   // loading response
      foot = amp * (-10 * (1 - ramp(v, 0, 0.12)) + 26 * ramp(v, 0.62, 1));   // heel strike (toes up) → flat → heel peels up
    } else {   // swing
      const v = (u - G.S) / (1 - G.S);
      hip = -A + 2 * A * sm(v);
      knee = G.C + amp * G.K * Math.pow(Math.sin(Math.PI * Math.min(1, v / 0.85)), 1.3);   // knee folds, then the shin reaches out straight before landing
      foot = amp * (26 * (1 - ramp(v, 0, 0.35)) - 10 * ramp(v, 0.7, 1));   // toes trail after push-off, then lift for the heel strike
    }
    return { hip, knee, foot };
  },
  // how far the body must drop so the lower foot is on the floor (sprite px)
  bobOf(m, ph, gait, amp) {
    const J = m.joints, h = (n) => { const q = this.pose(ph + (n ? 0 : Math.PI), n, gait, amp), r = Math.PI / 180; return J.thighLen * Math.cos(q.hip * r) + J.shinLen * Math.cos((q.hip - q.knee) * r); };
    return J.thighLen + J.shinLen - Math.max(h(true), h(false));
  },
  // walking leg blended into a kneel (c = 0..1) or a ladder step (climb phase)
  leg(ctx, base, m, hx, hy, ph, near, dark, c, climb) {
    const q = this.pose(ph, near, this._gait, this._amp);
    let hip = q.hip, knee = q.knee, foot = q.foot;
    if (climb != null) {   // ladder: knee comes up high to the next rung, then the leg straightens and pushes
      const u = Math.sin(climb + (near ? 0 : Math.PI));
      hip = 22 + 38 * Math.max(0, u); knee = 18 + 70 * Math.max(0, u) + 8 * Math.max(0, -u); foot = 6;
    }
    if (c > 0) {   // kneel: near foot planted ahead (thigh level, shin upright), far knee on the floor, toes tucked
      const kh = near ? 90 : 0, kk = near ? 90 : 90, kf = near ? 0 : 70;
      hip += (kh - hip) * c; knee += (kk - knee) * c; foot += (kf - foot) * c;
    }
    this.legAt(ctx, base, m, hx, hy, hip, knee, foot, dark);
  },
  // where the hands go for each way of holding a weapon (chest space, before the chest rotation)
  // weapon size in sprite px: how far the stock reaches behind the grip and the barrel / blade in front of it
  geom(w) {
    const it = ITEMS[w.id], wa = typeof WEAPON_ART !== 'undefined' && WEAPON_ART[w.id] && Parts.weapon(w.id), G = WPN_GRIP[w.id];
    if (!wa || !G || !wa.img || !wa.img.naturalWidth) return { back: 20, front: 70 };
    const melee = it.cls === 'melee', ws = SPR_PPU * (melee ? 1 : 1.05), img = wa.img;
    const kk = melee ? wa.w * ws * (MELEE_LEN[w.id] || 1) / img.naturalWidth : Math.min(wa.w * ws / img.naturalWidth, wa.h * ws / img.naturalHeight);
    return { back: G[0] * kk, front: (img.naturalWidth - G[0]) * kk };
  },
  // where the hands go (chest space). Hand targets are chosen so the elbows hang down, as they do on a real person.
  // far: null = that arm is free and swings with the walk. ph / amp: walk phase, so a hand that carries something one-handed still swings a little
  grips(m, w, mode, aimA, sw, ph, amp) {
    const it = ITEMS[w.id], S = m.joints.shoulder, gm = this.geom(w), dir = a => [Math.cos(a), Math.sin(a)];
    const swing = 7 * amp * Math.cos(ph);   // a one-handed carry swings gently with the stride (opposite the near leg)
    let g;
    if (it.cls === 'melee') {
      // combatives: the weapon hand stays in "the box" (in front of the body, between belt and neck), the point / edge toward
      // the threat and never toward your own legs; the empty hand is up in front of the ribs and chin as a guard.
      const long = ['bat', 'fireaxe', 'katana'].includes(w.id), bob = 1.5 * amp * Math.cos(ph * 2);
      const guard = [S[0] + 46, S[1] + 6 + bob]; g = null;   // off hand: fist up in front of the chest / chin
      if (long) g = { near: [S[0] + 40, S[1] + 30 + bob], ang: -2.35, far: [S[0] + 34, S[1] + 22 + bob] };   // two hands on the handle, resting on the shoulder (ready to swing)
      else if (w.id === 'knife') g = { near: [S[0] + 54, S[1] + 40 + bob], ang: -0.35, far: guard };   // forward grip at the belly, point forward and a little up
      else g = { near: [S[0] + 48, S[1] + 38 + bob], ang: -1.25, far: guard };   // machete chambered at chest height, edge forward, blade angled up in front (clear of the face)
      if (sw > 0) {
        // each weapon swings the way it's really used. Keys: [time, hand x, hand y (from the shoulder), blade angle (true, world),
        // body lean°]; the hit lands at 0.45 (Run.startSwing) with the arm reaching out, the follow-through stays out in front
        // (never back into your own legs), then it eases back to the carry
        const rot = (typeof MELEE_ROT !== 'undefined' && MELEE_ROT[w.id]) || 0, c0 = [g.near[0] - S[0], g.near[1] - S[1], g.ang + rot, 0];
        const T = {
          knife:   [[0.3, 22, 48, -0.15, -5], [0.45, 96, 26, -0.1, 12], [0.6, 88, 30, 0.05, 10]],           // thrust: pull back to the hip, drive straight out
          machete: [[0.3, 18, -42, -2.3, -8], [0.45, 86, 18, 0.25, 13], [0.6, 76, 40, 0.75, 12]],          // forehand chop: cocked by the ear, cut down through the target
          katana:  [[0.3, 14, -46, -2.4, -8], [0.45, 86, 20, 0.2, 14], [0.6, 78, 38, 0.6, 12]],
          fireaxe: [[0.3, 8, -52, -2.7, -10], [0.45, 80, 26, 0.45, 16], [0.6, 70, 44, 0.85, 14]],          // overhead chop: both hands high, all the weight behind it
          bat:     [[0.3, 22, 10, -2.75, -9], [0.45, 84, 24, 0.0, 12], [0.6, 56, 14, -1.6, 8]],             // flat swing: it comes round level and wraps on past
        }[w.id] || [[0.3, 18, -40, -2.3, -8], [0.45, 84, 20, 0.25, 12], [0.6, 74, 40, 0.7, 11]];
        const K = [[0, ...c0], ...T, [1, ...c0]];
        let a = K[0], b = K[1]; for (let i = 1; i < K.length; i++) if (sw <= K[i][0]) { a = K[i - 1]; b = K[i]; break; }
        let u = (sw - a[0]) / (b[0] - a[0]);
        u = b[0] === 0.45 ? Math.pow(u, 1.6) : b[0] === 1 ? u * u * (3 - 2 * u) : 1 - (1 - u) * (1 - u);   // the strike accelerates; wind-up / follow-through ease out; recovery is smooth
        let da = b[3] - a[3]; if (Math.abs(da) > Math.PI) da -= Math.sign(da) * 2 * Math.PI;
        const L = (i) => a[i] + (b[i] - a[i]) * u;
        g.near = [S[0] + L(1), S[1] + L(2)]; g.ang = a[3] + da * u - rot; g.lean = L(4);
        const e = Math.sin(Math.PI * Math.min(1, sw / 0.6));
        if (long) { const d = dir(g.ang + rot); g.far = [g.near[0] - d[0] * 12, g.near[1] - d[1] * 12]; }   // both hands stay on the handle
        else g.far = [S[0] + 30 - 30 * e, S[1] + 62 + 8 * e];   // the free arm pulls back for balance (behind the body)
      }
      return g;
    }
    if (it.cls === 'pistol') {
      if (mode === 'aim') {   // two hands, arms out, sights at eye level
        const ang = aimA || 0, near = [S[0] + 86, S[1] - 6];
        return { near, far: [near[0] - 3, near[1] + 5], ang, cup: true };
      }
      const near = [S[0] + 46, S[1] + 30 + 1.2 * amp * Math.cos(ph * 2)];   // compressed ready: both hands, gun tucked at the chest, muzzle forward and a little down
      return { near, far: [near[0] - 3, near[1] + 5], ang: 0.25, cup: true };
    }
    // rifles / shotguns / smg
    if (mode === 'aim') {   // stock in the shoulder pocket, cheek on the stock, support hand forward on the handguard
      const ang = aimA || 0, d = dir(ang), butt = [S[0] + 12, S[1] - 4];
      const near = [butt[0] + d[0] * gm.back * 0.9, butt[1] + d[1] * gm.back * 0.9];
      return { near, far: [near[0] + d[0] * 36, near[1] + d[1] * 36], ang, cheek: 4 };
    }
    // low ready: the stock stays in the shoulder pocket, only the muzzle drops (~40°) so it comes up onto the target in one move
    const ang = 0.75, d = dir(ang), butt = [S[0] + 12, S[1] - 4], near = [butt[0] + d[0] * gm.back * 0.9, butt[1] + d[1] * gm.back * 0.9];
    return { near, far: [near[0] + d[0] * 36, near[1] + d[1] * 36], ang };
  },
  // smooth wandering in -1..1 (sum of unrelated slow sines, a different pattern per channel)
  noise(t, sd) { return 0.5 * Math.sin(t * 0.73 + sd * 1.9) + 0.3 * Math.sin(t * 1.41 + sd * 4.3) + 0.2 * Math.sin(t * 2.67 + sd * 7.1); },
  // a free arm swinging with the walk: opposite the same-side leg, a beat behind it (it is pulled along, not driven),
  // the forearm trailing the upper arm and the elbow bending more on the forward swing
  freeArm(g, ph, amp, t, run, near) {
    const p = ph - 0.3 + (near ? 0 : Math.PI), s = Math.cos(p);
    const A = (g.arm || 0) * (s < 0 ? 0.85 : 1.0) * (near ? 1 : 0.7);   // forward swing a bit smaller than back; far arm mostly hidden
    const up = (A * s + (1 - amp) * (2.5 * Math.sin(t * 2.1 + (near ? 0.6 : 2)) + 2 * this.noise(t, near ? 6 : 7))) * Math.PI / 180;
    const fwd = Math.max(0, -Math.cos(p - 0.5));   // forward swing, lagged: the forearm catches up late
    const low = -(14 + (g.elbow || 30) * 0.9 * fwd * amp + run * 70) * Math.PI / 180;   // running: elbows locked near 90°, arms pump
    return { up, low, wrist: (-0.12 - 0.18 * fwd * amp) };
  },
  // muzzle flash on the barrel tip (gun space, x along the barrel): a glow and a star of fire, gone in ~70 ms
  flash(ctx, L, f) {
    const s = (0.85 + 0.3 * f) * 2.2, ga = ctx.globalAlpha;
    const glow = (n, a, c) => { ctx.globalAlpha = ga * a * f; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(L + 12 * s, 0, n * s, 0, 7); ctx.fill(); };
    const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
    ctx.save();
    glow(30, 0.16, '#ffcf70'); glow(17, 0.3, '#ffd88a'); glow(9, 0.5, '#fff3c4');
    ctx.globalAlpha = ga * Math.min(1, f * 1.8); ctx.translate(L, 0); ctx.scale(s, s);
    // narrow at the muzzle, opening out forward, with two side prongs (the gas escaping)
    poly([[0, -2.5], [9, -5], [14, -13], [17, -5], [34, 0], [17, 5], [14, 13], [9, 5], [0, 2.5]], '#ffad2e');
    poly([[0, -1.6], [11, -3.6], [22, 0], [11, 3.6], [0, 1.6]], '#fff4c2');
    ctx.restore();
  },
  // bare-hand punch: jab with the near fist, the far fist stays up guarding the chin
  punch(m, sw) {
    const S = m.joints.shoulder, e = sw < 0.15 ? 0 : Math.sin(Math.PI * Math.min(1, (sw - 0.15) / 0.6)), back = sw < 0.2 ? Math.sin(Math.PI * sw / 0.2) : 0;   // fist fully out at 45%, when the hit lands
    return { near: [S[0] + 30 + 66 * e - 12 * back, S[1] + 40 - 36 * e], far: [S[0] + 34, S[1] + 18], lean: 8 * e - 3 * back };
  },
  // st: { amp, ph, gait, t, w, mode ('free' | 'carry' | 'aim'), aimA, kick, stance, crouch (0..1), swing (0..1), climb (phase | null),
  //       turn: { tt } (0..1 while turning around: the parts come round one after another, head first, legs last) }
  // returns the muzzle in world space ({ dx, dy } from the feet, facing-relative) when a gun is drawn
  draw(ctx, base, x, y, face, scale, st) {
    const m = window.SKEL_META[base], r = Puppet.rig(base), sm = Sprites.meta(base), J = m.joints;
    const k = scale / SPR_PPU, ph = st.ph || 0, t = st.t || 0, cr = st.crouch || 0, climb = st.climb, sw = st.swing || 0;
    const amp = climb != null ? 0 : (st.amp || 0) * (1 - cr * 0.6);
    Puppet.cur = Object.assign(Puppet.cur || {}, { amp, gait: st.gait, ph, stance: (st.stance || 0) * (1 - cr) });
    const legA = climb != null ? 0 : Math.max(amp, (st.stanceW || 0) * (1 - cr));
    this._gait = st.gait; this._amp = legA; this._m = m;
    // running: both feet leave the floor between steps (flight), the body rises a little there
    const G0 = this.gp(st.gait), uu = (((ph / Math.PI) % 1) + 1) % 1, fs = 2 * G0.S;   // in each step: one foot on the floor until fs, then both in the air
    const fl = st.gait === 'run' && fs < 1 && uu > fs ? Math.sin(Math.PI * (uu - fs) / (1 - fs)) : 0;
    const g = Puppet.g(), bob = (climb != null ? 0 : this.bobOf(m, ph, st.gait, legA) * (1 - cr) - fl * 7 * amp) + cr * 32, br = (1 - amp) * Math.sin(t * 2.1);
    // body rhythm: lowest just after each heel strike (phase 0, π), highest as the legs pass; the torso / pack / head follow late
    const s2 = Math.cos(ph * 2), lagS = Math.cos(ph * 2 - 0.7), lagP = Math.cos(ph * 2 - 1.2);
    const run = st.gait === 'run' && climb == null ? 1 : 0, kick = st.kick || 0, rc = st.rc || null;   // rc: recoil (tactical.js)
    const w = climb != null ? null : st.w, mode = w ? st.mode : 'free';
    const B = ctx.getTransform();   // world → screen, to read the muzzle back out
    ctx.save(); ctx.translate(x, y); ctx.scale(face * k, k); ctx.translate(-sm.ax - (st.downLean || 0) * 6, -sm.ay + bob);
    if (climb != null) ctx.translate(sm.ax - (J.shoulder[0] + 62), 0);   // on a ladder: the rungs (x) sit in the hands, the body hangs off to the side
    // turning around: each group mirrors about the spine at its own moment, squeezing through a narrow (side-on → front-on) width
    const tn = st.turn, spin = (tau, mn = 0.45) => {
      if (!tn) return; const u = tn.tt - tau, a = Math.min(1, Math.abs(u) / 0.2), f = (u < 0 ? -1 : 1) * (mn + (1 - mn) * Math.sin(a * Math.PI / 2));
      if (f === 1) return; ctx.translate(J.hip[0], 0); ctx.scale(f, 1); ctx.translate(-J.hip[0], 0);
    };
    const T_HEAD = 0.36, T_BODY = 0.5, T_PACK = 0.56, T_LEGS = 0.64;
    const [hx, hy] = J.hip;
    // ---- arms: swing angles, ladder reach, or IK targets ----
    const S = J.shoulder, SF = J.shoulderFar, L1 = J.uarmLen, L2 = J.farmLen + 10;
    const dl = st.downLean || 0, dRot = dl * Math.max(0, st.aimA || 0) * 0.62;   // bend at the hips when aiming down
    let nearA, farA, gr = null, lean = 0;
    if (climb != null) {   // hands reach up to the rungs one after the other
      const u = Math.sin(climb);
      nearA = this.ik(S[0], S[1], S[0] + 94 - 4 * Math.abs(u), S[1] - 4 - 22 * u, L1, L2); nearA.wrist = -1.3;   // one hand high on the next rung, the other low, swapping
      farA = this.ik(SF[0], SF[1], SF[0] + 98 - 4 * Math.abs(u), SF[1] - 4 + 22 * u, L1, L2); farA.wrist = -1.3;   // (the ladder is out in front: arms reach past the face so it stays visible)
    } else if (!w) {
      if (sw > 0) {
        const pu = this.punch(m, sw); lean = pu.lean;
        nearA = this.ik(S[0], S[1], pu.near[0], pu.near[1], L1, L2); nearA.wrist = -0.3;
        farA = this.ik(SF[0], SF[1], pu.far[0], pu.far[1], L1, L2); farA.wrist = -0.4;
      } else {
        nearA = this.freeArm(g, ph, amp, t, run, true);
        farA = this.freeArm(g, ph, amp, t, run, false);
        if (cr > 0) {   // kneeling empty-handed: hand on the front knee
          const kn = this.ik(S[0], S[1], S[0] + 34, S[1] + 84, L1, L2);
          nearA = { up: nearA.up + (kn.up - nearA.up) * cr, low: nearA.low + (kn.low - nearA.low) * cr, wrist: 0 };
        }
      }
    } else {
      const it = ITEMS[w.id], melee = it.cls === 'melee', aimed = mode === 'aim' && !melee;
      // shooting down: the rifle stays shouldered and the whole upper body bends forward over it (hips back, knees soft);
      // the gun only turns the rest of the way inside the shoulders
      gr = this.grips(m, w, mode, (st.aimA || 0) - dRot, sw, ph, amp); lean = gr.lean || 0;
      // walking with nothing to fight: a knife / machete / pistol hangs in the hand and the arms swing like anybody's;
      // a bat / axe / katana stays on the shoulder in one hand and the other arm swings. st.guard (0..1) brings the
      // fighting stance back as soon as there is a zombie close, a swing, or the player aims
      const rel = melee && !aimed && sw <= 0 ? 1 - U.clamp(st.guard ?? 1, 0, 1) : 0;
      const gun = !melee, dirA = (a) => [Math.cos(a), Math.sin(a)];
      const refar = () => { if (gr.far && it.cls !== 'pistol') { const d = dirA(gr.ang); gr.far = [gr.near[0] + d[0] * 36, gr.near[1] + d[1] * 36]; } else if (gr.far) gr.far = [gr.near[0] - 3, gr.near[1] + 5]; };
      // pistol with nothing around: "Sul" – both hands on it at the chest, muzzle pointing at the floor in front
      if (it.cls === 'pistol' && !aimed && sw <= 0) { const q = 1 - U.clamp(st.guard ?? 1, 0, 1); gr.near = Tac.lerp(gr.near, [S[0] + 34, S[1] + 48], q); gr.ang += (1.15 - gr.ang) * q; refar(); }
      // running with a gun: patrol carry – pulled in close, muzzle lower
      if (gun && !aimed && run && !st.reload) { gr.ang += it.cls === 'pistol' ? 0.3 : 0.12; gr.near = [gr.near[0] - 6, gr.near[1] + 4]; refar(); }
      // reloading in the workspace (gun in at the chest, muzzle up)
      const rl = gun && st.reload ? st.reload : null;
      if (rl) { Tac.reloadBody(gr, rl, it, S); refar(); }
      if (rel > 0) {
        const fk = (a, P0) => [P0[0] - L1 * Math.sin(a.up) - L2 * Math.sin(a.up + a.low), P0[1] + L1 * Math.cos(a.up) + L2 * Math.cos(a.up + a.low)];
        const lerp = (A, B, k) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k];
        if (!['bat', 'fireaxe', 'katana'].includes(w.id)) {
          const fa = this.freeArm(g, ph, amp * 0.85, t, run, true), rot = melee ? (typeof MELEE_ROT !== 'undefined' && MELEE_ROT[w.id]) || 0 : 0;
          // the weapon crosses the palm (as in a fist), not hanging off the fingertips: knife point forward, a little down and
          // following the swing only partly; machete blade forward-down; pistol muzzle toward the floor in front
          const fa0 = fa.up + fa.low, tgt = w.id === 'knife' ? 0.2 + 0.35 * fa0 : it.cls === 'pistol' ? 0.75 + 0.4 * fa0 : 0.55 + 0.5 * fa0;
          gr.near = lerp(gr.near, fk(fa, S), rel);
          let da0 = tgt - rot - gr.ang; da0 = Math.atan2(Math.sin(da0), Math.cos(da0)); gr.ang += da0 * rel;
          gr.go = [(5 * Math.cos(fa0) + 7 * Math.sin(fa0)) * rel, (5 * Math.sin(fa0) - 7 * Math.cos(fa0)) * rel];   // grip in the palm: in front of the forearm line, up toward the wrist
        }
        if (gr.far) gr.sFar = fk(this.freeArm(g, ph, amp, t, run, false), SF);
        gr.rel = rel;
      }
      // nobody holds a weapon locked in place: the hands are always alive
      //  - drift: slow wandering of the hands (muscles never hold perfectly still), larger when relaxed, small when aiming
      //  - steps: every footfall jolts the weapon down a beat late, and it rocks back and forth with the stride
      //  - inertia: starting to walk the weapon lags behind, stopping it swings on forward
      //  - calm: after a few seconds of nothing happening the arms tire and the weapon sinks into a relaxed carry;
      //    the guard hand drops to the side; now and then the grip is re-settled
      const calm = sw > 0 || aimed ? 0 : (st.calm || 0), acc = U.clamp(st.acc || 0, -1.5, 1.5);
      const dk = aimed ? 0.35 - 0.15 * amp : 1 + calm * 0.6;   // aiming on the move: the arms soak up the steps (the muzzle glides)
      const dx = (this.noise(t, 1) * 1.8 + amp * 1.4 * Math.cos(ph - 0.8) - acc * 2.5) * dk;
      const dy = (this.noise(t, 2) * 1.6 + amp * 2.4 * Math.cos(ph * 2 - 0.6)) * dk + 0.7 * br + calm * (melee ? 10 : 7);
      const fidg = calm > 0.5 ? Math.max(0, Math.sin((t / 6.7 - Math.floor(t / 6.7)) * Math.PI * 7)) * (t / 6.7 % 1 < 0.15 ? 1 : 0) : 0;   // a short grip re-settle every ~7 s
      const da = sw > 0 ? 0 : (this.noise(t, 3) * 0.035 + amp * (0.05 * Math.cos(ph * 2 - 1.0) + 0.035 * Math.cos(ph))) * dk - acc * 0.06
        + calm * (melee ? 0.3 : it.cls === 'pistol' ? 0.55 : 0.28) + fidg * 0.12;
      const kx = -(rc ? rc.x : kick * 5);
      const nT = [gr.near[0] + kx + dx, gr.near[1] + dy - fidg * 3];
      gr.nT = nT; gr.angNow = gr.ang - (rc ? rc.a : kick * (it.cls === 'pistol' ? 0.2 : 0.08)) + da;
      const rh = rl ? Tac.reloadHand(rl, it, this.geom(w), S, nT, gr.angNow, gr.far ? (() => { const rx = gr.far[0] - gr.near[0], ry = gr.far[1] - gr.near[1], c = Math.cos(da), s0 = Math.sin(da); return [nT[0] + rx * c - ry * s0, nT[1] + rx * s0 + ry * c]; })() : nT) : null;
      gr.rh = rh;
      nearA = this.ik(S[0], S[1], nT[0], nT[1], L1, L2); nearA.wrist = gr.far ? -0.25 : -0.05;
      if (gr.far) {
        let fT;
        if (melee && !gr.lean && !['bat', 'fireaxe', 'katana'].includes(w.id)) {   // guard fist: its own drift, drops toward the side as the body relaxes
          const gx = gr.far[0] + this.noise(t, 4) * 2.2 + amp * 1.5 * Math.cos(ph - 1.1), gy = gr.far[1] + this.noise(t, 5) * 2 + amp * 2 * Math.cos(ph * 2 - 0.9);
          fT = [gx + (S[0] + 16 - gx) * calm, gy + (S[1] + 92 - gy) * calm];
        } else {   // support hand rides on the weapon: same move and turn as the grip
          const rx = gr.far[0] - gr.near[0], ry = gr.far[1] - gr.near[1], c = Math.cos(da), s0 = Math.sin(da);
          fT = [nT[0] + rx * c - ry * s0, nT[1] + rx * s0 + ry * c];
        }
        if (gr.sFar) fT = [fT[0] + (gr.sFar[0] - fT[0]) * gr.rel, fT[1] + (gr.sFar[1] - fT[1]) * gr.rel];   // relaxed: the free hand swings
        if (rh && rh.far) fT = rh.far;   // reloading: the support hand does the work
        gr.fT = fT; farA = this.ik(SF[0], SF[1], fT[0], fT[1], L1, L2); farA.wrist = melee ? -1.0 + 0.9 * calm : -0.3;
      } else farA = this.freeArm(g, ph, amp, t, run, false);
    }
    // ---- body angles ----
    // seen from the side, hips and chest rock the same way on every step (twice per cycle) — a once-per-cycle rock reads as a limp
    const pelvisA = (amp * 1.6 * Math.cos(ph * 2 - 0.4) + cr * 4) * Math.PI / 180;
    const gunUp = w && ITEMS[w.id].cls !== 'melee', aimG = gunUp && mode === 'aim', glide = aimG ? 0.35 : 1;
    const tacLean = gunUp ? (run ? 3 : 4) + (aimG ? 3 : 0) : 0;   // a shooter leans into the gun (nose over toes)
    const chestA = (g.lean + run * 7 + tacLean + U.clamp(st.acc || 0, -1.5, 1.5) * 4 + amp * (1.2 * s2) * glide + 0.7 * br - (rc ? rc.b : kick * 4) + (mode === 'aim' ? 2 : 0) + cr * 14 + lean + dRot * 180 / Math.PI
      + (climb != null ? -3 + 1.5 * Math.sin(climb * 2) : 0)) * Math.PI / 180;
    const chestDy = amp * 1.6 * Math.max(0, lagS) * glide - 0.8 * br + (climb != null ? 1.5 * Math.sin(climb * 2) : 0);
    this._pelA = pelvisA;
    const toChest = () => { ctx.translate(J.waist[0], J.waist[1] + chestDy); ctx.rotate(chestA); ctx.translate(-J.waist[0], -J.waist[1]); };
    const cph = climb != null ? climb : null;
    // standing, the feet are a little apart; walking, both hips swing about (almost) the same point — a big offset makes one
    // step long and the next short, which reads as a limp
    const hipD = J.hipDx * (1 - 0.85 * amp);
    // ---- far leg (darker) ----
    ctx.save(); spin(T_LEGS); this.leg(ctx, base, m, hx - hipD, hy, ph + Math.PI, false, true, cr, cph); ctx.restore();
    // ---- far arm (behind the body) ----
    ctx.save(); spin(T_BODY); toChest(); this.arm(ctx, base, m, SF[0], SF[1], farA, true); ctx.restore();
    // ---- backpack (bounces late) ----
    if (m.parts.pack) {
      ctx.save(); spin(T_PACK); toChest();
      ctx.translate(J.pack[0], J.pack[1] + amp * 1.8 * lagP); ctx.rotate((amp * 2.5 * lagP + 0.5 * br - lean * 0.3) * Math.PI / 180);
      this.part(ctx, base, m, 'pack'); ctx.restore();
    }
    // ---- near leg, then the pelvis over the thigh tops ----
    ctx.save(); spin(T_LEGS); this.leg(ctx, base, m, hx + hipD, hy, ph, true, false, cr, cph); ctx.restore();
    // ---- pelvis + chest: one skin bending at the waist (skin.js), or the two parts ----
    ctx.save(); spin(T_BODY);
    const cs = Math.cos(chestA), sn = Math.sin(chestA), [wx, wy] = J.waist;
    if (!(this.torso && this.torso(ctx, base, m, pelvisA, [cs, sn, -sn, cs, wx - cs * wx + sn * wy, wy + chestDy - sn * wx - cs * wy]))) {
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(pelvisA); this.part(ctx, base, m, 'pelvis'); ctx.restore();
      toChest(); ctx.translate(J.waist[0], J.waist[1]); this.part(ctx, base, m, 'chest');
    }
    ctx.restore();
    // ---- head (turns first when turning around) ----
    const headA = (-0.55 * (g.lean + amp * 1.2 * s2) + amp * 1.5 * lagS + 0.5 * br + (gr && gr.cheek ? 6 : mode === 'aim' ? 3 : 0) + (rc ? rc.b * 0.6 : kick * 2) - tacLean * 0.5 + cr * 16 + dl * 8 - lean * 0.4 - dRot * 0.55 * 180 / Math.PI
      + (climb != null ? -8 : 0)) * Math.PI / 180;
    ctx.save(); spin(T_HEAD, 0.74); toChest(); ctx.translate(J.neck[0], J.neck[1] + amp * 0.8 * lagS); ctx.rotate(headA); this.part(ctx, base, m, 'head'); ctx.restore();
    // ---- weapon + near arm ----
    ctx.save(); spin(T_BODY); toChest();
    let muzzle = null;
    if (gr) {
      const it = ITEMS[w.id];
      ctx.save(); ctx.translate(gr.nT[0] + (gr.go ? gr.go[0] : 0), gr.nT[1] + (gr.go ? gr.go[1] : 0));
      const ang = gr.angNow + (it.cls === 'melee' ? (typeof MELEE_ROT !== 'undefined' && MELEE_ROT[w.id]) || 0 : 0);
      Puppet.drawGunAt(ctx, w, 0, 0, ang);
      if (it.cls !== 'melee') {   // muzzle: the painted gun's length past the grip
        const wa = WEAPON_ART[w.id] && Parts.weapon(w.id), G = wa && wa.ext && WPN_GRIP[w.id], img = wa && wa.img;
        let L = wa ? (wa.w - wa.px) * SPR_PPU * 1.05 : 60;
        if (G && img && img.naturalWidth) { const kk = Math.min(wa.w * SPR_PPU * 1.05 / img.naturalWidth, wa.h * SPR_PPU * 1.05 / img.naturalHeight); L = (img.naturalWidth - G[0]) * kk; }
        ctx.rotate(ang); const P = ctx.getTransform().transformPoint(new DOMPoint(L, 0)), Wp = B.inverse().transformPoint(P);
        muzzle = { dx: (Wp.x - x) * face, dy: y - Wp.y };
        if (st.flash > 0) this.flash(ctx, L, st.flash);
      }
      ctx.restore();
      // support hand on a gun's handguard / a two-handed grip: in front of the chest. A one-handed blade's guard arm stays
      // behind the body — drawn in front, its fist piles onto the weapon hand and reads as extra hands
      if (gr.rh && gr.rh.item) Tac.drawItem(ctx, gr.rh.item);   // magazine / shell in the support hand
      if (gr.far && !(gr.rel > 0.5) && (it.cls !== 'melee' || ['bat', 'fireaxe', 'katana'].includes(w.id))) this.arm(ctx, base, m, SF[0], SF[1], farA, true, null, true);
    }
    this.arm(ctx, base, m, S[0], S[1], nearA, false);
    ctx.restore();
    ctx.restore();
    return muzzle || true;
  },
};
