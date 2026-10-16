// ---------- Worn gear with pockets (shirt, trousers, body armor, backpack) + carry weight — SCUM-style ----------
// Everything you wear brings its own little grid. All of them live in ONE list (G.backpack / Run.p.backpack) laid out
// in one virtual grid made of separate regions — so every existing Inv.count / Inv.remove / addToPack call keeps
// working, and an item can never straddle two pockets (Inv.fits checks the region).
// Armor soaks the hits. Once it is gone (or not worn), every hit also wears the shirt, trousers and backpack a little
// (0–2% each). The more damaged a piece is, the more of its pocket cells are torn (unusable, counted from the end of
// the pocket). Whatever sat in a torn cell moves to free space elsewhere, or drops to the floor. Armor pockets tear
// with the armor's points (0% armor = no pockets).
// Taking a piece off empties its pockets (into the stash at base, onto the ground / open box in a run).
Object.assign(ITEMS, {
  top_tee:     { n: 'เสื้อยืด',        t: 'cloth', slot: 'top',    grid: [2, 1], gw: 2, gh: 2, sz: 4, st: 1, v: 30,   tier: 0,    wt: 0.2, desc: 'กระเป๋าหน้าอก 2×1' },
  top_hoodie:  { n: 'เสื้อฮู้ด',        t: 'cloth', slot: 'top',    grid: [2, 2], gw: 2, gh: 2, sz: 4, st: 1, v: 140,  tier: 0,    wt: 0.6, desc: 'กระเป๋าหน้าท้อง 2×2' },
  top_field:   { n: 'แจ็กเก็ตสนาม',    t: 'cloth', slot: 'top',    grid: [3, 2], gw: 2, gh: 2, sz: 4, st: 1, v: 560,  tier: 1,    wt: 1.0, desc: 'กระเป๋าหลายช่อง 3×2' },
  top_tac:     { n: 'เสื้อยุทธวิธี',    t: 'cloth', slot: 'top',    grid: [4, 2], gw: 2, gh: 2, sz: 4, st: 1, v: 1500, tier: null, wt: 1.3, desc: 'ซองใส่ของรอบตัว 4×2 — หาได้ในด่าน' },
  pants_jeans: { n: 'กางเกงยีนส์',     t: 'cloth', slot: 'bottom', grid: [2, 1], gw: 2, gh: 2, sz: 4, st: 1, v: 40,   tier: 0,    wt: 0.7, desc: 'กระเป๋ากางเกง 2×1' },
  pants_cargo: { n: 'กางเกงคาร์โก้',   t: 'cloth', slot: 'bottom', grid: [2, 2], gw: 2, gh: 2, sz: 4, st: 1, v: 300,  tier: 1,    wt: 0.8, desc: 'กระเป๋าข้างขา 2×2' },
  pants_tac:   { n: 'กางเกงยุทธวิธี',  t: 'cloth', slot: 'bottom', grid: [3, 2], gw: 2, gh: 2, sz: 4, st: 1, v: 1100, tier: 2,    wt: 1.0, desc: 'กระเป๋าใหญ่ 3×2' },
});
TYPE_LABEL.cloth = 'เสื้อผ้า';
// drawn stand-ins until the generated pictures (assets/gen_gemini.py --only wear) exist
{
  const shirt = (c, pk) => `<path d="M13 5 L7 8 L2 16 L7 19 L9 16 V36 H31 V16 L33 19 L38 16 L33 8 L27 5 Q20 10 13 5Z" ${Art.st(c)}/>` + pk;
  const pants = (c, pk) => `<path d="M9 4 H31 L34 37 H23 L20 15 L17 37 H6Z" ${Art.st(c)}/><path d="M9 8 H31" stroke="${OL}" stroke-width="1.4"/>` + pk;
  const pocket = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="rgba(0,0,0,.18)" stroke="${OL}" stroke-width="1"/>`;
  Object.assign(ICON_ART, {
    top_tee: shirt('#9aa0a6', pocket(23, 13, 5, 5)),
    top_hoodie: shirt('#34405a', `<path d="M14 6 Q20 15 26 6" fill="none" stroke="${OL}" stroke-width="1.6"/>` + pocket(13, 24, 14, 7)),
    top_field: shirt('#5f6b3e', pocket(12, 12, 6, 6) + pocket(22, 12, 6, 6) + pocket(11, 25, 7, 7) + pocket(22, 25, 7, 7)),
    top_tac: shirt('#2c3034', pocket(11, 13, 4, 7) + pocket(16, 13, 4, 7) + pocket(21, 13, 4, 7) + pocket(26, 13, 4, 7) + pocket(13, 25, 14, 6)),
    pants_jeans: pants('#4a6a92', pocket(10, 9, 5, 4) + pocket(25, 9, 5, 4)),
    pants_cargo: pants('#a89466', pocket(7, 18, 6, 7) + pocket(27, 18, 6, 7)),
    pants_tac: pants('#4a4e54', pocket(7, 16, 7, 8) + pocket(26, 16, 7, 8) + `<rect x="7" y="27" width="7" height="4" fill="#2a2e33"/><rect x="25" y="27" width="7" height="4" fill="#2a2e33"/>`),
  });
}
// body armor pockets
ITEMS.armor_jacket.grid = [2, 1]; ITEMS.armor_vest.grid = [3, 1]; ITEMS.armor_riot.grid = [2, 1];
LOOT.wardrobe.push(['top_hoodie', 5, 1, 1], ['top_tee', 4, 1, 1], ['pants_jeans', 4, 1, 1], ['pants_cargo', 2, 1, 1], ['top_field', 1, 1, 1]);
LOOT.locker.push(['top_field', 2, 1, 1], ['pants_cargo', 3, 1, 1], ['pants_tac', 1, 1, 1]);
LOOT.weapons.push(['top_tac', 1.5, 1, 1], ['pants_tac', 2, 1, 1]);

const WEAR_SLOTS = ['top', 'bottom'];
const WEAR_LABEL = { top: 'เสื้อ', bottom: 'กางเกง', armor: 'เกราะ', pack: 'เป้' };
const KG_OK = 22, KG_MAX = 40;   // carry freely up to KG_OK; slower and thirstier for stamina up to KG_MAX; no sprinting past it

const Wear = {
  // ---- weight ----
  wt(id) {
    const it = ITEMS[id]; if (!it) return 0; if (it.wt != null) return it.wt;
    switch (it.t) {
      case 'weapon': return it.cls === 'melee' ? 1.1 : it.cls === 'pistol' ? 0.9 : 3.4;
      case 'ammo': return 0.015;
      case 'armor': return 1 + (it.ap || 0) / 60;
      case 'bag': return 0.6 + ((it.grid || [4, 4])[0] * (it.grid || [4, 4])[1]) * 0.04;
      case 'throw': return 0.45;
      case 'food': return 0.4;
      case 'med': return 0.15;
      case 'tool': return 0.5;
      case 'key': case 'blueprint': case 'cash': return 0.02;
      case 'attach': return 0.25;
      default: return 0.15 * (it.sz || 1);
    }
  },
  entryKg(e) { if (!e) return 0; let k = Wear.wt(e.id) * (e.q || 1); if (e.att) for (const a of Object.values(e.att)) if (a) k += Wear.wt(a); return k; },
  // H = G (at base) or Run.p (in a run)
  kg(H) {
    let k = 0;
    for (const e of H.backpack || []) k += Wear.entryKg(e);
    for (const w of H.weapons || []) k += Wear.entryKg(w);
    k += Wear.entryKg(H.armor);
    for (const s of WEAR_SLOTS) k += Wear.entryKg(H.wear && H.wear[s]);
    k += Wear.wt(H.bag || 'pack_day');
    return Math.round(k * 10) / 10;
  },
  load(kg) { return U.clamp((kg - KG_OK) / (KG_MAX - KG_OK), 0, 1); },   // 0 = free, 1 = at the limit

  // ---- condition (0..100) of clothing and backpacks (e.dur); armor has its own points and never tears ----
  wears(it) { return it.t === 'cloth' || it.t === 'bag'; },
  cond(e) {
    if (!e) return 100; const it = ITEMS[e.id];
    if (it.t === 'armor') { const mx = armorMax(e.id); return mx ? armorAP(e) / mx * 100 : 100; }   // armor pockets wear with its points
    return Wear.wears(it) ? Math.max(0, e.dur ?? 100) : 100;
  },
  // torn pocket cells for a piece in this condition
  torn(e, area) { return Math.min(area, Math.floor(area * (1 - Wear.cond(e) / 100) + 1e-6)); },
  // ---- repairs: the first 5 bring a piece back to 100%; after that every repair lowers its ceiling (gmax).
  // A tailor at base (ช่างตัดเย็บ) makes the loss small most of the time; at 0% ceiling it can't be repaired any more.
  REP_FREE: 5,
  fixable(e) { const it = e && ITEMS[e.id]; return !!it && (Wear.wears(it) || it.t === 'armor'); },
  capOf(e) { return Math.max(0, e.gmax ?? 100); },
  reps(e) { return e.grep || 0; },
  skilled() { return !!(G.roles && G.roles.tailor); },
  // ceiling lost by the next repair (0 while still within the free repairs)
  nextLoss(e, sk = Wear.skilled()) {
    if (Wear.reps(e) < Wear.REP_FREE) return [0, 0];
    return sk ? [1, 6] : [8, 12];
  },
  // kit uses one repair takes: cheap pieces 1, mid 2, top gear 3 (by value; ITEMS[id].fixU overrides)
  kitUses(e) { const it = ITEMS[e.id]; return it.fixU || (it.v < 300 ? 1 : it.v < 1500 ? 2 : 3); },
  // total uses left in a list (or one stack) of a multi-use kit
  usesIn(list, id) { const U = ITEMS[id].uses || 1; return (Array.isArray(list) ? list : [list]).filter(e => e && e.id === id).reduce((s, e) => s + (e.u ?? U) + (e.q - 1) * U, 0); },
  needsFix(e) { return Wear.capOf(e) > 0 && Wear.cond(e) < Wear.capOf(e) - 0.5; },
  why(e) { return Wear.capOf(e) <= 0 ? `${ITEMS[e.id].n} ขาดเกินซ่อมแล้ว` : `${ITEMS[e.id].n} ยังดีอยู่ (ซ่อมได้สูงสุด ${Math.round(Wear.capOf(e))}%)`; },
  // repair e by amt (% points, null = to the ceiling); slot 'pack' with the worn-bag stand-in writes back to H
  fix(H, slot, e, amt) {
    if (!Wear.needsFix(e)) return null;
    const sk = Wear.skilled(), rep = Wear.reps(e) + 1;
    let cap = Wear.capOf(e), lost = 0;
    if (rep > Wear.REP_FREE) { lost = sk ? (Math.random() < 0.65 ? U.ri(Math.random, 1, 3) : U.ri(Math.random, 4, 6)) : U.ri(Math.random, 8, 12); cap = Math.max(0, cap - lost); }
    const v = Math.max(Wear.cond(e), amt == null ? cap : Math.min(cap, Wear.cond(e) + amt));
    e.grep = rep; e.gmax = cap;
    if (ITEMS[e.id].t === 'armor') e.ap = Math.round(armorMax(e.id) * v / 100); else e.dur = v;
    if (slot === 'pack' && H) { H.bagDur = e.dur; H.bagMax = e.gmax; H.bagRep = e.grep; }
    return { v, cap, lost, rep };
  },
  fixMsg(e, r) { return `${ITEMS[e.id].n} → ${Math.ceil(r.v)}%` + (r.lost ? ` · เพดานลดเหลือ ${Math.round(r.cap)}%` : r.rep <= Wear.REP_FREE ? ` · ซ่อมเต็มได้อีก ${Wear.REP_FREE - r.rep} ครั้ง` : ''); },
  repairCost(e) { const it = ITEMS[e.id], miss = Wear.capOf(e) - Wear.cond(e); if (!Wear.wears(it) || miss < 1) return null; return { cloth: Math.max(1, Math.ceil(miss / 34)), money: Math.ceil(it.v * 0.25 * miss / 100) }; },

  // ---- layout: one virtual grid made of stacked regions ----
  // every slot owns a fixed band of rows, so putting on / taking off one piece never moves what is in the others
  BAND: { top: [0, 2], bottom: [2, 2], armor: [4, 1], pack: [5, 99] },
  layout(H, charId) {
    const regs = []; let c = 1, r = 0;
    const add = (k, gd, e) => {
      if (!gd || !gd[0] || !gd[1]) return;
      const [y, mx] = Wear.BAND[k], rr = Math.min(gd[1], mx);
      const area = gd[0] * rr, torn = e ? Wear.torn(e, area) : 0;
      // how far the next cell is towards tearing (0..1), shown as a creeping red tint
      const wf = e && torn < area ? U.clamp(area * (1 - Wear.cond(e) / 100) - torn, 0, 1) : 0;
      regs.push({ k, x: 0, y, c: gd[0], r: rr, torn, wf });
      c = Math.max(c, gd[0]); r = Math.max(r, y + rr);
    };
    for (const s of WEAR_SLOTS) { const e = H.wear && H.wear[s]; add(s, e && ITEMS[e.id].grid, e); }
    add('armor', H.armor && ITEMS[H.armor.id].grid, H.armor);
    const pg = State.gridFor(H.bag || 'pack_day', charId); add('pack', [pg.c, pg.r], Wear.get(H, 'pack'));
    return { c, r, regs, fill: ['pack', 'armor', 'top', 'bottom'] };
  },
  regionAt(g, x, y) { return g.regs && g.regs.find(q => x >= q.x && y >= q.y && x < q.x + q.c && y < q.y + q.r); },
  inReg(e, R) { return e.gx != null && e.gx >= R.x && e.gy >= R.y && e.gx < R.x + R.c && e.gy < R.y + R.r; },
  isTorn(R, x, y) { return R.torn > 0 && (y - R.y) * R.c + (x - R.x) >= R.c * R.r - R.torn; },
  area(g) { return g.regs ? g.regs.reduce((s, q) => s + q.c * q.r - (q.torn || 0), 0) : g.c * g.r; },
  // after the layout changed, keep every item in the same pocket at the same spot; what no longer fits is returned
  relayout(list, oldG, newG) {
    const spill = [];
    for (const e of list.slice()) {
      const R = oldG.regs ? Wear.regionAt(oldG, e.gx, e.gy) : null, N = R && newG.regs.find(q => q.k === R.k);
      if (!N) { spill.push(e); list.splice(list.indexOf(e), 1); continue; }
      e.gx = N.x + (e.gx - R.x); e.gy = N.y + (e.gy - R.y);
    }
    for (const e of list.slice()) if (!Inv.fits(list, newG, e, e.gx, e.gy, e.rot, e)) { list.splice(list.indexOf(e), 1); spill.push(e); }
    const out = [];
    for (const e of spill) { delete e.gx; delete e.gy; e.rot = 0; if (!Inv.place(list, newG, e)) out.push(e); }
    return out;
  },
  slotOf(it) { return it.t === 'cloth' ? it.slot : it.t === 'armor' ? 'armor' : it.t === 'bag' ? 'pack' : null; },
  get(H, slot) { return slot === 'armor' ? H.armor : slot === 'pack' ? { id: H.bag || 'pack_day', q: 1, dur: H.bagDur ?? 100, ...(H.bagMax != null ? { gmax: H.bagMax } : {}), ...(H.bagRep ? { grep: H.bagRep } : {}) } : H.wear && H.wear[slot]; },
  // put entry on (null = take off). Returns { old, out }: the item taken off and the items that fell out of pockets.
  put(H, slot, entry) {
    if (!H.wear) H.wear = { top: null, bottom: null };
    const oldG = Wear.layout(H), R = oldG.regs.find(q => q.k === slot);
    const fell = R ? H.backpack.filter(e => Wear.inReg(e, R)) : [];
    for (const e of fell) { H.backpack.splice(H.backpack.indexOf(e), 1); delete e.gx; delete e.gy; delete e.rot; }
    let old = null;
    if (slot === 'armor') { old = H.armor || null; H.armor = entry; if (entry && entry.ap == null) entry.ap = armorMax(entry.id); }
    else if (slot === 'pack') { old = Wear.get(H, 'pack'); H.bag = entry.id; H.bagDur = entry.dur ?? 100; H.bagMax = entry.gmax; H.bagRep = entry.grep; }
    else { old = H.wear[slot] || null; H.wear[slot] = entry; if (entry && entry.dur == null) entry.dur = 100; }
    if (entry) { delete entry.gx; delete entry.gy; delete entry.rot; }
    const newG = Wear.layout(H), out = Wear.relayout(H.backpack, oldG, newG);
    // what was in the old pockets moves into the new ones where it fits
    for (const e of fell) { const left = Inv.addToPack(H.backpack, e, newG); if (left) out.push(left === e.q ? e : { ...e, q: left }); }
    if (H === Run.p) { H.grid = newG; H.cap = Wear.area(newG); }
    return { old, out };
  },
  // the layout changed in place (damage, repair): rebuild it, returns the items that no longer have a place
  refit(H) {
    const g = Wear.layout(H), out = [];
    for (const e of H.backpack.slice()) if (!Inv.fits(H.backpack, g, e, e.gx, e.gy, e.rot, e)) { H.backpack.splice(H.backpack.indexOf(e), 1); out.push(e); }
    const lost = [];
    for (const e of out) { delete e.gx; delete e.gy; e.rot = 0; if (!Inv.place(H.backpack, g, e)) lost.push(e); }
    if (H === Run.p) { H.grid = g; H.cap = Wear.area(g); }
    return lost;
  },
  starter() { return { top: { id: 'top_tee', q: 1, dur: 100 }, bottom: { id: 'pants_jeans', q: 1, dur: 100 } }; },
};

// Inv understands region grids (and torn cells)
(function () {
  const _fits = Inv.fits;
  Inv.fits = function (list, g, e, x, y, rot, ignore) {
    if (!g.regs) return _fits.call(this, list, g, e, x, y, rot, ignore);
    const it = ITEMS[e.id], w = rot ? it.gh : it.gw, h = rot ? it.gw : it.gh;
    const R = Wear.regionAt(g, x, y); if (!R || x + w > R.x + R.c || y + h > R.y + R.r) return false;
    if (R.torn) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (Wear.isTorn(R, xx, yy)) return false;
    return _fits.call(this, list, g, e, x, y, rot, ignore);
  };
  // fill the backpack first, then armor and clothing pockets
  const _find = Inv.findSpot;
  Inv.findSpot = function (list, g, e) {
    if (!g.regs) return _find.call(this, list, g, e);
    const it = ITEMS[e.id];
    for (const k of g.fill || g.regs.map(q => q.k)) {
      const R = g.regs.find(q => q.k === k); if (!R) continue;
      for (const rot of (it.gw === it.gh ? [0] : [0, 1]))
        for (let y = R.y; y < R.y + R.r; y++) for (let x = R.x; x < R.x + R.c; x++)
          if (Inv.fits(list, g, e, x, y, rot)) return { x, y, rot };
    }
    return null;
  };
  // clothing never stacks (each piece has its own condition)
  const _make = Inv.make;
  Inv.make = function (id, q) { return ITEMS[id] && ITEMS[id].t === 'cloth' ? { id, q: 1, dur: 100 } : _make.call(this, id, q); };
  const _free = Inv.addFree;
  Inv.addFree = function (list, entry) {
    if (ITEMS[entry.id] && (ITEMS[entry.id].t === 'cloth' || (ITEMS[entry.id].t === 'bag' && (entry.dur ?? 100) < 100))) { delete entry.gx; delete entry.gy; delete entry.rot; if (entry.dur == null) entry.dur = 100; list.push(entry); return; }
    return _free.call(this, list, entry);
  };
  State.grid = function () { return Wear.layout(G); };
  State.cap = function () { return Wear.area(State.grid()); };

  // saves: rows moved when the pocket bands were added — shift old saves once
  const _new = State.newGame;
  State.newGame = function (...a) { const r = _new.apply(this, a); G.wear = Wear.starter(); G.invV3 = true; State.save(); return r; };
  const _load = State.load;
  State.load = function (...a) {
    const r = _load.apply(this, a);
    if (r && G && !G.invV3) {
      const dy = G.invV2 ? Wear.BAND.armor[0] : Wear.BAND.pack[0];   // v2 had armor at row 0 and the pack from row 1
      for (const e of G.backpack) if (e.gy != null) e.gy += dy;
      G.invV3 = true; if (!G.wear) G.wear = Wear.starter();
      if (!Inv.valid(G.backpack, State.grid())) { const out = Inv.reflow(G.backpack, State.grid()); for (const e of out) Inv.addFree(G.stash, e); }
      State.save();
    }
    return r;
  };

  // runs carry the clothes; they survive death like weapons and armor
  const _start = Run.start;
  Run.start = function (...a) {
    const r = _start.apply(this, a);
    if (this.p) { this.p.wear = JSON.parse(JSON.stringify(G.wear || Wear.starter())); this.p.bagDur = G.bagDur ?? 100; this.p.bagMax = G.bagMax; this.p.bagRep = G.bagRep; this.p.grid = Wear.layout(this.p); this.p.cap = Wear.area(this.p.grid); this.p.kg = Wear.kg(this.p); this.armorSpeed(); }
    return r;
  };
  for (const k of ['die', 'endRun']) { const f = Run[k]; Run[k] = function (...a) { if (this.p && !this.over && this.p.wear) { G.wear = this.p.wear; G.bagDur = this.p.bagDur; G.bagMax = this.p.bagMax; G.bagRep = this.p.bagRep; } return f.apply(this, a); }; }

  // getting hit tears clothes (and armor losing points tears its pockets); torn cells push items out
  const _hurt = Run.hurt;
  Run.hurt = function (dmg, silent, ...a) {
    const p = this.p, r = _hurt.call(this, dmg, silent, ...a);
    if (!p || silent || !(dmg > 0) || this.over) return r;
    // armor still standing (it took this hit) = clothes untouched; otherwise each piece loses 0–2%
    const armorHeld = p.armor && armorAP(p.armor) > 0 && this.armorBlocked !== false;
    if (!armorHeld) {
      const tear = d => Math.max(0, (d ?? 100) - U.rf(Math.random, 0, 2));
      for (const s of WEAR_SLOTS) { const e = p.wear && p.wear[s]; if (e) e.dur = tear(e.dur); }
      p.bagDur = tear(p.bagDur);
    }
    // (the armor itself just lost points, so its pockets may tear too)
    const before = p.grid.regs.map(q => q.torn || 0).join(), g = Wear.layout(p);
    if (g.regs.map(q => q.torn || 0).join() !== before) {
      const lost = Wear.refit(p);
      if (lost.length) {
        Run.dropBag(p.x, p.f, p.room, lost);
        this.popText(p.x, this.yOf(p) - 120, 'กระเป๋าขาด ของหล่น!', '#ff8a5c');
        toast(`กระเป๋าขาด — ${lost.map(e => ITEMS[e.id].n).join(', ')} หล่นลงพื้น`, 'warn');
      }
      if (typeof UIRun !== 'undefined' && (Run.panel === 'inv' || Run.panel === 'loot')) UIRun.render();
    }
    return r;
  };

  // carry weight slows you down
  const _spd = Run.armorSpeed;
  Run.armorSpeed = function () {
    _spd.call(this);
    const p = this.p; if (!p) return;
    p.kg = Wear.kg(p); const L = Wear.load(p.kg);
    p.spd *= 1 - 0.3 * L; p.kgStam = 1 + L; p.overKg = p.kg >= KG_MAX;
  };
  const _upd = Run.update;
  Run.update = function (dt, ...a) {
    const r = _upd.call(this, dt, ...a);
    if (this.active && this.p && (this._kgT = (this._kgT || 0) - dt) <= 0) { this._kgT = 0.4; this.armorSpeed(); }
    return r;
  };

  // swapping backpacks in the field: only the backpack's own pocket empties (the old bag + its contents drop)
  Run.equipBag = function (entry, list) {
    const p = this.p;
    if (list) { const i = list.indexOf(entry); if (i >= 0) { if (entry.q > 1) entry.q--; else list.splice(i, 1); } }
    const { old, out } = Wear.put(p, 'pack', { id: entry.id, q: 1, dur: entry.dur ?? 100 });
    const pile = { kind: 'bag', x: p.x - p.facing * 18, w: 40, h: 26, loot: null, room: p.room, searched: true, prog: 1, items: [...out, old], id: 'ob' + Math.random(), oldBag: true };
    const rm = roomAt(this.map, p.f, pile.x) || this.map.rooms[p.room];
    pile.x = U.clamp(pile.x, rm.x0 + WALL / 2 + 22, rm.x1 - WALL / 2 - 22); pile.room = rm.id;
    rm.furn.push(pile);
    Snd.pickup && Snd.pickup(); this.armorSpeed();
    toast(`สวม${ITEMS[entry.id].n}แล้ว` + (out.length ? ' — ของที่ไม่พอที่วางอยู่ที่พื้นกับเป้เก่า' : ''), 'good');
    return pile;
  };

  // HUD: a weight warning above the vitals when heavy
  const _hud = R.drawHUD;
  R.drawHUD = function (run, ...a) {
    const r = _hud.call(this, run, ...a);
    const p = run.p; if (!p || p.kg == null || p.kg < KG_OK) return r;
    const ctx = this.ctx, H = this.H, over = p.kg >= KG_MAX;
    ctx.save(); ctx.font = '600 12px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = over ? '#ff6a4a' : '#f2b01e';
    ctx.fillText(`${over ? 'หนักเกิน — วิ่งไม่ได้' : 'แบกหนัก'} ${p.kg.toFixed(1)}/${KG_MAX} kg`, 18, H - 140);
    ctx.restore();
    return r;
  };
})();

// ---------- Field repairs (in a location) ----------
// sewing kit (1 use) + cloth: clothes / trousers / bag +30%, armor +30% · 3 s, quiet
// weapon repair kit (1 use) + 2 scrap: armor +40% · 4 s, noisy (hammering)
// Moving, climbing or getting hit cancels; nothing is used until it finishes. Every repair counts toward the 5 free ones.
ITEMS.sewkit = { n: 'ชุดเย็บผ้า', t: 'tool', icon: '🪡', sz: 1, st: 5, v: 160, tier: 0, uses: 3,
  gw: 1, gh: 1, desc: 'ใช้ได้ 3 ครั้ง · ลากใส่เสื้อ กางเกง กระเป๋า หรือเกราะ (ที่สวมอยู่ หรือในเป้/คลัง) · ของถูกใช้ 1 ครั้ง ของดีขึ้นใช้ 2–3 ครั้งต่อการซ่อม · ในด่าน: + ผ้า 1 (เกราะ ผ้า 2) → +30% ยืนนิ่ง 3 วิ เสียงเบา · ที่ฐาน: +30% ไม่ต้องใช้ผ้า' };
LOOT.wardrobe.push(['sewkit', 6, 1, 1]); LOOT.locker.push(['sewkit', 3, 1, 1]); LOOT.supply.push(['sewkit', 4, 1, 1]); LOOT.crate.push(['sewkit', 2, 1, 1]);
Object.assign(Run, {
  GEAR_FIX: {
    sew: { cost: { sewkit: 1, cloth: 1 }, amt: 30, T: 3, quiet: true },
    sewArmor: { cost: { sewkit: 1, cloth: 2 }, amt: 30, T: 3, quiet: true },
    kitArmor: { cost: { repairkit: 1, scrap: 2 }, amt: 40, T: 4, quiet: false },
  },
  gearCost(e, k) { const c = { ...this.GEAR_FIX[k].cost }; for (const id in c) if (ITEMS[id].uses) c[id] = Wear.kitUses(e); return c; },
  fixKind(e, kit) { const armor = ITEMS[e.id].t === 'armor'; return !armor ? (kit === 'repairkit' ? null : 'sew') : kit === 'sewkit' ? 'sewArmor' : kit === 'repairkit' ? 'kitArmor' : (Inv.count(this.p.backpack, 'repairkit') ? 'kitArmor' : 'sewArmor'); },
  // the worn piece that needs it most (for using a sewing kit from the quick bar)
  worstGear() {
    let best = null, bc = 101;
    for (const s of [...WEAR_SLOTS, 'pack', 'armor']) { const e = Wear.get(this.p, s); if (e && Wear.needsFix(e) && Wear.cond(e) < bc) { bc = Wear.cond(e); best = s; } }
    return best;
  },
  startGearRepair(slot, entry, kit) {
    const p = this.p, say = (t, c) => { this.popText(p.x, this.yOf(p) - 100, t, c || '#aaa'); toast(t, 'warn'); return false; };
    if (!slot && !entry) return say('ไม่มีอะไรต้องปะ');
    const e = entry || Wear.get(p, slot); if (!e) return say('ไม่ได้สวมอยู่');
    if (this.repairJob) return say('กำลังซ่อมอย่างอื่นอยู่');
    if (p.climb) return say('ลงจากบันไดก่อน');
    if (!Wear.needsFix(e)) return say(Wear.why(e));
    const k = this.fixKind(e, kit); if (!k) return say('ชุดซ่อมอาวุธใช้กับเกราะหรืออาวุธ');
    const F = this.GEAR_FIX[k], cost = this.gearCost(e, k);
    const have = id => ITEMS[id].uses ? Wear.usesIn(p.backpack, id) : Inv.count(p.backpack, id);
    const miss = Object.entries(cost).filter(([id, n]) => have(id) < n);
    if (miss.length) return say('ต้องใช้ ' + Object.entries(cost).map(([id, n]) => `${ITEMS[id].n} ${have(id)}/${n}${ITEMS[id].uses ? ' ครั้ง' : ''}`).join(' · '), '#ff8a5c');
    const T = F.T * (k === 'kitArmor' && p.mods.engineer ? 0.6 : 1);
    this.repairJob = { w: e, slot, kind: 'gear', cost, t: 0, T, quiet: F.quiet, finish: () => {
      const g = entry || Wear.get(p, slot); if (!g) return;
      const r = Wear.fix(p, entry ? null : slot, g, F.amt);
      if (!r) return;
      if (!F.quiet) Snd.hammer && Snd.hammer();
      Wear.refit(p); this.armorSpeed && this.armorSpeed();
      this.popText(p.x, this.yOf(p) - 100, 'ปะ' + Wear.fixMsg(g, r), '#9dffb0'); toast('ปะ' + Wear.fixMsg(g, r), 'good');
      if (typeof UIRun !== 'undefined' && (Run.panel === 'inv' || Run.panel === 'loot')) UIRun.render();
    } };
    return true;
  },
});
