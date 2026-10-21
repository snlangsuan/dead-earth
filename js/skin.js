// ---------- Skinned bodies + measured human gait for the skeleton rig ----------
// Two changes to how the player characters move (Skel in skel.js keeps the bones, the weapon IK and everything else):
//
// 1. Skin. Thigh + shin, upper arm + forearm, and pelvis + chest are no longer separate pictures that turn about a pin
//    (which shows a cut at every joint and makes the body read as stiff blocks). Each pair is merged into one picture and
//    drawn as a mesh whose vertices follow two bones with smooth weights (linear blend skinning, as in Spine / DragonBones):
//    the knee, the elbow and the waist bend like skin, and the top of the thigh stays attached to the pelvis.
//    PixiJS draws the meshes on the GPU; plain Canvas 2D (file://) draws the same triangles one by one.
//
// 2. Gait from measurements. The joint angles come from normative human gait data (sagittal plane, % of the gait cycle
//    from heel strike): walking after Winter (1991) / Perry (1992), running after Novacheck (1998), arm swing after
//    Meyns et al. (2013). Only the hip range is scaled up, because these characters have very short legs (about a fifth
//    of their height); the timing, the knee and ankle curves and the foot roll are the measured ones. While a foot is on
//    the floor its ankle moves back in a straight line at constant speed (the hip angle is solved for it), so it stays put,
//    and the body height comes from whichever part of a sole is lowest (heel at heel strike, toes at push-off).
const Gait = {
  // 21 samples: 0, 5, … 100 % of the cycle (the last equals the first). Degrees: hip flexion +, knee flexion +, ankle dorsiflexion +,
  // shoulder flexion + (arm forward), elbow flexion +. TO = toe-off (end of stance), tilt = mean anterior pelvic tilt (thigh vs vertical = hip − tilt)
  walk: {
    TO: 0.62, tilt: 10,
    hip:   [30, 29, 27, 24, 20, 16, 12, 8, 4, 0, -4, -7, -9, -10, -6, 2, 13, 21, 27, 30, 30],
    knee:  [5, 12, 18, 20, 18, 14, 10, 7, 5, 6, 9, 17, 30, 44, 56, 61, 58, 45, 27, 11, 5],
    ankle: [0, -5, -3, 2, 5, 7, 8, 9, 10, 10, 7, 0, -12, -18, -12, -4, 0, 1, 1, 0, 0],
    sho:   [-18, -19, -18, -16, -13, -9, -5, -1, 3, 6, 8, 9, 8, 6, 3, -1, -6, -10, -14, -17, -18],
    elb:   [18, 16, 15, 15, 17, 20, 24, 29, 34, 38, 41, 42, 41, 38, 34, 30, 26, 23, 21, 19, 18],
  },
  run: {
    TO: 0.39, tilt: 14,
    hip:   [38, 33, 27, 20, 12, 5, -2, -7, -10, -6, 2, 12, 22, 32, 40, 45, 47, 46, 43, 40, 38],
    knee:  [22, 32, 40, 38, 32, 26, 21, 18, 22, 38, 58, 76, 90, 100, 102, 96, 82, 62, 42, 28, 22],
    ankle: [5, 12, 18, 20, 16, 8, -6, -18, -24, -18, -10, -4, 2, 6, 8, 8, 6, 4, 3, 4, 5],
    sho:   [-44, -42, -36, -27, -16, -5, 6, 14, 19, 21, 20, 16, 9, 0, -10, -20, -29, -36, -41, -44, -44],
    elb:   [76, 74, 74, 77, 82, 88, 94, 99, 102, 103, 101, 97, 92, 87, 82, 78, 76, 75, 75, 76, 76],
  },
  // periodic Catmull-Rom through the samples
  at(a, u) {
    u = ((u % 1) + 1) % 1;
    const n = a.length - 1, x = u * n, i = Math.floor(x), t = x - i, P = (k) => a[((k % n) + n) % n];
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  },
};

