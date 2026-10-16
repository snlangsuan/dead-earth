// ---------- Crafting at the base: combine two or more materials into something new ----------
// Basic recipes are known from the start. The rest need their recipe ("สูตร") — a paper found in locations and
// learned when you bring it home alive (like weapon blueprints). A survivor with the matching job at the base
// (doctor / engineer / cook / tailor) knows their trade's recipes, so rescuing them unlocks those without the paper.
// Everything is paid from the stash (+ money for a few) and the result goes to the stash.
const CRAFTS = [
  // basic
  { out: 'bandage', q: 3, cost: { cloth: 2, water: 1 }, cat: 'med' },
  { out: 'lockpick', q: 3, cost: { scrap: 1, nails: 2 }, cat: 'tool' },
  { out: 'repairkit', q: 1, cost: { scrap: 5, gunparts: 2 }, cat: 'tool' },
  { out: 'sewkit', q: 1, cost: { cloth: 3, nails: 1 }, cat: 'tool' },
  { out: 'spiketrap', q: 1, cost: { nails: 4, plank: 1 }, cat: 'boom' },
  { out: 'p_handle', q: 1, cost: { scrap: 1, cloth: 1 }, cat: 'tool' },
  { out: 'top_hoodie', q: 1, cost: { cloth: 5, scrap: 1 }, cat: 'gear' },
  { out: 'pack_school', q: 1, cost: { cloth: 4, scrap: 2 }, cat: 'gear' },
  // need a recipe (or the survivor with that job)
  { out: 'medkit', q: 1, cost: { bandage: 2, chem: 1 }, cat: 'med', rc: 1, role: 'doctor', at: ['medcab', 'lab'] },
  { out: 'pills', q: 2, cost: { chem: 1, water: 1 }, cat: 'med', rc: 1, role: 'doctor', at: ['medcab', 'lab'] },
  { out: 'antiviral', q: 1, cost: { chem: 3, elec: 1 }, money: 100, cat: 'med', rc: 1, role: 'doctor', at: ['lab'] },
  { out: 'a9', q: 30, cost: { scrap: 2, chem: 1 }, cat: 'boom', rc: 1, role: 'engineer', at: ['locker', 'toolbox'] },
  { out: 'a12', q: 12, cost: { scrap: 3, chem: 1 }, cat: 'boom', rc: 1, role: 'engineer', at: ['locker', 'weapons'] },
  { out: 'a556', q: 30, cost: { scrap: 3, chem: 2 }, cat: 'boom', rc: 1, role: 'engineer', at: ['weapons'] },
  { out: 'a44', q: 12, cost: { scrap: 3, chem: 2 }, cat: 'boom', rc: 1, role: 'engineer', at: ['weapons', 'locker'] },
  { out: 'bolt', q: 10, cost: { scrap: 3, plank: 1 }, cat: 'boom', rc: 1, role: 'engineer', at: ['toolbox'] },
  { out: 'pipebomb', q: 2, cost: { scrap: 2, chem: 1 }, cat: 'boom', rc: 1, role: 'engineer', at: ['toolbox', 'lab'] },
  { out: 'grenade', q: 1, cost: { scrap: 2, chem: 2 }, cat: 'boom', rc: 1, role: 'engineer', at: ['weapons'] },
  { out: 'mine', q: 1, cost: { scrap: 2, chem: 2, nails: 2 }, cat: 'boom', rc: 1, role: 'engineer', at: ['weapons', 'toolbox'] },
  { out: 'grip', q: 1, cost: { gunparts: 2, scrap: 3 }, cat: 'att', rc: 1, role: 'engineer', at: ['toolbox', 'weapons'] },
  { out: 'extmag', q: 1, cost: { gunparts: 3, scrap: 4 }, cat: 'att', rc: 1, role: 'engineer', at: ['weapons'] },
  { out: 'silencer', q: 1, cost: { gunparts: 4, scrap: 3 }, money: 150, cat: 'att', rc: 1, role: 'engineer', at: ['weapons'] },
  { out: 'scope', q: 1, cost: { gunparts: 3, elec: 2 }, money: 150, cat: 'att', rc: 1, role: 'engineer', at: ['weapons', 'desk'] },
  { out: 'stew', q: 1, cost: { canned: 2, water: 1 }, cat: 'food', rc: 1, role: 'cook', at: ['fridge', 'shop'] },
  { out: 'mre', q: 1, cost: { canned: 1, bar: 2, water: 1 }, cat: 'food', rc: 1, role: 'cook', at: ['fridge', 'supply'] },
  { out: 'top_field', q: 1, cost: { cloth: 6, scrap: 2 }, cat: 'gear', rc: 1, role: 'tailor', at: ['wardrobe', 'locker'] },
  { out: 'pants_cargo', q: 1, cost: { cloth: 5, nails: 2 }, cat: 'gear', rc: 1, role: 'tailor', at: ['wardrobe', 'shop'] },
  { out: 'pants_tac', q: 1, cost: { cloth: 7, scrap: 3 }, money: 120, cat: 'gear', rc: 1, role: 'tailor', at: ['locker', 'weapons'] },
  { out: 'top_tac', q: 1, cost: { cloth: 6, scrap: 4, gunparts: 1 }, money: 200, cat: 'gear', rc: 1, role: 'tailor', at: ['weapons'] },
  { out: 'pack_hiking', q: 1, cost: { cloth: 8, scrap: 3 }, money: 100, cat: 'gear', rc: 1, role: 'tailor', at: ['shop', 'locker'] },
  { out: 'pack_military', q: 1, cost: { cloth: 10, scrap: 6, nails: 6 }, money: 300, cat: 'gear', rc: 1, role: 'tailor', at: ['weapons'] },
  { out: 'armor_stab', q: 1, cost: { scrap: 6, cloth: 4 }, cat: 'gear', rc: 1, at: ['locker', 'weapons'] },
  { out: 'armor_vest', q: 1, cost: { scrap: 10, cloth: 4, elec: 1 }, money: 250, cat: 'gear', rc: 1, at: ['weapons'] },
].filter(c => ITEMS[c.out] && Object.keys(c.cost).every(id => ITEMS[id]));
const CRAFT_CATS = [['all', 'ทั้งหมด'], ['med', 'ยา'], ['boom', 'กระสุน/ระเบิด'], ['att', 'อุปกรณ์เสริม'], ['food', 'อาหาร'], ['gear', 'เครื่องแต่งกาย'], ['tool', 'เครื่องมือ']];
const LOOT_NAMES = { medcab: 'ตู้ยา', lab: 'โต๊ะแล็บ', locker: 'ล็อกเกอร์', toolbox: 'กล่องเครื่องมือ', weapons: 'ลังอาวุธ', fridge: 'ตู้เย็น', shop: 'ชั้นวางร้าน', supply: 'กล่องเสบียง', wardrobe: 'ตู้เสื้อผ้า', desk: 'โต๊ะทำงาน' };

