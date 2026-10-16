// ---------- Grid backpack UI with drag & drop ----------
const GridUI = {
  CELL: 56,
  grids: [], zones: [], drag: null,
  reset() { this.grids = []; this.zones = []; },

  itemInner(e, w, h) {
    const it = ITEMS[e.id];
    const qty = it.t === 'weapon' ? (it.mag != null ? `${e.mag}/${attMagCap(e)}` : '') : (e.q > 1 ? e.q : '');
    const big = Math.min(w, h) * this.CELL * 0.62;
    const ic = WEAPON_ART[e.id] ? `<div class="gimg" style="${e.rot ? `width:${h * this.CELL - 10}px;height:${w * this.CELL - 10}px;transform:rotate(90deg)` : `width:${w * this.CELL - 10}px;height:${h * this.CELL - 10}px`}"><img src="${Parts.weapon(e.id).img.src}" draggable="false"></div>`
      : `<div class="gic" style="width:${Math.max(28, Math.min(48, big * 1.3))}px;height:${Math.max(28, Math.min(48, big * 1.3))}px">${Art.icon(e.id)}</div>`;
    return ic +
      (w * h >= 2 ? `<div class="gnm">${it.n}${e.lvl ? ' +' + e.lvl : ''}</div>` : '') +
      (qty !== '' ? `<div class="gq">${qty}</div>` : '') +
      (it.t === 'weapon' ? attMini(e) : '');
  },

  // Render a backpack grid. opts: {onChange, onSelect, selected}
  renderGrid(list, g, opts) {
    const C = this.CELL;
    const el = U.el('div', { class: 'bgrid', style: { width: g.c * C + 'px', height: g.r * C + 'px', backgroundSize: `${C}px ${C}px` } });
    const hl = U.el('div', { class: 'ghl' });
    el.appendChild(hl);
    for (const e of list) {
      if (e.gx == null) continue;
      const [w, h] = Inv.dims(e);
      const it = ITEMS[e.id];
      const ie = U.el('div', { class: 'gitem t-' + it.t + (it.rank ? ' rk' + it.rank : '') + (opts.selected === e ? ' sel' : ''), title: it.n + (it.desc ? ' — ' + it.desc : ''), style: { left: e.gx * C + 1 + 'px', top: e.gy * C + 1 + 'px', width: w * C - 2 + 'px', height: h * C - 2 + 'px' } });
      ie.innerHTML = this.itemInner(e, w, h);
      this.makeDraggable(ie, { from: 'grid', list, entry: e, g }, () => opts.onSelect && opts.onSelect(e));
      if (opts.onContext) ie.addEventListener('contextmenu', ev => { ev.preventDefault(); if (!this.drag && !this.splitDown) opts.onContext(e, ev); });
      el.appendChild(ie);
    }
    this.grids.push({ el, hl, list, g, onChange: opts.onChange });
    return el;
  },
  // one pocket (region) of a region grid, drawn as its own little grid; coordinates stay global in the list
  renderRegion(list, g, R, opts) {
    const C = this.CELL;
    const el = U.el('div', { class: 'bgrid', style: { width: R.c * C + 'px', height: R.r * C + 'px', backgroundSize: `${C}px ${C}px` } });
    const hl = U.el('div', { class: 'ghl' }); el.appendChild(hl);
    // torn cells (damaged clothing / armor) can't hold anything
    for (let i = R.c * R.r - (R.torn || 0); i < R.c * R.r; i++)
      el.appendChild(U.el('div', { class: 'gtorn', title: 'ขาด — ซ่อมที่ฐานเพื่อใช้ช่องนี้', style: { left: (i % R.c) * C + 'px', top: Math.floor(i / R.c) * C + 'px', width: C + 'px', height: C + 'px' } }));
    // the next cell to go: tinted red from the bottom as the piece wears down
    if (R.wf > 0.02) {
      const i = R.c * R.r - (R.torn || 0) - 1;
      el.appendChild(U.el('div', { class: 'gwear', title: `กำลังขาด ${Math.round(R.wf * 100)}% — ซ่อมที่ฐานด้วยผ้า`, style: { left: (i % R.c) * C + 'px', top: Math.floor(i / R.c) * C + C * (1 - R.wf) + 'px', width: C + 'px', height: C * R.wf + 'px' } }));
    }
    for (const e of list) {
      if (!Wear.inReg(e, R)) continue;
      const [w, h] = Inv.dims(e), it = ITEMS[e.id];
      const ie = U.el('div', { class: 'gitem t-' + it.t + (it.rank ? ' rk' + it.rank : '') + (opts.selected === e ? ' sel' : ''), title: it.n + (it.desc ? ' — ' + it.desc : ''), style: { left: (e.gx - R.x) * C + 1 + 'px', top: (e.gy - R.y) * C + 1 + 'px', width: w * C - 2 + 'px', height: h * C - 2 + 'px' } });
      ie.innerHTML = this.itemInner(e, w, h);
      this.makeDraggable(ie, { from: 'grid', list, entry: e, g }, () => opts.onSelect && opts.onSelect(e));
      if (opts.onContext) ie.addEventListener('contextmenu', ev => { ev.preventDefault(); if (!this.drag && !this.splitDown) opts.onContext(e, ev); });
      el.appendChild(ie);
    }
    this.grids.push({ el, hl, list, g, ox: R.x, oy: R.y, onChange: opts.onChange });
    return el;
  },
  // register a drop zone. onDrop(src) returns true if handled
  zone(el, onDrop) { el.classList.add('dropzone'); this.zones.push({ el, onDrop }); return el; },

  makeDraggable(el, src, onClick) {
    el.addEventListener('pointerdown', ev => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      // Shift+drag = take half the stack, Ctrl/Cmd+drag = take one
      const e0 = src.entry, stack = Inv.isStack(e0.id) && e0.q > 1;
      src.qty = stack && (ev.ctrlKey || ev.metaKey) ? 1 : stack && ev.shiftKey ? Math.ceil(e0.q / 2) : null;
      this.splitDown = !!(ev.ctrlKey || ev.metaKey);   // on a Mac ctrl+click also fires contextmenu: ignore that one
      const sx = ev.clientX, sy = ev.clientY;
      const r = el.getBoundingClientRect();
      const offX = ev.clientX - r.left, offY = ev.clientY - r.top;
      const move = mv => {
        if (!this.drag && Math.hypot(mv.clientX - sx, mv.clientY - sy) > 5) this.begin(src, offX, offY, mv);
        if (this.drag) this.move(mv);
      };
      const up = uv => {
        setTimeout(() => { this.splitDown = false; }, 0);
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        if (this.drag) this.end(uv); else if (onClick) onClick();
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
  },

  begin(src, offX, offY, ev) {
    const e = src.entry;
    const rot = src.from === 'grid' ? !!e.rot : false;
    const ghost = U.el('div', { class: 'gghost t-' + ITEMS[e.id].t });
    document.body.appendChild(ghost);
    this.drag = { src, ghost, rot, offX, offY };
    this.sizeGhost();
    // keep the grab point inside the ghost
    const C = this.CELL; const [w, h] = this.dragDims();
    this.drag.offX = Math.min(offX, w * C - 8); this.drag.offY = Math.min(offY, h * C - 8);
    this.keyRot = k => { if (k.code === 'KeyR') { this.rotate(); this.move(this.lastEv); } };
    this.ctxRot = c => { c.preventDefault(); if (this.splitDown && c.button !== 2) return; this.rotate(); this.move(this.lastEv); };
    window.addEventListener('keydown', this.keyRot);
    window.addEventListener('contextmenu', this.ctxRot);
  },
  dragDims() { const it = ITEMS[this.drag.src.entry.id]; return this.drag.rot ? [it.gh, it.gw] : [it.gw, it.gh]; },
  sizeGhost() {
    const d = this.drag, C = this.CELL, [w, h] = this.dragDims();
    d.ghost.style.width = w * C + 'px'; d.ghost.style.height = h * C + 'px';
    const e = Object.assign({}, d.src.entry, { rot: d.rot ? 1 : 0 });
    if (d.src.qty) e.q = d.src.qty;
    else if (d.src.from !== 'grid' && Inv.isStack(e.id)) e.q = Math.min(e.q, ITEMS[e.id].st);
    d.ghost.innerHTML = this.itemInner(e, w, h);
  },
  rotate() {
    const it = ITEMS[this.drag.src.entry.id];
    if (it.gw === it.gh) return;
    this.drag.rot = !this.drag.rot;
    const t = this.drag.offX; this.drag.offX = this.drag.offY; this.drag.offY = t;
    this.sizeGhost();
  },
  target(ev) {
    const d = this.drag, C = this.CELL;
    const gl = ev.clientX - d.offX, gt = ev.clientY - d.offY;
    for (const G0 of this.grids) {
      if (!G0.el.isConnected) continue;
      const r = G0.el.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) continue;
      const x = Math.round((gl - r.left) / C) + (G0.ox || 0), y = Math.round((gt - r.top) / C) + (G0.oy || 0);
      return { grid: G0, x, y };
    }
    let best = null, ba = Infinity;   // the smallest zone under the pointer wins (an attachment slot inside a gun card)
    for (const z of this.zones) {
      if (!z.el.isConnected) continue;
      const r = z.el.getBoundingClientRect();
      if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom && r.width * r.height < ba) { best = z; ba = r.width * r.height; }
    }
    return best ? { zone: best } : null;
  },
  // stack merge target under the drop point
  mergeTarget(G0, x, y) {
    const e = this.drag.src.entry;
    if (!Inv.isStack(e.id)) return null;
    const [w, h] = this.dragDims();
    for (const o of G0.list) {
      if (o === e || o.id !== e.id || o.q >= ITEMS[o.id].st) continue;
      const [ow, oh] = Inv.dims(o);
      if (x < o.gx + ow && x + w > o.gx && y < o.gy + oh && y + h > o.gy) return o;
    }
    return null;
  },
  move(ev) {
    if (!this.drag || !ev) return;
    this.lastEv = ev;
    const d = this.drag, C = this.CELL;
    d.ghost.style.left = (ev.clientX - d.offX) + 'px'; d.ghost.style.top = (ev.clientY - d.offY) + 'px';
    for (const G0 of this.grids) G0.hl.style.display = 'none';
    for (const z of this.zones) z.el.classList.remove('hover');
    const t = this.target(ev);
    if (t && t.grid) {
      const [w, h] = this.dragDims();
      const ok = this.mergeTarget(t.grid, t.x, t.y) || Inv.fits(t.grid.list, t.grid.g, d.src.entry, t.x, t.y, d.rot ? 1 : 0, d.src.entry);
      const bad = d.src.noGrid;
      Object.assign(t.grid.hl.style, { display: 'block', left: (t.x - (t.grid.ox || 0)) * C + 'px', top: (t.y - (t.grid.oy || 0)) * C + 'px', width: w * C + 'px', height: h * C + 'px' });
      if (bad) { t.grid.hl.className = 'ghl bad'; return; }
      t.grid.hl.className = 'ghl ' + (ok ? 'ok' : 'bad');
    } else if (t && t.zone) t.zone.el.classList.add('hover');
  },
  end(ev) {
    const d = this.drag;
    window.removeEventListener('keydown', this.keyRot); window.removeEventListener('contextmenu', this.ctxRot);
    d.ghost.remove();
    for (const z of this.zones) z.el.classList.remove('hover');
    const t = this.target(ev);
    this.drag = null;
    if (!t) { if (d.src.onNowhere) d.src.onNowhere(); this.refresh(); return; }
    const src = d.src, e = src.entry, it = ITEMS[e.id];
    const part = src.qty && src.qty < e.q ? src.qty : null;   // split drag (Shift = half, Ctrl = one)
    if (t.zone) {
      if (!part) { const handled = t.zone.onDrop(src); if (!handled && src.onNowhere) src.onNowhere(); this.refresh(); return; }
      // hand the zone a split-off piece; take from the original only what the zone actually used
      const piece = e.u != null ? { id: e.id, q: part, u: e.u } : { id: e.id, q: part }; let gone = false;
      t.zone.onDrop(Object.assign({}, src, { entry: piece, qty: null, remove: () => { gone = true; } }));
      const used = gone ? part : part - piece.q;
      if (used > 0) { e.q -= used; delete e.u; if (e.q <= 0) this.removeFromSource(src); }
      else if (piece.u !== e.u) e.u = piece.u;   // a use was spent from a multi-use item (repair kit)
      this.refresh(); return;
    }
    if (src.noGrid) { if (src.onNowhere) src.onNowhere(); this.refresh(); return; }   // worn clothing can't go into its own pockets
    const G0 = t.grid, rot = d.rot ? 1 : 0;
    if (this.itemDrop) {   // dropped right onto another item (e.g. a sewing kit onto a shirt)
      const r = G0.el.getBoundingClientRect(), cx = Math.floor((ev.clientX - r.left) / this.CELL) + (G0.ox || 0), cy = Math.floor((ev.clientY - r.top) / this.CELL) + (G0.oy || 0);
      const o = G0.list.find(q => q !== e && q.gx != null && (([w, h]) => cx >= q.gx && cy >= q.gy && cx < q.gx + w && cy < q.gy + h)(Inv.dims(q)));
      if (o && this.itemDrop(src, o, G0)) { this.refresh(G0); return; }
    }
    this.drag = d; const merge = this.mergeTarget(G0, t.x, t.y); this.drag = null;
    if (merge) {
      const room = it.st - merge.q;
      const amt = Math.min(room, part || e.q);
      merge.q += amt; e.q -= amt;
      if (e.q <= 0) this.removeFromSource(src);
      this.refresh(G0); return;
    }
    const probe = part ? { id: e.id, q: part } : e;
    if (!Inv.fits(G0.list, G0.g, probe, t.x, t.y, rot, part && src.list === G0.list ? null : e)) { toast('วางตรงนั้นไม่ได้ — พื้นที่ไม่พอ', 'warn'); this.refresh(); return; }
    if (!part && src.from === 'grid' && src.list === G0.list) { e.gx = t.x; e.gy = t.y; e.rot = rot; this.refresh(G0); return; }
    // move (or split) into this grid
    let moved;
    if (part) { moved = { id: e.id, q: part }; e.q -= part; }
    else if (Inv.isStack(e.id) && e.q > it.st) { moved = { id: e.id, q: it.st }; e.q -= it.st; }
    else { moved = e; this.removeFromSource(src); }
    moved.gx = t.x; moved.gy = t.y; moved.rot = rot;
    G0.list.push(moved);
    if (src.onMoved) src.onMoved();
    this.refresh(G0);
  },
  // drag ammo onto a gun: load as many rounds as fit; returns true if it handled the drop (even if nothing fit)
  loadAmmo(w, src) {
    const e = src.entry, it = ITEMS[e.id];
    if (!w || it.t !== 'ammo') return false;
    const wit = ITEMS[w.id];
    if (wit.cls === 'melee' || !wit.ammo) { toast('อาวุธนี้ไม่ใช้กระสุน', 'warn'); return true; }
    if (wit.ammo !== e.id) { toast(`${wit.n} ใช้ ${ITEMS[wit.ammo].n} — ไม่ใช่ ${it.n}`, 'warn'); return true; }
    const cap = wStats(w, G.char).mag, room = cap - (w.mag || 0);
    if (room <= 0) { toast(`${wit.n} กระสุนเต็มแล้ว (${w.mag}/${cap})`); return true; }
    const n = Math.min(room, e.q);
    w.mag = (w.mag || 0) + n; e.q -= n;
    if (e.q <= 0) this.removeFromSource(src);
    if (typeof Snd !== 'undefined' && Snd.reload) Snd.reload(1);
    toast(`บรรจุ ${it.n} ${n} นัดเข้า ${wit.n} (${w.mag}/${cap})`, 'good');
    return true;
  },
  // small right-click menu: items = [[label, fn, kind]]
  ctxMenu(ev, title, items) {
    this.closeMenu();
    const m = U.el('div', { class: 'ctxmenu' }); if (title) m.appendChild(U.el('div', { class: 'cm-t' }, title));
    for (const [label, fn, kind] of items) m.appendChild(U.el('button', { class: 'cm-i ' + (kind || ''), onclick: e2 => { e2.stopPropagation(); this.closeMenu(); fn(); } }, label));
    document.body.appendChild(m);
    const r = m.getBoundingClientRect();
    m.style.left = Math.min(ev.clientX, innerWidth - r.width - 6) + 'px'; m.style.top = Math.min(ev.clientY, innerHeight - r.height - 6) + 'px';
    this.menu = m;
    setTimeout(() => { this._close = e3 => { if (!m.contains(e3.target)) this.closeMenu(); }; addEventListener('pointerdown', this._close, true); }, 0);
  },
  // ---- item info popup (right-click → ข้อมูล) ----
  infoLines(e) {
    const it = ITEMS[e.id], L = [];
    const row = (k, v) => L.push([k, v]);
    row('ประเภท', (TYPE_LABEL[it.t] || it.t) + (it.t === 'weapon' ? ' · ' + SLOT_LABEL[CLS_SLOT[it.cls]] : ''));
    row('ขนาดในเป้', `${it.gw}×${it.gh} ช่อง` + (it.st > 1 ? ` · ซ้อนได้ ${it.st}` : ''));
    if (it.t === 'weapon') {
      const ch = typeof G !== 'undefined' && G ? G.char : Object.keys(CHARACTERS)[0], s = wStats(e, ch);
      row('ความแรง', `${Math.round(s.dmg)}${it.pellets ? ' × ' + it.pellets + ' ลูก' : ''} ต่อครั้ง` + (e.lvl ? ` (อัปเกรด +${e.lvl})` : ''));
      row('ความเร็ว', `${(1 / s.rate).toFixed(1)} ครั้ง/วินาที` + (it.auto ? ' · ยิงรัวได้' : ''));
      if (it.cls === 'melee') row('ระยะ', `${Math.round(s.range || it.range)} (ประชิด)`);
      else {
        { const pack = typeof Run !== 'undefined' && Run.active ? Run.p.backpack : G.backpack; row('ใช้กระสุน', `${ITEMS[it.ammo].n}  (ในเป้ ${Inv.count(pack, it.ammo)}` + (Run.active ? ')' : ` · ในคลัง ${Inv.count(G.stash, it.ammo)})`)); }
        row('แม็กกาซีน', `${e.mag ?? 0}/${s.mag} นัด · รีโหลด ${s.reload.toFixed(1)} วิ`);
        row('ระยะยิง', `${it.range}` + (it.pierce ? ` · ทะลุ ${it.pierce} ตัว` : ''));
        row('เสียง', it.noise >= 800 ? 'ดังมาก' : it.noise >= 600 ? 'ดัง' : it.noise >= 300 ? 'ปานกลาง' : 'เงียบ');
      }
      row('ความทน', `${Math.ceil(dur(e))}%` + (e.rep ? ` · ซ่อมแล้ว ${e.rep}/5 ครั้ง` : '') + (repairCap(e) > 0 ? ` · ซ่อมได้สูงสุด ${repairCap(e)}%` : ' · ซ่อมไม่ได้แล้ว'));
      const att = e.att && Object.values(e.att).filter(Boolean);
      if (att && att.length) row('อุปกรณ์เสริม', att.map(a => ITEMS[a].n).join(', '));
    }
    if (it.t === 'ammo') { const guns = Object.keys(ITEMS).filter(k => ITEMS[k].t === 'weapon' && ITEMS[k].ammo === e.id).map(k => ITEMS[k].n); row('ใช้กับ', guns.join(', ') || '-'); }
    if (it.t === 'med') { if (it.heal) row('ฟื้นเลือด', `+${it.heal}` + (it.regen ? ` แล้วค่อยๆ ฟื้นอีก ${it.regen}` : '')); if (it.cure) row('ลดการติดเชื้อ', `${it.cure}%`); row('เวลาใช้', it.use ? `${it.use} วิ (โดนตี/วิ่ง/โจมตี = ยกเลิก)` : 'ทันที'); }
    if (it.t === 'food') { row('อิ่ม', `+${it.food}`); if (it.heal) row('ฟื้นเลือด', `+${it.heal}`); }
    if (it.t === 'attach' && it.fits) row('ใช้กับ', it.fits.map(k => ITEMS[k].n).join(', '));
    if (it.t === 'attach' && it.rank) { row('ระดับ', `${'★'.repeat(it.rank)}${'☆'.repeat(3 - it.rank)}`); if (it.rank < 3) row('อัปเกรด', 'ที่ฐาน: คลิกขวาที่ของในคลัง → อัปเกรด'); }
    if (it.uses) row('ใช้ได้', `${e.u ?? it.uses}/${it.uses} ครั้ง (ชิ้นบนสุด)` + (e.q > 1 ? ` · มีทั้งหมด ${e.q} ชิ้น` : ''));
    if (it.t === 'armor') { row('ความแข็ง', `${armorPct(e)}% — รับความเสียหายแทนเลือดจนเหลือ 0% และกันการติดเชื้อตอนยังเหลือ`); row('น้ำหนัก', it.slow ? `เดินช้าลง ${Math.round(it.slow * 100)}%` : 'เบา ไม่ถ่วง'); row('ซ่อม', 'ที่ฐาน: คลิกขวา → ซ่อมเกราะ หรือลากชุดซ่อมมาวาง'); }
    if (it.t === 'bag' && typeof State !== 'undefined') { const g = State.gridFor(e.id); row('ความจุ', `${g.c}×${g.r} = ${g.c * g.r} ช่อง`); }
    if (it.v) row('มูลค่า', `ประมาณ ${U.fmt(it.v)} 💵`);
    return L;
  },
  showInfo(e) {
    this.closeMenu(); this.closeInfo();
    const it = ITEMS[e.id];
    const box = U.el('div', { class: 'iteminfo' });
    box.innerHTML = `<div class="ii-h"><div class="ii-ic">${Art.icon(e.id)}</div><div><b>${it.n}${e.lvl ? ' +' + e.lvl : ''}</b>${e.q > 1 ? ` <span>×${e.q}</span>` : ''}</div></div>` +
      (it.desc ? `<div class="ii-d">${it.desc}</div>` : '') +
      `<table>${this.infoLines(e).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table><div class="ii-f">คลิกที่ไหนก็ได้เพื่อปิด</div>`;
    document.body.appendChild(box); this.info = box;
    setTimeout(() => { this._infoClose = () => this.closeInfo(); addEventListener('pointerdown', this._infoClose, true); this._infoKey = k => { if (k.code === 'Escape') this.closeInfo(); }; addEventListener('keydown', this._infoKey, true); }, 0);
  },
  // hover popup: same content as showInfo, follows the card, never blocks clicks
  hoverable(el, e) {
    let t = 0;
    el.addEventListener('mouseenter', ev => { clearTimeout(t); t = setTimeout(() => { if (!this.info && !this.drag && el.isConnected) this.showHover(e, el); }, 250); });
    el.addEventListener('mouseleave', () => { clearTimeout(t); this.hideHover(); });
  },
  showHover(e, el) {
    this.hideHover();
    const it = ITEMS[e.id], box = U.el('div', { class: 'iteminfo hover' });
    box.innerHTML = `<div class="ii-h"><div class="ii-ic">${Art.icon(e.id)}</div><div><b>${it.n}${e.lvl ? ' +' + e.lvl : ''}</b>${e.q > 1 ? ` <span>×${e.q}</span>` : ''}</div></div>` +
      (it.desc ? `<div class="ii-d">${it.desc}</div>` : '') + `<table>${this.infoLines(e).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
    document.body.appendChild(box); this.hover = box;
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    let x = r.right + 8; if (x + b.width > innerWidth - 8) x = r.left - b.width - 8; if (x < 8) x = 8;
    let y = r.top; if (y + b.height > innerHeight - 8) y = innerHeight - b.height - 8;
    Object.assign(box.style, { left: x + 'px', top: Math.max(8, y) + 'px', transform: 'none' });
  },
  hideHover() { if (this.hover) { this.hover.remove(); this.hover = null; } },
  closeInfo() { if (this.info) { this.info.remove(); this.info = null; } if (this._infoClose) { removeEventListener('pointerdown', this._infoClose, true); removeEventListener('keydown', this._infoKey, true); this._infoClose = null; } },
  closeMenu() { if (this.menu) { this.menu.remove(); this.menu = null; } if (this._close) { removeEventListener('pointerdown', this._close, true); this._close = null; } },
  removeFromSource(src) {
    if (src.remove) { src.remove(); return; }
    const i = src.list.indexOf(src.entry); if (i >= 0) src.list.splice(i, 1);
  },
  refresh() { if (this.onRefresh) this.onRefresh(); },
};
