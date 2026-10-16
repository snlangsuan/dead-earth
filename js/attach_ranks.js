// ---------- Gun attachments: families that fit specific guns, each in 3 ranks ----------
// A part only fits the guns in its `fits` list (e.g. the 9mm suppressor goes on the pistol and SMG,
// the rifle suppressor on the assault rifle and sniper). Rank is part of the id: scope, scope_2, scope_3,
// shown by background colour. Higher ranks are found deeper in, or upgraded at base (right-click → อัปเกรด).
// fx: effect numbers per rank (index = rank)
const ATT_DEF = {
  // optics
  reddot:     { n: 'กล้องจุดแดง', slot: 'scope', v: 380, tier: 1, fits: ['pistol', 'revolver', 'smg', 'shotgun', 'crossbow'],
                fx: { spread: [1, 0.72, 0.62, 0.52], range: [1, 1.1, 1.17, 1.25] } },
  scope:      { slot: 'scope', fits: ['rifle', 'sniper', 'crossbow', 'smg'], fx: { spread: [1, 0.6, 0.48, 0.38], range: [1, 1.3, 1.45, 1.6] } },
  // magazines (by ammo)
  extmag:     { n: 'แม็กขยาย 9มม.', slot: 'mag', fits: ['pistol', 'smg'], fx: { mag: [1, 1.5, 1.75, 2.0] } },
  extmag_r:   { n: 'แม็กขยายไรเฟิล', slot: 'mag', v: 600, tier: 2, fits: ['rifle'], fx: { mag: [1, 1.5, 1.75, 2.0] } },
  extmag_sg:  { n: 'ท่อกระสุนลูกซองเสริม', slot: 'mag', v: 480, tier: 2, fits: ['shotgun'], fx: { mag: [1, 1.5, 1.75, 2.0] } },
  // suppressors (by calibre)
  silencer:   { n: 'ท่อเก็บเสียง 9มม.', slot: 'muzzle', fits: ['pistol', 'smg'], fx: { noise: [1, 0.25, 0.17, 0.1], dmg: [1, 0.95, 0.98, 1.0] } },
  silencer_r: { n: 'ท่อเก็บเสียงไรเฟิล', slot: 'muzzle', v: 900, tier: null, fits: ['rifle', 'sniper'], fx: { noise: [1, 0.3, 0.2, 0.12], dmg: [1, 0.95, 0.98, 1.0] } },
  // grips
  grip:       { n: 'กริปหน้า', slot: 'grip', fits: ['smg', 'rifle', 'shotgun', 'sniper', 'crossbow'], fx: { spread: [1, 0.75, 0.65, 0.55], reload: [1, 0.85, 0.77, 0.68] } },
  grip_p:     { n: 'ด้ามจับยางกันลื่น', slot: 'grip', v: 300, tier: 1, fits: ['pistol', 'revolver'], fx: { spread: [1, 0.8, 0.7, 0.6], reload: [1, 0.88, 0.8, 0.72] } },
};
const ATT_BASE = Object.keys(ATT_DEF);
const RANK_NAME = ['', 'Mk I', 'Mk II', 'Mk III'];
const pctTxt = (k, inv) => `${inv ? '-' : '+'}${Math.round(Math.abs(inv ? 1 - k : k - 1) * 100)}%`;
function attDesc(slot, f, rk) {
  if (slot === 'scope') return `ความแม่น +${Math.round((1 - f.spread[rk]) * 100)}% · ระยะ ${pctTxt(f.range[rk])}`;
  if (slot === 'grip') return `ลดการกระจาย ${Math.round((1 - f.spread[rk]) * 100)}% · รีโหลดเร็วขึ้น ${Math.round((1 - f.reload[rk]) * 100)}%`;
  if (slot === 'mag') return `ความจุแม็ก ${pctTxt(f.mag[rk])}`;
  return `เสียงปืน ${pctTxt(f.noise[rk], 1)}` + (f.dmg[rk] < 1 ? ` · ดาเมจ ${pctTxt(f.dmg[rk], 1)}` : ' · ไม่เสียดาเมจ');
}
for (const b of ATT_BASE) {
  const d = ATT_DEF[b], old = ITEMS[b];
  const it = ITEMS[b] = Object.assign({ t: 'attach', icon: '', sz: 1, st: 1, gw: 1, gh: 1 }, old || {}, { n: d.n || (old && old.n), slot: d.slot, fits: d.fits, fx: d.fx, rank: 1, base: b });
  if (d.v) it.v = d.v; if ('tier' in d) it.tier = d.tier;
  if (!old) it.artAlt = { scope: 'scope', mag: 'extmag', muzzle: 'silencer', grip: 'grip' }[d.slot];   // until its own picture exists
  it.desc = attDesc(d.slot, d.fx, 1);
  for (const rk of [2, 3]) {
    ITEMS[`${b}_${rk}`] = { ...it, rank: rk, art: b, v: Math.round(it.v * (rk === 2 ? 2.2 : 4.5)), tier: rk === 2 && it.tier != null ? 3 : null, desc: attDesc(d.slot, d.fx, rk) };
  }
}
LOOT.locker.push(['reddot', 2, 1, 1], ['grip_p', 2.5, 1, 1]);
LOOT.weapons.push(['reddot', 2, 1, 1], ['extmag_r', 2, 1, 1], ['extmag_sg', 1.5, 1, 1], ['grip_p', 1.5, 1, 1], ['silencer_r', 0.6, 1, 1],
  ['scope_2', 1, 1, 1], ['grip_2', 1.5, 1, 1], ['extmag_2', 1.5, 1, 1], ['silencer_2', 0.8, 1, 1], ['reddot_2', 1, 1, 1], ['extmag_r_2', 1, 1, 1]);
