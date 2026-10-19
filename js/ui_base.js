// ---------- Menus & base ----------
const RECIPES = {
  doctor: [
    { out: ['bandage', 3], cost: { cloth: 2 } },
    { out: ['pills', 2], cost: { chem: 1 } },
    { out: ['medkit', 1], cost: { bandage: 2, chem: 1 } },
    { out: ['antiviral', 1], cost: { chem: 3, elec: 1 }, money: 100 },
  ],
  engineer: [
    { out: ['a9', 30], cost: { scrap: 2, chem: 1 } },
    { out: ['a12', 12], cost: { scrap: 3, chem: 1 } },
    { out: ['a556', 30], cost: { scrap: 3, chem: 2 } },
    { out: ['a44', 12], cost: { scrap: 3, chem: 2 } },
    { out: ['bolt', 10], cost: { scrap: 3 } },
    { out: ['grenade', 1], cost: { scrap: 2, chem: 2 } },
    { out: ['repairkit', 1], cost: { scrap: 5, gunparts: 2 } },
    { out: ['pipebomb', 2], cost: { scrap: 2, chem: 1 } },
    { out: ['spiketrap', 1], cost: { nails: 4, plank: 1 } },
    { out: ['mine', 1], cost: { scrap: 2, chem: 2, nails: 2 } },
    { out: ['grip', 1], cost: { gunparts: 2, scrap: 3 } },
    { out: ['extmag', 1], cost: { gunparts: 3, scrap: 4 } },
    { out: ['silencer', 1], cost: { gunparts: 4, scrap: 3 }, money: 150 },
    { out: ['scope', 1], cost: { gunparts: 3, elec: 2 }, money: 150 },
    { out: ['p_spring', 2], cost: { scrap: 2 } },
    { out: ['p_handle', 1], cost: { scrap: 1, cloth: 1 } },
  ],
  cook: [
    { out: ['stew', 1], cost: { canned: 2, water: 1 } },
    { out: ['mre', 1], cost: { canned: 1, bar: 2, water: 1 } },
    { out: ['canned', 1], cost: { bar: 2 } },
  ],
};

