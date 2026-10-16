// ---------- Developer console: press ` (backquote) or F2, type "help" ----------
// Running locally (file:// or localhost) it opens straight away. On a public host it asks for a password first;
// only a PBKDF2 hash lives in js/dev_config.js (written by the deploy workflow from the CONSOLE_PASSWORD secret).
// With no hash configured the console is disabled on public hosts. Client-side only: it keeps casual players out,
// it is not real security.
const DevLock = {
  local: location.protocol === 'file:' || ['localhost', '127.0.0.1', '::1', '[::1]', ''].includes(location.hostname),
  KEY: 'dz_dev_unlocked', fails: 0, until: 0,
  cfg() { return window.DEV_CONSOLE || null; },
  unlocked() { if (this.local) return true; try { const c = this.cfg(); return !!c && sessionStorage.getItem(this.KEY) === c.hash; } catch (e) { return false; } },
  async check(pw) {
    const c = this.cfg(); if (!c || !window.crypto || !crypto.subtle) return false;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(c.salt), iterations: c.iter }, key, 256);
    const hex = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
    if (hex !== c.hash) return false;
    try { sessionStorage.setItem(this.KEY, c.hash); } catch (e) { }
    return true;
  },
};

const Dev = {
  open: false, god: false, hist: [], hi: -1, log: [],
  init() {
    const el = this.el = U.el('div', { id: 'devconsole' });
    this.out = U.el('div', { class: 'dc-out' });
    this.inp = U.el('input', { class: 'dc-in', spellcheck: 'false', autocomplete: 'off', placeholder: 'พิมพ์คำสั่ง… (help ดูทั้งหมด · Tab เติมคำ · ↑↓ ประวัติ · Esc ปิด)' });
    el.appendChild(U.el('div', { class: 'dc-head' }, '⌨ ADMIN CONSOLE'));
    this.sug = U.el('div', { class: 'dc-sug' });
    el.appendChild(this.out); el.appendChild(this.sug); el.appendChild(this.inp);
    this.inp.addEventListener('input', () => { if (!this.locked) this.suggest(); });
    document.body.appendChild(el);
    // capture phase: runs before the game's own key handlers
    window.addEventListener('keydown', e => {
      if (e.code === 'Backquote' || e.code === 'F2') { if (!DevLock.local && !DevLock.cfg()) return; e.preventDefault(); e.stopImmediatePropagation(); this.toggle(); return; }
      if (!this.open) return;
      e.stopImmediatePropagation();
      if (e.code === 'Escape') { e.preventDefault(); this.toggle(false); }
      else if (e.code === 'Enter') {
        e.preventDefault();
        if (this.locked) { const pw = this.inp.value; this.inp.value = ''; if (pw) this.tryUnlock(pw); return; }
        if (this.sugList.length && this.sugI >= 0) { this.pickSug(this.sugI); return; }
        const v = this.inp.value.trim(); this.inp.value = ''; this.suggest(); if (v) { this.hist.unshift(v); this.hi = -1; this.run(v); }
      }
      else if (this.locked) return;
      else if (e.code === 'ArrowUp') { e.preventDefault(); if (this.sugList.length) { this.markSug(Math.max(0, this.sugI - 1)); return; } this.hi = Math.min(this.hist.length - 1, this.hi + 1); if (this.hist[this.hi]) this.inp.value = this.hist[this.hi]; }
      else if (e.code === 'ArrowDown') { e.preventDefault(); if (this.sugList.length) { this.markSug(Math.min(this.sugList.length - 1, this.sugI + 1)); return; } this.hi = Math.max(-1, this.hi - 1); this.inp.value = this.hi >= 0 ? this.hist[this.hi] : ''; }
      else if (e.code === 'Tab') { e.preventDefault(); if (this.sugList.length) this.pickSug(Math.max(0, this.sugI)); else this.complete(); }
    }, true);
    window.addEventListener('keyup', e => { if (this.open) e.stopImmediatePropagation(); }, true);
    // invulnerability hook
    const hurt = Run.hurt;
    Run.hurt = function (dmg, silent) { if (Dev.god) return; return hurt.call(this, dmg, silent); };
    this.setLocked(!DevLock.unlocked());
  },
  setLocked(v) {
    this.locked = v;
    this.inp.type = v ? 'password' : 'text';
    this.inp.placeholder = v ? 'ใส่รหัสผ่านแล้วกด Enter · Esc ปิด' : 'พิมพ์คำสั่ง… (help ดูทั้งหมด · Tab เติมคำ · ↑↓ ประวัติ · Esc ปิด)';
    this.out.innerHTML = '';
    this.print(v ? '🔒 คอนโซลถูกล็อก — ต้องใส่รหัสผ่านก่อน' : 'พิมพ์ help เพื่อดูคำสั่งทั้งหมด', 'dim');
  },
  async tryUnlock(pw) {
    const now = Date.now();
    if (now < DevLock.until) { this.print(`ลองใหม่ได้ใน ${Math.ceil((DevLock.until - now) / 1000)} วินาที`, 'err'); return; }
    if (!window.isSecureContext || !window.crypto || !crypto.subtle) { this.print('ต้องเปิดเกมผ่าน https ถึงจะตรวจรหัสได้', 'err'); return; }
    this.inp.disabled = true;
    let ok = false; try { ok = await DevLock.check(pw); } catch (e) { }
    this.inp.disabled = false; this.inp.focus();
    if (ok) { DevLock.fails = 0; this.setLocked(false); this.print('🔓 ปลดล็อกแล้ว (จนกว่าจะปิดแท็บ)', 'ok'); return; }
    DevLock.fails++;
    if (DevLock.fails >= 5) { DevLock.until = now + 30000 * (DevLock.fails - 4); this.print('รหัสผิดหลายครั้ง — รอ ' + 30 * (DevLock.fails - 4) + ' วินาที', 'err'); }
    else this.print('รหัสผ่านไม่ถูกต้อง', 'err');
  },
  toggle(v) {
    this.open = v ?? !this.open;
    this.el.classList.toggle('show', this.open);
    Input.keys = {}; Input.pressed = {};
    if (Run.active && !Run.over) { if (this.open) { this.wasPaused = Run.paused; Run.paused = true; } else Run.paused = !!this.wasPaused; }
    if (this.open) setTimeout(() => this.inp.focus(), 0); else this.inp.blur();
  },
  // live suggestions while typing the argument of give/items (searches id AND Thai name)
  sugList: [], sugI: -1,
  suggest() {
    const v = this.inp.value, m = v.match(/^(give|items)\s+(\S.*)$/i);
    this.sugList = []; this.sugI = -1;
    if (m) {
      const q = m[2].replace(/\s+\d+$/, '').trim().toLowerCase();
      if (q && !/\s\d+$/.test(m[2])) {
        const scored = [];
        for (const [id, it] of Object.entries(ITEMS)) {
          const n = it.n.toLowerCase(), il = id.toLowerCase(), en = itemEn(id).toLowerCase();
          const words = en.split(/[\s.]+/);
          let sc = il === q ? 0 : il.startsWith(q) ? 1 : en.startsWith(q) ? 1.5 : words.some(w => w.startsWith(q)) ? 2 : n.startsWith(q) ? 2.5 : il.includes(q) || en.includes(q) ? 3 : n.includes(q) ? 4 : (TYPE_LABEL[it.t] || '').includes(q) || it.t === q ? 5 : -1;
          if (sc >= 0) scored.push([sc, id]);
        }
        scored.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
        this.sugList = scored.slice(0, 12).map(s => s[1]); this.sugI = this.sugList.length ? 0 : -1; this.sugCmd = m[1].toLowerCase();
      }
    }
    this.drawSug();
  },
  drawSug() {
    this.sug.innerHTML = '';
    this.sug.classList.toggle('show', this.sugList.length > 0);
    this.sugList.forEach((id, i) => {
      const it = ITEMS[id], row = U.el('div', { class: 'dc-s' + (i === this.sugI ? ' on' : ''), onmousedown: ev => { ev.preventDefault(); this.pickSug(i); }, onmousemove: () => { if (this.sugI !== i) this.markSug(i, true); } });
      row.innerHTML = `<span class="ic">${Art.icon(id)}</span><b>${itemEn(id)}</b><span class="th">${it.n}</span><code>${id}</code><small>${TYPE_LABEL[it.t] || it.t}</small>`;
      this.sug.appendChild(row);
    });
    this.sug.scrollTop = 0;
  },
  // move the single highlight without rebuilding the list, and keep it in view
  markSug(i, mouse) {
    const rows = this.sug.children;
    if (rows[this.sugI]) rows[this.sugI].classList.remove('on');
    this.sugI = i;
    const r = rows[i]; if (!r) return;
    r.classList.add('on');
    if (!mouse) {
      const top = r.offsetTop, bot = top + r.offsetHeight;
      if (top < this.sug.scrollTop) this.sug.scrollTop = top;
      else if (bot > this.sug.scrollTop + this.sug.clientHeight) this.sug.scrollTop = bot - this.sug.clientHeight;
    }
  },
  pickSug(i) {
    const id = this.sugList[i]; if (!id) return;
    this.inp.value = `${this.sugCmd} ${id} `; this.sugList = []; this.sugI = -1; this.drawSug(); this.inp.focus();
  },
  print(t, cls) {
    const line = U.el('div', { class: 'dc-line ' + (cls || '') }); line.textContent = t;
    this.out.appendChild(line); while (this.out.children.length > 200) this.out.firstChild.remove();
    this.out.scrollTop = this.out.scrollHeight;
  },
  refresh() { State.save(); if (Run.active && Run.panel && Run.panel !== 'pause' && typeof UIRun !== 'undefined' && UIRun.render) UIRun.render(); if (!Run.active && typeof UI !== 'undefined' && document.querySelector('#screen.base')) UI.renderBase(); },
  inRun() { return Run.active && !Run.over && Run.p; },
  needRun() { if (!this.inRun()) { this.print('ต้องอยู่ในด่าน', 'err'); return false; } return true; },
  needGame() { if (typeof G === 'undefined' || !G) { this.print('ยังไม่มีเซฟ — เริ่มเกมก่อน', 'err'); return false; } return true; },
  findItem(q) {
    if (!q) return null; q = q.toLowerCase();
    if (ITEMS[q]) return q;
    const ids = Object.keys(ITEMS);
    return ids.find(id => id.toLowerCase().startsWith(q)) || ids.find(id => itemEn(id).toLowerCase().startsWith(q)) || ids.find(id => itemEn(id).toLowerCase().split(/[\s.]+/).some(w => w.startsWith(q))) || ids.find(id => ITEMS[id].n.toLowerCase().includes(q)) || null;
  },
  findStage(q) {
    if (!q) return null;
    if (STAGE_BY_ID[q]) return STAGE_BY_ID[q];
    if (/^\d+$/.test(q)) return STAGES[+q - 1] || null; // 1-based global order
    return STAGES.find(s => s.n.includes(q)) || null;
  },
  complete() {
    const v = this.inp.value, parts = v.split(/\s+/);
    let pool;
    if (parts.length <= 1) pool = Object.keys(this.cmds);
    else if (['give', 'items'].includes(parts[0])) pool = Object.keys(ITEMS);
    else if (['char', 'play'].includes(parts[0])) pool = ['all', ...Object.keys(CHARACTERS)];
    else if (['unlock', 'clear', 'go', 'locs'].includes(parts[0]) && parts.length === 2) pool = ['all', ...STAGES.map(s => s.id)];
    else if (parts[0] === 'role') pool = ['all', ...Object.keys(ROLES)];
    else if (parts[0] === 'open') pool = ['all', ...KeyGraph.targets.map(t => t.id)];
    else return;
    const last = parts[parts.length - 1].toLowerCase(), m = pool.filter(x => x.toLowerCase().startsWith(last));
    if (m.length === 1) { parts[parts.length - 1] = m[0]; this.inp.value = parts.join(' ') + ' '; }
    else if (m.length > 1) this.print(m.slice(0, 40).join('  '), 'dim');
  },
  run(line) {
    this.print('> ' + line, 'cmd');
    const [c, ...a] = line.split(/\s+/), f = this.cmds[c.toLowerCase()];
    if (!f) { this.print(`ไม่รู้จักคำสั่ง "${c}" — พิมพ์ help`, 'err'); return; }
    try { f.fn.call(this, a); } catch (e) { this.print('ผิดพลาด: ' + e.message, 'err'); console.error(e); }
  },
  cmds: {
    help: { d: 'ดูคำสั่งทั้งหมด', fn() { for (const [k, v] of Object.entries(Dev.cmds)) Dev.print(`${(k + ' ' + (v.u || '')).padEnd(26)} ${v.d}`); } },
    clr: { d: 'ล้างหน้าจอ console', fn() { this.out.innerHTML = ''; } },
    items: { u: '[คำค้น]', d: 'ค้นหาไอเทม (รหัส / อังกฤษ / ไทย)', fn(a) {
      const q = (a[0] || '').toLowerCase();
      const list = Object.entries(ITEMS).filter(([id, it]) => !q || id.includes(q) || itemEn(id).toLowerCase().includes(q) || it.n.toLowerCase().includes(q) || it.t === q);
      for (const [id, it] of list.slice(0, 60)) this.print(`${id.padEnd(14)} ${itemEn(id).padEnd(28)} ${it.n}`);
      if (list.length > 60) this.print(`…และอีก ${list.length - 60} รายการ — พิมพ์คำค้นให้แคบลง`, 'dim');
    } },
    give: { u: '<ไอเทม> [จำนวน]', d: 'เสกไอเทมเข้าเป้ (เต็ม: ในด่าน=วางพื้น, ที่ฐาน=คลัง)', fn(a) {
      if (!this.needGame()) return;
      const id = this.findItem(a[0]); if (!id) { this.print('ไม่พบไอเทม — ลอง items <คำค้น>', 'err'); return; }
      const n = Math.max(1, parseInt(a[1]) || (ITEMS[id].t === 'ammo' ? 60 : 1)), it = ITEMS[id];
      const make = () => it.t === 'weapon' ? Inv.makeWeapon(id) : { id, q: n };
      // in a run: backpack first, the rest dropped at your feet · at base: backpack first, the rest to the stash
      const inRun = this.inRun(), pack = inRun ? Run.p.backpack : G.backpack, grid = inRun ? Run.p.grid : State.grid();
      let inPack = 0, out = 0;
      const overflow = (e) => { if (inRun) Run.dropBag(Run.p.x, Run.p.f, Run.p.room, [e]); else Inv.addFree(G.stash, e); };
      if (it.t === 'weapon') for (let i = 0; i < n; i++) { const w = make(); if (Inv.addToPack(pack, w, grid)) { overflow(w); out++; } else inPack++; }
      else { const left = Inv.addToPack(pack, make(), grid) || 0; inPack = n - left; out = left; if (left) overflow({ id, q: left }); }
      const where = out ? (inRun ? `วางที่พื้น ${out}` : `เข้าคลัง ${out}`) : '';
      this.print(`✔ ได้ ${it.n} ×${n}` + (inPack ? ` · เข้าเป้ ${inPack}` : '') + (where ? ' · ' + where : ''), 'ok'); this.refresh();
    } },
    money: { u: '<จำนวน>', d: 'เพิ่มเงิน', fn(a) { if (!this.needGame()) return; const n = parseInt(a[0]) || 10000; if (this.inRun()) Run.cash += n; else G.money += n; this.print(`✔ +${n}`, 'ok'); this.refresh(); } },
    heal: { d: 'เลือด/อิ่ม/สตามินาเต็ม ล้างการติดเชื้อ', fn() {
      if (!this.needGame()) return;
      if (this.inRun()) { const p = Run.p; p.hp = p.maxHp; p.hunger = 100; p.stam = 100; p.inf = 0; }
      else { const cs = G.chars[G.char]; cs.hp = CHARACTERS[G.char].hp; cs.inf = 0; }
      this.print('✔ ฟื้นฟูเต็ม', 'ok'); this.refresh();
    } },
    god: { d: 'เปิด/ปิดโหมดอมตะ', fn() { Dev.god = !Dev.god; this.print('god mode: ' + (Dev.god ? 'เปิด' : 'ปิด'), 'ok'); } },
    char: { u: '<id|all>', d: 'ปลดล็อกตัวละคร', fn(a) {
      if (!this.needGame()) return;
      const ids = a[0] === 'all' ? Object.keys(CHARACTERS) : [a[0]];
      for (const id of ids) { if (!CHARACTERS[id]) { this.print('ไม่มีตัวละคร ' + id + ' — มี: ' + Object.keys(CHARACTERS).join(', '), 'err'); return; } State.unlockChar(id); }
      this.print('✔ ปลดล็อก ' + ids.join(', '), 'ok'); this.refresh();
    } },
    play: { u: '<id>', d: 'เปลี่ยนตัวละครที่ใช้ (ที่ฐาน)', fn(a) {
      if (!this.needGame()) return; if (this.inRun()) { this.print('ใช้ที่ฐานเท่านั้น', 'err'); return; }
      if (!CHARACTERS[a[0]]) { this.print('ไม่มีตัวละครนี้', 'err'); return; }
      State.unlockChar(a[0]); G.char = a[0]; this.print('✔ ตอนนี้เล่นเป็น ' + CHARACTERS[a[0]].n, 'ok'); this.refresh();
    } },
    role: { u: '<id|all>', d: 'เพิ่มผู้เชี่ยวชาญที่ฐาน', fn(a) {
      if (!this.needGame()) return;
      const ids = a[0] === 'all' ? Object.keys(ROLES) : [a[0]];
      for (const id of ids) { if (!ROLES[id]) { this.print('มี: ' + Object.keys(ROLES).join(', '), 'err'); return; } if (!G.roles[id]) { G.roles[id] = true; G.survivors.push({ name: ROLES[id].who, role: id }); } }
      this.print('✔ เพิ่ม ' + ids.join(', '), 'ok'); this.refresh();
    } },
    stages: { d: 'รายชื่อด่าน (รหัส · ลำดับ)', fn() { this.print(STAGES.map((s, i) => `${i + 1}.${s.id} ${s.n}${G && G.unlocked[s.id] ? '' : '🔒'}${G && G.completed[s.id] ? '✓' : ''}`).join('  ')); } },
    locs: { u: '<ด่าน>', d: 'ดู location ในด่าน', fn(a) {
      const st = this.findStage(a[0]); if (!st) { this.print('ไม่พบด่าน (ใช้รหัส ลำดับ หรือชื่อ)', 'err'); return; }
      const prog = G ? State.stageProg(st.id) : { cleared: [] };
      st.locs.forEach((l, i) => { const t = KeyGraph.locTarget(st.id, i); this.print(`  [${i}] ${l.n} (${THEMES[l.theme].n})${prog.cleared.includes(i) ? ' ✓' : ''}${t ? (KeyGraph.opened(t) ? ' 🔓' : ' 🔒 ' + t.id) : ''}${KeyGraph.sourcesAt(st.id, i).map(t => ' 🔑' + t.id + '(' + KeyGraph.method(t) + ')').join('')}`); });
    } },
    unlock: { u: '<ด่าน|all>', d: 'ปลดล็อกด่าน (+คีย์ของด่านนั้น)', fn(a) {
      if (!this.needGame()) return;
      const list = a[0] === 'all' ? STAGES : [this.findStage(a[0])];
      if (!list[0]) { this.print('ไม่พบด่าน', 'err'); return; }
      for (const st of list) { G.unlocked[st.id] = true; const t = KeyGraph.stageTarget(st.id); if (t) KeyGraph.open(t.id); }
      this.print('✔ ปลดล็อก ' + (a[0] === 'all' ? 'ทุกด่าน' : list[0].n), 'ok'); this.refresh();
    } },
    clear: { u: '<ด่าน|all>', d: 'นับว่าผ่านด่าน (ทุก location)', fn(a) {
      if (!this.needGame()) return;
      const list = a[0] === 'all' ? STAGES : [this.findStage(a[0])];
      if (!list[0]) { this.print('ไม่พบด่าน', 'err'); return; }
      for (const st of list) { const p = State.stageProg(st.id); p.cleared = st.locs.map((_, i) => i); G.completed[st.id] = true; G.unlocked[st.id] = true; const i = STAGES.indexOf(st); if (STAGES[i + 1]) G.unlocked[STAGES[i + 1].id] = true; }
      this.print('✔ ผ่านแล้ว', 'ok'); this.refresh();
    } },
    open: { u: '<คีย์|all>', d: 'ปลดล็อก location/ด่านที่ต้องใช้คีย์', fn(a) {
      if (!this.needGame()) return;
      const ids = a[0] === 'all' ? KeyGraph.targets.map(t => t.id) : [a[0]];
      for (const id of ids) { if (!KeyGraph.byKey[id]) { this.print('ไม่พบคีย์ ' + id + ' (ดูด้วย locs <ด่าน>)', 'err'); return; } KeyGraph.open(id); }
      this.print('✔ เปิด ' + ids.length + ' จุด', 'ok'); this.refresh();
    } },
    go: { u: '<ด่าน> [location]', d: 'เข้าด่านทันที (ข้ามเงื่อนไขล็อก)', fn(a) {
      if (!this.needGame()) return;
      const st = this.findStage(a[0]); if (!st) { this.print('ไม่พบด่าน', 'err'); return; }
      const li = a[1] != null ? U.clamp(parseInt(a[1]) || 0, 0, st.locs.length - 1) : (State.currentLoc(st.id) ?? 0);
      G.unlocked[st.id] = true;
      if (Run.active) { Run.active = false; Run.over = true; }
      if (typeof UIRun !== 'undefined' && UIRun.close) try { UIRun.close(); } catch (e) { }
      this.toggle(false);
      Run.start(st.id, li, false);
      this.print(`✔ เข้า ${st.locs[li].n} (${st.n})`, 'ok');
    } },
    reset: { d: 'ลบเซฟทั้งหมด แล้วเริ่มเหมือนเล่นครั้งแรก (มีของเริ่มต้น + สอนเล่น)', fn() {
      this.toggle(false);
      UI.ask('ลบเซฟทั้งหมด?', 'ของในคลัง ผู้รอดชีวิต และความคืบหน้าจะหายทั้งหมด\nแล้วกลับไปหน้าเมนูหลักเหมือนเปิดเกมครั้งแรก', 'ลบเซฟ', () => {
        if (Run.active) { Run.active = false; Run.over = true; }
        try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
        G = null; Tut.hide(); UI.showTitle(); toast('ลบเซฟแล้ว — กด “เริ่มเกมใหม่” เพื่อเล่นตั้งแต่ต้น', 'good');
      }, true);
    } },
    tutorial: { u: '[run]', d: 'เล่นการสอนอีกครั้งบนเซฟนี้: ด่านสอนเล่น → สอนใช้ฐาน (run = เฉพาะด่านสอนเล่น)', fn(a) {
      if (!this.needGame()) return;
      G.tut = { base: true, run: true }; Tut.baseStep = 0; State.save();
      if (a[0] === 'run') {
        const st = STAGES[0];
        if (Run.active) { Run.active = false; Run.over = true; }
        if (typeof UIRun !== 'undefined' && UIRun.close) try { UIRun.close(); } catch (e) { }
        G.tut.base = false; this.toggle(false); Run.start(st.id, State.stageProg(st.id).order[0], false);
        this.print('✔ เข้าด่านสอนเล่น', 'ok'); return;
      }
      if (!Run.active) { this.toggle(false); UI.showBase(); }
      this.print('✔ เปิดการสอนแล้ว — เข้าด่านสอนเล่นก่อน แล้วสอนการใช้ฐานตอนกลับมา', 'ok');
    } },
    boss: { d: 'เรียกบอสทันที', fn() { if (!this.needRun()) return; Run.bossSpawned = false; Run.spawnBoss(); this.print('✔ บอสมาแล้ว ×' + Run.bosses.length, 'ok'); } },
    killall: { d: 'ฆ่าซอมบี้ทั้งหมดในด่าน', fn() { if (!this.needRun()) return; let n = 0; for (const z of Run.zombies) if (!z.dead) { Run.damageZombie(z, Math.ceil(z.hp) + 1, 0); n++; } this.print(`✔ ฆ่า ${n} ตัว`, 'ok'); } },
    level: { u: '<n>', d: 'ตั้งระดับอันตราย', fn(a) { if (!this.needRun()) return; const n = Math.max(1, parseInt(a[0]) || 1); Run.dangerPts = (n - 1) * (Run.dangerStep || 45); Run.level = n; this.print('✔ ระดับ ' + n, 'ok'); } },
    wave: { d: 'เรียกฝูงซอมบี้ทันที', fn() { if (!this.needRun()) return; Run.waveT = 0.1; this.print('✔ ฝูงกำลังมา', 'ok'); } },
    nowave: { d: 'หยุดฝูง/ซอมบี้เกิดเพิ่ม', fn() { if (!this.needRun()) return; Run.waveT = 1e9; Run.trickleT = 1e9; this.print('✔ หยุดการเกิดซอมบี้', 'ok'); } },
    reveal: { d: 'เปิดแผนที่ทั้งหมด + ไฟฟ้า', fn() { if (!this.needRun()) return; for (const rm of Run.map.rooms) rm.revealed = true; Run.powered = true; this.print('✔ เปิดแผนที่', 'ok'); } },
    tp: { u: '<exit|roof|x>', d: 'วาร์ปไปจุดอพยพ หรือพิกัด x', fn(a) {
      if (!this.needRun()) return; const p = Run.p;
      const ex = a[0] === 'roof' ? Run.exits[1] : a[0] === 'exit' || !a[0] ? Run.exits[0] : null;
      if (ex) { p.f = ex.f; p.x = ex.x; p.room = ex.room; }
      else { const x = parseFloat(a[0]); const rm = roomAt(Run.map, p.f, x); if (!rm) { this.print('ตำแหน่งนอกแผนที่', 'err'); return; } p.x = x; p.room = rm.id; }
      p.climb = null; this.print('✔ วาร์ปแล้ว', 'ok');
    } },
    extract: { d: 'อพยพออกทันที (นับว่ารอด)', fn() { if (!this.needRun()) return; this.toggle(false); Run.endRun(true); } },
    done: { d: 'ทำเงื่อนไขผ่านด่านครบทันที', fn() { if (!this.needRun()) return; for (const o of Run.objectives) if (!o.optional) { o.done = true; o.cur = o.target; } Run.checkAllDone(); this.print('✔ ผ่านเงื่อนไขแล้ว', 'ok'); } },
    save: { d: 'บันทึกเกม', fn() { if (!this.needGame()) return; State.save(); this.print('✔ บันทึกแล้ว', 'ok'); } },
  },
};
// don't wait for 'load' (web fonts can delay it for seconds); all game scripts above are already parsed
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Dev.init()); else Dev.init();
