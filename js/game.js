// ---------- In-location gameplay ----------
const Input = {
  keys: {}, pressed: {}, mouse: { x: 0, y: 0, down: false, moved: false },
  init(canvas) {
    window.addEventListener('keydown', e => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.ctrlKey && Keys.ctrlBound && typeof Run !== 'undefined' && Run.active && /^(Key[A-Z]|Digit\d|Arrow|Space)/.test(e.code)) e.preventDefault();   // Ctrl bound to an action: keep Ctrl+D/A/S... from reaching the browser
      if (Keys.capture) return;   // the settings screen is waiting for a key
      const c = Keys.tr(e.code); if (c == null) return;   // player's key -> the game's own key
      if (!Input.keys[c]) Input.pressed[c] = true;
      Input.keys[c] = true;
    });
    window.addEventListener('keyup', e => { const c = Keys.tr(e.code); if (c != null) Input.keys[c] = false; });
    window.addEventListener('blur', () => { Input.keys = {}; Input.mouse.down = false; });
    canvas.addEventListener('mousemove', e => { const b = canvas.getBoundingClientRect(); Input.mouse.x = e.clientX - b.left; Input.mouse.y = e.clientY - b.top; Input.mouse.moved = true; Input.mouse.t = performance.now(); });
    canvas.addEventListener('mousedown', e => { if (e.button === 0) Input.mouse.down = true; });
    window.addEventListener('mouseup', e => { if (e.button === 0) Input.mouse.down = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  },
  hit(code) { const p = Input.pressed[code]; return !!p; },
  endFrame() { Input.pressed = {}; },
};

function wStats(w, charId) {
  const it = ITEMS[w.id]; const m = CHARACTERS[charId].mods; const L = w.lvl || 0;
  const s = Object.assign({}, it);
  s.dmg = it.dmg * (1 + 0.12 * L);
  s.rate = it.rate * (1 - 0.03 * L);
  const dd = w.dur != null ? w.dur : 100;
  if (it.cls === 'melee') {
    if (dd < 30) s.dmg *= 0.75; // blunt / cracked
    s.dmg *= (m.meleeDmg || 1); s.rate *= (m.meleeRate || 1); s.range = it.range * (m.meleeRange || 1);
  } else {
    s.dmg *= (m.gunDmg || 1); s.spread = it.spread * (m.spread || 1) * (1 + (1 - dd / 100) * 0.6); s.reload = it.reload * (m.reload || 1);
    const a = w.att || {}, rk = sl => attRank(a[sl]), F = sl => attFx(a[sl]);
    if (a.scope && F('scope')) { s.spread *= F('scope').spread[rk('scope')]; s.range *= F('scope').range[rk('scope')]; }
    if (a.grip && F('grip')) { s.spread *= F('grip').spread[rk('grip')]; s.reload *= F('grip').reload[rk('grip')]; }
    if (a.mag && F('mag')) s.mag = Math.round(it.mag * F('mag').mag[rk('mag')]);
    if (a.muzzle && F('muzzle')) { s.noise *= F('muzzle').noise[rk('muzzle')]; s.dmg *= F('muzzle').dmg[rk('muzzle')]; }
  }
  return s;
}

// wooden furniture that can be smashed for planks: [min planks, max planks, hp]
// any searchable furniture can be smashed: [hp, material]. Breaking it destroys whatever was still inside.
const SMASH = {
  sofa: [90, 'soft'], rack: [60, 'soft'], counter: [120, 'wood'], filecab: [120, 'metal'], fridge: [160, 'metal'], stove: [140, 'metal'],
  medcab: [90, 'metal'], hospbed: [120, 'metal'], labtable: [130, 'metal'], server: [180, 'metal'], shelfunit: [140, 'metal'],
  register: [110, 'metal'], locker: [160, 'metal'], weaponrack: [140, 'metal'], dumpster: [220, 'metal'], toolbench: [160, 'metal'], car: [420, 'metal'],
};
const UNBREAKABLE = { safe: 1, body: 1, bag: 1, supply: 1, generator: 1 };
function smashInfo(fu) {
  if (!fu || fu.decor || UNBREAKABLE[fu.kind] || (fu.lock && fu.lock.pickOnly)) return null;
  if (WOOD_FURN[fu.kind]) return { hp: WOOD_FURN[fu.kind][2], mat: 'wood' };
  const s = SMASH[fu.kind]; return s ? { hp: s[0], mat: s[1] } : null;
}
const WOOD_FURN = { crate: [2, 3, 50], bookshelf: [3, 4, 110], wardrobe: [3, 4, 110], stallcart: [2, 3, 90], bench: [2, 3, 70], desk: [1, 2, 80], tvstand: [1, 2, 60], bed: [2, 3, 100], bunk: [2, 3, 110] };
function rollLoot(table, d, bonus, r) {
  r = r || Math.random;
  const T = LOOT[table]; if (!T) return [];
  if (!bonus && r() < 0.12) return [];
  let n = U.ri(r, 1, 3) + (bonus || 0) - (r() < 0.35 ? 1 : 0);
  n = Math.max(1, n);
  const entries = T.map(e => [e, e[1] * (e[0] !== 'bp' && ITEMS[e[0]].v >= 500 ? (0.6 + d * 0.06) : 1)]);
  const out = [];
  for (let i = 0; i < n; i++) {
    const e = U.wpick(r, entries);
    const id = e[0];
    if (id === 'bp') { const bp = pickBlueprint(r, d); if (bp && !out.some(o => o.id === bp)) out.push({ id: bp, q: 1 }); continue; }
    if (id === 'cash') { const q = Math.round(U.ri(r, 6, 30) * (1 + d * 0.12)); const ex = out.find(o => o.id === 'cash'); if (ex) ex.q += q; else out.push({ id: 'cash', q }); continue; }
    const q = U.ri(r, e[2], e[3]);
    if (ITEMS[id].t === 'weapon') { const w = Inv.makeWeapon(id); if (ITEMS[id].mag) w.mag = U.ri(r, 0, ITEMS[id].mag); w.dur = U.ri(r, 25, 85); out.push(w); } // found weapons are used
    else { const ex = out.find(o => o.id === id); if (ex) ex.q += q; else out.push({ id, q }); }
  }
  return out;
}

function pickBlueprint(r, d) {
  const known = (G && G.blueprints) || [];
  // early stages favour simpler weapons
  const pool = BLUEPRINT_WEAPONS.filter(w => !known.includes(w)).map((w, i) => [w, 1 + Math.max(0, d - i * 3) * 0.3 + (i * 3 <= d + 4 ? 2 : 0)]);
  if (!pool.length) return null;
  return 'bp_' + U.wpick(r, pool);
}

