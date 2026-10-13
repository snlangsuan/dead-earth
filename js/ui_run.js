// ---------- In-run panels: backpack, loot, pause, results ----------
const UIRun = {
  el() { return document.getElementById('overlay'); },
  // dropping ammo on a weapon during a run = a normal reload (takes the weapon's reload time), not an instant refill
  dragReload(i, w, src) {
    const p = Run.p, wit = ITEMS[w.id], e = src.entry;
    if (wit.cls === 'melee' || !wit.ammo) { toast('อาวุธนี้ไม่ใช้กระสุน', 'warn'); return; }
    if (wit.ammo !== e.id) { toast(`${wit.n} ใช้ ${ITEMS[wit.ammo].n} — ไม่ใช่ ${ITEMS[e.id].n}`, 'warn'); return; }
    if (p.reloadT > 0) { toast('กำลังรีโหลดอยู่', 'warn'); return; }
    if (src.list !== p.backpack) { toast('เก็บกระสุนเข้าเป้ก่อน แล้วค่อยลากใส่ปืน', 'warn'); return; }
    if ((w.mag || 0) >= wStats(w, G.char).mag) { toast(`${wit.n} กระสุนเต็มแล้ว`); return; }
    p.cur = i; Run.reload();
    if (p.reloadT > 0) { toast(`กำลังรีโหลด ${wit.n}...`); this.close(); }
  },
  close() { GridUI.closeMenu(); Run.panel = null; this.loot = null; this.sel = null; GridUI.reset(); this.el().innerHTML = ''; this.el().className = ''; },
  update() {
    if (!Run.panel || Run.panel === 'result') return;
    if (Input.hit('Tab') || Input.hit('Escape') || Input.hit('KeyI') || (Input.hit('KeyE') && Run.panel !== 'pause')) { this.close(); Input.pressed = {}; } // consume so the same key press does not reopen it
    else if (Input.hit('KeyF') && this.loot) { Run.takeAll(this.loot); this.render(); }
  },
  openInventory() { Run.panel = 'inv'; this.loot = null; this.render(); },
  openLoot(fu) { Run.panel = 'loot'; this.loot = fu; this.render(); },

  itemCard(e, opts) {
    const it = ITEMS[e.id];
    const qty = it.t === 'weapon' ? (it.mag != null ? `${e.mag}/${it.mag}` : '') : (e.q > 1 ? '×' + e.q : '');
    const shape = it.sz ? `${it.gw}×${it.gh}` : '';
    const lvl = e.lvl ? `<span class="lvl">+${e.lvl}</span>` : '';
    const att = e.att && Object.keys(e.att).length ? `<span class="att">${Object.keys(e.att).map(k => ITEMS[e.att[k]].icon).join('')}</span>` : '';
    const card = U.el('div', { class: 'icard t-' + it.t + (opts.cls ? ' ' + opts.cls : ''), title: (it.desc || TYPE_LABEL[it.t]) });
    const dbar = it.t === 'weapon' ? `<div class="dur" title="ความทน ${Math.ceil(dur(e))}% · ซ่อมแล้ว ${e.rep || 0} ครั้ง · ครั้งหน้าซ่อมได้สูงสุด ${Math.max(0, repairCap(e))}%"><s style="left:${durMax(e)}%;width:${100 - durMax(e)}%"></s><i style="width:${Math.max(0, dur(e))}%;background:${durColor(dur(e))}"></i></div><div class="durt">${Math.ceil(dur(e))}%${e.rep ? ` · ซ่อม ${e.rep}/5` : ''}</div>${dur(e) <= 0 ? '<span class="broken">พัง</span>' : ''}` : '';
    card.innerHTML = `<div class="ic">${Art.icon(e.id)}</div><div class="nm">${it.n}${lvl}</div><div class="meta"><span>${qty}</span>${att}<span class="sz">${shape}</span></div>${dbar}`;
    if (opts.actions) {
      const row = U.el('div', { class: 'acts' });
      for (const [label, fn, kind] of opts.actions) row.appendChild(U.el('button', { class: 'mini ' + (kind || ''), onclick: ev => { ev.stopPropagation(); fn(); } }, label));
      card.appendChild(row);
    }
    if (opts.onclick) card.addEventListener('click', opts.onclick);
    return card;
  },

  equip(entry, from) {
    const p = Run.p, it = ITEMS[entry.id];
    const slot = CLS_SLOT[it.cls];
    const old = p.weapons[slot];
    const i = from.indexOf(entry); if (i >= 0) from.splice(i, 1);
    delete entry.gx; delete entry.gy; delete entry.rot;
    p.weapons[slot] = entry; p.cur = slot; p.reloadT = 0;
    if (old) {
      const left = Inv.addToPack(p.backpack, old, p.grid);
      if (left) { if (this.loot) Inv.addFree(this.loot.items, old); else Run.dropBag(p.x, p.f, p.room, [old]); toast(`${ITEMS[old.id].n} ถูกวางลงพื้น (เป้เต็ม)`); }
    }
  },
  itemMenu(e, ev) {
    const p = Run.p, it = ITEMS[e.id], acts = [['ข้อมูล', () => GridUI.showInfo(e)]];
    const re = () => this.render();
    if (it.t === 'med' || it.t === 'food') acts.push(['ใช้', () => { Run.useItem(e.id); if (Run.medJob) this.close(); else re(); }, 'primary']);
    if (it.t === 'tool') acts.push(['ซ่อมอาวุธในมือ', () => { Run.startFieldRepair(); this.close(); }, 'primary']);
    if (it.t === 'weapon') acts.push(['ติดตั้งเป็นอาวุธ', () => { this.equip(e, p.backpack); this.sel = null; re(); }, 'primary']);
    if (it.t === 'bag') acts.push([`สวมเป้นี้ (${State.gridFor(e.id).c}×${State.gridFor(e.id).r})`, () => { this.sel = null; const old = Run.equipBag(e, p.backpack); this.loot = old; Run.panel = 'loot'; re(); }, 'primary']);
    if (it.gw !== it.gh) acts.push(['หมุน', () => { if (Inv.fits(p.backpack, p.grid, e, e.gx, e.gy, e.rot ? 0 : 1, e)) e.rot = e.rot ? 0 : 1; else toast('หมุนไม่ได้ ที่ไม่พอ', 'warn'); re(); }]);
    if (e.q > 1) acts.push([this.loot ? 'ใส่กล่อง 1' : 'ทิ้ง 1', () => { e.q--; this.toGround({ id: e.id, q: 1 }); re(); }]);
    acts.push([this.loot ? 'ใส่กล่องทั้งหมด' : 'ทิ้งลงพื้น', () => { p.backpack.splice(p.backpack.indexOf(e), 1); this.toGround(e); this.sel = null; re(); }, 'danger']);
    GridUI.ctxMenu(ev, it.n + (e.q > 1 ? ' ×' + e.q : ''), acts);
  },
  toGround(e) { const p = Run.p; if (this.loot) Inv.addFree(this.loot.items, e); else Run.dropBag(p.x + p.facing * 10, p.f, p.room, [e]); },

  render() {
    const p = Run.p, o = this.el();
    o.className = 'show';
    o.innerHTML = '';
    GridUI.reset(); GridUI.onRefresh = () => this.render();
    const used = Inv.used(p.backpack);
    const panel = U.el('div', { class: 'panel runpanel' + (this.loot ? '' : ' solo') });
    panel.appendChild(U.el('div', { class: 'ph' },
      U.el('div', { class: 'pt' }, '🎒 ' + Run.bagName(), U.el('span', { class: 'cap ' + (used >= p.cap ? 'full' : '') }, ` ${used}/${p.cap} block`)),
      U.el('div', { class: 'hint' }, 'ลากของเพื่อจัดวาง · ระหว่างลากกด R/คลิกขวา = หมุน · ลากออกนอกเป้ = วางลงพื้น/กล่อง · เกมเดินช้าลง · Tab ปิด' + (this.loot ? ' · F เก็บทั้งหมด' : '')),
      U.el('button', { class: 'btn ghost', onclick: () => this.close() }, 'ปิด ✕')));
    const cols = U.el('div', { class: 'cols' });
    // weapon slots
    const wcol = U.el('div', { class: 'col wcol' }, U.el('h4', null, 'อาวุธที่ถือ (ไม่กินที่เป้)'));
    p.weapons.forEach((w, i) => {
      let card;
      if (!w) card = U.el('div', { class: 'icard empty' }, U.el('div', { class: 'nm' }, SLOT_LABEL[i]), U.el('div', { class: 'meta' }, 'ลากอาวุธมาวาง'));
      else {
        card = this.itemCard(w, { cls: i === p.cur ? 'sel' : '' });
        card.addEventListener('contextmenu', ev => { ev.preventDefault(); if (GridUI.drag) return;
          GridUI.ctxMenu(ev, ITEMS[w.id].n, [
            ['ข้อมูล', () => GridUI.showInfo(w)],
            ['ถือ', () => { p.cur = i; this.render(); }, 'primary'],
            ...(dur(w) < repairCap(w) ? [['ซ่อมภาคสนาม', () => { p.cur = i; if (Run.startFieldRepair(w)) this.close(); else this.render(); }]] : []),
            ['ใส่เป้', () => { if (Inv.addToPack(p.backpack, w, p.grid)) toast('เป้เต็ม', 'warn'); else p.weapons[i] = null; this.render(); }],
            ['ทิ้ง', () => { p.weapons[i] = null; this.toGround(w); this.render(); }, 'danger']]); });
        card.addEventListener('click', () => { p.cur = i; this.render(); });
      }
      if (w) GridUI.makeDraggable(card, { from: 'slot', list: null, entry: w, remove: () => { p.weapons[i] = null; } });
      GridUI.zone(card, src => {
        const e = src.entry; if (ITEMS[e.id].t === 'ammo' && w) { this.dragReload(i, w, src); return true; }
        if (ITEMS[e.id].t !== 'weapon' || CLS_SLOT[ITEMS[e.id].cls] !== i) { toast('ช่องนี้ใส่ได้เฉพาะ' + SLOT_LABEL[i], 'warn'); return false; }
        if (src.from === 'slot') return false;
        this.equip(e, src.list || []); return true;
      });
      wcol.appendChild(card);
    });
    wcol.appendChild(U.el('div', { class: 'vitals' },
      U.el('div', null, `❤ ${Math.round(p.hp)}/${p.maxHp}`), U.el('div', null, `🍖 ${Math.round(p.hunger)}`), U.el('div', null, `☣ ${Math.round(p.inf)}%`), U.el('div', null, `💵 ${U.fmt(Run.cash)}`)));
    if (!this.loot) wcol.appendChild(GridUI.zone(U.el('div', { class: 'groundzone' }, '⬇ ลากมาที่นี่เพื่อวางลงพื้น'), src => {
      if (src.from === 'grid' || src.from === 'slot') { GridUI.removeFromSource(src); this.toGround(src.entry); return true; } return false; }));
    cols.appendChild(wcol);
    // backpack grid
    const bcol = U.el('div', { class: 'col gridcol' });
    bcol.appendChild(GridUI.renderGrid(p.backpack, p.grid, { selected: this.sel, onSelect: e => { this.sel = this.sel === e ? null : e; this.render(); }, onContext: (e, ev) => this.itemMenu(e, ev) }));
    // selected item actions
    const e = this.sel && p.backpack.includes(this.sel) ? this.sel : null;
    const det = U.el('div', { class: 'detail' });
    if (e) {
      const it = ITEMS[e.id];
      det.appendChild(U.el('div', { class: 'dt' }, `${it.n}${e.q > 1 ? ' ×' + e.q : ''}`, U.el('small', null, ` · ${TYPE_LABEL[it.t] || it.t} · ${it.gw}×${it.gh} block`)));
      if (it.desc) det.appendChild(U.el('div', { class: 'hint' }, it.desc));
    } else det.appendChild(U.el('div', { class: 'hint' }, 'คลิกขวาที่ไอเทม = เมนู (ใช้ / ทิ้ง / หมุน ...) · ลากเพื่อย้าย · ลากไปวางที่ช่องปุ่มลัดด้านล่างเพื่อตั้งปุ่มลัด'));
    bcol.appendChild(det);
    bcol.appendChild(QuickUI.strip(() => QuickUI.poolFrom(p.backpack).map(o => ({ id: o.id, n: Inv.count(p.backpack, o.id) })), () => this.render()));
    cols.appendChild(bcol);
    // loot
    if (this.loot) {
      const fu = this.loot;
      const lcol = U.el('div', { class: 'col lootcol' }, U.el('h4', null, (fu.oldBag ? 'เป้เก่าของคุณ' : (FURN[fu.kind] && FURN[fu.kind].n) || 'ของ') + ' — ลากของเข้าเป้ หรือลากของจากเป้มาใส่'),
        U.el('button', { class: 'btn primary small', onclick: () => { Run.takeAll(fu); this.render(); } }, 'เก็บทั้งหมด (F)'));
      GridUI.zone(lcol, src => { if (src.from === 'grid' || src.from === 'slot') { GridUI.removeFromSource(src); Inv.addFree(fu.items, src.entry); return true; } return false; });
      const lg = U.el('div', { class: 'grid' });
      if (!fu.items.length) lg.appendChild(U.el('div', { class: 'emptytxt' }, 'ไม่มีของเหลือ'));
      fu.items.slice().forEach(e => {
        const it = ITEMS[e.id];
        const take = () => {
          const left = Inv.addToPack(p.backpack, e, p.grid);
          if (it.t === 'weapon') { if (!left) fu.items.splice(fu.items.indexOf(e), 1); else if (!p.weapons[CLS_SLOT[it.cls]]) { fu.items.splice(fu.items.indexOf(e), 1); p.weapons[CLS_SLOT[it.cls]] = e; toast('ติดตั้ง ' + it.n); } else toast('เป้เต็ม! จัดเป้ใหม่หรือทิ้งของก่อน', 'warn'); }
          else { if (left === e.q) toast('เป้เต็ม! จัดเป้ใหม่หรือทิ้งของก่อน', 'warn'); e.q = left; if (e.q <= 0) fu.items.splice(fu.items.indexOf(e), 1); }
          this.render();
        };
        const acts = [['เก็บ', take]];
        if (it.t === 'weapon') acts.push(['ติดตั้งเลย', () => { this.equip(e, fu.items); this.render(); }, 'good']);
        if (it.t === 'bag') acts.push([`สวมเลย (${State.gridFor(e.id).c}×${State.gridFor(e.id).r})`, () => { const old = Run.equipBag(e, fu.items); this.loot = old; this.render(); }, 'good']);
        const card = this.itemCard(e, { actions: acts });
        GridUI.makeDraggable(card, { from: 'ext', list: fu.items, entry: e });
        lg.appendChild(card);
      });
      lcol.appendChild(lg);
      cols.appendChild(lcol);
    }
    panel.appendChild(cols);
    o.appendChild(panel);
  },

  openPause() {
    Run.panel = 'pause';
    const o = this.el(); o.className = 'show'; o.innerHTML = '';
    const panel = U.el('div', { class: 'panel small' },
      U.el('h2', null, 'หยุดเกม'),
      U.el('div', { class: 'help' }, U.el('div', { html: `
        <b>วิธีเล่น</b><br>
        • <b>A/D</b> เดิน · <b>W/S</b> ปีนบันได · <b>Shift</b> วิ่ง · <b>Z ค้าง</b> ย่อง<br>• เสียง: ย่อง = เงียบและซอมบี้มองเห็นยากขึ้น · เดิน = ซอมบี้ใกล้ ๆ อาจได้ยิน (~40–60%) · วิ่ง / ค้นของ / เปิดปิดประตู = ได้ยินง่าย (60%+)<br>
        • <b>คลิกซ้าย / Space</b> โจมตี (ปืนเล็งเป้าอัตโนมัติไปทางที่หันอยู่) · <b>เมาส์</b> เลือกทิศที่หัน<br>
        • <b>1 2 3</b> สลับอาวุธ · <b>R</b> รีโหลด<br>
        • <b>Q</b> (หรือ <b>E</b>) ค้นเฟอร์นิเจอร์ — การค้นมีเสียง ขยับ = หยุดค้น · <b>E</b> เปิดดู/ช่วยคน · <b>F</b> เก็บทั้งหมด<br>
        • <b>Tab</b> เปิดเป้<br>
        • <b>จุดอพยพ (แสงสีเขียว)</b> = ยืนรอนับถอยหลังเพื่อกลับฐาน มีที่ถนนฝั่งขวาและลาน ฮ. บนดาดฟ้า<br>• <b>4-9</b> = ปุ่มลัดใช้ไอเทม (จัดเองได้ในเป้ หรือหน้าเตรียมตัวที่ฐาน) · <b>E</b> ที่ประตู = เปิด/ปิด · <b>B ค้าง</b> = เสริมประตู<br>• บอสไม่ต้องสู้ก็ได้ ฆ่าแล้วได้ของดีและกุญแจเข้าพื้นที่หวงห้าม<br>
        • ยิ่งอยู่นาน/ยิงเสียงดัง ระดับอันตรายยิ่งสูง · ถ้าตาย เสียของในเป้และเงินรอบนี้` })),
      U.el('div', { class: 'row' },
        U.el('button', { class: 'btn primary', onclick: () => this.close() }, 'เล่นต่อ'),
        U.el('button', { class: 'btn', onclick: () => UI.openSettings(() => this.openPause()) }, 'ตั้งค่า'),
        U.el('button', { class: 'btn danger', onclick: () => { if (confirm('ทิ้งภารกิจ? จะนับเป็นการตาย (เสียของในเป้)')) { this.close(); Run.die('abandon'); } } }, 'ทิ้งภารกิจ')));
    o.appendChild(panel);
  },

  showResult(success, reason, info) {
    Run.panel = 'result';
    const o = this.el(); o.className = 'show'; o.innerHTML = '';
    const r = Run;
    const title = success ? (info.stageDone ? '🏆 พิชิตด่านสำเร็จ!' : info.cleared ? '✅ เคลียร์ location สำเร็จ!' : '🏠 กลับถึงฐานอย่างปลอดภัย') :
      reason === 'infection' ? '☣ คุณกลายเป็นซอมบี้...' : reason === 'abandon' ? '🏳 ทิ้งภารกิจ' : '💀 คุณตายแล้ว';
    const lines = [];
    if (success) {
      lines.push(`เงินที่ได้: <b class="g">+${U.fmt(r.cash)}</b>`);
      lines.push(`ของในเป้: ${info.items} รายการ ถูกย้ายไปที่ "เตรียมตัว"`);
      if (!r.farm && !info.cleared && r.objectives.length) lines.push(`<span class="w">ยังทำเงื่อนไขไม่ครบ — location นี้ยังไม่เปลี่ยน ลองใหม่อีกครั้ง</span>`);
      if (info.cleared && !info.stageDone) lines.push('location ถัดไปของด่านนี้ปลดล็อกแล้ว');
      if (info.stageDone) { const i = STAGES.indexOf(r.stage); lines.push(STAGES[i + 1] ? `ปลดล็อกด่านใหม่: <b>${STAGES[i + 1].n}</b>` : '<b>คุณกอบกู้โลกสำเร็จ!</b>'); }
      for (const s of info.newSurv) lines.push(`👤 ผู้รอดชีวิตมาถึงฐาน: <b>${s}</b>`);
      for (const b of (r.learned || [])) lines.push(`📘 เรียนรู้พิมพ์เขียวใหม่: <b>${b}</b> — ประกอบได้ที่โรงช่าง`);
    } else {
      lines.push('<span class="w">เสียของทั้งหมดในเป้และเงินที่เก็บได้ในรอบนี้</span>');
      lines.push(`อาวุธที่ถืออยู่ยังอยู่ (ผู้รอดชีวิตลากคุณกลับมา) · พักฟื้นที่ฐานแล้วเลือดเหลือ ${G.chars[G.char].hp}/${CHARACTERS[G.char].hp}`);
      if (r.rescued.length) lines.push('ผู้รอดชีวิตที่ช่วยไว้หนีไปไม่รอด...');
    }
    lines.push(`ฆ่าซอมบี้: ${r.kills} · ค้นของ: ${r.searchCount} จุด · ระดับอันตรายสูงสุด: ${r.level}`);
    if (r.income) lines.push(`ผู้รอดชีวิตที่ฐานหาเงินมาให้ +${r.income}`);
    if (r.dayRep && r.dayRep.lines.length) { lines.push(`<b>— เช้าวันที่ ${G.day} —</b>`); lines.push(...r.dayRep.lines); }
    const objHtml = r.objectives.length ? '<div class="objlist">' + r.objectives.map(ob => `<div class="${ob.done ? 'ok' : 'no'}">${ob.done ? '✔' : '✘'} ${ob.label}</div>`).join('') + '</div>' : '';
    const panel = U.el('div', { class: 'panel small result ' + (success ? 'win' : 'lose') },
      U.el('h2', null, title),
      U.el('div', { class: 'sub' }, `${r.loc.n} · ${r.stage.n}`),
      U.el('div', { html: objHtml }),
      U.el('div', { class: 'lines', html: lines.map(l => `<div>${l}</div>`).join('') }),
      U.el('button', { class: 'btn primary big', onclick: () => { this.close(); Run.map = null; UI.showBase(); } }, 'กลับฐาน'));
    o.appendChild(panel);
  },
};

// auto-pause when the browser tab / window loses focus
(function () {
  const autoPause = () => {
    if (typeof Run === 'undefined' || !Run.active || Run.over || Run.paused || Run.panel === 'pause') return;
    if (typeof Dev !== 'undefined' && Dev.open) return;
    try { UIRun.openPause(); } catch (e) { Run.paused = true; }
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
  window.addEventListener('blur', autoPause);
})();