// line icons for tabs / chips (stroke uses currentColor)
const _ui = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const UI_ICONS = {
  map: _ui('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  load: _ui('<path d="M7 8V6a5 5 0 0110 0v2"/><rect x="4" y="8" width="16" height="13" rx="2"/><path d="M9 13h6M4 13h2M18 13h2"/>'),
  craft: _ui('<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
  shop: _ui('<path d="M3 4h2l2.4 11h11L21 7H6"/><circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/>'),
  surv: _ui('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 1.8 6 5"/>'),
  chars: _ui('<circle cx="12" cy="6" r="3"/><path d="M12 9v7M8 12h8M9 22l3-6 3 6"/>'),
  day: _ui('<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  heart: _ui('<path d="M12 20s-8-4.6-8-10.2A4.5 4.5 0 0112 7a4.5 4.5 0 018 2.8C20 15.4 12 20 12 20z"/>'),
};
const UI = {
  tab: 'map', sel: null, shopMode: 'buy', stashFilter: 'all',
  scr() { return document.getElementById('screen'); },
  hideScreen() { this.scr().innerHTML = ''; this.scr().className = ''; },

  // ----- title -----
  showTitle() {
    Run.active = false; Run.map = null; MenuFX.mode = 'title'; Music.setMode('title');
    const s = this.scr(); s.className = 'show title'; s.innerHTML = '';
    s.appendChild(U.el('div', { class: 'titlebox' },
      U.el('div', { class: 'logo' }, 'DEAD EARTH'),
      U.el('div', { class: 'logo2' }, 'โลกหลังวันสิ้นโลก'),
      U.el('div', { class: 'tag' }, 'ออกสำรวจทั่วโลก ค้นหาเสบียง ช่วยผู้รอดชีวิต และเอาชีวิตรอดจากฝูงซอมบี้'),
      State.hasSave() ? U.el('button', { class: 'btn primary big', onclick: () => { State.load(); this.showBase(); } }, 'เล่นต่อ') : null,
      U.el('button', { class: 'btn big' + (State.hasSave() ? '' : ' primary'), onclick: () => { if (!State.hasSave()) this.showCharSelect(); else this.ask('เริ่มเกมใหม่?', 'เซฟเดิมจะถูกลบทั้งหมด — ของในคลัง ผู้รอดชีวิต และความคืบหน้า', 'เริ่มใหม่', () => this.showCharSelect(), true); } }, 'เริ่มเกมใหม่'),
      U.el('button', { class: 'btn big', onclick: () => this.openSettings() }, 'ตั้งค่า'),
      U.el('div', { class: 'foot' }, 'แนะนำให้เล่นด้วยคีย์บอร์ด + เมาส์  ·  กด M ปิด/เปิดเสียง  ·  v0.9')));
  },
  showCharSelect() {
    const s = this.scr(); s.className = 'show title'; s.innerHTML = ''; MenuFX.mode = 'title';
    const wrap = U.el('div', { class: 'charselect' }, U.el('h1', null, 'เลือกตัวละครตั้งต้น'), U.el('p', { class: 'sub' }, 'ตัวละครอื่นๆ จะปลดล็อกได้เมื่อช่วยเหลือพวกเขาในด่าน'));
    const row = U.el('div', { class: 'cards' });
    for (const id of ['jake', 'maya', 'ton']) {
      const c = CHARACTERS[id];
      row.appendChild(U.el('div', { class: 'ccard' },
        this.charPortrait(id, 120),
        U.el('h3', null, c.n), U.el('div', { class: 'ttl' }, c.title),
        this.statLines(c),
        U.el('div', { class: 'perk' }, '★ ' + c.perk),
        U.el('div', { class: 'kit' }, 'อุปกรณ์เริ่มต้น: ' + [...c.kit.w.filter(Boolean).map(w => ITEMS[w].n), ...c.kit.items.map(([i, q]) => ITEMS[i].n + ' ×' + q)].join(', ')),
        U.el('button', { class: 'btn primary', onclick: () => { State.newGame(id); this.tab = 'map'; this.sel = STAGES[0].id; this.showBase(); if (!G.tut) toast('ยินดีต้อนรับสู่ฐาน! เลือกด่านบนแผนที่โลกเพื่อออกสำรวจ', 'big'); } }, 'เลือก ' + c.n)));
    }
    wrap.appendChild(row);
    wrap.appendChild(U.el('button', { class: 'btn ghost', onclick: () => this.showTitle() }, '← กลับ'));
    s.appendChild(wrap);
  },
  statLines(c) {
    return U.el('div', { class: 'stats' },
      this.statBar('เลือด', c.hp, 190), this.statBar('ความเร็ว', c.spd, 200), this.statBar('ขนาดเป้', c.grid[0] * c.grid[1], 26));
  },
  statBar(label, v, max) { return U.el('div', { class: 'sbar' }, U.el('span', null, label), U.el('div', null, U.el('i', { style: { width: (v / max * 100) + '%' } })), U.el('b', null, v)); },
  charPortrait(id, size, locked) {
    const c = document.createElement('canvas'); c.width = size * 2; c.height = size * 2; c.style.width = size + 'px'; c.style.height = size + 'px'; c.className = 'portrait';
    const ctx = c.getContext('2d'); const save = R.ctx; R.ctx = ctx;
    ctx.scale(2, 2);
    ctx.translate(size / 2 - size * 0.06, size * 0.95); ctx.scale(size / 92, size / 92);
    const full = Override.get('char_' + id);
    if (full) { const k = 88 / full.naturalHeight; ctx.drawImage(full, -full.naturalWidth * k / 2 + 6, -88, full.naturalWidth * k, 88); }
    else R.drawHuman(0, 0, { rig: Art.char(id), facing: 1, pack: true, weapon: CHARACTERS[id].kit.w[2] || CHARACTERS[id].kit.w[1] || CHARACTERS[id].kit.w[0], scale: 1 });
    if (locked) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(8,10,14,0.94)'; ctx.fillRect(0, 0, c.width, c.height); ctx.globalCompositeOperation = 'source-over'; }
    R.ctx = save;
    return c;
  },

  // themed yes/no dialog (instead of the browser's confirm): its own layer so it can sit over any panel
  ask(title, body, okLabel, onOk, danger) {
    let d = document.getElementById('dlg'); if (!d) { d = U.el('div', { id: 'dlg' }); document.body.appendChild(d); }
    const close = () => { d.className = ''; d.innerHTML = ''; removeEventListener('keydown', key, true); };
    const ok = () => { close(); onOk(); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } else if (e.key === 'Enter') { e.stopPropagation(); ok(); } };
    d.innerHTML = ''; d.className = 'show';
    d.appendChild(U.el('div', { class: 'panel small dlgp' },
      U.el('h2', null, title),
      body ? U.el('div', { class: 'lines' }, ...String(body).split('\n').map(t => U.el('div', null, t))) : null,
      U.el('div', { class: 'row' },
        U.el('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: ok }, okLabel || 'ตกลง'),
        U.el('button', { class: 'btn ghost', onclick: close }, 'ยกเลิก'))));
    addEventListener('keydown', key, true);
  },

  // ----- settings (audio + display), shared by title, base and the pause menu -----
  openSettings(onClose) {
    const o = document.getElementById('overlay'); o.className = 'show'; o.innerHTML = '';
    const v = Settings.v;
    const slider = (key, label) => {
      const val = U.el('b', null, Math.round(v[key] * 100) + '%');
      const inp = U.el('input', { type: 'range', min: 0, max: 100, value: Math.round(v[key] * 100) });
      inp.addEventListener('input', () => { v[key] = inp.value / 100; val.textContent = inp.value + '%'; Settings.save(); });
      inp.addEventListener('change', () => { if (key === 'sfx' || key === 'master') { Snd.last.found = 0; Snd.found(true); } });
      return U.el('div', { class: 'setrow' }, U.el('span', null, label), inp, val);
    };
    const toggle = (key, label, inv) => {
      const b = U.el('button', { class: 'tgl' + ((inv ? !v[key] : v[key]) ? ' on' : '') }, (inv ? !v[key] : v[key]) ? 'เปิด' : 'ปิด');
      b.onclick = () => { v[key] = !v[key]; Settings.save(); const on = inv ? !v[key] : v[key]; b.className = 'tgl' + (on ? ' on' : ''); b.textContent = on ? 'เปิด' : 'ปิด'; };
      return U.el('div', { class: 'setrow' }, U.el('span', null, label), U.el('i'), b);
    };
    // GPU renderer switch (WebGL needs the game served over http(s), not opened as a file)
    const gpuRow = () => {
      if (!window.Gfx || !Gfx.ok) return U.el('div', { class: 'setrow' }, U.el('span', null, 'เรนเดอร์ด้วยการ์ดจอ (GPU)'), U.el('i'), U.el('small', { class: 'dim' }, window.Gfx && Gfx.why === 'file' ? 'ใช้ไม่ได้เมื่อเปิดเป็นไฟล์' : 'เครื่องนี้ไม่รองรับ'));
      if (v.gpu === undefined) v.gpu = true;
      const r = toggle('gpu', 'เรนเดอร์ด้วยการ์ดจอ (GPU)'); r.querySelector('button').addEventListener('click', () => Gfx.setOn(v.gpu)); return r;
    };
    const close = () => { Keys.capture = null; o.className = ''; o.innerHTML = ''; if (onClose) onClose(); };
    // key bindings: click a key, press the new one (Esc = cancel); taking another action's key swaps them
    const keyGrid = U.el('div', { class: 'keygrid' });
    const drawKeys = () => {
      keyGrid.innerHTML = '';
      for (const [a, , label] of Keys.ACTIONS) {
        const b = U.el('button', { class: 'keyb' + (Keys.bind[a] ? ' chg' : '') }, Keys.lbl(a));
        b.onclick = () => {
          if (Keys.capture) Keys.capture.cancel();
          b.textContent = 'กดปุ่ม…'; b.classList.add('wait');
          const on = ev => { ev.preventDefault(); ev.stopPropagation(); done(); if (ev.code !== 'Escape') { Keys.set(a, ev.code); Snd.ui && Snd.ui(); } drawKeys(); };
          const done = () => { removeEventListener('keydown', on, true); Keys.capture = null; };
          Keys.capture = { cancel: () => { done(); drawKeys(); } };
          addEventListener('keydown', on, true);
        };
        keyGrid.appendChild(U.el('div', { class: 'keyrow' }, U.el('span', null, label), b));
      }
    };
    drawKeys();
    // tabs: sound / display / controls
    const TABS = [
      ['snd', 'เสียง', () => [toggle('mute', 'เสียงทั้งหมด', true), slider('master', 'ระดับเสียงหลัก'), slider('music', 'เพลงประกอบ'), slider('sfx', 'เสียงเอฟเฟกต์')]],
      ['gfx', 'การแสดงผล', () => [toggle('shake', 'หน้าจอสั่นเมื่อยิง/ระเบิด'), toggle('dmgNums', 'แสดงตัวเลขดาเมจ'), gpuRow()]],
      ['keys', 'ปุ่มควบคุม', () => [U.el('div', { class: 'keyhead' }, U.el('span', { class: 'hint' }, 'คลิกปุ่มแล้วกดปุ่มใหม่ · Esc ยกเลิก'), U.el('button', { class: 'btn small ghost', onclick: () => { Keys.reset(); drawKeys(); } }, 'ค่าเริ่มต้น')), keyGrid]],
    ];
    if (!TABS.some(t => t[0] === this.setTab)) this.setTab = 'snd';
    const tabRow = U.el('div', { class: 'settabs' }), pane = U.el('div', { class: 'setpane' });
    const show = k => {
      if (Keys.capture) Keys.capture.cancel();
      this.setTab = k; pane.innerHTML = '';
      for (const el of TABS.find(t => t[0] === k)[2]()) pane.appendChild(el);
      [...tabRow.children].forEach(b => b.classList.toggle('on', b.dataset.k === k));
    };
    for (const [k, label] of TABS) tabRow.appendChild(U.el('button', { class: 'settab', 'data-k': k, onclick: () => show(k) }, label));
    o.appendChild(U.el('div', { class: 'panel settings' },
      U.el('h2', null, 'ตั้งค่า'), tabRow, pane,
      U.el('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '14px' } }, U.el('button', { class: 'btn primary', onclick: close }, 'เสร็จ'))));
    show(this.setTab);
  },

  // ----- base -----
  showBase() {
    Run.active = false;
    if (!this.sel || !G.unlocked[this.sel]) this.sel = this.latestStage();
    this.renderBase();
  },
  latestStage() { let last = STAGES[0].id; for (const s of STAGES) if (G.unlocked[s.id]) last = s.id; return last; },
  renderBase() {
    GridUI.closeMenu();
    GridUI.reset();
    const s = this.scr(); s.className = 'show base'; s.innerHTML = ''; MenuFX.mode = 'base'; Music.setMode('base');
    const ch = CHARACTERS[G.char], cs = G.chars[G.char];
    const chip = (cls, icon, txt, tip) => { const d = U.el('div', { class: 'chip ' + cls }); d.innerHTML = icon; d.appendChild(document.createTextNode(txt)); if (tip) d.title = tip; return d; };
    const dl = Days.daysLeft(), evN = { merchant: '🧳 พ่อค้าเร่', raid: '🧟 ถูกบุก', wanderer: '🚶 มีคนแวะ', rain: '🌧 ฝนตก', boom: '💰 ตลาดคึกคัก' }[G.dayEvent];
    const top = U.el('div', { class: 'topbar' },
      U.el('div', { class: 'brand' }, 'DEAD EARTH'),
      chip('', UI_ICONS.day, `วันที่ ${G.day}` + (Days.worldLevel() > 1 ? ` · ☠${Days.worldLevel()}` : '') + (evN ? ` · ${evN}` : ''), `ทุกครั้งที่กลับฐานผ่านไป 1 วัน\nโลกอันตรายขึ้นตามวัน: ด่านเริ่มที่ระดับอันตราย ${Days.worldLevel()}\nบางวันมีเหตุการณ์สุ่ม (พ่อค้าเร่ ฝูงซอมบี้บุก ฯลฯ)`),
      chip(G.day <= GRACE_DAYS ? '' : dl < 2 ? 'warn' : '', Art.icon('canned'), G.day <= GRACE_DAYS ? `เสบียง (ตั้งตัว)` : `เสบียง ${dl} วัน`, `ฐานมี ${Days.mouths()} คน · ใช้อาหาร ${Days.needFood()} หน่วย + น้ำ ${Days.needWater()} ขวด ต่อวัน (จากคลัง)\nขาด = ไม่ได้พักฟื้น รายได้ลดครึ่ง และหิว 3 วันติดผู้รอดชีวิตจะหนี` + (G.day <= GRACE_DAYS ? `\nเริ่มใช้เสบียงหลังวันที่ ${GRACE_DAYS}` : '')),
      chip('money', Art.icon('cash'), U.fmt(G.money)),
      chip('', UI_ICONS.heart, `${ch.n} · ${cs.hp}/${ch.hp}` + (cs.inf ? ` · ☣ ${cs.inf}%` : '')),
      chip('', UI_ICONS.surv, `ผู้รอดชีวิต ${G.survivors.length + G.unlockedChars.length - 1}`),
      U.el('div', { class: 'spacer' }),
      U.el('button', { class: 'btn ghost small', onclick: () => this.openSettings() }, '⚙ ตั้งค่า'),
      U.el('button', { class: 'btn ghost small', onclick: () => { State.save(); this.showTitle(); } }, 'เมนูหลัก'));
    const tabs = U.el('div', { class: 'tabs' });
    for (const [k, label] of [['map', 'แผนที่โลก'], ['load', 'เตรียมตัว'], ['craft', 'โรงช่าง'], ['shop', 'ร้านค้า'], ['surv', 'ผู้รอดชีวิต'], ['chars', 'ตัวละคร']]) {
      const b = U.el('button', { class: 'tab' + (this.tab === k ? ' on' : ''), 'data-tab': k, onclick: () => { this.tab = k; this.renderBase(); } });
      b.innerHTML = UI_ICONS[k]; b.appendChild(document.createTextNode(label)); tabs.appendChild(b);
    }
    const body = U.el('div', { class: 'tbody' });
    s.append(top, tabs);
    for (const c of Days.pending()) {
      const dl = Days.daysLeftWith(1, c);
      s.appendChild(U.el('div', { class: 'recruit' },
        U.el('span', { class: 'ri' }, '👤'),
        U.el('div', { class: 'rt' }, U.el('b', null, `${c.name} ขอเข้าร่วมฐาน`), U.el('small', null, `${c.how} · นิสัย: ${Days.traitTxt(c)} · ถ้ารับ เสบียงจะพอ ~${dl} วัน (ฐาน ${Days.mouths() + 1} คน)`)),
        U.el('button', { class: 'btn small primary', onclick: () => { Days.accept(c); toast(`${c.name} เข้าร่วมฐานแล้ว`, 'good'); State.save(); this.renderBase(); } }, 'รับเข้าฐาน'),
        U.el('button', { class: 'btn small', onclick: () => { Days.refuse(c); toast(`ปฏิเสธ ${c.name}`); State.save(); this.renderBase(); } }, 'ปฏิเสธ')));
    }
    s.appendChild(body);
    ({ map: () => this.renderMap(body), load: () => this.renderLoadout(body), shop: () => this.renderShop(body), craft: () => this.renderWorkshop(body), surv: () => this.renderSurv(body), chars: () => this.renderChars(body) })[this.tab]();
  },

  // ----- world map -----
  renderMap(body) {
    const wrap = U.el('div', { class: 'mapwrap' });
    const cv = U.el('canvas', { class: 'worldmap' });
    const side = U.el('div', { class: 'mapside' });
    wrap.append(cv, side);
    body.appendChild(wrap);
    this.mapCv = cv; this.mapSide = side; this.hover = null;
    cv.addEventListener('mousemove', e => { const b = cv.getBoundingClientRect(); this.mouseMap = { x: e.clientX - b.left, y: e.clientY - b.top }; });
    cv.addEventListener('mouseleave', () => { this.mouseMap = null; });
    cv.addEventListener('click', () => { if (this.hover && (G.unlocked[this.hover.id])) { this.sel = this.hover.id; this.renderSide(); } else if (this.hover) { const t = KeyGraph.stageTarget(this.hover.id), i = STAGES.indexOf(this.hover); toast(t && !KeyGraph.opened(t) && (i === 0 || G.completed[STAGES[i - 1].id]) ? `🔒 ด่านนี้ต้องใช้ ${ITEMS[t.id].n} — ${KeyGraph.where(t)}` : 'ด่านนี้ยังล็อกอยู่ — ผ่านด่านก่อนหน้าก่อน' + (t && !KeyGraph.opened(t) ? ` และต้องมี ${ITEMS[t.id].n}` : '')); } });
    this.renderSide();
  },
  proj(lon, lat, w, h) { return { x: (lon + 180) / 360 * w, y: (84 - lat) / 170 * h }; },
  tickMap(t) {
    const cv = this.mapCv;
    if (!cv || !cv.isConnected) return;
    const b = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(b.width * dpr)) { cv.width = Math.round(b.width * dpr); cv.height = Math.round(b.height * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = b.width, H = b.height;
    // fit 360x170 aspect
    const mw = Math.min(W, H * 360 / 170), mh = mw * 170 / 360, ox = (W - mw) / 2, oy = (H - mh) / 2;
    const P = (lon, lat) => { const q = this.proj(lon, lat, mw, mh); return { x: q.x + ox, y: q.y + oy }; };
    // tactical war-room map
    const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, '#1a2420'); g.addColorStop(1, '#090c0b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(160,200,140,0.07)'; ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) { const a = P(lon, 84), c = P(lon, -86); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
    for (let lat = -60; lat <= 80; lat += 20) { const a = P(-180, lat), c = P(180, lat); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
    // continents
    for (const c of CONTINENTS) {
      const open = STAGES.some(s => s.cont === c.id && G.unlocked[s.id]);
      const done = STAGES.filter(s => s.cont === c.id).every(s => G.completed[s.id]);
      for (const poly of CONTINENT_SHAPES[c.id]) {
        ctx.beginPath();
        poly.forEach(([lon, lat], i) => { const q = P(lon, lat); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
        ctx.closePath();
        ctx.fillStyle = open ? U.mix(done ? U.shade(c.color, -25) : c.color, '#6b6a4a', 0.45) : '#2a2f28';
        ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = open ? 'rgba(240,225,180,0.45)' : 'rgba(200,210,180,0.1)'; ctx.lineWidth = 1.2; ctx.stroke();
      }
      const ss = STAGES.filter(s => s.cont === c.id);
      const cx = ss.reduce((a, s) => a + s.lon, 0) / ss.length, cy = ss.reduce((a, s) => a + s.lat, 0) / ss.length;
      const q = P(cx, cy + (c.id === 'an' ? 6 : 14));
      ctx.fillStyle = open ? 'rgba(245,235,205,0.9)' : 'rgba(220,220,200,0.22)'; ctx.font = '700 13px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(c.n + (done ? ' ✓' : ''), q.x, q.y);
    }
    // route lines
    ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5;
    for (let i = 0; i + 1 < STAGES.length; i++) {
      const a = P(STAGES[i].lon, STAGES[i].lat), c = P(STAGES[i + 1].lon, STAGES[i + 1].lat);
      ctx.strokeStyle = G.completed[STAGES[i].id] ? 'rgba(200,60,40,0.75)' : 'rgba(230,220,190,0.12)';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    }
    ctx.setLineDash([]);
    // nodes
    this.hover = null;
    const m = this.mouseMap;
    for (const st of STAGES) {
      const q = P(st.lon, st.lat);
      const un = G.unlocked[st.id], dn = G.completed[st.id], sel = this.sel === st.id;
      const r = sel ? 11 : 8;
      if (m && Math.hypot(m.x - q.x, m.y - q.y) < 13) this.hover = st;
      if (un && !dn) { ctx.strokeStyle = `rgba(242,176,30,${0.35 + 0.3 * Math.sin(t * 4)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, r + 6 + 3 * Math.sin(t * 4), 0, 7); ctx.stroke(); }
      if (sel) { // rotating reticle
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(t * 0.8); ctx.strokeStyle = '#ffd37a'; ctx.lineWidth = 2;
        for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.arc(0, 0, r + 9, -0.45, 0.45); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r + 12, 0); ctx.lineTo(r + 18, 0); ctx.stroke(); }
        ctx.restore();
      }
      // diamond marker
      ctx.fillStyle = dn ? '#a3201a' : un ? '#f2b01e' : '#3a3f38';
      ctx.beginPath(); ctx.moveTo(q.x, q.y - r - 1); ctx.lineTo(q.x + r + 1, q.y); ctx.lineTo(q.x, q.y + r + 1); ctx.lineTo(q.x - r - 1, q.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = sel ? '#fff' : 'rgba(0,0,0,0.75)'; ctx.lineWidth = sel ? 2.5 : 2; ctx.stroke();
      ctx.fillStyle = dn ? '#fff' : un ? '#1d1305' : '#7a7f74'; ctx.font = '700 10px "Chakra Petch", Kanit, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(dn ? '✕' : un ? (st.gi + 1) : '·', q.x, q.y + 3.5);
      if (un || this.hover === st) {
        ctx.font = '600 12px "Chakra Petch", Kanit, sans-serif';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3; ctx.strokeText(st.n, q.x, q.y - r - 6);
        ctx.fillStyle = un ? '#fff' : '#aaa'; ctx.fillText(st.n, q.x, q.y - r - 6);
      }
    }
    cv.style.cursor = this.hover ? 'pointer' : 'default';
  },
  renderSide() {
    const side = this.mapSide; if (!side) return;
    side.innerHTML = '';
    const st = STAGE_BY_ID[this.sel];
    const cont = CONTINENTS.find(c => c.id === st.cont);
    const prog = State.stageProg(st.id);
    const cur = State.currentLoc(st.id);
    const done = !!G.completed[st.id];
    const diff = Math.min(5, 1 + Math.floor(st.gi / 8));
    side.appendChild(U.el('div', { class: 'stagehead' },
      U.el('div', { class: 'cont', style: { color: cont.color } }, cont.n + ` · ด่านที่ ${st.idx + 1}/${STAGE_DEFS[st.cont].length}`),
      U.el('h2', null, st.n),
      U.el('div', { class: 'diff' }, `Lv ${Levels.range(st.id)[0]}–${Levels.range(st.id)[1]} · ความยาก ` + '☠'.repeat(diff) + '·'.repeat(5 - diff))));
    side.appendChild(U.el('div', { class: 'locs' }, U.el('h4', null, `Location (${prog.cleared.length}/${st.locs.length})`),
      ...prog.order.map((li, k) => {
        const l = st.locs[li];
        const c = prog.cleared.includes(li), isCur = li === cur;
        const lockT = KeyGraph.locLocked(st.id, li) ? KeyGraph.locTarget(st.id, li) : null;
        const pend = KeyGraph.sourcesAt(st.id, li);
        return U.el('div', { class: 'loc' + (c ? ' done' : '') + (isCur ? ' cur' : '') + (lockT ? ' locked' : '') },
          U.el('span', { class: 'dot' }, c ? '✓' : isCur ? '▶' : lockT ? '🔒' : (k + 1)),
          U.el('span', { class: 'lvb' + (Levels.loc(st.id, li) >= Levels.BOSS_FROM ? ' boss' : '') , title: Levels.loc(st.id, li) >= Levels.BOSS_FROM ? 'มีโอกาสเจอบอส' : 'ไม่มีบอส' }, 'Lv ' + Levels.loc(st.id, li)),
          U.el('div', { class: 'lname' }, U.el('span', null, c || isCur || lockT ? l.n : '??? (ยังไม่เปิดเผย)'), c || isCur ? U.el('small', null, THEMES[l.theme].n) : null),
          lockT ? U.el('div', { class: 'lockhint' }, `ต้องใช้ ${ITEMS[lockT.id].n} — ${KeyGraph.where(lockT)}`) : null,
          (c || isCur) && pend.length ? U.el('div', { class: 'keyhint' }, '🔑 มีคีย์ที่นี่: ' + pend.map(t => `${ITEMS[t.id].n} (${KeyGraph.method(t) === 'boss' ? 'บอส' : 'ภารกิจ'})`).join(', ')) : null,
          c ? U.el('button', { class: 'btn small', onclick: () => { if (bad) { toast('จัดเป้ใหม่ก่อน', 'warn'); return; } this.preflight(() => Run.start(st.id, li, true)); } }, 'เล่นซ้ำ') : null);
      })));
    const cs = G.chars[G.char], used = Inv.used(G.backpack), cap = State.cap();
    const bad = !Inv.valid(G.backpack, State.grid());
    const warn = [];
    if (bad) warn.push('ของในเป้ไม่พอดีกับเป้ของตัวละครนี้ — ไปที่ "เตรียมตัว" เพื่อจัดเป้ใหม่');
    if (!G.weapons.some(Boolean)) warn.push('คุณไม่มีอาวุธติดตัว!');
    if (cs.hp < CHARACTERS[G.char].hp * 0.4) warn.push(`เลือดเหลือน้อย (${cs.hp}) — ใช้ยาหรือให้หมอรักษาก่อน`);
    if (cs.inf > 50) warn.push(`ติดเชื้อ ${cs.inf}% — อันตราย!`);
    for (const m of this.packGaps()) warn.push(m);
    const go = (farm) => {
      if (bad) { toast('จัดเป้ใหม่ก่อน', 'warn'); this.tab = 'load'; this.renderBase(); return; }
      this.preflight(() => { if (farm) Run.start(st.id, Math.floor(Math.random() * st.locs.length), true); else Run.start(st.id, cur, false); });
    };
    const btns = U.el('div', { class: 'gobtns' });
    if (!done && cur == null) btns.appendChild(U.el('div', { class: 'note warn' }, '🔒 location ที่เหลือล็อกอยู่ทั้งหมด — ต้องหาคีย์ตามที่บอกไว้ด้านบนก่อน'));
    if (!done && cur != null) btns.appendChild(U.el('button', { class: 'btn primary big', onclick: () => go(false) }, `ออกสำรวจ: ${st.locs[cur].n}`));
    if (done) btns.appendChild(U.el('div', { class: 'note good' }, '✓ พิชิตด่านนี้แล้ว'));
    if (done) btns.appendChild(U.el('button', { class: 'btn big', onclick: () => go(true) }, 'ฟาร์มของสุ่ม'));
    for (const [kid, n] of Object.entries(G.keys || {})) if (n > 0 && KEY_ITEMS[kid]) {
      const K = KEY_ITEMS[kid];
      btns.appendChild(U.el('button', { class: 'btn big restricted', title: 'อันตรายกว่าปกติ ของดีกว่า บอสมาเร็วและอาจมีหลายตัว', onclick: () => {
        if (bad) { toast('จัดเป้ใหม่ก่อน', 'warn'); return; }
        this.ask(`เข้า "${K.zone}"?`, `ใช้ ${K.n} 1 ใบ\nอันตรายกว่าปกติมาก แต่ของดีกว่า (ไม่นับเป็นการผ่าน location)`, 'เข้าไป', () => this.preflight(() => Run.start(st.id, cur ?? 0, true, { restricted: kid })));
      } }, `🗝 เข้าพื้นที่หวงห้าม: ${K.zone} (มี ${n})`));
    }
    side.appendChild(U.el('div', { class: 'brief' },
      U.el('div', null, `เป้: ${used}/${cap} block · อาวุธ: ${G.weapons.filter(Boolean).map(w => ITEMS[w.id].n).join(', ') || '-'}`),
      ...warn.map(w => U.el('div', { class: 'note warn' }, '⚠ ' + w))));
    side.appendChild(btns);
    side.appendChild(U.el('div', { class: 'tip' }, 'แต่ละรอบจะได้ location ใหม่ที่ไม่ซ้ำในด่าน ต้องทำเงื่อนไขให้ครบแล้วกลับฐาน location ถึงจะเปลี่ยน ยิ่งอยู่นานยิ่งอันตราย'));
  },

  // ----- loadout -----
  // repair a weapon at base: scrap from the stash + money
  repairActs(w) {
    const c = repairCost(w); if (!c) return [];
    if (c.none) return [['ซ่อมไม่ได้แล้ว', () => toast(`${ITEMS[w.id].n} ซ่อมมา ${w.rep} ครั้งแล้ว ซ่อมต่อไม่ได้ — ใช้จนพังหรือขายทิ้ง`, 'warn'), 'danger']];
    return [[`ซ่อม → ${c.cap}% (เศษเหล็ก ${c.scrap} · 💵${c.money})`, () => {
      if (Inv.count(G.stash, 'scrap') < c.scrap || G.money < c.money) { toast(`ต้องใช้เศษเหล็ก ${c.scrap} ในคลัง และเงิน ${c.money}`, 'warn'); return; }
      Inv.remove(G.stash, 'scrap', c.scrap); G.money -= c.money; applyRepair(w);
      Snd.hammer && Snd.hammer(); toast(`ซ่อม ${ITEMS[w.id].n} เป็น ${w.dur}% แล้ว${repairCap(w) > 0 ? ` (ครั้งหน้าซ่อมได้สูงสุด ${repairCap(w)}%)` : ' — ซ่อมครั้งสุดท้ายแล้ว'}`, 'good'); State.save(); this.renderBase();
    }, 'good']];
  },
  renderLoadout(body) {
    const g = State.grid(), cap = State.cap(), used = Inv.used(G.backpack);
    GridUI.reset(); GridUI.onRefresh = () => { State.save(); this.renderBase(); };
    if (!Inv.valid(G.backpack, g)) { const out = Inv.reflow(G.backpack, g); for (const e of out) Inv.addFree(G.stash, e); if (out.length) toast('ของบางชิ้นไม่พอที่ในเป้ ถูกย้ายเข้าคลัง', 'warn'); }
    const wrap = U.el('div', { class: 'loadout' });
    // stash
    const stashCol = U.el('div', { class: 'col stash' });
    const filters = [['all', 'ทั้งหมด'], ['weapon', 'อาวุธ'], ['gear', 'เครื่องแต่งกาย'], ['ammo', 'กระสุน/ระเบิด'], ['med', 'ยา/อาหาร'], ['mat', 'วัสดุ/ชิ้นส่วน'], ['val', 'ของมีค่า']];
    const fmatch = (e) => {
      const t = ITEMS[e.id].t, f = this.stashFilter;
      return f === 'all' || (f === 'weapon' && t === 'weapon') || (f === 'gear' && (t === 'cloth' || t === 'armor' || t === 'bag')) || (f === 'ammo' && (t === 'ammo' || t === 'throw')) || (f === 'med' && (t === 'med' || t === 'food')) || (f === 'mat' && (t === 'mat' || t === 'part' || t === 'attach')) || (f === 'val' && t === 'val');
    };
    stashCol.appendChild(U.el('h3', null, 'คลังของที่ฐาน'));
    stashCol.appendChild(U.el('div', { class: 'hint' }, 'ลากของไปวางในเป้ · Shift+ลาก = แบ่งครึ่ง · Ctrl+ลาก = หยิบ 1 ชิ้น · ลากจากเป้กลับมาที่นี่เพื่อคืนคลัง'));
    stashCol.appendChild(U.el('div', { class: 'filters' }, ...filters.map(([k, l]) => U.el('button', { class: 'chipbtn' + (this.stashFilter === k ? ' on' : ''), onclick: () => { this.stashFilter = k; this.renderBase(); } }, l))));
    const toStash = src => { if (src.from === 'grid' || src.from === 'slot') { GridUI.removeFromSource(src); Inv.addFree(G.stash, src.entry); return true; } return false; };
    GridUI.zone(stashCol, toStash);
    const sg = U.el('div', { class: 'grid' });
    Inv.sortList(G.stash);
    const list = G.stash.filter(fmatch);
    if (!list.length) sg.appendChild(U.el('div', { class: 'emptytxt' }, 'ไม่มีของ'));
    for (const e of list) {
      const it = ITEMS[e.id], acts = [['ข้อมูล', () => GridUI.showInfo(e)]];
      if (it.t === 'med' && (it.heal || it.cure)) acts.push(['ใช้เลย', () => this.useAtBase(e.id), 'primary']);
      if (it.t === 'weapon') acts.push(...this.repairActs(e));
      if (it.t === 'attach' && attUpgradeCost(e.id)) { const up = attUpgradeCost(e.id), nx = attNext(e.id);
        acts.push([`อัปเกรด ${'★'.repeat(ITEMS[nx].rank)} (${Object.entries(up.cost).map(([k, q]) => ITEMS[k].n + ' ' + q).join(' · ')} · 💵${up.money})`, () => {
          if (!this.canPay(up.cost, up.money)) { toast('วัตถุดิบหรือเงินไม่พอ', 'warn'); return; }
          this.pay(up.cost, up.money); Inv.remove(G.stash, e.id, 1); Inv.addFree(G.stash, { id: nx, q: 1 });
          Snd.hammer && Snd.hammer(); toast(`อัปเกรด ${ITEMS[nx].n} เป็น ${'★'.repeat(ITEMS[nx].rank)} แล้ว`, 'good'); State.save(); this.renderBase(); }, 'good']); }
      { const ws = Wear.slotOf(it); if (ws) acts.push([it.t === 'bag' ? `สวม (${State.gridFor(e.id).c}×${State.gridFor(e.id).r})` : 'สวม', () => {
        if (e.q > 1) e.q--; else G.stash.splice(G.stash.indexOf(e), 1);
        InvUI.wearIt('base', ws, e); State.save(); this.renderBase();
      }, 'good']); }
      const card = UIRun.itemCard(e, {});
      card.addEventListener('contextmenu', ev => { ev.preventDefault(); if (!GridUI.drag && !GridUI.splitDown) GridUI.ctxMenu(ev, it.n + (e.q > 1 ? ' ×' + e.q : ''), acts); });
      GridUI.makeDraggable(card, { from: 'ext', list: G.stash, entry: e });
      // a sewing kit / repair kit dropped on a stored shirt, bag or armor patches it; anything else goes to the stash as usual
      if (Wear.wears(it) || it.t === 'armor' || it.t === 'weapon') GridUI.zone(card, src => (['sewkit', 'repairkit'].includes(src.entry.id) && src.entry !== e && InvUI.kitOnItem(src, e) && (this.renderBase(), true)) || toStash(src));
      sg.appendChild(card);
    }
    stashCol.appendChild(sg);
    // middle: the character with what they wear and hold; right: one window per pocket
    const rer = () => { State.save(); this.renderBase(); };
    const packActs = () => [
      ['จัดเป้อัตโนมัติ', () => this.autoPack(), 'primary'],
      ...(G.lastPack && G.lastPack.length ? [['จัดเหมือนรอบที่แล้ว', () => { this.repack(); this.renderBase(); }]] : []),
      ['จัดเรียงให้แน่น', () => { Inv.reflow(G.backpack, g); this.renderBase(); }],
      ['คืนทั้งหมดเข้าคลัง', () => { for (const x of G.backpack) Inv.addFree(G.stash, x); G.backpack = []; this.renderBase(); }, 'danger']];
    const more = U.el('button', { class: 'btn small ghost packmore', title: 'จัดเป้', onclick: ev => GridUI.ctxMenu(ev, 'จัดเป้', packActs()) }, '⋯');
    const baseMenu = (e, ev) => {
      const it = ITEMS[e.id], acts = [['ข้อมูล', () => GridUI.showInfo(e)]], ws = Wear.slotOf(it);
      if (it.t === 'med' && (it.heal || it.cure)) acts.push(['ใช้เลย', () => { this.useAtBase(e.id); }, 'primary']);
      if (ws) acts.push(['สวม', () => { G.backpack.splice(G.backpack.indexOf(e), 1); InvUI.wearIt('base', ws, e); rer(); }, 'primary']);
      if (it.gw !== it.gh) acts.push(['หมุน', () => { if (Inv.fits(G.backpack, g, e, e.gx, e.gy, e.rot ? 0 : 1, e)) e.rot = e.rot ? 0 : 1; else toast('หมุนไม่ได้ ที่ไม่พอ', 'warn'); rer(); }]);
      if (e.q > 1) acts.push(['คืนคลัง 1', () => { e.q--; Inv.addFree(G.stash, { id: e.id, q: 1 }); rer(); }]);
      acts.push(['คืนคลังทั้งหมด', () => { G.backpack.splice(G.backpack.indexOf(e), 1); Inv.addFree(G.stash, e); rer(); }, 'danger']);
      GridUI.ctxMenu(ev, it.n + (e.q > 1 ? ' ×' + e.q : ''), acts);
    };
    // same layout as the in-run backpack: containers | worn items | stash (where the world would be) | weapons + quick slots
    const { left, strip, right, srw } = InvUI.scumParts('base', rer, baseMenu, { titleExtra: more });
    wrap.classList.add('scumbase'); wrap.style.setProperty('--srw', srw + 'px');
    wrap.append(left, strip, stashCol, right);
    body.appendChild(wrap);
    State.save();
  },
  // what the backpack is missing that usually decides a run
  packGaps() {
    const has = t => G.backpack.some(e => ITEMS[e.id].t === t), out = [];
    if (!has('med')) out.push('ไม่มียาในเป้ — โดนกัดแล้วรักษาตัวไม่ได้');
    if (!Inv.count(G.backpack, 'lockpick')) out.push('ไม่มีกิ๊บสะเดาะในเป้ — ประตู/ตู้ที่ล็อกนิรภัยจะเปิดไม่ได้');
    return out;
  },
  // ask before leaving with an under-packed bag (items are lost on death, so this is easy to forget)
  preflight(goFn) {
    const gaps = this.packGaps();
    if (!gaps.length) { goFn(); return; }
    const o = document.getElementById('overlay'); o.className = 'show'; o.innerHTML = '';
    const close = () => { o.className = ''; o.innerHTML = ''; };
    o.appendChild(U.el('div', { class: 'panel small' },
      U.el('h2', null, 'เป้ยังขาดของจำเป็น'),
      U.el('div', { class: 'lines' }, ...gaps.map(g => U.el('div', null, '⚠ ' + g))),
      U.el('div', { class: 'row' },
        G.lastPack && G.lastPack.length ? U.el('button', { class: 'btn primary', onclick: () => { close(); this.repack(); this.tab = 'load'; this.renderBase(); } }, 'จัดเหมือนรอบที่แล้ว') : null,
        U.el('button', { class: 'btn', onclick: () => { close(); this.tab = 'load'; this.renderBase(); } }, 'ไปจัดเป้'),
        U.el('button', { class: 'btn danger', onclick: () => { close(); goFn(); } }, 'ออกเลย'))));
  },
  // refill the backpack with what was carried at the start of the last run (taken from the stash, as far as it goes)
  repack() {
    const g = State.grid(); let miss = 0;
    for (const e of G.lastPack || []) {
      const have = Inv.count(G.stash, e.id) - 0, inPack = Inv.count(G.backpack, e.id), want = Math.max(0, e.q - inPack);
      const n = Math.min(want, have); if (!n) { if (want) miss++; continue; }
      const left = Inv.addToPack(G.backpack, { id: e.id, q: n }, g) || 0;
      Inv.remove(G.stash, e.id, n - left); if (left || n < want) miss++;
    }
    toast(miss ? 'จัดเป้แล้ว (ของบางอย่างในคลังไม่พอ)' : 'จัดเป้เหมือนรอบที่แล้ว', miss ? 'warn' : 'good'); State.save();
  },
  autoPack() {
    const g = State.grid(), cap = State.cap();
    for (const e of G.backpack) Inv.addFree(G.stash, e); G.backpack = [];
    const want = [];
    for (const w of G.weapons) if (w && ITEMS[w.id].ammo) want.push([ITEMS[w.id].ammo, ITEMS[ITEMS[w.id].ammo].st * 2]);
    want.push(['bandage', 5], ['medkit', 1], ['canned', 3], ['water', 1], ['grenade', 2], ['antiviral', 1]);
    for (const [id, q] of want) {
      if (Inv.used(G.backpack) >= cap * 0.5) break;
      const have = Inv.count(G.stash, id); if (!have) continue;
      const n = Math.min(q, have);
      const left = Inv.addToPack(G.backpack, { id, q: n }, g);
      Inv.remove(G.stash, id, n - left);
    }
    toast('จัดเป้แล้ว — เหลือที่ว่างครึ่งหนึ่งไว้เก็บของในด่าน');
    this.renderBase();
  },
  useAtBase(id) {
    const it = ITEMS[id], cs = G.chars[G.char], mx = CHARACTERS[G.char].hp, hm = CHARACTERS[G.char].mods.heal || 1;
    if (it.heal) cs.hp = Math.min(mx, Math.round(cs.hp + it.heal * hm + (it.regen || 0) * hm));
    if (it.cure) cs.inf = Math.max(0, Math.round(cs.inf - it.cure * hm));
    Inv.remove(G.stash, id, 1);
    toast(`ใช้ ${it.n} แล้ว`); this.renderBase();
  },

  // ----- shop -----
  // shop cards: one short line; click the card (not its buttons) or right-click it for the full item info
  shopInfo(card, e) {
    card.style.cursor = 'pointer';
    const show = ev => { if (ev.target.closest('button')) return; ev.preventDefault(); GridUI.hideHover(); GridUI.showInfo(e); };
    card.addEventListener('click', show); card.addEventListener('contextmenu', show);
    GridUI.hoverable(card, e);   // hovering shows the same info as a light popup
  },
  renderShop(body) {
    const wrap = U.el('div', { class: 'shop' });
    wrap.appendChild(U.el('div', { class: 'shophead' },
      U.el('div', null, U.el('h3', null, 'ร้านค้าของฐาน'), U.el('div', { class: 'hint' }, `สินค้าเปลี่ยนทุกครั้งที่กลับจากด่าน · ระดับร้าน ${State.shopTier()} · ราคาขึ้นลงตามการซื้อขายและเงินที่มี` + (State.wealthMult() > 1.02 ? ` (เงินเยอะ ร้านโก่งราคา +${Math.round((State.wealthMult() - 1) * 100)}%)` : '') + (G.roles.merchant ? ' · เจ๊มาลีช่วยต่อราคา' : ' · ของหายากบางอย่างหาได้ในด่านเท่านั้น'))),
      U.el('div', { class: 'seg' },
        U.el('button', { class: this.shopMode === 'buy' ? 'on' : '', onclick: () => { this.shopMode = 'buy'; this.renderBase(); } }, 'ซื้อ'),
        U.el('button', { class: this.shopMode === 'sell' ? 'on' : '', onclick: () => { this.shopMode = 'sell'; this.renderBase(); } }, 'ขาย'))));
    const grid = U.el('div', { class: 'shopgrid' });
    if (this.shopMode === 'buy') {
      for (const s of G.shop.stock) {
        const it = ITEMS[s.id], pack = it.t === 'ammo' ? (it.pack || 10) : 1;
        const p1 = State.buyPrice(s.id), price = p1 * pack, tr = State.priceTrend(s.id, p1);
        const can = s.q > 0 && G.money >= price;
        const card = grid.appendChild(U.el('div', { class: 'scard' + (s.q ? '' : ' sold') + (s.wander ? ' wander' : ''), },
          U.el('div', { class: 'ic', html: Art.icon(s.id) }),
          U.el('div', { class: 'info' }, U.el('b', null, it.n + (pack > 1 ? ` ×${pack}` : '') + (s.wander ? ' 🧳' : '')), U.el('small', null, TYPE_LABEL[it.t] || ''), U.el('small', { class: 'own' }, `มีอยู่: ${Inv.count(G.stash, s.id) + Inv.count(G.backpack, s.id)} · เหลือในร้าน ${s.q}`), this.trendTag(tr, true)),
          U.el('button', { class: 'btn small ' + (can ? 'primary' : ''), disabled: !can ? 'disabled' : null, onclick: () => {
            if (!can) return; G.money -= price; s.q--; State.noteBuy(s.id, pack);
            if (it.t === 'blueprint') { if (!G.blueprints.includes(it.bp)) G.blueprints.push(it.bp); toast(`เรียนรู้ ${it.n} แล้ว! ไปประกอบได้ที่โรงช่าง`, 'good'); }
            else { Inv.addFree(G.stash, Inv.make(s.id, pack)); toast(`ซื้อ ${it.n} แล้ว (อยู่ในคลัง)`); }
            State.save(); this.renderBase();
          } }, `💵 ${U.fmt(price)}`)));
        this.shopInfo(card, Inv.make(s.id, pack));
      }
    } else {
      Inv.sortList(G.stash);
      const list = G.stash.filter(e => ITEMS[e.id].t !== 'quest');
      if (!list.length) grid.appendChild(U.el('div', { class: 'emptytxt' }, 'คลังว่าง'));
      for (const e of list) {
        const it = ITEMS[e.id], p1 = State.sellPrice(e.id, e), all = e.q > 1 ? State.sellTotal(e.id, e, e.q) : p1;
        const tr = Math.round((p1 / Math.max(1, ITEMS[e.id].v * (G.roles.merchant ? 0.55 : 0.4)) - 1) * 100);
        const sell = (n) => { const q = it.t === 'weapon' ? 1 : Math.min(n, e.q), got = State.sellTotal(e.id, e, q); if (it.t === 'weapon') G.stash.splice(G.stash.indexOf(e), 1); else Inv.remove(G.stash, e.id, q); G.money += got; State.noteSell(e.id, q); State.save(); this.renderBase(); };
        const card = grid.appendChild(U.el('div', { class: 'scard' + (it.t === 'val' ? ' val' : ''), },
          U.el('div', { class: 'ic', html: Art.icon(e.id) }),
          U.el('div', { class: 'info' }, U.el('b', null, it.n + (e.q > 1 ? ` ×${e.q}` : '') + (e.lvl ? ' +' + e.lvl : '')), U.el('small', null, `${TYPE_LABEL[it.t]} · ขายได้ ${p1}/ชิ้น` + (it.t === 'weapon' && (e.dur ?? 100) < 100 ? ` · สภาพ ${Math.round(e.dur ?? 100)}%` : '')), this.trendTag(tr, false)),
          U.el('div', { class: 'btncol' },
            U.el('button', { class: 'btn small', onclick: () => sell(1) }, `ขาย 1 (+${p1})`),
            e.q > 1 ? U.el('button', { class: 'btn small primary', onclick: () => sell(e.q) }, `ขายหมด (+${U.fmt(all)})`) : null)));
        this.shopInfo(card, e);
      }
    }
    wrap.appendChild(grid);
    body.appendChild(wrap);
  },
  // price vs normal: buying → up is bad (red); selling → down is bad (red)
  trendTag(pct, buying) {
    if (Math.abs(pct) < 3) return null;
    const bad = buying ? pct > 0 : pct < 0;
    return U.el('small', { class: 'trend ' + (bad ? 'bad' : 'good') }, `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% จากราคาปกติ`);
  },
  weaponBrief(it) {
    if (it.t !== 'weapon') return '';
    return it.cls === 'melee' ? ` · ดาเมจ ${it.dmg}` : ` · ดาเมจ ${it.dmg}${it.pellets ? '×' + it.pellets : ''} · แม็ก ${it.mag} · ใช้${ITEMS[it.ammo].n}`;
  },

  // ----- survivors -----
  craftRow(rc) {
    const it = ITEMS[rc.out[0]];
    const have = id => Inv.count(G.stash, id);
    const ok = Object.entries(rc.cost).every(([id, q]) => have(id) >= q) && G.money >= (rc.money || 0);
    return U.el('div', { class: 'craft' + (ok ? '' : ' no') },
      U.el('span', { class: 'ic', html: Art.icon(rc.out[0]) }), U.el('b', null, `${it.n} ×${rc.out[1]}`),
      U.el('span', { class: 'cost' }, Object.entries(rc.cost).map(([id, q]) => `${ITEMS[id].icon}${q}(${have(id)})`).join(' ') + (rc.money ? ` 💵${rc.money}` : '')),
      U.el('button', { class: 'btn small' + (ok ? ' primary' : ''), disabled: ok ? null : 'disabled', onclick: () => {
        for (const [id, q] of Object.entries(rc.cost)) Inv.remove(G.stash, id, q);
        G.money -= rc.money || 0;
        if (it.t === 'weapon') Inv.addFree(G.stash, Inv.makeWeapon(rc.out[0])); else Inv.addFree(G.stash, { id: rc.out[0], q: rc.out[1] });
        toast(`ผลิต ${it.n} แล้ว`); State.save(); this.renderBase();
      } }, 'ผลิต'));
  },
  renderSurv(body) {
    const wrap = U.el('div', { class: 'surv' });
    wrap.appendChild(U.el('p', { class: 'hint' }, 'ช่วยผู้รอดชีวิตจากด่านเพื่อพาพวกเขามาที่ฐาน ผู้เชี่ยวชาญแต่ละคนให้บริการต่างกัน วัตถุดิบที่ใช้ผลิตต้องอยู่ในคลัง'));
    const grid = U.el('div', { class: 'rolegrid' });
    for (const [k, R0] of Object.entries(ROLES)) {
      const has = G.roles[k];
      const card = U.el('div', { class: 'rcard' + (has ? '' : ' locked') },
        U.el('div', { class: 'rh' }, U.el('span', { class: 'ri' }, R0.icon), U.el('div', null, U.el('b', null, has ? R0.who : '???'), U.el('small', null, R0.n))),
        U.el('div', { class: 'rd' }, R0.desc));
      if (!has) card.appendChild(U.el('div', { class: 'note' }, 'ยังไม่พบ — ช่วยเหลือได้จากในด่าน'));
      else this.roleServices(k, card);
      grid.appendChild(card);
    }
    wrap.appendChild(grid);
    const gen = G.survivors.filter(s => !s.role), W = gen.length;
    wrap.appendChild(U.el('div', { class: 'generic' }, U.el('h4', null, `แรงงาน: ผู้รอดชีวิตทั่วไป (${W})`),
      W ? U.el('div', { class: 'glist' }, ...gen.map(sv => U.el('span', { class: 'gp', title: Days.traitTxt(sv) },
        `${sv.name}${sv.trait && sv.trait !== 'normal' ? ' · ' + TRAITS[sv.trait].n : ''}${sv.trait === 'weak' && (sv.until || 0) > G.day ? ` (พักอีก ${sv.until - G.day} วัน)` : ''}`,
        U.el('button', { class: 'gx', title: 'ให้ออกจากฐาน (ลดคนกินเสบียง)', onclick: () => { Days.dismiss(sv); toast(`${sv.name} ออกจากฐานแล้ว`); State.save(); this.renderBase(); } }, '✕'))))
        : U.el('div', null, '— ยังไม่มี — ช่วยคนจากในด่าน หรือสร้างเสาวิทยุเพื่อเรียกคนมา'),
      U.el('div', { class: 'wf' },
        U.el('span', null, `💵 หาเงิน +${Days.income()}/วัน`),
        U.el('span', null, `🔨 งานสร้าง ${Days.workPerDay()} แต้ม/วัน`),
        U.el('span', null, `❤ พักฟื้น ${Math.round(Days.healPct() * 100)}%/วัน`),
        U.el('span', { class: Days.daysLeft() < 2 && G.day > GRACE_DAYS ? 'warn' : '' }, `🍽 ทั้งฐาน ${Days.mouths()} คน กิน ${Days.needFood()} หน่วย + น้ำ ${Days.needWater()} ขวด/วัน`)),
      U.el('small', null, 'คนยิ่งเยอะ งานยิ่งเสร็จเร็ว แต่กินเสบียงมากขึ้น — ถ้าขาดแคลนหลายวัน คนจะทยอยออกจากฐาน')));
    // base projects
    const pj = Days.proj(), box = U.el('div', { class: 'projects' }, U.el('h4', null, 'โครงการฐาน'));
    if (pj.cur) { const P = PROJECTS[pj.cur.id]; box.appendChild(U.el('div', { class: 'pcur' }, U.el('b', null, `${P.icon} กำลังสร้าง ${P.n}`), U.el('div', { class: 'pbar' }, U.el('i', { style: `width:${Math.min(100, pj.cur.done / P.work * 100)}%` })), U.el('small', null, `${Math.floor(pj.cur.done)}/${P.work} แต้มงาน · เสร็จในอีก ~${Days.daysToFinish()} วัน (กลับฐาน 1 ครั้ง = 1 วัน)`))); }
    for (const [id, P] of Object.entries(PROJECTS)) {
      const done = Days.built(id), ok = Days.canStart(id);
      const costTxt = Object.entries(P.cost).map(([k, q]) => `${ITEMS[k].n} ${q}(${Inv.count(G.stash, k)})`).join(' · ');
      box.appendChild(U.el('div', { class: 'proj' + (done ? ' done' : '') },
        U.el('span', { class: 'pi' }, P.icon),
        U.el('div', { class: 'pinfo' }, U.el('b', null, P.n + (done ? ' ✓' : '')), U.el('small', null, P.desc), done ? null : U.el('small', { class: 'cost' }, `${costTxt} · งาน ${P.work} แต้ม (~${Math.ceil(P.work / Days.workPerDay())} วัน)`)),
        done ? U.el('small', { class: 'good' }, 'สร้างแล้ว') : U.el('button', { class: 'btn small' + (ok ? ' primary' : ''), disabled: ok ? null : 'disabled', title: pj.cur ? 'สร้างได้ทีละโครงการ' : '', onclick: () => { if (Days.startProject(id)) { toast(`เริ่มสร้าง ${P.n}`, 'good'); State.save(); this.renderBase(); } } }, pj.cur && pj.cur.id === id ? 'กำลังสร้าง' : 'เริ่มสร้าง')));
    }
    wrap.appendChild(box);
    body.appendChild(wrap);
  },
  roleServices(k, card) {
    const cs = G.chars[G.char], mx = CHARACTERS[G.char].hp;
    if (k === 'doctor') {
      card.appendChild(U.el('div', { class: 'row' },
        U.el('button', { class: 'btn small primary', disabled: cs.hp >= mx ? 'disabled' : null, onclick: () => { cs.hp = mx; toast('หมอวิทย์รักษาจนหายดี'); State.save(); this.renderBase(); } }, `รักษาเต็ม (ฟรี) ❤ ${cs.hp}/${mx}`),
        U.el('button', { class: 'btn small', disabled: cs.inf <= 0 ? 'disabled' : null, onclick: () => { const c = 150; if (G.money < c) return toast('เงินไม่พอ'); G.money -= c; cs.inf = 0; toast('รักษาการติดเชื้อแล้ว'); State.save(); this.renderBase(); } }, `รักษาติดเชื้อ ☣${cs.inf}% (💵150)`)));
    }
    if (RECIPES[k]) { const box = U.el('div', { class: 'crafts' }); for (const rc of RECIPES[k]) box.appendChild(this.craftRow(rc)); card.appendChild(box); }
    if (k === 'engineer') card.appendChild(U.el('div', { class: 'note good' }, '✓ โรงช่าง: อัปเกรดอาวุธได้ถึง +5 · ประกอบอาวุธลดราคา 20% · ผลิตชิ้นส่วนพื้นฐาน'));
    if (k === 'tailor') {
      const lvl = G.bpLvl, cost = { cloth: 6 * (lvl + 1), scrap: 2 * (lvl + 1) }, money = 300 * (lvl + 1);
      const ok = lvl < 3 && Inv.count(G.stash, 'cloth') >= cost.cloth && Inv.count(G.stash, 'scrap') >= cost.scrap && G.money >= money;
      card.appendChild(U.el('div', { class: 'craft' + (ok ? '' : ' no') },
        U.el('span', { class: 'ic' }, '🎒'), U.el('b', null, lvl < 3 ? `ขยายเป้ ระดับ ${lvl + 1} (+1 แถว)` : 'เป้ระดับสูงสุดแล้ว'),
        lvl < 3 ? U.el('span', { class: 'cost' }, `🧵${cost.cloth}(${Inv.count(G.stash, 'cloth')}) 🔩${cost.scrap}(${Inv.count(G.stash, 'scrap')}) 💵${money}`) : null,
        lvl < 3 ? U.el('button', { class: 'btn small' + (ok ? ' primary' : ''), disabled: ok ? null : 'disabled', onclick: () => { Inv.remove(G.stash, 'cloth', cost.cloth); Inv.remove(G.stash, 'scrap', cost.scrap); G.money -= money; G.bpLvl++; toast('เป้ใหญ่ขึ้นแล้ว!'); State.save(); this.renderBase(); } }, 'อัปเกรด') : null));
    }
    if (k === 'cook') card.appendChild(U.el('div', { class: 'note good' }, '✓ ออกสำรวจด้วยความอิ่ม 100%'));
    if (k === 'merchant') card.appendChild(U.el('div', { class: 'note good' }, '✓ ร้านค้าระดับ +1 · ซื้อถูกลง 10% · ขายได้ราคาดีขึ้น'));
    if (k === 'scout') card.appendChild(U.el('div', { class: 'note good' }, '✓ แผนที่ย่อแสดงจุดเก็บของและซอมบี้'));
  },
  engineerPanel() {
    const box = U.el('div', { class: 'eng' }, U.el('h4', null, 'อัปเกรด/ติดตั้งอุปกรณ์เสริม'));
    const weapons = [...G.weapons.filter(Boolean).map(w => ({ w, where: 'ถืออยู่' })), ...G.stash.filter(e => ITEMS[e.id].t === 'weapon').map(w => ({ w, where: 'คลัง' }))];
    if (!weapons.length) box.appendChild(U.el('div', { class: 'note' }, 'ไม่มีอาวุธ'));
    for (const { w, where } of weapons) {
      const it = ITEMS[w.id], L = w.lvl || 0;
      const parts = (L + 1) * 2, money = 150 * (L + 1);
      const ok = L < 5 && Inv.count(G.stash, 'gunparts') >= parts && G.money >= money;
      const row = U.el('div', { class: 'wup' },
        U.el('span', { class: 'ic', html: Art.icon(w.id) }), U.el('b', null, `${it.n} +${L}`), U.el('small', null, where),
        L < 5 ? U.el('button', { class: 'btn small' + (ok ? ' primary' : ''), disabled: ok ? null : 'disabled', title: 'ดาเมจ +12% ยิง/ฟันเร็วขึ้น 3% ต่อระดับ', onclick: () => { Inv.remove(G.stash, 'gunparts', parts); G.money -= money; w.lvl = L + 1; toast(`${it.n} อัปเกรดเป็น +${L + 1}`); State.save(); this.renderBase(); } }, `อัปเกรด ⚙️${parts}(${Inv.count(G.stash, 'gunparts')}) 💵${money}`) : U.el('small', null, 'สูงสุดแล้ว'));
      if (it.cls !== 'melee') {
        const att = U.el('div', { class: 'atts' });
        for (const slot of attSlotsFor(w)) {
          const cur = w.att && w.att[slot];
          if (cur) att.appendChild(U.el('button', { class: 'chipbtn on', title: 'ถอด', onclick: () => { delete w.att[slot]; Inv.addFree(G.stash, { id: cur, q: 1 }); attTrimMag(w, x => Inv.addFree(G.stash, x)); toast('ถอดแล้ว'); State.save(); this.renderBase(); } }, `${ITEMS[cur].icon} ${ATTACH_LABEL[slot]} ✕`));
          else {
            const avail = Object.keys(ITEMS).filter(id => ITEMS[id].t === 'attach' && ITEMS[id].slot === slot && Inv.count(G.stash, id)).sort((x, y) => attRank(y) - attRank(x))[0];
            att.appendChild(U.el('button', { class: 'chipbtn', disabled: avail ? null : 'disabled', onclick: () => { w.att = w.att || {}; w.att[slot] = avail; Inv.remove(G.stash, avail, 1); toast('ติดตั้ง ' + ITEMS[avail].n); State.save(); this.renderBase(); } }, avail ? `+ ${ITEMS[avail].icon} ${ATTACH_LABEL[slot]}` : `${ATTACH_LABEL[slot]}: -`));
          }
        }
        row.appendChild(att);
      }
      box.appendChild(row);
    }
    return box;
  },

  // ----- workshop: blueprints, assembly, upgrades, disassembly -----
  // requirement chips, same look as the crafting cards: icon + amount needed (green = enough, red = short); name + have/need in the tooltip
  reqChips(cost, money) { return Craft.chips(cost, money); },
  canPay(cost, money) { return Object.entries(cost).every(([id, q]) => Inv.count(G.stash, id) >= q) && G.money >= (money || 0); },
  missingText(cost, money) {
    const m = Object.entries(cost).filter(([id, q]) => Inv.count(G.stash, id) < q).map(([id, q]) => `${ITEMS[id].n} ${q - Inv.count(G.stash, id)}`);
    if (money && G.money < money) m.push(`เงิน ${U.fmt(money - G.money)}`);
    return 'ยังขาด: ' + m.join(' · ');
  },
  pay(cost, money) { for (const [id, q] of Object.entries(cost)) Inv.remove(G.stash, id, q); G.money -= money || 0; },
  upgradeCost(w) {
    const it = ITEMS[w.id], L = w.lvl || 0, melee = it.cls === 'melee';
    const cost = melee ? { scrap: 2 * (L + 1) } : { gunparts: 2 * (L + 1) };
    if (melee) { if (L >= 2) cost.p_blade = L >= 4 ? 2 : 1; if (L >= 1) cost.p_handle = 1; }
    else { if (L >= 1) cost.p_spring = 1; if (L >= 2) cost.p_trigger = 1; if (L >= 3) cost.p_barrel = 1; if (L >= 4) cost.p_receiver = 1; }
    return { cost, money: Math.round(150 * (L + 1) * (G.roles.engineer ? 0.8 : 1)) };
  },
  renderWorkshop(body) {
    const eng = !!G.roles.engineer, maxL = eng ? 5 : 2;
    const wrap = U.el('div', { class: 'workshop' });
    wrap.appendChild(U.el('div', { class: 'wshead' },
      U.el('h3', null, 'โรงช่างอาวุธ'),
      U.el('div', { class: 'note ' + (eng ? 'good' : '') }, eng ? '✓ ช่างโอ๊ตประจำโรงช่าง: อัปเกรดได้ถึง +5 · ค่าแรงลด 20%' : 'ยังไม่มีนักพัฒนาอาวุธ: อัปเกรดได้สูงสุด +2 (ช่วยช่างจากในด่านเพื่ออัปเกรดได้ถึง +5)'),
      U.el('div', { class: 'hint' }, 'ใช้ของในคลังเท่านั้น · ชิ้นส่วนอาวุธหาได้จากล็อกเกอร์ กล่องเครื่องมือ ลังอาวุธทหาร และรถ · พิมพ์เขียวหาได้ในด่าน (บอสดรอปแน่นอน)')));
    // blueprints
    const known = G.blueprints;
    const bpSec = U.el('div', { class: 'wssec' }, U.el('h4', null, `พิมพ์เขียวอาวุธ (${known.length}/${Object.keys(WEAPON_RECIPES).length})`));
    const grid = U.el('div', { class: 'bpgrid' });
    for (const [wid, rc] of Object.entries(WEAPON_RECIPES)) {
      const it = ITEMS[wid], has = known.includes(wid);
      const money = Math.round((rc.money || 0) * (eng ? 0.8 : 1));
      const card = U.el('div', { class: 'bpcard' + (has ? '' : ' locked') });
      card.appendChild(U.el('div', { class: 'bpimg', html: `<img src="${Parts.weapon(wid).img.src}" draggable="false">` }));
      card.appendChild(U.el('div', { class: 'bpname' }, it.n, U.el('small', null, ` · ${SLOT_LABEL[CLS_SLOT[it.cls]]}`)));
      card.appendChild(U.el('div', { class: 'bpstat' }, this.weaponBrief(it).replace(/^ · /, '')));
      if (has) {
        card.appendChild(this.reqChips(rc.cost, money));
        const ok = this.canPay(rc.cost, money);
        card.appendChild(U.el('button', { class: 'btn small' + (ok ? ' primary' : ''), disabled: ok ? null : 'disabled', onclick: () => { this.pay(rc.cost, money); Inv.addFree(G.stash, Inv.makeWeapon(wid)); toast(`ประกอบ ${it.n} สำเร็จ! (อยู่ในคลัง)`, 'good'); State.save(); this.renderBase(); } }, 'ประกอบ'));
      } else card.appendChild(U.el('div', { class: 'note' }, '🔒 ยังไม่มีพิมพ์เขียว — หาได้ในด่าน'));
      grid.appendChild(card);
    }
    bpSec.appendChild(grid);
    // upgrades + attachments + disassembly
    const upSec = U.el('div', { class: 'wssec' }, U.el('h4', null, '⬆ อัปเกรด · อุปกรณ์เสริม · แยกชิ้นส่วน'));
    const weapons = [...G.weapons.map((w, i) => w && { w, where: 'ถืออยู่', slot: i }).filter(Boolean), ...G.stash.filter(e => ITEMS[e.id].t === 'weapon').map(w => ({ w, where: 'คลัง' }))];
    if (!weapons.length) upSec.appendChild(U.el('div', { class: 'note' }, 'ไม่มีอาวุธ'));
    for (const { w, where, slot } of weapons) {
      const it = ITEMS[w.id], L = w.lvl || 0;
      const row = U.el('div', { class: 'uprow' });
      row.appendChild(U.el('div', { class: 'upimg', html: Art.icon(w.id) }));
      const info = U.el('div', { class: 'upinfo' }, U.el('b', null, `${it.n} `, U.el('span', { class: 'lvl' }, '★'.repeat(L) + '☆'.repeat(5 - L))), U.el('small', null, ` ${where} · ดาเมจ ${Math.round(it.dmg * (1 + 0.12 * L))}${it.pellets ? '×' + it.pellets : ''}`));
      row.appendChild(info);
      const act = U.el('div', { class: 'upact' });
      if (L < maxL) {
        const { cost, money } = this.upgradeCost(w);
        act.appendChild(this.reqChips(cost, money));
        const ok = this.canPay(cost, money);
        act.appendChild(U.el('button', { class: 'btn small' + (ok ? ' primary' : ' off'), title: 'ดาเมจ +12% · ยิง/ฟันเร็วขึ้น 3% ต่อระดับ', onclick: () => { if (!this.canPay(cost, money)) { toast(this.missingText(cost, money), 'warn'); return; } this.pay(cost, money); w.lvl = L + 1; toast(`${it.n} อัปเกรดเป็น +${L + 1}`, 'good'); State.save(); this.renderBase(); } }, `อัปเกรดเป็น +${L + 1}`));
      } else act.appendChild(U.el('small', { class: 'hint' }, L >= 5 ? 'ระดับสูงสุดแล้ว' : 'ต้องมีนักพัฒนาอาวุธเพื่ออัปเกรดต่อ'));
      if (it.cls !== 'melee') {
        const att = U.el('div', { class: 'atts' });
        for (const sl of attSlotsFor(w)) {
          const cur = w.att && w.att[sl];
          if (cur) att.appendChild(U.el('button', { class: 'chipbtn on', title: 'ถอด', onclick: () => { delete w.att[sl]; Inv.addFree(G.stash, { id: cur, q: 1 }); attTrimMag(w, x => Inv.addFree(G.stash, x)); State.save(); this.renderBase(); } }, `${ATTACH_LABEL[sl]}: ${ITEMS[cur].n} ✕`));
          else {
            const avail = Object.keys(ITEMS).filter(id => ITEMS[id].t === 'attach' && ITEMS[id].slot === sl && Inv.count(G.stash, id)).sort((x, y) => attRank(y) - attRank(x))[0];
            att.appendChild(U.el('button', { class: 'chipbtn', disabled: avail ? null : 'disabled', onclick: () => { w.att = w.att || {}; w.att[sl] = avail; Inv.remove(G.stash, avail, 1); toast('ติดตั้ง ' + ITEMS[avail].n); State.save(); this.renderBase(); } }, avail ? `+ ${ITEMS[avail].n}` : `${ATTACH_LABEL[sl]}: -`));
          }
        }
        act.appendChild(att);
      }
      if (where === 'คลัง' && WEAPON_RECIPES[w.id]) {
        act.appendChild(U.el('button', { class: 'btn small ghost', onclick: () => this.ask(`แยกชิ้นส่วน ${it.n}?`, 'ได้ชิ้นส่วนคืนประมาณครึ่งหนึ่ง', 'แยกชิ้นส่วน', () => {
          G.stash.splice(G.stash.indexOf(w), 1);
          const got = [];
          for (const [id, q] of Object.entries(WEAPON_RECIPES[w.id].cost)) { const n = Math.floor(q / 2 + Math.random() * (q / 2 + 0.6)); if (n > 0) { Inv.addFree(G.stash, { id, q: n }); got.push(`${ITEMS[id].n} ×${n}`); } }
          if (L) { Inv.addFree(G.stash, { id: 'gunparts', q: L * 2 }); got.push(`ชิ้นส่วนปืน ×${L * 2}`); }
          for (const sl in (w.att || {})) { Inv.addFree(G.stash, { id: w.att[sl], q: 1 }); got.push(ITEMS[w.att[sl]].n); }
          toast('ได้คืน: ' + (got.join(', ') || 'ไม่มี'), 'good'); State.save(); this.renderBase();
        }, true) }, '♻ แยกชิ้นส่วน'));
      }
      row.appendChild(act);
      upSec.appendChild(row);
    }
    // restore the durability ceiling (the max a repair can reach), a little at a time
    const rsSec = U.el('div', { class: 'wssec' }, U.el('h4', null, 'ฟื้นฟูความทนทานสูงสุด'),
      U.el('div', { class: 'hint' }, 'ช่างฟื้นเพดานที่ซ่อมได้คืนครั้งละ 0.5–3%'));
    const worn = ['top', 'bottom', 'armor', 'pack'].map(sl => ({ e: Wear.get(G, sl), where: 'สวมอยู่', slot: sl })).filter(o => o.e);
    const cands = [...weapons.map(o => ({ e: o.w, where: o.where })), ...worn, ...G.stash.filter(e => Wear.fixable(e)).map(e => ({ e, where: 'คลัง' }))].filter(o => CapRestore.cap(o.e) < 100);
    if (!cands.length) rsSec.appendChild(U.el('div', { class: 'note' }, 'ทุกชิ้นยังซ่อมได้เต็ม 100%'));
    for (const { e, where, slot } of cands) {
      const it = ITEMS[e.id], { cost, money } = CapRestore.cost(e), who = CapRestore.can(e);
      const row = U.el('div', { class: 'uprow' });
      row.appendChild(U.el('div', { class: 'upimg', html: Art.icon(e.id) }));
      row.appendChild(U.el('div', { class: 'upinfo' }, U.el('b', null, it.n), U.el('small', null, ` ${where} · ซ่อมได้สูงสุด ${CapRestore.cap(e)}%`)));
      const act = U.el('div', { class: 'upact' });
      act.appendChild(this.reqChips(cost, money));
      if (!who) act.appendChild(U.el('small', { class: 'hint' }, CapRestore.who(e) === 'engineer' ? 'ต้องมีนักพัฒนาอาวุธที่ฐาน' : 'ต้องมีช่างตัดเสื้อที่ฐาน'));
      else {
        const ok = this.canPay(cost, money);
        act.appendChild(U.el('button', { class: 'btn small' + (ok ? ' primary' : ' off'), onclick: () => {
          if (!this.canPay(cost, money)) { toast(this.missingText(cost, money), 'warn'); return; }
          this.pay(cost, money); const r = CapRestore.apply(e, slot);
          Snd.hammer && Snd.hammer(); toast(`${it.n}: ซ่อมได้สูงสุด ${r.before}% → ${r.after}%`, 'good'); State.save(); this.renderBase();
        } }, 'ฟื้นฟู +0.5–3%'));
      }
      row.appendChild(act); rsSec.appendChild(row);
    }
    wrap.append(bpSec, upSec, rsSec);   // parts on hand: see the stash (เตรียมตัว) or the counts on each blueprint
    body.appendChild(wrap);
  },

  // ----- characters -----
  renderChars(body) {
    const grid = U.el('div', { class: 'cards chars' });
    for (const [id, c] of Object.entries(CHARACTERS)) {
      const un = G.unlockedChars.includes(id);
      const cs = G.chars[id];
      const card = U.el('div', { class: 'ccard' + (un ? '' : ' locked') + (G.char === id ? ' sel' : '') },
        this.charPortrait(id, 100, !un),
        U.el('h3', null, un ? c.n : '???'), U.el('div', { class: 'ttl' }, un ? c.title : (c.starter ? 'ตัวละครตั้งต้น (ไม่ได้เลือก)' : `อาจพบได้ตั้งแต่ด่านที่ ${(c.minStage || 0) + 1}`)),
        un ? this.statLines(c) : null,
        U.el('div', { class: 'perk' }, '★ ' + (un ? c.perk : 'ช่วยเหลือในด่านเพื่อปลดล็อก')),
        un && cs ? U.el('div', { class: 'kit' }, `❤ ${cs.hp}/${c.hp}` + (cs.inf ? ` · ☣ ${cs.inf}%` : '')) : null,
        un ? (G.char === id ? U.el('div', { class: 'note good' }, '✓ ใช้อยู่') : U.el('button', { class: 'btn primary small', onclick: () => { G.char = id; const out = Inv.reflow(G.backpack, State.grid()); for (const e of out) Inv.addFree(G.stash, e); if (out.length) toast('ของบางชิ้นไม่พอที่ในเป้ใหม่ ย้ายเข้าคลังแล้ว'); State.save(); toast(`เปลี่ยนเป็น ${c.n}`); this.renderBase(); } }, 'ใช้ตัวนี้')) : null);
      grid.appendChild(card);
    }
    body.appendChild(U.el('p', { class: 'hint' }, 'เป้ อาวุธ และคลังใช้ร่วมกันทุกตัวละคร แต่ขนาดเป้ขึ้นอยู่กับตัวละคร'));
    body.appendChild(grid);
  },
};
