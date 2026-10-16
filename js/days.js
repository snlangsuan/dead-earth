// ---------- Days: the day counter now drives base upkeep, world danger and daily events ----------
// Every return to base (alive or dead) is a new day:
//  1. upkeep — everyone at the base eats and drinks from the stash; short supplies = no rest heal, half income,
//     and after 3 hungry days in a row a general survivor walks out
//  2. the world gets more dangerous — runs start at a higher danger level as days pass
//  3. a random event may happen (travelling merchant, horde at the gate, wanderer, rain, market boom)
const FOOD_ORDER = ['bar', 'canned', 'mre', 'stew'];   // eaten cheapest-per-point first
const GRACE_DAYS = 3;                                   // no upkeep on the first days of a new game

// Base projects: built over several days by the general survivors (workers). More workers = done sooner.
const PROJECTS = {
  garden: { n: 'แปลงผัก', icon: '🥬', cost: { plank: 6, nails: 4, cloth: 2 }, work: 10, desc: 'ผลิตอาหาร 20 หน่วยทุกวัน (เลี้ยงได้ ~2 คน)' },
  rain:   { n: 'ถังเก็บน้ำฝน', icon: '🛢', cost: { scrap: 6, plank: 2, cloth: 2 }, work: 8, desc: 'ได้น้ำดื่ม 1 ขวดทุกวัน (+3 เมื่อฝนตก)' },
  wall:   { n: 'รั้วฐาน', icon: '🧱', cost: { scrap: 8, plank: 6, nails: 6 }, work: 16, desc: 'กันฝูงซอมบี้บุกฐานได้เองโดยไม่ต้องใช้ไม้/ตะปู' },
  clinic: { n: 'ห้องพยาบาล', icon: '🏥', cost: { cloth: 4, chem: 2, plank: 4 }, work: 12, desc: 'พักฟื้นเพิ่ม +20% ต่อวัน และยังพักฟื้นได้แม้เสบียงขาด' },
  radio:  { n: 'เสาวิทยุ', icon: '📡', cost: { elec: 3, scrap: 4, nails: 2 }, work: 14, desc: 'กระจายเสียงหาผู้รอดชีวิต — มีคนมาขอเข้าฐานบ่อยขึ้นมาก' },
};

// newcomers have a trait, so accepting or refusing them is a real choice
const TRAITS = {
  normal:  { n: 'ธรรมดา', desc: '' },
  hard:    { n: 'ขยัน', desc: 'งานสร้าง ×2' },
  carrier: { n: 'มีเสบียงติดตัว', desc: 'นำอาหารกระป๋อง 2 + น้ำ 2 มาด้วย' },
  medic:   { n: 'เคยเป็นพยาบาล', desc: 'พักฟื้น +5%' },
  glutton: { n: 'กินจุ', desc: 'กินอาหาร ×2 แต่หาเงิน +20' },
  weak:    { n: 'บาดเจ็บ', desc: 'ยังทำงานไม่ได้ 3 วัน' },
};

