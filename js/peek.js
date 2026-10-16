// ---------- Peeking: standing near a door (or a ladder hole) lets you see into the room behind it ----------
// A closed door gives a dark glimpse (light under the door), an open one shows more; the room is fully lit only
// once you step in. Zombies inside are drawn too, so you can see who is waiting before you walk through.
const Peek = {
  NEAR: 120, LADDER: 60,
  DIM: { shut: 0.5, open: 0.18, hatch: 0.42 },   // extra darkness on top of the normal "other room" dimming
  // roomId -> extra darkness for unrevealed rooms you are close enough to peek into
  rooms(run) {
    const p = run.p, map = run.map, out = new Map();
    if (!p || p.climb && !p.climb.lad) return out;
    const here = run.navRoom(p);
    const add = (id, k) => { const rm = map.rooms[id]; if (!rm || rm.revealed || rm.outdoor) return; out.set(id, Math.min(out.has(id) ? out.get(id) : 1, k)); };
    for (const d of map.doors) {
      if (d.f !== p.f || Math.abs(d.x - p.x) > this.NEAR || (d.a !== here && d.b !== here)) continue;
      add(d.a === here ? d.b : d.a, d.lk || (d.closed && !d.broken) ? this.DIM.shut : this.DIM.open);
    }
    for (const l of map.ladders) if (Math.abs(l.x - p.x) < this.LADDER && (l.a === here || l.b === here)) add(l.a === here ? l.b : l.a, this.DIM.hatch);
    return out;
  },
};
(function () {
  const _frame = R.frame;
  R.frame = function (run, ...a) {
    if (!run || !run.map || !run.active) return _frame.call(this, run, ...a);
    const pk = Peek.rooms(run);
    // draw peeked rooms as if seen, then darken them; nothing is remembered as revealed
    for (const id of pk.keys()) run.map.rooms[id].revealed = true;
    this._peek = pk;
    try { return _frame.call(this, run, ...a); }
    finally { for (const id of pk.keys()) run.map.rooms[id].revealed = false; this._peek = null; }
  };
  // the extra darkness goes on right after the regular "dim the rooms you're not in" pass (doors are drawn over it)
  const _doors = R.drawDoors;
  R.drawDoors = function (run, ...a) {
    if (this._peek && this._peek.size) {
      const ctx = this.ctx;
      for (const [id, k] of this._peek) {
        const rm = run.map.rooms[id]; if (!this.inView(rm)) continue;
        const b = this.roomBox(rm);
        ctx.fillStyle = `rgba(3,4,7,${k})`; ctx.fillRect(b.bx0, b.by0, b.bx1 - b.bx0, b.by1 - b.by0);
      }
    }
    return _doors.call(this, run, ...a);
  };
  // the minimap shouldn't learn rooms you only glanced into
  const _mini = R.drawMinimap;
  if (_mini) R.drawMinimap = function (run, ...a) {
    const pk = this._peek; if (pk) for (const id of pk.keys()) run.map.rooms[id].revealed = false;
    try { return _mini.call(this, run, ...a); } finally { if (pk) for (const id of pk.keys()) run.map.rooms[id].revealed = true; }
  };
})();
