// ---------- Mission items are marked: the box that holds a virus sample / data drive / radio parts / fuse ----------
// Once you have seen the room (or are peeking into it), a pulsing icon of the item floats over the furniture
// until you search it, so "find X and bring it home" never turns into opening every drawer in the building.
(function () {
  // picking the item up: say so once (the objective line turns yellow until you extract with it)
  const _upd = Run.update;
  Run.update = function (dt, ...a) {
    const r = _upd.call(this, dt, ...a);
    if (this.active && this.objectives && (this._qT = (this._qT || 0) - dt) <= 0) {
      this._qT = 0.5;
      for (const o of this.objectives) {
        // mission items and keys count as done while you carry them (lose it and it un-ticks); the run still has to end alive
        if (o.type !== 'item' && o.type !== 'keyitem' && o.type !== 'keyboss') continue;
        const have = Inv.count(this.p.backpack, o.item || o.key) > 0;
        if (have && !o.done) { o.done = true; o.cur = 1; Snd.objective && Snd.objective(); if (o.type === 'item') toast(`ได้${ITEMS[o.item].n}แล้ว! นำไปที่จุดอพยพเพื่อกลับฐาน`, 'good'); this.checkAllDone(); }
        else if (!have && o.done) { o.done = false; o.cur = 0; }
      }
    }
    return r;
  };
  const _wui = R.drawWorldUI;
  R.drawWorldUI = function (run, ...a) {
    const r = _wui.call(this, run, ...a);
    if (!run.map) return r;
    const ctx = this.ctx;
    for (const rm of run.map.rooms) {
      if (!rm.revealed || !this.inView(rm)) continue;
      for (const fu of rm.furn) {
        if (!fu.forced || !fu.forced.length || fu.sdone) continue;
        const id = fu.forced[0].id, ic = Art.iconArt(id); if (!ic) continue;
        const f = fu.f ?? rm.f, bob = Math.sin(run.time * 3 + fu.x) * 4, x = fu.x, y = floorY(f) - (fu.h || 60) - 46 + bob;
        ctx.save();
        ctx.globalAlpha = 0.55 + 0.35 * Math.sin(run.time * 4);
        ctx.fillStyle = '#f2b01e'; ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(14,16,20,.92)'; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
        Art.draw(ctx, ic, x - 12, y - 12, 24, 24);
        ctx.fillStyle = '#f2b01e'; ctx.beginPath(); ctx.moveTo(x - 6, y + 17); ctx.lineTo(x + 6, y + 17); ctx.lineTo(x, y + 25); ctx.fill();
        ctx.restore();
      }
    }
    return r;
  };
})();