const Days = {
  // ---- workforce: general survivors do the base work ----
  workers() { return G.survivors.filter(s => !s.role).length; },
  workPerDay() { return 1 + G.survivors.filter(s => !s.role).reduce((a, s) => a + (s.trait === 'weak' && (s.until || 0) > G.day ? 0 : s.trait === 'hard' ? 2 : 1), 0); },
  healPct() { return Math.min(0.6, 0.3 + 0.03 * this.workers()) + (this.built('clinic') ? 0.2 : 0) + 0.05 * G.survivors.filter(s => s.trait === 'medic').length; },
  income() { return G.survivors.filter(s => !s.role).reduce((a, s) => a + (s.trait === 'weak' && (s.until || 0) > G.day ? 0 : 35 + (s.trait === 'glutton' ? 20 : 0)), 0); },
  traitTxt(s) { const t = TRAITS[s.trait || 'normal']; return t.desc ? `${t.n} (${t.desc})` : t.n; },
  built(id) { return !!(G.proj && G.proj.built[id]); },
  proj() { if (!G.proj) G.proj = { built: {}, cur: null }; return G.proj; },
  canStart(id) { const P = PROJECTS[id]; return !this.proj().cur && !this.built(id) && Object.entries(P.cost).every(([k, q]) => Inv.count(G.stash, k) >= q); },
  startProject(id) {
    if (!this.canStart(id)) return false;
    for (const [k, q] of Object.entries(PROJECTS[id].cost)) Inv.remove(G.stash, k, q);
    this.proj().cur = { id, done: 0 }; return true;
  },
  daysToFinish() { const c = this.proj().cur; return c ? Math.ceil((PROJECTS[c.id].work - c.done) / this.workPerDay()) : 0; },
  workProjects(rep) {
    const pj = this.proj(), c = pj.cur; if (!c) return;
    c.done += this.workPerDay() * (rep.short ? 0.5 : 1);   // hungry people work slower
    const P = PROJECTS[c.id];
    if (c.done >= P.work) { pj.built[c.id] = true; pj.cur = null; rep.lines.push(`🔨 สร้าง <b>${P.icon} ${P.n}</b> เสร็จแล้ว — ${P.desc}`); }
    else rep.lines.push(`🔨 กำลังสร้าง ${P.icon} ${P.n}: ${Math.floor(c.done)}/${P.work} (อีก ~${this.daysToFinish()} วัน)`);
  },
  produce(rep) {
    const out = [];
    if (this.built('garden')) { const acc = (G.gardenAcc || 0) + 20 / ITEMS.canned.food, n = Math.floor(acc); G.gardenAcc = acc - n; if (n) { Inv.addFree(G.stash, Inv.make('canned', n)); out.push(`อาหารกระป๋อง ×${n}`); } }
    if (this.built('rain')) { Inv.addFree(G.stash, Inv.make('water', 1)); out.push('น้ำดื่ม ×1'); }
    if (out.length) rep.lines.push(`🌱 ผลผลิตของฐาน: ${out.join(', ')}`);
  },
  // ---- recruitment: newcomers wait at the gate for one day; the player accepts or refuses ----
  pending() { if (!G.pending) G.pending = []; return G.pending; },
  // how many days supplies would last with n extra mouths
  daysLeftWith(n, c) { const m = this.mouths() + n, g = G.survivors.filter(s => s.trait === 'glutton').length + (c && c.trait === 'glutton' ? 1 : 0), f = Math.ceil((m + g) * 8 * (G.roles.cook ? 0.75 : 1)), w = Math.ceil(m / 3); return Math.min(Math.floor(this.foodPts() / f), Math.floor(this.have('water') / w)); },
  accept(c) {
    const i = this.pending().indexOf(c); if (i < 0) return;
    this.pending().splice(i, 1);
    const s = { name: c.name, role: null, trait: c.trait };
    if (c.trait === 'weak') s.until = G.day + 3;
    if (c.trait === 'carrier') { Inv.addFree(G.stash, Inv.make('canned', 2)); Inv.addFree(G.stash, Inv.make('water', 2)); }
    G.survivors.push(s);
  },
  refuse(c) { const i = this.pending().indexOf(c); if (i >= 0) this.pending().splice(i, 1); },
  dismiss(s) { const i = G.survivors.indexOf(s); if (i >= 0 && !s.role) G.survivors.splice(i, 1); },
  expirePending(rep) {
    const left = this.pending().filter(c => c.day < G.day);
    if (left.length) rep.lines.push(`<span class="dim">👤 ${left.map(c => c.name).join(', ')} รอคำตอบไม่ไหว เดินทางต่อไปแล้ว</span>`);
    G.pending = this.pending().filter(c => c.day >= G.day);
  },
  recruit(rep) {
    const ch = 0.08 + (this.built('radio') ? 0.22 : 0) + (G.dayEvent === 'wanderer' ? 0.25 : 0);
    if (Math.random() > ch) return;
    const used = new Set(G.survivors.map(s => s.name));
    const name = U.pick(Math.random, GENERIC_NAMES.filter(n => !used.has(n)).concat(used.size >= GENERIC_NAMES.length ? [GENERIC_NAMES[0] + ' ' + (G.survivors.length + 1)] : []));
    const how = this.built('radio') ? 'ได้ยินเสียงจากเสาวิทยุ' : 'เดินผ่านมาเห็นฐาน';
    const trait = U.wpick(Math.random, [['normal', 4], ['hard', 2], ['carrier', 2], ['medic', 1], ['glutton', 1.5], ['weak', 1.5]]);
    this.pending().push({ name, trait, how, day: G.day });
    rep.lines.push(`👤 <b>${name}</b> ${how} มาขอเข้าร่วมฐาน — ${this.traitTxt({ trait })} · ตัดสินใจรับหรือไม่ที่หน้าฐาน (รอถึงพรุ่งนี้)`);
  },
  mouths() { return 1 + G.survivors.length + Math.max(0, G.unlockedChars.length - 1); },
  needFood() { const extra = G.survivors.filter(s => s.trait === 'glutton').length; return Math.ceil((this.mouths() + extra) * 8 * (G.roles.cook ? 0.75 : 1)); },    // food points / day (a can = 35)
  needWater() { return Math.ceil(this.mouths() / 3); },                             // bottles / day
  have(id) { return Inv.count(G.stash, id) + Inv.count(G.backpack, id); },
  take(id, q) { const a = Inv.remove(G.stash, id, q); return a + Inv.remove(G.backpack, id, q - a); },
  foodPts() { return FOOD_ORDER.reduce((s, id) => s + this.have(id) * ITEMS[id].food, 0); },
  // how many days the current stock lasts (for the top bar)
  daysLeft() { return Math.min(Math.floor(this.foodPts() / this.needFood()), Math.floor(this.have('water') / this.needWater())); },
  // starting danger points of a run (level = 1 + pts/45): +1 level about every 30 days, max +2
  worldDanger() { return Math.min(90, Math.max(0, G.day - 1) * 1.5); },
  worldLevel() { return 1 + Math.floor(this.worldDanger() / 45); },

  upkeep() {
    const rep = { lines: [], short: false };
    if (G.day <= GRACE_DAYS) { rep.lines.push(`🍽 ช่วงตั้งตัว: ยังไม่ต้องใช้เสบียง (อีก ${GRACE_DAYS - G.day + 1} วัน)`); return rep; }
    // food
    let need = this.needFood(); const ate = {};
    for (const id of FOOD_ORDER) {
      while (need > 0 && this.have(id) > 0) { this.take(id, 1); need -= ITEMS[id].food; ate[id] = (ate[id] || 0) + 1; }
    }
    const wNeed = this.needWater(), drank = this.take('water', wNeed);
    const ateTxt = Object.entries(ate).map(([id, n]) => `${ITEMS[id].n} ×${n}`).join(', ');
    rep.lines.push(`🍽 ฐาน ${this.mouths()} คน ใช้เสบียง: ${ateTxt || '-'}${drank ? `, น้ำดื่ม ×${drank}` : ''}`);
    rep.short = need > 0 || drank < wNeed;
    if (rep.short) {
      G.hungry = (G.hungry || 0) + 1;
      rep.lines.push(`<span class="w">⚠ ${need > 0 ? 'อาหาร' : ''}${need > 0 && drank < wNeed ? 'และ' : ''}${drank < wNeed ? 'น้ำ' : ''}ไม่พอ — ไม่ได้พักฟื้น และรายได้ลดครึ่ง (หิวติดกัน ${G.hungry} วัน)</span>`);
      // the worse the shortage, the sooner (and the more) people walk out
      const gen = G.survivors.filter(s => !s.role);
      const severe = need > this.needFood() * 0.6 || drank === 0;
      if ((G.hungry >= 3 || (severe && G.hungry >= 2)) && gen.length) {
        const n = Math.min(gen.length, severe ? Math.max(1, Math.ceil(gen.length * 0.25)) : 1);
        const gone = gen.slice(-n); for (const s of gone) G.survivors.splice(G.survivors.indexOf(s), 1);
        G.hungry = 1;
        rep.lines.push(`<span class="w">👤 ${gone.map(s => s.name).join(', ')} ทนหิวไม่ไหว ออกจากฐานไปแล้ว</span>`);
      }
    } else G.hungry = 0;
    return rep;
  },

  EVENTS: [
    { id: 'merchant', w: 3, min: 2 }, { id: 'raid', w: 3, min: 5 }, { id: 'wanderer', w: 3, min: 1 },
    { id: 'rain', w: 2, min: 1 }, { id: 'boom', w: 2, min: 3 },
  ],
  event(rep) {
    G.dayEvent = null;
    const r = Math.random;
    if (G.day < 2 || r() > 0.45) return;
    const pool = this.EVENTS.filter(e => G.day >= e.min);
    let t = r() * pool.reduce((s, e) => s + e.w, 0), ev = pool[0];
    for (const e of pool) { t -= e.w; if (t <= 0) { ev = e; break; } }
    G.dayEvent = ev.id;
    this['ev_' + ev.id](rep, r);
  },
  ev_merchant(rep, r) {
    // a travelling trader brings stock one tier above the shop, plus a rare find
    const tier = State.shopTier() + 1;
    const pool = Object.keys(ITEMS).filter(id => ITEMS[id].tier != null && ITEMS[id].tier <= tier && ITEMS[id].tier >= tier - 1 && !G.shop.stock.some(s => s.id === id));
    const picks = U.shuffle(r, pool).slice(0, 3).concat(U.pick(r, ['mre', 'stew', 'katana', 'sniper', 'antiviral', 'medkit']));
    for (const id of picks) if (ITEMS[id] && !G.shop.stock.some(s => s.id === id)) G.shop.stock.push({ id, q: ITEMS[id].t === 'weapon' ? 1 : U.ri(r, 1, 3), wander: true });
    Inv.sortList(G.shop.stock);
    rep.lines.push('🧳 <b>พ่อค้าเร่แวะมา</b> — มีของหายากในร้านค้าวันนี้ (ป้าย "พ่อค้าเร่")');
  },
  ev_raid(rep, r) {
    // a horde hits the base: planks + nails hold the gate, otherwise some stash goods are lost
    const need = { plank: 2, nails: 3 };
    if (this.built('wall')) { rep.lines.push('🧟 <b>ฝูงซอมบี้บุกฐานตอนกลางคืน</b> — รั้วฐานกันไว้ได้ ไม่มีของเสียหาย'); return; }
    if (Object.entries(need).every(([id, q]) => this.have(id) >= q)) {
      for (const [id, q] of Object.entries(need)) this.take(id, q);
      rep.lines.push('🧟 <b>ฝูงซอมบี้บุกฐานตอนกลางคืน</b> — ใช้ไม้กระดาน ×2 ตะปู ×3 เสริมประตูไว้ได้ ไม่มีของเสียหาย');
      return;
    }
    const goods = G.stash.filter(e => ['food', 'med', 'mat', 'ammo'].includes(ITEMS[e.id].t) && e.q > 0);
    const lost = [];
    for (const e of U.shuffle(r, goods).slice(0, 3)) { const q = Math.max(1, Math.floor(e.q * U.rf(r, 0.25, 0.45))); Inv.remove(G.stash, e.id, q); lost.push(`${ITEMS[e.id].n} ×${q}`); }
    rep.lines.push(`<span class="w">🧟 <b>ฝูงซอมบี้บุกฐานตอนกลางคืน</b> — ไม่มีไม้กระดาน/ตะปูเสริมประตู เสียของ: ${lost.join(', ') || 'ไม่มี'}</span>`);
    rep.lines.push('<span class="dim">เคล็ดลับ: เก็บไม้กระดาน 2 + ตะปู 3 ไว้ในคลังเสมอเพื่อป้องกันฐาน</span>');
  },
  ev_wanderer(rep, r) {
    const gift = U.pick(r, [[['canned', 2], ['water', 2]], [['a9', 20], ['bandage', 2]], [['scrap', 4], ['nails', 4]], [['pills', 2], ['bar', 3]], [['a12', 8], ['cloth', 3]]]);
    for (const [id, q] of gift) Inv.addFree(G.stash, Inv.make(id, q));
    rep.lines.push(`🚶 <b>ผู้รอดชีวิตเร่ร่อนแวะพัก</b> — ทิ้งของไว้ให้: ${gift.map(([id, q]) => `${ITEMS[id].n} ×${q}`).join(', ')}`);
  },
  ev_rain(rep, r) {
    const q = U.ri(r, 3, 5) + (this.built('rain') ? 3 : 0); Inv.addFree(G.stash, Inv.make('water', q));
    rep.lines.push(`🌧 <b>ฝนตกทั้งคืน</b> — รองน้ำฝนได้ น้ำดื่ม ×${q}`);
  },
  ev_boom(rep) {
    G.market && (G.market.sold = {});
    rep.lines.push('💰 <b>ตลาดคึกคัก</b> — ร้านรับซื้อของแพงขึ้น 20% วันนี้');
  },

  // after upkeep + event (called from Run.finishCommon)
  afterDay(rep) { this.expirePending(rep); this.workProjects(rep); this.produce(rep); this.recruit(rep); },
};
