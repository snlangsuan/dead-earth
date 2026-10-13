// ---------- Side-view building generator ----------
const FH = 240;      // floor height (incl. slab)
const SLAB = 18;     // floor slab thickness
const CELL = 300;    // width of one room cell
const WALL = 16;     // wall thickness
const STREET = 460;  // outdoor street width on each side
const DOOR_H = 128;  // doorway height

// Furniture: w,h in px, loot table (null = decoration)
const FURN = {
  bed:        { n: 'เตียง', w: 120, h: 46, loot: 'bed' },
  bunk:       { n: 'เตียงสองชั้น', w: 110, h: 112, loot: 'bed' },
  sofa:       { n: 'โซฟา', w: 110, h: 50, loot: 'bed' },
  wardrobe:   { n: 'ตู้เสื้อผ้า', w: 66, h: 120, loot: 'wardrobe' },
  rack:       { n: 'ราวเสื้อผ้า', w: 90, h: 92, loot: 'wardrobe' },
  desk:       { n: 'โต๊ะทำงาน', w: 96, h: 50, loot: 'desk' },
  filecab:    { n: 'ตู้เอกสาร', w: 46, h: 86, loot: 'desk' },
  bookshelf:  { n: 'ชั้นหนังสือ', w: 78, h: 128, loot: 'desk' },
  tvstand:    { n: 'ชั้นวางทีวี', w: 92, h: 70, loot: 'desk' },
  fridge:     { n: 'ตู้เย็น', w: 56, h: 118, loot: 'fridge' },
  counter:    { n: 'เคาน์เตอร์ครัว', w: 120, h: 56, loot: 'fridge' },
  stove:      { n: 'เตาอบ', w: 60, h: 58, loot: 'fridge' },
  medcab:     { n: 'ตู้ยา', w: 60, h: 104, loot: 'medcab' },
  hospbed:    { n: 'เตียงผู้ป่วย', w: 116, h: 54, loot: 'medcab' },
  labtable:   { n: 'โต๊ะแล็บ', w: 110, h: 54, loot: 'lab' },
  server:     { n: 'ตู้เซิร์ฟเวอร์', w: 56, h: 130, loot: 'lab' },
  shelfunit:  { n: 'ชั้นวางสินค้า', w: 104, h: 110, loot: 'shop' },
  stallcart:  { n: 'แผงขายของ', w: 118, h: 96, loot: 'shop' },
  register:   { n: 'เคาน์เตอร์คิดเงิน', w: 90, h: 58, loot: 'register' },
  locker:     { n: 'ล็อกเกอร์', w: 72, h: 124, loot: 'locker' },
  weaponrack: { n: 'ชั้นวางอาวุธ', w: 100, h: 104, loot: 'weapons' },
  crate:      { n: 'ลังไม้', w: 62, h: 56, loot: 'crate' },
  dumpster:   { n: 'ถังขยะใหญ่', w: 110, h: 66, loot: 'crate' },
  toolbench:  { n: 'โต๊ะช่าง', w: 112, h: 62, loot: 'toolbox' },
  safe:       { n: 'ตู้เซฟ', w: 56, h: 64, loot: 'safe' },
  car:        { n: 'รถยนต์ร้าง', w: 190, h: 70, loot: 'car' },
  body:       { n: 'ศพ', w: 80, h: 18, loot: 'body' },
  supply:     { n: 'กล่องเสบียงทิ้งร่ม', w: 85, h: 62, loot: 'supply', special: true },
  generator:  { n: 'เครื่องปั่นไฟ', w: 96, h: 76, loot: null, special: true },
  bag:        { n: 'ของบนพื้น', w: 40, h: 26, loot: null },
  // decorations (no loot)
  lamp: { w: 26, h: 120 }, plant: { w: 34, h: 66 }, toilet: { w: 40, h: 50 }, sink: { w: 50, h: 70 },
  bench: { w: 110, h: 40 }, streetlamp: { w: 20, h: 200 }, barrel: { w: 40, h: 56 }, vent: { w: 70, h: 50 },
};