// recipe papers: rc_<output>, found in the matching furniture, learned when brought home
for (const c of CRAFTS) if (c.rc) {
  const id = 'rc_' + c.out, it = ITEMS[c.out];
  ITEMS[id] = { n: 'สูตร: ' + it.n, t: 'blueprint', rc: c.out, icon: '📜', sz: 1, gw: 1, gh: 1, st: 1, v: Math.max(40, Math.round((it.v || 50) * Math.min(3, c.q) * 0.4)), tier: null,
    desc: `นำกลับฐานเพื่อเรียนรู้วิธีประดิษฐ์ ${it.n} ที่โรงช่าง` };
  ICON_ART[id] = ICON_ART.blueprint;
  for (const k of c.at || []) if (LOOT[k]) LOOT[k].push([id, 1.2, 1, 1]);
}

// skill: every recipe belongs to a trade. Having the right person (a survivor with that job at the base — or, for
// explosives and traps, playing the demolition engineer) means normal materials, half the time and a 25% chance of
// extra output. Without them it still works, but takes 50% more material and twice as long.
const TRADE_OF = { med: 'doctor', boom: 'engineer', att: 'engineer', tool: 'engineer', food: 'cook' };
const CRAFT_T = { skilled: 3, unskilled: 6 };   // seconds at the workbench
const Craft = {
  cat: 'all', job: null, timer: 0,
  known(c) { return !!(!c.rc || (G.recipes || []).includes(c.out) || (c.role && G.roles && G.roles[c.role])); },
  trade(c) { return c.role || (c.cat === 'gear' ? (/^(top_|pants_|pack_)/.test(c.out) ? 'tailor' : 'engineer') : TRADE_OF[c.cat] || 'engineer'); },
  skilled(c) {
    const t = this.trade(c);
    if (G.roles && G.roles[t]) return true;
    return !!(c.cat === 'boom' && CHARACTERS[G.char] && CHARACTERS[G.char].mods && CHARACTERS[G.char].mods.engineer);   // ลีน่า
  },
  cost(c) {
    if (this.skilled(c)) return { cost: c.cost, money: c.money || 0 };
    const cost = {}; for (const [id, q] of Object.entries(c.cost)) cost[id] = Math.ceil(q * 1.5);
    return { cost, money: Math.ceil((c.money || 0) * 1.5) };
  },
  start(c, rer) {
    if (this.job) { toast('โต๊ะช่างกำลังทำของอยู่ รอให้เสร็จก่อน', 'warn'); return; }
    const { cost, money } = this.cost(c);
    if (!UI.canPay(cost, money)) { toast(UI.missingText(cost, money), 'warn'); return; }
    UI.pay(cost, money); State.save();
    const sk = this.skilled(c), dur = sk ? CRAFT_T.skilled : CRAFT_T.unskilled;
    this.job = { c, sk, t0: performance.now(), dur: dur * 1000 };
    Snd.hammer && Snd.hammer();
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      const j = this.job; if (!j) { clearInterval(this.timer); return; }
      const k = Math.min(1, (performance.now() - j.t0) / j.dur), bar = document.querySelector('.craftcard.busy .cfbar i');
      if (bar) bar.style.width = (k * 100) + '%';
      if (k >= 1) { this.finish(); if (!Run.active && UI.tab === 'craft') rer(); }
    }, 100);
    rer();
  },
  finish() {
    const j = this.job; if (!j) return; this.job = null; clearInterval(this.timer);
    const c = j.c, it = ITEMS[c.out];
    let q = c.q, bonus = 0;
    if (j.sk && Math.random() < 0.25) { bonus = Math.max(1, Math.ceil(c.q * 0.5)); q += bonus; }
    if (it.t === 'weapon' || it.t === 'armor' || it.t === 'cloth' || it.t === 'bag') for (let i = 0; i < q; i++) Inv.addFree(G.stash, Inv.make(c.out, 1));
    else Inv.addFree(G.stash, { id: c.out, q });
    Snd.hammer && Snd.hammer();
    toast(`ประดิษฐ์ ${it.n} ×${q} สำเร็จ (อยู่ในคลัง)` + (bonus ? ` — ฝีมือช่างได้เพิ่ม +${bonus}!` : ''), 'good'); State.save();
  },
  // ingredient chips: icon + have/need only (the name is in the tooltip)
  chips(cost, money) {
    const row = U.el('div', { class: 'cfc' });
    for (const [id, q] of Object.entries(cost)) {
      const have = Inv.count(G.stash, id);
      row.appendChild(U.el('span', { class: 'cfx ' + (have >= q ? 'ok' : 'no'), title: `${ITEMS[id].n} — มี ${have} ต้องใช้ ${q}`, html: `<i>${Art.icon(id)}</i><b>${q}</b>` }));
    }
    if (money) row.appendChild(U.el('span', { class: 'cfx ' + (G.money >= money ? 'ok' : 'no'), title: `เงิน — มี ${U.fmt(G.money)} ต้องใช้ ${U.fmt(money)}`, html: `<i>${Art.icon('cash')}</i><b>${U.fmt(money)}</b>` }));
    return row;
  },
  section(rer) {
    const nKnown = CRAFTS.filter(c => this.known(c)).length;
    const sec = U.el('div', { class: 'wssec craftsec' }, U.el('h4', { title: 'มีช่างตรงสาย (สีเขียว) = วัตถุดิบปกติ เร็วกว่า 2 เท่า มีโอกาส 25% ได้เพิ่ม · ไม่มีช่าง = วัตถุดิบ ×1.5 และช้ากว่า' }, `ประดิษฐ์ ${nKnown}/${CRAFTS.length}`));
    sec.appendChild(U.el('div', { class: 'filters' }, ...CRAFT_CATS.map(([k, l]) => U.el('button', { class: 'chipbtn' + (this.cat === k ? ' on' : ''), onclick: () => { this.cat = k; rer(); } }, l))));
    const grid = U.el('div', { class: 'craftgrid' });
    const pay = c => { const x = this.cost(c); return UI.canPay(x.cost, x.money); };
    const list = CRAFTS.filter(c => this.cat === 'all' || c.cat === this.cat).sort((a, b) => (this.known(b) - this.known(a)) || (pay(b) - pay(a)));
    for (const c of list) {
      const it = ITEMS[c.out], kn = this.known(c), sk = this.skilled(c), busy = this.job && this.job.c === c, R = ROLES[this.trade(c)];
      const where = (c.at || []).map(k => LOOT_NAMES[k] || k).join(' / ');
      const tip = kn ? `${it.n}${c.q > 1 ? ' ×' + c.q : ''} — ${sk ? 'มี' + (R ? R.n : 'ช่าง') + ': วัตถุดิบปกติ · เร็ว · 25% ได้เพิ่ม' : 'ไม่มี' + (R ? R.n : 'ช่าง') + ': วัตถุดิบ ×1.5 · ช้ากว่า'}`
        : `${it.n} — ต้องมีสูตร: หาได้ใน${where}` + (c.role ? ` หรือช่วย${ROLES[c.role] ? ROLES[c.role].who : 'ผู้รอดชีวิต'}มาที่ฐาน` : '');
      const card = U.el('div', { class: 'craftcard' + (kn ? '' : ' locked') + (busy ? ' busy' : ''), title: tip });
      card.appendChild(U.el('div', { class: 'cfh' }, U.el('span', { class: 'cfi', html: Art.icon(c.out) }), U.el('b', null, it.n), c.q > 1 ? U.el('span', { class: 'cfq' }, '×' + c.q) : null,
        kn ? U.el('i', { class: 'cfs ' + (sk ? 'on' : 'off') }) : U.el('i', { class: 'cflock' })));
      if (kn) {
        const { cost, money } = this.cost(c);
        card.appendChild(this.chips(cost, money));
        if (busy) card.appendChild(U.el('div', { class: 'cfbar' }, U.el('i', { style: { width: Math.min(100, (performance.now() - this.job.t0) / this.job.dur * 100) + '%' } })));
        else {
          const ok = UI.canPay(cost, money) && !this.job;
          card.appendChild(U.el('button', { class: 'btn small' + (ok ? ' primary' : ' off'), onclick: () => this.start(c, rer) }, `ประดิษฐ์ · ${sk ? CRAFT_T.skilled : CRAFT_T.unskilled} วิ`));
        }
      }
      grid.appendChild(card);
    }
    sec.appendChild(grid);
    return sec;
  },
};