const Run = {
  active: false, paused: false, panel: null, time: 0, timeScale: 1,

  start(stageId, locIdx, farm, opts) {
    const stage = STAGE_BY_ID[stageId];
    const rk = opts && opts.restricted, K = rk && KEY_ITEMS[rk];
    const loc = K ? { n: K.zone + ' · ' + stage.n, theme: K.theme } : stage.locs[locIdx];
    const d = stage.gi + (K ? 4 : 0);
    // building layout (rooms, their order, floors) per location: kept while you keep dying there,
    // re-rolled once you get out alive (see endRun)
    G.layouts = G.layouts || {};
    this.layoutKey = stageId + ':' + locIdx + (K ? ':' + rk : '');
    if (G.layouts[this.layoutKey] == null) { G.layouts[this.layoutKey] = U.hash(this.layoutKey + ':' + Date.now() + ':' + Math.random()); State.save(); }
    const seed = G.layouts[this.layoutKey];
    this.restricted = rk || null;
    if (K) { farm = true; G.keys[rk]--; if (G.keys[rk] <= 0) delete G.keys[rk]; }
    const map = generateLocation(seed, loc.theme, d, K ? null : Levels.floors(stageId, locIdx));
    const ch = CHARACTERS[G.char];
    const cs = G.chars[G.char];
    this.stage = stage; this.locIdx = locIdx; this.loc = loc; this.d = d; this.farm = !!farm;
    this.lv = Levels.loc(stageId, locIdx) + (K ? 6 : 0);
    Object.assign(this, Levels.tune(this.lv));
    this.map = map;
    this.doorSet = new Set(map.doors.map(dr => dr.f + '|' + dr.x));
    this.p = {
      x: -STREET + 90, f: 0, room: map.start, facing: 1, rad: 14, climb: null,
      hp: Math.max(10, cs.hp), maxHp: ch.hp, hunger: G.roles.cook ? 100 : 80, stam: 100, inf: cs.inf || 0,
      weapons: JSON.parse(JSON.stringify(G.weapons)), backpack: JSON.parse(JSON.stringify(G.backpack)),
      cur: 0, atkCd: 0, reloadT: 0, swingT: 0, hurtT: 0, walk: 0, regen: 0, adren: 0, moving: false,
      spd: ch.spd, mods: ch.mods, cap: State.cap(), grid: State.grid(), hidden: null, bag: G.bag || 'pack_day',
    };
    const firstW = this.p.weapons.findIndex(w => w);
    this.p.cur = firstW >= 0 ? firstW : 0;
    this.zombies = []; this.bullets = []; this.nades = []; this.acid = []; this.parts = []; this.texts = [];
    this.cash = 0; this.kills = 0; this.dangerPts = Days.worldDanger() * Math.min(1, this.lv / 8); this.level = Math.min(this.maxLevel, 1 + Math.floor(this.dangerPts / this.dangerStep)); this.trickleT = 14;
    this.waveT = this.firstWave; this.waveN = 0; this.waveQ = 0; this.waveSpawnT = 0; this.waveActive = 0; this.waveWarned = false; this.chasers = 0;
    this.boss = null; this.bossSpawned = false; this.bossKilled = false;
    // early locations have no boss; later the boss comes at a danger level this location can actually reach
    if (this.lv < Levels.BOSS_FROM) { this.bossLvl = 99; this.bossKills = 1e9; }
    else { this.bossLvl = Math.min(this.maxLevel, 5 + Math.floor(this.dc / 10)); this.bossKills = 25 + Math.floor(this.dc * 1.2); }
    this.retreatT = 0; this.time = 0; this.shake = 0; this.searchCount = 0;
    this.rescued = []; this.survivor = null; this.generator = null; this.powered = false;
    this.navT = 0; this.hop = []; this.alertT = 0; this.panel = null; this.paused = false; this.medJob = null;
    this.locks = []; this.pick = null; this.prevMouse = false; this.bosses = []; this.keyDropped = false; this.extract = null;
    this.traps = []; this.craft = null; this.craftOpen = false; this.trapSel = 0;
    this.barricades = []; this.doorAt = new Map(map.doors.map(d => [d.f + '|' + d.x, d])); this.buildNoiseT = 0; this.msgT = 0;
    // remember what was packed (non-weapon items) so the base can offer 'pack like last time' after a death
    G.lastPack = G.backpack.filter(e => ITEMS[e.id].t !== 'weapon' && ITEMS[e.id].t !== 'quest' && ITEMS[e.id].t !== 'key').reduce((acc, e) => { const o = acc.find(x => x.id === e.id); if (o) o.q += e.q; else acc.push({ id: e.id, q: e.q }); return acc; }, []);
    this.objectives = this.makeObjectives();
    this.populate();
    this.assignLocks();
    this.initDoors();
    this.initExits();
    this.setupKeyObjectives();
    if (this.restricted) { this.bossLvl = 3; this.bossKills = 12; }
    map.rooms[map.start].revealed = true;
    this.active = true; this.over = false;
    G.stats.runs++; Music.setMode('run');
    UI.hideScreen();
    R.cam = null;
    toast(`เข้าสู่ ${loc.n} — ${stage.n}`, 'big');
    if (this.objectives.length) toast('เงื่อนไขผ่านด่าน: ' + this.objectives.map(o => o.label).join(' • '));
  },

  makeObjectives() {
    if (this.farm) return [];
    const map = this.map, d = this.d;
    const rr = U.rng(map.seed ^ 0x5bd1e995);
    const prog = State.stageProg(this.stage.id);
    const remaining = prog.order.filter(i => !prog.cleared.includes(i));
    const isLast = remaining.length === 1 && remaining[0] === this.locIdx;
    const isFirst = prog.cleared.length === 0;
    const n = d < 5 ? 2 : 3;
    const types = [];
    if (isFirst || rr() < 0.55) types.push('rescue');
    const pool = U.shuffle(rr, ['kill', 'search', 'item', 'generator', 'supply']);
    while (types.length < n) types.push(pool.shift());
    // the boss is optional now: killing it only gives great loot + a key item
    const maxDist = Math.max(...map.dist.filter(x => x < 1e9));
    const farRooms = map.rooms.filter(rm => !rm.outdoor && map.dist[rm.id] >= Math.max(1, maxDist * 0.45));
    const anyRooms = map.rooms.filter(rm => !rm.outdoor);
    const pickRoom = () => U.pick(rr, farRooms.length ? farRooms : anyRooms);
    const lootFurn = rm => rm.furn.filter(f => f.loot && !f.decor && f.kind !== 'supply' && !f.forced);
    const objs = [];
    for (const t of types) {
      if (t === 'kill') { const tg = 12 + Math.round(d * 1.2); objs.push({ type: t, cur: 0, target: tg, label: `กำจัดซอมบี้ ${tg} ตัว` }); }
      if (t === 'search') { const tg = 8 + Math.floor(d / 3); objs.push({ type: t, cur: 0, target: tg, label: `ค้นหาของ ${tg} จุด` }); }
      if (t === 'item') {
        const qid = U.pick(rr, ['datadrive', 'sample', 'radio']);
        let fu = null;
        for (let k = 0; k < 20 && !fu; k++) { const c = lootFurn(pickRoom()); if (c.length) fu = U.pick(rr, c); }
        if (!fu) { const rm = pickRoom(); fu = rm.place('crate', 30); }
        if (fu) { fu.forced = (fu.forced || []).concat([{ id: qid, q: 1 }]); objs.push({ type: t, item: qid, cur: 0, target: 1, label: `หา${ITEMS[qid].n}แล้วนำกลับฐาน` }); }
      }
      if (t === 'generator') {
        let fu = null;
        for (let k = 0; k < 20 && !fu; k++) { const c = lootFurn(pickRoom()); if (c.length) fu = U.pick(rr, c); }
        let gen = null;
        for (let k = 0; k < 20 && !gen; k++) { const rm = U.pick(rr, anyRooms); gen = rm.place('generator', 30); }
        if (fu && gen) { fu.forced = (fu.forced || []).concat([{ id: 'fuse', q: 1 }]); this.generator = gen; objs.push({ type: t, cur: 0, target: 1, label: 'หาฟิวส์แล้วซ่อมเครื่องปั่นไฟ' }); }
      }
      if (t === 'supply') {
        const tg = U.ri(rr, 2, 3); let placed = 0;
        for (let k = 0; k < 40 && placed < tg; k++) { const rm = U.pick(rr, map.rooms.filter(x => x.outdoor)); if (rm.place && rm.place('supply', 20)) placed++; } // parachute drops land outside: rooftop / street
        if (placed) objs.push({ type: t, cur: 0, target: placed, label: `เก็บกล่องเสบียงทิ้งร่ม ${placed} กล่อง (บนดาดฟ้า/ถนน)` });
      }
      if (t === 'rescue') {
        const rm = pickRoom();
        this.survivor = { x: (rm.x0 + rm.x1) / 2 + U.rf(rr, -40, 40), f: rm.f, room: rm.id, who: this.rollSurvivor(), state: 'hiding', t: 0 };
        objs.push({ type: t, cur: 0, target: 1, label: 'ช่วยเหลือผู้รอดชีวิต' });
      }
      if (t === 'boss') objs.push({ type: t, cur: 0, target: 1, label: 'สังหารบอสของด่าน' });
    }
    return objs;
  },

  rollSurvivor() {
    const r = Math.random;
    const cands = [];
    for (const id in CHARACTERS) {
      const c = CHARACTERS[id];
      if (!c.starter && !G.unlockedChars.includes(id) && (c.minStage || 0) <= this.stage.gi) cands.push([{ kind: 'char', id }, 3]);
    }
    const roleIds = Object.keys(ROLES).filter(k => !G.roles[k]);
    if (!Object.keys(G.roles).length) return { kind: 'role', id: 'doctor' };
    for (const k of roleIds) cands.push([{ kind: 'role', id: k }, 4]);
    cands.push([{ kind: 'generic', id: U.pick(r, GENERIC_NAMES) }, 2.5]);
    return U.wpick(r, cands);
  },
  survivorName(s) { return s.kind === 'char' ? CHARACTERS[s.id].n : s.kind === 'role' ? ROLES[s.id].who : s.id; },

  zType() {
    // which types can appear depends on the location level; danger only makes the allowed ones more common
    const d = this.dc, L = this.level, lv = this.lv;
    const w = [['walker', 10], ['runner', (lv <= 1 ? 0.6 : 1.2) + d * 0.25 + L * 0.4]];
    if (lv >= Levels.BRUTE_FROM) w.push(['brute', 0.3 + d * 0.12 + L * 0.15]);
    if (lv >= Levels.SPITTER_FROM) w.push(['spitter', 0.5 + d * 0.1 + L * 0.15]);
    return U.wpick(Math.random, w);
  },

  spawnZombie(type, room, x, alerted) {
    const Z = ZOMBIES[type];
    const hm = 1 + this.dc * 0.07 + (this.level - 1) * 0.05;
    const z = {
      type, Z, x, f: room.f, room: room.id, rad: Z.r, climb: null,
      hp: Z.hp * hm, maxHp: Z.hp * hm, spd: Z.spd * U.rf(Math.random, 0.85, 1.15), dmg: Z.dmg * (1 + this.dc * 0.04 + (this.level - 1) * 0.04), dmgK: 1 + this.dc * 0.04 + (this.level - 1) * 0.04,
      state: alerted ? 'chase' : 'idle', facing: Math.random() < 0.5 ? -1 : 1, atkCd: 0, wanderX: x, wanderT: 0,
      ph: Math.random() * 10, hitT: 0, look: Math.floor(Math.random() * 5), depth: U.rf(Math.random, -6, 6), spitCd: 2, chargeT: 0, chargeCd: 5,
      skin: U.pick(Math.random, ['#7a9a66', '#6f8f5c', '#8aa36f', '#6a8a6a', '#94a87a']),
      shirt: U.pick(Math.random, ['#5a4a3a', '#3d4f63', '#6b2f2f', '#4f5a3a', '#6a6a6a', '#2f3f4f', '#7a6a50']),
    };
    this.zombies.push(z);
    return z;
  },

  // a spot inside a room that is not right behind a doorway or on a ladder hole, so nothing is waiting in your face
  safeX(rm, r = Math.random) {
    const L = rm.x0 + (this.door(rm.f, rm.x0) ? 110 : 40), Rr = rm.x1 - (this.door(rm.f, rm.x1) ? 110 : 40);
    if (Rr - L < 30) return (rm.x0 + rm.x1) / 2;
    for (let i = 0; i < 6; i++) {
      const x = U.rf(r, L, Rr);
      if (!this.map.ladders.some(l => Math.abs(l.x - x) < 55 && (l.a === rm.id || l.b === rm.id))) return x;
    }
    return U.rf(r, L, Rr);
  },
  populate() {
    const map = this.map, d = this.dc;
    const total = Math.min(this.zCap() - 5, Math.round((this.lv <= 2 ? 3 : 5) + d * 1.4 + map.rooms.length * 0.8));
    const rooms = map.rooms.filter(rm => rm.id !== map.start);
    for (let i = 0; i < total; i++) {
      const rm = U.pick(Math.random, rooms);
      if (rm.id === map.streetL.id) continue;
      this.spawnZombie(this.zType(), rm, this.safeX(rm), false);
    }
  },

  // ---------- helpers ----------
  yOf(e) { return e.climb ? floorY(e.climb.lad.lo) - e.climb.t * FH : floorY(e.f) - (e.dropH || 0); },
  navRoom(e) { return e.climb ? (e.climb.t < 0.5 ? e.climb.lad.a : e.climb.lad.b) : e.room; },
  door(f, x) { return this.doorSet.has(f + '|' + x); },
  moveH(e, dx) {
    if (!dx || e.climb) return;
    const map = this.map;
    let room = map.rooms[e.room];
    let nx = e.x + dx;
    const minX = room.x0 + WALL / 2 + e.rad, maxX = room.x1 - WALL / 2 - e.rad;
    if (e.Z) { // barricaded doorways stop zombies
      const bl = this.barrDoor(e.f, room.x0), br = this.barrDoor(e.f, room.x1), lim = e.rad + 8;
      if (bl && nx < room.x0 + lim) { nx = Math.max(nx, Math.min(room.x0 + lim, e.x)); e.blockedBy = bl; }
      if (br && nx > room.x1 - lim) { nx = Math.min(nx, Math.max(room.x1 - lim, e.x)); e.blockedBy = br; }
    }
    if (!e.Z) { // locked doors stop the player until picked or forced
      const dl = this.shutDoor(e.f, room.x0), dr = this.shutDoor(e.f, room.x1), lim = e.rad + 6;
      if (dl && nx < room.x0 + lim) nx = Math.max(nx, Math.min(room.x0 + lim, e.x));
      if (dr && nx > room.x1 - lim) nx = Math.min(nx, Math.max(room.x1 - lim, e.x));
    }
    if (nx < minX && !this.door(e.f, room.x0)) nx = Math.max(nx, Math.min(minX, e.x));
    if (nx > maxX && !this.door(e.f, room.x1)) nx = Math.min(nx, Math.max(maxX, e.x));
    e.x = nx;
    if (e.x < room.x0 || e.x >= room.x1) {
      const nr = roomAt(map, e.f, e.x);
      if (nr) e.room = nr.id; else e.x = U.clamp(e.x, room.x0 + e.rad, room.x1 - e.rad);
    }
  },
  ladderNear(e, dirUp) {
    for (const l of this.map.ladders) {
      if (Math.abs(l.x - e.x) > (dirUp ? 26 : 44)) continue;   // going down: the whole hatch area (same reach as aiming down it)
      if (dirUp && l.a === e.room && l.lo === e.f) return l;
      if (!dirUp && l.b === e.room && l.lo + 1 === e.f) return l;
    }
    return null;
  },
  // chance: probability each zombie in range actually hears it (1 = always, e.g. gunshots)
  noise(x, y, radius, chance) {
    if (this.p.hidden) return;
    if (chance != null && chance < 1 && Math.abs(x - this.p.x) < 4) this.p.noiseFx = { r: radius, t: 0.5, max: 0.5 };
    for (const z of this.zombies) {
      if (z.state === 'chase' || z.dead) continue;
      if (this.chasers >= this.chaseCap()) break;
      const dy = (this.yOf(z) - y) * 1.6, d = Math.hypot(z.x - x, dy);
      if (d >= radius) continue;
      if (chance != null && Math.random() > chance * (1 - 0.25 * d / radius)) continue; // farther = less likely to notice
      z.state = 'chase'; this.chasers++;
    }
  },
  // limits so the player is never swarmed beyond what is playable
  zCap() { return Math.min(30, 10 + Math.floor(this.dc * 0.4) + (this.level || 1) * 2); },
  chaseCap() { return Math.min(18, 6 + this.level + Math.floor(this.dc / 5)); },
  waveSize() { return Math.min(10, 2 + Math.floor(this.level * 0.8) + Math.floor(this.dc / 6)); },
  alive() { let n = 0; for (const z of this.zombies) if (!z.dead) n++; return n; },
  updateWaves(dt) {
    this.waveT -= dt;
    if (this.waveT <= 15 && !this.waveWarned) { this.waveWarned = true; this.shake = Math.max(this.shake, 1.5); Snd.waveWarn(); }
    if (this.waveT <= 0) {
      this.waveN++; this.waveWarned = false;
      this.waveT = Math.max(50, 110 - this.level * 4 - this.dc * 0.6);
      const n = Math.max(0, Math.min(this.waveSize(), this.zCap() - this.alive()));
      this.waveQ += n; this.waveActive = 30;
      toast(this.p.hidden ? '🧟 ฝูงซอมบี้มาถึงแล้ว... อยู่เงียบๆ' : '🧟 ฝูงซอมบี้มาถึงแล้ว!', 'warn'); Snd.waveArrive();
      this.shake = Math.max(this.shake, 3);
    }
    if (this.waveActive > 0) this.waveActive -= dt;
    if (this.waveQ > 0) {
      this.waveSpawnT -= dt;
      if (this.waveSpawnT <= 0) {
        this.waveSpawnT = 0.8; this.waveQ--;
        if (this.alive() < this.zCap()) { const z = this.spawnAtEntry(!this.p.hidden && this.chasers < this.chaseCap(), true); z.wave = true; }
      }
    }
  },
  hideSpot() {
    const fu = this.nearFurn(30); if (fu && HIDE_SPOTS[fu.kind]) return fu;
    // a broken doorway: press into the dark frame
    const p = this.p, d = this.map.doors.find(d => d.broken && !d.barr && d.f === p.f && Math.abs(d.x - p.x) < 30);
    if (!d) return null;
    if (!d.hideSpot) d.hideSpot = { kind: 'brokendoor', x: d.x, f: d.f, w: 30, h: 120, decor: true };
    return d.hideSpot;
  },
  tryHide() {
    const p = this.p, fu = this.hideSpot();
    if (p.climb) return;
    if (!fu) { this.popText(p.x, this.yOf(p) - 100, 'ไม่มีที่ซ่อนตรงนี้', '#aaa'); return; }
    const seen = this.zombies.some(z => !z.dead && z.state === 'chase' && z.f === p.f && Math.abs(z.x - p.x) < 200 && this.clearLine(p.f, z.x, p.x));
    if (seen) { this.popText(p.x, this.yOf(p) - 100, 'ซอมบี้เห็นอยู่! ซ่อนไม่ได้', '#ff8a5c'); return; }
    p.hidden = fu; p.x = fu.x; p.vx = 0; p.reloadT = 0; p.moving = false; this.searching = null;
    for (const z of this.zombies) if (!z.dead && z.state === 'chase') { z.state = 'idle'; z.wanderX = z.x + U.rf(Math.random, -160, 160); z.wanderT = U.rf(Math.random, 2, 5); }
    this.popText(p.x, this.yOf(p) - 110, HIDE_SPOTS[fu.kind], '#9dffb0'); Snd.hide();
  },
  unhide(found) {
    const p = this.p; if (!p.hidden) return;
    p.hidden = null; Snd.hide();
    if (found) { this.popText(p.x, this.yOf(p) - 110, 'ถูกพบตัว!', '#ff5555'); this.shake = 5; toast('ซอมบี้พบที่ซ่อนของคุณ!', 'warn'); }
  },
  popText(x, y, txt, col) { this.texts.push({ x, y, txt, col: col || '#fff', t: 1.2 }); },
  blood(x, y, n, col) {
    for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: U.rf(Math.random, -160, 160), vy: U.rf(Math.random, -220, 30), t: U.rf(Math.random, 0.4, 0.9), c: col || '#8a1010', s: U.rf(Math.random, 2, 5), g: 700 });
  },
  objDone(type, inc) {
    for (const o of this.objectives) if (o.type === type && !o.done) {
      o.cur = Math.min(o.target, o.cur + (inc || 1));
      if (o.cur >= o.target) { o.done = true; Snd.objective(); toast('✔ ' + o.label, 'good'); this.checkAllDone(); }
    }
  },
  checkAllDone() {
    if (this.allDone() && !this.allDoneShown) {
      this.allDoneShown = true;
      toast('ผ่านเงื่อนไขครบแล้ว! ไปที่จุดอพยพ (แสงสีเขียว) เพื่อกลับฐาน หรือจะอยู่หาของต่อก็ได้', 'big');
    }
  },
  allDone() { const req = this.objectives.filter(o => !o.optional); return req.length > 0 && req.every(o => o.done); },

  // ---------- update ----------
  update(dt) {
    if (!this.active || this.over) return;
    // the pause menu (and the result screen) freeze the world; backpack / loot panels only slow it to 20%
    if (this.paused || this.panel === 'pause' || this.panel === 'result') return;
    dt *= this.panel ? 0.2 : 1;
    this.time += dt;
    const p = this.p, map = this.map;
    // input-driven actions (only when no panel)
    if (!this.panel) this.playerInput(dt);
    this.playerVitals(dt);
    // reveal rooms
    const pr = map.rooms[this.navRoom(p)];
    if (!pr.revealed) { pr.revealed = true; if (!pr.outdoor) this.popText(p.x, this.yOf(p) - 110, 'ห้องใหม่!', '#7fe3ff'); }
    // danger
    this.dangerPts += dt;
    const nl = Math.min(this.maxLevel, 1 + Math.floor(this.dangerPts / this.dangerStep));
    if (nl > this.level) { this.level = nl; Snd.danger(); toast(`⚠ ระดับอันตราย ${nl} — ซอมบี้ดุขึ้นและฝูงจะใหญ่ขึ้น`, 'warn'); }
    this.updateWaves(dt);
    this.trickleT -= dt;
    if (this.trickleT <= 0) { this.trickleT = Math.max(8, 24 - this.level * 1.0 - this.dc * 0.1); this.trickle(); }
    if (!this.bossSpawned && (this.level >= this.bossLvl || this.kills >= this.bossKills)) this.spawnBoss();
    // nav
    this.navT -= dt;
    if (this.navT <= 0) { this.navT = 0.35; this.computeNav(); }
    this.chasers = 0; for (const z of this.zombies) if (!z.dead && z.state === 'chase') this.chasers++;
    for (const z of this.zombies) {
      const x0 = z.x, c0 = z.climb ? z.climb.t : null;
      this.updateZombie(z, dt);
      const d = Math.abs(z.x - x0) + (z.climb && c0 != null ? Math.abs(z.climb.t - c0) * FH : 0);
      z.dist = (z.dist || 0) + d; z.mv = d > 8 * dt;
    }
    this.separate();
    this.updateTraps(dt);
    if (this.updateExtract(dt)) return;
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updateSearch(dt);
    if (this.survivor && this.survivor.state === 'leaving') { this.survivor.t += dt; this.survivor.x -= 120 * dt; if (this.survivor.t > 2) this.survivor.state = 'gone'; }
    this.zombies = this.zombies.filter(z => !z.gone);
    this.shake = Math.max(0, this.shake - dt * 12);
  },

  playerInput(dt) {
    const p = this.p, K = Input.keys;
    const now = performance.now();
    if (p.hidden) {
      p.moving = false; p.stam = Math.min(100, p.stam + 16 * dt);
      if (Input.hit('Tab') || Input.hit('KeyI')) { UIRun.openInventory(); return; }
      if (Input.hit('Escape')) { UIRun.openPause(); return; }
      if (['KeyH', 'KeyE', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].some(c => Input.hit(c))) this.unhide();
      return;
    }
    const click = Input.mouse.down && !this.prevMouse; this.prevMouse = Input.mouse.down;
    if (this.pick) { this.updatePick(dt, click); return; }
    if (Input.hit('KeyH')) { this.tryHide(); return; }
    // weapon select
    if (Input.hit('KeyC')) this.toggleCraft();
    const craftKeys = this.craftOpen && this.craftInput();
    if (!craftKeys) QUICK_KEYS.forEach((c, i) => { if (Input.hit(c)) this.useQuick(i); });
    if (!craftKeys) ['Digit1', 'Digit2', 'Digit3'].forEach((c, i) => { if (Input.hit(c) && p.weapons[i]) { p.cur = i; p.reloadT = 0; } });
    if (Input.hit('KeyR')) this.reload();
    // item use goes through the player's own quick slots (4-9) only
    if (Input.hit('KeyE')) this.interact();
    if (Input.hit('KeyF')) this.takeAllNearby();
    if (Input.hit('Tab') || Input.hit('KeyI')) { UIRun.openInventory(); return; }
    if (Input.hit('Escape')) { if (this.craftOpen) this.craftOpen = false; else UIRun.openPause(); return; }
    // movement
    let mx = 0;
    if (K['KeyA'] || K['ArrowLeft']) mx -= 1;
    if (K['KeyD'] || K['ArrowRight']) mx += 1;
    const building = this.updateBuild(dt, K['KeyB']);
    if (building) mx = 0;
    const up = K['KeyW'] || K['ArrowUp'], down = K['KeyS'] || K['ArrowDown'];
    // movement modes: Z = sneak (silent, slow), normal walk, Shift = run (loud, uses stamina)
    const sneak = K['KeyZ'] && !p.climb;
    // out of breath: once stamina runs dry you can't sprint again until you've got some back (no stutter-sprinting at 0)
    if (p.stam <= 0.5) p.winded = true; else if (p.stam >= 30) p.winded = false;
    const sprint = !sneak && !p.aiming && !p.overKg && (K['ShiftLeft'] || K['ShiftRight']) && ((p.stam > 1 && !p.winded) || p.adren > 0) && mx !== 0;
    p.gait = sneak ? 'sneak' : sprint ? 'run' : 'walk'; p.sneak = sneak;
    // holding Shift but can't run: say why (once in a while), so it never feels like the key is broken
    if ((K['ShiftLeft'] || K['ShiftRight']) && mx !== 0 && !sprint && !sneak && !p.aiming && now - (p.noRunMsgT || -1e9) > 3000) {
      const why = p.overKg ? 'หนักเกินไป วิ่งไม่ได้' : p.winded ? 'เหนื่อย — รอให้หายเหนื่อยก่อน' : '';
      if (why) { p.noRunMsgT = now; this.popText(p.x, this.yOf(p) - 120, why, '#ffb36a'); }
    }
    let spd = p.spd * (sneak ? 0.38 : sprint ? 1.45 : 0.7) * (p.adren > 0 ? 1.2 : 1) * (this.medJob ? 0.5 : 1) * (p.aiming ? 0.5 : 1);
    if (p.dropH) { // landing after letting go of a ladder (or hopping out at the top)
      if (p.dropH > 0) { p.dropV = (p.dropV || 0) + 1800 * dt; p.dropH = Math.max(0, p.dropH - p.dropV * dt); if (!p.dropH) { p.dropV = 0; Snd.step && Snd.step(false); if (this.time - (p.lastDrop || -9) > 0.1) { this.noise(p.x, floorY(p.f), 180); p.lastDrop = this.time; } } }
      else p.dropH = Math.min(0, p.dropH + 400 * dt);
    }
    if (p.climb) {
      const cs = 100 * (p.overKg ? 0.7 : 1) / FH;   // hand over hand: ~2.4 s a floor (slower than walking), slower still when overloaded
      if (up) p.climb.t += cs * dt; else if (down) p.climb.t -= cs * dt;
      if (p.climb.t >= 1) { p.f = p.climb.lad.lo + 1; p.room = p.climb.lad.b; p.climb = null; }
      else if (p.climb.t <= 0) { p.f = p.climb.lad.lo; p.room = p.climb.lad.a; p.climb = null; }
      else if (mx && !up && !down) {
        // step off sideways: near the top → climb out onto the upper floor, otherwise let go and drop down
        const lad = p.climb.lad, t = p.climb.t;
        if (t >= 0.75) { p.f = lad.lo + 1; p.room = lad.b; p.dropH = -(1 - t) * FH * 0.6; }
        else { p.f = lad.lo; p.room = lad.a; p.dropH = t * FH; }
        p.climb = null; p.facing = mx;
        const nr = roomAt(this.map, p.f, p.x); if (nr) p.room = nr.id;
      }
      if (p.climb) p.moving = up || down;
      if (p.moving) p.walk += dt * 8;
    } else {
      if (!down) { p.kbDown = false; p.downHoldT = 0; }
      if (up) { const l = this.ladderNear(p, true); if (l) { p.x = l.x; p.vx = 0; p.climb = { lad: l, t: 0.02 }; } }
      else if (down) {
        const l = this.ladderNear(p, false);
        // holding a gun on an upper floor: S kneels and aims down; at a hatch keep holding (0.6 s) to climb down
        const w = this.curWeapon(), gun = w && ITEMS[w.id].cls !== 'melee' && dur(w) > 0;
        // with a gun: S aims down through the floor anywhere; standing at a ladder it just climbs down — unless there are
        // zombies down there to shoot, then it aims first and climbs once you've held it a moment
        const hole = gun && this.holeUnder && this.holeUnder();
        const aimHatch = hole && (!l || this.downCands(l).length > 0);
        const firing = Input.mouse.down || K['Space'] || K['KeyJ'] || this.time - (p.lastShot || -9) < 0.5;
        p.kbDown = !!aimHatch; p.downHoldT = aimHatch && firing ? 0 : (p.downHoldT || 0) + dt;   // shooting down doesn't count toward climbing down
        if (l && (!aimHatch || p.downHoldT >= 0.45)) { p.kbDown = false; p.x = l.x; p.vx = 0; p.climb = { lad: l, t: 0.98 }; }
      }
      // facing: mouse-held attack aims at the cursor; otherwise movement keys turn the character;
      // standing still, the cursor turns you only if it moved after your last step
      const aimMouse = (Input.mouse.down || p.aiming) && R.cam;
      const cursorFace = () => { const mw = R.screenToWorld(Input.mouse.x, Input.mouse.y); if (Math.abs(mw.x - p.x) > 6) p.facing = mw.x < p.x ? -1 : 1; };
      if (aimMouse) cursorFace();
      else if (mx && (K['Space'] || K['KeyJ']) && this.curWeapon() && ITEMS[this.curWeapon().id].cls !== 'melee') p.keyT = now;   // firing with the keyboard: keep facing the enemy and back-pedal
      else if (mx) { p.facing = mx; p.keyT = now; }
      else if (R.cam && Input.mouse.t > (p.keyT || 0) && now - Input.mouse.t < 1500) cursorFace();
      // smooth acceleration / braking; backpedalling while aiming is slower
      const back = mx && mx !== p.facing ? 0.72 : 1;
      const target = p.climb ? 0 : mx * spd * back * (this.barrNear(p) ? 0.45 : 1);
      p.vx = p.vx || 0;
      p.vx += (target - p.vx) * Math.min(1, dt * (mx ? 12 : 18));
      if (Math.abs(p.vx) < 4 && !mx) p.vx = 0;
      if (!p.climb && p.vx) {
        this.moveH(p, p.vx * dt);
        const st0 = Math.floor(p.walk * 0.8075); p.walk += Math.abs(p.vx) * dt / 16;
        if (Math.floor(p.walk * 0.8075) !== st0) {
          if (p.gait !== 'sneak') Snd.step(this.map.rooms[p.room].outdoor);
          // footsteps: walking is heard ~40-60% of the time nearby, running >60% and farther, sneaking is silent
          if (p.gait === 'walk') this.noise(p.x, this.yOf(p), 210, U.rf(Math.random, 0.4, 0.6) * 0.35);
          else if (p.gait === 'run') this.noise(p.x, this.yOf(p), 380, U.rf(Math.random, 0.65, 0.85) * 0.5);
        }
      }
      p.moving = Math.abs(p.vx) > 25;
      if (sprint && p.adren <= 0) p.stam = Math.max(0, p.stam - 24 * (p.kgStam || 1) * dt / (p.mods.stam || 1));
    }
    if (!sprint) p.stam = Math.min(100, p.stam + 16 * dt);
    if (p.noiseFx) { p.noiseFx.t -= dt; if (p.noiseFx.t <= 0) p.noiseFx = null; }
    // attack
    p.atkCd -= dt;
    if (p.reloadT > 0) { p.reloadT -= dt; if (p.reloadT <= 0) this.finishReload(); }
    if ((Input.mouse.down || K['Space'] || K['KeyJ']) && !p.climb && !building && !this.pick) this.attack();
  },

  playerVitals(dt) {
    const p = this.p;
    p.swingT = Math.max(0, p.swingT - dt);
    if (p.pendingHit) { p.pendingHit.t -= dt; if (p.pendingHit.t <= 0) { const h = p.pendingHit; p.pendingHit = null; if (!p.climb && !p.hidden) this.meleeHit(h.s, h.bare); } }
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.hunger -= dt * (0.2 + (p.inf > 50 ? 0.1 : 0));
    if (p.hunger <= 0) { p.hunger = 0; this.hurt(1.6 * dt, true); }
    if (p.regen > 0) { const h = Math.min(p.regen, 2.2 * dt); p.regen -= h; p.hp = Math.min(p.maxHp, p.hp + h); }
    if (p.adren > 0) p.adren -= dt;
    if (p.inf > 0) { p.inf += dt * 0.08; if (p.inf >= 100) { p.inf = 100; this.die('infection'); } }
  },

  curWeapon() { return this.p.weapons[this.p.cur]; },
  // a melee swing: wind-up → strike → recover over `dur` seconds; the hit lands when the blade actually comes through
  // (45% of the way in, as the strike passes level), not the moment the button is pressed
  startSwing(dur, s, bare) {
    const p = this.p; p.swingDur = dur; p.swingT = dur;
    p.pendingHit = { t: dur * 0.45, s, bare };
  },

  attack() {
    const p = this.p, w = this.curWeapon();
    if (!w || p.atkCd > 0) {
      if (!w && p.atkCd <= 0) { // bare fists
        p.atkCd = 0.5; Snd.swing(); this.startSwing(0.4, { dmg: 8, range: 44, kb: 40 }); }
      return;
    }
    const s = wStats(w, G.char);
    if (dur(w) <= 0) { // broken: melee falls back to fists, guns just click
      if (s.cls === 'melee') { p.atkCd = 0.5; Snd.swing(); this.startSwing(0.4, { dmg: 8, range: 44, kb: 40 }, true); }
      else { p.atkCd = 0.4; Snd.empty(); }
      this.popText(p.x, this.yOf(p) - 90, `${ITEMS[w.id].n} พัง — ต้องซ่อม`, '#ff6a5c');
      return;
    }
    if (s.cls === 'melee') {
      p.atkCd = s.rate; Snd.swing();
      this.startSwing(Math.min(0.55, Math.max(0.28, s.rate * 0.92)), s);
      return;
    }
    if (p.reloadT > 0) return;
    if (w.jammed) { p.atkCd = 0.3; Snd.empty(); this.popText(p.x, this.yOf(p) - 90, 'ปืนติด! กด R', '#ffb36a'); return; }
    if (w.mag <= 0) {
      if (Inv.count(p.backpack, s.ammo) > 0) this.reload();
      else { p.atkCd = 0.4; Snd.empty(); this.popText(p.x, this.yOf(p) - 90, 'กระสุนหมด!', '#ff8a5c'); }
      return;
    }
    if (this.tryJam(w)) { p.atkCd = 0.35; return; }
    w.mag--; p.atkCd = s.rate; p.lastShot = this.time; Snd.shot(s.cls, s.ammo, p.x);
    this.wear(w);
    const mz = R.muzzle ? R.muzzle : (typeof Sprites !== 'undefined') && Sprites.has('char_' + G.char) ? Sprites.muzzle('char_' + G.char, s.cls === 'pistol', (G.char === 'joe' ? 1.1 : 1) * CHAR_SCALE) : null;
    const y0 = this.yOf(p) - (mz ? mz.dy : 40);
    const x0 = p.x + p.facing * (mz ? mz.dx - 6 : 30);
    // auto-aim to nearest zombie in facing direction on same floor
    let target = null, best = s.range;
    for (const z of this.zombies) {
      if (z.dead || z.f !== p.f || z.climb) continue;
      const dx = (z.x - p.x) * p.facing;
      if (dx < 0 || dx > best) continue;
      if (!this.clearLine(p.f, p.x, z.x)) continue;
      best = dx; target = z;
    }
    let base = p.facing > 0 ? 0 : Math.PI;
    if (target) {
      const ty = this.yOf(target) - target.Z.r * (target.Z.boss ? 4 : 3);
      base = Math.atan2(ty - y0, target.x - x0);
    }
    const pellets = s.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const a = base + U.rf(Math.random, -s.spread, s.spread);
      const crit = (p.mods.crit || 0) > Math.random();
      this.bullets.push({ x: x0, y: y0, vx: Math.cos(a) * s.spd, vy: Math.sin(a) * s.spd, f: p.f, room: p.room, dmg: s.dmg * (crit ? 2.5 : 1), crit, pierce: s.pierce || 0, hit: new Set(), dist: 0, range: s.range, kb: s.pellets ? 30 : 15, bolt: s.ammo === 'bolt' });
    }
    this.parts.push({ x: x0 + p.facing * 8, y: y0, flash: true, t: 0.07, s: s.pellets ? 1.4 : 1, dir: p.facing, ang: base });
    this.parts.push({ x: p.x + p.facing * 8, y: y0 - 2, vx: -p.facing * U.rf(Math.random, 60, 140), vy: U.rf(Math.random, -220, -140), t: 1.6, casing: true, rot: 0, g: 900, floor: floorY(p.f) - 2, c: s.ammo === 'a12' ? '#c0392b' : '#d4b040' });
    for (let k = 0; k < 2; k++) this.parts.push({ x: x0 + p.facing * 14, y: y0, vx: p.facing * U.rf(Math.random, 20, 60), vy: U.rf(Math.random, -30, -10), t: 0.6, smoke: true, s: 5 + Math.random() * 4, g: 0 });
    this.shake = Math.max(this.shake, s.pellets ? 4 : 1.5);
    this.noise(p.x, y0, s.noise);
    this.dangerPts += (s.noise / 1100) * (this.noiseK || 1);
    if (w.mag <= 0 && Inv.count(p.backpack, s.ammo) > 0) this.reload();
  },

  clearLine(f, x1, x2) {
    const a = Math.min(x1, x2), b = Math.max(x1, x2);
    for (const rm of this.map.byFloor[f]) {
      if (rm.x1 > a && rm.x1 < b && (!this.door(f, rm.x1) || this.shutDoor(f, rm.x1))) return false;
    }
    return true;
  },

  meleeHit(s, bare) {
    const p = this.p, py = this.yOf(p);
    let hitAny = false;
    for (const z of this.zombies) {
      if (z.dead) continue;
      if (Math.abs(this.yOf(z) - py) > 50) continue;
      const dx = (z.x - p.x) * p.facing;
      if (dx < -12 || dx > s.range + z.rad) continue;
      if (!this.clearLine(p.f, p.x, z.x)) continue;
      const crit = (p.mods.crit || 0) > Math.random();
      this.damageZombie(z, s.dmg * (crit ? 2 : 1), p.facing * (s.kb || 50), crit);
      hitAny = true;
    }
    this.noise(p.x, py, hitAny ? 160 : 60);
    const w = !bare && this.curWeapon();
    if (hitAny) { this.shake = Math.max(this.shake, 2); if (w) this.wear(w); }
    else if (this.hitProps(s) === true && w) this.wear(w, 1.5); // smashing wood/metal is hard on the blade
  },

  reload() {
    const p = this.p, w = this.curWeapon();
    if (w && w.jammed && p.reloadT <= 0) { w.jammed = false; p.reloadT = 0.6; p.reloadMax = 0.6; p.unjam = true; Snd.reload(0); this.popText(p.x, this.yOf(p) - 90, 'แก้ปืนติด...', '#ffd36a'); return; }
    if (!w || ITEMS[w.id].cls === 'melee' || p.reloadT > 0) return;
    const s = wStats(w, G.char);
    if (w.mag >= s.mag) return;
    if (Inv.count(p.backpack, s.ammo) <= 0) { this.popText(p.x, this.yOf(p) - 90, 'ไม่มี' + ITEMS[s.ammo].n, '#ff8a5c'); return; }
    p.reloadT = s.reload; p.reloadMax = s.reload; Snd.reload(0);
  },
  finishReload() {
    const p = this.p, w = this.curWeapon();
    if (p.unjam) { p.unjam = false; Snd.reload(1); return; }
    if (!w) return;
    const s = wStats(w, G.char);
    const got = Inv.remove(p.backpack, s.ammo, s.mag - w.mag); Snd.reload(1);
    w.mag += got;
  },

  quickUse(kind) {
    const p = this.p;
    let opts;
    if (kind === 'med') {
      if (p.inf >= 40 && Inv.count(p.backpack, 'antiviral')) opts = ['antiviral'];
      else {
        const missing = p.maxHp - p.hp;
        opts = missing > 50 ? ['medkit', 'bandage', 'pills', 'adrenaline'] : ['bandage', 'pills', 'medkit', 'adrenaline'];
      }
    } else opts = p.hunger < 40 ? ['canned', 'mre', 'stew', 'bar', 'water'] : ['bar', 'water', 'canned', 'mre', 'stew'];
    for (const id of opts) if (Inv.count(p.backpack, id)) { this.useItem(id); return; }
    this.popText(p.x, this.yOf(p) - 90, kind === 'med' ? 'ไม่มียา' : 'ไม่มีอาหาร', '#ff8a5c');
  },
  useItem(id) {
    const p = this.p, it = ITEMS[id];
    if (!Inv.count(p.backpack, id)) return false;
    const hm = p.mods.heal || 1;
    // meds take time to apply (adrenaline is instant); the effect lands when the timer finishes
    if (it.t === 'med' && it.use && !this._applyMed) {
      if (this.medJob && this.medJob.id === id) return false;
      this.medJob = { id, t: 0, T: it.use * (p.mods.heal > 1 ? 0.8 : 1) };
      return false;
    }
    if (it.t === 'med') {
      if (it.heal) p.hp = Math.min(p.maxHp, p.hp + it.heal * hm);
      if (it.regen) p.regen += it.regen * hm;
      if (it.cure) p.inf = Math.max(0, p.inf - it.cure * hm);
      if (it.adren) p.adren = it.adren;
      Snd.heal(); this.popText(p.x, this.yOf(p) - 90, '+' + (it.heal ? Math.round(it.heal * hm) + ' HP' : it.cure ? 'ต้านไวรัส' : 'ฟื้นฟู'), '#6fff8f');
    } else if (it.t === 'food') {
      p.hunger = Math.min(100, p.hunger + it.food);
      if (it.stam) p.stam = 100;
      if (it.heal) p.hp = Math.min(p.maxHp, p.hp + it.heal);
      Snd.eat(); this.popText(p.x, this.yOf(p) - 90, '+' + it.food + ' อิ่ม', '#ffd36f');
    } else if (it.t === 'tool' && id === 'sewkit') {
      this.startGearRepair(this.worstGear(), null, 'sewkit'); return false;
    } else if (it.t === 'tool' && id === 'repairkit') {
      this.startFieldRepair(); return false; // consumed (with parts) only when the repair finishes
    } else return false;
    Inv.remove(p.backpack, id, 1);
    return true;
  },

  throwNade(want) {
    const p = this.p;
    if (p.climb) return;
    const id = want && Inv.count(p.backpack, want) ? want : ['grenade', 'pipebomb'].find(k => Inv.count(p.backpack, k));
    if (!id) { this.popText(p.x, this.yOf(p) - 90, 'ไม่มีระเบิด', '#ff8a5c'); return; }
    Inv.remove(p.backpack, id, 1); Snd.throwNade();
    const bl = p.mods.blast || 1, tr = p.mods.trap || 1, pipe = id === 'pipebomb';
    this.nades.push({ x: p.x + p.facing * 20, y: this.yOf(p) - 60, vx: p.facing * 430, vy: -300, f: p.f, room: p.room, t: pipe ? 1.8 : 1.5, rot: 0,
      kind: id, r: (pipe ? 140 : 160) * bl, dmg: (pipe ? 170 : 220) * tr });
  },

  explode(n) {
    const R0 = n.r || 160, D0 = n.dmg || 220; Snd.explosion(n.x, n.f);
    for (const z of this.zombies) {
      if (z.dead) continue;
      const d = Math.hypot(z.x - n.x, (this.yOf(z) - 40 - n.y) * 1.3);
      if (d < R0) this.damageZombie(z, D0 * (1 - d / R0 * 0.6), Math.sign(z.x - n.x) * 260);
    }
    const p = this.p, pd = Math.hypot(p.x - n.x, (this.yOf(p) - 40 - n.y) * 1.3), PR = 120 * Math.min(1.3, R0 / 160);
    if (pd < PR) this.hurt(40 * (1 - pd / PR));
    for (const rm of this.map.rooms) { // blasts wreck furniture too (and whatever is inside)
      if (rm.f !== n.f || !rm.furn) continue;
      for (const fu of rm.furn.slice()) {
        if (!smashInfo(fu)) continue;
        const d = Math.abs(fu.x - n.x) - fu.w / 2;
        if (d < R0 * 0.75) this.damageFurn(fu, rm, D0 * 0.6 * (1 - Math.max(0, d) / R0));
      }
    }
    for (const t of this.traps || []) if (t.type === 'mine' && !t.dead && t.f === n.f && Math.abs(t.x - n.x) < R0 * 0.6 && t !== n.src) t.chain = 0.15; // chain reaction
    for (let i = 0; i < 28; i++) this.parts.push({ x: n.x, y: n.y, vx: U.rf(Math.random, -380, 380), vy: U.rf(Math.random, -380, 120), t: U.rf(Math.random, 0.3, 0.8), c: U.pick(Math.random, ['#ffcc33', '#ff7a1a', '#ff3d00', '#555']), s: U.rf(Math.random, 3, 7), g: 500 });
    this.parts.push({ x: n.x, y: n.y, boom: true, t: 0.35, s: 1 });
    for (let k = 0; k < 12; k++) this.parts.push({ x: n.x + U.rf(Math.random, -40, 40), y: n.y + U.rf(Math.random, -30, 10), vx: U.rf(Math.random, -40, 40), vy: U.rf(Math.random, -60, -10), t: 1.4, smoke: true, s: 14 + Math.random() * 14, g: 0 });
    this.shake = 10;
    this.noise(n.x, n.y, 1100);
    this.dangerPts += (1.2) * (this.noiseK || 1);
  },

  damageZombie(z, dmg, kb, crit) {
    if (z.dead) return;
    z.hp -= dmg; z.hitT = 0.12; z.state = 'chase'; Snd.hit(dmg > 40, z.x, z.f);
    if (kb && !z.Z.boss) this.moveH(z, kb * (z.type === 'brute' ? 0.3 : 1) * 0.25);
    const zy = this.yOf(z);
    this.blood(z.x, zy - 45, crit ? 8 : 4);
    const brm = this.map.rooms[z.room];
    if (!brm.outdoor && Math.random() < 0.18 && brm.blood.length < 26) brm.blood.push({ x: z.x + U.rf(Math.random, -30, 30), y: Math.random(), s: U.rf(Math.random, 0.5, 1.1), wall: true });
    if (Settings.v.dmgNums) this.popText(z.x + U.rf(Math.random, -10, 10), zy - (z.Z.boss ? 150 : 85), Math.round(dmg) + (crit ? '!' : ''), crit ? '#ffdd33' : '#ffffff');
    if (z.hp <= 0) this.killZombie(z);
  },

  killZombie(z) {
    z.dead = true; z.deadT = 0; Snd.zombieDie(z.x, z.f, z.type);
    this.kills++; G.stats.kills++;
    this.objDone('kill');
    const zy = this.yOf(z);
    this.blood(z.x, zy - 40, 14);
    const rm = this.map.rooms[z.room];
    rm.blood.push({ x: z.x, y: 0.98, s: U.rf(Math.random, 0.8, 1.5), wall: false });
    if (z.Z.boss) {
      const alive = (this.bosses || []).filter(b => !b.dead);
      if (!alive.length) this.bossKilled = true; else this.boss = alive[0];
      this.objDone('boss');
      this.dropSourceKeys(z);
      if (this.restricted || (!this.keyDropped && Math.random() < 0.5)) { this.keyDropped = true; this.dropKey(z); }
      const items = [...rollLoot('supply', this.d, 3), ...rollLoot('weapons', this.d, 2), ...rollLoot('safe', this.d, 1)];
      const bp = pickBlueprint(Math.random, this.d + 6); if (bp && !items.some(i => i.id === bp)) items.push({ id: bp, q: 1 });
      const pr = Math.random(); if (pr < 0.2) items.push({ id: 'pack_raid', q: 1 }); else if (pr < 0.45) items.push({ id: 'pack_military', q: 1 });
      const cash = items.filter(i => i.id === 'cash').reduce((s, i) => s + i.q, 0) + 300 + this.d * 60;
      this.addCash(cash, z.x, zy - 140);
      this.dropBag(z.x, z.f, z.room, items.filter(i => i.id !== 'cash'));
      toast('บอสถูกกำจัดแล้ว! มันทิ้งของไว้ให้', 'good');
      this.shake = 12;
      return;
    }
    if (Math.random() < 0.3) this.addCash(Math.round(U.ri(Math.random, 2, 8) * (1 + this.d * 0.1)), z.x, zy - 60);
    if (Math.random() < 0.08) {
      const items = rollLoot(U.pick(Math.random, ['body', 'crate']), this.d, 0).filter(i => i.id !== 'cash');
      if (items.length) this.dropBag(z.x, z.f, z.room, items);
    }
  },
  addCash(q, x, y) {
    this.cash += q; this.popText(x, y, '+' + q + ' 💵', '#7dff7a'); Snd.coin();
    for (let i = 0; i < Math.min(6, 2 + Math.floor(q / 15)); i++) this.parts.push({ x, y: y + 20, vx: U.rf(Math.random, -90, 90), vy: U.rf(Math.random, -260, -140), t: 0.9, bill: true, rot: Math.random() * 3, g: 520 });
  },

  dropBag(x, f, roomId, items) {
    if (!items.length) return;
    // use the room that really contains x on that floor (a zombie dying in a doorway / on a ladder may report another room)
    const rm = roomAt(this.map, f, x) || this.map.rooms[roomId];
    roomId = rm.id; x = U.clamp(x, rm.x0 + WALL / 2 + 22, rm.x1 - WALL / 2 - 22);
    // merge into nearby bag
    let bag = rm.furn.find(fu => fu.kind === 'bag' && Math.abs(fu.x - x) < 40);
    if (!bag) { bag = { kind: 'bag', x, w: 40, h: 26, loot: null, room: roomId, searched: true, prog: 1, items: [], id: 'b' + Math.random() }; rm.furn.push(bag); }
    for (const it of items) Inv.addFree(bag.items, it);
  },

  hurt(dmg, silent) {
    const p = this.p;
    if (this.over) return;
    p.hp -= dmg;
    if (!silent && this.medJob) { this.medJob = null; this.popText(p.x, this.yOf(p) - 130, 'การรักษาถูกขัดจังหวะ!', '#ff8a5c'); }
    if (!silent && this.repairJob) { this.repairJob = null; this.popText(p.x, this.yOf(p) - 130, 'การซ่อมถูกขัดจังหวะ', '#ff8a5c'); }
    if (!silent && this.craft) { this.craft = null; this.popText(p.x, this.yOf(p) - 130, 'ประดิษฐ์ถูกขัดจังหวะ', '#ff8a5c'); }
    if (!silent) { p.searchLock = 0.9; p.searchOn = null; Snd.hurt(); } // getting hit interrupts searching for a moment
    if (!silent && this.pick) { this.pick = null; this.popText(p.x, this.yOf(p) - 120, 'ถูกขัดจังหวะ!', '#ff8a5c'); }
    if (!silent && p.build) { p.build = null; this.popText(p.x, this.yOf(p) - 120, 'ถูกขัดจังหวะ!', '#ff8a5c'); }
    if (!silent) { p.hurtT = 0.3; this.retreatT = 0; this.shake = Math.max(this.shake, 4); this.blood(p.x, this.yOf(p) - 45, 5); }
    if (p.hp <= 0) { p.hp = 0; this.die('killed'); }
  },

  // ---------- zombies ----------
  computeNav() {
    const map = this.map, start = this.navRoom(this.p);
    const hop = new Array(map.rooms.length).fill(null);
    const seen = new Array(map.rooms.length).fill(false);
    seen[start] = true;
    const q = [start];
    while (q.length) {
      const c = q.shift();
      for (const e of map.adj[c]) {
        if (seen[e.to]) continue;
        seen[e.to] = true;
        // edge from e.to back to c
        const back = map.adj[e.to].find(b => b.to === c);
        hop[e.to] = back;
        q.push(e.to);
      }
    }
    this.hop = hop;
  },

  updateZombie(z, dt) {
    if (z.dead) { z.deadT += dt; if (z.deadT > 6) z.gone = true; return; }
    const p = this.p, map = this.map;
    z.ph += dt * (z.spd / 40);
    z.hitT = Math.max(0, z.hitT - dt);
    z.atkCd -= dt;
    if (Math.random() < dt * (z.state === 'chase' ? 0.3 : 0.06)) Snd.groan(z.x, z.f, z.type);
    const zy = this.yOf(z), py = this.yOf(p);
    // just noticed the player: short reaction (turn + roar) before giving chase, then ramp up speed
    if (z.prevState !== 'chase' && z.state === 'chase') {
      const first = !z.seenP; z.seenP = true;
      z.alertT = z.hitT > 0 ? 0.1 : first ? U.rf(Math.random, 0.9, 1.3) : U.rf(Math.random, 0.35, 0.7); z.run = 0.2;
      if (first && z.hitT <= 0) this.popText(z.x, zy - (z.Z.boss ? 175 : 100), '!', '#ffd24a');
    }
    z.prevState = z.state;
    // detection
    if (p.hidden) {
      if (z.state === 'chase') { z.state = 'idle'; z.wanderX = p.x + U.rf(Math.random, -140, 140); z.wanderT = U.rf(Math.random, 3, 6); }
      // lingering right next to the hiding spot may give the player away
      if (z.room === p.room && Math.abs(z.x - p.x) < 34) { z.sniff = (z.sniff || 0) + dt; if (z.sniff > 6) { z.sniff = 0; this.unhide(true); z.state = 'chase'; } }
      else z.sniff = Math.max(0, (z.sniff || 0) - dt);
    } else if (z.state === 'idle' && this.chasers < this.chaseCap()) {
      const pnav = this.navRoom(p);
      const sm = p.sneak ? 0.5 : 1;
      if (z.room === pnav && Math.abs(z.x - p.x) < z.Z.sight * sm) { z.state = 'chase'; this.chasers++; }
      else if (z.f === p.f && !p.climb && Math.abs(z.x - p.x) < z.Z.sight * 0.7 * sm && this.clearLine(z.f, z.x, p.x)) { z.state = 'chase'; this.chasers++; }
    }
    let spd = z.spd;
    if (z.slowT > 0) { z.slowT -= dt; spd *= z.Z.boss ? 0.7 : 0.4; } // standing in a spike trap
    if (z.Z.boss) {
      z.chargeCd -= dt;
      if (z.chargeT > 0) { z.chargeT -= dt; spd *= 3.2; }
      else if (z.chargeCd <= 0 && z.f === p.f && Math.abs(z.x - p.x) < 520) { z.chargeT = 0.9; z.chargeCd = 6; this.popText(z.x, zy - 160, 'พุ่งชน!', '#ff5555'); }
    }
    if (z.climb) {
      const cs = (z.spd * 0.7) / FH;
      z.climb.t += z.climb.dir * cs * dt;
      if (z.climb.t >= 1) { z.f = z.climb.lad.lo + 1; z.room = z.climb.lad.b; z.climb = null; }
      else if (z.climb.t <= 0) { z.f = z.climb.lad.lo; z.room = z.climb.lad.a; z.climb = null; }
      return;
    }
    if (z.state === 'idle') {
      z.idleT = (z.idleT || 0) + dt;
      if (z.wave && z.idleT > 25 && Math.abs(z.x - p.x) + Math.abs(zy - py) > 900) { z.gone = true; return; }
      z.wanderT -= dt;
      const rm = map.rooms[z.room];
      if (z.wanderT <= 0) { z.wanderT = U.rf(Math.random, 2, 5); z.wanderX = z.wave ? U.rf(Math.random, rm.x0 + 30, rm.x1 - 30) : this.safeX(rm); }
      const dx = z.wanderX - z.x;
      if (Math.abs(dx) > 4) { z.facing = Math.sign(dx); this.moveH(z, Math.sign(dx) * spd * 0.35 * dt); }
      return;
    }
    // chase
    z.idleT = 0;
    if (z.alertT > 0) { z.alertT -= dt; z.facing = Math.sign(p.x - z.x) || z.facing; return; }
    z.run = Math.min(1, (z.run ?? 1) + dt * 1.4);
    if (!z.Z.boss || z.chargeT <= 0) spd *= 0.35 + 0.65 * z.run;
    const pnav = this.navRoom(p);
    const dxp = p.x - z.x, dyp = py - zy;
    // attack
    const bb = z.blockedBy; z.blockedBy = null;
    if (bb && bb.hp > 0 && this.stillBlocks(z, bb)) {
      z.blockedBy = bb; z.run = 0.3;
      z.facing = Math.sign(bb.x - z.x) || z.facing;
      if (z.atkCd <= 0) { z.atkCd = 1.1; this.hitBarricade(bb, z); }
      return;
    }
    const reach = Math.abs(dxp) < z.rad + 18 && Math.abs(dyp) < (p.climb && !z.climb ? 24 : 48) && !p.hidden && !this.barrBetween(z.f, z.x, p.x);
    if (reach && !z.inReach) z.atkCd = Math.max(z.atkCd, z.type === 'runner' ? 0.35 : 0.55);   // wind-up before the first swing
    z.inReach = reach;
    if (reach) {
      z.run = 0.35;
      z.facing = Math.sign(dxp) || z.facing;
      if (z.atkCd <= 0) {
        // each type hits differently: runners scratch fast and light, brutes slam slow and hard (±15% per hit)
        z.atkCd = z.Z.atk || 1.0; Snd.zombieAttack(z.x, z.f);
        this.hurt(z.dmg * U.rf(Math.random, 0.85, 1.15));
        const kbr = p.mods.kbRes || 1;
        if (!p.climb) this.moveH(p, Math.sign(dxp) * (z.Z.boss ? 60 : z.type === 'brute' ? 40 : 10) * kbr);
        if (!this.armorBlocked && Math.random() < (z.Z.inf ?? 0.18) * (p.mods.infRes ?? 1)) { p.inf = Math.min(100, p.inf + U.ri(Math.random, 6, 14)); this.popText(p.x, py - 110, 'ติดเชื้อ!', '#9dff5c'); }
        z.chargeT = 0;
      }
      return;
    }
    // spitter
    if (z.Z.ranged && z.f === p.f && !p.climb && Math.abs(dxp) < 420 && Math.abs(dxp) > 80 && this.clearLine(z.f, z.x, p.x)) {
      z.spitCd -= dt; z.facing = Math.sign(dxp);
      if (z.spitCd <= 0) { z.spitCd = 2.6; Snd.spit(z.x, z.f); this.acid.push({ x: z.x + z.facing * 20, y: zy - 55, vx: z.facing * 360, vy: -60, f: z.f, room: z.room, dmg: (z.Z.acid || z.Z.dmg) * (z.dmgK || 1), t: 2 }); }
      if (Math.abs(dxp) < 260) return;
    }
    if (z.room === pnav && !p.climb) {
      z.facing = Math.sign(dxp) || z.facing;
      this.moveH(z, z.facing * spd * dt);
      return;
    }
    const hop = this.hop[z.room];
    if (!hop) {
      // same room but player climbing: go to ladder
      if (p.climb && z.room === pnav) { const dx = p.climb.lad.x - z.x; if (Math.abs(dx) > 4) this.moveH(z, Math.sign(dx) * spd * dt); }
      return;
    }
    if (hop.k === 'door') {
      const to = map.rooms[hop.to];
      const tx = to.x0 >= hop.x - 1 ? hop.x + 40 : hop.x - 40;
      const dx = tx - z.x; z.facing = Math.sign(dx) || z.facing;
      this.moveH(z, Math.sign(dx) * Math.min(Math.abs(dx), spd * dt) || 0);
    } else {
      const dx = hop.x - z.x;
      if (Math.abs(dx) < 5) {
        if (hop.lad.barr && hop.lad.barr.hp > 0) { z.x = hop.x; z.blockedBy = hop.lad.barr; }
        else z.climb = { lad: hop.lad, t: hop.k === 'up' ? 0.01 : 0.99, dir: hop.k === 'up' ? 1 : -1 };
        if (!z.climb) z.x = hop.x;
      }
      else { z.facing = Math.sign(dx); this.moveH(z, Math.sign(dx) * Math.min(Math.abs(dx), spd * dt)); }
    }
  },

  separate() {
    const zs = this.zombies;
    for (let i = 0; i < zs.length; i++) {
      const a = zs[i]; if (a.dead || a.climb) continue;
      for (let j = i + 1; j < zs.length; j++) {
        const b = zs[j]; if (b.dead || b.climb || b.f !== a.f || b.room !== a.room) continue;
        const dx = b.x - a.x, min = (a.rad + b.rad) * 0.55;
        if (Math.abs(dx) < min) {
          const push = (min - Math.abs(dx)) * 0.25 * (dx >= 0 ? 1 : -1);
          this.moveH(a, -push); this.moveH(b, push);
        }
      }
    }
  },

  wave() {
    const n = Math.min(12, 1 + this.level + Math.floor(this.dc * 0.3));
    toast(`⚠ ระดับอันตราย ${this.level} — ซอมบี้ฝูงใหม่กำลังมา!`, 'warn');
    for (let i = 0; i < n; i++) this.spawnAtEntry(true);
  },
  trickle() {
    if (this.alive() >= this.zCap() - 2) return;
    this.spawnAtEntry(!this.p.hidden && this.chasers < this.chaseCap() && Math.random() < 0.3 + this.level * 0.04);
  },
  spawnAtEntry(alerted, entryOnly) {
    const map = this.map, p = this.p;
    const opts = [];
    opts.push({ rm: map.streetL, x: -STREET + 20 }, { rm: map.streetR, x: map.BW + STREET - 20 }, { rm: map.roof, x: U.rf(Math.random, 30, map.BW - 30) });
    if (!entryOnly) for (const rm of map.rooms) if (!rm.outdoor && rm.id !== this.navRoom(p) && Math.abs((rm.x0 + rm.x1) / 2 - p.x) + Math.abs(floorY(rm.f) - this.yOf(p)) > 500) opts.push({ rm, x: U.rf(Math.random, rm.x0 + 30, rm.x1 - 30) });
    const o = U.pick(Math.random, opts);
    return this.spawnZombie(this.zType(), o.rm, o.x, alerted);
  },
  spawnBoss() {
    this.bossSpawned = true;
    const map = this.map, p = this.p;
    let best = null, bd = -1;
    for (const rm of map.rooms) {
      if (rm.id === this.navRoom(p)) continue;
      const d = Math.abs((rm.x0 + rm.x1) / 2 - p.x) + Math.abs(floorY(rm.f) - this.yOf(p));
      if (d > bd && (rm.x1 - rm.x0) >= CELL) { bd = d; best = rm; }
    }
    // one boss per location; hard stages / restricted zones can field more at once
    const n = this.bossMax(), rooms = map.rooms.filter(rm => rm.id !== this.navRoom(p) && (rm.x1 - rm.x0) >= CELL && rm !== best);
    this.bosses = [];
    for (let i = 0; i < n; i++) {
      const rm = i === 0 ? best : U.pick(Math.random, rooms.length ? rooms : [best]);
      const b = this.spawnZombie('boss', rm, (rm.x0 + rm.x1) / 2 + (i ? U.rf(Math.random, -40, 40) : 0), true);
      // boss strength follows the location level: a first boss (Lv 6) is much softer than a late one
      b.hp *= Levels.bossHp(this.lv); b.maxHp = b.hp; b.dmg *= Levels.bossDmg(this.lv); b.dmgK = (b.dmgK || 1) * Levels.bossDmg(this.lv);
      this.bosses.push(b);
    }
    this.boss = this.bosses[0];
    toast(n > 1 ? `☠ ${ZOMBIES.boss.n} Lv ${this.lv} ปรากฏตัว ${n} ตัวพร้อมกัน!` : `☠ ${ZOMBIES.boss.n} Lv ${this.lv} ปรากฏตัวแล้ว!`, 'boss'); Snd.bossRoar();
    this.shake = 8;
  },

  // ---------- projectiles ----------
  updateProjectiles(dt) {
    const map = this.map;
    const crossWall = (o, nx) => {
      const rm = map.rooms[o.room];
      if (nx < rm.x0) { if (!this.door(o.f, rm.x0) || this.shutDoor(o.f, rm.x0)) return true; const nr = roomAt(map, o.f, nx); if (!nr) return true; o.room = nr.id; }
      else if (nx >= rm.x1) { if (!this.door(o.f, rm.x1) || this.shutDoor(o.f, rm.x1)) return true; const nr = roomAt(map, o.f, nx); if (!nr) return true; o.room = nr.id; }
      return false;
    };
    for (const b of this.bullets) {
      const steps = 4;
      for (let s = 0; s < steps && !b.dead; s++) {
        const nx = b.x + b.vx * dt / steps, ny = b.y + b.vy * dt / steps;
        b.dist += Math.hypot(b.vx, b.vy) * dt / steps;
        if (crossWall(b, nx)) { b.dead = true; this.spark(b.x, b.y); break; }
        b.x = nx; b.y = ny;
        const fy = floorY(b.f);
        if (b.y > fy || b.y < fy - FH + SLAB) { b.dead = true; this.spark(b.x, U.clamp(b.y, fy - FH + SLAB, fy)); break; }
        if (b.dist > b.range) { b.dead = true; break; }
        for (const z of this.zombies) {
          if (z.dead || b.hit.has(z)) continue;
          // no hits through floors or through a shut door: a zombie must be on the bullet's floor (or climbing into it)
          // and nothing closed between the bullet and it (zombies pressed against the far side of a door used to get hit)
          if (!z.climb && (z.f !== b.f || !this.clearLine(b.f, b.x, z.x))) continue;
          const zy = this.yOf(z), h = z.Z.r * (z.Z.boss ? 5.2 : 5.4);
          if (Math.abs(z.x - b.x) < z.rad + 2 && b.y < zy + 2 && b.y > zy - h) {
            b.hit.add(z);
            this.damageZombie(z, b.dmg, Math.sign(b.vx) * b.kb, b.crit);
            if (b.pierce-- <= 0) { b.dead = true; break; }
          }
        }
      }
    }
    this.bullets = this.bullets.filter(b => !b.dead);
    for (const n of this.nades) {
      n.t -= dt; n.rot += dt * 10 * Math.sign(n.vx || 1);
      n.vy += 900 * dt;
      const nx = n.x + n.vx * dt;
      if (crossWall(n, nx)) n.vx = -n.vx * 0.5; else n.x = nx;
      n.y += n.vy * dt;
      const fy = floorY(n.f);
      if (n.y > fy - 6) { n.y = fy - 6; n.vy = -Math.abs(n.vy) * 0.38; n.vx *= 0.6; }
      if (n.y < fy - FH + SLAB + 6) { n.y = fy - FH + SLAB + 6; n.vy = Math.abs(n.vy) * 0.5; }
      if (n.t <= 0) { n.dead = true; this.explode(n); }
    }
    this.nades = this.nades.filter(n => !n.dead);
    const p = this.p, py = this.yOf(p);
    for (const a of this.acid) {
      a.t -= dt; a.vy += 120 * dt;
      const nx = a.x + a.vx * dt;
      if (crossWall(a, nx)) { a.dead = true; continue; }
      a.x = nx; a.y += a.vy * dt;
      if (a.y > floorY(a.f) - 4 || a.t <= 0) { a.dead = true; this.blood(a.x, a.y, 5, '#9dff3c'); continue; }
      if (!p.hidden && Math.abs(a.x - p.x) < 16 && a.y > py - 80 && a.y < py) {
        a.dead = true; this.hurt(a.dmg); this.blood(a.x, a.y, 6, '#9dff3c');
        if (Math.random() < 0.25 * (p.mods.infRes ?? 1)) p.inf = Math.min(100, p.inf + 8);
      }
    }
    this.acid = this.acid.filter(a => !a.dead);
  },
  spark(x, y) { for (let i = 0; i < 5; i++) this.parts.push({ x, y, vx: U.rf(Math.random, -150, 150), vy: U.rf(Math.random, -150, 50), t: 0.25, c: '#ffd76a', s: 2, g: 300 }); },
  updateParticles(dt) {
    for (const q of this.parts) {
      q.t -= dt;
      if (q.g) { q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
      else if (q.smoke) { q.x += q.vx * dt; q.y += q.vy * dt; q.s += dt * 14; }
      if (q.casing) { q.rot += dt * 16 * Math.sign(q.vx || 1); if (q.y > q.floor) { q.y = q.floor; q.vy = -Math.abs(q.vy) * 0.35; q.vx *= 0.55; if (Math.abs(q.vy) < 30) { q.vy = 0; q.g = 0; q.vx = 0; } } }
    }
    this.parts = this.parts.filter(q => q.t > 0);
    for (const t of this.texts) { t.t -= dt; t.y -= 40 * dt; }
    this.texts = this.texts.filter(t => t.t > 0);
  },

  // ---------- searching & interaction ----------
  nearFurn(maxPad) {
    const p = this.p;
    if (p.climb) return null;
    let best = null, bd = 1e9;
    // own room first, but also look across the doorway on the same floor (bags can sit right at the edge)
    for (const rm of this.map.byFloor[p.f] || [this.map.rooms[p.room]]) {
      if (rm.id !== p.room && (p.x < rm.x0 - 80 || p.x > rm.x1 + 80)) continue;
      for (const fu of rm.furn) {
        if (fu.decor) continue;
        let d = Math.abs(fu.x - p.x) - fu.w / 2;
        if (rm.id !== p.room) d += 6;
        if (d >= (maxPad || 26)) continue;
        if (fu.kind === 'bag' && fu.items && fu.items.length) d -= 1000; // dropped loot always wins over furniture it lies in front of
        if (d < (maxPad || 26) && d < bd) { bd = d; best = fu; }
      }
    }
    return best;
  },
  updateSearch(dt) {
    const p = this.p;
    this.searching = null;
    if (p.searchLock > 0) { p.searchLock -= dt; return; }
    if (this.panel || p.climb || p.hidden) return;
    // searching is noisy, so it only starts when the player asks for it ([Q], or [E] when nothing else is there);
    // moving / attacking stops it (progress so far is kept)
    const fu = this.nearFurn(22);
    if (Input.hit('KeyQ') && fu && this.canSearch(fu)) p.searchOn = fu;
    if (!p.searchOn) return;
    if (p.searchOn !== fu || !this.canSearch(fu) || p.moving || Input.mouse.down || Input.keys['Space']) { p.searchOn = null; return; }
    fu.prog += dt / this.searchTime(fu); Snd.rummage();
    this.searching = fu;
    p.searchNoiseT = (p.searchNoiseT || 0) - dt;
    if (p.searchNoiseT <= 0) { p.searchNoiseT = 1.0; this.noise(p.x, this.yOf(p), 260, U.rf(Math.random, 0.6, 0.8)); }
    if (fu.prog >= 1) { this.completeSearch(fu); p.searchOn = null; }   // each pass (and each deeper pass) needs a new press
  },
  // applying a med: walking is allowed (half speed); running, attacking, climbing or getting hit cancels it
  updateMed(dt) {
    const j = this.medJob, p = this.p; if (!j) return;
    const cancel = p.climb || p.hidden || p.gait === 'run' || Input.mouse.down || Input.keys['Space'] || !Inv.count(p.backpack, j.id);
    if (cancel) { this.medJob = null; this.popText(p.x, this.yOf(p) - 110, 'ยกเลิกการรักษา', '#aaa'); return; }
    j.t += dt;
    if (j.t >= j.T) { this.medJob = null; this._applyMed = true; try { this.useItem(j.id); } finally { this._applyMed = false; } }
  },
  canSearch(fu) { return !!fu && !!fu.loot && !fu.searched && !fu.lock; },
  // each further pass through the same furniture takes longer (digging deeper)
  searchTime(fu) {
    const base = fu.kind === 'supply' ? 2.4 : fu.w > 100 ? 2.0 : 1.5;
    return base * (1 + 0.65 * (fu.sdone || 0)) * (this.p.mods.search || 1);
  },
  completeSearch(fu) {
    const first = !fu.sdone, smax = fu.smax || 1;
    fu.sdone = (fu.sdone || 0) + 1; fu.prog = 0;
    if (fu.sdone >= smax) { fu.searched = true; fu.prog = 1; }
    const deep = (fu.sdone >= 3 ? 1 : 0) + (first && fu.wasLocked ? fu.wasLocked : 0);
    const items = rollLoot(fu.loot, this.d, (this.p.mods.lootBonus || 0) + (fu.kind === 'supply' ? 2 : 0) + deep);
    if (fu.forced && first) items.push(...fu.forced);
    fu.items = fu.items || [];
    let got = 0;
    for (const it of items) {
      got++;
      if (it.id === 'cash') this.addCash(it.q, fu.x, this.yOf(this.p) - fu.h - 20);
      else Inv.addFree(fu.items, it);
    }
    if (first) { this.searchCount++; this.objDone('search'); if (fu.kind === 'supply') this.objDone('supply'); }
    if (fu.items.some(i => ITEMS[i.id].t === 'quest')) toast('พบของภารกิจ! อย่าลืมเก็บใส่เป้', 'good');
    const ty = this.yOf(this.p) - fu.h - 10;
    if (!got) { this.popText(fu.x, ty, fu.searched ? 'ว่างเปล่า' : 'ไม่เจออะไร...', '#aaa'); Snd.empty2(); } else Snd.found(fu.items.some(i => ITEMS[i.id].t === 'quest' || ITEMS[i.id].t === 'blueprint'));
    if (!fu.searched) this.popText(fu.x, ty - 22, `ค้นลึกได้อีก ${smax - fu.sdone} ครั้ง`, '#ffd76a');
    this.noise(fu.x, this.yOf(this.p), 90);
  },
  interact() {
    const p = this.p;
    const sv = this.survivor;
    if (sv && sv.state === 'hiding' && sv.room === p.room && !p.climb && Math.abs(sv.x - p.x) < 60) {
      sv.state = 'leaving'; sv.t = 0;
      this.rescued.push(sv.who);
      this.objDone('rescue'); Snd.rescue();
      toast(`ช่วย ${this.survivorName(sv.who)} แล้ว! จะไปรอที่ฐานถ้าคุณกลับไปอย่างปลอดภัย`, 'good');
      return;
    }
    const lt = this.lockTarget(), dr0 = this.doorNear();
    // standing at a door next to a locked cabinet/car: the closer one gets the E press
    const doorCloser = dr0 && lt && lt.fu && Math.abs(dr0.x - p.x) < Math.abs(lt.fu.x - p.x) - lt.fu.w / 2 + 4;
    if (lt && !doorCloser) { this.startPick(lt); return; }
    if (doorCloser) { this.toggleDoor(dr0); return; }
    const fu = this.nearFurn(30);
    if (fu && fu.kind === 'generator' && !this.powered) {
      if (Inv.count(p.backpack, 'fuse')) {
        Inv.remove(p.backpack, 'fuse', 1);
        this.powered = true; this.objDone('generator');
        for (const rm of this.map.rooms) rm.revealed = true;
        toast('ไฟกลับมาแล้ว! เห็นผังอาคารทั้งหมด', 'good');
        this.noise(fu.x, this.yOf(p), 700);
      } else toast('ต้องใช้ฟิวส์เครื่องปั่นไฟ — ลองค้นตามเฟอร์นิเจอร์');
      return;
    }
    // a door wins over a box/pile that is farther away, and over searching (searching also has its own key, Q)
    const dr = this.doorNear();
    if (fu && fu.items && fu.items.length && !(dr && Math.abs(dr.x - p.x) < Math.abs(fu.x - p.x))) { UIRun.openLoot(fu); return; }
    if (dr) { this.toggleDoor(dr); return; }
    if (fu && this.canSearch(fu) && this.nearFurn(22) === fu) { p.searchOn = fu; return; }
    // nothing to use here: E does nothing (the backpack has its own key, Tab)
  },
  takeAllNearby() {
    const lt = this.lockTarget();
    if (lt) { this.startForce(lt); return; }
    const fu = this.nearFurn(30);
    if (fu && fu.items && fu.items.length) { this.takeAll(fu); }
  },
  takeAll(fu) {
    const p = this.p;
    let full = false;
    for (let i = fu.items.length - 1; i >= 0; i--) {
      const e = fu.items[i];
      const left = Inv.addToPack(p.backpack, e, p.grid);
      if (left > 0) { e.q = left; full = true; } else fu.items.splice(i, 1);
    }
    if (full) toast('เป้เต็ม! ทิ้งของบางอย่างหรือเลือกเก็บเฉพาะที่จำเป็น', 'warn');
    else this.popText(p.x, this.yOf(p) - 100, 'เก็บของแล้ว', '#bfe');
    Snd.pickup();
  },
  dropItem(idx, qty) {
    const p = this.p, e = p.backpack[idx];
    if (!e) return;
    const q = Math.min(qty || e.q, e.q);
    const out = ITEMS[e.id].t === 'weapon' ? e : { id: e.id, q };
    if (ITEMS[e.id].t === 'weapon' || q >= e.q) p.backpack.splice(idx, 1); else e.q -= q;
    this.dropBag(p.x + p.facing * 10, p.f, p.room, [out]);
  },

  // ---------- barricades ----------
  barrDoor(f, x) { const d = this.doorAt.get(f + '|' + x); if (!d) return null; if (d.barr && d.barr.hp > 0) return d.barr; if (d.closed && !d.broken) return d; return d.lk || null; },
  lockDoor(f, x) { const d = this.doorAt.get(f + '|' + x); return d && d.lk ? d.lk : null; },
  barrBetween(f, x1, x2) {
    const a = Math.min(x1, x2), b = Math.max(x1, x2);
    for (const bb of this.barricades) if (bb.kind === 'door' && bb.f === f && bb.hp > 0 && bb.x > a && bb.x < b) return true;
    for (const lk of this.locks) if (lk.f === f && lk.x > a && lk.x < b) return true;
    return false;
  },
  barrNear(e) { for (const bb of this.barricades) if (bb.kind === 'door' && !bb.isDoor && bb.f === e.f && bb.hp > 0 && Math.abs(bb.x - e.x) < 22) return true; return false; },
  stillBlocks(z, bb) {
    const hop = this.hop[z.room]; if (!hop) return false;
    return bb.kind === 'door' ? hop.k === 'door' && Math.abs(hop.x - bb.x) < 1 : hop.lad === bb.lad;
  },
  barrSite() {
    const p = this.p; if (p.climb || p.hidden) return null;
    let best = null, bd = 1e9;
    for (const d of this.map.doors) { const dd = Math.abs(d.x - p.x); if (!d.lk && d.f === p.f && dd < 52 && dd < bd) { bd = dd; best = { kind: 'door', ref: d, x: d.x, f: d.f }; } }
    if (best && best.kind === 'door' && best.ref.barr) best = null; // legacy plank barricade on a door: nothing more to build
    for (const l of this.map.ladders) { const dd = Math.abs(l.x - p.x); if ((l.lo === p.f || l.lo + 1 === p.f) && dd < 34 && dd < bd) { bd = dd; best = { kind: 'hatch', ref: l, x: l.x, f: l.lo }; } }
    return best;
  },
  barrPlan(site) {
    if (site.kind === 'door') return this.doorPlan(site.ref);
    const b = site.ref.barr;
    if (!b) return { act: 'build', lvl: 1, cost: { plank: 2, nails: 2 }, time: 2.2, label: site.kind === 'door' ? 'ตอกไม้ปิดประตู' : 'ตอกไม้ปิดช่องบันได' };
    if (b.hp < b.max * 0.75) return { act: 'repair', cost: { plank: 1, nails: 1 }, time: 1.6, label: 'ซ่อมบาริเคด' };
    if (b.lvl === 1) return { act: 'up', lvl: 2, cost: { scrap: 3, nails: 2 }, time: 2.8, label: 'เสริมแผ่นเหล็ก (ระดับ 2)' };
    if (b.lvl === 2) return { act: 'up', lvl: 3, cost: { scrap: 4, plank: 2, nails: 3 }, time: 3.4, label: 'เสริมโครงเหล็ก (ระดับ 3)' };
    return null;
  },
  costText(cost) { const p = this.p; return Object.entries(cost).map(([id, q]) => `${ITEMS[id].n} ${Inv.count(p.backpack, id)}/${q}`).join(' · '); },
  canAfford(cost) { return Object.entries(cost).every(([id, q]) => Inv.count(this.p.backpack, id) >= q); },
  // returns true while the player is busy hammering
  updateBuild(dt, held) {
    const p = this.p;
    this.msgT -= dt;
    const site = this.barrSite(); this.site = site;
    if (!held || !site) { p.build = null; return false; }
    const plan = this.barrPlan(site);
    const say = (t) => { if (this.msgT <= 0) { this.msgT = 1.2; this.popText(p.x, this.yOf(p) - 120, t, '#ffb36a'); } };
    if (!plan) { say('แข็งแรงสูงสุดแล้ว'); p.build = null; return false; }
    if (!this.canAfford(plan.cost)) { say('วัสดุไม่พอ: ' + this.costText(plan.cost)); p.build = null; return false; }
    if (!p.build || p.build.ref !== site.ref) p.build = { ref: site.ref, t: 0 };
    p.build.max = plan.time * (G.roles.engineer ? 0.7 : 1) * (p.mods.build || 1);
    p.build.t += dt;
    this.buildNoiseT -= dt;
    if (this.buildNoiseT <= 0) { // hammering is loud
      this.buildNoiseT = 0.55; this.noise(site.x, this.yOf(p), 380); this.dangerPts += (0.15) * (this.noiseK || 1); Snd.hammer();
      for (let i = 0; i < 4; i++) this.parts.push({ x: site.x + U.rf(Math.random, -14, 14), y: this.yOf(p) - U.rf(Math.random, 30, 90), vx: U.rf(Math.random, -90, 90), vy: U.rf(Math.random, -160, -40), t: 0.4, c: '#c9a46a', s: 2.5, g: 600 });
    }
    if (p.build.t >= p.build.max) {
      for (const [id, q] of Object.entries(plan.cost)) Inv.remove(p.backpack, id, q);
      const HP = [0, 220, 480, 850];
      let b = site.ref.barr;
      if (site.kind === 'door') this.applyDoorPlan(site.ref, plan);
      else if (plan.act === 'build') { b = site.ref.barr = { kind: site.kind, x: site.x, f: site.f, lad: site.kind === 'hatch' ? site.ref : null, lvl: 1, hp: HP[1], max: HP[1], hitT: 0 }; this.barricades.push(b); }
      else if (plan.act === 'up') { b.lvl = plan.lvl; b.max = HP[b.lvl]; b.hp = b.max; }
      else b.hp = Math.min(b.max, b.hp + b.max * 0.5);
      this.popText(site.x, this.yOf(p) - 130, plan.act === 'repair' ? 'ซ่อมแล้ว' : plan.label + ' ✔', '#9dffb0');
      this.shake = Math.max(this.shake, 2); Snd.built();
      p.build = null;
    }
    return true;
  },
  hitBarricade(bb, z) {
    const mult = { walker: 1, runner: 0.7, brute: 3.2, spitter: 0.8, boss: 9 }[z.type] || 1;
    bb.hp -= 7 * mult * (1 + this.dc * 0.03); bb.hitT = 0.18; Snd.woodHit(bb.x, bb.kind === 'door' ? bb.f : bb.f + 1, bb.lvl > 1);
    const y = floorY(bb.kind === 'door' ? bb.f : bb.f + 1) - (bb.kind === 'door' ? 60 : 4);
    for (let i = 0; i < 3; i++) this.parts.push({ x: bb.x + U.rf(Math.random, -10, 10), y: y + U.rf(Math.random, -30, 30), vx: U.rf(Math.random, -120, 120), vy: U.rf(Math.random, -180, -40), t: 0.5, c: bb.lvl > 1 && Math.random() < 0.5 ? '#9aa2aa' : '#a07a48', s: 3, g: 700 });
    if (bb.hp <= 0 && bb.lock) { this.openLockDoor(bb, true); return; }
    if (bb.hp <= 0 && bb.isDoor) { this.breakDoor(bb); return; }
    if (bb.hp <= 0) {
      bb.hp = 0;
      if (bb.kind === 'door') this.doorAt.get(bb.f + '|' + bb.x).barr = null; else bb.lad.barr = null;
      this.barricades.splice(this.barricades.indexOf(bb), 1); Snd.woodBreak(bb.x, bb.f);
      for (let i = 0; i < 18; i++) this.parts.push({ x: bb.x + U.rf(Math.random, -20, 20), y: y + U.rf(Math.random, -50, 40), vx: U.rf(Math.random, -260, 260), vy: U.rf(Math.random, -300, -60), t: 0.8, c: '#a07a48', s: U.rf(Math.random, 3, 6), g: 800 });
      const p = this.p, near = Math.abs(p.x - bb.x) < 900 && Math.abs(p.f - bb.f) <= 1;
      this.popText(bb.x, y - 60, 'บาริเคดพัง!', '#ff5a4a');
      if (near) { toast('⚠ บาริเคดถูกพังแล้ว!', 'warn'); this.shake = Math.max(this.shake, 4); }
      this.noise(bb.x, y, 500);
    }
  },

  // ---------- locks: furniture + shop doors, lockpick minigame, forcing ----------
  assignLocks() {
    const r = Math.random, map = this.map;
    const LOCK = { safe: [1, 2, 3], locker: [0.5, 1, 1], weaponrack: [0.8, 2, 2], register: [0.4, 1, 1], medcab: [0.3, 1, 1], filecab: [0.3, 1, 1], car: [0.35, 1, 2] };
    for (const rm of map.rooms) for (const fu of rm.furn) {
      const c = LOCK[fu.kind]; if (!c || fu.decor || r() >= c[0]) continue;
      const tier = Math.min(3, U.ri(r, c[1], c[2]) + (this.d >= 15 && r() < 0.3 ? 1 : 0));
      fu.lock = { tier, hp: tier * 70 + (fu.kind === 'safe' ? 260 : 0) }; fu.lock.max = fu.lock.hp;
      // precision locks can't be pried open — lockpick only
      fu.lock.pickOnly = fu.kind === 'safe' || tier >= 3 || (fu.kind === 'weaponrack' && tier >= 2) || r() < 0.25;
      if (fu.forced) fu.lock.pickOnly = false;   // containers holding a required item can always be pried open
    }
    // interior doors come in four kinds:
    //   normal  - just a door, open/close with E
    //   broken  - an open gap: hide in the dark frame (H) or board it up (B)
    //   locked  - pick (E, lockpick) or pry open (F, loud)
    //   secure  - lockpick only
    // secure rooms lean towards locks; required objectives always stay reachable without a lockpick
    const SEC = { shop: 1, pharmacy: 1, clothing: 1, office: 1, electronics: 2, security: 2, lab: 2 };
    for (const d of map.doors) {
      const a = map.rooms[d.a], b = map.rooms[d.b];
      d.kindT = 'normal';
      if (a.outdoor && b.outdoor) continue;
      if (a.outdoor || b.outdoor || a.id === map.start || b.id === map.start) { if (r() < 0.15) d.kindT = 'broken'; continue; }
      const t = SEC[a.type] || SEC[b.type] || 0;
      const roll = r(), pLock = t ? 0.38 : 0.16, pSecure = t >= 2 ? 0.2 : t ? 0.1 : 0.05;
      if (roll < pSecure) d.kindT = 'secure';
      else if (roll < pSecure + pLock) d.kindT = 'locked';
      else if (roll < pSecure + pLock + 0.18) d.kindT = 'broken';
    }
    // keep required rooms (survivor, quest/fuse containers, generator) reachable without lockpicks
    const need = new Set();
    if (this.survivor) need.add(this.survivor.room);
    for (const rm of map.rooms) for (const fu of rm.furn) if ((fu.forced && !fu.keyHere) || fu === this.generator) need.add(rm.id);
    const reach = () => {
      const seen = new Set([map.start]), q = [map.start];
      while (q.length) {
        const id = q.shift();
        const nb = [...map.doors.filter(d => d.kindT !== 'secure' && (d.a === id || d.b === id)).map(d => d.a === id ? d.b : d.a),
                    ...(map.ladders || []).filter(l => l.a === id || l.b === id).map(l => l.a === id ? l.b : l.a)];
        for (const n of nb) if (!seen.has(n)) { seen.add(n); q.push(n); }
      }
      return seen;
    };
    for (let guard = 0; guard < 20; guard++) {
      const seen = reach(), miss = [...need].filter(id => !seen.has(id));
      if (!miss.length) break;
      const d = map.doors.find(d => d.kindT === 'secure' && (seen.has(d.a) !== seen.has(d.b)));
      if (!d) break;
      d.kindT = 'locked';
    }
    for (const d of map.doors) {
      if (d.kindT === 'broken') { d.startBroken = true; continue; }
      if (d.kindT !== 'locked' && d.kindT !== 'secure') continue;
      const t = SEC[map.rooms[d.a].type] || SEC[map.rooms[d.b].type] || 1;
      const lk = { kind: 'door', lock: true, x: d.x, f: d.f, tier: d.kindT === 'secure' ? Math.max(2, Math.min(3, t + 1)) : Math.min(2, t), hp: 260, max: 260, hitT: 0 };
      lk.pickOnly = d.kindT === 'secure';
      d.lk = lk; this.locks.push(lk);
    }
  },
  lockTarget() {
    const p = this.p; if (p.climb || p.hidden) return null;
    const fu = this.nearFurn(30); if (fu && fu.lock) return { fu, lock: fu.lock };
    for (const lk of this.locks) if (lk.f === p.f && Math.abs(lk.x - p.x) < 50) return { door: lk, lock: lk };
    return null;
  },
  // [E] lockpick: move the mouse to set the pick angle, hold click/Space to turn; find the sweet spot before time runs out
  startPick(t) {
    const p = this.p;
    if (!Inv.count(p.backpack, 'lockpick')) { this.popText(p.x, this.yOf(p) - 120, 'ไม่มีกิ๊บสะเดาะ — กด F เพื่องัดแทน (เสียงดัง)', '#ffb36a'); return; }
    const tier = t.lock.tier;
    if (t.lock.sweet == null) t.lock.sweet = U.rf(Math.random, 20, 160);
    this.pick = { ...t, mode: 'pick', tier, angle: 90, turn: 0, hp: 1, time: 0, limit: [0, 24, 17, 12][tier],
      width: [0, 16, 10, 6][tier] * (G.roles.scout ? 1.35 : 1), shake: 0, tickT: 0, startX: Input.mouse.x };
  },
  // [F] force: alternate A / D as fast as possible to pry the lock (loud)
  startForce(t) {
    const p = this.p, w = this.curWeapon(), it = w && ITEMS[w.id];
    if (t.lock.pickOnly) { this.popText(p.x, this.yOf(p) - 120, 'ล็อกนิรภัย งัดไม่ได้ — ต้องสะเดาะ (E) เท่านั้น', '#7fd0ff'); Snd.lockTick && Snd.lockTick(false); return; }
    const power = it ? (it.cls === 'melee' ? 6 + it.dmg * 0.12 : 7) : 4.5;
    const gain = power / t.lock.tier * (t.fu && t.fu.kind === 'safe' ? 0.45 : t.door ? 0.85 : 1);
    this.pick = { ...t, mode: 'force', tier: t.lock.tier, prog: 0, gain, next: null, flash: 0, shake: 0, time: 0 };
  },
  updatePick(dt, click) {
    const p = this.p, pk = this.pick, K = Input.keys;
    p.moving = false; p.vx = 0;
    pk.time += dt; pk.shake = Math.max(0, pk.shake - dt); pk.flash = Math.max(0, (pk.flash || 0) - dt);
    if (Input.hit('Escape') || Input.hit('KeyW') || Input.hit('KeyS')) { this.pick = null; return; }
    if (pk.mode === 'force') {
      for (const [code, side] of [['KeyA', 'L'], ['ArrowLeft', 'L'], ['KeyD', 'R'], ['ArrowRight', 'R']]) {
        if (!Input.hit(code)) continue;
        if (pk.next && side !== pk.next) { pk.shake = 0.12; continue; } // same key twice does nothing
        pk.next = side === 'L' ? 'R' : 'L'; pk.prog += pk.gain; pk.flash = 0.12; pk.shake = 0.1;
        this.noise(pk.door ? pk.door.x : pk.fu.x, this.yOf(p), 330); this.dangerPts += (0.04) * (this.noiseK || 1);
        Snd.woodHit(pk.door ? pk.door.x : pk.fu.x, p.f, !pk.door && pk.fu.kind !== 'crate');
      }
      pk.prog = Math.max(0, pk.prog - dt * 9);
      if (pk.prog >= 100) {
        this.pick = null;
        if (pk.fu) { pk.fu.wasLocked = Math.max(0, pk.tier - 1); pk.fu.lock = null; this.popText(pk.fu.x, this.yOf(p) - 120, 'งัดสำเร็จ!', '#9dffb0'); Snd.woodBreak(pk.fu.x, p.f); }
        else this.openLockDoor(pk.door, true);
      }
      return;
    }
    // lockpick
    const span = Math.min(R.W * 0.5, 420);
    pk.angle = U.clamp(90 + (Input.mouse.x - pk.startX) / span * 180, 0, 180);
    if (K['KeyA'] || K['ArrowLeft']) pk.angle = Math.max(0, pk.angle - 90 * dt), pk.startX -= 90 * dt / 180 * span;
    if (K['KeyD'] || K['ArrowRight']) pk.angle = Math.min(180, pk.angle + 90 * dt), pk.startX += 90 * dt / 180 * span;
    const sm = 1 - Math.exp(-dt * 16);
    pk.dAngle = pk.dAngle == null ? pk.angle : pk.dAngle + (pk.angle - pk.dAngle) * sm;
    const dist = Math.abs(pk.angle - pk.lock.sweet);
    const maxTurn = dist <= pk.width ? 1 : U.clamp(1 - (dist - pk.width) / 55, 0, 0.92);
    // a key / button still held from before the lock opened (attacking, the E that opened it) doesn't count: let go first
    const held = Input.mouse.down || K['Space'] || K['KeyE'];
    if (!held) pk.armed = true;
    const turning = held && pk.armed;
    if (turning) {
      pk.turn = Math.min(maxTurn, pk.turn + dt * 1.5);
      if (pk.turn >= 1) { this.finishPick(); return; }
      if (pk.turn >= maxTurn - 0.005) { // jammed: it shakes as a warning first, then the pick starts to bend if you keep forcing it
        pk.jamT = (pk.jamT || 0) + dt;
        if (pk.jamT > 0.35) pk.hp -= dt * (0.8 + pk.tier * 0.3);
        pk.shake = 0.08; pk.tickT -= dt;
        if (pk.tickT <= 0) { pk.tickT = 0.18; Snd.lockTick(false); }
        if (pk.hp <= 0) {
          Inv.remove(p.backpack, 'lockpick', 1); pk.hp = 1; pk.turn = 0; Snd.lockBreak();
          this.popText(p.x, this.yOf(p) - 120, 'กิ๊บหัก!', '#ff5a4a'); this.noise(p.x, this.yOf(p), 200);
          if (!Inv.count(p.backpack, 'lockpick')) { this.pick = null; toast('กิ๊บสะเดาะหมดแล้ว — กด F เพื่องัดแทน', 'warn'); return; }
        }
      } else { pk.jamT = 0; pk.tickT -= dt; if (pk.tickT <= 0) { pk.tickT = 0.12; Snd.lockTick(true); } }
      pk.jam = pk.turn >= maxTurn - 0.005 ? Math.min(1, (pk.jam || 0) + dt * 6) : Math.max(0, (pk.jam || 0) - dt * 4);
      pk.close = maxTurn;
    } else { pk.jamT = 0; pk.turn = Math.max(0, pk.turn - dt * 2.5); pk.jam = Math.max(0, (pk.jam || 0) - dt * 4); }
    pk.dTurn = pk.dTurn == null ? pk.turn : pk.dTurn + (pk.turn - pk.dTurn) * (1 - Math.exp(-dt * 20));
    if (pk.time >= pk.limit) { this.pick = null; pk.lock.sweet = null; this.popText(p.x, this.yOf(p) - 120, 'หมดเวลา! กลไกล็อกเปลี่ยนตำแหน่ง', '#ffb36a'); this.noise(p.x, this.yOf(p), 160); }
  },
  finishPick() {
    const pk = this.pick, p = this.p; this.pick = null; Snd.unlock();
    if (pk.fu) { pk.fu.wasLocked = pk.tier; pk.fu.lock = null; this.popText(pk.fu.x, this.yOf(p) - 120, 'ปลดล็อกแล้ว!', '#9dffb0'); }
    else this.openLockDoor(pk.door, false);
  },
  openLockDoor(lk, forced) {
    const d = this.doorAt.get(lk.f + '|' + lk.x); if (d) { d.lk = null; if (forced) { d.broken = true; d.hp = 0; } }
    const i = this.locks.indexOf(lk); if (i >= 0) this.locks.splice(i, 1);
    const y = floorY(lk.f) - 60;
    this.popText(lk.x, y - 70, forced ? 'ประตูพัง!' : 'ประตูเปิดแล้ว', forced ? '#ff8a5c' : '#9dffb0');
    if (forced) Snd.woodBreak(lk.x, lk.f);
    if (forced) for (let i = 0; i < 14; i++) this.parts.push({ x: lk.x + U.rf(Math.random, -16, 16), y: y + U.rf(Math.random, -50, 50), vx: U.rf(Math.random, -240, 240), vy: U.rf(Math.random, -280, -60), t: 0.8, c: '#7a5634', s: U.rf(Math.random, 3, 6), g: 800 });
    this.noise(lk.x, y, forced ? 500 : 120);
  },
  // melee swing that hit no zombie: force locks / smash wooden furniture into planks
  hitProps(s) {
    const p = this.p, py = this.yOf(p), reach = (s.range || 44) + 18, dmg = s.dmg || 8;
    for (const lk of this.locks) {
      if (lk.f !== p.f || (lk.x - p.x) * p.facing < -6 || Math.abs(lk.x - p.x) > reach) continue;
      lk.hitT = 0.18; this.popText(lk.x, py - 120, 'กด F เพื่องัดประตู', '#ffb36a'); return;
      lk.hp -= dmg * 0.8; this.noise(lk.x, py, 420); this.dangerPts += (0.2) * (this.noiseK || 1);
      for (let i = 0; i < 3; i++) this.parts.push({ x: lk.x, y: py - U.rf(Math.random, 30, 100), vx: -p.facing * U.rf(Math.random, 40, 160), vy: U.rf(Math.random, -160, -40), t: 0.45, c: '#8a6238', s: 3, g: 700 });
      if (lk.hp <= 0) this.openLockDoor(lk, true);
      return;
    }
    const rm = this.map.rooms[p.room];
    let best = null, bd = 1e9;
    for (const fu of rm.furn) {
      if (fu.decor || !(fu.lock || smashInfo(fu))) continue;
      const dx = (fu.x - p.x) * p.facing;
      if (dx < -fu.w / 2 - 6 || dx > reach + fu.w / 2) continue;
      if (Math.abs(dx) < bd) { bd = Math.abs(dx); best = fu; }
    }
    if (!best) return;
    best.hitT = 0.18;
    const fy = py - Math.min(best.h * 0.6, 70);
    const S = smashInfo(best);
    if (best.lock && !S) {
      this.popText(best.x, fy - 40, best.lock.pickOnly ? 'ล็อกนิรภัย — สะเดาะ (E) เท่านั้น' : 'แข็งเกินจะทุบ · F งัด · E สะเดาะ', best.lock.pickOnly ? '#7fd0ff' : '#ffb36a'); return;
      best.lock.hp -= dmg * (best.kind === 'safe' ? 0.35 : 1); this.noise(best.x, py, 450); this.dangerPts += (0.2) * (this.noiseK || 1);
      for (let i = 0; i < 4; i++) this.parts.push({ x: best.x - p.facing * best.w * 0.3, y: fy, vx: U.rf(Math.random, -150, 150), vy: U.rf(Math.random, -160, -20), t: 0.25, c: '#ffd76a', s: 2, g: 300 });
      if (best.lock.hp <= 0) { best.wasLocked = Math.max(0, best.lock.tier - 1); best.lock = null; this.popText(best.x, fy - 40, 'งัดสำเร็จ!', '#9dffb0'); }
      return;
    }
    if (best.lock && !best.warnSmash) { best.warnSmash = true; this.popText(best.x, fy - 60, 'ทุบพัง = ของข้างในเสียหาย · F งัด · E สะเดาะ', '#ffb36a'); }
    this.damageFurn(best, rm, dmg, fy);
    return true;
  },
  damageFurn(fu, rm, dmg, fy) {
    const S = smashInfo(fu); if (!S) return;
    const metal = S.mat === 'metal', r = Math.random, f = fu.f ?? rm.f;
    fy = fy ?? floorY(f) - Math.min(fu.h * 0.6, 70);
    fu.hitT = 0.18; fu.whp = (fu.whp ?? S.hp) - dmg * (metal ? 0.7 : 1); fu.whpMax = S.hp;
    this.noise(fu.x, floorY(f), metal ? 380 : 300); Snd.woodHit(fu.x, f, metal);
    const cols = metal ? ['#9aa0a6', '#6d737a', '#c9ced3'] : S.mat === 'soft' ? ['#8a5a5a', '#6a4a4a', '#c9b49a'] : ['#9a7244', '#7a5634', '#b08a5a'];
    for (let i = 0; i < 4; i++) this.parts.push({ x: fu.x + U.rf(r, -fu.w / 3, fu.w / 3), y: fy + U.rf(r, -20, 20), vx: U.rf(r, -160, 160), vy: U.rf(r, -220, -60), t: 0.6, c: U.pick(r, cols), s: U.rf(r, 2, 4), g: 800 });
    if (fu.whp <= 0) this.breakFurn(fu, rm);
  },
  breakFurn(fu, rm) {
    const S = smashInfo(fu), W = WOOD_FURN[fu.kind], r = Math.random, f = fu.f ?? rm.f, gy = floorY(f);
    // only the furniture's own material survives — anything that was still inside is destroyed
    const items = [];
    if (S.mat === 'wood') { items.push({ id: 'plank', q: W ? U.ri(r, W[0], W[1]) : U.ri(r, 1, 2) }); if (r() < 0.45) items.push({ id: 'nails', q: U.ri(r, 2, 5) }); }
    else if (S.mat === 'metal') items.push({ id: 'scrap', q: U.ri(r, 1, fu.kind === 'car' ? 5 : 3) });
    else items.push({ id: 'cloth', q: U.ri(r, 1, 2) });
    // a mission item (virus sample, fuse...) is never destroyed: it falls out with the debris
    if (fu.forced && fu.forced.length && !fu.sdone) { items.push(...fu.forced); fu.forced = null; }
    const lost = (fu.loot && !fu.searched && (!fu.smax || (fu.sdone || 0) < fu.smax)) || (fu.items && fu.items.length);
    if (this.searching === fu) this.searching = null;
    if (this.locks) this.locks = this.locks.filter(l => l.fu !== fu);
    rm.furn.splice(rm.furn.indexOf(fu), 1); Snd.woodBreak(fu.x, f);
    const cols = S.mat === 'metal' ? ['#9aa0a6', '#6d737a', '#c9ced3'] : S.mat === 'soft' ? ['#8a5a5a', '#6a4a4a', '#c9b49a'] : ['#9a7244', '#7a5634', '#b08a5a'];
    for (let i = 0; i < 16; i++) this.parts.push({ x: fu.x + U.rf(r, -fu.w / 2, fu.w / 2), y: gy - U.rf(r, 10, fu.h), vx: U.rf(r, -260, 260), vy: U.rf(r, -320, -80), t: 0.9, c: U.pick(r, cols), s: U.rf(r, 3, 6), g: 900 });
    this.shake = Math.max(this.shake, 3);
    const nm = { plank: 'ไม้กระดาน', scrap: 'เศษเหล็ก', cloth: 'ผ้า' }[items[0].id];
    this.popText(fu.x, gy - fu.h - 20, `แยกได้${nm} ×${items[0].q}`, '#ffd76a');
    if (lost) this.popText(fu.x, gy - fu.h - 44, 'ของข้างในพังเสียหายหมด!', '#ff6a5c');
    this.dropBag(fu.x, fu.f ?? rm.f, rm.id, items);
  },

  // ---------- end ----------
  die(reason) {
    if (this.over) return;
    this.over = true;
    G.stats.deaths++; Snd.death();
    G.backpack = [];
    G.weapons = this.p.weapons;
    G.chars[G.char].hp = Math.round(this.p.maxHp * 0.5);
    G.chars[G.char].inf = 0;
    this.finishCommon();
    UIRun.showResult(false, reason);
  },
  endRun() {
    if (this.over) return;
    this.over = true;
    const p = this.p;
    G.stats.extracts++; Snd.victory();
    if (G.layouts) delete G.layouts[this.layoutKey];   // survived: the next visit gets a new layout
    // quest items are delivered, not kept
    const learned = [];
    G.keys = G.keys || {};
    for (const e of p.backpack) if (ITEMS[e.id].t === 'key') {
      if (ITEMS[e.id].permKey) { const t = KeyGraph.open(e.id); if (t) learned.push('🔓 ปลดล็อก ' + (t.kind === 'stage' ? 'ด่าน ' + STAGE_BY_ID[t.stage].n : STAGE_BY_ID[t.stage].locs[t.li].n)); }
      else { G.keys[e.id] = (G.keys[e.id] || 0) + e.q; learned.push(ITEMS[e.id].n + ' (กุญแจ)'); }
    }
    for (const e of p.backpack) if (ITEMS[e.id].t === 'blueprint') { const w = ITEMS[e.id].bp; if (!G.blueprints.includes(w)) { G.blueprints.push(w); learned.push(ITEMS[w].n); } }
    this.learned = learned;
    G.backpack = p.backpack.filter(e => ITEMS[e.id].t !== 'quest' && ITEMS[e.id].t !== 'blueprint' && ITEMS[e.id].t !== 'key');
    G.weapons = p.weapons;
    G.bag = p.bag || G.bag; // a backpack swapped in the field comes home with you
    G.money += this.cash;
    G.chars[G.char].hp = Math.round(p.hp);
    G.chars[G.char].inf = Math.round(p.inf);
    // item objectives: must be in backpack
    for (const o of this.objectives) if (o.type === 'item' && !o.done && Inv.count(p.backpack, o.item)) { o.done = true; o.cur = 1; }
    const newSurv = [];
    for (const s of this.rescued) {
      G.stats.rescued++;
      if (s.kind === 'char') { State.unlockChar(s.id); newSurv.push(`${CHARACTERS[s.id].n} (ตัวละครเล่นได้ใหม่!)`); }
      else if (s.kind === 'role') { G.roles[s.id] = true; G.survivors.push({ name: ROLES[s.id].who, role: s.id }); newSurv.push(`${ROLES[s.id].who} — ${ROLES[s.id].n}`); }
      else { G.survivors.push({ name: s.id, role: null }); newSurv.push(`${s.id} (ผู้รอดชีวิตทั่วไป)`); }
    }
    let cleared = false, stageDone = false;
    if (!this.farm && this.allDone()) {
      const prog = State.stageProg(this.stage.id);
      if (!prog.cleared.includes(this.locIdx)) prog.cleared.push(this.locIdx);
      cleared = true;
      if (prog.cleared.length >= this.stage.locs.length) {
        stageDone = true;
        G.completed[this.stage.id] = true;
        const i = STAGES.indexOf(this.stage);
        if (STAGES[i + 1] && !KeyGraph.stageLocked(STAGES[i + 1].id)) G.unlocked[STAGES[i + 1].id] = true;
      }
    }
    this.finishCommon();
    UIRun.showResult(true, null, { cleared, stageDone, newSurv, items: G.backpack.length });
  },
  finishCommon() {
    this.active = false;
    G.day++;
    // daily base life (js/days.js): upkeep first — short supplies cancel the rest heal and halve income
    const rep = this.dayRep = Days.upkeep();
    const generic = G.survivors.filter(s => !s.role).length;
    this.income = Math.round(Days.income() * (rep.short ? 0.5 : 1));
    G.money += this.income;
    const cs = G.chars[G.char];
    if (!rep.short || Days.built('clinic')) cs.hp = Math.min(CHARACTERS[G.char].hp, cs.hp + Math.round(CHARACTERS[G.char].hp * Days.healPct()));
    State.restock();
    Days.event(rep);
    Days.afterDay(rep);
    const prevLvl = 1 + Math.floor(Math.min(90, Math.max(0, G.day - 2) * 1.5) / 45);
    if (Days.worldLevel() > prevLvl) rep.lines.push(`<span class="w">☠ โลกอันตรายขึ้น — ทุกด่านเริ่มที่ระดับอันตราย ${Days.worldLevel()}</span>`);
    State.save();
  },
};
