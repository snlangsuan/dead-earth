// ---------- Items ----------
// t: weapon | ammo | throw | part | attach | mat | food | med | val | quest | cash
// sz: backpack slots per stack, st: max stack, v: base value, tier: shop tier (null = never sold in shop)
const ITEMS = {
  // Melee
  knife:    { n: 'มีดพก', t: 'weapon', cls: 'melee', icon: '🔪', sz: 1, st: 1, v: 80, tier: 0, dmg: 20, rate: 0.32, range: 50, arc: 1.2, kb: 60, desc: 'เบา เร็ว ใช้ได้ตลอด' },
  bat:      { n: 'ไม้เบสบอล', t: 'weapon', cls: 'melee', icon: '🏏', sz: 2, st: 1, v: 160, tier: 0, dmg: 32, rate: 0.6, range: 62, arc: 1.6, kb: 150, desc: 'ตีกระเด็น วงกว้าง' },
  machete:  { n: 'มีดมาเชเต้', t: 'weapon', cls: 'melee', icon: '🗡️', sz: 2, st: 1, v: 450, tier: 1, dmg: 44, rate: 0.48, range: 64, arc: 1.4, kb: 90, desc: 'คมและเร็ว' },
  fireaxe:  { n: 'ขวานดับเพลิง', t: 'weapon', cls: 'melee', icon: '🪓', sz: 3, st: 1, v: 750, tier: null, dmg: 80, rate: 0.85, range: 66, arc: 1.5, kb: 220, desc: 'หนัก ทรงพลัง (หาได้ในด่านเท่านั้น)' },
  katana:   { n: 'คาตานะ', t: 'weapon', cls: 'melee', icon: '⚔️', sz: 3, st: 1, v: 1600, tier: null, dmg: 66, rate: 0.4, range: 76, arc: 1.8, kb: 110, desc: 'ดาบในตำนาน (หาได้ในด่านเท่านั้น)' },
  // Sidearms
  pistol:   { n: 'ปืนพก 9มม.', t: 'weapon', cls: 'pistol', icon: '🔫', sz: 2, st: 1, v: 320, tier: 0, ammo: 'a9', dmg: 24, rate: 0.26, mag: 12, reload: 1.2, spread: 0.05, spd: 950, range: 650, noise: 560, desc: 'ปืนพื้นฐาน' },
  revolver: { n: 'ลูกโม่ .44', t: 'weapon', cls: 'pistol', icon: '🔫', sz: 2, st: 1, v: 950, tier: null, ammo: 'a44', dmg: 64, rate: 0.55, mag: 6, reload: 2.0, spread: 0.03, spd: 1150, range: 760, noise: 760, pierce: 1, desc: 'แรงมาก ทะลุ 1 ตัว (หาได้ในด่านเท่านั้น)' },
  // Primaries
  smg:      { n: 'ปืนกลมือ', t: 'weapon', cls: 'primary', icon: '🔫', sz: 3, st: 1, v: 1300, tier: 1, ammo: 'a9', auto: true, dmg: 17, rate: 0.085, mag: 30, reload: 1.8, spread: 0.13, spd: 950, range: 600, noise: 640, desc: 'ยิงรัว ใช้กระสุน 9มม.' },
  shotgun:  { n: 'ลูกซอง', t: 'weapon', cls: 'primary', icon: '🔫', sz: 4, st: 1, v: 1650, tier: 1, ammo: 'a12', dmg: 15, pellets: 8, rate: 0.85, mag: 6, reload: 2.4, spread: 0.32, spd: 850, range: 380, noise: 820, desc: 'ระยะใกล้ทำลายล้าง' },
  crossbow: { n: 'หน้าไม้', t: 'weapon', cls: 'primary', icon: '🏹', sz: 3, st: 1, v: 1150, tier: 2, ammo: 'bolt', dmg: 95, rate: 1.0, mag: 1, reload: 0.9, spread: 0.015, spd: 900, range: 700, noise: 60, pierce: 2, desc: 'เงียบสนิท ทะลุ 2 ตัว' },
  rifle:    { n: 'ปืนไรเฟิลจู่โจม', t: 'weapon', cls: 'primary', icon: '🔫', sz: 4, st: 1, v: 2900, tier: null, ammo: 'a556', auto: true, dmg: 32, rate: 0.11, mag: 30, reload: 2.0, spread: 0.06, spd: 1250, range: 860, noise: 860, desc: 'อเนกประสงค์ (หาในด่าน/ช่างสร้าง)' },
  sniper:   { n: 'ปืนซุ่มยิง', t: 'weapon', cls: 'primary', icon: '🎯', sz: 5, st: 1, v: 4200, tier: null, ammo: 'a762', dmg: 160, rate: 1.25, mag: 5, reload: 2.8, spread: 0.008, spd: 1800, range: 1300, noise: 1000, pierce: 4, desc: 'นัดเดียวจอด ทะลุ 4 ตัว (หาได้ในด่านเท่านั้น)' },
  // Ammo
  a9:   { n: 'กระสุน 9มม.', t: 'ammo', icon: '🟨', sz: 1, st: 60, v: 2, tier: 0, pack: 30 },
  a44:  { n: 'กระสุน .44', t: 'ammo', icon: '🟧', sz: 1, st: 24, v: 7, tier: null },
  a12:  { n: 'กระสุนลูกซอง', t: 'ammo', icon: '🟥', sz: 1, st: 24, v: 5, tier: 1, pack: 12 },
  a556: { n: 'กระสุน 5.56', t: 'ammo', icon: '🟩', sz: 1, st: 60, v: 4, tier: 3, pack: 30 },
  a762: { n: 'กระสุน 7.62', t: 'ammo', icon: '🟦', sz: 1, st: 20, v: 12, tier: null },
  bolt: { n: 'ลูกดอกหน้าไม้', t: 'ammo', icon: '➶', sz: 1, st: 15, v: 8, tier: 2, pack: 10 },
  // Throwables
  // backpacks: equip one; its grid is your carrying space. tier = sold in shops (null = found only)
  pack_school:   { n: 'กระเป๋านักเรียน', t: 'bag', grid: [3, 4], icon: '🎒', sz: 1, st: 1, v: 120, tier: 0, desc: 'เป้ใบเล็ก 3×4 ช่อง' },
  pack_day:      { n: 'เป้เดินทาง', t: 'bag', grid: [4, 4], icon: '🎒', sz: 1, st: 1, v: 450, tier: 1, desc: 'เป้มาตรฐาน 4×4 ช่อง' },
  pack_hiking:   { n: 'เป้เดินป่า', t: 'bag', grid: [5, 4], icon: '🎒', sz: 1, st: 1, v: 1300, tier: 2, desc: 'เป้ใบใหญ่ 5×4 ช่อง' },
  pack_duffel:   { n: 'กระเป๋าดัฟเฟิล', t: 'bag', grid: [6, 3], icon: '👜', sz: 1, st: 1, v: 1100, tier: null, desc: 'กระเป๋ายาว 6×3 ช่อง — หาได้ในด่านเท่านั้น' },
  pack_military: { n: 'เป้ทหาร', t: 'bag', grid: [5, 5], icon: '🎒', sz: 1, st: 1, v: 2600, tier: null, desc: 'เป้ทหาร 5×5 ช่อง — หาได้ยาก ในคลังอาวุธ/กล่องเสบียง' },
  pack_raid:     { n: 'เป้จู่โจมยุทธวิธี', t: 'bag', grid: [6, 5], icon: '🎒', sz: 1, st: 1, v: 4500, tier: null, desc: 'เป้ใหญ่ที่สุด 6×5 ช่อง — หายากมาก บอสอาจทิ้งไว้' },
  repairkit: { n: 'ชุดซ่อมอาวุธ', t: 'tool', icon: '🧰', sz: 1, st: 5, v: 140, tier: 1, desc: 'ใช้ซ่อมอาวุธในด่าน: ชุดซ่อม 1 + เศษเหล็ก 2 (อาวุธประชิด) หรือ ชุดซ่อม 1 + ชิ้นส่วนปืน 1 + เศษเหล็ก 1 (ปืน) ยืนนิ่ง 4 วิ มีเสียง ซ่อม +40% (วิศวกร +60% และเร็วกว่า)' },
  grenade: { n: 'ระเบิดมือ', t: 'throw', icon: '💣', sz: 1, st: 3, v: 260, tier: 2, desc: 'ตั้งไว้ที่ปุ่มลัด (4–9) แล้วกดเพื่อขว้าง' },
  pipebomb: { n: 'ระเบิดท่อ', t: 'throw', icon: '🧨', sz: 1, st: 4, v: 150, tier: 1, desc: 'ตั้งไว้ที่ปุ่มลัด (4–9) แล้วกดเพื่อขว้าง แรงน้อยกว่าระเบิดมือเล็กน้อย' },
  spiketrap: { n: 'กับดักตะปู', t: 'throw', icon: '📌', sz: 1, st: 4, v: 80, tier: 1, trap: true, desc: 'ตั้งไว้ที่ปุ่มลัด (4–9) แล้วกดเพื่อวางที่พื้น ซอมบี้ที่เดินผ่านจะช้าลงและเสียเลือดต่อเนื่อง' },
  mine:    { n: 'ทุ่นระเบิด', t: 'throw', icon: '💥', sz: 1, st: 3, v: 220, tier: 2, trap: true, desc: 'ตั้งไว้ที่ปุ่มลัด (4–9) แล้วกดเพื่อวางที่พื้น ระเบิดเมื่อซอมบี้เหยียบ ความเสียหายเป็นวงกว้าง' },
  // Weapon parts & attachments
  gunparts: { n: 'ชิ้นส่วนปืน', t: 'part', icon: '⚙️', sz: 1, st: 20, v: 45, tier: 1, desc: 'ใช้อัปเกรด/สร้างอาวุธกับช่าง' },
  scope:    { n: 'กล้องเล็ง', t: 'attach', slot: 'scope', icon: '🔭', sz: 1, st: 1, v: 650, tier: null, desc: 'ความแม่น +40% ระยะ +30%' },
  extmag:   { n: 'แม็กกาซีนขยาย', t: 'attach', slot: 'mag', icon: '📦', sz: 1, st: 1, v: 520, tier: 2, desc: 'ความจุแม็ก +50%' },
  silencer: { n: 'ท่อเก็บเสียง', t: 'attach', slot: 'muzzle', icon: '🔇', sz: 1, st: 1, v: 720, tier: null, desc: 'เสียงปืน -75%' },
  grip:     { n: 'กริปจับ', t: 'attach', slot: 'grip', icon: '✊', sz: 1, st: 1, v: 420, tier: 1, desc: 'ลดการกระจาย 25% รีโหลดเร็วขึ้น' },
  // Materials
  scrap: { n: 'เศษเหล็ก', t: 'mat', icon: '🔩', sz: 1, st: 20, v: 10, tier: 0 },
  cloth: { n: 'ผ้า', t: 'mat', icon: '🧵', sz: 1, st: 20, v: 9, tier: 0 },
  plank: { n: 'ไม้กระดาน', t: 'mat', icon: '🪵', sz: 2, st: 8, v: 8, tier: 0, desc: 'ใช้สร้างและซ่อมบาริเคดที่ประตู/ช่องบันได' },
  lockpick: { n: 'กิ๊บสะเดาะกุญแจ', t: 'mat', icon: '🗝️', sz: 1, st: 10, v: 18, tier: 0, desc: 'ใช้สะเดาะตู้ ล็อกเกอร์ ตู้เซฟ และประตูร้านที่ล็อกไว้ (หักได้)' },
  nails: { n: 'ตะปู', t: 'mat', icon: '📌', sz: 1, st: 30, v: 4, tier: 0, desc: 'ใช้ตอกบาริเคด' },
  chem:  { n: 'สารเคมี', t: 'mat', icon: '🧪', sz: 1, st: 10, v: 32, tier: 1 },
  elec:  { n: 'ชิ้นส่วนอิเล็กทรอนิกส์', t: 'mat', icon: '🔌', sz: 1, st: 10, v: 38, tier: null },
  // Food
  canned: { n: 'อาหารกระป๋อง', t: 'food', icon: '🥫', sz: 1, st: 5, v: 40, tier: 0, food: 35 },
  water:  { n: 'น้ำดื่ม', t: 'food', icon: '💧', sz: 1, st: 5, v: 15, tier: 0, food: 12, stam: 100 },
  bar:    { n: 'ช็อกโกแลตบาร์', t: 'food', icon: '🍫', sz: 1, st: 10, v: 22, tier: 0, food: 14 },
  mre:    { n: 'เสบียงทหาร MRE', t: 'food', icon: '🍱', sz: 1, st: 3, v: 160, tier: null, food: 80, heal: 10 },
  stew:   { n: 'สตูว์ร้อน', t: 'food', icon: '🍲', sz: 1, st: 3, v: 200, tier: null, food: 100, heal: 25 },
  // Meds
  bandage:    { n: 'ผ้าพันแผล', t: 'med', icon: '🩹', sz: 1, st: 10, v: 30, tier: 0, heal: 20 },
  pills:      { n: 'ยาแก้ปวด', t: 'med', icon: '💊', sz: 1, st: 10, v: 65, tier: 0, heal: 8, regen: 30 },
  medkit:     { n: 'ชุดปฐมพยาบาล', t: 'med', icon: '⛑️', sz: 2, st: 3, v: 260, tier: 1, heal: 70 },
  antiviral:  { n: 'ยาต้านไวรัส', t: 'med', icon: '💉', sz: 1, st: 5, v: 620, tier: null, cure: 60 },
  adrenaline: { n: 'อะดรีนาลีน', t: 'med', icon: '⚡', sz: 1, st: 3, v: 420, tier: null, heal: 30, adren: 12 },
  // Valuables
  watch:   { n: 'นาฬิกาทอง', t: 'val', icon: '⌚', sz: 1, st: 5, v: 350, tier: null },
  jewelry: { n: 'เครื่องประดับ', t: 'val', icon: '💍', sz: 1, st: 5, v: 520, tier: null },
  laptop:  { n: 'แล็ปท็อป', t: 'val', icon: '💻', sz: 2, st: 1, v: 650, tier: null },
  gold:    { n: 'ทองคำแท่ง', t: 'val', icon: '🥇', sz: 1, st: 3, v: 1500, tier: null },
  // Quest items
  fuse:      { n: 'ฟิวส์เครื่องปั่นไฟ', t: 'quest', icon: '🔋', sz: 1, st: 1, v: 0 },
  datadrive: { n: 'ไดรฟ์ข้อมูลวิจัย', t: 'quest', icon: '💾', sz: 1, st: 1, v: 0 },
  sample:    { n: 'ตัวอย่างไวรัส', t: 'quest', icon: '🧫', sz: 1, st: 1, v: 0 },
  radio:     { n: 'ชิ้นส่วนวิทยุ', t: 'quest', icon: '📻', sz: 1, st: 1, v: 0 },
  // Money (never stored in backpack)
  cash: { n: 'เงินสด', t: 'cash', icon: '💵', sz: 0, st: 999999, v: 1 },
};

