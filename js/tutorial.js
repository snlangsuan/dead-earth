// ---------- First-time player: starter kit, a short base tour, and the first location as a guided tutorial ----------
// G.tut = { base: true, run: true } is set by a new game only (old saves never see it).
// Order: a new game goes straight into the tutorial location; the base tour runs when you first come home.
// The tutorial run is the stage's first location played for the first time: calm (no waves, no trickle, danger
// frozen, a handful of slow walkers), with a hint box that advances as you do each thing. Dying there keeps your
// backpack and just sends you home; either way the tutorial ends and the normal flow continues.
const Tut = {
  box: null,
  show(html, buttons, mode) {
    if (!this.box) { this.box = U.el('div', { id: 'tutbox' }); document.body.appendChild(this.box); }
    this.box.className = mode || '';
    this.box.innerHTML = ''; this.box.style.display = 'block';
    const t = U.el('div', { class: 'tt' }); t.innerHTML = html; this.box.appendChild(t);
    const row = U.el('div', { class: 'tb' });
    for (const [label, fn, cls] of buttons || []) row.appendChild(U.el('button', { class: 'btn small ' + (cls || ''), onclick: fn }, label));
    this.box.appendChild(row);
  },
  hide() { if (this.box) this.box.style.display = 'none'; document.querySelectorAll('.tut-hl').forEach(e => e.classList.remove('tut-hl')); },

  // ---- base tour: each step is something you actually do; it moves on by itself when you've done it ----
  BASE: [
    { hl: '[data-tab="load"]', t: 'กดแท็บ <b>เตรียมตัว</b>', ok: () => UI.tab === 'load' },
    { hl: () => { const g = [...document.querySelectorAll('.col.stash .grid > :not(.emptytxt)')], n = ITEMS.canned.n; return g.find(e => (e.title || '').includes(n) || e.textContent.includes(n)) || g[0]; },
      t: '<b>ลาก</b>ของจากคลัง (เช่น อาหารกระป๋อง) ไปวางในเป้<br><small>ลากอาวุธ/เกราะใส่ช่องด้านบนได้ · คลิกขวาที่ของ = เมนู</small>',
      start: () => { Tut.dragged = false; }, ok: () => Tut.dragged },
    { hl: '[data-tab="craft"]', t: 'กดแท็บ <b>โรงช่าง</b> — สร้าง/อัปเกรดอาวุธ คราฟต์กระสุน ยา และชุดซ่อม', ok: () => UI.tab === 'craft' },
    { hl: '[data-tab="shop"]', t: 'กดแท็บ <b>ร้านค้า</b> — ซื้อ/ขายของ สินค้าเปลี่ยนทุกครั้งที่กลับจากด่าน', ok: () => UI.tab === 'shop' },
    { hl: '[data-tab="surv"]', t: 'กดแท็บ <b>ผู้รอดชีวิต</b> — คนที่ช่วยมาจะทำงานในฐาน แต่กินเสบียง', ok: () => UI.tab === 'surv' },
    { hl: '[data-tab="map"]', t: 'กดแท็บ <b>แผนที่โลก</b> — ป้าย <b>Lv</b> บอกความยากของแต่ละ location', ok: () => UI.tab === 'map' },
    { hl: () => [...document.querySelectorAll('button')].find(b => b.textContent.startsWith('ออกสำรวจ')),
      t: 'กด <b>ออกสำรวจ</b> เมื่อพร้อม<br><small>จากนี้มีฝูงซอมบี้และระดับอันตรายตามปกติ · ตายแล้ว<b>ของในเป้หาย</b></small>', ok: () => false },
  ],
  baseStep: 0, baseTimer: 0, baseShown: -1,
  packQ() { return G.backpack.reduce((n, e) => n + (e.q || 1), 0); },
  baseEnd() { if (G && G.tut) G.tut.base = false; clearInterval(this.baseTimer); this.baseTimer = 0; State.save(); this.hide(); },
  baseTour() {
    if (!G || !G.tut || !G.tut.base || G.tut.run || Run.active || Run.panel === 'result') return;
    const s = this.BASE[this.baseStep]; if (!s) { this.baseEnd(); return; }
    if (this.baseShown !== this.baseStep) { this.baseShown = this.baseStep; s.start && s.start(); }
    document.querySelectorAll('.tut-hl').forEach(e => e.classList.remove('tut-hl'));
    const el = typeof s.hl === 'function' ? s.hl() : s.hl && document.querySelector(s.hl); if (el) el.classList.add('tut-hl');
    this.show(`<div class="tk">สอนการใช้ฐาน ${this.baseStep + 1}/${this.BASE.length}</div>` + s.t, [['ข้ามการสอน', () => this.baseEnd(), 'ghost']]);
    if (!this.baseTimer) this.baseTimer = setInterval(() => {
      if (!G || !G.tut || !G.tut.base || Run.active || Run.panel === 'result') { clearInterval(this.baseTimer); this.baseTimer = 0; return; }
      const c = this.BASE[this.baseStep];
      if (c && c.ok()) { this.baseStep++; Snd.ui && Snd.ui(); this.baseTour(); }
      else if (c && typeof c.hl === 'function' && !document.querySelector('.tut-hl')) { const e = c.hl(); if (e) e.classList.add('tut-hl'); }
    }, 250);
  },

  // ---- tutorial run: one action per step, an arrow over the thing to use, no "next" buttons ----
  // ok(r) advances; start(r) runs on entering the step (return false = this map can't do it, skip); at(r) = {x, f} target
  near(r, list) { const p = r.p; let best = null, bd = 1e9; for (const o of list) { const d = Math.abs(o.x - p.x) + Math.abs(o.f - p.f) * 500; if (d < bd) { bd = d; best = o; } } return best; },
  RUN: [
    { t: 'เดินด้วย <kbd>A</kbd> <kbd>D</kbd> (หรือ ← →)', ok: r => Math.abs(r.p.x - r.tut.x0) > 160 },
    { t: 'กด <kbd>Shift</kbd> ค้างขณะเดินเพื่อ<b>วิ่ง</b> <small>(เร็วแต่เสียงดัง · <kbd>' + Keys.lbl('sneak') + '</kbd> ค้าง = ย่องเงียบ)</small>', ok: r => r.tut.runT > 0.7 },
    { t: 'ไปที่เฟอร์นิเจอร์ที่ลูกศรชี้ แล้วกด <kbd>Q</kbd> ค้นของ <small>(ยืนนิ่งจนหลอดเต็ม)</small>',
      start: r => { r.tut.s0 = Tut.searchCount(r); return true; }, ok: r => Tut.searchCount(r) > r.tut.s0,
      at: r => { const fs = []; for (const rm of r.map.rooms) for (const f of rm.furn || []) if (r.canSearch(f)) fs.push({ x: f.x, f: rm.f }); return Tut.near(r, fs); } },
    { t: 'กด <kbd>Tab</kbd> เปิดเป้ ดูของที่ได้ แล้วกด <kbd>Tab</kbd> อีกครั้งเพื่อปิด <small>(คลิกขวาที่ของ = เมนู)</small>', start: r => { r.tut.inv = false; return true; }, ok: r => r.tut.inv && !r.panel },
    { t: 'ไปที่<b>ประตู</b>ที่ลูกศรชี้ แล้วกด <kbd>E</kbd> เปิด/ปิด <small>(ประตูที่ปิดกันซอมบี้ได้ · <kbd>B</kbd> ค้าง = ตอกไม้)</small>',
      start: r => { r.tut.door = false; return r.map.doors.some(d => !d.lk && !d.broken); }, ok: r => r.tut.door,
      at: r => Tut.near(r, r.map.doors.filter(d => !d.lk && !d.broken)) },
    { t: 'ไปที่<b>บันได</b>ที่ลูกศรชี้ แล้วกด <kbd>W</kbd> ขึ้น / <kbd>S</kbd> ลง', start: r => r.map.ladders.length > 0, ok: r => !!r.p.climb,
      at: r => Tut.near(r, r.map.ladders.flatMap(l => [{ x: l.x, f: l.lo }, { x: l.x, f: l.lo + 1 }])) },
    { t: '<b>ซอมบี้!</b> คลิกซ้ายหรือ <kbd>Space</kbd> โจมตีจนมันล้ม <small>(<kbd>1</kbd>–<kbd>3</kbd> สลับอาวุธ · <kbd>R</kbd> รีโหลด)</small>',
      start: r => { r.tut.k0 = r.kills; r.tutZombie(); return true; }, ok: r => r.kills > r.tut.k0,
      at: r => { const z = r.tut.z; return z && !z.dead ? { x: z.x, f: z.f, up: 150 } : null; } },
    { t: 'เลือดลดแล้ว — กด <kbd>4</kbd> ใช้<b>ผ้าพันแผล</b>จากปุ่มลัด <small>(ลากยา/อาหารไปช่องปุ่มลัดในเป้ได้)</small>',
      start: r => { if (!Inv.count(r.p.backpack, 'bandage')) return false; if (r.p.hp > r.p.maxHp - 15) r.p.hp = r.p.maxHp - 20; r.tut.b0 = Inv.count(r.p.backpack, 'bandage'); return true; },
      ok: r => !!r.medJob || Inv.count(r.p.backpack, 'bandage') < r.tut.b0 },
    { t: 'ไปที่ตู้/เตียงที่ลูกศรชี้ แล้วกด <kbd>H</kbd> <b>ซ่อนตัว</b> <small>(ซอมบี้ที่ไล่อยู่จะหาไม่เจอ)</small>',
      start: r => r.map.rooms.some(rm => (rm.furn || []).some(f => HIDE_SPOTS[f.kind])), ok: r => !!r.p.hidden,
      at: r => { const fs = []; for (const rm of r.map.rooms) for (const f of rm.furn || []) if (HIDE_SPOTS[f.kind]) fs.push({ x: f.x, f: rm.f }); return Tut.near(r, fs); } },
    { t: 'กด <kbd>H</kbd> อีกครั้งเพื่อออกจากที่ซ่อน', start: r => !!r.p.hidden, ok: r => !r.p.hidden },
    { t: 'ไป<b>จุดอพยพ</b>ที่ลูกศรชี้ (ป้าย EXIT) แล้วกด <kbd>E</kbd> กลับฐานพร้อมของ<br><small>มุมซ้ายบน = ระดับอันตราย (อยู่นาน/เสียงดัง ซอมบี้ยิ่งเยอะ) · <b>ปกติตายแล้วของในเป้หาย</b></small>',
      ok: () => false, at: r => Tut.near(r, r.exits || []) },
  ],
  searchCount(r) { let n = 0; for (const rm of r.map.rooms) for (const f of rm.furn || []) n += f.sdone || 0; return n; },
  runShow(r) {
    const s = this.RUN[r.tut.step]; if (!s) { this.hide(); return; }
    this.show(`<div class="tk">ด่านสอนเล่น ${r.tut.step + 1}/${this.RUN.length}</div>` + s.t + '<div class="tdir"></div>', [['ปิดการสอน', () => { r.tut.off = true; this.hide(); }, 'ghost']], 'run');
  },
  advance(r) {
    r.tut.step++; Snd.ui && Snd.ui();
    let s = this.RUN[r.tut.step];
    while (s && s.start && s.start(r) === false) s = this.RUN[++r.tut.step];   // nothing on this map for that step
    if (!r.tut.off) this.runShow(r);
  },
  target(r) { const s = r.tut && !r.tut.off && this.RUN[r.tut.step]; return s && s.at ? s.at(r) : null; },
  // where the target is, as words, for when the arrow is off screen or on another floor
  dirText(r) {
    const t = this.target(r); if (!t) return '';
    const p = r.p;
    if (t.f > p.f) return '▲ อยู่ชั้นบน — หาบันได';
    if (t.f < p.f) return '▼ อยู่ชั้นล่าง — หาบันได';
    const dx = t.x - p.x; return Math.abs(dx) < 50 ? '● ตรงนี้' : dx > 0 ? 'ไปทางขวา ›' : '‹ ไปทางซ้าย';
  },
  drawMarker(run, ctx) {
    const t = this.target(run); if (!t) return;
    const y = floorY(t.f) - (t.up || 125) + Math.sin(run.time * 6) * 6;
    ctx.save(); ctx.fillStyle = '#f2b01e'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(t.x, y + 16); ctx.lineTo(t.x - 13, y); ctx.lineTo(t.x - 5, y); ctx.lineTo(t.x - 5, y - 14); ctx.lineTo(t.x + 5, y - 14); ctx.lineTo(t.x + 5, y); ctx.lineTo(t.x + 13, y); ctx.closePath();
    ctx.stroke(); ctx.fill(); ctx.restore();
  },
};

