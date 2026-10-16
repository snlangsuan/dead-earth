// ---------- Game state, save/load, inventory helpers ----------
const SAVE_KEY = 'deadearth_save_v1';
let G = null; // persistent game state

const Inv = {
  isStack(id) { const it = ITEMS[id]; return it.t !== 'weapon' && it.st > 1; },
  makeWeapon(id) { return { id, q: 1, uid: U.uid(), lvl: 0, att: {}, mag: ITEMS[id].mag || 0, dur: 100 }; },
  make(id, q) { return ITEMS[id].t === 'weapon' ? Inv.makeWeapon(id) : ITEMS[id].t === 'armor' ? { id, q: 1, ap: ITEMS[id].ap } : { id, q }; },
  used(list) { let s = 0; for (const e of list) s += ITEMS[e.id].sz; return s; },
  count(list, id) { let s = 0; for (const e of list) if (e.id === id) s += e.q; return s; },
  // remove q units of id from list; returns removed
  remove(list, id, q) {
    let need = q;
    for (let i = list.length - 1; i >= 0 && need > 0; i--) {
      const e = list[i];
      if (e.id !== id) continue;
      const take = Math.min(need, e.q);
      e.q -= take; need -= take;
      if (e.q <= 0) list.splice(i, 1);
    }
    return q - need;
  },
  // ----- grid backpack -----
  dims(e) { const it = ITEMS[e.id]; return e.rot ? [it.gh, it.gw] : [it.gw, it.gh]; },
  fits(list, g, e, x, y, rot, ignore) {
    const it = ITEMS[e.id];
    const w = rot ? it.gh : it.gw, h = rot ? it.gw : it.gh;
    if (x < 0 || y < 0 || x + w > g.c || y + h > g.r) return false;
    for (const o of list) {
      if (o === ignore || o === e || o.gx == null) continue;
      const [ow, oh] = Inv.dims(o);
      if (x < o.gx + ow && x + w > o.gx && y < o.gy + oh && y + h > o.gy) return false;
    }
    return true;
  },
  findSpot(list, g, e) {
    const it = ITEMS[e.id];
    for (const rot of (it.gw === it.gh ? [0] : [0, 1]))
      for (let y = 0; y < g.r; y++) for (let x = 0; x < g.c; x++)
        if (Inv.fits(list, g, e, x, y, rot)) return { x, y, rot };
    return null;
  },
  place(list, g, e) {
    const s = Inv.findSpot(list, g, e);
    if (!s) return false;
    e.gx = s.x; e.gy = s.y; e.rot = s.rot; list.push(e);
    return true;
  },
  // Add entry to a grid backpack. Returns quantity that did NOT fit.
  addToPack(list, entry, g) {
    const it = ITEMS[entry.id];
    if (!Inv.isStack(entry.id)) {
      const e = it.t === 'weapon' || it.t === 'armor' ? entry : { id: entry.id, q: entry.q };
      return Inv.place(list, g, e) ? 0 : entry.q;
    }
    let left = entry.q;
    for (const e of list) {
      if (e.id !== entry.id || e.q >= it.st) continue;
      const add = Math.min(it.st - e.q, left);
      e.q += add; left -= add; Inv.mergeUses(e, entry);
      if (left <= 0) return 0;
    }
    while (left > 0) {
      const add = Math.min(it.st, left);
      if (!Inv.place(list, g, entry.u != null ? { id: entry.id, q: add, u: entry.u } : { id: entry.id, q: add })) break;
      left -= add;
    }
    return left;
  },
  valid(list, g) {
    for (const e of list) { if (e.gx == null) return false; if (!Inv.fits(list, g, e, e.gx, e.gy, e.rot, e)) return false; }
    return true;
  },
  // re-pack everything into grid g; returns entries that didn't fit
  reflow(list, g) {
    const items = list.splice(0, list.length);
    items.sort((a, b) => ITEMS[b.id].sz - ITEMS[a.id].sz);
    const out = [];
    for (const e of items) { delete e.gx; delete e.gy; e.rot = 0; if (!Inv.place(list, g, e)) out.push(e); }
    return out;
  },
  // Unlimited list (stash / ground) — stackables merge freely
  addFree(list, entry) {
    delete entry.gx; delete entry.gy; delete entry.rot;
    if (ITEMS[entry.id].t === 'weapon' || ITEMS[entry.id].t === 'armor') { list.push(entry); return; }
    const ex = list.find(e => e.id === entry.id);
    if (ex) { ex.q += entry.q; Inv.mergeUses(ex, entry); } else list.push(entry.u != null ? { id: entry.id, q: entry.q, u: entry.u } : { id: entry.id, q: entry.q });
  },
  // multi-use items (repair kit): a stack tracks the uses left on its top unit; merging keeps the lower count (never refills)
  mergeUses(into, from) { if (from.u != null) into.u = Math.min(into.u ?? ITEMS[into.id].uses ?? from.u, from.u); },
  sortList(list) {
    const order = ['weapon', 'bag', 'tool', 'key', 'blueprint', 'ammo', 'throw', 'med', 'food', 'attach', 'part', 'mat', 'val', 'quest'];
    list.sort((a, b) => order.indexOf(ITEMS[a.id].t) - order.indexOf(ITEMS[b.id].t) || a.id.localeCompare(b.id));
  },
};

