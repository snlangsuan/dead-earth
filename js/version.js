// ---------- Game version ----------
// GAME_VERSION: bump by hand when a release goes out. GAME_BUILD comes from js/build_info.js, which the GitHub Pages
// workflow rewrites with the commit being deployed (locally it stays null and the title screen says "dev").
window.GAME_VERSION = '0.10.0';
window.versionLabel = function () {
  const b = window.GAME_BUILD;
  if (!b || !b.sha) return 'v' + GAME_VERSION + ' · dev';
  const d = b.date ? new Date(b.date) : null, ds = d && !isNaN(d) ? d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '';
  return 'v' + GAME_VERSION + ' · build ' + b.sha.slice(0, 7) + (ds ? ' · ' + ds : '');
};
