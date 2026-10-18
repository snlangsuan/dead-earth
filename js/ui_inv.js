// ---------- SCUM-style inventory screen: what you wear in the middle, its pockets on the right, the world on the left ----------
// Shared by the in-run backpack (Tab) and the base's "เตรียมตัว" tab. H is the holder: Run.p in a run, G at base.
const InvUI = {
  CELL: 48,
  H(mode) { return mode === 'run' ? Run.p : G; },
  // where things go that leave you: the stash at base; the open box or the ground in a run
  away(mode, items) {
    items = items.filter(Boolean); if (!items.length) return;
    if (mode === 'base') { for (const e of items) Inv.addFree(G.stash, e); return; }
    const p = Run.p;
    if (UIRun.loot) for (const e of items) Inv.addFree(UIRun.loot.items, e);
    else Run.dropBag(p.x + p.facing * 10, p.f, p.room, items);
  },
  after(mode) { if (mode === 'run') Run.armorSpeed(); else State.save(); },

  // ---- clothing / armor / backpack slots ----
  takeOff(mode, slot) {
    const H = this.H(mode), { old, out } = Wear.put(H, slot, null);
    this.away(mode, out); this.after(mode); return old;
  },
  wearIt(mode, slot, e) {
    const H = this.H(mode);
    const { old, out } = Wear.put(H, slot, slot === 'pack' ? { id: e.id, q: 1, dur: e.dur ?? 100 } : e);
    if (mode === 'run' && slot === 'pack') {   // the old bag + whatever no longer fits are left on the floor together
      const p = Run.p; Run.dropBag(p.x - p.facing * 18, p.f, p.room, [...out, old]);
    } else this.away(mode, [...out, old]);
    if (out.length) toast('ของบางชิ้นไม่พอที่ — ' + (mode === 'run' ? 'วางไว้ที่พื้น' : 'ย้ายเข้าคลัง'), 'warn');
    Snd.pickup && Snd.pickup(); this.after(mode);
  },
  slotBox(mode, slot, rer) {
    const H = this.H(mode), e = Wear.get(H, slot), it = e && ITEMS[e.id];
    const box = U.el('div', { class: 'wslot ws-' + slot + (e ? '' : ' empty'), title: it ? it.n + (it.grid ? ` · ${it.grid[0]}×${it.grid[1]}` : '') : WEAR_LABEL[slot] });
    if (e) {
      const k = it.t === 'armor' ? armorPct(e) : Wear.cond(e);
      box.innerHTML = `<div class="wic">${Art.icon(e.id)}</div>` + (it.t === 'armor' || Wear.wears(it) ? `<div class="wbar"><i style="width:${k}%;background:${it.t === 'armor' ? '#7fb8ff' : durColor(k)}"></i></div>` : '');
      box.addEventListener('contextmenu', ev => { ev.preventDefault(); if (GridUI.drag) return; GridUI.ctxMenu(ev, it.n, this.slotActs(mode, slot, e, rer)); });
      if (slot !== 'pack') GridUI.makeDraggable(box, { from: 'slot', entry: e, noGrid: true, remove: () => this.takeOff(mode, slot) });
    } else box.appendChild(U.el('span', { class: 'wl' }, WEAR_LABEL[slot]));
    GridUI.zone(box, src => {
      const x = src.entry, xi = ITEMS[x.id];
      const kit = this.kitDrop(mode, slot, src, rer); if (kit != null) return kit;
      if (Wear.slotOf(xi) !== slot || src.from === 'slot') return false;
      if (slot === 'pack' && x.id === H.bag) return false;
      if (slot === 'pack' && x.q > 1) { x.q--; } else GridUI.removeFromSource(src);
      this.wearIt(mode, slot, x); return true;
    });
    return box;
  },
  // a sewing kit / repair kit dropped on a worn piece (its slot or its pocket header): patch it. null = not a kit drop
  kitDrop(mode, slot, src, rer) {
    const H = this.H(mode), e = Wear.get(H, slot), x = src.entry;
    if (!e || !['sewkit', 'repairkit'].includes(x.id)) return null;
    return this.applyKit(mode, H, slot, e, src, rer);
  },
  // a kit dropped onto a piece that is NOT worn (in the bag, a pocket or the stash)
  kitOnItem(src, o) {
    if (!Wear.fixable(o) && ITEMS[o.id].t !== 'weapon') return false;
    const run = Run.active && !Run.over;
    return this.applyKit(run ? 'run' : 'base', run ? Run.p : G, null, o, src, null);
  },
  // sewing kit: clothes / trousers / bag / armor +30% · repair kit: armor only (base: full · run: +40%)
  applyKit(mode, H, slot, e, src, rer) {
    const x = src.entry, xi = ITEMS[x.id], it = ITEMS[e.id], armor = it.t === 'armor';
    if (it.t === 'weapon') return this.kitOnWeapon(mode, x, e, src, rer);
    if (x.id === 'repairkit' && !armor) { toast('ชุดซ่อมอาวุธใช้กับเกราะหรืออาวุธ — เสื้อผ้าใช้ชุดเย็บผ้า', 'warn'); return true; }
    if (!Wear.needsFix(e)) { toast(Wear.why(e)); return true; }
    if (mode === 'run') {
      if (src.list !== Run.p.backpack) { toast(`เก็บ${xi.n}เข้าเป้ก่อน แล้วค่อยลากใส่`, 'warn'); return true; }
      if (Run.startGearRepair(slot, slot ? null : e, x.id)) { toast(`กำลังปะ${it.n}... ยืนนิ่งไว้`); UIRun.close(); }
      return true;
    }
    const need = Wear.kitUses(e), have = Wear.usesIn(x, x.id);
    if (have < need) { toast(`${it.n} ต้องใช้${xi.n} ${need} ครั้ง — ชุดนี้เหลือ ${have} ครั้ง`, 'warn'); return true; }
    const r = Wear.fix(H, slot, e, x.id === 'repairkit' ? null : 30); if (!r) { toast(Wear.why(e)); return true; }
    for (let i = 0; i < need; i++) if (Run.useKitEntry(x)) { GridUI.removeFromSource(src); break; }
    Wear.refit(G); toast((x.id === 'repairkit' ? 'ซ่อม' : 'ปะ') + Wear.fixMsg(e, r), 'good'); State.save(); rer && rer(); return true;
  },
  // repair kit dropped on a weapon (in the stash / bag): at base it repairs to the ceiling; in a run it starts a field repair
  kitOnWeapon(mode, x, w, src, rer) {
    const xi = ITEMS[x.id], it = ITEMS[w.id];
    if (x.id !== 'repairkit') { toast(`อาวุธใช้ชุดซ่อมอาวุธ — ${xi.n}ใช้กับเสื้อผ้า`, 'warn'); return true; }
    const cap = repairCap(w);
    if (cap <= 0) { toast(`${it.n} ซ่อมไม่ได้แล้ว (ซ่อมมาหลายครั้งเกินไป)`, 'warn'); return true; }
    if (dur(w) >= cap) { toast(`${it.n} ซ่อมได้สูงสุด ${cap}% — ตอนนี้ ${Math.round(dur(w))}% แล้ว`); return true; }
    if (mode === 'run') {
      const i = Run.p.weapons.indexOf(w);
      if (i < 0) { toast('ถืออาวุธไว้ในช่องอาวุธก่อน แล้วค่อยซ่อม', 'warn'); return true; }
      Run.p.cur = i; if (Run.startFieldRepair(w)) { toast(`กำลังซ่อม${it.n}... ยืนนิ่งไว้`); UIRun.close(); }
      return true;
    }
    const need = Wear.kitUses(w), have = Wear.usesIn(x, x.id);
    if (have < need) { toast(`${it.n} ต้องใช้${xi.n} ${need} ครั้ง — ชุดนี้เหลือ ${have} ครั้ง`, 'warn'); return true; }
    applyRepair(w, null);
    for (let i = 0; i < need; i++) if (Run.useKitEntry(x)) { GridUI.removeFromSource(src); break; }
    Snd.hammer && Snd.hammer(); toast(`ซ่อม ${it.n} → ${Math.round(w.dur)}%` + (repairCap(w) > 0 ? ` · ครั้งหน้าซ่อมได้สูงสุด ${repairCap(w)}%` : ' · ซ่อมครั้งสุดท้ายแล้ว'), 'good');
    State.save(); rer && rer(); return true;
  },
  slotActs(mode, slot, e, rer) {
    const it = ITEMS[e.id], acts = [['ข้อมูล', () => GridUI.showInfo(e)]];
    if (slot === 'armor' && mode === 'base') {
      const c = armorRepairCost(e);
      if (c) acts.push([`ซ่อมเกราะ (ผ้า ${c.cloth} · เศษเหล็ก ${c.scrap} · 💵${c.money})`, () => {
        if (Inv.count(G.stash, 'cloth') < c.cloth || Inv.count(G.stash, 'scrap') < c.scrap || G.money < c.money) { toast(`ต้องใช้ผ้า ${c.cloth} เศษเหล็ก ${c.scrap} ในคลัง และเงิน ${c.money}`, 'warn'); return; }
        Inv.remove(G.stash, 'cloth', c.cloth); Inv.remove(G.stash, 'scrap', c.scrap); G.money -= c.money;
        const r = Wear.fix(G, 'armor', e, null); Wear.refit(G); toast('ซ่อม' + Wear.fixMsg(e, r), 'good'); rer(); }, 'good']);
    }
    if (mode === 'run') {
      if (Wear.needsFix(e)) for (const kit of slot === 'armor' ? ['sewkit', 'repairkit'] : ['sewkit']) {
        const k = Run.fixKind(e, kit), F = Run.GEAR_FIX[k], c = Run.gearCost(e, k);
        acts.push([`ปะ (${Object.entries(c).map(([id, n]) => `${ITEMS[id].n} ${n}${ITEMS[id].uses ? ' ครั้ง' : ''}`).join(' · ')}) +${F.amt}%`, () => { if (Run.startGearRepair(slot, null, kit)) { toast(`กำลังปะ${it.n}... ยืนนิ่งไว้`); UIRun.close(); } }, 'good']);
      }
    }
    const rc = mode === 'base' && Wear.repairCost(e);
    if (rc) acts.push([`ซ่อม (ผ้า ${rc.cloth} · 💵${rc.money})`, () => {
      if (Inv.count(G.stash, 'cloth') < rc.cloth || G.money < rc.money) { toast(`ต้องใช้ผ้า ${rc.cloth} ในคลัง และเงิน ${rc.money}`, 'warn'); return; }
      Inv.remove(G.stash, 'cloth', rc.cloth); G.money -= rc.money;
      const r = Wear.fix(G, slot, e, null); Wear.refit(G); toast('ซ่อม' + Wear.fixMsg(e, r), 'good'); rer(); }, 'good']);
    if (slot !== 'pack') {
      if (mode === 'run') acts.push(['ถอดใส่เป้', () => { const old = this.takeOff(mode, slot); const H = this.H(mode); if (Inv.addToPack(H.backpack, old, H.grid)) { this.away(mode, [old]); toast('เป้เต็ม — วางไว้ที่พื้น', 'warn'); } rer(); }]);
      acts.push([mode === 'run' ? 'ถอดทิ้ง' : 'ถอดเก็บคลัง', () => { this.away(mode, [this.takeOff(mode, slot)]); rer(); }, 'danger']);
    }
    return acts;
  },

  // ---- weapon slots (same rules as before: drag a gun in, ammo onto it, parts into its slots, a repair kit onto it) ----
  weaponCard(mode, i, rer) {
    const H = this.H(mode), w = H.weapons[i], run = mode === 'run', p = Run.p;
    const back = x => { if (run) { const left = Inv.addToPack(p.backpack, x, p.grid); if (left) UIRun.toGround({ id: x.id, q: left }); } else Inv.addFree(G.stash, x); };
    let card;
    if (!w) card = U.el('div', { class: 'icard empty wcard' }, U.el('div', { class: 'meta' }, SLOT_LABEL[i]));
    else {
      card = UIRun.itemCard(w, { cls: 'wcard' + (run && i === p.cur ? ' sel' : ''), noAtt: true });
      if (attSlotsFor(w).length) card.appendChild(attSlotsEl(w, back, rer));
      card.addEventListener('contextmenu', ev => { ev.preventDefault(); if (GridUI.drag) return;
        const acts = [['ข้อมูล', () => GridUI.showInfo(w)]];
        if (run) {
          acts.push(['ถือ', () => { p.cur = i; rer(); }, 'primary']);
          if (dur(w) < repairCap(w)) acts.push(['ซ่อมภาคสนาม', () => { p.cur = i; if (Run.startFieldRepair(w)) UIRun.close(); else rer(); }]);
          acts.push(['ใส่เป้', () => { if (Inv.addToPack(p.backpack, w, p.grid)) toast('เป้เต็ม', 'warn'); else p.weapons[i] = null; rer(); }]);
          acts.push(['ทิ้ง', () => { p.weapons[i] = null; UIRun.toGround(w); rer(); }, 'danger']);
        } else acts.push(...UI.repairActs(w), ['ถอดออก (เก็บคลัง)', () => { G.weapons[i] = null; Inv.addFree(G.stash, w); rer(); }, 'danger']);
        GridUI.ctxMenu(ev, ITEMS[w.id].n, acts); });
      if (run) card.addEventListener('click', () => { p.cur = i; rer(); });
      GridUI.makeDraggable(card, { from: 'slot', entry: w, noGrid: false, remove: () => { H.weapons[i] = null; } });
    }
    GridUI.zone(card, src => {
      const e = src.entry, it = ITEMS[e.id];
      if (it.t === 'ammo' && w) { if (run) UIRun.dragReload(i, w, src); else { GridUI.loadAmmo(w, src); State.save(); } return true; }
      if (it.t === 'attach' && w) { const ok = attInstall(w, src, back); this.after(mode); return ok; }
      if (e.id === 'repairkit' && w) {
        if (run) {
          if (src.list !== p.backpack) { toast('เก็บชุดซ่อมเข้าเป้ก่อน แล้วค่อยลากใส่อาวุธ', 'warn'); return true; }
          p.cur = i; p.reloadT = 0;
          if (Run.startFieldRepair(w)) { toast(`กำลังซ่อม ${ITEMS[w.id].n}... ยืนนิ่งไว้`); UIRun.close(); }
          return true;
        }
        const cap = repairCap(w);
        if (cap <= 0) { toast(`${ITEMS[w.id].n} ซ่อมมาหลายครั้งแล้ว ซ่อมต่อไม่ได้`, 'warn'); return true; }
        if (dur(w) >= cap) { toast(`${ITEMS[w.id].n} ยังดีอยู่ (ซ่อมได้สูงสุด ${cap}%)`); return true; }
        applyRepair(w); if (Run.useKitEntry(e)) GridUI.removeFromSource(src);
        Snd.hammer && Snd.hammer(); toast(`ใช้ชุดซ่อม: ${ITEMS[w.id].n} → ${Math.round(w.dur)}%`, 'good'); State.save(); return true;
      }
      if (it.t !== 'weapon' || CLS_SLOT[it.cls] !== i || src.from === 'slot') return false;
      if (run) { UIRun.equip(e, src.list || []); if (src.remove) src.remove(); return true; }
      GridUI.removeFromSource(src); delete e.gx; delete e.gy; delete e.rot;
      const old = G.weapons[i]; G.weapons[i] = e; if (old) Inv.addFree(G.stash, old); return true;
    });
    return card;
  },

  // ---- the middle: character, worn slots, weapons, weight, quick slots ----
  doll(mode, rer) {
    const H = this.H(mode), kg = Wear.kg(H), L = Wear.load(kg);
    const col = U.el('div', { class: 'sc-doll' });
    const kcls = kg >= KG_MAX ? 'over' : kg >= KG_OK ? 'heavy' : '';
    col.appendChild(U.el('div', { class: 'kgbar ' + kcls, title: `แบกได้สบายถึง ${KG_OK} kg · เกิน ${KG_MAX} kg วิ่งไม่ได้` },
      U.el('span', null, `${kg.toFixed(1)} / ${KG_MAX} kg`),
      U.el('div', null, U.el('i', { style: { width: Math.min(100, kg / KG_MAX * 100) + '%' } }), U.el('s', { style: { left: KG_OK / KG_MAX * 100 + '%' } }))));
    const fig = U.el('div', { class: 'figure' });
    fig.append(
      U.el('div', { class: 'fcol' }, this.slotBox(mode, 'top', rer), this.slotBox(mode, 'bottom', rer)),
      U.el('div', { class: 'fimg' }, UI.charPortrait(G.char, 170)),
      U.el('div', { class: 'fcol' }, this.slotBox(mode, 'armor', rer), this.slotBox(mode, 'pack', rer)));
    col.appendChild(fig);
    col.appendChild(U.el('div', { class: 'wrow3' }, ...[0, 1, 2].map(i => this.weaponCard(mode, i, rer))));
    const pool = mode === 'run' ? () => QuickUI.poolFrom(H.backpack).map(o => ({ id: o.id, n: Inv.count(H.backpack, o.id) }))
      : () => QuickUI.poolFrom(G.backpack, G.stash).map(o => ({ id: o.id, n: Inv.count(G.backpack, o.id) }));
    col.appendChild(QuickUI.strip(pool, rer));
    if (mode === 'run') { const p = Run.p; col.appendChild(U.el('div', { class: 'vitals' },
      U.el('div', null, `❤ ${Math.round(p.hp)}/${p.maxHp}`), U.el('div', null, `🍖 ${Math.round(p.hunger)}`), U.el('div', null, `☣ ${Math.round(p.inf)}%`), U.el('div', null, `💵 ${U.fmt(Run.cash)}`))); }
    return col;
  },

  // ---- the right: one window per pocket ----
  pockets(mode, rer, menu, headExtra) {
    const H = this.H(mode), g = mode === 'run' ? H.grid : State.grid();
    const col = U.el('div', { class: 'sc-pock' });
    const win = R => {
      const owner = Wear.get(H, R.k), used = H.backpack.filter(e => Wear.inReg(e, R)).reduce((s, e) => { const [w, h] = Inv.dims(e); return s + w * h; }, 0) + '/' + (R.c * R.r - (R.torn || 0));
      const head = U.el('div', { class: 'cwh' }, U.el('span', { class: 'cwi', html: owner ? Art.icon(owner.id) : '' }), U.el('b', null, owner ? ITEMS[owner.id].n : WEAR_LABEL[R.k]), U.el('span', { class: 'cwc' }, used));
      if (R.k === 'pack' && headExtra) head.appendChild(headExtra);
      return U.el('div', { class: 'cwin cw-' + R.k }, head, GridUI.renderRegion(H.backpack, g, R, { onContext: menu }));
    };
    const by = k => g.regs.find(q => q.k === k);
    const row = U.el('div', { class: 'cwrow' });
    for (const k of ['top', 'bottom']) if (by(k)) row.appendChild(win(by(k)));
    if (row.children.length) col.appendChild(row);
    if (by('armor')) col.appendChild(win(by('armor')));
    col.appendChild(win(by('pack')));
    return col;
  },
};

