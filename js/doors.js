// ---------- Doors: open / close with E, reinforce with B, zombies bash closed doors ----------
// A closed door acts as a barricade (it lives in Run.barricades while shut), so the existing zombie
// blocking / bashing logic applies. Broken doors stay open until a new one is fitted.
const DOOR_HP = [140, 320, 600, 950];

Object.assign(Snd, {
  doorOpen(x, f) { if (!this.gate('door', 0.12)) return; const s = this.spatial(x, f), t = this.ctx.currentTime, o = this.out(0.45 * s.vol + 0.05, s.pan, 0.25); this.noise(o, t, 0.35, 900, 500, 4, 'bandpass', 0.35); this.tone(o, t + 0.02, 0.28, 520, 760, 'sawtooth', 0.04); },
  doorClose(x, f) { if (!this.gate('door', 0.12)) return; const s = this.spatial(x, f), t = this.ctx.currentTime, o = this.out(0.6 * s.vol + 0.08, s.pan, 0.3); this.tone(o, t, 0.18, 120, 70, 'sine', 0.9); this.noise(o, t, 0.1, 1400, 400, 1.5, 'bandpass', 0.7); this.tone(o, t + 0.03, 0.05, 2200, 2000, 'square', 0.05); },
});

Object.assign(Run, {
  initDoors() {
    const map = this.map, r = Math.random;
    for (const d of map.doors) {
      Object.assign(d, { kind: 'door', isDoor: true, lvl: 0, max: DOOR_HP[0], hp: DOOR_HP[0], hitT: 0, closed: false, broken: !!d.startBroken });
      // a doorway has ONE door leaf: it is drawn in one room's side wall only (the indoor side for street exits);
      // the neighbouring room just shows the opening, or plain wall while the door is shut
      { const ra = map.rooms[d.a], rb = map.rooms[d.b]; d.own = ra.outdoor ? d.b : rb.outdoor ? d.a : ((d.x * 7 + d.f * 13) % 2 ? d.a : d.b); }
      if (d.broken) { d.hp = 0; continue; }
      const a = map.rooms[d.a], b = map.rooms[d.b];
      if (!d.lk && !(a.outdoor && b.outdoor) && r() < 0.35) this.setDoor(d, true, true);
    }
  },
  doorObj(f, x) { return this.doorAt.get(f + '|' + x); },
  // closed (or locked) door: blocks the player, bullets and line of sight
  shutDoor(f, x) { const d = this.doorObj(f, x); return !!d && (!!d.lk || (d.closed && !d.broken)); },
  doorNear(range = 44) {
    const p = this.p; if (p.climb || p.hidden) return null;
    let best = null, bd = range;
    for (const d of this.map.doors) { const dd = Math.abs(d.x - p.x); if (d.f === p.f && !d.lk && !d.broken && dd < bd) { bd = dd; best = d; } }
    return best;
  },
  setDoor(d, closed, silent) {
    d.closed = closed;
    const i = this.barricades.indexOf(d);
    if (closed && i < 0) this.barricades.push(d);
    if (!closed && i >= 0) this.barricades.splice(i, 1);
    if (!silent) { (closed ? Snd.doorClose : Snd.doorOpen).call(Snd, d.x, d.f); this.noise(d.x, floorY(d.f), closed ? 300 : 240, U.rf(Math.random, 0.62, 0.8)); }
  },
  toggleDoor(d) {
    const p = this.p;
    if (!d.closed) {
      if (this.zombies.some(z => !z.dead && z.f === d.f && !z.climb && Math.abs(z.x - d.x) < z.rad + 6)) { this.popText(d.x, floorY(d.f) - 150, 'มีซอมบี้ขวางประตู!', '#ff8a5c'); return; }
      if (Math.abs(p.x - d.x) < p.rad + 6) { // step back to the side we came from before shutting it
        const side = Math.sign(p.x - d.x) || -p.facing;
        p.x = d.x + side * (p.rad + 7); const nr = roomAt(this.map, p.f, p.x); if (nr) p.room = nr.id;
      }
      this.setDoor(d, true);
    } else this.setDoor(d, false);
    d.hitT = 0.12;
  },
  breakDoor(d) {
    this.setDoor(d, false, true);
    d.broken = true; d.hp = 0; d.lvl = 0; d.max = DOOR_HP[0];
    const y = floorY(d.f) - 60;
    Snd.woodBreak(d.x, d.f);
    for (let i = 0; i < 22; i++) this.parts.push({ x: d.x + U.rf(Math.random, -16, 16), y: y + U.rf(Math.random, -50, 50), vx: U.rf(Math.random, -280, 280), vy: U.rf(Math.random, -300, -60), t: 0.9, c: U.pick(Math.random, ['#6a4a30', '#4a3220', '#9aa2aa']), s: U.rf(Math.random, 3, 7), g: 800 });
    this.popText(d.x, y - 70, 'ประตูพัง!', '#ff5a4a');
    const p = this.p;
    if (Math.abs(p.x - d.x) < 900 && Math.abs(p.f - d.f) <= 1) { toast('⚠ ประตูถูกพังแล้ว!', 'warn'); this.shake = Math.max(this.shake, 4); }
    this.noise(d.x, y, 520);
  },
  doorPlan(d) {
    if (d.broken) return { act: 'fix', cost: { plank: 2, nails: 2 }, time: 2.6, label: 'ตอกไม้ปิดช่องประตู' };
    if (d.hp < d.max * 0.75) return { act: 'repair', cost: { plank: 1, nails: 1 }, time: 1.6, label: 'ซ่อมประตู' };
    if (d.lvl === 0) return { act: 'up', lvl: 1, cost: { plank: 2, nails: 2 }, time: 2.2, label: 'ตอกไม้เสริมประตู (ระดับ 1)' };
    if (d.lvl === 1) return { act: 'up', lvl: 2, cost: { scrap: 3, nails: 2 }, time: 2.8, label: 'บุแผ่นเหล็ก (ระดับ 2)' };
    if (d.lvl === 2) return { act: 'up', lvl: 3, cost: { scrap: 4, plank: 2, nails: 3 }, time: 3.4, label: 'ประตูโครงเหล็ก (ระดับ 3)' };
    return null;
  },
  applyDoorPlan(d, plan) {
    if (plan.act === 'fix') { d.broken = false; d.lvl = 0; d.max = DOOR_HP[0]; d.hp = d.max; this.setDoor(d, true, true); }   // boarded shut
    else if (plan.act === 'up') { d.lvl = plan.lvl; d.max = DOOR_HP[d.lvl]; d.hp = d.max; }
    else d.hp = Math.min(d.max, d.hp + d.max * 0.5);
  },
});

Object.assign(R, {
  drawDoors(run) {
    // the door itself is drawn in each room's side wall (render_room.drawClosedDoor); here only the gap edge + damage bar
    const ctx = this.ctx, map = run.map;
    for (const d of map.doors) {
      const a = map.rooms[d.a], c = map.rooms[d.b];
      if (!a.revealed && !c.revealed && !run.powered) continue;
      const shut = d.lk || (d.closed && !d.broken), y1 = floorY(d.f);
      if (shut) { ctx.fillStyle = d.lvl >= 2 && !d.lk ? '#5a6168' : '#3e2a1a'; ctx.fillRect(d.x - GAPH, y1 - DOOR_H + 2, GAPH * 2, DOOR_H - 4); }
      if (!d.lk && shut && d.hp < d.max) { const bw = 34; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(d.x - bw / 2 - 1, y1 - DOOR_H - 16, bw + 2, 6); ctx.fillStyle = d.hp / d.max > 0.5 ? '#e0b050' : '#ff6a3c'; ctx.fillRect(d.x - bw / 2, y1 - DOOR_H - 15, bw * d.hp / d.max, 4); }
    }
  },
});