// ---- opening story (once, before the tutorial location) ----
const Story = {
  slides(ch, locName) {
    return [
      { k: 'วันที่ 0', t: ['มันเริ่มจากข่าวเล็กๆ ว่ามีคนป่วยกัดคนในโรงพยาบาล', 'สามวันต่อมา ทุกช่องทีวีเหลือแต่ภาพนิ่งกับเสียงไซเรน'] },
      { k: 'สัปดาห์ที่ 3', t: ['เมืองเงียบลง แต่ไม่ว่างเปล่า', 'พวกมันยังเดินอยู่ในตึก ในตลาด บนถนน — ตามเสียงที่ได้ยิน'] },
      { k: ch, t: [`${ch} รอดมาได้ในห้องเก็บของหลังตึกร้าง`, 'ที่นี่กลายเป็น “ฐาน” — มีกำแพง มีประตู แต่อาหารใกล้หมด'] },
      { k: 'คืนนี้', t: ['วิทยุเก่าที่ฐานจับสัญญาณได้ เสียงคนขอความช่วยเหลือ', `จาก <b>${locName}</b> — ไม่ไกลจากที่นี่`] },
      { k: 'ภารกิจแรก', t: ['ออกไปหาเสบียง ตามหาเจ้าของเสียง แล้วกลับมาให้ได้', '<i>อย่าทำเสียงดัง · ถ้าเจอฝูง ให้หนี</i>'] },
    ];
  },
  play(done) {
    const st = STAGES[0], li = State.stageProg(st.id).order[0];
    const S = this.slides(CHARACTERS[G.char].n, st.locs[li].n);
    let i = 0;
    const el = U.el('div', { id: 'story' }); document.body.appendChild(el);
    const bg = Override.get('ui_title'); if (bg) el.style.backgroundImage = `url(${bg.src})`;
    const finish = () => { removeEventListener('keydown', key, true); el.remove(); done(); };
    const next = () => { i++; if (i >= S.length) finish(); else draw(); };
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); finish(); } else if ([' ', 'Enter', 'ArrowRight'].includes(e.key)) { e.preventDefault(); next(); } };
    const draw = () => {
      const s = S[i];
      el.innerHTML = '';
      const box = U.el('div', { class: 'sbox' }, U.el('div', { class: 'sk' }, s.k));
      s.t.forEach((line, j) => { const p = U.el('p', { style: { animationDelay: (0.25 + j * 0.9) + 's' } }); p.innerHTML = line; box.appendChild(p); });
      el.appendChild(box);
      el.appendChild(U.el('div', { class: 'sfoot' },
        U.el('span', { class: 'sdots' }, S.map((_, j) => j === i ? '●' : '○').join(' ')),
        U.el('button', { class: 'btn ghost small', onclick: e => { e.stopPropagation(); finish(); } }, 'ข้าม'),
        U.el('button', { class: 'btn primary', onclick: e => { e.stopPropagation(); next(); } }, i === S.length - 1 ? 'ออกเดินทาง ›' : 'ต่อ ›')));
    };
    el.addEventListener('click', next);
    addEventListener('keydown', key, true);
    draw();
  },
};

