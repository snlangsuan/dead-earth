// ---------- Grid backpack UI with drag & drop ----------
const GridUI = {
  CELL: 56,
  grids: [], zones: [], drag: null,
  reset() { this.grids = []; this.zones = []; },

  itemInner(e, w, h) {
    const it = ITEMS[e.id];
    const qty = it.t === 'weapon' ? (it.mag != null ? `${e.mag}/${it.mag}` : '') : (e.q > 1 ? e.q : '');
    const big = Math.min(w, h) * this.CELL * 0.62;
    const ic = WEAPON_ART[e.id] ? `<div class="gimg" style="${e.rot ? `width:${h * this.CELL - 10}px;height:${w * this.CELL - 10}px;transform:rotate(90deg)` : `width:${w * this.CELL - 10}px;height:${h * this.CELL - 10}px`}"><img src="${Parts.weapon(e.id).img.src}" draggable="false"></div>`
      : `<div class="gic" style="width:${Math.max(28, Math.min(48, big * 1.3))}px;height:${Math.max(28, Math.min(48, big * 1.3))}px">${Art.icon(e.id)}</div>`;
    return ic +
      (w * h >= 2 ? `<div class="gnm">${it.n}${e.lvl ? ' +' + e.lvl : ''}</div>` : '') +
      (qty !== '' ? `<div class="gq">${qty}</div>` : '');
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
      const ie = U.el('div', { class: 'gitem t-' + it.t + (opts.selected === e ? ' sel' : ''), title: it.n + (it.desc ? ' — ' + it.desc : ''), style: { left: e.gx * C + 1 + 'px', top: e.gy * C + 1 + 'px', width: w * C - 2 + 'px', height: h * C - 2 + 'px' } });
      ie.innerHTML = this.itemInner(e, w, h);
      this.makeDraggable(ie, { from: 'grid', list, entry: e, g }, () => opts.onSelect && opts.onSelect(e));
      if (opts.onContext) ie.addEventListener('contextmenu', ev => { ev.preventDefault(); if (!this.drag) opts.onContext(e, ev); });
      el.appendChild(ie);
    }
    this.grids.push({ el, hl, list, g, onChange: opts.onChange });
    return el;
  },
  // register a drop zone. onDrop(src) returns true if handled
  zone(el, onDrop) { el.classList.add('dropzone'); this.zones.push({ el, onDrop }); return el; },

  makeDraggable(el, src, onClick) {
    el.addEventListener('pointerdown', ev => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      const sx = ev.clientX, sy = ev.clientY;
      const r = el.getBoundingClientRect();
      const offX = ev.clientX - r.left, offY = ev.clientY - r.top;
      const move = mv => {
        if (!this.drag && Math.hypot(mv.clientX - sx, mv.clientY - sy) > 5) this.begin(src, offX, offY, mv);
        if (this.drag) this.move(mv);
      };
      const up = uv => {
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
    this.ctxRot = c => { c.preventDefault(); this.rotate(); this.move(this.lastEv); };
    window.addEventListener('keydown', this.keyRot);
    window.addEventListener('contextmenu', this.ctxRot);
  },
  dragDims() { const it = ITEMS[this.drag.src.entry.id]; return this.drag.rot ? [it.gh, it.gw] : [it.gw, it.gh]; },
  sizeGhost() {
    const d = this.drag, C = this.CELL, [w, h] = this.dragDims();
    d.ghost.style.width = w * C + 'px'; d.ghost.style.height = h * C + 'px';
    const e = Object.assign({}, d.src.entry, { rot: d.rot ? 1 : 0 });
    if (d.src.from !== 'grid' && Inv.isStack(e.id)) e.q = Math.min(e.q, ITEMS[e.id].st);
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
      const x = Math.round((gl - r.left) / C), y = Math.round((gt - r.top) / C);
      return { grid: G0, x, y };
    }
    for (const z of this.zones) {
      if (!z.el.isConnected) continue;
      const r = z.el.getBoundingClientRect();
      if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) return { zone: z };
    }
    return null;
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
      Object.assign(t.grid.hl.style, { display: 'block', left: t.x * C + 'px', top: t.y * C + 'px', width: w * C + 'px', height: h * C + 'px' });
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
    if (!t) { this.refresh(); return; }
    const src = d.src, e = src.entry, it = ITEMS[e.id];
    if (t.zone) { if (t.zone.onDrop(src)) this.refresh(); else this.refresh(); return; }
    const G0 = t.grid, rot = d.rot ? 1 : 0;
    this.drag = d; const merge = this.mergeTarget(G0, t.x, t.y); this.drag = null;
    if (merge) {
      const room = it.st - merge.q;
      const amt = Math.min(room, e.q);
      merge.q += amt; e.q -= amt;
      if (e.q <= 0) this.removeFromSource(src);
      this.refresh(G0); return;
    }
    if (!Inv.fits(G0.list, G0.g, e, t.x, t.y, rot, e)) { toast('วางตรงนั้นไม่ได้ — พื้นที่ไม่พอ', 'warn'); this.refresh(); return; }
    if (src.from === 'grid' && src.list === G0.list) { e.gx = t.x; e.gy = t.y; e.rot = rot; this.refresh(G0); return; }
    // move from other list into this grid
    let moved;
    if (Inv.isStack(e.id) && e.q > it.st) { moved = { id: e.id, q: it.st }; e.q -= it.st; }
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
  closeMenu() { if (this.menu) { this.menu.remove(); this.menu = null; } if (this._close) { removeEventListener('pointerdown', this._close, true); this._close = null; } },
  removeFromSource(src) {
    if (src.remove) { src.remove(); return; }
    const i = src.list.indexOf(src.entry); if (i >= 0) src.list.splice(i, 1);
  },
  refresh() { if (this.onRefresh) this.onRefresh(); },
};