const Skin = {
  on: true,
  // how each movement uses the data on these short-legged characters: kH hip range, kK knee, kF foot roll, kS / kE arm swing,
  // C = constant knee bend (sneaking), lift = body rise in the flight phase (sprite px), slip < 1 lets the stride run a
  // little behind the ground speed (the legs are too short to keep up at the game's speeds without frantic steps)
  CFG: {
    walk:  { src: 'walk', kH: 2.2,  kK: 1.3,  kF: 1.0, kS: 2.1, kE: 1.35, C: 0,  lift: 0, slip: 0.72 },
    run:   { src: 'run',  kH: 1.8,  kK: 1.1,  kF: 0.9, kS: 1.1, kE: 1.0, C: 0,  lift: 9, slip: 0.58 },
    sneak: { src: 'walk', kH: 1.15, kK: 1.1,  kF: 0.8, kS: 0.7, kE: 1.2, C: 22, lift: 0, slip: 0.88 },
    // tactical walk with a gun up: knees soft (C), a shorter rolling step, the hips soak up the bob (glide < 1) so the muzzle stays level
    tac:   { src: 'walk', kH: 1.75, kK: 1.25, kF: 0.75, kS: 0.6, kE: 1.0, C: 15, lift: 0, slip: 0.64, glide: 0.4 },
  },
  cfg(g) { return this.CFG[g] || this.CFG.walk; },
  // ---- leg kinematics (sprite px, hip at the origin, x forward, y down) ----
  fk(J, h, k) { const r = Math.PI / 180; return [J.thighLen * Math.sin(h * r) + J.shinLen * Math.sin((h - k) * r), J.thighLen * Math.cos(h * r) + J.shinLen * Math.cos((h - k) * r)]; },
  raw(u, g, amp) {
    const c = this.cfg(g), D = Gait[c.src], hp = Gait.at(D.hip, u), kn = Gait.at(D.knee, u), an = Gait.at(D.ankle, u);
    const th = hp - D.tilt;   // thigh angle from vertical
    return { hip: amp * th * c.kH, knee: c.C + amp * kn * c.kK, foot: amp * ((kn - th) - an) * c.kF };   // foot = the real foot's angle to the floor (+ = toes down)
  },
  // hip angle that puts the ankle at x (the knee given)
  solveHip(J, k, x, h) {
    const r = Math.PI / 180;
    for (let i = 0; i < 6; i++) {
      const f = J.thighLen * Math.sin(h * r) + J.shinLen * Math.sin((h - k) * r) - x;
      const d = (J.thighLen * Math.cos(h * r) + J.shinLen * Math.cos((h - k) * r)) * r;
      if (Math.abs(d) < 1e-6) break; h -= f / d;
    }
    return h;
  },
  // one leg at cycle position u (0 = its heel strike)
  pose(J, u, g, amp) {
    u = ((u % 1) + 1) % 1;
    const c = this.cfg(g), TO = Gait[c.src].TO, q = this.raw(u, g, amp);
    if (u < TO && amp > 0.001) {   // planted: the ankle slides back under the body in a straight line
      const a = this.raw(0, g, amp), b = this.raw(TO, g, amp), x0 = this.fk(J, a.hip, a.knee)[0], x1 = this.fk(J, b.hip, b.knee)[0];
      q.hip = this.solveHip(J, q.knee, x0 + (x1 - x0) * u / TO, q.hip);
    }
    return q;
  },
  // lowest point of the sole (heel or toes) below the hip
  low(J, m, q) {
    const [ax, ay] = this.fk(J, q.hip, q.knee), f = q.foot * Math.PI / 180, c = Math.cos(f), s = Math.sin(f), F = this.footPts(m);
    return Math.max(ay + F.hx * s + F.y * c, ay + F.tx * s + F.ty * c);
  },
  footPts(m) {
    if (m._fp) return m._fp;
    const p = m.parts.foot, x0 = p.ox - p.px, J = m.joints;
    return (m._fp = { hx: x0 + 3, tx: x0 + p.w - 4, y: J.footY, ty: J.footY - 1 });
  },
  rest(m) { const J = m.joints; return J.thighLen + J.shinLen + J.footY; },
  // how far the body drops (sprite px) so a foot is on the floor; phase ph: near leg at ph, far leg half a cycle later
  drop(m, ph, g, amp) {
    const J = m.joints, u = ph / (2 * Math.PI), c = this.cfg(g), TO = Gait[c.src].TO, R = this.rest(m);
    const lowAt = (v) => this.low(J, m, this.pose(J, v, g, amp));
    const s = ((u % 0.5) + 0.5) % 0.5;
    if (TO < 0.5 && s > TO) {   // running: both feet in the air between toe-off and the other foot's heel strike
      const f = (s - TO) / (0.5 - TO), dA = R - lowAt(TO - 1e-4), dB = R - lowAt(0);
      return dA + (dB - dA) * f - c.lift * amp * Math.sin(Math.PI * f);
    }
    const d = R - Math.max(lowAt(u), lowAt(u + 0.5));
    if (!c.glide || amp <= 0) return d;
    // gliding: keep only part of the rise and fall around the mean height of the step (the knees take the rest)
    let mean = 0; for (let i = 0; i < 6; i++) { const v = i / 12; mean += R - Math.max(lowAt(v), lowAt(v + 0.5)); }
    mean /= 6; return mean + (d - mean) * c.glide;
  },
  // world px per step (phase advances π)
  stepLen(base, scale, g) {
    const m = window.SKEL_META[base], J = m.joints, c = this.cfg(g), TO = Gait[c.src].TO, key = '_sl_' + g;
    if (m[key] == null) {
      const a = this.raw(0, g, 1), b = this.raw(TO, g, 1);
      m[key] = (this.fk(J, a.hip, a.knee)[0] - this.fk(J, b.hip, b.knee)[0]) / TO / 2;   // the ankle covers this while planted (TO of a cycle = 2 steps)
    }
    return m[key] * scale / SPR_PPU / c.slip;
  },
  // free arm swing from the data (radians, the rig's convention: up > 0 swings the arm back, low < 0 folds the forearm forward)
  arm(u, g, amp, t, near) {
    const c = this.cfg(g), D = Gait[c.src], sh = Gait.at(D.sho, u) * c.kS, el = Gait.at(D.elb, u) * c.kE;
    const idle = (1 - amp) * (2.5 * Math.sin(t * 2.1 + (near ? 0.6 : 2)) + 2 * Skel.noise(t, near ? 6 : 7));
    const r = Math.PI / 180, rest = 14;
    return { up: (-amp * sh + idle) * r, low: -(rest + amp * Math.max(0, el - rest)) * r, wrist: -0.12 - 0.004 * amp * (el - 15) };
  },

  // ---------- meshes ----------
  // each skin: a canvas with the merged parts, rest vertices (in the frame the bones are given in), uvs, triangles and
  // per-vertex weights for up to three bones
  _sk: {},
  ready(base) {
    if (!this.on) return null;
    let s = this._sk[base];
    if (s !== undefined) return s;
    const m = window.SKEL_META && window.SKEL_META[base];
    if (!m || !['thigh', 'shin', 'uarm', 'farm', 'pelvis', 'chest'].every(k => { const im = Skel.img(base, k); return im && (im.naturalWidth || im.width); })) return null;   // not loaded yet: try again next frame
    try { s = this.build(base, m); } catch (e) { console.error('skin', base, e); s = null; }
    return (this._sk[base] = s);
  },
  build(base, m) {
    const J = m.joints, P = m.parts, sm = (a, b, v) => { const t = U.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    // limb parts in the limb's frame (proximal joint at the origin): each part sits at joint + (ox − px, oy − py)
    const leg = this.merge(base, [['thigh', 0, 0], ['shin', 0, J.thighLen]], P,
      (y) => { const w0 = 0.65 * sm(5, -7, y), w2 = sm(J.thighLen - 5, J.thighLen + 5, y); return [w0, (1 - w0) * (1 - w2), w2 * (1 - w0)]; },
      [0, 5, J.thighLen - 5, J.thighLen + 5], 3);
    const arm = this.merge(base, [['uarm', 0, 0], ['farm', 0, J.uarmLen]], P,
      (y) => { const w0 = 0.6 * sm(9, -6, y), w2 = sm(J.uarmLen - 6, J.uarmLen + 6, y); return [w0, (1 - w0) * (1 - w2), w2 * (1 - w0)]; },
      [-6, 9, J.uarmLen - 6, J.uarmLen + 6], 3);
    // pelvis + chest in sprite space (both parts' ox / oy are sprite coordinates), chest over pelvis
    const wy = J.waist[1];
    const torso = this.merge(base, [['pelvis', null], ['chest', null]], P,
      (y) => { const c = sm(wy + 9, wy - 9, y); return [1 - c, c, 0]; }, [wy - 9, wy + 9], 4);
    return { leg, arm, torso };
  },
  // draw the parts into one canvas and lay a grid over it: dense rows across the bend bands, sparse elsewhere
  merge(base, list, P, weight, bands, cols) {
    const rects = list.map(([n, jx, jy]) => {
      const p = P[n], im = Skel.img(base, n);
      return jx == null ? { im, x: p.ox, y: p.oy, w: p.w, h: p.h } : { im, x: jx + p.ox - p.px, y: jy + p.oy - p.py, w: p.w, h: p.h };
    });
    const x0 = Math.floor(Math.min(...rects.map(r => r.x))) - 1, y0 = Math.floor(Math.min(...rects.map(r => r.y))) - 1;
    const x1 = Math.ceil(Math.max(...rects.map(r => r.x + r.w))) + 1, y1 = Math.ceil(Math.max(...rects.map(r => r.y + r.h))) + 1;
    const W = x1 - x0, H = y1 - y0, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'); for (const r of rects) c.drawImage(r.im, r.x - x0, r.y - y0, r.w, r.h);
    const alpha = c.getImageData(0, 0, W, H).data;
    // rows
    const ys = new Set([y0, y1]);
    for (let i = 0; i + 1 < bands.length; i += 2) for (let y = bands[i]; y <= bands[i + 1] + 1e-6; y += 2) if (y > y0 && y < y1) ys.add(y);
    const rows = [...ys].sort((a, b) => a - b);
    for (let i = rows.length - 1; i > 0; i--) if (rows[i] - rows[i - 1] > 14) { const n = Math.ceil((rows[i] - rows[i - 1]) / 14); for (let k = 1; k < n; k++) rows.splice(i - 1 + k, 0, rows[i - 1] + (rows[i] - rows[i - 1]) * k / n); }   // keep cells modest (also refines the alpha test)
    const xs = []; for (let i = 0; i <= cols; i++) xs.push(x0 + W * i / cols);
    const NX = xs.length, NY = rows.length, pos = new Float32Array(NX * NY * 2), uv = new Float32Array(NX * NY * 2), wt = new Float32Array(NX * NY * 3);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const v = j * NX + i, x = xs[i], y = rows[j], w = weight(y);
      pos[v * 2] = x; pos[v * 2 + 1] = y; uv[v * 2] = (x - x0) / W; uv[v * 2 + 1] = (y - y0) / H;
      wt[v * 3] = w[0]; wt[v * 3 + 1] = w[1]; wt[v * 3 + 2] = w[2];
    }
    // triangles, skipping cells with nothing painted in them
    const tri = [];
    const filled = (ax, ay, bx, by) => {
      const X0 = Math.max(0, Math.floor(ax - x0) - 1), X1 = Math.min(W, Math.ceil(bx - x0) + 1), Y0 = Math.max(0, Math.floor(ay - y0) - 1), Y1 = Math.min(H, Math.ceil(by - y0) + 1);
      for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) if (alpha[(y * W + x) * 4 + 3] > 4) return true;
      return false;
    };
    for (let j = 0; j + 1 < NY; j++) for (let i = 0; i + 1 < NX; i++) {
      if (!filled(xs[i], rows[j], xs[i + 1], rows[j + 1])) continue;
      const a = j * NX + i, b = a + 1, d = a + NX, e = d + 1;
      tri.push(a, b, e, a, e, d);
    }
    return { cv, pos, uv, wt, idx: new Uint16Array(tri), n: NX * NY, out: new Float32Array(NX * NY * 2), W, H };
  },
  // blend the bones (2D affine [a b c d e f]) into out
  deform(s, B) {
    const p = s.pos, w = s.wt, o = s.out;
    for (let v = 0; v < s.n; v++) {
      const x = p[v * 2], y = p[v * 2 + 1];
      let X = 0, Y = 0;
      for (let k = 0; k < 3; k++) {
        const q = w[v * 3 + k]; if (q <= 0) continue;
        const M = B[k]; X += q * (M[0] * x + M[2] * y + M[4]); Y += q * (M[1] * x + M[3] * y + M[5]);
      }
      o[v * 2] = X; o[v * 2 + 1] = Y;
    }
    return o;
  },
  // matrices: rotation (radians) about (px, py), optionally after another matrix
  rot(a, px = 0, py = 0) { const c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, px - c * px + s * py, py - s * px - c * py]; },
  mul(A, B) { return [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]]; },
  I: [1, 0, 0, 1, 0, 0],
  draw(ctx, s, B, dark, key) {
    const v = this.deform(s, B), img = dark ? FilterCache.get(s.cv, 'brightness(0.8)') : s.cv;
    if (typeof ctx.drawMesh === 'function') return ctx.drawMesh(img, v, s.uv, s.idx, key);
    if (typeof ctx.getImageData !== 'function') return;   // a measuring context: nothing to paint
    this.tris(ctx, img, v, s);
  },
  // Canvas 2D: each triangle clipped and drawn with the affine map from the texture (grown a little so no hairline gaps show)
  tris(ctx, img, v, s) {
    const T = ctx.getTransform(), k = Math.sqrt(Math.abs(T.a * T.d - T.b * T.c)) || 1, g = 0.6 / k, I = s.idx, uv = s.uv, W = s.W, H = s.H;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t], b = I[t + 1], c = I[t + 2];
      const x0 = v[a * 2], y0 = v[a * 2 + 1], x1 = v[b * 2], y1 = v[b * 2 + 1], x2 = v[c * 2], y2 = v[c * 2 + 1];
      const u0 = uv[a * 2] * W, w0 = uv[a * 2 + 1] * H, u1 = uv[b * 2] * W, w1 = uv[b * 2 + 1] * H, u2 = uv[c * 2] * W, w2 = uv[c * 2 + 1] * H;
      const den = (u1 - u0) * (w2 - w0) - (u2 - u0) * (w1 - w0); if (Math.abs(den) < 1e-9) continue;
      const ma = ((x1 - x0) * (w2 - w0) - (x2 - x0) * (w1 - w0)) / den, mb = ((y1 - y0) * (w2 - w0) - (y2 - y0) * (w1 - w0)) / den;
      const mc = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / den, md = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / den;
      const me = x0 - ma * u0 - mc * w0, mf = y0 - mb * u0 - md * w0;
      const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3, gr = (x, y) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + dx / l * g, y + dy / l * g]; };
      const p0 = gr(x0, y0), p1 = gr(x1, y1), p2 = gr(x2, y2);
      ctx.save(); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.closePath(); ctx.clip();
      ctx.transform(ma, mb, mc, md, me, mf); ctx.drawImage(img, 0, 0); ctx.restore();
    }
  },
};