const State = {
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { } },
  load() {
    try { const s = localStorage.getItem(SAVE_KEY); if (s) { G = JSON.parse(s); if (!G.blueprints) G.blueprints = ['knife', 'bat']; if (!G.keys) G.keys = {}; if (!G.bag) G.bag = 'pack_day'; if (!G.opened) G.opened = {}; if (!G.gotLock) { G.gotLock = true; Inv.addFree(G.stash, { id: 'lockpick', q: 3 }); } if (!G.shopV2) { G.shopV2 = true; State.restock(); } if (!G.market) G.market = { bought: {}, sold: {} }; if (!G.locOrderV2) { G.locOrderV2 = true; for (const k in G.progress || {}) G.progress[k].order = [...G.progress[k].order].sort((a, b) => a - b); } if (G.shop && G.shop.stock && !G.shop.stock.some(x => x.id === 'lockpick')) { G.shop.stock.push({ id: 'lockpick', q: 6 }); Inv.sortList(G.shop.stock); } if (!G.gotBarr) { G.gotBarr = true; Inv.addFree(G.stash, { id: 'plank', q: 4 }); Inv.addFree(G.stash, { id: 'nails', q: 8 }); } return true; } } catch (e) { }
    return false;
  },
  wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } },
  newGame(charId) {
    G = {
      v: 1, money: 300, day: 1, char: charId,
      unlockedChars: [charId], chars: {},
      stash: [], weapons: [null, null, null], backpack: [], bpLvl: 0, bag: 'pack_day',
      survivors: [], roles: {}, blueprints: ['knife', 'bat'], keys: {}, opened: {}, quick: null, quickV2: true,
      progress: {}, unlocked: { [STAGES[0].id]: true }, completed: {},
      shop: null, stats: { kills: 0, runs: 0, extracts: 0, deaths: 0, rescued: 0 },
    };
    State.initChar(charId);
    const kit = CHARACTERS[charId].kit;
    kit.w.forEach((w, i) => { if (w) G.weapons[i] = Inv.makeWeapon(w); });
    for (const [id, q] of kit.items) Inv.addToPack(G.backpack, { id, q }, State.grid());
    // basic survival tools in the starting pack: lockpicks + barricade materials
    for (const [id, q] of [['lockpick', 2], ['plank', 2], ['nails', 4]]) { const left = Inv.addToPack(G.backpack, { id, q }, State.grid()); if (left) Inv.addFree(G.stash, { id, q: left }); }
    // a little extra in the stash
    Inv.addFree(G.stash, { id: 'bandage', q: 2 });
    Inv.addFree(G.stash, { id: 'water', q: 2 });
    Inv.addFree(G.stash, { id: 'plank', q: 4 });
    Inv.addFree(G.stash, { id: 'nails', q: 8 });
    G.gotBarr = true;
    Inv.addFree(G.stash, { id: 'lockpick', q: 3 }); G.gotLock = true; G.shopV2 = true;
    State.restock();
    State.save();
  },
  initChar(id) {
    if (!G.chars[id]) G.chars[id] = { hp: CHARACTERS[id].hp, inf: 0 };
    // starting gear of newly unlocked characters goes to the stash
  },
  unlockChar(id) {
    if (G.unlockedChars.includes(id)) return;
    G.unlockedChars.push(id);
    State.initChar(id);
    const kit = CHARACTERS[id].kit;
    kit.w.forEach(w => { if (w) Inv.addFree(G.stash, Inv.makeWeapon(w)); });
    for (const [iid, q] of kit.items) Inv.addFree(G.stash, { id: iid, q });
  },
  // carrying grid = equipped backpack + the character's build (relative to a 4×4 frame) + tailor upgrades
  gridFor(bagId, charId) {
    const b = (ITEMS[bagId] && ITEMS[bagId].grid) || [4, 4], g = CHARACTERS[charId || G.char].grid;
    return { c: Math.max(2, b[0] + g[0] - 4), r: Math.max(2, b[1] + g[1] - 4 + (G.bpLvl || 0)) };
  },
  grid() { return State.gridFor(G.bag || 'pack_day'); },
  cap() { const g = State.grid(); return g.c * g.r; },
  maxHp() { return CHARACTERS[G.char].hp; },
  stagesCleared() { return Object.keys(G.completed).length; },
  shopTier() { const c = State.stagesCleared(); let t = c >= 12 ? 3 : c >= 6 ? 2 : c >= 2 ? 1 : 0; if (G.roles.merchant) t++; return t; },
  // ---- dynamic market: prices follow supply/demand and the player's wealth (keeps money from inflating) ----
  // G.market.bought[id] / sold[id] count units traded since the last restocks (halved on every restock).
  mkt() { if (!G.market) G.market = { bought: {}, sold: {} }; return G.market; },
  // richer player → shop charges more and pays a bit less (1.0 at ≤1,500, ~1.3 at 15k, capped 1.6)
  wealthMult() { return 1 + Math.min(0.6, Math.max(0, Math.log10(Math.max(1, G.money) / 1500)) * 0.3); },
  // demand: each unit bought recently pushes that item's price up 10% (max ×2.2)
  demandMult(id, extra = 0) { return Math.min(2.2, 1 + 0.1 * ((this.mkt().bought[id] || 0) + extra)); },
  // supply: each unit sold recently floods the market and lowers what the shop pays (min ×0.6)
  supplyMult(id, extra = 0) { return Math.max(0.6, 1 / (1 + 0.08 * ((this.mkt().sold[id] || 0) + extra))); },
  buyPrice(id, extra = 0) { return Math.ceil(ITEMS[id].v * (G.roles.merchant ? 0.9 : 1.0) * this.demandMult(id, extra) * this.wealthMult()); },
  sellPrice(id, e, extra = 0) {
    const base = ITEMS[id].v * (G.roles.merchant ? 0.55 : 0.4);
    const wear = e && ITEMS[id].t === 'weapon' ? 0.45 + 0.55 * Math.max(0, Math.min(100, e.dur ?? 100)) / 100 : 1;   // worn weapons sell for less (at least 45%)
    const floor = base * wear * 0.6;   // hard floor: never less than 60% of the normal sell price, whatever the market does
    const p = Math.max(floor, base * wear * this.supplyMult(id, extra) / Math.pow(this.wealthMult(), 0.25)) * (G.dayEvent === 'boom' ? 1.2 : 1);
    return Math.max(1, Math.floor(Math.min(p, this.buyPrice(id) * 0.8)));   // never above 80% of the current buy price
  },
  sellTotal(id, e, n) { let t = 0; for (let i = 0; i < n; i++) t += this.sellPrice(id, e, i); return t; },
  priceTrend(id, now) { const base = ITEMS[id].v * (G.roles.merchant ? 0.9 : 1.0); return Math.round((now / base - 1) * 100); },
  noteBuy(id, n) { const m = this.mkt().bought; m[id] = (m[id] || 0) + n; },
  noteSell(id, n) { const m = this.mkt().sold; m[id] = (m[id] || 0) + n; },
  restock() {
    const tier = State.shopTier();
    for (const k of ['bought', 'sold']) { const m = State.mkt()[k]; for (const id in m) { m[id] = Math.floor(m[id] / 2); if (!m[id]) delete m[id]; } }
    const r = U.rng(Date.now() & 0xffffffff);
    const pool = Object.keys(ITEMS).filter(id => ITEMS[id].tier != null && ITEMS[id].tier <= tier);
    const always = ['a9', 'bandage', 'canned', 'water', 'lockpick'];   // lockpicks open locked cabinets / key containers
    const n = Math.min(pool.length, 13 + tier * 3 + (G.roles.merchant ? 4 : 0));
    const chosen = new Set(always.filter(a => pool.includes(a)));
    // weapons wear out now, so the shop always carries some: 2 melee + 2 guns (when the tier has them) and a repair kit
    const wpool = cls => U.shuffle(r, pool.filter(id => ITEMS[id].t === 'weapon' && (cls === 'melee' ? ITEMS[id].cls === 'melee' : ITEMS[id].cls !== 'melee')));
    for (const id of [...wpool('melee').slice(0, 2), ...wpool('gun').slice(0, 2)]) chosen.add(id);
    if (pool.includes('repairkit')) chosen.add('repairkit');
    // and one piece of body armor (the best tier unlocked gets the edge)
    { const ap = pool.filter(id => ITEMS[id].t === 'armor').sort((x, y) => ITEMS[y].tier - ITEMS[x].tier); if (ap.length) chosen.add(r() < 0.6 ? ap[0] : U.pick(r, ap)); }
    for (const id of U.shuffle(r, pool)) { if (chosen.size >= n) break; chosen.add(id); }
    G.shop = {
      stock: [...chosen].map(id => {
        const it = ITEMS[id];
        let q = it.t === 'bag' || it.t === 'armor' ? 1 : it.t === 'weapon' ? U.ri(r, 1, 2) : it.t === 'ammo' ? U.ri(r, 4, 8) : it.t === 'attach' ? 1 : U.ri(r, 3, 10);
        return { id, q };
      }),
    };
    if (G.roles.merchant) {
      const unk = BLUEPRINT_WEAPONS.filter(w => !(G.blueprints || []).includes(w));
      if (unk.length) G.shop.stock.push({ id: 'bp_' + U.pick(r, unk.slice(0, 4)), q: 1 });
    }
    Inv.sortList(G.shop.stock);
  },
  // Stage progress: random location order per stage, each location unique
  stageProg(stageId) {
    let p = G.progress[stageId];
    if (!p) {
      const st = STAGE_BY_ID[stageId];
      p = G.progress[stageId] = { order: st.locs.map((_, i) => i), cleared: [] };   // locations go in their fixed order
    }
    return p;
  },
  currentLoc(stageId) {
    const p = State.stageProg(stageId);
    return p.order.find(i => !p.cleared.includes(i) && !KeyGraph.locLocked(stageId, i));
  },
};
