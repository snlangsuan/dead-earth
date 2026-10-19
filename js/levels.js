// ---------- Location levels ----------
// Every location has a level: stage n's locations run from Lv 2n-1 to Lv 2n+1 in the order you play them.
// The level (not the raw stage index) drives combat: how fast danger rises, its cap, which zombie types show up,
// their toughness / damage, wave size and whether a boss can appear at all. Loot still follows the stage.
const Levels = {
  loc(stageId, li) {
    const st = STAGE_BY_ID[stageId], prog = State.stageProg(stageId);
    const k = Math.max(0, prog.order.indexOf(li)), n = st.locs.length;
    return 1 + st.gi * 2 + Math.round(k * 2 / Math.max(1, n - 1));
  },
  // every location is its own building: 3–10 floors, fixed for that location (the tutorial building is the small one)
  floors(stageId, li) {
    const st = STAGE_BY_ID[stageId];
    if (st.gi === 0 && State.stageProg(stageId).order[0] === li) return 3;
    return 3 + (U.hash('floors:' + stageId + ':' + li) % 8);
  },
  range(stageId) { const st = STAGE_BY_ID[stageId]; return [1 + st.gi * 2, 3 + st.gi * 2]; },
  BOSS_FROM: 6,            // no boss below this location level
  BRUTE_FROM: 4, SPITTER_FROM: 3,
  bossHp(lv) { return 0.45 + lv * 0.035; },    // ×base HP: Lv6 0.66 · Lv20 1.15 · Lv40 1.85 · Lv70 2.9
  bossDmg(lv) { return 0.6 + lv * 0.012; },    // ×base damage: Lv6 0.67 · Lv30 0.96 · Lv70 1.44
  // per-run tuning from the level
  tune(lv) {
    return {
      dc: (lv - 1) / 2,                                   // combat difficulty (≈ old stage index)
      maxLevel: lv,                                       // danger climbs up to the location's own level, then stops
      dangerStep: 70 + Math.max(0, 50 - lv * 5),          // seconds of exploring per danger level (Lv1: 115 s)
      noiseK: Math.min(1, 0.35 + lv * 0.065),             // how much noise feeds danger (quiet early on)
      firstWave: Math.max(55, 120 - lv * 4),
    };
  },
};
