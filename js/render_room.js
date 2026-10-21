// ---------- Diorama-style rooms (cross-section boxes with perspective) ----------
const GAPH = 6;   // half gap between rooms
const SD = 22;    // side wall depth
const CD = 12;    // ceiling depth
const FD = 26;    // floor depth
const FEET = 10;  // characters stand this far in front of the floor's front edge

const FLOOR_STYLE = { stripe: 'wood', panel: 'wood', tile: 'tile', brick: 'concrete' };

Object.assign(R, {
  roomBox(rm) {
    const by1 = floorY(rm.f), by0 = by1 - FH + SLAB;
    return { bx0: rm.x0 + GAPH, bx1: rm.x1 - GAPH, by0, by1 };
  },
  roomTint(run, rm) {
    const RT = ROOM_TYPES[rm.type];
    return U.shade(U.mix(RT.tint, '#44525a', 0.68), -16 + ((rm.seed % 12) - 6));
  },
  drawBuildingMass(run) {
    const ctx = this.ctx, map = run.map;
    const top = floorY(map.F), bot = SLAB + 4;
    ctx.fillStyle = '#121519'; ctx.fillRect(-10, top, map.BW + 20, bot - top);
    ctx.strokeStyle = '#06080a'; ctx.lineWidth = 4; ctx.strokeRect(-10, top, map.BW + 20, bot - top);
    // faint concrete texture on the mass
    const r = U.rng(map.seed);
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let i = 0; i < 60; i++) ctx.fillRect(r() * map.BW, top + r() * (bot - top), 20 + r() * 50, 2);
    // roof parapet
    ctx.fillStyle = '#2a2f36'; ctx.fillRect(-14, top - 6, map.BW + 28, 10);
    ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.strokeRect(-14, top - 6, map.BW + 28, 10);
    ctx.strokeStyle = '#3a414a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, top - 40); ctx.lineTo(map.BW + 10, top - 40); ctx.stroke();
    for (let x = -10; x <= map.BW + 10; x += 46) { ctx.beginPath(); ctx.moveTo(x, top - 40); ctx.lineTo(x, top - 6); ctx.stroke(); }
  },

  drawRoomBack(run, rm, current) {
    const ctx = this.ctx;
    if (rm.outdoor) return;
    const { bx0, bx1, by0, by1 } = this.roomBox(rm);
    if (!rm.revealed) {
      ctx.fillStyle = '#0a0c0f'; ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 2; ctx.strokeRect(bx0 + 1, by0 + 1, bx1 - bx0 - 2, by1 - by0 - 2);
      return;
    }
    const RT = ROOM_TYPES[rm.type];
    const r = U.rng(rm.seed);
    const wall = this.roomTint(run, rm);
    const wx0 = bx0 + SD, wx1 = bx1 - SD, wy0 = by0 + CD, wy1 = by1 - FD;
    const ww = wx1 - wx0, wh = wy1 - wy0;
    ctx.save();
    ctx.beginPath(); ctx.rect(bx0, by0, bx1 - bx0, by1 - by0); ctx.clip();
    // ---- back wall
    const g0 = ctx.createLinearGradient(0, wy0, 0, wy1);
    g0.addColorStop(0, U.shade(wall, -16)); g0.addColorStop(0.55, wall); g0.addColorStop(1, U.shade(wall, -8));
    ctx.fillStyle = g0; ctx.fillRect(wx0, wy0, ww, wh);
    const pat = Art.wallPattern(ctx, RT.paper);
    if (pat && pat._ext) {
      // painted texture, then the room's tint + vertical shading so rooms still differ
      ctx.save(); ctx.translate(wx0, wy0); ctx.fillStyle = pat; ctx.fillRect(0, 0, ww, wh); ctx.restore();
      ctx.globalAlpha = 0.32; ctx.fillStyle = g0; ctx.fillRect(wx0, wy0, ww, wh); ctx.globalAlpha = 1;
      const gs = ctx.createLinearGradient(0, wy0, 0, wy1); gs.addColorStop(0, 'rgba(0,0,0,0.35)'); gs.addColorStop(0.5, 'rgba(0,0,0,0.12)'); gs.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = gs; ctx.fillRect(wx0, wy0, ww, wh);
    } else if (pat) { ctx.fillStyle = pat; ctx.fillRect(wx0, wy0, ww, wh); }
    if (!(pat && pat._ext) && (RT.paper === 'panel' || RT.paper === 'stripe')) {
      const py = wy1 - wh * 0.32;
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(wx0, py, ww, wy1 - py);
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(wx0, py, ww, 3);
    }
    // grime blotches
    for (let i = 0; i < 6; i++) {
      const gx = wx0 + r() * ww, gy = wy0 + r() * wh * 0.8, gr = 30 + r() * 80;
      const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      gg.addColorStop(0, `rgba(18,14,10,${0.10 + r() * 0.14})`); gg.addColorStop(1, 'rgba(18,14,10,0)');
      ctx.fillStyle = gg; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    // plaster damage revealing brick
    if (r() < 0.55) this.plasterHole(ctx, wx0 + 30 + r() * (ww - 140), wy0 + 18 + r() * (wh * 0.4), 50 + r() * 60, 36 + r() * 30, r, wall);
    // drips & cracks
    for (let i = 0; i < 3; i++) { const dx = wx0 + r() * ww, dl = 20 + r() * 70; const gd = ctx.createLinearGradient(0, wy0, 0, wy0 + dl); gd.addColorStop(0, 'rgba(25,20,12,0.4)'); gd.addColorStop(1, 'rgba(25,20,12,0)'); ctx.fillStyle = gd; ctx.fillRect(dx, wy0, 4 + r() * 10, dl); }
    ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) { let x = wx0 + r() * ww, y = wy0 + r() * 20; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 26; y += 4 + r() * 14; ctx.lineTo(x, y); } ctx.stroke(); }
    // wall decorations
    const slots = [];
    const putDeco = (k, v, x, y) => { Art.draw(ctx, Art.deco(k, v), x, y); slots.push(x); };
    if (rm.windows) { const nW = Math.max(1, Math.floor(ww / 300)); for (let i = 0; i < nW; i++) putDeco('window', rm.seed + i, wx0 + (i + 0.5) * (ww / nW) - 40, wy0 + 22); }
    const extra = U.pick(r, ['picture', 'poster', 'clock', 'picture', 'shelf', 'ac', null]);
    if (extra) { const ew = { picture: 54, poster: 40, clock: 32, shelf: 70, ac: 70 }[extra]; const ex = wx0 + 16 + r() * (ww - ew - 32); if (!slots.some(sx => Math.abs(sx + 40 - (ex + ew / 2)) < 80)) putDeco(extra, rm.seed >> 3, ex, extra === 'ac' ? wy0 + 6 : wy0 + 34); }
    if (r() < 0.3) Art.draw(ctx, Art.deco('pipe', 0), wx0, wy0 + 2, Math.min(ww, 120), 16);
    // blood on wall
    for (const b of rm.blood) if (b.wall) this.bloodSplat(ctx, b.x, wy0 + wh * (0.25 + b.y * 0.5), b.s, U.rng(Math.floor(b.x * 13)));
    // baseboard
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(wx0, wy1 - 6, ww, 6);
    // ---- ceiling
    ctx.fillStyle = U.shade(wall, -34);
    ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(bx1, by0); ctx.lineTo(wx1, wy0); ctx.lineTo(wx0, wy0); ctx.closePath(); ctx.fill();
    // ---- side walls
    const sideC = U.shade(wall, -24);
    const side = (left) => {
      const ox = left ? bx0 : bx1, ix = left ? wx0 : wx1;
      const g = ctx.createLinearGradient(ox, 0, ix, 0);
      g.addColorStop(0, U.shade(sideC, -14)); g.addColorStop(1, sideC);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(ox, by0); ctx.lineTo(ix, wy0); ctx.lineTo(ix, wy1); ctx.lineTo(ox, by1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ix, wy0); ctx.lineTo(ix, wy1); ctx.stroke();
      const doorX = left ? rm.x0 : rm.x1;
      if (run.door(rm.f, doorX)) {
        const dh = DOOR_H, k = 0.82;
        const dobj = run.doorObj && run.doorObj(rm.f, doorX);
        const shut = dobj && (dobj.lk || (dobj.closed && !dobj.broken));
        // the leaf belongs to the other room: shut -> plain wall with a faint frame, open -> just the dark opening
        if (dobj && dobj.own != null && dobj.own !== rm.id) {
          ctx.beginPath(); ctx.moveTo(ox, by1); ctx.lineTo(ox, by1 - dh); ctx.lineTo(ix, wy1 - dh * k); ctx.lineTo(ix, wy1); ctx.closePath();
          if (shut) { ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2; ctx.stroke(); return; }
          ctx.fillStyle = '#07090b'; ctx.fill(); ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 3; ctx.stroke(); return;
        }
        // doorway opening in the side wall (perspective)
        ctx.fillStyle = '#07090b';
        ctx.beginPath(); ctx.moveTo(ox, by1); ctx.lineTo(ox, by1 - dh); ctx.lineTo(ix, wy1 - dh * k); ctx.lineTo(ix, wy1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 3; ctx.stroke();
        if (shut) { this.drawClosedDoor(ctx, dobj, ox, ix, by1, wy1, dh, k, left); return; }
        if (dobj && dobj.broken) { // splintered stub left on the hinge
          ctx.fillStyle = '#4a3220'; ctx.strokeStyle = OL; ctx.lineWidth = 1.5; const d2 = left ? 1 : -1;
          ctx.beginPath(); ctx.moveTo(ix, wy1); ctx.lineTo(ix, wy1 - dh * k * 0.5); ctx.lineTo(ix + d2 * 8, wy1 - dh * k * 0.38); ctx.lineTo(ix + d2 * 5, wy1 - dh * k * 0.18); ctx.lineTo(ix + d2 * 10, wy1); ctx.closePath(); ctx.fill(); ctx.stroke();
          return;
        }
        // opened door leaf swung against the back wall
        const dir = left ? 1 : -1, lx = ix, lw = 30;
        ctx.fillStyle = dobj && dobj.lvl >= 2 ? '#6d757d' : '#6e5038'; ctx.strokeStyle = OL; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(lx, wy1); ctx.lineTo(lx, wy1 - dh * k); ctx.lineTo(lx + dir * lw, wy1 - dh * k + 4); ctx.lineTo(lx + dir * lw, wy1 + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(Math.min(lx + dir * 6, lx + dir * 24), wy1 - dh * k + 14, 18, 30); ctx.fillRect(Math.min(lx + dir * 6, lx + dir * 24), wy1 - dh * k + 56, 18, 34);
        ctx.fillStyle = '#d4b06a'; ctx.beginPath(); ctx.arc(lx + dir * (lw - 6), wy1 - dh * k * 0.5, 2.2, 0, 7); ctx.fill();
        if ((left && rm.x0 === 0 && rm.f === 0) || (!left && rm.x1 === run.map.BW && rm.f === 0)) {
          const ew = typeof LocArt !== 'undefined' ? LocArt.exitWord(run) : 'EXIT';   // in the local language
          ctx.font = '800 8px Kanit, system-ui, sans-serif'; const bw = Math.max(36, ctx.measureText(ew).width + 10);
          ctx.fillStyle = '#1e8a4a'; ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(ix + (left ? 4 : -4 - bw), wy1 - dh * k - 20, bw, 13, 3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#e8ffe8'; ctx.textAlign = 'center'; ctx.fillText(ew, ix + (left ? 4 + bw / 2 : -4 - bw / 2), wy1 - dh * k - 10.5);
        }
      }
    };
    side(true); side(false);
    // ---- floor
    this.drawFloor(ctx, rm, bx0, bx1, wx0, wx1, wy1, by1, wall, r, RT);
    // ladder hatch openings
    for (const l of run.map.ladders) {
      if (l.b === rm.id) { ctx.fillStyle = '#050607'; ctx.beginPath(); ctx.moveTo(l.x - 26, by1); ctx.lineTo(l.x + 26, by1); ctx.lineTo(l.x + 22, wy1 + 2); ctx.lineTo(l.x - 22, wy1 + 2); ctx.closePath(); ctx.fill(); }
      if (l.a === rm.id) { ctx.fillStyle = '#050607'; ctx.beginPath(); ctx.moveTo(l.x - 26, by0); ctx.lineTo(l.x + 26, by0); ctx.lineTo(l.x + 22, wy0); ctx.lineTo(l.x - 22, wy0); ctx.closePath(); ctx.fill(); }
    }
    // ---- lighting
    const lit = !rm.dark || run.powered;
    const flick = rm.dark ? 0 : (Math.sin(run.time * 13 + rm.seed) > 0.97 ? 0.45 : 1);
    const lxs = ww > 420 ? [wx0 + ww * 0.3, wx0 + ww * 0.7] : [wx0 + ww / 2];
    for (const lx of lxs) {
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(lx - 1, by0, 2, CD + 8);
      ctx.fillStyle = lit ? '#fff0c4' : '#444'; ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(lx - 14, wy0 + 14); ctx.quadraticCurveTo(lx, wy0 + 2, lx + 14, wy0 + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (lit) {
        const g = ctx.createRadialGradient(lx, wy0 + 14, 4, lx, wy1, wh * 1.05);
        g.addColorStop(0, `rgba(255,232,170,${0.15 * flick})`); g.addColorStop(1, 'rgba(255,232,170,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx - 12, wy0 + 14); ctx.lineTo(lx + 12, wy0 + 14); ctx.lineTo(lx + 170, by1); ctx.lineTo(lx - 170, by1); ctx.fill();
        const pool = ctx.createRadialGradient(lx, wy1 + FD / 2, 4, lx, wy1 + FD / 2, 150);
        pool.addColorStop(0, `rgba(255,232,170,${0.14 * flick})`); pool.addColorStop(1, 'rgba(255,232,170,0)');
        ctx.fillStyle = pool; ctx.fillRect(lx - 150, wy1, 300, FD);
      }
    }
    // inner vignette (dark corners) — the diorama look
    const cxr = (bx0 + bx1) / 2, cyr = (by0 + by1) / 2;
    const vg = ctx.createRadialGradient(cxr, cyr, Math.min(ww, wh) * 0.3, cxr, cyr, Math.max(ww, wh) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, lit ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vg; ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    if (!lit) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0); }
    ctx.restore();
    ctx.strokeStyle = '#07090b'; ctx.lineWidth = 3; ctx.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);
  },

  drawFloor(ctx, rm, bx0, bx1, wx0, wx1, wy1, by1, wall, r, RT) {
    const style = FLOOR_STYLE[RT.paper] || 'concrete';
    const base = style === 'wood' ? '#5e4632' : style === 'tile' ? U.mix(wall, '#9aa4a8', 0.45) : U.mix(wall, '#5a5f63', 0.6);
    const g = ctx.createLinearGradient(0, wy1, 0, by1);
    g.addColorStop(0, U.shade(base, -22)); g.addColorStop(1, U.shade(base, 8));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(wx0, wy1); ctx.lineTo(wx1, wy1); ctx.lineTo(bx1, by1); ctx.lineTo(bx0, by1); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    const cx = (bx0 + bx1) / 2;
    const fpat = Art.floorPattern && Art.floorPattern(ctx, style);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.2;
    if (fpat) {
      ctx.save(); ctx.translate(bx0, wy1); ctx.fillStyle = fpat; ctx.fillRect(0, 0, bx1 - bx0, by1 - wy1); ctx.restore();
      const gf = ctx.createLinearGradient(0, wy1, 0, by1); gf.addColorStop(0, 'rgba(0,0,0,0.5)'); gf.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.fillStyle = gf; ctx.fillRect(bx0, wy1, bx1 - bx0, by1 - wy1);
    } else if (style === 'wood') {
      for (let y = wy1 + 6; y < by1; y += 7) { ctx.beginPath(); ctx.moveTo(bx0, y); ctx.lineTo(bx1, y); ctx.stroke(); }
      for (let i = 0; i < 40; i++) { const x = bx0 + r() * (bx1 - bx0), y = wy1 + Math.floor(r() * 4) * 7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 7); ctx.stroke(); }
    } else if (style === 'tile') {
      for (let y = wy1 + 8; y < by1; y += 9) { ctx.beginPath(); ctx.moveTo(bx0, y); ctx.lineTo(bx1, y); ctx.stroke(); }
      for (let x = wx0; x <= wx1; x += 32) { const t = (x - cx); ctx.beginPath(); ctx.moveTo(x, wy1); ctx.lineTo(cx + t * ((bx1 - bx0) / (wx1 - wx0)), by1); ctx.stroke(); }
    } else {
      for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.08})`; ctx.beginPath(); ctx.ellipse(bx0 + r() * (bx1 - bx0), wy1 + r() * FD, 20 + r() * 40, 4, 0, 0, 7); ctx.fill(); }
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(bx0, by1 - 3, bx1 - bx0, 3);
    // debris on the floor
    const nDeb = 3 + Math.floor(r() * 5);
    for (let i = 0; i < nDeb; i++) {
      const kind = U.pick(r, ['paper', 'paper', 'can', 'bottle', 'rubble', 'books', 'paper']);
      const x = wx0 + 10 + r() * (wx1 - wx0 - 20), y = wy1 + 6 + r() * (FD - 8);
      this.debris(ctx, kind, x, y, r);
    }
    for (const b of rm.blood) if (!b.wall) { ctx.fillStyle = 'rgba(105,8,8,0.8)'; ctx.beginPath(); ctx.ellipse(b.x, wy1 + FD * 0.6, 26 * b.s, 5 * b.s, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(150,20,20,0.5)'; ctx.beginPath(); ctx.ellipse(b.x - 6, wy1 + FD * 0.55, 10 * b.s, 2 * b.s, 0, 0, 7); ctx.fill(); }
  },
  debris(ctx, kind, x, y, r) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = OL; ctx.lineWidth = 1;
    switch (kind) {
      case 'paper': ctx.rotate((r() - 0.5) * 0.6); ctx.fillStyle = U.pick(r, ['#e8e2d2', '#d8d2c2', '#f0ece0']); ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(7, -3); ctx.lineTo(9, 2); ctx.lineTo(-7, 3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(4, -1.5); ctx.stroke(); break;
      case 'can': ctx.fillStyle = U.pick(r, ['#c0392b', '#2e86c1', '#9aa']); ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-3, -1, 3, 1); break;
      case 'bottle': ctx.rotate(r() * 0.4); ctx.fillStyle = 'rgba(60,140,80,.85)'; ctx.beginPath(); ctx.roundRect(-9, -2.5, 14, 5, 2); ctx.fill(); ctx.stroke(); ctx.fillRect(5, -1.2, 5, 2.4); break;
      case 'rubble': ctx.fillStyle = '#6a6e72'; for (let i = 0; i < 4; i++) { ctx.beginPath(); const rx = (r() - 0.5) * 16, s = 2 + r() * 4; ctx.moveTo(rx - s, 2); ctx.lineTo(rx, -s); ctx.lineTo(rx + s, 2); ctx.closePath(); ctx.fill(); ctx.stroke(); } break;
      case 'books': for (let i = 0; i < 3; i++) { ctx.fillStyle = U.pick(r, ['#8a3a3a', '#3a5a8a', '#3a7a4a', '#b08a40']); ctx.beginPath(); ctx.rect(-9 + i * 1.5, -i * 4, 16, 4); ctx.fill(); ctx.stroke(); } break;
    }
    ctx.restore();
  },
  plasterHole(ctx, x, y, w, h, r, wall) {
    ctx.save();
    ctx.beginPath();
    const n = 10; const pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([x + w / 2 + Math.cos(a) * w / 2 * (0.7 + r() * 0.35), y + h / 2 + Math.sin(a) * h / 2 * (0.7 + r() * 0.35)]); }
    pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath();
    ctx.fillStyle = '#5a3c30'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#7a4a3a'; ctx.strokeStyle = '#3a2420'; ctx.lineWidth = 1.5;
    let row = 0; for (let yy = y - 4; yy < y + h + 8; yy += 10, row++) for (let xx = x - 20 + (row % 2) * 12; xx < x + w + 20; xx += 24) { ctx.fillRect(xx, yy, 22, 8); ctx.strokeRect(xx, yy, 22, 8); }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 10, y - 10, w + 20, 8);
    ctx.restore();
    ctx.strokeStyle = U.shade(wall, 30); ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  },
  bloodSplat(ctx, x, y, s, r) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const blob = (cx, cy, rad, col) => {
      ctx.fillStyle = col; ctx.beginPath();
      const n = 12;
      for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, rr = rad * (0.55 + r() * 0.6); const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.85; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath(); ctx.fill();
    };
    blob(0, 0, 13, 'rgba(92,8,8,0.82)');
    blob(-2, -2, 7, 'rgba(120,14,14,0.7)');
    ctx.fillStyle = 'rgba(92,8,8,0.8)';
    for (let i = 0; i < 14; i++) { const a = r() * 7, d = 12 + r() * 20, rr = 0.6 + r() * 2.2; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d * 0.7, rr, 0, 7); ctx.fill(); }
    for (let i = 0; i < 3; i++) { const dx = -8 + r() * 16, dl = 8 + r() * 26, w = 1.2 + r() * 1.8; ctx.beginPath(); ctx.moveTo(dx - w, 4); ctx.lineTo(dx + w, 4); ctx.lineTo(dx + w * 0.7, dl); ctx.arc(dx, dl, w * 1.2, 0, Math.PI); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  },

  // door passages bridge the gap between neighbouring rooms
  // a shut door filling the doorway in the side wall (same perspective quad as the opening)
  drawClosedDoor(ctx, d, ox, ix, by1, wy1, dh, k, left) {
    const P = (u, v) => { // u: 0 outer edge .. 1 inner edge, v: 0 floor .. 1 top
      const x = ox + (ix - ox) * u, yb = by1 + (wy1 - by1) * u, h = dh * (1 + (k - 1) * u);
      return [x, yb - h * v];
    };
    const quad = (u0, v0, u1, v1) => { const a = P(u0, v0), b = P(u1, v0), c = P(u1, v1), e = P(u0, v1); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...e); ctx.closePath(); };
    const steel = d.lvl >= 2 && !d.lk, sh = d.hitT > 0 ? U.rf(Math.random, -1.5, 1.5) : 0;
    ctx.save(); ctx.translate(sh, 0);
    const g = ctx.createLinearGradient(ox, 0, ix, 0);
    if (steel) { g.addColorStop(0, '#59616a'); g.addColorStop(1, '#7d868f'); } else { g.addColorStop(0, '#4e3422'); g.addColorStop(1, '#7a5636'); }
    ctx.fillStyle = g; ctx.strokeStyle = OL; ctx.lineWidth = 2; quad(0.02, 0, 0.98, 0.99); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.4; quad(0.2, 0.55, 0.8, 0.92); ctx.stroke(); quad(0.2, 0.08, 0.8, 0.47); ctx.stroke();
    if (steel) { ctx.fillStyle = '#c3cad1'; for (const [u, v] of [[0.12, 0.06], [0.88, 0.06], [0.12, 0.94], [0.88, 0.94], [0.12, 0.5], [0.88, 0.5]]) { const [x, y] = P(u, v); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); } }
    if (!d.lk && (d.lvl === 1 || d.lvl >= 3)) { // nailed planks across
      for (const [v0, v1] of [[0.78, 0.6], [0.32, 0.16]]) { const a = P(-0.05, v0), b = P(1.05, v1);
        ctx.strokeStyle = OL; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
        ctx.strokeStyle = '#a07a48'; ctx.lineWidth = 4.5; ctx.stroke(); }
    }
    if (!d.lk && d.lvl >= 3) { ctx.strokeStyle = '#4a5058'; ctx.lineWidth = 4; for (const u of [0.04, 0.96]) { const a = P(u, 0), b = P(u, 0.99); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); } }
    const [hx, hy] = P(left ? 0.85 : 0.85, 0.47); ctx.fillStyle = '#d4b06a'; ctx.beginPath(); ctx.arc(hx, hy, 2.4, 0, 7); ctx.fill();
    const hp = d.lk ? d.lk.hp / d.lk.max : d.hp / d.max;
    if (hp < 0.75) { ctx.strokeStyle = 'rgba(15,8,4,0.85)'; ctx.lineWidth = 1.5; const a = P(0.3, 0.85), b = P(0.5, 0.75), c = P(0.38, 0.66); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); if (hp < 0.45) { const e = P(0.6, 0.3), f = P(0.45, 0.22), h2 = P(0.58, 0.12); ctx.moveTo(...e); ctx.lineTo(...f); ctx.lineTo(...h2); } ctx.stroke(); }
    ctx.restore();
  },

  drawStructure(run) {
    const ctx = this.ctx, map = run.map;
    for (const d of map.doors) {
      const a = map.rooms[d.a], b = map.rooms[d.b];
      if (!a.revealed && !b.revealed) continue;
      if (a.outdoor || b.outdoor) continue;
      const y1 = floorY(d.f);
      ctx.fillStyle = '#07090b'; ctx.fillRect(d.x - GAPH - 1, y1 - DOOR_H, GAPH * 2 + 2, DOOR_H);
      ctx.fillStyle = '#2c2a28'; ctx.fillRect(d.x - GAPH - 1, y1 - 6, GAPH * 2 + 2, 6);
    }
    // street-facing exits: frame on the building edge
    for (const d of map.doors) {
      const a = map.rooms[d.a], b = map.rooms[d.b];
      if (!(a.outdoor || b.outdoor)) continue;
      const y1 = floorY(d.f);
      ctx.fillStyle = '#07090b'; ctx.fillRect(d.x - GAPH - 2, y1 - DOOR_H, GAPH * 2 + 4, DOOR_H);
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 4; ctx.strokeRect(d.x - GAPH - 4, y1 - DOOR_H - 2, GAPH * 2 + 8, DOOR_H + 2);
    }
  },

  drawLadders(run) {
    const ctx = this.ctx;
    for (const l of run.map.ladders) {
      const a = run.map.rooms[l.a], b = run.map.rooms[l.b];
      if (!a.revealed && !b.revealed) continue;
      const yb = floorY(l.lo) - FD + 6, yt = floorY(l.lo + 1) - FD + 2 - (b.outdoor ? -FD + 6 : 0);
      ctx.lineCap = 'round';
      for (const [col, w] of [[OL, 7], ['#8d939a', 4]]) {
        ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(l.x - 15, yb); ctx.lineTo(l.x - 15, yt - 20); ctx.moveTo(l.x + 15, yb); ctx.lineTo(l.x + 15, yt - 20); ctx.stroke();
      }
      for (let y = yb - 12; y > yt - 14; y -= 20) {
        ctx.strokeStyle = OL; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(l.x - 15, y); ctx.lineTo(l.x + 15, y); ctx.stroke();
        ctx.strokeStyle = '#71777e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(l.x - 15, y); ctx.lineTo(l.x + 15, y); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
  },
});
