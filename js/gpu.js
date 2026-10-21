// ---------- Gfx renderer (PixiJS / WebGL) ----------
// Three stacked canvases while in a run:
//   #sky  (2D)    – sky, moon, parallax skyline (screen space)
//   #gpu  (WebGL) – the world: cached textures for the static parts (ground, rooms, furniture) + every
//                   character / zombie / projectile drawn through PixiCtx, a Canvas-2D look-alike that turns
//                   draw calls into pooled Pixi sprites and shapes, so the existing drawing code runs unchanged
//   #game (2D)    – doors, barricades, particles, world UI, vignette and HUD (things drawn above the actors)
// Static parts are painted once with the original Canvas 2D code into offscreen canvases and uploaded as
// textures; they are repainted only when something visible in them changes (blood, doors, search state…).

// ---------- PixiCtx: a subset of CanvasRenderingContext2D on top of Pixi ----------
class PixiCtx {
  constructor(gpu) {
    this.gpu = gpu; this.sprites = []; this.si = 0; this.graphs = []; this.gi = 0; this.boxes = []; this.bi = 0; this.masks = []; this.mi = 0;
    this.texCache = new WeakMap(); this._colors = new Map();
    const pc = document.createElement('canvas').getContext('2d'); this._pc = pc;
    this.reset(null);
  }
  reset(target) {
    this.si = this.gi = this.bi = this.mi = 0; if (this.mused) this.mused.clear();
    this.m = [1, 0, 0, 1, 0, 0]; this.stack = [];
    this.globalAlpha = 1; this.fillStyle = '#000'; this.strokeStyle = '#000'; this.lineWidth = 1; this.lineCap = 'butt'; this.lineJoin = 'miter';
    this.font = '10px sans-serif'; this.textAlign = 'start'; this.textBaseline = 'alphabetic'; this.filter = 'none';
    this.globalCompositeOperation = 'source-over'; this.imageSmoothingEnabled = true; this.dash = null; this.shadowBlur = 0; this.shadowColor = 'rgba(0,0,0,0)'; this.lineDashOffset = 0; this.miterLimit = 10;
    this.target = target; this.g = null; this.path = []; this.sub = null;
  }
  // after a frame: hide pooled objects that were not used
  finish() {
    for (let i = this.si; i < this.sprites.length; i++) { const s = this.sprites[i]; if (s.parent) s.parent.removeChild(s); }
    for (let i = this.gi; i < this.graphs.length; i++) { const g = this.graphs[i]; if (g.parent) { g.clear(); g.parent.removeChild(g); } }
    for (let i = this.bi; i < this.boxes.length; i++) { const b = this.boxes[i]; if (b.parent) b.parent.removeChild(b); b.mask = null; }
    for (let i = this.mi; i < this.masks.length; i++) { const g = this.masks[i]; if (g.parent) { g.clear(); g.parent.removeChild(g); } }
    if (this.meshes) for (const [k, list] of this.meshes) { const n = this.mused.get(k) || 0; for (let i = n; i < list.length; i++) if (list[i].parent) list[i].parent.removeChild(list[i]); }
  }
  setLayer(c) { this.target = c; this.g = null; }
  get canvas() { return this.gpu.overlay.canvas; }
  // ----- state -----
  save() { this.stack.push([this.m.slice(), this.globalAlpha, this.fillStyle, this.strokeStyle, this.lineWidth, this.lineCap, this.font, this.textAlign, this.textBaseline, this.filter, this.target, this.dash]); }
  restore() {
    const s = this.stack.pop(); if (!s) return;
    [this.m, this.globalAlpha, this.fillStyle, this.strokeStyle, this.lineWidth, this.lineCap, this.font, this.textAlign, this.textBaseline, this.filter] = s;
    this.dash = s[11];
    if (this.target !== s[10]) { this.target = s[10]; this.g = null; }
  }
  setTransform(a, b, c, d, e, f) { if (typeof a === 'object') { const t = a; this.m = [t.a, t.b, t.c, t.d, t.e, t.f]; } else this.m = [a, b, c, d, e, f]; }
  resetTransform() { this.m = [1, 0, 0, 1, 0, 0]; }
  getTransform() { const m = this.m; return new DOMMatrix([m[0], m[1], m[2], m[3], m[4], m[5]]); }
  transform(a, b, c, d, e, f) { const m = this.m; this.m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]]; }
  translate(x, y) { const m = this.m; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; }
  scale(x, y) { const m = this.m; m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y; }
  rotate(a) { const c = Math.cos(a), s = Math.sin(a); this.transform(c, s, -s, c, 0, 0); }
  // ----- paths (points stored already transformed to screen pixels) -----
  _pt(x, y) { const m = this.m; return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  beginPath() { this.path = []; this.sub = null; }
  moveTo(x, y) { this.sub = { pts: [this._pt(x, y)], closed: false }; this.path.push(this.sub); }
  lineTo(x, y) { if (!this.sub) return this.moveTo(x, y); this.sub.pts.push(this._pt(x, y)); }
  closePath() { if (this.sub) { this.sub.closed = true; const p0 = this.sub.pts[0]; this.sub = { pts: [p0.slice()], closed: false }; this.path.push(this.sub); } }
  rect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
  roundRect(x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, Math.abs(w) / 2, Math.abs(h) / 2);
    if (!r) return this.rect(x, y, w, h);
    this.moveTo(x + r, y); this.arcTo4(x + w - r, y + r, r, -Math.PI / 2, 0); this.arcTo4(x + w - r, y + h - r, r, 0, Math.PI / 2);
    this.arcTo4(x + r, y + h - r, r, Math.PI / 2, Math.PI); this.arcTo4(x + r, y + r, r, Math.PI, Math.PI * 1.5); this.closePath();
  }
  arcTo4(cx, cy, r, a0, a1) { for (let i = 0; i <= 4; i++) { const a = a0 + (a1 - a0) * i / 4; this.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } }
  _segs(r) { const m = this.m, k = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])); return Math.max(8, Math.min(48, Math.ceil(r * k * 0.6))); }
  arc(x, y, r, a0, a1, ccw) { this.ellipse(x, y, r, r, 0, a0, a1, ccw); }
  ellipse(x, y, rx, ry, rot, a0, a1, ccw) {
    let span = a1 - a0;
    if (!ccw && span < 0) span = span % (Math.PI * 2) + Math.PI * 2; if (ccw && span > 0) span = span % (Math.PI * 2) - Math.PI * 2;
    if (Math.abs(span) > Math.PI * 2) span = Math.sign(span) * Math.PI * 2;
    const n = Math.max(3, Math.ceil(this._segs(Math.max(rx, ry)) * Math.abs(span) / (Math.PI * 2))), cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i <= n; i++) {
      const a = a0 + span * i / n, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry, px = x + ex * cr - ey * sr, py = y + ex * sr + ey * cr;
      if (i === 0 && (!this.sub || this.sub.pts.length === 0)) this.moveTo(px, py); else this.lineTo(px, py);
    }
  }
  quadraticCurveTo(cx, cy, x, y) {
    if (!this.sub) return this.moveTo(x, y);
    const p0 = this.sub.pts[this.sub.pts.length - 1], c = this._pt(cx, cy), p = this._pt(x, y);
    for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t; this.sub.pts.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p[1]]); }
  }
  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
    if (!this.sub) return this.moveTo(x, y);
    const p0 = this.sub.pts[this.sub.pts.length - 1], a = this._pt(c1x, c1y), b = this._pt(c2x, c2y), p = this._pt(x, y);
    for (let i = 1; i <= 10; i++) { const t = i / 10, u = 1 - t; this.sub.pts.push([u * u * u * p0[0] + 3 * u * u * t * a[0] + 3 * u * t * t * b[0] + t * t * t * p[0], u * u * u * p0[1] + 3 * u * u * t * a[1] + 3 * u * t * t * b[1] + t * t * t * p[1]]); }
  }
  // ----- colors -----
  _col(s) {
    let c = this._colors.get(s); if (c) return c;
    const pc = this._pc; pc.fillStyle = '#000'; pc.fillStyle = s; const n = pc.fillStyle;
    if (n[0] === '#') c = [parseInt(n.slice(1), 16), 1];
    else { const v = n.match(/[\d.]+/g).map(Number); c = [(v[0] << 16) | (v[1] << 8) | v[2], v.length > 3 ? v[3] : 1]; }
    if (this._colors.size > 4000) this._colors.clear();
    this._colors.set(s, c); return c;
  }
  _graph() {
    if (this.g && this.g.parent === this.target && this.target.children[this.target.children.length - 1] === this.g) return this.g;
    let g = this.graphs[this.gi]; if (!g) { g = new PIXI.Graphics(); this.graphs.push(g); } else g.clear();
    this.gi++; this.target.addChild(g); this.g = g; return g;
  }
  fill() {
    if (typeof this.fillStyle !== 'string') return this._forwardPath('fill');
    const [col, a] = this._col(this.fillStyle), al = a * this.globalAlpha; if (al <= 0) return;
    const g = this._graph(); g.lineStyle(0); g.beginFill(col, al);
    for (const s of this.path) if (s.pts.length > 2) g.drawPolygon(s.pts.flat());
    g.endFill();
  }
  stroke() {
    if (typeof this.strokeStyle !== 'string' || this.dash) return this._forwardPath('stroke');
    const [col, a] = this._col(this.strokeStyle), al = a * this.globalAlpha; if (al <= 0) return;
    const m = this.m, k = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
    const g = this._graph(); g.lineStyle({ width: this.lineWidth * k, color: col, alpha: al, cap: this.lineCap === 'round' ? 'round' : this.lineCap === 'square' ? 'square' : 'butt', join: 'round' });
    for (const s of this.path) {
      if (s.pts.length < 2) continue;
      g.moveTo(s.pts[0][0], s.pts[0][1]);
      for (let i = 1; i < s.pts.length; i++) g.lineTo(s.pts[i][0], s.pts[i][1]);
      if (s.closed) g.closePath();
    }
    g.lineStyle(0);
  }
  fillRect(x, y, w, h) { const p = this.path, s = this.sub; this.beginPath(); this.rect(x, y, w, h); this.fill(); this.path = p; this.sub = s; }
  strokeRect(x, y, w, h) { const p = this.path, s = this.sub; this.beginPath(); this.rect(x, y, w, h); this.stroke(); this.path = p; this.sub = s; }
  clearRect() { }
  setLineDash(d) { this.dash = d && d.length ? d.slice() : null; }
  getLineDash() { return this.dash ? this.dash.slice() : []; }
  // ----- clipping: following draws go into a container masked by the current path -----
  clip() {
    let mg = this.masks[this.mi]; if (!mg) { mg = new PIXI.Graphics(); this.masks.push(mg); } else mg.clear();
    this.mi++; mg.beginFill(0xffffff, 1); for (const s of this.path) if (s.pts.length > 2) mg.drawPolygon(s.pts.flat()); mg.endFill();
    let box = this.boxes[this.bi]; if (!box) { box = new PIXI.Container(); this.boxes.push(box); }
    this.bi++; box.removeChildren(); this.target.addChild(box); box.addChild(mg); box.mask = mg;
    this.target = box; this.g = null;
  }
  // ----- images -----
  _tex(src, sx, sy, sw, sh) {
    let e = this.texCache.get(src);
    if (!e) {
      const base = PIXI.BaseTexture.from(src, { mipmap: PIXI.MIPMAP_MODES.ON, scaleMode: PIXI.SCALE_MODES.LINEAR });
      e = { base, full: new PIXI.Texture(base), subs: new Map() }; this.texCache.set(src, e);
    }
    if (sx == null) return e.full;
    const W = src.naturalWidth || src.width, H = src.naturalHeight || src.height;
    const x0 = Math.max(0, sx), y0 = Math.max(0, sy), x1 = Math.min(W, sx + sw), y1 = Math.min(H, sy + sh);
    if (x1 <= x0 || y1 <= y0) return null;
    const key = x0 + ',' + y0 + ',' + x1 + ',' + y1;
    let t = e.subs.get(key); if (!t) { t = new PIXI.Texture(e.base, new PIXI.Rectangle(x0, y0, x1 - x0, y1 - y0)); e.subs.set(key, t); }
    return t;
  }
  drawImage(img, a, b, c, d, e, f, g, h) {
    if (!img) return;
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height; if (!W || !H) return;
    if (this.filter && this.filter !== 'none') img = FilterCache.get(img, this.filter);
    let sx, sy, sw, sh, dx, dy, dw, dh;
    if (e === undefined) { dx = a; dy = b; dw = c === undefined ? W : c; dh = d === undefined ? H : d; sw = W; sh = H; }
    else { sx = a; sy = b; sw = c; sh = d; dx = e; dy = f; dw = g; dh = h; }
    const tex = sx === undefined ? this._tex(img) : this._tex(img, sx, sy, sw, sh); if (!tex) return;
    let sp = this.sprites[this.si]; if (!sp) { sp = new PIXI.Sprite(); this.sprites.push(sp); }
    this.si++;
    sp.texture = tex; sp.alpha = this.globalAlpha; sp.visible = true;
    const kx = dw / sw, ky = dh / sh, m = this.m;
    // the sub-texture may have been cropped to the image bounds: shift by the cropped amount
    const ox = sx === undefined ? 0 : Math.max(0, -sx) * kx, oy = sx === undefined ? 0 : Math.max(0, -sy) * ky;
    const X = dx + ox, Y = dy + oy;
    _M.set(m[0] * kx, m[1] * kx, m[2] * ky, m[3] * ky, m[0] * X + m[2] * Y + m[4], m[1] * X + m[3] * Y + m[5]);
    sp.transform.setFromMatrix(_M);
    this.target.addChild(sp); this.g = null;
  }
  // ----- skinned meshes (skin.js): vertices in the current space, uvs 0..1, triangle indices; pooled per key -----
  drawMesh(img, v, uv, idx, key) {
    const tex = this._tex(img); if (!tex) return;
    const pool = this.meshes || (this.meshes = new Map()), used = this.mused || (this.mused = new Map());
    const k = key + ':' + idx.length, n = used.get(k) || 0; used.set(k, n + 1);
    let list = pool.get(k); if (!list) pool.set(k, list = []);
    let me = list[n];
    const m = this.m, out = me ? me._v : new Float32Array(v.length);
    for (let i = 0; i < v.length; i += 2) { const x = v[i], y = v[i + 1]; out[i] = m[0] * x + m[2] * y + m[4]; out[i + 1] = m[1] * x + m[3] * y + m[5]; }
    if (!me) { me = new PIXI.SimpleMesh(tex, out, uv, idx); me._v = out; list.push(me); }
    else { if (me.texture !== tex) me.texture = tex; me.vertices = out; }
    me.alpha = this.globalAlpha; me.visible = true;
    this.target.addChild(me); this.g = null;
  }
  // ----- things Pixi does not do cheaply go to the 2D overlay canvas with the same transform -----
  _ov() { const o = this.gpu.overlay, m = this.m; o.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); o.globalAlpha = this.globalAlpha; return o; }
  fillText(t, x, y, mw) { const o = this._ov(); o.font = this.font; o.textAlign = this.textAlign; o.textBaseline = this.textBaseline; o.fillStyle = this.fillStyle; mw === undefined ? o.fillText(t, x, y) : o.fillText(t, x, y, mw); o.globalAlpha = 1; }
  strokeText(t, x, y) { const o = this._ov(); o.font = this.font; o.textAlign = this.textAlign; o.textBaseline = this.textBaseline; o.strokeStyle = this.strokeStyle; o.lineWidth = this.lineWidth; o.strokeText(t, x, y); o.globalAlpha = 1; }
  measureText(t) { const o = this.gpu.overlay; o.font = this.font; return o.measureText(t); }
  createLinearGradient(...a) { return this.gpu.overlay.createLinearGradient(...a); }
  createRadialGradient(...a) { return this.gpu.overlay.createRadialGradient(...a); }
  createPattern(...a) { return this.gpu.overlay.createPattern(...a); }
  _forwardPath(op) {
    // the stored points are in screen pixels: replay them in the user space of the current transform
    const o = this._ov(), inv = this.getTransform().inverse();
    o.beginPath();
    for (const s of this.path) s.pts.forEach((p, i) => { const q = inv.transformPoint(new DOMPoint(p[0], p[1])); i ? o.lineTo(q.x, q.y) : o.moveTo(q.x, q.y); });
    if (op === 'fill') { o.fillStyle = this.fillStyle; o.fill(); } else { o.strokeStyle = this.strokeStyle; o.lineWidth = this.lineWidth; o.stroke(); }
    o.globalAlpha = 1;
  }
}
const _M = window.PIXI ? new PIXI.Matrix() : null;