// ---------- hook the skeleton ----------
(function hookSkel() {
  if (typeof Skel === 'undefined') return;
  const old = { legAt: Skel.legAt, arm: Skel.arm, pose: Skel.pose, bobOf: Skel.bobOf, stepLen: Skel.stepLen, freeArm: Skel.freeArm };
  Skel._old = old;
  // the flight lift is in Skin.drop now: keep skel.js's own flight formula switched off (fs = 2·S ≥ 1)
  for (const g of Object.keys(Skel.GAIT)) Skel.GAIT[g] = Object.assign({}, Skel.GAIT[g], { S: 0.5 });
  Skel.pose = function (ph, near, gait, amp) {
    const m = this._m; if (!Skin.on || !m) return old.pose.call(this, ph, near, gait, amp);
    return Skin.pose(m.joints, ph / (2 * Math.PI), gait, amp);
  };
  Skel.bobOf = function (m, ph, gait, amp) { return Skin.on ? Skin.drop(m, ph, gait, amp) : old.bobOf.call(this, m, ph, gait, amp); };
  Skel.stepLen = function (base, scale, gait) { return Skin.on ? Skin.stepLen(base, scale, gait) : old.stepLen.call(this, base, scale, gait); };
  Skel.freeArm = function (g, ph, amp, t, run, near) {
    if (!Skin.on) return old.freeArm.call(this, g, ph, amp, t, run, near);
    return Skin.arm(ph / (2 * Math.PI) + (near ? 0 : 0.5) - 0.02, this._gait || 'walk', amp, t, near);   // the arm on the near side swings with the near leg's cycle (a touch late)
  };
  // legs: thigh + shin as one skin (the thigh's top follows the pelvis a little), the foot on top
  Skel.legAt = function (ctx, base, m, hx, hy, hip, knee, foot, dark) {
    const S = Skin.ready(base); if (!S) return old.legAt.call(this, ctx, base, m, hx, hy, hip, knee, foot, dark);
    const J = m.joints, r = Math.PI / 180, th = Skin.rot(-hip * r), sh = Skin.mul(th, Skin.rot(knee * r, 0, J.thighLen));
    ctx.save(); ctx.translate(hx, hy);
    Skin.draw(ctx, S.leg, [Skin.rot(this._pelA || 0), th, sh], dark, 'leg' + (dark ? 'F' : 'N'));
    ctx.rotate(-hip * r); ctx.translate(0, J.thighLen); ctx.rotate(knee * r); ctx.translate(0, J.shinLen); ctx.rotate((hip - knee + foot) * r);
    this.part(ctx, base, m, 'foot', dark);
    ctx.restore();
  };
  // arms: upper arm + forearm as one skin (the top follows the shoulder cap part of the way), the hand on the end
  Skel.arm = function (ctx, base, m, sx, sy, a, dark, under, foreOnly) {
    const S = !foreOnly && Skin.ready(base); if (!S) return old.arm.call(this, ctx, base, m, sx, sy, a, dark, under, foreOnly);
    const J = m.joints, cap = m.parts.cap;
    if (cap) { ctx.save(); ctx.translate(sx, sy); ctx.rotate(a.up * 0.35); this.part(ctx, base, m, 'cap', dark); ctx.restore(); }
    ctx.save(); ctx.translate(sx, sy);
    if (under) { ctx.save(); ctx.rotate(a.up); ctx.translate(0, J.uarmLen); ctx.rotate(a.low); ctx.translate(0, J.farmLen + 10); ctx.rotate(-a.up - a.low); under(); ctx.restore(); }
    const ua = Skin.rot(a.up), fa = Skin.mul(ua, Skin.rot(a.low, 0, J.uarmLen));
    Skin.draw(ctx, S.arm, [Skin.rot(a.up * 0.35), ua, fa], dark, 'arm' + (dark ? 'F' : 'N'));
    ctx.rotate(a.up); ctx.translate(0, J.uarmLen); ctx.rotate(a.low); ctx.translate(0, J.farmLen); ctx.rotate(a.wrist || 0);
    this.part(ctx, base, m, 'hand', dark);
    ctx.restore();
    if (cap) { ctx.save(); ctx.translate(sx, sy); ctx.rotate(a.up * 0.35); ctx.globalAlpha *= 0.85; this.part(ctx, base, m, 'cap', dark); ctx.restore(); }
  };
  // pelvis + chest as one skin bending at the waist; returns false when the skin isn't ready (skel.js draws the parts)
  Skel.torso = function (ctx, base, m, pelvisA, chestM) {
    const S = Skin.ready(base); if (!S) return false;
    const [hx, hy] = m.joints.hip;
    Skin.draw(ctx, S.torso, [Skin.rot(pelvisA, hx, hy), chestM, Skin.I], false, 'torso');
    return true;
  };
})();
