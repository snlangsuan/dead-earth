// ---------- Quick slots (4-7), extraction points with countdown, bosses + key items, restricted zones ----------

// ===== key items: dropped by bosses, open a restricted zone once =====
const KEY_ITEMS = {
  key_military: { n: 'บัตรผ่านฐานทัพ', zone: 'คลังแสงทหาร', theme: 'military', icon: '🪪' },
  key_lab:      { n: 'คีย์การ์ดแล็บลับ', zone: 'ห้องแล็บลับใต้ดิน', theme: 'lab', icon: '💳' },
  key_police:   { n: 'กุญแจห้องเก็บของกลาง', zone: 'ห้องเก็บของกลางตำรวจ', theme: 'police', icon: '🗝️' },
};
for (const [id, k] of Object.entries(KEY_ITEMS)) ITEMS[id] = { n: k.n, t: 'key', icon: k.icon, sz: 1, gw: 1, gh: 1, st: 1, v: 0, tier: null, desc: `ใช้เข้า "${k.zone}" ได้ 1 ครั้ง (เลือกจากหน้าแผนที่โลก) — ต้องพากลับฐานให้รอด` };

const QUICK_DEFAULT = [null, null, null, null, null, null]; // players set these up themselves
const QUICK_KEYS = ['Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'];
const quickable = id => { const t = ITEMS[id] && ITEMS[id].t; return t === 'med' || t === 'food' || t === 'throw' || t === 'tool'; };

Object.assign(Run, {
  // ===== quick slots =====
  quickSlots() {
    if (!G.quick || !G.quickV2) { G.quick = QUICK_DEFAULT.slice(); G.quickV2 = true; }
    while (G.quick.length < QUICK_KEYS.length) G.quick.push(null);
    return G.quick;
  },
  useQuick(i) {
    const p = this.p, id = this.quickSlots()[i];
    if (!id) { this.popText(p.x, this.yOf(p) - 90, `ช่อง ${i + 4} ว่าง — ตั้งได้ในเป้ (Tab) หรือหน้าเตรียมตัว`, '#aaa'); return; }
    if (!Inv.count(p.backpack, id)) { this.popText(p.x, this.yOf(p) - 90, `${ITEMS[id].n} หมดแล้ว`, '#ff8a5c'); return; }
    const it = ITEMS[id];
    if (it.trap) { this.trapSel = TRAP_IDS.indexOf(id); this.placeTrap(); }
    else if (it.t === 'throw') this.throwNade(id);
    else this.useItem(id);
  },

  // ===== extraction =====
  initExits() {
    const map = this.map, lvl = Math.floor(this.d / 6);
    this.exits = [
      { x: map.streetR.x1 - 90, f: 0, room: map.streetR.id, n: 'ทางออกถนน', T: 10 + lvl, kind: 'road' },
      { x: (map.roof.x0 + map.roof.x1) / 2, f: map.roof.f, room: map.roof.id, n: 'ลานจอด ฮ. บนดาดฟ้า', T: 15 + lvl, kind: 'heli' },
    ];
    this.extract = null;
  },
  exitAt() {
    const p = this.p; if (p.climb || p.hidden) return null;
    return this.exits.find(e => e.f === p.f && Math.abs(e.x - p.x) < 70) || null;
  },
  updateExtract(dt) {
    this.checkKeyPickup();
    this.updateFieldRepair(dt);
    this.updateMed(dt);
    this.cleanBags();
    const ex = this.exitAt();
    if (!ex) {
      if (this.extract) { this.popText(this.p.x, this.yOf(this.p) - 120, 'ออกนอกจุดอพยพ — ยกเลิกนับถอยหลัง', '#ff8a5c'); this.extract = null; }
      return false;
    }
    const T = ex.T + Math.min(10, (this.level - 1) * 0.5); // waiting gets longer as the place heats up
    if (!this.extract || this.extract.ex !== ex) {
      this.extract = { ex, t: 0, T };
      toast(`📡 ${ex.n}: รอ ${Math.round(T)} วินาทีเพื่ออพยพ — ห้ามออกนอกพื้นที่`, 'warn');
      this.noise(ex.x, floorY(ex.f), 700); // the flare / radio call draws attention
    }
    this.extract.T = T;
    this.extract.t += dt;
    if (Math.floor(this.extract.t) !== Math.floor(this.extract.t - dt)) { Snd.lockTick && Snd.lockTick(true); if (Math.floor(this.extract.t) % 4 === 0) this.noise(ex.x, floorY(ex.f), 600); }
    if (this.extract.t >= T) { this.extract = null; this.endRun(true); return true; }
    return false;
  },

  // ===== bosses =====
  bossMax() {
    if (this.restricted) return 2;
    return this.lv >= 60 ? 3 : this.lv >= 36 ? 2 : 1;   // more bosses at once only on high-level locations
  },
  dropKey(z) {
    const owned = id => (G.keys && G.keys[id]) || Inv.count(this.p.backpack, id);
    const ids = Object.keys(KEY_ITEMS), pref = ids.filter(id => !owned(id));
    const id = U.pick(Math.random, pref.length ? pref : ids);
    this.dropBag(z.x, z.f, z.room, [{ id, q: 1 }]);
    toast(`🗝 บอสทิ้ง ${ITEMS[id].n}! พากลับฐานเพื่อเปิด "${KEY_ITEMS[id].zone}"`, 'good');
  },
});