(function () {
  // the crafting section sits at the top of the workshop
  const _ws = UI.renderWorkshop;
  UI.renderWorkshop = function (body) {
    const r = _ws.call(this, body);
    const wrap = body.querySelector('.workshop');
    if (wrap) { const head = wrap.querySelector('.wshead'); const sec = Craft.section(() => { State.save(); this.renderBase(); }); if (head && head.nextSibling) wrap.insertBefore(sec, head.nextSibling); else wrap.appendChild(sec); }
    return r;
  };
  const _start = Run.start;
  Run.start = function (...a) { if (Craft.job) Craft.finish(); return _start.apply(this, a); };
  // recipe papers are learned when you get home alive (taken out first so the weapon-blueprint code never sees them)
  const _end = Run.endRun;
  Run.endRun = function (...a) {
    const p = this.p, got = [];
    if (p && !this.over) {
      G.recipes = G.recipes || [];
      for (const e of p.backpack.slice()) { const k = ITEMS[e.id] && ITEMS[e.id].rc; if (!k) continue;
        if (!G.recipes.includes(k)) { G.recipes.push(k); got.push(ITEMS[k].n); }
        p.backpack.splice(p.backpack.indexOf(e), 1); }
    }
    const r = _end.apply(this, a);
    if (got.length) toast('📜 เรียนรู้สูตรใหม่: ' + got.join(', ') + ' — ประดิษฐ์ได้ที่โรงช่าง', 'good');
    return r;
  };
})();