(function hookTutorial() {
  // starter kit on a new game: a jacket, food, water, a repair kit and bandages on quick slot 4
  const _new = State.newGame;
  State.newGame = function (...a) {
    const r = _new.apply(this, a);
    G.tut = { base: true, run: true };
    G.armor = Inv.make('armor_jacket');
    for (const [id, q] of [['bandage', 2], ['water', 1]]) { const left = Inv.addToPack(G.backpack, { id, q }, State.grid()); if (left) Inv.addFree(G.stash, { id, q: left }); }
    for (const [id, q] of [['repairkit', 1], ['canned', 2], ['a9', 24]]) Inv.addFree(G.stash, { id, q });
    const qs = Run.quickSlots(); if (qs) qs[0] = 'bandage';
    Tut.baseStep = 0; Tut.baseShown = -1;
    return r;
  };
  const _gend = GridUI.end;
  GridUI.end = function (...a) {
    const src = this.drag && this.drag.src, fromStash = src && G && src.list === G.stash, n0 = fromStash ? Tut.packQ() : 0;
    const r = _gend.apply(this, a);
    if (fromStash && Tut.packQ() > n0) Tut.dragged = true;
    return r;
  };
  const _render = UI.renderBase;
  UI.renderBase = function (...a) { const r = _render.apply(this, a); if (G && G.tut && G.tut.base && !G.tut.run) setTimeout(() => Tut.baseTour(), 0); return r; };
  // first time in the base with the tutorial run still ahead: go straight into it
  const _showBase = UI.showBase;
  UI.showBase = function (...a) {
    const r = _showBase.apply(this, a);
    if (G && G.tut && G.tut.run && !Run.active && !document.getElementById('story')) setTimeout(() => {
      if (!G.tut || !G.tut.run || Run.active) return;
      const go = () => { const st = STAGES[0]; Run.start(st.id, State.stageProg(st.id).order[0], false); };
      if (G.tut.story) go(); else Story.play(() => { G.tut.story = true; State.save(); go(); });   // the opening story plays once
    }, 60);
    return r;
  };

  const _start = Run.start;
  Run.start = function (stageId, locIdx, farm, opts) {
    const r = _start.call(this, stageId, locIdx, farm, opts);
    Tut.hide();
    if (G.tut && G.tut.base && !G.tut.run) Tut.baseEnd();
    const st = STAGE_BY_ID[stageId];
    this.tut = null;
    if (G.tut && G.tut.run && !farm && !(opts && opts.restricted) && st.gi === 0 && State.stageProg(stageId).order[0] === locIdx) {
      this.tut = { step: 0, x0: this.p.x, k0: this.kills, inv: false, door: false, runT: 0 };
      // calm: level 1, no waves, no trickle, danger frozen, at most 3 slow walkers
      Object.assign(this, Levels.tune(1)); this.lv = 1; this.dangerStep = 1e9; this.level = 1; this.dangerPts = 0;
      this.waveT = 1e9; this.trickleT = 1e9; this.bossLvl = 99; this.bossKills = 1e9;
      this.zombies = this.zombies.filter(z => z.type === 'walker').slice(0, 3);
      for (const z of this.zombies) { z.spd *= 0.75; z.state = 'idle'; }
      // no waves here, so a kill objective can only ask for the zombies that are actually in the building (+ the lesson one)
      for (const o of this.objectives) if (o.type === 'kill') { o.target = Math.max(1, Math.min(o.target, this.zombies.length + 1)); o.label = `กำจัดซอมบี้ ${o.target} ตัว`; }
      Tut.runShow(this);
    }
    return r;
  };
  Run.tutZombie = function () { // one slow, weak walker a little ahead for the combat step
    const p = this.p, rm = this.map.rooms[p.room];
    const x = U.clamp(p.x + p.facing * 220, rm.x0 + 30, rm.x1 - 30);
    const z = this.spawnZombie('walker', rm, Math.abs(x - p.x) < 80 ? p.x - p.facing * 220 : x, true);
    if (z) { z.hp = z.maxHp = 30; z.spd *= 0.6; this.tut.z = z; }
  };
  const _upd = Run.update;
  Run.update = function (dt, ...a) {
    const r = _upd.call(this, dt, ...a);
    const t = this.tut;
    if (t && this.active && !this.over) {
      this.waveT = Math.max(this.waveT, 1e8); this.trickleT = Math.max(this.trickleT, 1e8);
      if (this.p.gait === 'run' && this.p.moving !== false) t.runT += dt;
      const s = Tut.RUN[t.step];
      if (s && s.ok(this)) Tut.advance(this);
      if (!t.off && Tut.box && (t.dirT = (t.dirT || 0) - dt) <= 0) { t.dirT = 0.25; const d = Tut.box.querySelector('.tdir'); if (d) d.textContent = Tut.dirText(this); }
    }
    return r;
  };
  const _inv = UIRun.openInventory;
  UIRun.openInventory = function (...a) { if (Run.tut) Run.tut.inv = true; return _inv.apply(this, a); };
  const _door = Run.toggleDoor;
  Run.toggleDoor = function (...a) { if (this.tut) this.tut.door = true; return _door.apply(this, a); };
  const _wui = R.drawWorldUI;
  R.drawWorldUI = function (run, ...a) { const r = _wui.call(this, run, ...a); if (run.tut) Tut.drawMarker(run, this.ctx); return r; };
  // the tutorial ends with the run; dying in it keeps the backpack
  const _die = Run.die;
  Run.die = function (...a) {
    const t = this.tut, keep = t && JSON.parse(JSON.stringify(this.p.backpack));
    const r = _die.apply(this, a);
    if (t) { G.backpack = keep; G.tut.run = false; this.tut = null; Tut.hide(); toast('ด่านสอนเล่น: ตายไม่เสียของในเป้ · จากนี้ไปตายแล้วของในเป้จะหาย', 'warn'); State.save(); }
    return r;
  };
  const _end = Run.endRun;
  Run.endRun = function (...a) {
    const t = this.tut; const r = _end.apply(this, a);
    if (t) { G.tut.run = false; this.tut = null; Tut.hide(); toast('จบด่านสอนเล่นแล้ว! ต่อจากนี้ฝูงซอมบี้และระดับอันตรายจะทำงานตามปกติ', 'good'); State.save(); }
    return r;
  };
})();