LOOT.supply.push(['extmag_r', 2, 1, 1], ['scope_2', 1.5, 1, 1], ['extmag_2', 2, 1, 1], ['extmag_r_2', 1.2, 1, 1], ['grip_3', 0.6, 1, 1], ['extmag_3', 0.6, 1, 1],
  ['extmag_r_3', 0.4, 1, 1], ['scope_3', 0.4, 1, 1], ['silencer_3', 0.3, 1, 1], ['silencer_r_2', 0.6, 1, 1]);
LOOT.safe.push(['scope_3', 0.8, 1, 1], ['silencer_2', 1.2, 1, 1], ['silencer_3', 0.5, 1, 1], ['silencer_r', 1, 1, 1], ['silencer_r_3', 0.4, 1, 1]);
const attFx = id => ITEMS[id] && ITEMS[id].fx;
const attFits = (id, w) => { const it = ITEMS[id]; return !!it && (!it.fits || it.fits.includes(w.id)); };

const attRank = id => (id && ITEMS[id] && ITEMS[id].rank) || 0;
const attNext = id => { const it = ITEMS[id]; return it && it.rank < 3 ? `${it.base}_${it.rank + 1}` : null; };
// upgrading Mk I → II → III at base
function attUpgradeCost(id) {
  const rk = attRank(id); if (!rk || rk >= 3) return null;
  return rk === 1 ? { cost: { gunparts: 3, elec: 1 }, money: 300 } : { cost: { gunparts: 6, elec: 2, scrap: 2 }, money: 900 };
}