// how many times a piece of furniture can be searched [min, max] (default 1) — each pass takes longer
const FURN_SEARCH = {
  wardrobe: [1, 3], rack: [1, 2], desk: [1, 2], filecab: [2, 3], bookshelf: [1, 3], tvstand: [1, 2], fridge: [1, 3], counter: [2, 3],
  stove: [1, 2], medcab: [1, 3], labtable: [1, 2], server: [1, 2], shelfunit: [2, 4], stallcart: [1, 3], locker: [2, 3], weaponrack: [1, 2],
  dumpster: [1, 3], toolbench: [1, 3], car: [2, 3], bed: [1, 2], bunk: [1, 2],
};
// furniture the player can hide in/under during a wave
const HIDE_SPOTS = { wardrobe: 'ซ่อนในตู้', locker: 'ซ่อนในล็อกเกอร์', dumpster: 'ซ่อนในถังขยะ', car: 'ซ่อนในรถ', bed: 'มุดใต้เตียง', bunk: 'มุดใต้เตียง', hospbed: 'มุดใต้เตียง' };

const ROOM_TYPES = {
  bedroom:    { n: 'ห้องนอน', tint: '#6b5a6e', paper: 'stripe', furn: [['bed', 3], ['wardrobe', 2], ['desk', 1], ['bunk', 1]], decor: ['lamp', 'plant'] },
  living:     { n: 'ห้องนั่งเล่น', tint: '#6e6450', paper: 'stripe', furn: [['sofa', 3], ['bookshelf', 2], ['tvstand', 2], ['desk', 1]], decor: ['lamp', 'plant'] },
  kitchen:    { n: 'ห้องครัว', tint: '#5f7268', paper: 'tile', furn: [['fridge', 3], ['counter', 3], ['stove', 1]], decor: ['sink'] },
  bathroom:   { n: 'ห้องน้ำ', tint: '#6a7f86', paper: 'tile', furn: [['medcab', 3]], decor: ['toilet', 'sink'] },
  storage:    { n: 'ห้องเก็บของ', tint: '#5a5248', paper: 'brick', furn: [['crate', 3], ['shelfunit', 2], ['toolbench', 1], ['locker', 1]], decor: ['barrel'] },
  office:     { n: 'ห้องทำงาน', tint: '#5d6470', paper: 'panel', furn: [['desk', 3], ['filecab', 2], ['bookshelf', 1], ['safe', 0.5]], decor: ['plant', 'lamp'] },
  ward:       { n: 'หอผู้ป่วย', tint: '#7a948e', paper: 'tile', furn: [['hospbed', 4], ['medcab', 2]], decor: ['plant'] },
  pharmacy:   { n: 'ห้องยา', tint: '#7e9a96', paper: 'tile', furn: [['medcab', 4], ['register', 1], ['shelfunit', 1]], decor: [] },
  lab:        { n: 'ห้องแล็บ', tint: '#647d8a', paper: 'tile', furn: [['labtable', 4], ['medcab', 1], ['server', 1], ['fridge', 1]], decor: [] },
  shop:       { n: 'ร้านค้า', tint: '#6f6080', paper: 'panel', furn: [['shelfunit', 4], ['register', 2], ['fridge', 1]], decor: ['plant'] },
  clothing:   { n: 'ร้านเสื้อผ้า', tint: '#80607a', paper: 'panel', furn: [['rack', 3], ['wardrobe', 2], ['register', 1]], decor: ['plant'] },
  foodcourt:  { n: 'ศูนย์อาหาร', tint: '#7a6a4e', paper: 'tile', furn: [['counter', 3], ['fridge', 3], ['register', 1]], decor: ['bench'] },
  electronics:{ n: 'ร้านอิเล็กทรอนิกส์', tint: '#4f6078', paper: 'panel', furn: [['shelfunit', 2], ['desk', 2], ['register', 1], ['server', 1]], decor: [] },
  security:   { n: 'ห้องรักษาความปลอดภัย', tint: '#4e566a', paper: 'panel', furn: [['locker', 3], ['weaponrack', 1], ['desk', 1]], decor: [] },
  stall:      { n: 'แผงตลาด', tint: '#7a6044', paper: 'brick', furn: [['stallcart', 4], ['crate', 2], ['register', 1]], decor: ['barrel'] },
  classroom:  { n: 'ห้องเรียน', tint: '#667a58', paper: 'panel', furn: [['desk', 5], ['bookshelf', 1]], decor: ['plant'] },
  library:    { n: 'ห้องสมุด', tint: '#6e5a44', paper: 'panel', furn: [['bookshelf', 5], ['desk', 1]], decor: ['lamp'] },
  canteen:    { n: 'โรงอาหาร', tint: '#76704e', paper: 'tile', furn: [['counter', 3], ['fridge', 2]], decor: ['bench'] },
  nurse:      { n: 'ห้องพยาบาล', tint: '#7d9792', paper: 'tile', furn: [['medcab', 3], ['hospbed', 1]], decor: [] },
  lockerroom: { n: 'ห้องล็อกเกอร์', tint: '#56606a', paper: 'tile', furn: [['locker', 5]], decor: ['bench'] },
  hall:       { n: 'โถงผู้โดยสาร', tint: '#5d6670', paper: 'panel', furn: [['body', 2], ['register', 1], ['crate', 1], ['shelfunit', 1]], decor: ['bench', 'plant'] },
  cafe:       { n: 'คาเฟ่', tint: '#6e5646', paper: 'brick', furn: [['counter', 2], ['fridge', 2], ['register', 1]], decor: ['plant', 'lamp'] },
  warehouse:  { n: 'โกดัง', tint: '#55504a', paper: 'brick', furn: [['crate', 5], ['shelfunit', 2], ['toolbench', 1]], decor: ['barrel'] },
  workshop:   { n: 'โรงซ่อม', tint: '#5e5446', paper: 'brick', furn: [['toolbench', 4], ['crate', 2], ['locker', 1]], decor: ['barrel'] },
  barracks:   { n: 'ห้องนอนทหาร', tint: '#56603f', paper: 'panel', furn: [['bunk', 4], ['locker', 2]], decor: [] },
  armory:     { n: 'คลังอาวุธ', tint: '#4b5636', paper: 'brick', furn: [['weaponrack', 3], ['locker', 2], ['crate', 1]], decor: [] },
  mess:       { n: 'โรงครัวทหาร', tint: '#5f6648', paper: 'tile', furn: [['counter', 2], ['fridge', 3]], decor: ['bench'] },
  medbay:     { n: 'ห้องพยาบาลสนาม', tint: '#6c8478', paper: 'tile', furn: [['hospbed', 2], ['medcab', 3]], decor: [] },
  cell:       { n: 'ห้องขัง', tint: '#4a4f58', paper: 'brick', furn: [['bed', 2], ['body', 1]], decor: ['toilet'] },
  quarantine: { n: 'ห้องกักกันเชื้อ', tint: '#5f7a6a', paper: 'tile', furn: [['hospbed', 3], ['labtable', 1], ['body', 1]], decor: [] },
  street:     { n: 'ถนน', outdoor: true, furn: [['car', 3], ['dumpster', 2], ['body', 2]], decor: ['streetlamp'] },
  roof:       { n: 'ดาดฟ้า', outdoor: true, furn: [['crate', 2], ['body', 1], ['supply', 0.4]], decor: ['vent'] },
};