var Gfx = {
  ok: false, on: false, frameNo: 0, caches: new Map(), TILE: 2048,
  init(gameCanvas) {
    if (!window.PIXI) return;
    // WebGL refuses images loaded from file:// (they count as cross-origin): stay on the 2D renderer there
    if (location.protocol === 'file:') { this.why = 'file'; return; }
    const mk = (id, z) => { const c = document.createElement('canvas'); c.id = id; c.style.cssText = `position:fixed;inset:0;display:none;pointer-events:none;z-index:${z}`; gameCanvas.parentNode.insertBefore(c, gameCanvas); return c; };
    try {
      this.skyCv = mk('sky', 0); this.sky = this.skyCv.getContext('2d');
      this.cv = mk('gpu', 0);
      this.renderer = new PIXI.Renderer({ view: this.cv, width: 16, height: 16, backgroundAlpha: 0, antialias: true, resolution: 1, powerPreference: 'high-performance', clearBeforeRender: true });
      if (this.renderer.type !== PIXI.RENDERER_TYPE.WEBGL) throw new Error('no webgl');
    } catch (e) { console.warn('GPU renderer unavailable:', e); this.why = 'nogl'; if (this.cv) this.cv.remove(); if (this.skyCv) this.skyCv.remove(); return; }
    gameCanvas.style.position = 'fixed'; gameCanvas.style.zIndex = 1;
    const gl = this.renderer.gl; this.maxTex = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048); this.TILE = Math.min(this.TILE, this.maxTex);
    this.overlay = gameCanvas.getContext('2d');
    this.stage = new PIXI.Container();
    const L = n => { const c = new PIXI.Container(); c.name = n; this.stage.addChild(c); return c; };
    // draw order (matches R.frame)
    this.L = { ground: L('ground'), mass: L('mass'), rooms: L('rooms'), struct: L('struct'), furn: L('furn'), fdyn: L('fdyn'), ladders: L('ladders'), ent: L('ent'), dim: L('dim') };
    this.worldLayers = ['ground', 'mass', 'rooms', 'furn'];
    this.groundFill = new PIXI.Graphics(); this.L.ground.addChild(this.groundFill);
    this.ctx = new PixiCtx(this);
    this.ok = true;
    this.on = Settings.v.gpu !== false;
    this.cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; });
    this.cv.addEventListener('webglcontextrestored', () => { this.lost = false; this.flush(); });
  },
  resize(W, H, dpr) {
    if (!this.ok) return;
    for (const c of [this.skyCv, this.cv]) { c.style.width = W + 'px'; c.style.height = H + 'px'; }
    this.skyCv.width = Math.round(W * dpr); this.skyCv.height = Math.round(H * dpr);
    this.renderer.resize(Math.round(W * dpr), Math.round(H * dpr));
  },
  setOn(v) { this.on = !!v && this.ok; if (!this.on) this.show(false); this.flush(); },
  show(v) { if (!this.ok || this._shown === v) return; this._shown = v; this.skyCv.style.display = this.cv.style.display = v ? 'block' : 'none'; },
  // drop every cached texture (new map, quality change, lost context)
  flush() { for (const e of this.caches.values()) this.free(e); this.caches.clear(); },
  free(e) { for (const t of e.tiles) { t.sprite.destroy(); t.tex.destroy(true); } e.tiles = []; },
  // a world-space region painted with Canvas 2D code, kept as Gfx textures until its signature changes
  region(layer, key, sig, x0, y0, x1, y1, S, draw) {
    let e = this.caches.get(key);
    const W = Math.max(1, Math.ceil((x1 - x0) * S)), H = Math.max(1, Math.ceil((y1 - y0) * S));
    if (e && (e.W !== W || e.H !== H || e.S !== S || e.x0 !== x0 || e.y0 !== y0)) { this.free(e); this.caches.delete(key); e = null; }
    if (!e) {
      e = { key, layer, W, H, S, x0, y0, sig: null, tiles: [], used: 0 };
      const T = this.TILE;
      for (let ty = 0; ty < H; ty += T) for (let tx = 0; tx < W; tx += T) {
        const cv = document.createElement('canvas'); cv.width = Math.min(T, W - tx); cv.height = Math.min(T, H - ty);
        const tex = PIXI.Texture.from(cv, { scaleMode: PIXI.SCALE_MODES.LINEAR, mipmap: PIXI.MIPMAP_MODES.OFF });
        const sprite = new PIXI.Sprite(tex); sprite.position.set(x0 + tx / S, y0 + ty / S); sprite.scale.set(1 / S);
        this.L[layer].addChild(sprite);
        e.tiles.push({ cv, tex, sprite, tx, ty });
      }
      this.caches.set(key, e);
    }
    if (e.sig !== sig) {
      e.sig = sig;
      for (const t of e.tiles) {
        const c = t.cv.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, t.cv.width, t.cv.height);
        c.setTransform(S, 0, 0, S, -t.tx - x0 * S, -t.ty - y0 * S);
        draw(c);
        t.tex.baseTexture.update();
      }
    }
    e.used = this.frameNo;
    for (const t of e.tiles) t.sprite.visible = true;
    return e;
  },
  begin() {
    this.frameNo++;
    for (const e of this.caches.values()) for (const t of e.tiles) t.sprite.visible = false;
    this.ctx.reset(this.L.ent);
  },
  end(M) {
    // cached layers live in world space: give them the camera transform
    _M.set(M[0], M[1], M[2], M[3], M[4], M[5]);
    for (const n of this.worldLayers) this.L[n].transform.setFromMatrix(_M);
    this.ctx.finish();
    // forget regions that have been off screen for a while (keeps Gfx memory bounded)
    if (this.frameNo % 120 === 0) for (const [k, e] of this.caches) if (this.frameNo - e.used > 600) { this.free(e); this.caches.delete(k); }
    if (!this.lost) this.renderer.render(this.stage);
  },
  stats() { let n = 0, px = 0; for (const e of this.caches.values()) for (const t of e.tiles) { n++; px += t.cv.width * t.cv.height; } return { tex: n, mb: Math.round(px * 4 / 1048576), sprites: this.ctx.si, shapes: this.ctx.gi }; },
};

