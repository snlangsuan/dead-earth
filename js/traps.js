// ---------- Field engineering: crafting explosives/traps in a run, placing traps, trap logic ----------
// Only characters with mods.engineer can craft in the field (C). Anyone can place traps (T) they carry.
const FIELD_RECIPES = [
  { id: 'pipebomb', q: 1, cost: { scrap: 2, chem: 1 }, t: 2.5 },
  { id: 'spiketrap', q: 1, cost: { nails: 4, plank: 1 }, t: 3 },
  { id: 'mine', q: 1, cost: { scrap: 2, chem: 2, nails: 2 }, t: 4 },
];
const TRAP_IDS = ['spiketrap', 'mine'];
const TRAP_MAX = 10;

Object.assign(Run, {
  canAfford(cost) { return Object.entries(cost).every(([id, n]) => Inv.count(this.p.backpack, id) >= n); },
  toggleCraft() {
    if (!this.p.mods.engineer) { this.popText(this.p.x, this.yOf(this.p) - 100, 'ต้องเป็นวิศวกรถึงจะประดิษฐ์กลางสนามได้', '#aaa'); return; }
    this.craftOpen = !this.craftOpen;
    Snd.ui && Snd.ui();
  },
  craftInput() {
    let used = false;
    ['Digit1', 'Digit2', 'Digit3'].forEach((c, i) => {
      if (!Input.hit(c)) return;
      used = true;
      const rc = FIELD_RECIPES[i], p = this.p;
      if (this.craft) return;
      if (!this.canAfford(rc.cost)) { this.popText(p.x, this.yOf(p) - 100, 'วัสดุไม่พอ', '#ff8a5c'); Snd.lockTick && Snd.lockTick(false); return; }
      this.craft = { rc, t: 0, T: rc.t };
      this.craftOpen = false;
    });
    return true; // while the menu is open the number keys belong to it
  },
  trapId() {
    const p = this.p, have = TRAP_IDS.filter(id => Inv.count(p.backpack, id));
    if (!have.length) return null;
    return have.includes(TRAP_IDS[this.trapSel]) ? TRAP_IDS[this.trapSel] : have[0];
  },
  cycleTrap() {
    this.trapSel = (this.trapSel + 1) % TRAP_IDS.length;
    const id = this.trapId(); if (id) this.popText(this.p.x, this.yOf(this.p) - 100, 'เลือก: ' + ITEMS[id].n, '#7fe3ff');
  },
  placeTrap() {
    const p = this.p;
    if (p.climb || p.hidden) return;
    const id = this.trapId();
    if (!id) { this.popText(p.x, this.yOf(p) - 100, 'ไม่มีกับดักชนิดนี้', '#ff8a5c'); return; }
    if (this.traps.filter(t => !t.dead).length >= TRAP_MAX) { this.popText(p.x, this.yOf(p) - 100, `วางได้สูงสุด ${TRAP_MAX} อัน`, '#ff8a5c'); return; }
    const x = p.x + p.facing * 26;
    if (this.traps.some(t => !t.dead && t.f === p.f && Math.abs(t.x - x) < 34)) { this.popText(p.x, this.yOf(p) - 100, 'ใกล้กับดักอื่นเกินไป', '#ff8a5c'); return; }
    Inv.remove(p.backpack, id, 1);
    const tr = p.mods.trap || 1, bl = p.mods.blast || 1;
    this.traps.push(id === 'mine'
      ? { type: 'mine', x, f: p.f, room: p.room, arm: 1.2, t: 0, r: 150 * bl, dmg: 260 * tr }
      : { type: 'spike', x, f: p.f, room: p.room, uses: Math.round(14 * tr), tick: 0, dmg: 16 * tr, t: 0 });
    Snd.hammer && Snd.hammer();
    this.popText(x, this.yOf(p) - 70, id === 'mine' ? 'วางทุ่นระเบิด (ติดอาวุธใน 1 วิ)' : 'วางกับดักตะปู', '#ffd76a');
  },
  updateTraps(dt) {
    const p = this.p;
    // crafting progress: stand still to work, moving cancels
    if (this.craft) {
      if (p.moving || p.climb) { this.craft = null; this.popText(p.x, this.yOf(p) - 100, 'ยกเลิกการประดิษฐ์', '#aaa'); }
      else {
        this.craft.t += dt;
        if (Math.floor(this.craft.t * 2.5) !== Math.floor((this.craft.t - dt) * 2.5)) { Snd.hammer && Snd.hammer(); this.noise(p.x, this.yOf(p), 160); }
        if (this.craft.t >= this.craft.T) {
          const rc = this.craft.rc; this.craft = null;
          if (this.canAfford(rc.cost)) {
            for (const [id, n] of Object.entries(rc.cost)) Inv.remove(p.backpack, id, n);
            const left = Inv.addToPack(p.backpack, { id: rc.id, q: rc.q }, p.grid);
            if (left) { this.dropBag(p.x, p.f, p.room, [{ id: rc.id, q: left }]); this.popText(p.x, this.yOf(p) - 130, 'เป้เต็ม วางไว้ที่พื้น', '#ffb36a'); }
            Snd.built && Snd.built();
            this.popText(p.x, this.yOf(p) - 110, `ได้ ${ITEMS[rc.id].n}!`, '#9dffb0');
          }
        }
      }
    }
    for (const t of this.traps) {
      if (t.dead) continue;
      t.t += dt;
      if (t.type === 'mine') {
        if (t.arm > 0) { t.arm -= dt; continue; }
        if (t.chain != null) { t.chain -= dt; if (t.chain <= 0) this.detonate(t); continue; }
        for (const z of this.zombies) if (!z.dead && z.f === t.f && !z.climb && Math.abs(z.x - t.x) < 22 + z.rad * 0.5) { this.detonate(t); break; }
      } else {
        t.tick -= dt;
        let any = false;
        for (const z of this.zombies) {
          if (z.dead || z.f !== t.f || z.climb || Math.abs(z.x - t.x) > 28) continue;
          any = true; z.slowT = 0.5;
          if (t.tick <= 0) { this.damageZombie(z, t.dmg * (z.Z.boss ? 0.5 : 1), 0); this.blood(z.x, this.yOf(z) - 8, 3); }
        }
        if (any && t.tick <= 0) {
          t.tick = 0.5; t.uses--; Snd.woodHit && Snd.woodHit(t.x, t.f, true);
          if (t.uses <= 0) { t.dead = true; this.popText(t.x, floorY(t.f) - 40, 'กับดักพัง', '#aaa'); }
        }
      }
    }
    this.traps = this.traps.filter(t => !t.dead);
  },
  detonate(t) {
    if (t.dead) return;
    t.dead = true;
    this.explode({ x: t.x, y: floorY(t.f) - 10, f: t.f, r: t.r, dmg: t.dmg, src: t });
  },
});