function floorY(f) { return -f * FH; }

function generateLocation(seed, theme, d) {
  const r = U.rng(seed);
  const T = THEMES[theme];
  const F = U.clamp(2 + Math.floor(d / 6) + U.ri(r, 0, 1), 2, 6);        // floors above ground (incl. ground)
  const C = U.clamp(3 + Math.floor(d / 8) + U.ri(r, 0, 2), 3, 7);        // columns
  const BW = C * CELL;
  const rooms = [];
  const byFloor = [];
  const addRoom = (f, x0, x1, type, extra) => {
    const room = { id: rooms.length, f, x0, x1, type, revealed: false, furn: [], ...extra };
    rooms.push(room); (byFloor[f] = byFloor[f] || []).push(room); return room;
  };
  // ground floor streets
  const streetL = addRoom(0, -STREET, 0, 'street', { outdoor: true });
  // building rooms
  const roomCells = []; // f -> array of room per cell
  for (let f = 0; f < F; f++) {
    roomCells[f] = [];
    let c = 0;
    while (c < C) {
      let span = 1;
      const rv = r();
      if (rv < 0.35 && c + 1 < C) span = 2;
      if (rv < 0.06 && c + 2 < C) span = 3;
      const type = U.wpick(r, T.rooms);
      const room = addRoom(f, c * CELL, (c + span) * CELL, type, { c0: c, c1: c + span - 1 });
      for (let k = 0; k < span; k++) roomCells[f][c + k] = room;
      c += span;
    }
  }
  const streetR = addRoom(0, BW, BW + STREET, 'street', { outdoor: true });
  const roof = addRoom(F, 0, BW, 'roof', { outdoor: true, c0: 0, c1: C - 1 });
  byFloor.forEach(list => list.sort((a, b) => a.x0 - b.x0));

  // ----- connections -----
  const parent = rooms.map((_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const union = (a, b) => { a = find(a); b = find(b); if (a === b) return false; parent[a] = b; return true; };
  const doors = [];   // {f, x, a, b}
  const ladders = []; // {x, lo, a (low room), b (high room)}
  const addDoor = (a, b) => { doors.push({ f: a.f, x: a.x1, a: a.id, b: b.id }); union(a.id, b.id); };
  const ladderCount = {};
  const addLadder = (a, b, cell) => {
    const x = cell * CELL + CELL * (r() < 0.5 ? 0.28 : 0.72);
    ladders.push({ x, lo: a.f, a: a.id, b: b.id });
    ladderCount[a.id] = (ladderCount[a.id] || 0) + 1; ladderCount[b.id] = (ladderCount[b.id] || 0) + 1;
    union(a.id, b.id);
  };
  // street doors always
  addDoor(streetL, roomCells[0][0]);
  addDoor(roomCells[0][C - 1], streetR);
  // candidate edges
  const cands = [];
  for (let f = 0; f < F; f++) {
    const list = byFloor[f].filter(x => x.type !== 'street');
    for (let i = 0; i + 1 < list.length; i++) cands.push({ k: 'd', a: list[i], b: list[i + 1] });
  }
  for (let f = 0; f + 1 < F; f++) {
    for (let c = 0; c < C; c++) {
      const a = roomCells[f][c], b = roomCells[f + 1][c];
      if (!cands.some(e => e.k === 'l' && e.a === a && e.b === b)) cands.push({ k: 'l', a, b, cell: c });
    }
  }
  const sh = U.shuffle(r, cands);
  for (const e of sh) {
    if (find(e.a.id) === find(e.b.id)) continue;
    if (e.k === 'd') addDoor(e.a, e.b); else addLadder(e.a, e.b, e.cell);
  }
  // extra loops
  for (const e of sh) {
    if (e.k === 'd' && !doors.some(d => d.a === e.a.id && d.b === e.b.id) && r() < 0.5) addDoor(e.a, e.b);
    if (e.k === 'l' && !ladders.some(l => l.a === e.a.id && l.b === e.b.id) && r() < 0.18 && (ladderCount[e.a.id] || 0) < 2) addLadder(e.a, e.b, e.cell);
  }
  // roof ladder(s)
  const topRooms = byFloor[F - 1];
  const tr = U.pick(r, topRooms);
  addLadder(tr, roof, U.ri(r, tr.c0, tr.c1));

  // adjacency graph
  const adj = rooms.map(() => []);
  for (const d of doors) { adj[d.a].push({ to: d.b, k: 'door', x: d.x, f: d.f }); adj[d.b].push({ to: d.a, k: 'door', x: d.x, f: d.f }); }
  for (const l of ladders) { adj[l.a].push({ to: l.b, k: 'up', x: l.x, lad: l }); adj[l.b].push({ to: l.a, k: 'down', x: l.x, lad: l }); }

  // graph distance from start
  const dist = rooms.map(() => 1e9); dist[streetL.id] = 0;
  const q = [streetL.id];
  while (q.length) { const c = q.shift(); for (const e of adj[c]) if (dist[e.to] > dist[c] + 1) { dist[e.to] = dist[c] + 1; q.push(e.to); } }

  // ----- furniture -----
  for (const room of rooms) {
    const RT = ROOM_TYPES[room.type];
    const lx = ladders.filter(l => l.a === room.id || l.b === room.id).map(l => l.x);
    const blocked = lx.map(x => [x - 44, x + 44]);
    const fits = (x, w) => {
      if (x - w / 2 < room.x0 + WALL + 14 || x + w / 2 > room.x1 - WALL - 14) return false;
      for (const [a, b] of blocked) if (x + w / 2 > a && x - w / 2 < b) return false;
      return true;
    };
    const place = (kind, tries = 14) => {
      const F_ = FURN[kind];
      for (let t = 0; t < tries; t++) {
        const x = U.rf(r, room.x0 + WALL + F_.w / 2 + 14, room.x1 - WALL - F_.w / 2 - 14);
        if (!fits(x, F_.w)) continue;
        blocked.push([x - F_.w / 2 - 8, x + F_.w / 2 + 8]);
        const fu = { kind, x, w: F_.w, h: F_.h, loot: F_.loot, room: room.id, searched: false, prog: 0, items: null, id: room.id * 100 + room.furn.length, sdone: 0 };
        const ns = FURN_SEARCH[kind]; fu.smax = ns ? U.ri(r, ns[0], ns[1]) : 1;
        room.furn.push(fu);
        return fu;
      }
      return null;
    };
    room.place = place;
    const width = room.x1 - room.x0;
    const nF = room.outdoor ? U.ri(r, 1, 3) : Math.max(1, Math.round(width / 150) + U.ri(r, -1, 1));
    for (let i = 0; i < nF; i++) place(U.wpick(r, RT.furn));
    for (const dk of RT.decor) if (r() < 0.6) { const fu = place(dk, 6); if (fu) fu.decor = true; }
    // visual seeds
    room.seed = Math.floor(r() * 1e9);
    room.windows = !room.outdoor && (room.x0 === 0 || room.x1 === BW || r() < 0.4);
    room.blood = [];
    const nb = U.ri(r, 0, 3 + Math.floor(d / 6));
    for (let i = 0; i < nb; i++) room.blood.push({ x: U.rf(r, room.x0 + 30, room.x1 - 30), y: U.rf(r, 0.15, 0.95), s: U.rf(r, 0.5, 1.4), wall: r() < 0.5 });
    room.dark = r() < 0.25; // light broken
  }

  return { seed, theme, F, C, BW, rooms, byFloor, doors, ladders, adj, dist, start: streetL.id, streetL, streetR, roof, r };
}

// Find room on floor f containing x
function roomAt(map, f, x) {
  const list = map.byFloor[f];
  if (!list) return null;
  for (const rm of list) if (x >= rm.x0 && x < rm.x1) return rm;
  return null;
}
function hasDoor(map, f, x) {
  for (const d of map.doors) if (d.f === f && Math.abs(d.x - x) < 1) return true;
  return false;
}
