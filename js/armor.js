// ---------- Body armor: worn in its own slot, soaks hits before HP ----------
// zombie hit -> armor points (ap) absorb the damage -> once ap is gone, damage goes to HP.
// While armor still has points, bites can't infect. Armor is worn (like held weapons) so it survives a death.
// Found in lockers / weapon caches / cars, and sold in the shop. Repaired at base (cloth + scrap + money) or with a repair kit.
Object.assign(ITEMS, {
  armor_jacket: { n: 'แจ็กเก็ตหนัง',    t: 'armor', icon: '🧥', sz: 4, st: 1, v: 180,  tier: 0, ap: 40,  slow: 0,    desc: 'กันรอยกัดได้นิดหน่อย เบา ไม่ถ่วงตัว' },
  armor_stab:   { n: 'เสื้อกันแทง',     t: 'armor', icon: '🦺', sz: 4, st: 1, v: 480,  tier: 1, ap: 80,  slow: 0,    desc: 'เสื้อกันแทงของ รปภ. รับการกัดได้หลายครั้ง' },
  armor_vest:   { n: 'เสื้อเกราะทหาร',  t: 'armor', icon: '🦺', sz: 4, st: 1, v: 1050, tier: 2, ap: 140, slow: 0.05, desc: 'แผ่นเกราะแข็ง หนักขึ้นเล็กน้อย (ช้าลง 5%)' },
  armor_riot:   { n: 'ชุดปราบจลาจล',    t: 'armor', icon: '🛡️', sz: 4, st: 1, v: 2100, tier: 3, ap: 220, slow: 0.12, desc: 'เกราะเต็มตัว ทนที่สุด แต่หนัก (ช้าลง 12%)' },
});
for (const id of ['armor_jacket', 'armor_stab', 'armor_vest', 'armor_riot']) { ITEMS[id].gw = 2; ITEMS[id].gh = 2; }
TYPE_LABEL.armor = 'ชุดเกราะ';
LOOT.locker.push(['armor_jacket', 4, 1, 1], ['armor_stab', 3, 1, 1], ['armor_vest', 1, 1, 1]);
LOOT.weapons.push(['armor_stab', 3, 1, 1], ['armor_vest', 3, 1, 1], ['armor_riot', 1, 1, 1]);
LOOT.wardrobe.push(['armor_jacket', 5, 1, 1]);
LOOT.car.push(['armor_jacket', 2, 1, 1]);
LOOT.supply.push(['armor_vest', 3, 1, 1], ['armor_riot', 1, 1, 1]);

const armorMax = id => (ITEMS[id] && ITEMS[id].ap) || 0;
const armorAP = e => e ? Math.max(0, e.ap ?? armorMax(e.id)) : 0;
// shown as % like weapon durability; any armor left shows at least 1% — only 0% lets bites through to HP
const armorPct = e => { const mx = e ? armorMax(e.id) : 0; return mx ? Math.ceil(armorAP(e) / mx * 100) : 0; };
// base repair price: cloth + scrap + money for the missing points
function armorRepairCost(e) {
  const miss = armorMax(e.id) - armorAP(e); if (miss <= 0) return null;
  const f = G.roles && G.roles.tailor ? 0.6 : 1;   // the tailor patches armor cheaper
  return { cloth: Math.max(1, Math.ceil(miss / 30 * f)), scrap: Math.max(1, Math.ceil(miss / 45 * f)), money: Math.ceil(miss * ITEMS[e.id].v * 0.003 * f) };
}

(function hookArmor() {
  const _start = Run.start;
  Run.start = function (...a) {
    const r = _start.apply(this, a);
    this.p.armor = G.armor ? JSON.parse(JSON.stringify(G.armor)) : null;
    this.p.baseSpd = this.p.baseSpd || this.p.spd;
    this.armorSpeed();
    return r;
  };
  Run.armorSpeed = function () { const p = this.p; p.spd = p.baseSpd * (1 - ((p.armor && ITEMS[p.armor.id].slow) || 0)); };
  const _hurt = Run.hurt;
  Run.hurt = function (dmg, silent) {
    const p = this.p; this.armorBlocked = false;
    if (!silent && p && p.armor && armorAP(p.armor) > 0 && dmg > 0) {
      const ap = armorAP(p.armor), take = Math.min(ap, dmg), pct0 = armorPct(p.armor);
      p.armor.ap = ap - take; dmg -= take; this.armorBlocked = true;
      this.popText(p.x + 14, this.yOf(p) - 70, `🛡 -${Math.max(1, pct0 - armorPct(p.armor))}%`, '#9fd2ff');
      if (p.armor.ap <= 0) { toast(`🛡 ${ITEMS[p.armor.id].n} พังแล้ว! ตอนนี้โดนกัดจะเสียเลือดและติดเชื้อได้`, 'warn'); Snd.woodBreak && Snd.woodBreak(p.x, p.f); }
      if (dmg <= 0) { // fully absorbed: still interrupts actions and shakes the screen, but no HP loss
        return _hurt.call(this, 0, false);
      }
    }
    return _hurt.call(this, dmg, silent);
  };
  // armor is worn, so it comes home with you whether you extract or die
  for (const k of ['die', 'endRun']) { const f = Run[k]; Run[k] = function (...a) { if (this.p && !this.over) G.armor = this.p.armor || null; return f.apply(this, a); }; }
})();
