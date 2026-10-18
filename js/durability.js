// ---------- Weapon durability: weapons wear out with use, jam / weaken when worn, break at 0 ----------
// wear = durability % lost per hit (melee) or per shot (guns)
const WEAR = { knife: 0.8, bat: 1.2, machete: 0.7, fireaxe: 0.6, katana: 0.45, pistol: 0.18, revolver: 0.25, smg: 0.12, shotgun: 0.4, crossbow: 0.3, rifle: 0.15, sniper: 0.35 };
const dur = w => (w && w.dur != null ? w.dur : 100);
const durColor = d => d <= 0 ? '#ff4a3a' : d < 25 ? '#ff8a4a' : d < 55 ? '#ffd36a' : '#7fe08a';
// every repair lowers the ceiling: 1st repair → 100%, 2nd → 80%, 3rd → 60% … at 0% it can't be repaired any more
const durMax = w => (w && w.durMax != null ? w.durMax : 100);
const repairCap = w => Math.min(100, Math.round((100 - 20 * ((w && w.rep) || 0) + ((w && w.capFix) || 0)) * 10) / 10);   // capFix: ceiling a mechanic won back at base
// ---- restoring the ceiling at the base workshop: needs the right specialist, costs a lot, wins back only 0.5–3% a time ----
const CapRestore = {
  amount() { return Math.round(U.rf(Math.random, 0.5, 3) * 10) / 10; },
  // weapons need the weapons engineer; clothes / trousers / bags / armor need the tailor
  who(e) { return ITEMS[e.id].t === 'weapon' ? 'engineer' : 'tailor'; },
  can(e) { return !!(G.roles && G.roles[this.who(e)]); },
  cap(e) { return ITEMS[e.id].t === 'weapon' ? repairCap(e) : Wear.capOf(e); },
  cost(e) {
    const it = ITEMS[e.id], v = it.v || 100;
    if (it.t === 'weapon') return it.cls === 'melee' ? { cost: { scrap: 4, p_blade: 1 }, money: Math.round(250 + v * 0.18) } : { cost: { gunparts: 4, p_spring: 1 }, money: Math.round(250 + v * 0.18) };
    return it.t === 'armor' ? { cost: { cloth: 3, scrap: 3 }, money: Math.round(200 + v * 0.3) } : { cost: { cloth: 5, sewkit: 1 }, money: Math.round(180 + v * 0.3) };
  },
  // raise the ceiling; slot 'pack' = the worn bag (its stand-in entry writes back to G)
  apply(e, slot) {
    const amt = this.amount(), before = this.cap(e);
    if (ITEMS[e.id].t === 'weapon') { e.capFix = Math.round(((e.capFix || 0) + Math.min(amt, 100 - before)) * 10) / 10; }
    else { e.gmax = Math.min(100, Math.round(((e.gmax ?? 100) + amt) * 10) / 10); if (slot === 'pack') G.bagMax = e.gmax; }
    return { before, after: this.cap(e) };
  },
};
function applyRepair(w, amount) { // returns the new durability, or null if it can't be repaired
  const cap = repairCap(w); if (cap <= 0) return null;
  w.rep = (w.rep || 0) + 1; w.durMax = cap; w.jammed = false;
  w.dur = Math.min(cap, amount == null ? cap : dur(w) + amount);
  return w.dur;
}

