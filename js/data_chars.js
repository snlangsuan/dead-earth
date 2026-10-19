// ---------- Playable characters ----------
// mods: gunDmg, meleeDmg, meleeRate, spread, reload, heal, infRes, search, stam, crit, kbRes, lootBonus
const CHARACTERS = {
  jake:  { n: 'เจค', title: 'อดีตทหารพราน', starter: true, color: '#4a6b3a', hair: '#2b1d14', hp: 120, spd: 168, grid: [4, 4],
           mods: { gunDmg: 1.15, spread: 0.7, reload: 0.85 },
           perk: 'ยิงแม่นขึ้น 30% ความเสียหายปืน +15% รีโหลดไว',
           kit: { w: ['knife', 'pistol', null], items: [['a9', 48], ['bandage', 3], ['canned', 2]] } },
  maya:  { n: 'มายา', title: 'พยาบาลห้องฉุกเฉิน', starter: true, color: '#e8e8f0', hair: '#5a2e1a', hp: 100, spd: 172, grid: [4, 4],
           mods: { heal: 1.5, infRes: 0.5 },
           perk: 'ใช้ยาได้ผล +50% ติดเชื้อยากขึ้นครึ่งหนึ่ง',
           kit: { w: ['knife', 'pistol', null], items: [['a9', 24], ['bandage', 6], ['medkit', 1], ['pills', 2], ['canned', 2]] } },
  ton:   { n: 'ต้น', title: 'ไรเดอร์ส่งของ', starter: true, color: '#e67e22', hair: '#111', hp: 95, spd: 192, grid: [5, 4],
           mods: { stam: 1.6, search: 0.8 },
           perk: 'วิ่งเร็ว สตามินา +60% เป้ใหญ่กว่าคนอื่น',
           kit: { w: ['bat', 'pistol', null], items: [['a9', 24], ['canned', 3], ['water', 2], ['bandage', 3]] } },
  chan:  { n: 'ลุงชาญ', title: 'อดีตนักมวยไทย', color: '#c0392b', hair: '#ddd', hp: 145, spd: 166, grid: [4, 4], minStage: 1,
           mods: { meleeDmg: 1.6, meleeRate: 0.85, kbRes: 0.5 },
           perk: 'อาวุธระยะประชิดแรง +60% ตีไวขึ้น',
           kit: { w: ['machete', null, null], items: [['bandage', 3]] } },
  kenji: { n: 'เคนจิ', title: 'นักดาบเคนโด้', color: '#2c3e50', hair: '#0b0b0b', hp: 110, spd: 182, grid: [3, 5], minStage: 3,
           mods: { meleeDmg: 1.3, meleeRange: 1.2, meleeRate: 0.9 },
           perk: 'ระยะฟัน +20% ความเสียหายประชิด +30% เคลื่อนที่ไว',
           kit: { w: ['katana', null, null], items: [] } },
  sofia: { n: 'โซเฟีย', title: 'นักแม่นปืนโอลิมปิก', color: '#8e44ad', hair: '#d4a017', hp: 100, spd: 170, grid: [4, 4], minStage: 5,
           mods: { gunDmg: 1.25, crit: 0.2, spread: 0.6 },
           perk: 'โอกาสคริติคอล 20% (x2.5) ความเสียหายปืน +25%',
           kit: { w: [null, 'revolver', null], items: [['a44', 24]] } },
  joe:   { n: 'บิ๊กโจ', title: 'คนงานเหมือง', color: '#7f6a4f', hair: '#3b2a1a', hp: 185, spd: 148, grid: [6, 4], minStage: 8,
           mods: { kbRes: 0.2, meleeDmg: 1.2 },
           perk: 'เลือดมาก เป้ใหญ่ที่สุด ไม่ค่อยถูกผลักถอย แต่เดินช้า',
           kit: { w: ['fireaxe', null, null], items: [] } },
  lina:  { n: 'ลีน่า', title: 'วิศวกรรื้อถอน', color: '#16a085', hair: '#1a1a1a', hp: 100, spd: 170, grid: [6, 3], minStage: 4,
           mods: { search: 0.8, engineer: 1, trap: 1.5, blast: 1.3 },
           perk: 'ประดิษฐ์ระเบิดท่อ กับดักตะปู และทุ่นระเบิดกลางสนามได้ (กด C) ระเบิดและกับดักแรงขึ้น 50% รัศมีกว้างขึ้น 30%',
           kit: { w: ['knife', 'pistol', null], items: [['scrap', 6], ['chem', 3], ['nails', 8], ['plank', 2], ['mine', 1], ['spiketrap', 1]] } },
};

// ---------- Base specialists ----------
const ROLES = {
  doctor:   { n: 'หมอ', who: 'หมอวิทย์', icon: '🩺', desc: 'รักษาที่ฐานฟรี รักษาการติดเชื้อ ผลิตยา' },
  engineer: { n: 'นักพัฒนาอาวุธ', who: 'ช่างโอ๊ต', icon: '🔧', desc: 'อัปเกรดอาวุธ ติดตั้งอุปกรณ์เสริม สร้างปืนและกระสุน' },
  merchant: { n: 'พ่อค้า', who: 'เจ๊มาลี', icon: '💰', desc: 'ร้านค้ามีของมากขึ้น ขายของได้ราคาดีขึ้น' },
  cook:     { n: 'พ่อครัว', who: 'ลุงเปี๊ยก', icon: '🍳', desc: 'ทำอาหาร ออกสำรวจด้วยท้องอิ่มเต็มที่' },
  tailor:   { n: 'ช่างตัดเย็บ', who: 'พี่ฝน', icon: '🎒', desc: 'ขยายกระเป๋าเป้ให้ใส่ของได้มากขึ้น' },
  scout:    { n: 'หน่วยสอดแนม', who: 'น้องเหยี่ยว', icon: '🔭', desc: 'แสดงจุดเก็บของและซอมบี้บนแผนที่ย่อ' },
};
const GENERIC_NAMES = ['สมชาย', 'นภา', 'ก้อง', 'ปรีชา', 'แพรว', 'บุญมี', 'อร', 'ธนา', 'เมย์', 'ภูมิ', 'ดาว', 'เอก', 'จิ๊บ', 'ต่อ', 'ใบเตย', 'ชาลี', 'อันนา', 'มาร์โค', 'ยูกิ', 'ฮัสซัน', 'โอลิเวีย', 'ราจ', 'คาร์ลอส', 'อามีนา'];

// ---------- Zombies ----------
const ACID_G = 520;   // gravity on spat acid (px/s²)
const ZOMBIES = {
  walker:  { n: 'ซอมบี้', hp: 55, spd: 58, dmg: 10, atk: 1.0, inf: 0.18, r: 14, col: '#6f8f5c', sight: 330, score: 1 },
  runner:  { n: 'ซอมบี้วิ่ง', hp: 36, spd: 120, dmg: 6, atk: 0.6, inf: 0.1, r: 12, col: '#93a35a', sight: 380, score: 1 },
  brute:   { n: 'ยักษ์', hp: 340, spd: 46, dmg: 30, atk: 1.7, inf: 0.25, r: 22, col: '#556644', sight: 300, score: 3 },
  spitter: { n: 'นักพ่นกรด', hp: 75, spd: 52, dmg: 6, atk: 1.2, inf: 0.12, acid: 14, r: 14, col: '#a4c639', sight: 420, score: 2, ranged: true },
  boss:    { n: 'อสุรกายกลายพันธุ์', hp: 2600, spd: 74, dmg: 40, atk: 1.3, inf: 0.3, r: 34, col: '#7a3b3b', sight: 600, score: 20, boss: true },
};
