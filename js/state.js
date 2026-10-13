// ---------- Game state, save/load, inventory helpers ----------
const SAVE_KEY = 'deadearth_save_v1';
let G = null; // persistent game state

const Inv = {
  isStack(id) { const it = ITEMS[id]; return it.t !== 'weapon' && it.st > 1; },
  makeWeapon(id) { return { id, q: 1, uid: U.uid(), lvl: 0, att: {}, mag: ITEMS[id].mag || 0, dur: 100 }; },
  make(id, q) { return ITEMS[id].t === 'weapon' ? Inv.makeWeapon(id) : { id, q }; },
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
      const e = it.t === 'weapon' ? entry : { id: entry.id, q: entry.q };
      return Inv.place(list, g, e) ? 0 : entry.q;
    }
    let left = entry.q;
    for (const e of list) {
      if (e.id !== entry.id || e.q >= it.st) continue;
      const add = Math.min(it.st - e.q, left);
      e.q += add; left -= add;
      if (left <= 0) return 0;
    }
    while (left > 0) {
      const add = Math.min(it.st, left);
      if (!Inv.place(list, g, { id: entry.id, q: add })) break;
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
    if (ITEMS[entry.id].t === 'weapon') { list.push(entry); return; }
    const ex = list.find(e => e.id === entry.id);
    if (ex) ex.q += entry.q; else list.push({ id: entry.id, q: entry.q });
  },
  sortList(list) {
    const order = ['weapon', 'bag', 'tool', 'key', 'blueprint', 'ammo', 'throw', 'med', 'food', 'attach', 'part', 'mat', 'val', 'quest'];
    list.sort((a, b) => order.indexOf(ITEMS[a.id].t) - order.indexOf(ITEMS[b.id].t) || a.id.localeCompare(b.id));
  },
};

const State = {
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { } },
  load() {
    try { const s = localStorage.getItem(SAVE_KEY); if (s) { G = JSON.parse(s); if (!G.blueprints) G.blueprints = ['knife', 'bat']; if (!G.keys) G.keys = {}; if (!G.bag) G.bag = 'pack_day'; if (!G.opened) G.opened = {}; if (!G.gotLock) { G.gotLock = true; Inv.addFree(G.stash, { id: 'lockpick', q: 3 }); } if (!G.gotBarr) { G.gotBarr = true; Inv.addFree(G.stash, { id: 'plank', q: 4 }); Inv.addFree(G.stash, { id: 'nails', q: 8 }); } return true; } } catch (e) { }
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
    Inv.addFree(G.stash, { id: 'lockpick', q: 3 }); G.gotLock = true;
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
  buyPrice(id) { return Math.ceil(ITEMS[id].v * (G.roles.merchant ? 0.9 : 1.0)); },
  sellPrice(id) { return Math.max(1, Math.floor(ITEMS[id].v * (G.roles.merchant ? 0.55 : 0.4))); },
  restock() {
    const tier = State.shopTier();
    const r = U.rng(Date.now() & 0xffffffff);
    const pool = Object.keys(ITEMS).filter(id => ITEMS[id].tier != null && ITEMS[id].tier <= tier);
    const always = ['a9', 'bandage', 'canned', 'water'];
    const n = Math.min(pool.length, 9 + tier * 3 + (G.roles.merchant ? 4 : 0));
    const chosen = new Set(always.filter(a => pool.includes(a)));
    for (const id of U.shuffle(r, pool)) { if (chosen.size >= n) break; chosen.add(id); }
    G.shop = {
      stock: [...chosen].map(id => {
        const it = ITEMS[id];
        let q = it.t === 'bag' ? 1 : it.t === 'weapon' ? U.ri(r, 1, 2) : it.t === 'ammo' ? U.ri(r, 4, 8) : it.t === 'attach' ? 1 : U.ri(r, 3, 10);
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
      const r = U.rng((Date.now() ^ U.hash(stageId)) >>> 0);
      p = G.progress[stageId] = { order: U.shuffle(r, st.locs.map((_, i) => i)), cleared: [] };
    }
    return p;
  },
  currentLoc(stageId) {
    const p = State.stageProg(stageId);
    return p.order.find(i => !p.cleared.includes(i) && !KeyGraph.locLocked(stageId, i));
  },
};
