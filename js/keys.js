// ---------- Key graph: locked locations / gated stages, opened by key items found elsewhere ----------
// Each target (a location or a whole stage) needs one key. The key comes from a SOURCE location that can be
// in an earlier stage or another location of the same stage — beat its boss, or finish an optional mission there.
// Players may always extract without it; the source can be replayed later to get the key.
const KeyGraph = {
  targets: [],          // { id, kind: 'loc'|'stage', stage, li?, src: { stage, li, method: 'boss'|'mission' } }
  byKey: {},
  build() {
    const r = U.rng(0x5eed1234), T = [];
    const lockedLoc = new Set();
    for (const st of STAGES) {
      if (st.gi >= 3 && st.gi % 4 === 3) T.push({ kind: 'stage', stage: st.id });
      if (st.gi >= 1 && st.locs.length >= 3 && r() < 0.5) { const li = U.ri(r, 0, st.locs.length - 1); lockedLoc.add(st.id + '#' + li); T.push({ kind: 'loc', stage: st.id, li }); }
    }
    const usedSrc = new Set();
    T.forEach((t, k) => {
      const tg = STAGE_BY_ID[t.stage].gi, cands = [];
      for (const st of STAGES) {
        const same = st.id === t.stage;
        if (!(same && t.kind === 'loc') && !(st.gi < tg && st.gi >= tg - 3)) continue;
        st.locs.forEach((_, li) => { const id = st.id + '#' + li; if (!lockedLoc.has(id) && !usedSrc.has(id) && !(same && li === t.li)) cands.push({ stage: st.id, li }); });
      }
      if (!cands.length) return;
      const s = U.pick(r, cands); usedSrc.add(s.stage + '#' + s.li);
      t.src = { ...s, method: r() < 0.6 ? 'boss' : 'mission' };
      t.id = 'k_' + k;
      const st = STAGE_BY_ID[t.stage];
      const name = t.kind === 'stage' ? `บัตรผ่านเข้า${st.n}` : `คีย์การ์ด ${st.locs[t.li].n}`;
      ITEMS[t.id] = { n: name, t: 'key', icon: t.kind === 'stage' ? '🎫' : '🔑', sz: 1, gw: 1, gh: 1, st: 1, v: 0, tier: null, permKey: true,
        desc: `พากลับฐานให้รอดเพื่อปลดล็อก${t.kind === 'stage' ? 'ด่าน ' + st.n : ' location "' + st.locs[t.li].n + '" (' + st.n + ')'} ถาวร` };
      this.targets.push(t); this.byKey[t.id] = t;
    });
  },
  opened(t) { return !!(G.opened && G.opened[t.id]); },
  locTarget(stageId, li) { return this.targets.find(t => t.kind === 'loc' && t.stage === stageId && t.li === li); },
  stageTarget(stageId) { return this.targets.find(t => t.kind === 'stage' && t.stage === stageId); },
  locLocked(stageId, li) { const t = this.locTarget(stageId, li); return !!t && !this.opened(t); },
  stageLocked(stageId) { const t = this.stageTarget(stageId); return !!t && !this.opened(t); },
  sourcesAt(stageId, li) { return this.targets.filter(t => t.src.stage === stageId && t.src.li === li && !this.opened(t)); },
  where(t) {
    const st = STAGE_BY_ID[t.src.stage];
    return `${t.src.method === 'boss' ? 'ฆ่าบอสที่' : 'ทำภารกิจที่'} ${st.locs[t.src.li].n} (${st.n})`;
  },
  // call after a key is brought home
  open(id) {
    const t = this.byKey[id]; if (!t) return null;
    G.opened = G.opened || {}; G.opened[id] = true;
    if (t.kind === 'stage') { const i = STAGES.findIndex(s => s.id === t.stage); if (i === 0 || G.completed[STAGES[i - 1].id]) G.unlocked[t.stage] = true; }
    return t;
  },
};
KeyGraph.build();

Object.assign(Run, {
  // optional key objectives for this location (boss / mission); works on replays too
  setupKeyObjectives() {
    if (this.restricted) return;
    const map = this.map, rr = U.rng(map.seed ^ 0x77aa11);
    for (const t of KeyGraph.sourcesAt(this.stage.id, this.locIdx)) {
      if (Inv.count(this.p.backpack, t.id)) continue;
      const tn = ITEMS[t.id].n;
      if (t.src.method === 'boss') { this.objectives.push({ type: 'keyboss', key: t.id, optional: true, cur: 0, target: 1, label: `(ไม่บังคับ) ฆ่าบอส → ได้ ${tn}` }); continue; }
      // mission: the key sits in a far, preferably locked container
      const far = map.rooms.filter(rm => !rm.outdoor && map.dist[rm.id] >= 2);
      const pool = (far.length ? far : map.rooms.filter(rm => !rm.outdoor)).flatMap(rm => rm.furn.filter(f => f.loot && !f.decor && f.kind !== 'supply'));
      const lockedOnes = pool.filter(f => f.lock);
      let fu = lockedOnes.length ? U.pick(rr, lockedOnes) : pool.length ? U.pick(rr, pool) : null;
      if (!fu) { const rm = U.pick(rr, far.length ? far : map.rooms); fu = rm.place && rm.place('crate', 30); }
      if (!fu) continue;
      fu.forced = (fu.forced || []).concat([{ id: t.id, q: 1 }]);
      fu.keyHere = true;
      this.objectives.push({ type: 'keyitem', key: t.id, optional: true, cur: 0, target: 1, label: `(ไม่บังคับ) หา ${tn}${fu.lock ? ' (ในตู้ที่ล็อก)' : ''}` });
    }
  },
  checkKeyPickup() {
    for (const o of this.objectives) if ((o.type === 'keyitem' || o.type === 'keyboss') && !o.done && Inv.count(this.p.backpack, o.key)) {
      o.done = true; o.cur = 1; Snd.objective(); toast(`🔑 ได้ ${ITEMS[o.key].n}! พากลับฐานให้รอดเพื่อปลดล็อก`, 'good');
    }
  },
  dropSourceKeys(z) {
    const ids = this.objectives.filter(o => o.type === 'keyboss' && !o.done).map(o => o.key);
    if (ids.length) { this.dropBag(z.x, z.f, z.room, ids.map(id => ({ id, q: 1 }))); toast('🔑 บอสทิ้งคีย์ไว้! อย่าลืมเก็บ', 'good'); }
    return ids.length > 0;
  },
});
