// ---------- Boot & main loop ----------
(function main() {
  const cv = document.getElementById('game');
  R.init(cv);
  Input.init(cv);
  let last = performance.now();
  function loop(now) {
    const raw = (now - last) / 1000, dt = Math.min(0.05, raw);
    last = now;
    R.perf(raw);
    try {
      if (Run.active || (Run.map && Run.panel === 'result')) {
        UIRun.update();
        Run.update(dt);
        R.frame(Run, dt);
      } else {
        R.frame(null, dt);
        if (UI.tab === 'map') UI.tickMap(now / 1000);
      }
    } catch (err) { console.error(err); }
    Input.endFrame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.addEventListener('beforeunload', () => { if (G && !Run.active) State.save(); });
  Override.init();
  Art.preload();
  const start = () => { const t0 = performance.now(); const wait = () => (Art.ready >= Art.total || performance.now() - t0 > 4000) ? UI.showTitle() : setTimeout(wait, 50); wait(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
