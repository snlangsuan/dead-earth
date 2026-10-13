// ---------- Backpacks: swap the bag you wear; contents are NOT moved for you ----------
Object.assign(Run, {
  bagName(id) { const it = ITEMS[id || this.p.bag]; return it ? it.n : 'เป้'; },
  // equip a backpack item taken from `list` (backpack, a container's items, ...)
  equipBag(entry, list) {
    const p = this.p, newId = entry.id;
    if (list) { const i = list.indexOf(entry); if (i >= 0) { if (entry.q > 1) entry.q--; else list.splice(i, 1); } }
    const oldId = p.bag || G.bag || 'pack_day';
    // the old bag (with everything still inside) goes on the floor as its own container
    const old = { kind: 'bag', x: p.x - p.facing * 18, w: 40, h: 26, loot: null, room: p.room, searched: true, prog: 1,
      items: [...p.backpack.map(e => { const c = { ...e }; delete c.gx; delete c.gy; delete c.rot; return c; }), { id: oldId, q: 1 }], id: 'ob' + Math.random(), oldBag: true };
    const rm = roomAt(this.map, p.f, old.x) || this.map.rooms[p.room];
    old.x = U.clamp(old.x, rm.x0 + WALL / 2 + 22, rm.x1 - WALL / 2 - 22); old.room = rm.id;
    rm.furn.push(old);
    p.backpack = []; p.bag = newId;
    p.grid = State.gridFor(newId); p.cap = p.grid.c * p.grid.r;
    Snd.pickup && Snd.pickup();
    toast(`สวม${ITEMS[newId].n}แล้ว (${p.grid.c}×${p.grid.r}) — เป้เก่าพร้อมของข้างในวางอยู่ที่พื้น ย้ายของเองได้เลย`, 'good');
    return old;
  },
  // ground bags vanish once emptied (unless the player is looking into one right now)
  cleanBags() {
    for (const rm of this.map.rooms) {
      if (!rm.furn.some(f => f.kind === 'bag' && (!f.items || !f.items.length))) continue;
      rm.furn = rm.furn.filter(f => !(f.kind === 'bag' && (!f.items || !f.items.length) && !(typeof UIRun !== 'undefined' && UIRun.loot === f)));
    }
  },
});
