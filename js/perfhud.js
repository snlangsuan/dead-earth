// ---------- F3: performance readout (to find what makes a long session slow) ----------
const PerfHUD = {
  on: false, el: null, fr: [], upd: 0, ren: 0, n: 0, t0: performance.now(), long: 0, start: performance.now(),
  init() {
    const U0 = Run.update.bind(Run), F0 = R.frame.bind(R), self = this;
    Run.update = function (dt) { if (!self.on) return U0(dt); const t = performance.now(); const r = U0(dt); self.upd += performance.now() - t; return r; };
    R.frame = function (a, b) {
      if (!self.on) return F0(a, b);
      const t = performance.now(); const r = F0(a, b); const e = performance.now(); self.ren += e - t; self.n++;
      if (self.last) { const d = e - self.last; self.fr.push(d); if (d > 50) self.long++; } self.last = e;
      if (e - self.t0 > 500) self.show(e);
      return r;
    };
    addEventListener('keydown', ev => { if (ev.code === 'F3') { ev.preventDefault(); this.toggle(); } });
  },
  toggle() {
    this.on = !this.on;
    if (!this.el) { this.el = document.createElement('pre'); this.el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;margin:0;padding:8px 10px;background:rgba(0,0,0,.72);color:#cfe;font:12px/1.35 ui-monospace,Menlo,monospace;pointer-events:none;border-radius:6px;white-space:pre'; document.body.appendChild(this.el); }
    this.el.style.display = this.on ? '' : 'none'; this.fr = []; this.upd = this.ren = this.n = 0; this.last = 0; this.t0 = performance.now();
  },
  show(now) {
    const f = this.fr.slice().sort((a, b) => a - b), avg = f.reduce((s, x) => s + x, 0) / Math.max(1, f.length);
    const p99 = f[Math.floor(f.length * 0.99)] || 0, n = Math.max(1, this.n);
    const L = [`FPS ${(1000 / avg).toFixed(0)}  (ช้าสุด ${p99.toFixed(0)} ms)  เฟรมกระตุก ${this.long}`,
      `JS update ${(this.upd / n).toFixed(2)} ms  render ${(this.ren / n).toFixed(2)} ms`,
      `ความคมชัด ${R.q}  dpr ${R.dpr.toFixed(2)}  จอ ${R.cv.width}×${R.cv.height}`,
      window.Gfx && Gfx.ok && Gfx.on ? (st => `ตัววาด GPU  แคช ${st.tex} ภาพ (${st.mb} MB)  สไปรต์ ${st.sprites}  รูปทรง ${st.shapes}`)(Gfx.stats()) : `ตัววาด 2D${window.Gfx && Gfx.why === 'file' ? ' (เปิดเป็นไฟล์ — GPU ต้องเปิดผ่าน http)' : ''}`];
    if (Run.map) {
      const rooms = Run.map.rooms, blood = rooms.reduce((s, r) => s + (r.blood ? r.blood.length : 0), 0);
      L.push(`ซอมบี้ ${Run.zombies.filter(z => !z.dead).length}/${Run.zombies.length}  ไล่ ${Run.chasers}  อนุภาค ${Run.parts.length}  ข้อความ ${Run.texts.length}`);
      L.push(`กระสุน ${Run.bullets.length}  กรด ${Run.acid.length}  เลือด ${blood}  ระเบิด ${Run.nades.length}  ห้อง ${rooms.length}`);
    }
    let fc = 0; for (const k in Override.imgs) { const im = Override.imgs[k]; if (im && im._fc) fc += Object.keys(im._fc).length; }
    const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : '-';
    L.push(`ภาพกรองแคช ${fc}  หน่วยความจำ JS ${mem}  เสียง ${Snd.voices} (${Snd.ctx ? Snd.ctx.state : '-'})`);
    L.push(`DOM ${document.getElementsByTagName('*').length}  เปิดมา ${Math.round((now - this.start) / 60000)} นาที`);
    this.el.textContent = L.join('\n');
    this.fr = []; this.upd = this.ren = this.n = 0; this.t0 = now;
  },
};
PerfHUD.init();