Object.assign(Run, {
  wear(w, mult) {
    if (!w) return;
    const it = ITEMS[w.id], before = dur(w);
    const k = (WEAR[w.id] ?? (it.cls === 'melee' ? 0.8 : 0.2)) * (mult || 1) * (this.p.mods.engineer ? 0.75 : 1);
    w.dur = Math.max(0, before - k);
    if (before >= 25 && w.dur < 25) toast(`⚠ ${it.n} ใกล้พังแล้ว (${Math.ceil(w.dur)}%) — ใช้ชุดซ่อมหรือซ่อมที่ฐาน`, 'warn');
    if (before > 0 && w.dur <= 0) { toast(`💥 ${it.n} พังแล้ว! ใช้ไม่ได้จนกว่าจะซ่อม`, 'warn'); Snd.lockBreak && Snd.lockBreak(); this.popText(this.p.x, this.yOf(this.p) - 120, 'อาวุธพัง!', '#ff4a3a'); }
  },
  // worn guns can jam: returns true when this shot failed
  tryJam(w) {
    const d = dur(w);
    if (d >= 30) return false;
    if (Math.random() < (30 - d) / 30 * 0.25) {
      w.jammed = true; Snd.empty && Snd.empty();
      this.popText(this.p.x, this.yOf(this.p) - 100, 'ปืนติด! กด R เพื่อแก้', '#ffb36a');
      return true;
    }
    return false;
  },
  // field repair needs more than the base workbench: a repair kit + parts, 4s standing still, and it is noisy
  // spend one use of a repair kit; returns true when the entry ran out (caller removes it)
  useKitEntry(e) { const u = e.u ?? ITEMS[e.id].uses ?? 1; if (u > 1) { e.u = u - 1; return false; } e.q -= 1; delete e.u; return e.q <= 0; },
  useKitFrom(list, id = 'repairkit') { const e = list.find(x => x.id === id); if (e && this.useKitEntry(e)) list.splice(list.indexOf(e), 1); },
  fieldRepairCost(w) { const gun = ITEMS[w.id].cls !== 'melee'; return gun ? { repairkit: 1, gunparts: 1, scrap: 1 } : { repairkit: 1, scrap: 2 }; },
  startFieldRepair(w) {
    const p = this.p; w = w || this.curWeapon();
    if (!w) { this.popText(p.x, this.yOf(p) - 90, 'ไม่มีอาวุธในมือ', '#aaa'); return false; }
    const cap = repairCap(w);
    if (cap <= 0) { this.popText(p.x, this.yOf(p) - 90, `${ITEMS[w.id].n} ซ่อมไม่ได้แล้ว`, '#ff8a6a'); return false; }
    if (dur(w) >= cap) { this.popText(p.x, this.yOf(p) - 90, `ซ่อมได้สูงสุดแค่ ${cap}%`, '#aaa'); return false; }
    const cost = this.fieldRepairCost(w);
    const miss = Object.entries(cost).filter(([id, n]) => Inv.count(p.backpack, id) < n);
    if (miss.length) { this.popText(p.x, this.yOf(p) - 100, 'ซ่อมภาคสนามต้องใช้ ' + Object.entries(cost).map(([id, n]) => `${ITEMS[id].n} ${Inv.count(p.backpack, id)}/${n}`).join(' · '), '#ff8a5c'); return false; }
    this.repairJob = { w, cost, t: 0, T: 4 * (p.mods.engineer ? 0.6 : 1) };
    return true;
  },
  updateFieldRepair(dt) {
    const j = this.repairJob, p = this.p; if (!j) return;
    if (p.moving || p.climb || (!j.kind && this.curWeapon() !== j.w)) { this.repairJob = null; this.popText(p.x, this.yOf(p) - 100, 'ยกเลิกการซ่อม', '#aaa'); return; }
    j.t += dt;
    if (Math.floor(j.t * 2) !== Math.floor((j.t - dt) * 2)) { if (j.quiet) this.noise(p.x, this.yOf(p), 60, 0.2); else { Snd.hammer && Snd.hammer(); this.noise(p.x, this.yOf(p), 240, 0.5); } }
    if (j.t >= j.T) {
      this.repairJob = null;
      for (const [id, n] of Object.entries(j.cost)) { if (ITEMS[id].uses) for (let i = 0; i < n; i++) this.useKitFrom(p.backpack, id); else Inv.remove(p.backpack, id, n); }
      if (j.kind) j.finish(); else this.repairWith(null, j.w);
    }
  },
  repairWith(kitId, wIn) {
    const p = this.p, w = wIn || this.curWeapon();
    if (!w) { this.popText(p.x, this.yOf(p) - 90, 'ไม่มีอาวุธในมือ', '#aaa'); return false; }
    const cap = repairCap(w);
    if (cap <= 0) { this.popText(p.x, this.yOf(p) - 90, `${ITEMS[w.id].n} ซ่อมไม่ได้แล้ว (ซ่อมมาหลายครั้งเกินไป)`, '#ff8a6a'); return false; }
    if (dur(w) >= cap) { this.popText(p.x, this.yOf(p) - 90, `ซ่อมได้สูงสุดแค่ ${cap}% — ตอนนี้ ${Math.round(dur(w))}% แล้ว`, '#aaa'); return false; }
    applyRepair(w, 40 * (p.mods.engineer ? 1.5 : 1));
    Snd.hammer && Snd.hammer(); this.popText(p.x, this.yOf(p) - 100, `ซ่อม ${ITEMS[w.id].n} → ${Math.round(w.dur)}% (เพดานใหม่ ${w.durMax}%)`, '#9dffb0');
    return true;
  },
});

// base repair price for a weapon (cheaper with the weapons engineer at base)
function repairCost(w) {
  const cap = repairCap(w); if (cap <= 0) return { none: true };
  const miss = cap - dur(w); if (miss <= 0) return null;
  const it = ITEMS[w.id], f = G.roles && G.roles.engineer ? 0.6 : 1;
  return { cap, scrap: Math.max(1, Math.ceil(miss / 25 * (it.cls === 'melee' ? 1 : 1.5) * f)), money: Math.ceil(miss * (it.v || 100) * 0.004 * f) };
}