Object.assign(R, {
  drawTraps(run) {
    const ctx = this.ctx;
    for (const t of run.traps || []) {
      const y = floorY(t.f) - 2;
      ctx.save(); ctx.translate(t.x, y);
      if (t.type === 'mine') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 1, 17, 4, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#4b5236'; ctx.strokeStyle = '#1a1c14'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, -4, 15, 6, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#6a7350'; ctx.beginPath(); ctx.ellipse(0, -7, 9, 3.5, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#8a8f96'; ctx.fillRect(-2, -12, 4, 4);
        const armed = t.arm <= 0, blink = armed ? Math.floor(run.time * 3) % 2 : Math.floor(run.time * 10) % 2;
        if (blink || t.chain != null) { ctx.fillStyle = armed ? '#ff3b2f' : '#ffd23f'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(7, -8, 2.2, 0, 7); ctx.fill(); }
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 1, 26, 4, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#8a6238'; ctx.strokeStyle = '#2a1c10'; ctx.lineWidth = 1.6;
        ctx.fillRect(-24, -6, 48, 6); ctx.strokeRect(-24, -6, 48, 6);
        ctx.strokeStyle = '#c9ced3'; ctx.lineWidth = 1.6;
        for (let i = -20; i <= 20; i += 5) { ctx.beginPath(); ctx.moveTo(i, -6); ctx.lineTo(i + (i % 2 ? 1.5 : -1.5), -13); ctx.stroke(); }
        if (t.uses <= 4) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-24, -6, 48, 6); }
      }
      ctx.restore();
    }
  },
  drawCraftUI(run) {
    const ctx = this.ctx, W = this.W, H = this.H, p = run.p;
    if (run.medJob) {
      const j = run.medJob, bw = 220, bx = W / 2 - bw / 2, by = H * 0.6;
      ctx.fillStyle = 'rgba(10,12,14,0.8)'; ctx.fillRect(bx - 12, by - 30, bw + 24, 52);
      ctx.fillStyle = '#fff'; ctx.font = '600 14px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`ใช้${ITEMS[j.id].n}`, W / 2, by - 10);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bx, by, bw, 8); ctx.fillStyle = '#6fff8f'; ctx.fillRect(bx, by, bw * Math.min(1, j.t / j.T), 8);
    }
    if (run.repairJob) {
      const j = run.repairJob, bw = 240, bx = W / 2 - bw / 2, by = H * 0.6;
      ctx.fillStyle = 'rgba(10,12,14,0.8)'; ctx.fillRect(bx - 12, by - 30, bw + 24, 52);
      ctx.fillStyle = '#fff'; ctx.font = '600 14px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`ซ่อม${ITEMS[j.w.id].n}`, W / 2, by - 10);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bx, by, bw, 8); ctx.fillStyle = '#7fe08a'; ctx.fillRect(bx, by, bw * Math.min(1, j.t / j.T), 8);
    }
    if (run.craft) {
      const c = run.craft, bw = 220, bx = W / 2 - bw / 2, by = H * 0.6;
      ctx.fillStyle = 'rgba(10,12,14,0.8)'; ctx.fillRect(bx - 12, by - 30, bw + 24, 52);
      ctx.fillStyle = '#fff'; ctx.font = '600 14px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`ประดิษฐ์${ITEMS[c.rc.id].n}`, W / 2, by - 10);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bx, by, bw, 8); ctx.fillStyle = '#ffb34a'; ctx.fillRect(bx, by, bw * Math.min(1, c.t / c.T), 8);
    }
    if (!run.craftOpen) return;
    const pw = 460, ph = 74 + FIELD_RECIPES.length * 58, px = W / 2 - pw / 2, py = H * 0.5 - ph / 2;
    ctx.fillStyle = 'rgba(12,14,16,0.92)'; ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#ffb34a'; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffb34a'; ctx.font = '700 18px "Black Ops One", "Chakra Petch", Kanit, sans-serif';
    ctx.fillText('ประดิษฐ์ภาคสนาม', px + 18, py + 32);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '400 12px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('กด 1-3 เพื่อสร้าง · C/Esc ปิด', px + pw - 16, py + 30);
    FIELD_RECIPES.forEach((rc, i) => {
      const y = py + 52 + i * 58, ok = run.canAfford(rc.cost), it = ITEMS[rc.id];
      ctx.fillStyle = ok ? 'rgba(255,179,74,0.10)' : 'rgba(255,255,255,0.04)'; ctx.fillRect(px + 12, y, pw - 24, 50);
      ctx.globalAlpha = ok ? 1 : 0.45;
      Art.draw(ctx, Art.iconArt(rc.id), px + 22, y + 7, 36, 36);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '700 15px "Chakra Petch", Kanit, sans-serif';
      ctx.fillText(`${i + 1}. ${it.n}`, px + 68, y + 21);
      ctx.font = '400 12px "Chakra Petch", Kanit, sans-serif';
      ctx.fillText(Object.entries(rc.cost).map(([id, n]) => `${ITEMS[id].n} ${Inv.count(p.backpack, id)}/${n}`).join('  ·  '), px + 68, y + 40);
      ctx.textAlign = 'right'; ctx.fillStyle = '#aaa'; ctx.fillText(`${rc.t} วิ · มี ${Inv.count(p.backpack, rc.id)}`, px + pw - 22, y + 21);
      ctx.globalAlpha = 1;
    });
  },
});