// ---- drag an attachment onto a gun to fit it; right-click the gun → ถอด… to take it back off ----
// putBack(entry): where removed/replaced pieces (and bullets that no longer fit the magazine) go.
function attMagCap(w) { const a = w.att || {}, f = a.mag && attFx(a.mag); return Math.round(ITEMS[w.id].mag * (f ? f.mag[attRank(a.mag)] : 1)); }
function attTrimMag(w, putBack) {
  const cap = attMagCap(w), it = ITEMS[w.id];
  if (w.mag > cap) { const extra = w.mag - cap; w.mag = cap; if (it.ammo) putBack({ id: it.ammo, q: extra }); }
}
function attInstall(w, src, putBack) {
  const e = src.entry, a = ITEMS[e.id], wi = ITEMS[w.id];
  if (!attSlotsFor(w).includes(a.slot) || !attFits(e.id, w)) return false;   // no slot for it, or it's made for another gun
  const old = w.att && w.att[a.slot];
  if (old === e.id) return true;
  GridUI.removeFromSource(src);
  w.att = w.att || {}; w.att[a.slot] = e.id;
  if (old) putBack({ id: old, q: 1 });
  attTrimMag(w, putBack);
  Snd.reload && Snd.reload(); toast(`ติด ${a.n} ที่ ${wi.n}` + (old ? ` (ถอด ${ITEMS[old].n} ออก)` : ''), 'good');
  return true;
}
function attRemoveActs(w, putBack, after) {
  return Object.entries(w.att || {}).filter(([, id]) => id).map(([sl, id]) => [`ถอด ${ITEMS[id].n}`, () => {
    delete w.att[sl]; putBack({ id, q: 1 }); attTrimMag(w, putBack); toast(`ถอด ${ITEMS[id].n} แล้ว`); after && after();
  }]);
}

// ---- which attachment slots each gun has (melee: none) ----
const WPN_ATT_SLOTS = {
  pistol: ['scope', 'mag', 'muzzle', 'grip'], revolver: ['scope', 'grip'], shotgun: ['scope', 'mag', 'grip'], crossbow: ['scope', 'grip'],
  smg: ['scope', 'mag', 'muzzle', 'grip'], rifle: ['scope', 'mag', 'muzzle', 'grip'], sniper: ['scope', 'muzzle', 'grip'],
};
function attSlotsFor(w) {
  const it = ITEMS[w.id]; if (!it || it.cls === 'melee') return [];
  const base = WPN_ATT_SLOTS[w.id] || ['scope', 'mag', 'muzzle', 'grip'];
  return [...base, ...Object.keys(w.att || {}).filter(s => w.att[s] && !base.includes(s))];   // keep showing an old fitting in a slot this gun no longer has
}
// the row of attachment slots shown under a gun card: drop a part on its slot, drag it out (or right-click) to take it off
function attSlotsEl(w, putBack, after) {
  const box = U.el('div', { class: 'attslots' });
  for (const sl of attSlotsFor(w)) {
    const id = w.att && w.att[sl];
    const el = U.el('div', { class: 'attslot' + (id ? ' on rk' + attRank(id) : ''), title: id ? `${ITEMS[id].n} — ${ITEMS[id].desc}` : '' });
    el.innerHTML = id ? Art.icon(id) : '';
    el.addEventListener('pointerdown', ev => ev.stopPropagation());   // don't start dragging the gun itself
    if (id) {
      const takeOff = () => { delete w.att[sl]; attTrimMag(w, putBack); };
      GridUI.makeDraggable(el, { from: 'slot', entry: { id, q: 1 }, remove: takeOff });
      el.addEventListener('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); if (GridUI.drag) return;
        GridUI.ctxMenu(ev, ITEMS[id].n, [['ข้อมูล', () => GridUI.showInfo({ id, q: 1 })], ['ถอด', () => { takeOff(); putBack({ id, q: 1 }); toast(`ถอด ${ITEMS[id].n} แล้ว`); after && after(); }, 'danger']]); });
    }
    GridUI.zone(el, src => {
      const e = src.entry, it = ITEMS[e.id];
      if (it.t !== 'attach' || it.slot !== sl || !attFits(e.id, w)) return false;   // wrong part: it just doesn't go in
      if (e.id === id) return true;
      return attInstall(w, src, putBack);
    });
    box.appendChild(el);
  }
  return box;
}

// tiny pictures of what's fitted on a gun (backpack grid / stash card), coloured by rank
function attMini(w) {
  const ids = Object.values(w.att || {}).filter(Boolean);
  return ids.length ? `<span class="attmini">${ids.map(id => `<i class="rk${attRank(id)}">${Art.icon(id)}</i>`).join('')}</span>` : '';
}
