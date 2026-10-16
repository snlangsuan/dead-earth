// ---------- Puppet walk: legs (and the near arm) swing procedurally instead of flipping walk frames ----------
// Each character can have cut-out parts: char_X_body (no legs, no near arm), char_X_leg, char_X_arm, plus pivots in
// window.RIG_META[char_X] (all in the idle sprite's pixel space, 300 px tall). Walking then animates every frame:
// hips and knees bend, the far leg is shaded darker, the near arm swings against the legs, and the body bobs so
// the planted foot stays on the floor. Characters without parts keep the old frame-flip walk.
const Puppet = {
  rig(base) {
    const r = window.RIG_META && window.RIG_META[base];
    return r && Override.get(base + '_leg') && Override.get(r.body ? base + '_body' : base) ? r : null;
  },
  // leg pose for phase ph (radians); forward = towards the facing direction
  legPose(ph) { const hip = 24 * Math.sin(ph), knee = 6 + 50 * Math.pow(Math.max(0, Math.cos(ph)), 1.5); return { hip, knee }; },
  footY(r, ph) { // foot height below the hip for a leg at phase ph
    const { hip, knee } = this.legPose(ph), a = hip * Math.PI / 180, b = (hip - knee) * Math.PI / 180, kn = r.knee - r.legTop;
    return Math.cos(a) * kn + Math.cos(b) * (r.legLen - kn);
  },
  bob(r, ph) { // lift so the lower foot touches the ground
    const low = Math.max(this.footY(r, ph), this.footY(r, ph + Math.PI));
    return r.legLen - low;
  },
  drawLeg(ctx, r, img, hx, hy, ph, dark) {
    const { hip, knee } = this.legPose(ph), w = img.naturalWidth, h = img.naturalHeight, kn = r.knee;
    if (dark) ctx.filter = 'brightness(0.68)';
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-hip * Math.PI / 180);
    ctx.drawImage(img, 0, 0, w, kn + 3, -w / 2, -r.legTop, w, kn + 3);                    // thigh
    ctx.translate(0, kn - r.legTop); ctx.rotate(knee * Math.PI / 180);
    ctx.drawImage(img, 0, kn - 3, w, h - kn + 3, -w / 2, -3, w, h - kn + 3);              // shin + shoe
    ctx.restore();
    if (dark) ctx.filter = 'none';
  },
  // legs only (for shooting / swinging on the move); returns the hip line in idle pixel space, or null
  legs(ctx, base, x, y, face, scale, phase) {
    const r = this.rig(base); if (!r) return null;
    const m = Sprites.meta(base), leg = Override.get(base + '_leg'), k = scale / SPR_PPU, ph = phase * Math.PI / 2, dy = this.bob(r, ph);
    ctx.save(); ctx.translate(x, y); ctx.scale(face * k, k); ctx.translate(-m.ax, -m.ay + dy);
    this.drawLeg(ctx, r, leg, r.hipX - r.hipDx, r.hipY, ph + Math.PI, true);   // far leg
    this.drawLeg(ctx, r, leg, r.hipX + r.hipDx, r.hipY, ph, false);           // near leg
    ctx.restore();
    return { hipY: r.hipY, dy };
  },
  // whole walking character
  draw(ctx, base, x, y, face, scale, phase) {
    const r = this.rig(base); if (!r) return false;
    const m = Sprites.meta(base), k = scale / SPR_PPU, ph = phase * Math.PI / 2;
    const res = this.legs(ctx, base, x, y, face, scale, phase), dy = res.dy;
    const body = Override.get(r.body ? base + '_body' : base), arm = r.arm && Override.get(base + '_arm');
    ctx.save(); ctx.translate(x, y); ctx.scale(face * k, k); ctx.translate(-m.ax, -m.ay + dy);
    // upper body pivots a little around the hips with the stride: slight forward lean + sway
    ctx.translate(r.hipX, r.hipY); ctx.rotate((2.2 + 1.3 * Math.sin(ph * 2)) * Math.PI / 180); ctx.translate(-r.hipX, -r.hipY);
    ctx.save(); ctx.beginPath(); ctx.rect(-50, -50, m.w + 100, r.hipY + 56); ctx.clip(); ctx.drawImage(body, 0, 0); ctx.restore();   // torso (arm removed if r.body), cut at the hips
    if (arm) { // near arm swings opposite the near leg, from the shoulder
      ctx.translate(r.shX, r.shY); ctx.rotate(17 * Math.sin(ph) * Math.PI / 180);
      ctx.drawImage(arm, -r.armPx, -r.armTop);
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
        ctx.drawImage(iu, -mu.ax, -mu.ay + res.dy);
        ctx.restore();
        return true;
      }
    }
    return _split.call(this, ctx, upKey, legKey, x, y, facing, scale, filter, phase, amp);
  };
})();
