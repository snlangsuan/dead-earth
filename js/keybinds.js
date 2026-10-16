// ---------- Key bindings: the game reads its original keys; a remap layer turns the player's keys into those ----------
// Game code keeps checking e.g. K['KeyZ'] for sneaking. If the player binds sneaking to Ctrl, a Ctrl press is fed to
// the game as KeyZ, and Z itself stops doing it (unless Z was given another action).
const Keys = {
  ACTIONS: [
    ['left', 'KeyA', 'เดินซ้าย'], ['right', 'KeyD', 'เดินขวา'], ['up', 'KeyW', 'ปีนขึ้น'], ['down', 'KeyS', 'ปีนลง / ก้มยิง'],
    ['sprint', 'ShiftLeft', 'วิ่ง (ค้าง)'], ['sneak', 'KeyZ', 'ย่อง (ค้าง)'], ['attack', 'Space', 'โจมตี'], ['reload', 'KeyR', 'รีโหลด'],
    ['search', 'KeyQ', 'ค้นของ'], ['use', 'KeyE', 'ใช้ / เปิด'], ['takeall', 'KeyF', 'เก็บทั้งหมด'], ['hide', 'KeyH', 'ซ่อนตัว'],
    ['barricade', 'KeyB', 'ตอกไม้ประตู (ค้าง)'], ['craft', 'KeyC', 'ประดิษฐ์ (วิศวกร)'], ['inv', 'Tab', 'เปิดเป้'],
    ['w1', 'Digit1', 'อาวุธประชิด'], ['w2', 'Digit2', 'ปืนพก'], ['w3', 'Digit3', 'อาวุธหลัก'],
  ],
  KEY: 'deadearth_keys',
  mac: /Mac|iPhone|iPad/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent),
  bind: {}, tr: null,
  canon(a) { const r = this.ACTIONS.find(x => x[0] === a); return r && r[1]; },
  // sneaking defaults to Z on a Mac (Ctrl + arrows switches desktops there), Ctrl elsewhere
  def(a) { return a === 'sneak' && !this.mac ? 'ControlLeft' : this.canon(a); },
  code(a) { return this.bind[a] || this.def(a); },
  load() { try { this.bind = JSON.parse(localStorage.getItem(this.KEY) || '{}') || {}; } catch (e) { this.bind = {}; } this.build(); },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.bind)); } catch (e) { } this.build(); },
  reset() { this.bind = {}; this.save(); },
  set(a, code) {
    const prev = this.code(a), other = this.ACTIONS.find(x => x[0] !== a && this.code(x[0]) === code);
    if (other) this.bind[other[0]] = prev;   // taking another action's key swaps the two
    this.bind[a] = code;
    for (const [x] of this.ACTIONS) if (this.bind[x] === this.def(x)) delete this.bind[x];
    this.save();
  },
  build() {
    const m = new Map(), freed = new Set();
    for (const [a, c] of this.ACTIONS) { const u = this.code(a); if (u !== c) { m.set(u, c); freed.add(c); } }
    for (const u of m.keys()) freed.delete(u);
    // left/right Shift and Ctrl act alike
    for (const [u, c] of [...m]) { const tw = u.replace(/Left$/, 'Right'); if (tw !== u && !m.has(tw)) m.set(tw, c); }
    this.tr = code => m.has(code) ? m.get(code) : freed.has(code) ? null : code;
    this.ctrlBound = [...m.keys()].some(u => u.startsWith('Control'));
  },
  name(code) {
    if (!code) return '-';
    const S = { Space: 'Space', Tab: 'Tab', ShiftLeft: 'Shift', ShiftRight: 'Shift R', ControlLeft: 'Ctrl', ControlRight: 'Ctrl R', AltLeft: this.mac ? 'Option' : 'Alt', AltRight: this.mac ? 'Option R' : 'Alt R',
      MetaLeft: this.mac ? 'Cmd' : 'Win', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', CapsLock: 'Caps', Backquote: '`', Enter: 'Enter' };
    return S[code] || code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ');
  },
  lbl(a) { return this.name(this.code(a)); },
};
Keys.load();