const TYPE_LABEL = { weapon: 'อาวุธ', ammo: 'กระสุน', throw: 'ระเบิด', part: 'ชิ้นส่วนอาวุธ', attach: 'อุปกรณ์เสริมปืน', mat: 'วัตถุดิบ', food: 'อาหาร', med: 'ยา', tool: 'เครื่องมือ', val: 'ของมีค่า', quest: 'ของภารกิจ', cash: 'เงิน', bag: 'กระเป๋าเป้', key: 'กุญแจ/คีย์' };
const SLOT_LABEL = ['อาวุธระยะประชิด', 'ปืนพก', 'อาวุธหลัก'];
const CLS_SLOT = { melee: 0, pistol: 1, primary: 2 };
const ATTACH_LABEL = { scope: 'กล้อง', mag: 'แม็ก', muzzle: 'ปากกระบอก', grip: 'กริป' };

// Loot tables: [itemId, weight, min, max]
const LOOT = {
  medcab:  [['bandage', 30, 1, 3], ['pills', 18, 1, 2], ['medkit', 8, 1, 1], ['antiviral', 2.5, 1, 1], ['chem', 10, 1, 2], ['adrenaline', 2, 1, 1], ['cash', 8]],
  fridge:  [['canned', 25, 1, 2], ['water', 25, 1, 3], ['bar', 20, 1, 3], ['mre', 4, 1, 1]],
  locker:  [['lockpick', 6, 1, 2], ['a9', 20, 8, 24], ['a12', 9, 4, 10], ['a556', 5, 10, 25], ['a44', 4, 4, 10], ['a762', 2, 3, 6], ['bolt', 3, 3, 6], ['gunparts', 14, 1, 3], ['knife', 4, 1, 1], ['pistol', 3, 1, 1], ['machete', 2, 1, 1], ['grip', 1.5, 1, 1], ['extmag', 1.5, 1, 1], ['scope', 1, 1, 1], ['silencer', 0.8, 1, 1], ['cloth', 8, 1, 3], ['cash', 10], ['watch', 3, 1, 1]],
  toolbox: [['lockpick', 9, 1, 2], ['plank', 14, 1, 3], ['nails', 18, 3, 8], ['scrap', 30, 1, 4], ['gunparts', 18, 1, 3], ['elec', 12, 1, 2], ['cloth', 10, 1, 3], ['chem', 8, 1, 2], ['pipebomb', 3, 1, 1], ['fireaxe', 2, 1, 1], ['grip', 1.5, 1, 1]],
  crate:   [['plank', 12, 1, 2], ['nails', 8, 2, 6], ['canned', 10, 1, 2], ['water', 8, 1, 2], ['a9', 10, 8, 20], ['a12', 6, 3, 8], ['bandage', 8, 1, 2], ['scrap', 12, 1, 3], ['cloth', 10, 1, 3], ['gunparts', 8, 1, 2], ['grenade', 2.5, 1, 1], ['cash', 8]],
  register:[['cash', 60], ['watch', 8, 1, 1], ['jewelry', 5, 1, 1], ['bar', 10, 1, 2]],
  body:    [['lockpick', 6, 1, 1], ['cash', 15], ['a9', 12, 5, 15], ['bandage', 10, 1, 2], ['canned', 8, 1, 1], ['watch', 4, 1, 1], ['jewelry', 3, 1, 1], ['pistol', 2.5, 1, 1], ['knife', 4, 1, 1], ['pills', 6, 1, 2], ['antiviral', 0.8, 1, 1]],
  car:     [['scrap', 15, 1, 3], ['water', 10, 1, 2], ['cash', 12], ['a9', 6, 5, 15], ['bandage', 6, 1, 2], ['elec', 8, 1, 2], ['bat', 3, 1, 1], ['laptop', 3, 1, 1]],
  weapons: [['a556', 20, 15, 40], ['a9', 15, 15, 40], ['a12', 12, 6, 14], ['a762', 8, 4, 10], ['grenade', 8, 1, 2], ['mine', 3, 1, 1], ['rifle', 3, 1, 1], ['smg', 4, 1, 1], ['shotgun', 4, 1, 1], ['sniper', 1.2, 1, 1], ['scope', 4, 1, 1], ['silencer', 3, 1, 1], ['extmag', 4, 1, 1], ['mre', 10, 1, 2], ['gunparts', 12, 2, 4], ['revolver', 2, 1, 1]],
  desk:    [['lockpick', 7, 1, 2], ['cash', 15], ['elec', 15, 1, 2], ['laptop', 6, 1, 1], ['pills', 8, 1, 2], ['bar', 10, 1, 2], ['watch', 4, 1, 1], ['cloth', 6, 1, 2]],
  safe:    [['gold', 18, 1, 1], ['jewelry', 25, 1, 2], ['cash', 40], ['watch', 20, 1, 2], ['katana', 2.5, 1, 1], ['revolver', 3, 1, 1], ['a44', 6, 6, 12]],
  bed:     [['cash', 20], ['cloth', 12, 1, 3], ['pills', 8, 1, 1], ['bar', 10, 1, 2], ['watch', 4, 1, 1], ['jewelry', 3, 1, 1], ['a9', 6, 4, 12], ['bandage', 6, 1, 2], ['knife', 2, 1, 1]],
  wardrobe:[['lockpick', 4, 1, 1], ['cloth', 25, 1, 4], ['cash', 15], ['jewelry', 6, 1, 1], ['watch', 6, 1, 1], ['bat', 3, 1, 1], ['a12', 3, 3, 6]],
  lab:     [['chem', 25, 1, 3], ['elec', 15, 1, 2], ['antiviral', 4, 1, 1], ['medkit', 5, 1, 1], ['pills', 10, 1, 2], ['adrenaline', 3, 1, 1], ['laptop', 3, 1, 1]],
  shop:    [['canned', 14, 1, 2], ['water', 14, 1, 2], ['bar', 14, 1, 3], ['bandage', 8, 1, 2], ['cloth', 8, 1, 2], ['elec', 6, 1, 1], ['scrap', 8, 1, 2], ['cash', 8], ['pills', 5, 1, 1]],
  supply:  [['medkit', 15, 1, 1], ['mre', 15, 1, 2], ['a556', 10, 20, 40], ['grenade', 10, 1, 2], ['gunparts', 15, 2, 5], ['antiviral', 6, 1, 1], ['extmag', 5, 1, 1], ['a9', 10, 20, 40], ['a12', 8, 8, 16]],
};