// ---------- in-run screen: SCUM layout over the live game ----------
// left edge: your containers (backpack, armor pockets) · next to it: what you wear · top: vicinity (box / floor)
// right edge: hands (weapons) + quick access. The game keeps drawing (slowed) in the middle.
// the SCUM panels, shared by the run (Tab) and the base: containers | worn items | (middle) | hands + quick slots
InvUI.scumParts = function (mode, rer, menu, opt = {}) {
  const H0 = this.H(mode);
  // things left in pockets that have since torn (e.g. an old save with worn-out armor) go back to the stash
  if (mode === 'base') { const lost = Wear.refit(H0); for (const e of lost) Inv.addFree(G.stash, e); if (lost.length) State.save(); }
  const H = H0, g = mode === 'run' ? H.grid : State.grid();
  // the grids fill the containers panel: cell size = panel width / widest grid (capped so small bags don't get huge)
  const PANEL = 300;
  GridUI.CELL = Math.max(36, Math.min(70, Math.floor((PANEL - 26) / g.c)));
  const kgOf = R => H.backpack.filter(e => Wear.inReg(e, R)).reduce((s, e) => s + Wear.entryKg(e), 0);
  // left: containers
  const left = U.el('div', { class: 'sr-left' }, U.el('div', { class: 'sr-title' }, 'กระเป๋า', opt.titleExtra || null));
  for (const k of ['pack', 'armor', 'top', 'bottom']) {
    const R = g.regs.find(q => q.k === k); if (!R) continue;
    const owner = Wear.get(H, k), it = ITEMS[owner.id];
    const ch = U.el('div', { class: 'sr-ch' }, U.el('span', { class: 'sr-ci', html: Art.icon(owner.id) }), U.el('b', null, it.n),
        (pc => U.el('span', { class: 'sr-cd', title: k === 'armor' ? `เกราะ ${armorAP(owner)}/${armorMax(owner.id)}` : 'สภาพ', style: { color: durColor(pc) } }, pc + '%'))(k === 'armor' ? armorPct(owner) : Math.ceil(Wear.cond(owner))),
        U.el('span', { class: 'sr-kg' }, `${kgOf(R).toFixed(1)} kg`));
    GridUI.zone(ch, src => this.kitDrop(mode, k, src, rer) ?? false);
    left.appendChild(U.el('div', { class: 'sr-cont' }, ch, GridUI.renderRegion(H.backpack, g, R, { onContext: menu })));
  }
  // strip: worn items + total weight
  const kg = Wear.kg(H);
  const strip = U.el('div', { class: 'sr-strip' },
    ...['pack', 'armor', 'top', 'bottom'].map(k => this.slotBox(mode, k, rer)),
    U.el('div', { class: 'sr-total ' + (kg >= KG_MAX ? 'over' : kg >= KG_OK ? 'heavy' : ''), title: `สบายถึง ${KG_OK} kg · เกิน ${KG_MAX} kg วิ่งไม่ได้` }, `${kg.toFixed(1)} kg`));
  // right: hands + quick access
  const pool = mode === 'run' ? () => QuickUI.poolFrom(H.backpack).map(x => ({ id: x.id, n: Inv.count(H.backpack, x.id) }))
    : () => QuickUI.poolFrom(G.backpack, G.stash).map(x => ({ id: x.id, n: Inv.count(G.backpack, x.id) }));
  const right = U.el('div', { class: 'sr-right' },
    U.el('div', { class: 'sr-bar' }, 'อาวุธ', opt.close ? U.el('button', { class: 'sr-x', title: 'ปิด (' + Keys.lbl('inv') + ')', onclick: opt.close }, '✕') : null),
    ...[2, 1, 0].map(i => U.el('div', { class: 'sr-hand' }, U.el('span', { class: 'sr-hk' }, String(i + 1)), this.weaponCard(mode, i, rer))),
    U.el('div', { class: 'sr-bar' }, 'ปุ่มลัด'),
    QuickUI.strip(pool, rer),
    opt.vitals || null);
  // the containers panel grows with the widest grid (a 6-wide raid pack doesn't fit the default 290px)
  const srw = PANEL;
  return { left, strip, right, srw };
};
UIRun.render = function () {
  const p = Run.p, o = this.el(), rer = () => this.render();
  o.className = 'show scumrun'; o.innerHTML = '';
  GridUI.reset(); GridUI.onRefresh = rer;
  if (!Inv.valid(p.backpack, p.grid)) { const out = Inv.reflow(p.backpack, p.grid); if (out.length) InvUI.away('run', out); }
  const { left, strip, right, srw } = InvUI.scumParts('run', rer, (e, ev) => this.itemMenu(e, ev), {
    close: () => this.close(),
    vitals: U.el('div', { class: 'sr-vit' }, U.el('span', null, `❤ ${Math.round(p.hp)}/${p.maxHp}`), U.el('span', null, `🍖 ${Math.round(p.hunger)}`), U.el('span', null, `☣ ${Math.round(p.inf)}%`), U.el('span', null, `💵 ${U.fmt(Run.cash)}`)) });
  o.style.setProperty('--srw', srw + 'px');
  o.append(left, strip, this.vicinity(rer), right);
  // anywhere else on screen (the open game view in the middle) counts as "drop it here": the box or the floor
  GridUI.zone(o, src => this.dropHere(src));
};
UIRun.dropHere = function (src) {
  if (src.from !== 'grid' && src.from !== 'slot') return false;
  const p = Run.p;
  GridUI.removeFromSource(src);
  if (this.loot) Inv.addFree(this.loot.items, src.entry); else Run.dropBag(p.x + p.facing * 10, p.f, p.room, [src.entry]);
  InvUI.after('run'); return true;
};
// the box you opened + piles within reach; dropping anything on this panel puts it there (or on the floor)
UIRun.vicinity = function (rer) {
  const p = Run.p, near = [];
  for (const rm of Run.map.rooms) if (rm.f === p.f) for (const f of rm.furn || []) if (f.items && f.items.length && f !== this.loot && Math.abs(f.x - p.x) < 90 && (f.searched || f.kind === 'bag')) near.push(f);
  const panel = U.el('div', { class: 'sr-vic' });
  const head = U.el('div', { class: 'sr-vh' }, U.el('b', null, 'รอบตัว'));
  if (this.loot && this.loot.items.length) head.appendChild(U.el('button', { class: 'btn small primary', onclick: () => { Run.takeAll(this.loot); rer(); } }, 'เก็บหมด (' + Keys.lbl('takeall') + ')'));
  panel.appendChild(head);
  GridUI.zone(panel, src => this.dropHere(src));
  const groups = U.el('div', { class: 'sr-vg' });
  const group = (fu, open) => {
    const title = fu.oldBag ? 'เป้เก่า' : fu.kind === 'bag' ? 'พื้น' : (FURN[fu.kind] && FURN[fu.kind].n) || 'ของ';
    const g = U.el('div', { class: 'sr-grp' + (open ? ' open' : '') }, U.el('div', { class: 'sr-gt', onclick: open ? null : () => { this.loot = fu; Run.panel = 'loot'; rer(); } }, title));
    const row = U.el('div', { class: 'sr-items' });
    for (const e of fu.items.slice()) {
      const it = ITEMS[e.id];
      const c = U.el('div', { class: 'sr-it t-' + it.t + (it.rank ? ' rk' + it.rank : ''), title: it.n + (e.q > 1 ? ' ×' + e.q : '') },
        U.el('span', { class: 'sr-ii', html: Art.icon(e.id) }), U.el('span', { class: 'sr-iw' }, Wear.entryKg(e).toFixed(1) + ' kg'), e.q > 1 ? U.el('span', { class: 'sr-iq' }, String(e.q)) : null);
      c.addEventListener('contextmenu', ev => { ev.preventDefault(); if (GridUI.drag) return;
        const acts = [['ข้อมูล', () => GridUI.showInfo(e)], ['เก็บ', () => {
          const left = Inv.addToPack(p.backpack, e, p.grid);
          if (it.t === 'weapon' || it.t === 'armor' || it.t === 'cloth') { if (!left) fu.items.splice(fu.items.indexOf(e), 1); else toast('เป้เต็ม', 'warn'); }
          else { if (left === e.q) toast('เป้เต็ม', 'warn'); e.q = left; if (e.q <= 0) fu.items.splice(fu.items.indexOf(e), 1); }
          InvUI.after('run'); rer(); }, 'primary']];
        const ws = Wear.slotOf(it);
        if (it.t === 'weapon') acts.push(['ติดตั้งเลย', () => { this.equip(e, fu.items); rer(); }, 'good']);
        else if (ws) acts.push(['สวมเลย', () => { if (ws === 'pack' && e.q > 1) e.q--; else fu.items.splice(fu.items.indexOf(e), 1); InvUI.wearIt('run', ws, e); rer(); }, 'good']);
        GridUI.ctxMenu(ev, it.n + (e.q > 1 ? ' ×' + e.q : ''), acts); });
      GridUI.makeDraggable(c, { from: 'ext', list: fu.items, entry: e });
      row.appendChild(c);
    }
    g.appendChild(row);
    return g;
  };
  if (this.loot) groups.appendChild(group(this.loot, true));
  for (const f of near) groups.appendChild(group(f, false));
  if (!groups.children.length) groups.appendChild(U.el('div', { class: 'sr-empty' }, 'ลากของมาวางที่นี่ = วางลงพื้น'));
  panel.appendChild(groups);
  return panel;
};
// backpack item menu: clothing / armor can be worn straight from the pocket
(function () {
  const _menu = UIRun.itemMenu;
  UIRun.itemMenu = function (e, ev) {
    const it = ITEMS[e.id], ws = Wear.slotOf(it);
    if (!ws || it.t === 'bag') return _menu.call(this, e, ev);
    const p = Run.p, acts = [['ข้อมูล', () => GridUI.showInfo(e)],
      ['สวม', () => { p.backpack.splice(p.backpack.indexOf(e), 1); InvUI.wearIt('run', ws, e); this.render(); }, 'primary'],
      [this.loot ? 'ใส่กล่อง' : 'ทิ้งลงพื้น', () => { p.backpack.splice(p.backpack.indexOf(e), 1); this.toGround(e); InvUI.after('run'); this.render(); }, 'danger']];
    GridUI.ctxMenu(ev, it.n, acts);
  };
  // closing the screen re-checks the carried weight
  const _close = UIRun.close;
  UIRun.close = function (...a) { const r = _close.apply(this, a); if (Run.active && Run.p) Run.armorSpeed(); return r; };
})();
(function () {
  // item info: pockets and condition
  const _info = GridUI.infoLines;
  GridUI.infoLines = function (e) {
    const L = _info.call(this, e), it = ITEMS[e.id];
    if (it.grid && (Wear.wears(it) || it.t === 'armor')) {
      const a = it.grid[0] * it.grid[1], t = Wear.torn(e, a);
      L.splice(1, 0, ['ช่องเก็บของ', `${it.grid[0]}×${it.grid[1]}` + (t ? ` · ขาด ${t} ช่อง (ใช้ได้ ${a - t})` : '')]);
    }
    if (Wear.wears(it)) L.splice(2, 0, ['สภาพ', `${Math.ceil(Wear.cond(e))}% — เกราะหมดแล้วโดนโจมตีจะขาดทีละนิด ช่องเก็บของลดลง · ซ่อมที่ฐานด้วยผ้า หรือชุดเย็บผ้า`]);
    if (Wear.fixable(e)) { const n = Wear.reps(e), left = Wear.REP_FREE - n;
      L.splice(3, 0, ['เครื่องมือ', `ซ่อมแต่ละครั้งใช้${it.t === 'armor' ? 'ชุดเย็บผ้า หรือชุดซ่อมอาวุธ' : 'ชุดเย็บผ้า'} ${Wear.kitUses(e)} ครั้ง`]);
      L.splice(4, 0, ['การซ่อม', left > 0 ? `ซ่อมแล้ว ${n} ครั้ง · ซ่อมเต็ม 100% ได้อีก ${left} ครั้ง` : Wear.capOf(e) <= 0 ? `ซ่อมแล้ว ${n} ครั้ง · ขาดเกินซ่อมแล้ว` : `ซ่อมแล้ว ${n} ครั้ง · ซ่อมได้สูงสุด ${Math.round(Wear.capOf(e))}% · ครั้งต่อไปเพดานลด ${Wear.skilled() ? '1–6% (มีช่างตัดเย็บ)' : '8–12%'}`]); }
    return L;
  };

})();
// weapon info: one line per attachment slot — what is fitted (with its rank and effect) or that the slot is empty
(function () {
  const _info = GridUI.infoLines;
  GridUI.infoLines = function (e) {
    const L = _info.call(this, e), it = ITEMS[e.id];
    if (it.t !== 'weapon' || typeof attSlotsFor !== 'function') return L;
    const slots = attSlotsFor(e); if (!slots.length) return L;
    const i = L.findIndex(r => r[0] === 'อุปกรณ์เสริม'); if (i >= 0) L.splice(i, 1);
    for (const sl of slots) {
      const id = e.att && e.att[sl], lab = ATTACH_LABEL[sl] || sl;
      if (!id) { L.push([lab, '<span style="color:#6a707a">ว่าง</span>']); continue; }
      const rk = attRank(id), f = attFx(id);
      L.push([lab, `<b>${ITEMS[id].n}</b> ${'★'.repeat(rk)}<br><small style="color:#9dff8a">${f ? attDesc(sl, f, rk) : ''}</small>`]);
    }
    return L;
  };
})();
GridUI.CELL = InvUI.CELL;   // a little smaller so the whole outfit fits on one screen

GridUI.itemDrop = (src, o) => (src.entry.id === 'sewkit' || src.entry.id === 'repairkit') && InvUI.kitOnItem(src, o);
