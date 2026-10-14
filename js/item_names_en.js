// English item names — used by the admin console search/autocomplete (and shown next to the Thai name)
const ITEM_EN = {
  reddot: 'Red Dot Sight', extmag_r: 'Rifle Extended Magazine', extmag_sg: 'Shotgun Tube Extension', silencer_r: 'Rifle Suppressor', grip_p: 'Rubber Pistol Grip',
  knife: 'Knife', bat: 'Baseball Bat', machete: 'Machete', fireaxe: 'Fire Axe', katana: 'Katana',
  pistol: '9mm Pistol', revolver: '.44 Revolver', smg: 'SMG Submachine Gun', shotgun: 'Shotgun', crossbow: 'Crossbow', rifle: 'Assault Rifle', sniper: 'Sniper Rifle',
  a9: '9mm Ammo Bullet', a44: '.44 Ammo Bullet', a12: 'Shotgun Shells Ammo', a556: '5.56 Rifle Ammo Bullet', a762: '7.62 Sniper Ammo Bullet', bolt: 'Crossbow Bolts Ammo',
  pack_school: 'School Bag Backpack', pack_day: 'Daypack Backpack', pack_hiking: 'Hiking Backpack', pack_duffel: 'Duffel Bag', pack_military: 'Military Backpack', pack_raid: 'Tactical Raid Backpack',
  repairkit: 'Weapon Repair Kit', grenade: 'Hand Grenade', pipebomb: 'Pipe Bomb', spiketrap: 'Nail Spike Trap', mine: 'Land Mine',
  gunparts: 'Gun Parts', scope: 'Scope', extmag: 'Extended Magazine', silencer: 'Silencer Suppressor', grip: 'Foregrip',
  scrap: 'Scrap Metal', cloth: 'Cloth', plank: 'Wood Plank', lockpick: 'Lockpick', nails: 'Nails', chem: 'Chemicals', elec: 'Electronics',
  canned: 'Canned Food', water: 'Bottled Water', bar: 'Chocolate Bar', mre: 'MRE Ration', stew: 'Hot Stew',
  bandage: 'Bandage', pills: 'Painkiller Pills', medkit: 'Medkit First Aid', antiviral: 'Antiviral Medicine', adrenaline: 'Adrenaline Shot',
  watch: 'Gold Watch', jewelry: 'Jewelry', laptop: 'Laptop', gold: 'Gold Bar', cash: 'Cash Money',
  fuse: 'Generator Fuse', datadrive: 'Research Data Drive', sample: 'Virus Sample', radio: 'Radio Parts',
  p_receiver: 'Gun Receiver Part', p_barrel: 'Gun Barrel Part', p_stock: 'Gun Stock Part', p_trigger: 'Trigger Assembly Part', p_spring: 'Spring Part', p_blade: 'Steel Blade Part', p_handle: 'Handle Part',
  key_military: 'Military Base Pass Key', key_lab: 'Secret Lab Keycard', key_police: 'Police Evidence Room Key',
};
function itemEn(id) {
  if (ITEM_EN[id]) return ITEM_EN[id];
  if (typeof ITEMS !== 'undefined' && ITEMS[id] && ITEMS[id].rank > 1) return (ITEM_EN[ITEMS[id].base] || ITEMS[id].base) + ' ' + ['', 'Mk I', 'Mk II', 'Mk III'][ITEMS[id].rank];
  if (id.startsWith('bp_')) return 'Blueprint ' + (ITEM_EN[id.slice(3)] || id.slice(3));
  if (id.startsWith('k_')) { const t = KeyGraph.byKey[id]; if (t) { const st = STAGE_BY_ID[t.stage]; return (t.kind === 'stage' ? 'Stage Pass ' : 'Location Keycard ') + st.id + (t.kind === 'loc' ? '#' + t.li : ''); } }
  return id;
}