// ---------- the world frame on the Gfx ----------
Object.assign(R, {
  frameGPU(run, dt) {
    const p = run.p, map = run.map, G = Gfx, ov = this.ctx;
    const cam = this.camera(run, dt), { z, z0, cx, cy } = cam, dpr = this.dpr;
    if (G.map !== map) { G.flush(); G.map = map; }
    G.show(true);
    // world -> canvas pixels
    const M = [dpr * z, 0, 0, dpr * z, dpr * (this.W / 2 - z * cx), dpr * (this.H / 2 - z * cy)];
    // cache resolution: base zoom only (aiming zooms are short), in 1/4 steps
    const S = U.clamp(Math.round(z0 * dpr * 4) / 4, 0.5, 3);
    if (G.S !== S) { G.flush(); G.S = S; }
    G.begin();
    // ---- sky on its own 2D canvas
    this.ctx = G.sky; G.sky.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawSky(run);
    // ---- static world as textures
    this.view = cam.view;
    this.ctx = null;
    const bg = THEMES[run.loc.theme].bg, gx0 = -STREET - 900, gx1 = map.BW + STREET + 900, gy0 = -40, gy1 = SLAB + 520;
    G.region('ground', 'ground', 'g', gx0, gy0, gx1, gy1, Math.min(S, 1.5), c => { this.ctx = c; const v = this.view; this.view = { x0: gx0, x1: gx1, y0: gy0, y1: gy1 - 500 }; this.drawGround(run); this.view = v; });
    if (typeof LocArt !== 'undefined') G.region('ground', 'landmark', LocArt.sig(run), -STREET - 10, -460, 0, -8, Math.min(S, 1.5), c => LocArt.draw(c, run));
    G.groundFill.clear(); G.groundFill.beginFill(0x0c0a08).drawRect(gx0 - 4000, gy1 - 2, gx1 - gx0 + 8000, 4000).endFill();
    const top = floorY(map.F);
    G.region('mass', 'mass', 'm', -60, top - 60, map.BW + 60, SLAB + 30, S, c => { this.ctx = c; this.drawBuildingMass(run); });
    const v = cam.view, curRoom = run.navRoom(p);
    for (const rm of map.rooms) {
      if (!this.inView(rm)) continue;
      const fy = floorY(rm.f);
      if (!rm.outdoor) {
        const b = this.roomBox(rm);
        G.region('rooms', 'r' + rm.id, this.roomSig(run, rm), b.bx0 - 4, b.by0 - 4, b.bx1 + 4, b.by1 + 4, S, c => { this.ctx = c; this.drawRoomBack(run, rm, rm.id === curRoom); });
      }
      if (rm.revealed && rm.furn.length) {
        G.region('furn', 'f' + rm.id, this.furnSig(run, rm), rm.x0 - 160, fy - 340, rm.x1 + 160, fy + 30, S, c => { this.ctx = c; for (const fu of rm.furn) this.drawFurn(run, fu, rm, 'static'); });
      }
    }
    // ---- live parts through PixiCtx (same code as the 2D renderer)
    const A = G.ctx;
    this.ctx = A;
    A.setLayer(G.L.struct); A.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
    // the 2D overlay starts clean every frame (PixiCtx forwards text to it while drawing the actors)
    ov.setTransform(1, 0, 0, 1, 0, 0); ov.clearRect(0, 0, this.cv.width, this.cv.height);
    this.drawStructure(run);
    // live furniture bits (search badges, progress bars, loot icons) stay under the actors like before
    A.setLayer(G.L.fdyn);
    for (const rm of map.rooms) if (rm.revealed && this.inView(rm)) for (const fu of rm.furn) this.drawFurn(run, fu, rm, 'dyn');
    A.setLayer(G.L.ladders); this.drawLadders(run);
    A.setLayer(G.L.ent);
    A.save(); A.translate(0, -FEET);
    if (run.survivor && run.survivor.state !== 'gone' && map.rooms[run.survivor.room].revealed) this.drawSurvivor(run, run.survivor);
    const zs = run.zombies.slice().sort((a, b) => (a.dead ? 0 : 1) - (b.dead ? 0 : 1) || a.depth - b.depth);
    for (const zm of zs) {
      const rm = map.rooms[zm.climb ? run.navRoom(zm) : zm.room];
      if (!rm.revealed && !run.powered) continue;
      this.drawZombie(run, zm);
    }
    this.drawPlayer(run);
    this.drawProjectiles(run);
    A.restore();
    A.setLayer(G.L.dim);
    for (const rm of map.rooms) {
      if (!this.inView(rm) || rm.outdoor || !rm.revealed || rm.id === curRoom) continue;
      const bx = this.roomBox(rm);
      A.fillStyle = 'rgba(4,6,10,0.45)'; A.fillRect(bx.bx0, bx.by0, bx.bx1 - bx.bx0, bx.by1 - bx.by0);
    }
    // ---- 2D overlay: everything that was drawn above the actors
    this.ctx = ov;
    ov.save(); ov.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
    this.drawDoors(run);
    this.drawExits(run);
    this.drawBarricades(run);
    this.drawTraps(run);
    ov.save(); ov.translate(0, -FEET);
    this.drawParticles(run);
    this.drawWorldUI(run);
    ov.restore();
    ov.restore();
    ov.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawWeatherFx(run);
    this.drawVignette(run);
    this.drawHUD(run);
    G.end(M);
  },
  // what a cached room picture depends on
  roomSig(run, rm) {
    let s = (rm.revealed ? 1 : 0) + '|' + (!rm.dark || run.powered ? 1 : 0) + '|' + rm.blood.length;
    for (const x of [rm.x0, rm.x1]) {
      const d = run.doorObj && run.doorObj(rm.f, x); if (!d) continue;
      const hp = d.lk ? d.lk.hp / d.lk.max : d.max ? d.hp / d.max : 1;
      s += '|' + (d.lk ? 'L' : '') + (d.closed ? 'c' : '') + (d.broken ? 'b' : '') + (d.lvl || 0) + (d.own != null ? 'o' + d.own : '') + (hp < 0.45 ? 2 : hp < 0.75 ? 1 : 0);
      if (d.hitT > 0) s += '|t' + run.time;   // shaking: repaint every frame for a moment
    }
    return s;
  },
  furnSig(run, rm) {
    let s = (run.powered ? 'P' : '') + rm.furn.length;
    for (const fu of rm.furn) { s += '|' + fu.kind + (fu.searched ? 's' : '') + (fu.loot ? 'l' : ''); if (fu.hitT > 0) s += 't' + run.time; }
    return s;
  },
});