Object.assign(R, {
  drawExits(run) {
    const ctx = this.ctx, t = run.time;
    for (const ex of run.exits || []) {
      const y = floorY(ex.f) - 2, active = run.extract && run.extract.ex === ex;
      ctx.save();
      ctx.strokeStyle = `rgba(120,255,160,${active ? 0.95 : 0.55 + 0.2 * Math.sin(t * 3)})`; ctx.setLineDash([10, 8]); ctx.lineWidth = active ? 3 : 2;
      ctx.beginPath(); ctx.ellipse(ex.x, y, 70, 9, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
  },
  drawExtractHUD(run) {
    const ctx = this.ctx, W = this.W, H = this.H, e = run.extract;
    if (!e) return;
    const left = Math.max(0, e.T - e.t), bw = 340, bx = W / 2 - bw / 2, by = H * 0.2;
    ctx.fillStyle = 'rgba(8,20,12,0.85)'; ctx.fillRect(bx - 14, by - 40, bw + 28, 70);
    ctx.strokeStyle = '#6dff9a'; ctx.lineWidth = 2; ctx.strokeRect(bx - 14, by - 40, bw + 28, 70);
    ctx.fillStyle = '#9dffb8'; ctx.font = '700 16px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`อพยพ ${left.toFixed(1)} วิ`, W / 2, by - 14);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bx, by, bw, 12);
    ctx.fillStyle = '#6dff9a'; ctx.fillRect(bx, by, bw * Math.min(1, e.t / e.T), 12);
  },
  drawQuickbar(run) {
    const ctx = this.ctx, p = run.p, slots = run.quickSlots(), S = 40, gap = 3;
    const x = this.W / 2 - (slots.length * (S + gap) - gap) / 2, y = this.H - 166;
    slots.forEach((id, i) => {
      const sx = x + i * (S + gap), n = id ? Inv.count(p.backpack, id) : 0;
      ctx.fillStyle = 'rgba(14,16,19,0.85)'; ctx.fillRect(sx, y, S, S + 14);
      ctx.strokeStyle = n ? 'rgba(242,176,30,0.7)' : 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5; ctx.strokeRect(sx + 0.5, y + 0.5, S - 1, S + 13);
      if (id) { ctx.globalAlpha = n ? 1 : 0.35; Art.draw(ctx, Art.iconArt(id), sx + 6, y + 4, S - 12, S - 12); ctx.globalAlpha = 1; }
      ctx.fillStyle = '#ffb34a'; ctx.font = '700 11px "Chakra Petch", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(String(i + 4), sx + 3, y + 11);
      ctx.fillStyle = n ? '#fff' : '#666'; ctx.textAlign = 'center'; ctx.fillText(id ? '×' + n : '-', sx + S / 2, y + S + 10);
    });
    if (slots.every(s => !s)) { ctx.fillStyle = 'rgba(255,211,122,0.75)'; ctx.font = '600 12px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ปุ่มลัดยังว่าง — กด Tab แล้วตั้งยา/อาหาร/ระเบิด/กับดักไว้ที่ปุ่ม 4–9', this.W / 2, y - 8); }
  },
});

// ===== quickbar editor (DOM): used in the in-run backpack and the base loadout =====
const QuickUI = {
  pick: null,
  // pool(): list of {id, n} the player can choose from · rerender(): redraw the host screen
  strip(pool, rerender) {
    const qs = Run.quickSlots();
    const wrap = U.el('div', { class: 'quickedit' });
    const head = U.el('div', { class: 'qhead', title: 'ลากยา/อาหาร/ระเบิดมาวาง · ลากออกเพื่อล้าง' }, U.el('b', null, '⚡ ปุ่มลัด'), U.el('span', { class: 'qkeys' }, 'กด 4–9'));
    head.addEventListener('contextmenu', ev => { ev.preventDefault(); GridUI.ctxMenu(ev, 'ปุ่มลัด', [['ล้างทั้งหมด', () => { G.quick = QUICK_KEYS.map(() => null); State.save(); rerender(); }, 'danger']]); });
    wrap.appendChild(head);
    const row = U.el('div', { class: 'qslots' });
    const counts = Object.fromEntries(pool().map(o => [o.id, o.n]));
    qs.forEach((id, i) => {
      const it = id && ITEMS[id], n = id ? (counts[id] || 0) : 0;
      const togglePick = () => { this.pick = this.pick === i ? null : i; rerender(); };
      const slot = U.el('div', { class: 'qslot' + (id ? '' : ' empty') + (n || !id ? '' : ' out') + (this.pick === i ? ' on' : ''), onclick: id ? null : togglePick },
        U.el('span', { class: 'qk' }, String(i + 4)),
        (() => { const q = U.el('span', { class: 'qi' }); if (it) q.innerHTML = Art.icon(id); else q.textContent = '＋'; return q; })(),
        U.el('span', { class: 'qn' }, it ? it.n : 'ว่าง'),
        U.el('span', { class: 'qc' }, it ? '×' + n : ''));
      if (id) {
        // drag a bound slot onto another slot to swap them, or off the bar to clear it
        GridUI.makeDraggable(slot, { from: 'quick', qi: i, entry: { id, q: 1 }, onNowhere: () => { qs[i] = null; State.save(); } }, togglePick);
        slot.addEventListener('contextmenu', ev => { ev.preventDefault(); GridUI.ctxMenu(ev, it.n, [['ข้อมูล', () => GridUI.showInfo({ id, q: n })], ['ล้างช่อง', () => { qs[i] = null; State.save(); rerender(); }, 'danger']]); });
      }
      GridUI.zone(slot, src => {
        if (src.from === 'quick') { if (src.qi !== i) { [qs[src.qi], qs[i]] = [qs[i], qs[src.qi]]; State.save(); } return true; }
        const e = src.entry;
        if (!e || !quickable(e.id)) { toast('ช่องลัดใส่ได้เฉพาะ ยา อาหาร ระเบิด และกับดัก', 'warn'); return false; }
        const j = qs.indexOf(e.id); if (j >= 0 && j !== i) qs[j] = qs[i]; // already bound elsewhere: swap
        qs[i] = e.id; State.save(); return false; // the item itself stays where it was
      });
      row.appendChild(slot);
    });
    wrap.appendChild(row);
    if (this.pick != null && this.pick < qs.length) {
      const i = this.pick, list = pool().filter(o => quickable(o.id));
      const pk = U.el('div', { class: 'qpicker' }, U.el('div', { class: 'hint' }, `เลือกไอเทมสำหรับปุ่ม ${i + 4}:`));
      if (!list.length) pk.appendChild(U.el('div', { class: 'hint' }, 'ยังไม่มียา อาหาร ระเบิด หรือกับดักเลย'));
      for (const o of list) {
        const bt = U.el('button', { class: 'btn small qpick' + (qs[i] === o.id ? ' primary' : ''), onclick: () => {
          const j = qs.indexOf(o.id); if (j >= 0 && j !== i) qs[j] = qs[i];
          qs[i] = o.id; this.pick = null; State.save(); rerender();
        } });
        bt.innerHTML = `<span class="qpi">${Art.icon(o.id)}</span>${ITEMS[o.id].n} ×${o.n}`;
        pk.appendChild(bt);
      }
      pk.appendChild(U.el('button', { class: 'btn small danger', onclick: () => { qs[i] = null; this.pick = null; State.save(); rerender(); } }, 'ล้างช่องนี้'));
      wrap.appendChild(pk);
    }
    return wrap;
  },
  poolFrom(...lists) {
    const m = {};
    for (const l of lists) for (const e of l) if (quickable(e.id)) m[e.id] = (m[e.id] || 0) + (e.q || 1);
    // always offer every usable item type the game knows, even at 0, so slots can be planned ahead
    for (const id in ITEMS) if (quickable(id) && !(id in m)) m[id] = 0;
    return Object.entries(m).sort((a, b) => (b[1] > 0) - (a[1] > 0) || ITEMS[a[0]].t.localeCompare(ITEMS[b[0]].t)).map(([id, n]) => ({ id, n }));
  },
};