// ---------- Weapon parts & blueprints ----------
Object.assign(ITEMS, {
  p_receiver: { n: 'โครงปืน', t: 'part', icon: '🔧', sz: 1, st: 5, v: 140, tier: 2, desc: 'ชิ้นส่วนหลักสำหรับประกอบปืน' },
  p_barrel:   { n: 'ลำกล้องปืน', t: 'part', icon: '🔩', sz: 1, st: 5, v: 120, tier: 2, desc: 'ใช้ประกอบปืน / อัปเกรดปืนระดับสูง' },
  p_stock:    { n: 'พานท้าย', t: 'part', icon: '🪵', sz: 1, st: 5, v: 90, tier: 1, desc: 'ใช้ประกอบปืนยาว' },
  p_trigger:  { n: 'ชุดไกปืน', t: 'part', icon: '⚙️', sz: 1, st: 10, v: 80, tier: 1, desc: 'ใช้ประกอบปืนทุกชนิด' },
  p_spring:   { n: 'สปริง', t: 'part', icon: '🌀', sz: 1, st: 10, v: 50, tier: 0, desc: 'ใช้ประกอบ / อัปเกรดปืน' },
  p_blade:    { n: 'ใบมีดเหล็กกล้า', t: 'part', icon: '🗡️', sz: 1, st: 5, v: 110, tier: 1, desc: 'ใช้ประกอบ / อัปเกรดอาวุธประชิด' },
  p_handle:   { n: 'ด้ามจับ', t: 'part', icon: '🪓', sz: 1, st: 10, v: 40, tier: 0, desc: 'ใช้ประกอบอาวุธประชิด' },
});
const BLUEPRINT_WEAPONS = ['pistol', 'machete', 'shotgun', 'smg', 'crossbow', 'revolver', 'fireaxe', 'rifle', 'katana', 'sniper'];
for (const w of BLUEPRINT_WEAPONS) ITEMS['bp_' + w] = { n: 'พิมพ์เขียว ' + ITEMS[w].n, t: 'blueprint', icon: '📘', sz: 1, st: 1, v: Math.round(ITEMS[w].v * 0.6), tier: null, bp: w, desc: 'นำกลับฐานเพื่อเรียนรู้วิธีประกอบ ' + ITEMS[w].n };
TYPE_LABEL.blueprint = 'พิมพ์เขียว';
// Assembly recipes (cost in stash items + money)
const WEAPON_RECIPES = {
  knife:    { cost: { p_blade: 1, p_handle: 1 } },
  bat:      { cost: { p_handle: 1, scrap: 3 } },
  machete:  { cost: { p_blade: 2, p_handle: 1, scrap: 2 }, money: 100 },
  fireaxe:  { cost: { p_blade: 2, p_handle: 2, scrap: 4 }, money: 200 },
  katana:   { cost: { p_blade: 3, p_handle: 1, cloth: 2 }, money: 500 },
  pistol:   { cost: { p_receiver: 1, p_barrel: 1, p_trigger: 1, p_spring: 1, gunparts: 2 }, money: 100 },
  revolver: { cost: { p_receiver: 1, p_barrel: 1, p_trigger: 1, gunparts: 3 }, money: 250 },
  smg:      { cost: { p_receiver: 1, p_barrel: 1, p_trigger: 1, p_spring: 2, p_stock: 1, gunparts: 3 }, money: 300 },
  shotgun:  { cost: { p_receiver: 1, p_barrel: 2, p_stock: 1, p_trigger: 1, gunparts: 3 }, money: 300 },
  crossbow: { cost: { p_stock: 1, p_trigger: 1, p_spring: 2, scrap: 4, cloth: 2 }, money: 150 },
  rifle:    { cost: { p_receiver: 2, p_barrel: 1, p_stock: 1, p_trigger: 1, p_spring: 1, gunparts: 5 }, money: 600 },
  sniper:   { cost: { p_receiver: 2, p_barrel: 2, p_stock: 1, p_trigger: 1, gunparts: 6 }, money: 900 },
};
// Loot additions: parts in containers, 'bp' = a random blueprint the player doesn't know yet
LOOT.locker.push(['p_trigger', 5, 1, 1], ['p_spring', 6, 1, 2], ['p_handle', 3, 1, 1], ['bp', 1.2]);
LOOT.toolbox.push(['p_spring', 10, 1, 2], ['p_handle', 9, 1, 2], ['p_blade', 5, 1, 1], ['p_trigger', 4, 1, 1], ['bp', 0.8]);
LOOT.weapons.push(['p_receiver', 6, 1, 1], ['p_barrel', 6, 1, 1], ['p_stock', 6, 1, 1], ['p_trigger', 6, 1, 1], ['bp', 5]);
LOOT.crate.push(['p_handle', 4, 1, 1], ['p_spring', 3, 1, 1], ['p_stock', 1.5, 1, 1]);
LOOT.car.push(['p_spring', 6, 1, 2], ['p_receiver', 1, 1, 1]);
LOOT.body.push(['p_trigger', 2, 1, 1], ['bp', 0.6]);
LOOT.desk.push(['bp', 1.5]);
LOOT.safe.push(['bp', 6], ['p_receiver', 4, 1, 1]);
LOOT.supply.push(['bp', 6], ['p_barrel', 6, 1, 1], ['p_receiver', 5, 1, 1]);
LOOT.wardrobe.push(['p_handle', 3, 1, 1], ['pack_school', 1.2, 1, 1]);
LOOT.toolbox.push(['repairkit', 7, 1, 1]); LOOT.weapons.push(['repairkit', 5, 1, 2]); LOOT.crate.push(['repairkit', 2, 1, 1]); LOOT.supply.push(['repairkit', 6, 1, 2]);
// backpacks are rare finds
LOOT.locker.push(['pack_duffel', 0.9, 1, 1], ['pack_day', 0.8, 1, 1]);
LOOT.weapons.push(['pack_military', 1.0, 1, 1]);
LOOT.supply.push(['pack_military', 2.2, 1, 1], ['pack_raid', 0.5, 1, 1], ['pack_hiking', 1.5, 1, 1]);
LOOT.car.push(['pack_duffel', 0.8, 1, 1], ['pack_hiking', 0.4, 1, 1]);
LOOT.body.push(['pack_school', 0.7, 1, 1], ['pack_day', 0.4, 1, 1]);

// Backpack block shapes [width, height] (default 1x1). sz = number of blocks.
const SHAPES = {
  knife: [2, 1], bat: [3, 1], machete: [3, 1], fireaxe: [3, 1], katana: [4, 1],
  pistol: [2, 1], revolver: [2, 1], smg: [2, 2], shotgun: [4, 1], crossbow: [3, 2], rifle: [4, 1], sniper: [4, 2],
  medkit: [2, 1], laptop: [2, 2], pack_school: [2, 2], pack_day: [2, 2], pack_hiking: [2, 3], pack_duffel: [3, 2], pack_military: [2, 3], pack_raid: [3, 3], plank: [2, 1], water: [1, 2], mre: [2, 1], stew: [1, 1], gold: [1, 1],
};
for (const id in ITEMS) { const s = SHAPES[id] || [1, 1]; ITEMS[id].gw = s[0]; ITEMS[id].gh = s[1]; if (ITEMS[id].t !== 'cash') ITEMS[id].sz = s[0] * s[1]; }
