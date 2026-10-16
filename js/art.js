// ---------- Illustrated SVG sprite art ----------
// All in-world art is authored as SVG (cartoon style: thick outline, cel shading, gradients)
// and rasterised once into Image objects at 2x resolution.
const OL = '#1e2227';
const Art = {
  cache: {}, ready: 0, total: 0,
  st(fill, w) { return `fill="${fill}" stroke="${OL}" stroke-width="${(w || 2.5) * 0.75}" stroke-linejoin="round" stroke-linecap="round"`; },
  lg(id, c1, c2, horiz) { return `<linearGradient id="${id}" x1="0" y1="0" x2="${horiz ? 1 : 0}" y2="${horiz ? 0 : 1}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`; },
  make(key, w, h, body, pad, muted) {
    if (this.cache[key]) return this.cache[key];
    pad = pad == null ? 4 : pad;
    if (muted) body = `<defs><filter id="mu" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="${muted}"/><feComponentTransfer><feFuncR type="linear" slope=".9"/><feFuncG type="linear" slope=".92"/><feFuncB type="linear" slope=".96"/></feComponentTransfer></filter></defs><g filter="url(#mu)">${body}</g>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${(w + pad * 2) * 2}" height="${(h + pad * 2) * 2}" viewBox="${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}">${body}</svg>`;
    const img = new Image();
    this.total++;
    img.onload = () => { this.ready++; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const o = { img, w, h, pad };
    this.cache[key] = o;
    return o;
  },
  draw(ctx, o, x, y, w, h) {
    if (!o || !o.img.complete || !o.img.naturalWidth) return false;
    const sx = (w || o.w) / o.w, sy = (h || o.h) / o.h;
    ctx.drawImage(o.img, x - o.pad * sx, y - o.pad * sy, (o.w + o.pad * 2) * sx, (o.h + o.pad * 2) * sy);
    return true;
  },
};

// ---------- Furniture ----------
const FURN_ART = {
  bed: (w, h, v) => {
    const blanket = ['#4f6d8f', '#8f4f5a', '#5a7a4a', '#7a5a8f'][v % 4];
    return `<defs>${Art.lg('wd', '#8a6238', '#5a3c20')}${Art.lg('bl', blanket, U.shade(blanket, -40))}</defs>
    <rect x="16" y="40" width="7" height="6" ${Art.st('#3a2614')}/><rect x="104" y="40" width="7" height="6" ${Art.st('#3a2614')}/>
    <path d="M2 44 V12 Q2 2 10 2 Q18 2 18 12 V44Z" ${Art.st('url(#wd)')}/><path d="M6 12 Q6 7 10 7" stroke="rgba(255,255,255,.3)" stroke-width="2" fill="none"/>
    <path d="M106 44 V22 Q106 16 112 16 Q118 16 118 22 V44Z" ${Art.st('url(#wd)')}/>
    <rect x="14" y="30" width="96" height="11" rx="2" ${Art.st('#5e4026')}/>
    <rect x="16" y="20" width="92" height="12" rx="5" ${Art.st('#ece6d6')}/>
    <path d="M20 22 Q18 13 30 12 Q44 11 44 18 Q45 25 32 25 Q22 26 20 22Z" ${Art.st('#fbf8f0')}/><path d="M26 16 Q32 14 38 16" stroke="#cfc8b8" stroke-width="1.5" fill="none"/>
    <path d="M46 17 H102 Q109 17 109 24 V33 H46 Q39 25 46 17Z" ${Art.st('url(#bl)')}/>
    <path d="M60 19 Q65 26 58 33 M80 18 Q86 26 79 33 M96 18 Q100 26 96 33" stroke="rgba(0,0,0,.25)" stroke-width="2" fill="none"/>
    <path d="M48 20 H100" stroke="rgba(255,255,255,.25)" stroke-width="2"/>`;
  },
  bunk: (w, h) => `<defs>${Art.lg('mt', '#8a929c', '#5a626c', true)}</defs>
    ${[0, 1].map(i => { const y = i ? 70 : 20; return `<rect x="8" y="${y}" width="94" height="10" rx="3" ${Art.st('#e3ddcf')}/><path d="M12 ${y} Q12 ${y - 8} 24 ${y - 8} Q34 ${y - 8} 34 ${y}Z" ${Art.st('#f7f3ea')}/><path d="M38 ${y - 3} H96 Q100 ${y - 3} 100 ${y + 1} V${y + 8} H38Z" ${Art.st(i ? '#5a6a4a' : '#4a5a6a')}/><rect x="6" y="${y + 9}" width="98" height="5" ${Art.st('#6a7078')}/>`; }).join('')}
    <rect x="2" y="2" width="7" height="110" rx="2" ${Art.st('url(#mt)')}/><rect x="101" y="2" width="7" height="110" rx="2" ${Art.st('url(#mt)')}/>
    <path d="M86 34 V84 M98 34 V84" stroke="${OL}" stroke-width="3"/>${[42, 52, 62].map(y => `<path d="M86 ${y} H98" stroke="#7a8088" stroke-width="3"/>`).join('')}`,
  sofa: (w, h, v) => { const c = ['#8a3c3c', '#3c5a8a', '#5a7a3c', '#7a5a3c'][v % 4]; return `<defs>${Art.lg('sf', U.shade(c, 20), U.shade(c, -30))}</defs>
    <path d="M10 4 H100 Q106 4 106 12 V28 H4 V12 Q4 4 10 4Z" ${Art.st('url(#sf)')}/>
    <path d="M4 22 H106 Q110 22 110 28 V42 H0 V28 Q0 22 4 22Z" ${Art.st(U.shade(c, -10))}/>
    <path d="M-4 18 Q-4 14 2 14 Q8 14 8 18 V44 H-4Z" ${Art.st(U.shade(c, -25))}/><path d="M102 18 Q102 14 108 14 Q114 14 114 18 V44 H102Z" ${Art.st(U.shade(c, -25))}/>
    <path d="M55 6 V26 M30 24 Q33 30 30 36 M80 24 Q83 30 80 36" stroke="rgba(0,0,0,.25)" stroke-width="2" fill="none"/>
    <rect x="6" y="42" width="6" height="7" ${Art.st('#222')}/><rect x="98" y="42" width="6" height="7" ${Art.st('#222')}/>`; },
  wardrobe: () => `<defs>${Art.lg('wr', '#8a6238', '#553a20', true)}</defs>
    <rect x="1" y="4" width="64" height="112" rx="3" ${Art.st('url(#wr)')}/><rect x="-1" y="0" width="68" height="8" rx="2" ${Art.st('#6a4a2a')}/>
    <rect x="5" y="12" width="26" height="96" rx="2" ${Art.st('#7a5530', 2)}/><rect x="35" y="12" width="26" height="96" rx="2" ${Art.st('#7a5530', 2)}/>
    <rect x="9" y="18" width="18" height="40" rx="1" fill="rgba(0,0,0,.12)"/><rect x="39" y="18" width="18" height="40" rx="1" fill="rgba(0,0,0,.12)"/>
    <circle cx="28" cy="62" r="2.5" ${Art.st('#e0b860', 1.5)}/><circle cx="38" cy="62" r="2.5" ${Art.st('#e0b860', 1.5)}/>
    <rect x="4" y="114" width="6" height="6" ${Art.st('#3a2614')}/><rect x="56" y="114" width="6" height="6" ${Art.st('#3a2614')}/>`,
  rack: (w, h, v) => { const r = U.rng(v + 5); return `<path d="M6 92 V4 H84 V92" fill="none" stroke="${OL}" stroke-width="6"/><path d="M6 92 V4 H84 V92" fill="none" stroke="#a8b0b8" stroke-width="3"/>
    ${[0, 1, 2, 3, 4, 5].map(i => { const c = U.pick(r, ['#b03a4a', '#3a6ab0', '#e0c050', '#3a9a6a', '#2a2a2a', '#ddd', '#9a5ab0']); const L = 44 + r() * 18; const x = 10 + i * 12; return `<path d="M${x + 5} 4 V8" stroke="${OL}" stroke-width="2"/><path d="M${x} 10 Q${x + 5} 6 ${x + 11} 10 L${x + 12} ${10 + L} H${x - 1}Z" ${Art.st(c, 2)}/><path d="M${x + 2} 14 V${6 + L}" stroke="rgba(255,255,255,.2)" stroke-width="2"/>`; }).join('')}
    <rect x="0" y="88" width="14" height="5" ${Art.st('#555')}/><rect x="76" y="88" width="14" height="5" ${Art.st('#555')}/>`; },
  desk: (w, h, v) => `<defs>${Art.lg('dk', '#9a7048', '#6a4a2a')}${Art.lg('scr', '#3a6a8a', '#1a3a5a')}</defs>
    <rect x="4" y="12" width="9" height="38" ${Art.st('#5a3c22')}/>
    <rect x="58" y="12" width="34" height="38" rx="2" ${Art.st('#6a4a2a')}/><rect x="62" y="16" width="26" height="12" rx="1" ${Art.st('#7a5634', 1.5)}/><rect x="62" y="32" width="26" height="12" rx="1" ${Art.st('#7a5634', 1.5)}/>
    <rect x="71" y="21" width="8" height="2.5" fill="#d4b06a"/><rect x="71" y="37" width="8" height="2.5" fill="#d4b06a"/>
    <rect x="0" y="4" width="96" height="9" rx="2" ${Art.st('url(#dk)')}/>
    <rect x="16" y="-22" width="34" height="24" rx="2" ${Art.st('#2a2e33')}/><rect x="19" y="-19" width="28" height="17" fill="url(#scr)"/><path d="M22 -16 L30 -6" stroke="rgba(255,255,255,.25)" stroke-width="2"/>
    <rect x="30" y="1" width="6" height="4" fill="${OL}"/><rect x="58" y="-2" width="24" height="6" rx="1" ${Art.st('#ddd', 1.5)}/>
    <path d="M86 4 V-10 L80 -16" fill="none" stroke="${OL}" stroke-width="3"/><path d="M74 -20 L86 -14 L80 -10Z" ${Art.st('#3a7a5a', 2)}/>`,
  filecab: () => `<defs>${Art.lg('fc', '#9aa2aa', '#6a727a', true)}</defs><rect x="1" y="1" width="44" height="84" rx="3" ${Art.st('url(#fc)')}/>
    ${[0, 1, 2].map(i => `<rect x="5" y="${6 + i * 27}" width="36" height="22" rx="2" ${Art.st('#a8b0b8', 2)}/><rect x="16" y="${13 + i * 27}" width="14" height="4" rx="1" ${Art.st('#444', 1.2)}/>`).join('')}`,
  bookshelf: (w, h, v) => { const r = U.rng(v + 11); return `<defs>${Art.lg('bs', '#7a5232', '#4a3018', true)}</defs><rect x="1" y="1" width="76" height="126" rx="2" ${Art.st('url(#bs)')}/>
    ${[0, 1, 2, 3].map(s => { const sy = 6 + s * 30; let x = 6, out = ''; while (x < 68) { const bw = 5 + r() * 6, bh = 15 + r() * 9, c = U.pick(r, ['#8a3a3a', '#3a5a8a', '#3a7a4a', '#b08a40', '#5a3a6a', '#d8d0c0', '#2a4a4a']); if (r() < 0.12) { out += `<path d="M${x} ${sy + 24} L${x + 8} ${sy + 24 - bh + 4} L${x + 13} ${sy + 24 - bh + 6} L${x + 6} ${sy + 24}Z" ${Art.st(c, 1.5)}/>`; x += 14; continue; } out += `<rect x="${x}" y="${sy + 24 - bh}" width="${bw}" height="${bh}" ${Art.st(c, 1.5)}/><rect x="${x + 1}" y="${sy + 27 - bh}" width="${bw - 2}" height="2" fill="rgba(255,255,255,.35)"/>`; x += bw + 0.5; } return out + `<rect x="3" y="${sy + 24}" width="72" height="5" ${Art.st('#3a2410', 2)}/>`; }).join('')}`; },
  tvstand: () => `<defs>${Art.lg('tv', '#2a3a4a', '#0e1620')}</defs><rect x="2" y="38" width="88" height="30" rx="2" ${Art.st('#5a4030')}/><rect x="8" y="44" width="34" height="18" ${Art.st('#4a3424', 1.5)}/><rect x="50" y="44" width="34" height="18" ${Art.st('#4a3424', 1.5)}/>
    <rect x="12" y="0" width="68" height="40" rx="3" ${Art.st('#1a1d21')}/><rect x="16" y="4" width="60" height="31" fill="url(#tv)"/><path d="M22 10 L42 30 M30 8 L46 24" stroke="rgba(255,255,255,.15)" stroke-width="3"/><path d="M44 18 L52 12 L48 22 L56 26" stroke="#9ad" stroke-width="1" fill="none" opacity=".6"/>`,
  fridge: () => `<defs>${Art.lg('fr', '#e4ecf0', '#a8b6be', true)}</defs><rect x="1" y="1" width="54" height="116" rx="6" ${Art.st('url(#fr)')}/>
    <path d="M1 42 H55" stroke="${OL}" stroke-width="2.5"/><rect x="44" y="12" width="5" height="22" rx="2" ${Art.st('#8a969e', 1.5)}/><rect x="44" y="52" width="5" height="34" rx="2" ${Art.st('#8a969e', 1.5)}/>
    <rect x="8" y="58" width="12" height="14" ${Art.st('#f0d060', 1.2)} transform="rotate(-6 14 65)"/><circle cx="26" cy="64" r="3" fill="#d33"/><path d="M6 8 V36" stroke="rgba(255,255,255,.7)" stroke-width="3"/>`,
  counter: (w, h, v) => `<defs>${Art.lg('ct', '#8a6a4a', '#5a4026')}</defs><rect x="2" y="8" width="116" height="48" ${Art.st('url(#ct)')}/>
    ${[0, 1, 2].map(i => `<rect x="${7 + i * 37}" y="14" width="32" height="36" rx="2" ${Art.st('#7a5a3a', 2)}/><rect x="${19 + i * 37}" y="20" width="8" height="2.5" rx="1" fill="#d4b06a"/>`).join('')}
    <rect x="0" y="2" width="120" height="8" rx="2" ${Art.st('#bab4aa')}/>
    <path d="M14 2 V-12 H32 V2" ${Art.st('#d8d8d8', 2)}/><path d="M18 -12 V-16 H28 V-12" ${Art.st('#999', 1.5)}/>
    <ellipse cx="68" cy="-1" rx="14" ry="3" ${Art.st('#ccc', 2)}/><path d="M90 2 L92 -12 H102 L104 2Z" ${Art.st('#c0392b', 2)}/>`,
  stove: () => `<defs>${Art.lg('sv', '#6a7178', '#3e444a')}</defs><rect x="1" y="1" width="58" height="56" rx="3" ${Art.st('url(#sv)')}/><rect x="6" y="18" width="48" height="32" rx="3" ${Art.st('#1a1d21', 2)}/><rect x="10" y="22" width="40" height="5" fill="rgba(255,140,40,.25)"/>
    <circle cx="12" cy="9" r="3.5" ${Art.st('#222', 1.5)}/><circle cx="24" cy="9" r="3.5" ${Art.st('#222', 1.5)}/><circle cx="48" cy="9" r="3.5" ${Art.st('#222', 1.5)}/><rect x="16" y="-10" width="28" height="12" rx="2" ${Art.st('#888', 2)}/>`,
  medcab: () => `<defs>${Art.lg('mc', '#f4f6f8', '#c4ccd2', true)}</defs><rect x="1" y="1" width="58" height="102" rx="4" ${Art.st('url(#mc)')}/>
    <path d="M30 4 V100" stroke="#9aa4ac" stroke-width="2"/><rect x="5" y="8" width="21" height="38" rx="2" fill="rgba(140,200,230,.35)" stroke="#9aa4ac" stroke-width="1.5"/><rect x="34" y="8" width="21" height="38" rx="2" fill="rgba(140,200,230,.35)" stroke="#9aa4ac" stroke-width="1.5"/>
    <rect x="8" y="30" width="6" height="12" rx="1" fill="#e67e22"/><rect x="16" y="34" width="6" height="8" rx="1" fill="#2e86c1"/><rect x="38" y="28" width="5" height="14" rx="1" fill="#27ae60"/>
    <path d="M24 62 H36 V56 H42 V68 H36 V74 H42 V80 H36 V86 H24 V80 H18 V68 H24Z" fill="none"/><path d="M26 58 H34 V66 H42 V74 H34 V82 H26 V74 H18 V66 H26Z" ${Art.st('#d63031', 2)}/>`,
  hospbed: () => `<defs>${Art.lg('hb', '#e8eef2', '#b8c4cc')}</defs>
    <path d="M110 -18 V30" stroke="${OL}" stroke-width="4"/><path d="M110 -18 V30" stroke="#ccd" stroke-width="2"/><path d="M102 -26 H118 V-12 Q110 -6 102 -12Z" ${Art.st('rgba(180,220,240,.8)', 2)}/><path d="M110 -6 Q96 6 84 18" stroke="#9cc" stroke-width="1.5" fill="none"/>
    <rect x="2" y="22" width="112" height="7" rx="2" ${Art.st('#9aa6b0')}/><rect x="10" y="28" width="5" height="22" ${Art.st('#7a8690', 1.5)}/><rect x="100" y="28" width="5" height="22" ${Art.st('#7a8690', 1.5)}/>
    <circle cx="12" cy="51" r="3.5" ${Art.st('#333', 1.5)}/><circle cx="103" cy="51" r="3.5" ${Art.st('#333', 1.5)}/>
    <rect x="4" y="12" width="108" height="11" rx="4" ${Art.st('url(#hb)')}/><path d="M8 13 Q8 4 20 4 Q32 4 32 12Z" ${Art.st('#fff')}/><path d="M36 9 H106 Q112 9 112 15 V22 H36 Q32 15 36 9Z" ${Art.st('#8ab8d8')}/>
    <path d="M0 2 V30 M2 2 V12" stroke="${OL}" stroke-width="3"/>`,
  labtable: (w, h, v) => { const r = U.rng(v + 3); return `<defs>${Art.lg('lt', '#b8c4cc', '#7a8890')}</defs><rect x="4" y="10" width="102" height="44" ${Art.st('url(#lt)')}/><rect x="10" y="16" width="40" height="32" rx="2" ${Art.st('#8a98a0', 2)}/><rect x="58" y="16" width="42" height="32" rx="2" ${Art.st('#8a98a0', 2)}/>
    <rect x="0" y="4" width="110" height="7" rx="2" ${Art.st('#eef2f4')}/>
    ${[0, 1, 2, 3].map(i => { const x = 12 + i * 24, c = U.pick(r, ['#4fd1c5', '#9dff5c', '#ff6ad5', '#ffd166', '#6ab0ff']); return i % 2 ? `<path d="M${x} -14 H${x + 8} V-6 L${x + 14} 4 H${x - 6} L${x} -6Z" ${Art.st('rgba(230,240,250,.7)', 2)}/><path d="M${x - 3} -1 L${x + 11} -1 L${x + 13} 3 H${x - 5}Z" fill="${c}"/>` : `<rect x="${x}" y="-16" width="9" height="20" rx="2" ${Art.st('rgba(230,240,250,.7)', 2)}/><rect x="${x + 1.5}" y="-6" width="6" height="9" fill="${c}"/>`; }).join('')}`; },
  server: (w, h, v) => `<rect x="1" y="1" width="54" height="128" rx="3" ${Art.st('#22272d')}/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="5" y="${6 + i * 15}" width="46" height="11" rx="1.5" ${Art.st('#2e353d', 1.5)}/><rect x="9" y="${10 + i * 15}" width="4" height="3" fill="${(i * 7 + v) % 3 ? '#3f6' : '#fa3'}"/><rect x="16" y="${10 + i * 15}" width="4" height="3" fill="#3af"/><path d="M26 ${11.5 + i * 15} H46" stroke="#11151a" stroke-width="2"/>`).join('')}`,
  shelfunit: (w, h, v) => { const r = U.rng(v + 17); return `<rect x="1" y="1" width="102" height="108" rx="2" fill="#2a3036" stroke="${OL}" stroke-width="2.5"/>
    ${[0, 1, 2, 3].map(s => { const sy = 6 + s * 26; let x = 6, out = ''; while (x < 92) { const kind = r(); const c = U.pick(r, ['#d35400', '#2980b9', '#27ae60', '#f1c40f', '#c0392b', '#8e44ad', '#ecf0f1', '#16a085']); if (r() < 0.2) { x += 10; continue; } if (kind < 0.4) { out += `<rect x="${x}" y="${sy + 6}" width="12" height="14" rx="1" ${Art.st(c, 1.5)}/><rect x="${x + 2}" y="${sy + 10}" width="8" height="4" fill="rgba(255,255,255,.6)"/>`; x += 14; } else if (kind < 0.7) { out += `<path d="M${x + 2} ${sy + 20} V${sy + 9} Q${x + 2} ${sy + 5} ${x + 4} ${sy + 4} H${x + 6} Q${x + 8} ${sy + 5} ${x + 8} ${sy + 9} V${sy + 20}Z" ${Art.st(c, 1.5)}/>`; x += 11; } else { out += `<rect x="${x}" y="${sy + 12}" width="10" height="8" rx="1" ${Art.st(c, 1.5)}/><rect x="${x + 1}" y="${sy + 5}" width="8" height="7" rx="1" ${Art.st(U.shade(c, 20), 1.5)}/>`; x += 12; } } return out + `<rect x="2" y="${sy + 20}" width="100" height="5" ${Art.st('#9aa2aa', 2)}/>`; }).join('')}
    <rect x="0" y="0" width="5" height="110" ${Art.st('#8a929a', 2)}/><rect x="99" y="0" width="5" height="110" ${Art.st('#8a929a', 2)}/>`; },
  stallcart: (w, h, v) => { const r = U.rng(v + 23); const tarp = U.pick(r, ['#c0392b', '#2e86c1', '#27ae60', '#d68910']); return `<path d="M58 22 V60" stroke="${OL}" stroke-width="5"/><path d="M58 22 V60" stroke="#777" stroke-width="2.5"/>
    <path d="M-6 26 Q59 -10 124 26 Z" ${Art.st(tarp)}/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${-6 + i * 21.6} 26 q10.8 8 21.6 0" ${Art.st(i % 2 ? tarp : '#f4f0e6', 2)}/>`).join('')}
    <rect x="4" y="52" width="110" height="34" rx="2" ${Art.st('#9a7444')}/><path d="M8 62 H110 M8 74 H110" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    ${[0, 1, 2, 3, 4, 5, 6].map(i => `<circle cx="${14 + i * 15}" cy="${48 - (i % 2) * 3}" r="7" ${Art.st(U.pick(r, ['#e74c3c', '#f39c12', '#2ecc71', '#f5e663', '#8e44ad']), 2)}/>`).join('')}
    <circle cx="20" cy="90" r="6" ${Art.st('#333')}/><circle cx="98" cy="90" r="6" ${Art.st('#333')}/>`; },
  register: () => `<defs>${Art.lg('rg', '#5a6068', '#363b42')}</defs><rect x="1" y="14" width="88" height="44" rx="2" ${Art.st('url(#rg)')}/><rect x="-1" y="10" width="92" height="7" rx="2" ${Art.st('#6d737b')}/>
    <path d="M54 10 L58 -8 H84 L86 10Z" ${Art.st('#2a2e33')}/><rect x="61" y="-5" width="20" height="8" fill="#3f6"/><rect x="8" y="2" width="26" height="9" rx="1" ${Art.st('#777', 2)}/><path d="M4 30 H86" stroke="rgba(0,0,0,.3)" stroke-width="2"/>`,
  locker: (w, h, v) => `${[0, 1, 2].map(i => { const x = i * 24; const open = (v + i) % 5 === 0; return `<rect x="${x + 1}" y="1" width="22" height="122" rx="2" ${Art.st(i % 2 ? '#5f7186' : '#55677c')}/>${[0, 1, 2, 3].map(k => `<path d="M${x + 5} ${10 + k * 4} H${x + 19}" stroke="#2f3a47" stroke-width="2"/>`).join('')}<rect x="${x + 16}" y="58" width="3" height="12" rx="1" fill="#cfd6dc"/><path d="M${x + 4} 100 H${x + 20}" stroke="rgba(255,255,255,.12)" stroke-width="2"/>${open ? `<path d="M${x + 23} 3 L${x + 30} 8 V116 L${x + 23} 121Z" ${Art.st('#6f8196', 2)}/>` : ''}`; }).join('')}`,
  weaponrack: () => `<defs>${Art.lg('wk', '#4a4030', '#2a2418')}</defs><rect x="1" y="1" width="98" height="88" rx="2" ${Art.st('url(#wk)')}/>
    ${[0, 1, 2, 3].map(i => { const x = 14 + i * 22; return `<path d="M${x} 10 V76" stroke="${OL}" stroke-width="7"/><path d="M${x} 10 V76" stroke="#2c2f33" stroke-width="4"/><path d="M${x - 3} 40 h10 v10 h-6Z" ${Art.st('#222', 1.5)}/><path d="M${x - 2} 58 h5 v18 h-5Z" ${Art.st(i % 2 ? '#6b4a2a' : '#2c2f33', 1.5)}/>`; }).join('')}
    <rect x="-2" y="86" width="104" height="18" rx="2" ${Art.st('#4b5636')}/><path d="M8 95 H92" stroke="rgba(255,255,255,.15)" stroke-width="2"/>`,
  crate: (w, h, v) => `<defs>${Art.lg('cr', '#b8894e', '#7a5428')}</defs><rect x="1" y="1" width="60" height="54" rx="2" ${Art.st('url(#cr)')}/>
    <rect x="5" y="5" width="52" height="46" fill="none" stroke="#5a3c1a" stroke-width="3"/><path d="M6 6 L56 50 M56 6 L6 50" stroke="#5a3c1a" stroke-width="${v % 2 ? 0 : 3}"/><path d="M6 18 H56 M6 38 H56" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>
    ${v % 3 === 0 ? `<text x="31" y="34" font-size="9" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="rgba(40,20,0,.55)">FRAGILE</text>` : ''}`,
  dumpster: () => `<defs>${Art.lg('dm', '#3a8a50', '#1e5430')}</defs><path d="M4 14 L8 60 H102 L106 14Z" ${Art.st('url(#dm)')}/><path d="M-2 6 H112 L108 16 H2Z" ${Art.st('#245a35')}/>
    <path d="M30 22 V54 M55 22 V54 M80 22 V54" stroke="rgba(0,0,0,.2)" stroke-width="3"/><rect x="40" y="30" width="30" height="10" rx="2" fill="rgba(255,255,255,.15)"/>
    <circle cx="18" cy="62" r="5" ${Art.st('#222')}/><circle cx="92" cy="62" r="5" ${Art.st('#222')}/><path d="M60 6 Q66 -4 76 2" stroke="#7a6a50" stroke-width="3" fill="none"/>`,
  toolbench: () => `<defs>${Art.lg('tb', '#9a7048', '#6a4a2a')}</defs>
    <rect x="4" y="-48" width="104" height="40" rx="2" ${Art.st('#5a4a38')}/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<circle cx="${12 + i * 14}" cy="-40" r="1.5" fill="#2a2018"/>`).join('')}
    <path d="M16 -38 V-20 M14 -38 H18" stroke="#bbb" stroke-width="3"/><path d="M34 -36 L44 -22" stroke="#c0392b" stroke-width="4" stroke-linecap="round"/><path d="M60 -38 Q66 -30 60 -22" stroke="#ccc" stroke-width="3" fill="none"/><rect x="76" y="-38" width="20" height="8" rx="2" ${Art.st('#e67e22', 1.5)}/>
    <rect x="6" y="8" width="8" height="54" ${Art.st('#5a3c22')}/><rect x="98" y="8" width="8" height="54" ${Art.st('#5a3c22')}/><rect x="10" y="40" width="92" height="6" ${Art.st('#5a3c22', 2)}/>
    <rect x="0" y="0" width="112" height="10" rx="2" ${Art.st('url(#tb)')}/><rect x="20" y="-12" width="26" height="13" rx="2" ${Art.st('#c0392b', 2)}/><path d="M26 -12 V-16 H40 V-12" fill="none" stroke="${OL}" stroke-width="2"/><rect x="58" y="-6" width="30" height="7" rx="1" ${Art.st('#9aa', 2)}/>`,
  safe: () => `<defs>${Art.lg('sa', '#7d8186', '#4e5256', true)}</defs><rect x="1" y="1" width="54" height="62" rx="4" ${Art.st('url(#sa)')}/><rect x="6" y="6" width="44" height="52" rx="2" fill="none" stroke="#3a3d40" stroke-width="2"/>
    <circle cx="28" cy="30" r="10" ${Art.st('#c9a227', 2)}/><circle cx="28" cy="30" r="4" fill="#7a6014"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M${28 + Math.cos(i * 0.785) * 7} ${30 + Math.sin(i * 0.785) * 7} L${28 + Math.cos(i * 0.785) * 9.5} ${30 + Math.sin(i * 0.785) * 9.5}" stroke="#7a6014" stroke-width="1.5"/>`).join('')}<rect x="44" y="24" width="4" height="12" rx="1" fill="#ddd"/>`,
  car: (w, h, v) => { const c = ['#9a2e2e', '#2e4e8a', '#6a6e72', '#c9a627', '#2e6a3e', '#e0e0e0'][v % 6]; return `<defs>${Art.lg('cb', U.shade(c, 30), U.shade(c, -35))}${Art.lg('gl', '#4a6a8a', '#1a2a3a')}</defs>
    <path d="M4 50 Q2 32 16 30 L50 28 L66 6 Q70 2 78 2 H130 Q138 2 144 8 L164 28 L182 32 Q190 34 190 46 V54 Q190 58 184 58 H8 Q4 58 4 50Z" ${Art.st('url(#cb)')}/>
    <path d="M58 28 L72 8 H102 V28Z" ${Art.st('url(#gl)', 2)}/><path d="M108 28 V8 H136 Q140 8 144 12 L158 28Z" ${Art.st('url(#gl)', 2)}/><path d="M76 12 L66 26 M114 12 L110 24" stroke="rgba(255,255,255,.3)" stroke-width="3"/>
    <path d="M104 30 V54 M60 34 H72 M118 34 H130" stroke="rgba(0,0,0,.35)" stroke-width="2.5"/><path d="M8 40 H186" stroke="rgba(255,255,255,.2)" stroke-width="2"/>
    <path d="M180 38 h10 v8 h-10z" ${Art.st('#ffe08a', 1.5)}/><path d="M2 40 h8 v8 h-8z" ${Art.st('#d33', 1.5)}/>
    ${[44, 148].map(x => `<circle cx="${x}" cy="58" r="13" ${Art.st('#1e1e1e')}/><circle cx="${x}" cy="58" r="6" ${Art.st('#8a8e92', 2)}/>`).join('')}
    ${v % 2 ? `<path d="M120 12 L128 20 L124 22 L132 26" stroke="#eee" stroke-width="1.2" fill="none"/>` : ''}<path d="M30 46 q6 6 0 10" stroke="rgba(110,10,10,.7)" stroke-width="4" fill="none"/>`; },
  body: (w, h, v) => { const sh = ['#4a5a6a', '#6a4a3a', '#3a5a3a', '#7a6a50'][v % 4]; return `<ellipse cx="44" cy="16" rx="48" ry="4" fill="rgba(110,10,10,.75)"/>
    <path d="M14 14 Q14 4 26 4 H58 Q64 4 64 10 V16 H14Z" ${Art.st(sh)}/><path d="M60 8 H80 Q84 8 84 12 V16 H60Z" ${Art.st('#3a3a44')}/><path d="M80 6 h8 v10 h-8z" ${Art.st('#222', 2)}/>
    <circle cx="8" cy="10" r="8" ${Art.st('#c9a37a')}/><path d="M2 6 Q4 0 12 2" stroke="${OL}" stroke-width="3" fill="none"/><path d="M28 2 Q24 -6 34 -4" ${Art.st('#c9a37a', 2)}/><circle cx="40" cy="10" r="4" fill="rgba(140,10,10,.8)"/>`; },
  supply: () => `<defs>${Art.lg('su', '#3a96d1', '#1b5e8a')}</defs>
    <path d="M10 -22 Q36 -48 62 -22" ${Art.st('rgba(240,240,240,.92)')}/><path d="M10 -22 L4 6 M36 -32 V6 M62 -22 L66 6" stroke="#ddd" stroke-width="1.5"/>
    <rect x="1" y="6" width="68" height="56" rx="3" ${Art.st('url(#su)')}/><rect x="30" y="6" width="10" height="56" ${Art.st('#f1c40f', 2)}/><rect x="1" y="26" width="68" height="8" ${Art.st('#f1c40f', 2)}/>
    <path d="M8 12 V56" stroke="rgba(255,255,255,.25)" stroke-width="3"/>`,
  generator: () => `<defs>${Art.lg('ge', '#d8b030', '#9a7410')}</defs><rect x="2" y="14" width="92" height="60" rx="5" ${Art.st('url(#ge)')}/><rect x="8" y="22" width="52" height="44" rx="3" ${Art.st('#3a3d40', 2)}/>
    ${[0, 1, 2, 3, 4].map(i => `<path d="M12 ${28 + i * 8} H56" stroke="#1e2124" stroke-width="3"/>`).join('')}<rect x="66" y="22" width="22" height="22" rx="3" ${Art.st('#2a2d30', 2)}/><rect x="10" y="2" width="20" height="14" rx="2" ${Art.st('#555', 2)}/><path d="M30 6 Q44 0 50 14" stroke="${OL}" stroke-width="3" fill="none"/>
    <rect x="4" y="72" width="12" height="6" ${Art.st('#222', 2)}/><rect x="80" y="72" width="12" height="6" ${Art.st('#222', 2)}/>`,
  bag: () => `<path d="M4 24 Q2 8 12 6 H28 Q38 8 36 24Z" ${Art.st('#7a6448')}/><path d="M12 6 Q20 -2 28 6" fill="none" stroke="${OL}" stroke-width="3"/><path d="M8 14 H32" stroke="rgba(0,0,0,.3)" stroke-width="2"/><rect x="16" y="12" width="8" height="6" rx="1" ${Art.st('#c9a227', 1.5)}/>`,
  lamp: () => `<path d="M13 30 V116" stroke="${OL}" stroke-width="5"/><path d="M13 30 V116" stroke="#555" stroke-width="2.5"/><ellipse cx="13" cy="117" rx="12" ry="3.5" ${Art.st('#333', 2)}/><path d="M0 28 L5 2 H21 L26 28Z" ${Art.st('#e8d4a8')}/><path d="M4 26 L8 6" stroke="rgba(255,255,255,.5)" stroke-width="2"/>`,
  plant: (w, h, v) => `<path d="M6 42 L9 66 H25 L28 42Z" ${Art.st('#a65a32')}/><rect x="4" y="38" width="26" height="6" rx="2" ${Art.st('#8a4a28', 2)}/>
    ${[[-30, '#2f7a3a'], [-12, '#3a8a44'], [8, '#2a6a32'], [26, '#3f9a4a'], [-2, '#4aa856']].map(([a, c], i) => `<path d="M17 40 Q${17 + a * 0.4} ${20 - i * 3} ${17 + a} ${6 + (i % 2) * 6} Q${17 + a * 0.3} ${22} 17 40Z" ${Art.st(v % 3 === 0 ? '#7a6a3a' : c, 2)}/>`).join('')}`,
  toilet: () => `<rect x="2" y="2" width="16" height="22" rx="3" ${Art.st('#f0f3f5')}/><path d="M2 26 H36 Q40 26 38 32 Q34 40 22 40 H10 L12 50 H4 L2 26Z" ${Art.st('#f0f3f5')}/><rect x="0" y="22" width="38" height="5" rx="2" ${Art.st('#dde2e6', 2)}/>`,
  sink: () => `<rect x="10" y="-26" width="30" height="22" rx="2" ${Art.st('rgba(170,200,210,.9)', 2)}/><path d="M14 -22 L22 -10" stroke="rgba(255,255,255,.6)" stroke-width="2"/><path d="M0 2 H50 Q48 12 38 14 H12 Q2 12 0 2Z" ${Art.st('#f0f3f5')}/><rect x="20" y="14" width="10" height="56" ${Art.st('#d8dde0', 2)}/><path d="M25 2 V-4 H30" stroke="${OL}" stroke-width="3" fill="none"/>`,
  bench: () => `<rect x="0" y="0" width="110" height="7" rx="2" ${Art.st('#8a6238')}/><rect x="0" y="16" width="110" height="7" rx="2" ${Art.st('#8a6238')}/><rect x="8" y="0" width="6" height="40" ${Art.st('#3a3d40', 2)}/><rect x="96" y="0" width="6" height="40" ${Art.st('#3a3d40', 2)}/>`,
  streetlamp: () => `<path d="M10 200 V10 Q10 0 20 0 H38" fill="none" stroke="${OL}" stroke-width="8"/><path d="M10 200 V10 Q10 0 20 0 H38" fill="none" stroke="#3a4048" stroke-width="5"/><path d="M28 0 H48 L44 8 H32Z" ${Art.st('#2a2e33', 2)}/><rect x="32" y="7" width="12" height="4" rx="1" fill="#ffe8a8"/><rect x="2" y="190" width="16" height="10" rx="2" ${Art.st('#2a2e33', 2)}/>`,
  barrel: (w, h, v) => { const c = ['#3a5a7a', '#8a3a2a', '#4a6a3a'][v % 3]; return `<defs>${Art.lg('br', U.shade(c, 25), U.shade(c, -30), true)}</defs><rect x="1" y="2" width="38" height="52" rx="5" ${Art.st('url(#br)')}/><path d="M1 14 H39 M1 42 H39" stroke="${OL}" stroke-width="2.5"/><ellipse cx="20" cy="3" rx="18" ry="3" ${Art.st(U.shade(c, -10), 2)}/>${v % 3 === 1 ? `<path d="M14 22 L20 30 L26 22 M20 30 V36" stroke="#f1c40f" stroke-width="2.5" fill="none"/>` : ''}`; },
  vent: () => `<rect x="1" y="10" width="68" height="40" rx="3" ${Art.st('#8a929a')}/>${[0, 1, 2, 3, 4].map(i => `<path d="M8 ${18 + i * 6} H62" stroke="#4a5058" stroke-width="2.5"/>`).join('')}<rect x="20" y="0" width="30" height="12" rx="2" ${Art.st('#7a828a', 2)}/>`,
};

// ---------- Character parts ----------
const CHAR_STYLE = {
  jake:  { skin: '#e2b48a', hair: '#2b1d14', shirt: '#55703f', pants: '#4a5034', boots: '#3a2a1c', head: 'helmet', acc: '#4f6236', vest: '#3e4a2c' },
  maya:  { skin: '#f0c8a2', hair: '#5a2e1a', shirt: '#dfe6ee', pants: '#3a7a8a', boots: '#2a2a2e', head: 'ponytail', acc: '#d33', vest: null, cross: true },
  ton:   { skin: '#c99a6e', hair: '#151515', shirt: '#e67e22', pants: '#2f3b4a', boots: '#222', head: 'cap', acc: '#1f6f3f', vest: null },
  chan:  { skin: '#b47e54', hair: '#dcdcdc', shirt: '#b03030', pants: '#1f1f22', boots: '#222', head: 'mongkol', acc: '#c9a227', vest: null },
  kenji: { skin: '#eac4a0', hair: '#0b0b0b', shirt: '#2c3e50', pants: '#1c2733', boots: '#111', head: 'topknot', acc: '#8a1c1c', vest: null },
  sofia: { skin: '#f2cfb0', hair: '#d9a520', shirt: '#6f3d8a', pants: '#262a33', boots: '#2a1c14', head: 'long', acc: '#ddd', vest: '#4a2a5a' },
  joe:   { skin: '#c48a60', hair: '#3b2a1a', shirt: '#7f6a4f', pants: '#3a4a6a', boots: '#3a2a1c', head: 'miner', acc: '#f1c40f', vest: '#d2691e' },
  lina:  { skin: '#e8bc94', hair: '#1a1a1a', shirt: '#16a085', pants: '#34495e', boots: '#222', head: 'bob', acc: '#7fe3ff', vest: null },
};

const Parts = {
  head(key, c, zombie) {
    return Art.make('head_' + key, 44, 44, (() => {
      const skin = c.skin, sh = U.shade(skin, -30);
      let s = `<defs>${Art.lg('hs' + key, U.shade(skin, 12), sh)}</defs>`;
      // back hair layers
      if (c.head === 'ponytail') s += `<path d="M10 14 Q-4 18 -2 34 Q2 30 6 30 Q2 24 12 20Z" ${Art.st(c.hair)}/>`;
      if (c.head === 'long') s += `<path d="M8 12 Q0 26 4 44 H18 Q14 30 16 18Z" ${Art.st(c.hair)}/>`;
      // face
      s += `<path d="M7 22 Q7 5 22 5 Q38 5 38 21 Q38 33 31 38 Q24 42 15 38 Q7 33 7 22Z" ${Art.st(`url(#hs${key})`)}/>`;
      s += `<path d="M7 22 Q7 33 15 38 Q11 30 12 20 Q11 12 16 7 Q7 10 7 22Z" fill="rgba(0,0,0,.14)"/>`;
      s += `<ellipse cx="15" cy="24" rx="3.5" ry="4.5" ${Art.st(sh, 2)}/><path d="M14 22.5 q2 1.5 0 3" stroke="rgba(0,0,0,.3)" stroke-width="1" fill="none"/>`;
      if (zombie) {
        s += `<path d="M24 12 Q30 10 34 14" stroke="${OL}" stroke-width="2" fill="none"/><ellipse cx="31" cy="20" rx="4" ry="4.5" fill="#1a1a10"/><circle cx="32" cy="20" r="2.4" fill="#f5ff7a"/><circle cx="32.5" cy="19.5" r="1" fill="#c11"/>`;
        s += `<path d="M26 31 Q32 28 37 31 Q36 37 30 37 Q26 36 26 31Z" ${Art.st('#3a0a0a', 2)}/><path d="M28 31 l1.5 2.5 l1.5-2.5 l1.5 2.5 l1.5-2.5" stroke="#eee" stroke-width="1.2" fill="none"/>`;
        s += `<path d="M18 10 Q22 14 18 18" stroke="rgba(120,10,10,.8)" stroke-width="2.5" fill="none"/><circle cx="12" cy="31" r="3" fill="rgba(70,100,40,.6)"/><path d="M10 14 L14 16 M12 11 L16 14" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>`;
        s += `<path d="M8 18 Q6 4 20 4 Q34 3 36 12 Q30 8 26 10 Q22 6 18 10 Q14 8 12 14Z" ${Art.st(c.hair, 2)}/>`;
        return s;
      }
      s += `<path d="M27 16 Q31 14 35 16" stroke="${OL}" stroke-width="2.2" fill="none" stroke-linecap="round"/><ellipse cx="31" cy="22" rx="2.2" ry="3" fill="${OL}"/><circle cx="31.8" cy="21" r=".9" fill="#fff"/>`;
      s += `<path d="M37 24 Q41 26 37.5 29" ${Art.st(skin, 2)}/><path d="M29 33 Q32 34.5 35 33" stroke="${OL}" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="27" cy="29" rx="2.5" ry="1.6" fill="rgba(255,110,90,.35)"/>`;
      switch (c.head) {
        case 'helmet': s += `<path d="M4 22 Q3 2 22 2 Q41 2 41 20 L43 23 H3Z" ${Art.st(c.acc)}/><path d="M6 14 Q14 10 30 11 L32 16 Q16 15 6 18Z" fill="#2a2a24" stroke="${OL}" stroke-width="1"/><ellipse cx="33" cy="14" rx="5" ry="3.6" fill="#5a8aa0" stroke="${OL}" stroke-width="1.4"/><ellipse cx="32" cy="13" rx="1.6" ry="1" fill="rgba(255,255,255,.6)"/><path d="M9 14 Q12 6 22 5" stroke="rgba(255,255,255,.3)" stroke-width="3" fill="none"/><path d="M3 23 H43" stroke="${OL}" stroke-width="3"/><path d="M14 24 Q16 36 22 40" stroke="#2a2a1a" stroke-width="1.8" fill="none"/>${[10, 18, 26, 34].map(x => `<circle cx="${x}" cy="12" r="1.2" fill="rgba(0,0,0,.25)"/>`).join('')}`; break;
        case 'ponytail': s += `<path d="M6 22 Q4 3 22 3 Q38 3 39 16 Q30 10 24 12 Q20 16 14 14 Q10 18 8 26Z" ${Art.st(c.hair)}/><path d="M18 3 L22 2 L26 3 V8 H18Z" ${Art.st('#fff', 1.5)}/><path d="M21 4 h2 v3 h-2z" fill="#d33"/>`; break;
        case 'cap': s += `<path d="M6 18 Q6 3 22 3 Q37 3 38 15 L50 18 Q50 21 38 20 H6Z" ${Art.st(c.acc)}/><path d="M11 12 Q14 6 22 5" stroke="rgba(255,255,255,.3)" stroke-width="3" fill="none"/><path d="M7 20 Q6 26 9 28" stroke="${OL}" stroke-width="2.5" fill="none"/><path d="M8 20 Q7 24 9 27" stroke="${c.hair}" stroke-width="2" fill="none"/>`; break;
        case 'mongkol': s += `<path d="M7 16 Q12 6 22 6 Q32 6 37 14" stroke="${c.acc}" stroke-width="5" fill="none"/><path d="M7 16 Q12 6 22 6 Q32 6 37 14" stroke="${OL}" stroke-width="1.5" fill="none" stroke-dasharray="3 3"/><path d="M8 16 L-2 26 L0 28 L9 20" ${Art.st(c.acc, 1.8)}/><path d="M24 34 Q30 42 38 32 Q36 38 30 40 Q26 40 24 34Z" ${Art.st(c.hair, 1.8)}/><path d="M26 30 Q31 31 36 30" stroke="${c.hair}" stroke-width="2.5"/>`; break;
        case 'topknot': s += `<path d="M6 22 Q4 4 22 4 Q38 4 38 16 Q30 12 22 12 Q14 12 9 24Z" ${Art.st(c.hair)}/><ellipse cx="18" cy="2" rx="6" ry="5" ${Art.st(c.hair)}/><path d="M14 6 H22" stroke="${c.acc}" stroke-width="3"/><path d="M8 16 H38" stroke="${c.acc}" stroke-width="3"/>`; break;
        case 'long': s += `<path d="M5 24 Q3 3 22 3 Q39 3 39 18 Q32 8 22 10 Q18 16 12 14 Q9 20 9 30Z" ${Art.st(c.hair)}/><path d="M14 6 Q22 2 30 6" stroke="rgba(255,255,255,.35)" stroke-width="2.5" fill="none"/>`; break;
        case 'miner': s += `<path d="M24 34 Q28 44 38 34 Q38 40 32 42 Q26 42 24 34Z" ${Art.st(c.hair, 1.8)}/><path d="M4 21 Q3 2 22 2 Q41 2 41 19 L44 22 H2Z" ${Art.st(c.acc)}/><rect x="30" y="8" width="10" height="9" rx="2" ${Art.st('#555', 2)}/><circle cx="40" cy="12.5" r="3.5" ${Art.st('#fff7c0', 1.5)}/><path d="M2 22 H44" stroke="${OL}" stroke-width="3"/>`; break;
        case 'bob': s += `<path d="M5 30 Q2 3 22 3 Q40 3 39 20 Q36 12 28 12 L20 14 Q12 12 10 32Z" ${Art.st(c.hair)}/><rect x="12" y="7" width="22" height="7" rx="3" ${Art.st('#333', 2)}/><circle cx="18" cy="10.5" r="3" fill="${c.acc}"/><circle cx="28" cy="10.5" r="3" fill="${c.acc}"/>`; break;
        default: s += `<path d="M6 22 Q4 4 22 4 Q38 4 38 16 Q30 10 22 12 Q14 12 9 24Z" ${Art.st(c.hair)}/>`;
      }
      return s;
    })(), 6);
  },
  torso(key, c, zombie) {
    return Art.make('torso_' + key, 32, 36, (() => {
      const dk = U.shade(c.shirt, -32);
      let s = `<defs>${Art.lg('ts' + key, U.shade(c.shirt, 16), U.shade(c.shirt, -24), true)}</defs>`;
      s += `<path d="M6 8 Q6 2 13 2 H19 Q26 2 26 8 L27 30 Q27 34 23 34 H9 Q5 34 5 30Z" ${Art.st(`url(#ts${key})`)}/>`;
      // back-side shadow band & wrinkles
      s += `<path d="M5 10 Q5 30 9 34 H11 Q8 22 9 8Z" fill="rgba(0,0,0,.18)"/><path d="M12 18 Q16 20 20 18 M11 23 Q15 25 21 22" stroke="rgba(0,0,0,.22)" stroke-width="1.2" fill="none"/>`;
      s += `<path d="M12 2 L16 8 L20 2" ${Art.st(U.shade(c.shirt, -12), 2)}/>`;
      if (zombie) {
        s += `<path d="M5 28 L8 35 L11 29 L14 36 L17 29 L20 35 L23 29 L27 34 L27 28" ${Art.st(dk, 1.6)}/>`;
        s += `<path d="M13 11 Q19 9 23 13 Q24 20 19 22 Q13 21 13 11Z" fill="#7a1010" stroke="${OL}" stroke-width="1"/><path d="M15 13 Q19 12 22 14 M15 16 Q19 15 22 17 M15 19 Q18 18 21 19" stroke="#e8d8c0" stroke-width="1.2" fill="none"/>`;
        s += `<path d="M8 20 l3 7 M24 8 l-2 5" stroke="rgba(110,10,10,.75)" stroke-width="2.2"/><circle cx="9" cy="14" r="1.6" fill="rgba(90,10,10,.8)"/><path d="M20 26 q2 4 0 8" stroke="rgba(110,10,10,.7)" stroke-width="2" fill="none"/>`;
        return s;
      }
      if (c.vest) {
        s += `<path d="M7 5 H25 L26 25 H6Z" ${Art.st(c.vest, 1.8)}/><path d="M9 5 V25 M23 5 V25" stroke="${U.shade(c.vest, -25)}" stroke-width="1.5"/>`;
        s += `<rect x="8" y="13" width="7" height="8" rx="1.2" ${Art.st(U.shade(c.vest, -14), 1.4)}/><rect x="17" y="13" width="7" height="8" rx="1.2" ${Art.st(U.shade(c.vest, -14), 1.4)}/><path d="M8 15 H15 M17 15 H24" stroke="${U.shade(c.vest, -35)}" stroke-width="1"/>`;
        s += `<rect x="10" y="6" width="12" height="5" rx="1" ${Art.st(U.shade(c.vest, 12), 1.2)}/><path d="M7 5 Q10 0 13 2 M25 5 Q22 0 19 2" stroke="${OL}" stroke-width="1.4" fill="none"/>`;
      }
      if (c.cross) s += `<rect x="17" y="8" width="8" height="8" rx="1.5" fill="#fff" stroke="${OL}" stroke-width="1"/><path d="M19.5 12 h3 M21 10.5 v3" stroke="#d33" stroke-width="2"/>`;
      s += `<rect x="5" y="25" width="22" height="4.5" ${Art.st('#2a2420', 1.3)}/><rect x="14" y="25.3" width="5" height="3.9" rx=".8" fill="#c9a227" stroke="${OL}" stroke-width=".8"/>`;
      s += `<rect x="21" y="27" width="6" height="7" rx="1.5" ${Art.st('#3a3028', 1.2)}/>`;
      s += `<path d="M8 6 V22" stroke="rgba(255,255,255,.22)" stroke-width="2"/>`;
      return s;
    })(), 4);
  },
  arm(key, c, zombie) {
    const sl = zombie ? U.shade(c.shirt, -10) : c.shirt;
    return Art.make('arm_' + key, 14, 28, `<path d="M2 4 Q2 0 7 0 Q12 0 12 4 V13 H2Z" ${Art.st(sl)}/><path d="M2 4 V13 H5 V3Z" fill="rgba(0,0,0,.18)"/>
      <path d="M1.5 11.5 H12.5 V14 H1.5Z" ${Art.st(U.shade(sl, -18), 1.2)}/>
      <path d="M3 13.5 H11 V22 H3Z" ${Art.st(c.skin)}/><path d="M3 14 V22 H5.5 V14Z" fill="rgba(0,0,0,.15)"/>
      ${zombie ? `<circle cx="7" cy="24.5" r="4.4" ${Art.st(c.skin)}/><path d="M3.5 26.5 l-1.5 4 M6 28 l-.5 4.5 M8.5 28 l.5 4.5 M11 26.5 l1.5 4" stroke="${OL}" stroke-width="1.8" stroke-linecap="round"/><path d="M5 17 l2 3" stroke="rgba(110,10,10,.7)" stroke-width="1.6"/>`
      : `<path d="M2.5 21 H11.5 Q12.5 27 7 29 Q1.5 27 2.5 21Z" ${Art.st(c.glove || U.shade(c.skin, -6))}/><path d="M4.5 24 H9.5" stroke="rgba(0,0,0,.25)" stroke-width="1"/>`}`, 4);
  },
  leg(key, c, zombie) {
    return Art.make('leg_' + key, 18, 32, `<path d="M3 3 Q3 0 9 0 Q15 0 15 3 V24 H3Z" ${Art.st(c.pants)}/><path d="M3 3 V24 H6.5 V2Z" fill="rgba(0,0,0,.2)"/>
      <path d="M8 6 Q11 8 13 6 M7 17 Q10 19 13 17" stroke="rgba(0,0,0,.22)" stroke-width="1.1" fill="none"/>
      ${zombie ? `<path d="M3 21 L5.5 25 L8 21 L10.5 25 L13 21 L15 24" ${Art.st(c.pants, 1.3)}/><path d="M4.5 23.5 H13.5 V28.5 H4.5Z" ${Art.st(c.skin, 1.5)}/><path d="M3 28 H15 Q18 28 18 31 V32 H3Z" ${Art.st('#2a2420', 1.6)}/><path d="M7 9 h4 v3 h-4z" fill="rgba(90,10,10,.6)"/>`
      : `${c.vest ? `<rect x="3.5" y="11" width="11" height="6" rx="2" ${Art.st(U.shade(c.pants, -20), 1.2)}/>` : ''}
         <path d="M2 22.5 H14 Q18 23.5 18 28 V31 H2Z" ${Art.st(c.boots)}/><path d="M2 29 H18" stroke="${OL}" stroke-width="1.6"/><path d="M5 24.5 l3 2 M8 24 l3 2" stroke="rgba(255,255,255,.25)" stroke-width="1"/>`}`, 4);
  },
  pack() {
    return Art.make('backpack', 20, 30, `<defs>${Art.lg('bp', '#7d6640', '#4a3a20', true)}</defs>
      <rect x="1" y="4" width="18" height="25" rx="5" ${Art.st('url(#bp)')}/><path d="M1 8 V27 Q1 29 5 29 V5Z" fill="rgba(0,0,0,.2)"/>
      <path d="M1 12 Q10 16 19 12 V8 Q10 4 1 8Z" ${Art.st('#6a5430', 1.8)}/><rect x="8" y="11" width="4" height="5" rx="1" fill="#c9a227" stroke="${OL}" stroke-width=".8"/>
      <rect x="3.5" y="18" width="13" height="8.5" rx="2" ${Art.st('#5e4a2a', 1.6)}/><path d="M3.5 21 H16.5" stroke="rgba(0,0,0,.3)" stroke-width="1"/>
      <rect x="-1.5" y="-3" width="23" height="8" rx="4" ${Art.st('#4a6a50', 1.8)}/><path d="M4 -3 V5 M16 -3 V5" stroke="${OL}" stroke-width="1.3"/><path d="M1 0 Q10 -2 19 0" stroke="rgba(255,255,255,.25)" stroke-width="1" fill="none"/>`, 4);
  },
  // ---- weapons: drawn pointing right, pivot at grip (px, py)
  weapon(id) {
    const W = WEAPON_ART[id]; if (!W) return null;
    const o = Art.make('wpn_' + id, W.w, W.h, W.svg, 3);
    o.px = W.px; o.py = W.py;
    return o;
  },
};

const WEAPON_ART = {
  knife:   { w: 30, h: 10, px: 5, py: 5, svg: `<path d="M10 2 H24 Q30 4 30 5 Q28 8 22 8 H10Z" ${Art.st('#dfe6ec', 1.8)}/><path d="M12 4 H24" stroke="#fff" stroke-width="1.2"/><rect x="0" y="2.5" width="11" height="5.5" rx="2" ${Art.st('#4a3424', 1.8)}/>` },
  bat:     { w: 56, h: 12, px: 5, py: 6, svg: `<path d="M0 4.5 H18 Q36 1 52 1 Q56 1 56 6 Q56 11 52 11 Q36 11 18 7.5 H0Z" ${Art.st('#c89a62', 2)}/><path d="M22 4 Q38 2.5 50 3" stroke="rgba(255,255,255,.4)" stroke-width="1.5" fill="none"/><rect x="0" y="3.5" width="12" height="5" rx="1" fill="#2a2a2a"/>` },
  machete: { w: 50, h: 14, px: 5, py: 7, svg: `<path d="M12 4 H40 Q50 4 50 9 Q48 13 38 12 L12 10Z" ${Art.st('#d5dde4', 1.8)}/><path d="M14 6 H40" stroke="#fff" stroke-width="1.2"/><rect x="0" y="4" width="13" height="6" rx="2" ${Art.st('#3a2a1a', 1.8)}/>` },
  fireaxe: { w: 58, h: 26, px: 5, py: 15, svg: `<rect x="0" y="12" width="52" height="6" rx="2" ${Art.st('#c0392b', 2)}/><path d="M44 2 Q56 2 58 14 Q56 26 44 26 Q48 14 44 2Z" ${Art.st('#c9d1d8', 2)}/><path d="M40 6 H48 V24 H40Z" ${Art.st('#888', 2)}/><path d="M6 13 V17 M16 13 V17" stroke="rgba(0,0,0,.3)" stroke-width="2"/>` },
  katana:  { w: 68, h: 10, px: 6, py: 5, svg: `<path d="M18 3.5 Q46 2 68 0 Q60 6 18 7Z" ${Art.st('#e3eaf0', 1.8)}/><path d="M20 4.5 Q46 3.5 62 2" stroke="#fff" stroke-width="1" fill="none"/><ellipse cx="17" cy="5" rx="2.5" ry="5" ${Art.st('#c9a227', 1.5)}/><rect x="0" y="3" width="15" height="4.5" rx="1.5" ${Art.st('#2a1a1a', 1.5)}/><path d="M3 3 l2 4.5 M7 3 l2 4.5 M11 3 l2 4.5" stroke="#8a1c1c" stroke-width="1.2"/>` },
  pistol:  { w: 26, h: 18, px: 7, py: 9, svg: `<path d="M2 1 H25 V7 H2Z" ${Art.st('#3a3f45', 2)}/><path d="M4 7 H12 L10 17 H3Z" ${Art.st('#262a2e', 2)}/><path d="M12 7 Q16 12 12 13" fill="none" stroke="${OL}" stroke-width="1.8"/><path d="M5 3 H22" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>` },
  revolver:{ w: 30, h: 18, px: 7, py: 9, svg: `<rect x="12" y="2" width="18" height="4" ${Art.st('#9aa2aa', 1.8)}/><rect x="7" y="0" width="9" height="8" rx="2" ${Art.st('#7a828a', 1.8)}/><path d="M3 6 H10 L8 17 H1Z" ${Art.st('#6b4a2a', 2)}/><path d="M10 7 Q14 11 10 12" fill="none" stroke="${OL}" stroke-width="1.8"/>` },
  smg:     { w: 38, h: 22, px: 10, py: 9, svg: `<path d="M0 3 H8 V9 H0Z" ${Art.st('#2c3034', 1.8)}/><path d="M6 1 H32 V9 H6Z" ${Art.st('#3a3f45', 2)}/><rect x="32" y="3.5" width="6" height="3" fill="${OL}"/><path d="M8 9 H14 L12 18 H6Z" ${Art.st('#262a2e', 2)}/><path d="M18 9 H23 L22 22 H17Z" ${Art.st('#1f2226', 2)}/><path d="M9 3.5 H30" stroke="rgba(255,255,255,.22)" stroke-width="1.5"/>` },
  shotgun: { w: 54, h: 16, px: 14, py: 8, svg: `<path d="M0 6 L14 3 V11 L2 14Z" ${Art.st('#7a5532', 2)}/><path d="M14 3 H52 V7 H14Z" ${Art.st('#3a3f45', 2)}/><path d="M22 7 H44 V11 H22Z" ${Art.st('#6b4a2a', 2)}/><path d="M16 7 H20 L19 14 H15Z" ${Art.st('#262a2e', 1.8)}/><path d="M16 4.5 H50" stroke="rgba(255,255,255,.22)" stroke-width="1.2"/>` },
  rifle:   { w: 58, h: 22, px: 16, py: 9, svg: `<path d="M0 4 H14 V11 L2 13Z" ${Art.st('#2c3034', 2)}/><path d="M14 2 H46 V10 H14Z" ${Art.st('#3a3f45', 2)}/><rect x="46" y="4.5" width="12" height="3" ${Art.st('#2a2e33', 1.5)}/><path d="M17 10 H22 L21 18 H16Z" ${Art.st('#262a2e', 1.8)}/><path d="M26 10 H31 Q33 18 29 22 H25 Q27 16 26 10Z" ${Art.st('#1f2226', 1.8)}/><rect x="22" y="-2" width="10" height="4" rx="1" ${Art.st('#222', 1.5)}/><path d="M16 4 H44" stroke="rgba(255,255,255,.22)" stroke-width="1.2"/>` },
  sniper:  { w: 72, h: 22, px: 18, py: 10, svg: `<path d="M0 5 H16 V12 L2 15Z" ${Art.st('#4a5a3a', 2)}/><path d="M16 4 H48 V11 H16Z" ${Art.st('#4f5f3f', 2)}/><rect x="48" y="6" width="24" height="3" ${Art.st('#2a2e33', 1.5)}/><rect x="22" y="-4" width="20" height="6" rx="2" ${Art.st('#1a1d21', 1.8)}/><circle cx="42" cy="-1" r="3" ${Art.st('#3a6a8a', 1.2)}/><path d="M19 11 H24 L23 19 H18Z" ${Art.st('#262a2e', 1.8)}/><path d="M50 9 L56 20 M54 9 L48 20" stroke="${OL}" stroke-width="1.8"/>` },
  crossbow:{ w: 46, h: 30, px: 12, py: 15, svg: `<path d="M0 12 H36 V17 H0Z" ${Art.st('#7a5532', 2)}/><path d="M34 0 Q42 15 34 30" ${Art.st('none', 3.5)}/><path d="M34 0 Q42 15 34 30" fill="none" stroke="#5a3c1a" stroke-width="2"/><path d="M34 1 L20 15 L34 29" stroke="#ddd" stroke-width="1" fill="none"/><path d="M14 14.5 H46" stroke="#c8a26a" stroke-width="2"/><path d="M14 17 H20 L18 26 H12Z" ${Art.st('#5a3c1a', 1.8)}/>` },
};

// Precreate everything so images decode before gameplay
Art.preload = function () {
  let v = 0;
  for (const k in FURN_ART) for (let i = 0; i < 4; i++) Art.furn(k, i);
  for (const id in WEAPON_ART) Parts.weapon(id);
  for (const id in CHAR_STYLE) Art.char(id);
  for (let i = 0; i < 5; i++) Art.zombie(i);
  for (const id in ICON_ART) Art.iconArt(id);
  for (const t of ['brute', 'spitter', 'boss', 'runner']) Art.zombie(0, t);
  Parts.pack();
};
Art.furn = function (kind, v) {
  const f = FURN_ART[kind]; if (!f) return null;
  const def = FURN[kind];
  const variant = (v || 0) % 4;
  return Art.make(`f_${kind}_${variant}`, def.w, def.h, f(def.w, def.h, variant), kind === 'streetlamp' ? 6 : 54, kind === 'car' || kind === 'supply' ? 0.75 : 0.62);
};
Art.char = function (id) {
  const c = CHAR_STYLE[id];
  return { head: Parts.head(id, c), torso: Parts.torso(id, c), arm: Parts.arm(id, c), leg: Parts.leg(id, c), armB: Parts.arm(id + 'b', Object.assign({}, c, { shirt: U.shade(c.shirt, -25), skin: U.shade(c.skin, -25) })), legB: Parts.leg(id + 'b', Object.assign({}, c, { pants: U.shade(c.pants, -25), boots: U.shade(c.boots, -15) })) };
};
const ZOMBIE_LOOKS = [
  { skin: '#8aa36f', hair: '#2a2a1a', shirt: '#5a4a3a', pants: '#3a3a44' },
  { skin: '#7a9a66', hair: '#4a3a2a', shirt: '#3d4f63', pants: '#2f3440' },
  { skin: '#94a87a', hair: '#1a1a12', shirt: '#7a2f2f', pants: '#44403a' },
  { skin: '#6f8f6a', hair: '#5a5040', shirt: '#d8d8d0', pants: '#3a4a5a' },
  { skin: '#88a070', hair: '#2a2018', shirt: '#4f5a3a', pants: '#2a2a2e' },
];
Art.zombie = function (i, special) {
  const key = special ? 'z_' + special : 'z' + i;
  let c = ZOMBIE_LOOKS[i % ZOMBIE_LOOKS.length];
  if (special === 'brute') c = { skin: '#7a8a5a', hair: '#1a1a12', shirt: '#4a3a2a', pants: '#2e2a26' };
  if (special === 'spitter') c = { skin: '#a8c84a', hair: '#3a4a1a', shirt: '#4a5a2a', pants: '#2e3a22' };
  if (special === 'boss') c = { skin: '#8a4a4a', hair: '#1a0a0a', shirt: '#3a1a1a', pants: '#221414' };
  if (special === 'runner') c = { skin: '#9aab7a', hair: '#3a2a1a', shirt: '#2a4a6a', pants: '#2a2a33' };
  return { head: Parts.head(key, c, true), torso: Parts.torso(key, c, true), arm: Parts.arm(key, c, true), leg: Parts.leg(key, c, true), armB: Parts.arm(key + 'b', Object.assign({}, c, { shirt: U.shade(c.shirt, -25), skin: U.shade(c.skin, -25) }), true), legB: Parts.leg(key + 'b', Object.assign({}, c, { pants: U.shade(c.pants, -25) }), true) };
};

const SURV_STYLE = {
  doctor:   { skin: '#e6b890', hair: '#3a3a3a', shirt: '#f2f4f6', pants: '#4a6a8a', boots: '#222', head: 'bob', acc: '#7fe3ff', cross: true },
  engineer: { skin: '#c99a6e', hair: '#222', shirt: '#3a5a8a', pants: '#2a3a5a', boots: '#3a2a1c', head: 'cap', acc: '#e67e22', vest: '#e67e22' },
  merchant: { skin: '#f0c8a2', hair: '#7a2a2a', shirt: '#c0392b', pants: '#3a2a2a', boots: '#222', head: 'long', acc: '#c9a227' },
  cook:     { skin: '#d9a77a', hair: '#ddd', shirt: '#f4f4f0', pants: '#333', boots: '#222', head: 'mongkol', acc: '#fff' },
  tailor:   { skin: '#f0c8a2', hair: '#2a1a12', shirt: '#9a5ab0', pants: '#2a2a3a', boots: '#222', head: 'ponytail', acc: '#ff8ab0' },
  scout:    { skin: '#c48a60', hair: '#111', shirt: '#4a5a3a', pants: '#3a3a2a', boots: '#2a2018', head: 'helmet', acc: '#5a6a3a', vest: '#3a4a2a' },
  gen:      { skin: '#d9a77a', hair: '#3a2a1a', shirt: '#7a6a9a', pants: '#444', boots: '#222', head: 'plain', acc: '#999' },
};
Art.survivor = function (k) {
  const c = SURV_STYLE[k] || SURV_STYLE.gen, id = 's_' + k;
  return { head: Parts.head(id, c), torso: Parts.torso(id, c), arm: Parts.arm(id, c), leg: Parts.leg(id, c), armB: Parts.arm(id + 'b', Object.assign({}, c, { shirt: U.shade(c.shirt, -25), skin: U.shade(c.skin, -25) })), legB: Parts.leg(id + 'b', Object.assign({}, c, { pants: U.shade(c.pants, -25), boots: c.boots })) };
};

// ---------- Room decoration & wall textures ----------
const DECO_ART = {
  window: (v) => `<defs>${Art.lg('wgl', '#1c2c48', '#3a5078')}</defs>
    <rect x="0" y="0" width="80" height="84" rx="3" ${Art.st('#4a3a2c', 3)}/><rect x="6" y="6" width="68" height="68" fill="url(#wgl)" stroke="${OL}" stroke-width="2"/>
    <circle cx="56" cy="22" r="7" fill="rgba(255,245,210,.55)"/><path d="M14 74 L40 6 H52 L26 74Z" fill="rgba(200,220,255,.12)"/>
    <path d="M6 44 Q20 30 34 40 Q48 28 74 38 V74 H6Z" fill="rgba(10,16,30,.6)"/>
    <path d="M40 6 V74 M6 40 H74" stroke="#4a3a2c" stroke-width="4"/><rect x="-4" y="74" width="88" height="8" rx="2" ${Art.st('#5a4634', 2.5)}/>
    ${v % 3 === 0 ? `<path d="M-2 -2 Q10 30 4 84 H-8 V-2Z" ${Art.st('#8a3a3a', 2)}/><path d="M82 -2 Q70 30 76 84 H88 V-2Z" ${Art.st('#8a3a3a', 2)}/>` : ''}
    ${v % 3 === 1 ? `<rect x="-6" y="26" width="92" height="12" rx="2" transform="rotate(-10 40 32)" ${Art.st('#8a6238', 2)}/><rect x="-6" y="46" width="92" height="12" rx="2" transform="rotate(8 40 52)" ${Art.st('#7a5530', 2)}/><circle cx="6" cy="40" r="1.6" fill="#333"/><circle cx="74" cy="30" r="1.6" fill="#333"/>` : ''}
    ${v % 4 === 2 ? `<path d="M48 12 L56 22 L50 26 L60 36 M56 22 L66 18" stroke="rgba(255,255,255,.55)" stroke-width="1.3" fill="none"/>` : ''}`,
  picture: (v) => { const c = ['#4a7a9a', '#7a5a3a', '#5a7a4a', '#8a4a5a'][v % 4]; return `<rect x="0" y="0" width="54" height="42" rx="2" ${Art.st('#a07a3a', 3)}/><rect x="5" y="5" width="44" height="32" fill="${c}"/>
    <path d="M5 37 L18 20 L26 28 L36 16 L49 30 V37Z" fill="rgba(255,255,255,.25)"/><circle cx="38" cy="12" r="4" fill="rgba(255,240,180,.6)"/>${v % 2 ? '' : `<path d="M5 5 L49 37" stroke="rgba(0,0,0,.4)" stroke-width="1.5"/>`}`; },
  poster: (v) => [`<rect x="0" y="0" width="40" height="56" ${Art.st('#e8dcc0', 2)} transform="rotate(-3 20 28)"/><text x="20" y="16" font-size="8" font-weight="900" font-family="sans-serif" fill="#b02020" text-anchor="middle" transform="rotate(-3 20 28)">DANGER</text><path d="M12 24 Q20 18 28 24 L26 44 H14Z" fill="#5a7a4a" transform="rotate(-3 20 28)"/><circle cx="17" cy="28" r="2" fill="#ff4" transform="rotate(-3 20 28)"/><text x="20" y="52" font-size="5.5" font-family="sans-serif" fill="#333" text-anchor="middle" transform="rotate(-3 20 28)">STAY INSIDE</text>`,
    `<rect x="0" y="0" width="40" height="56" ${Art.st('#2e5a8a', 2)} transform="rotate(2 20 28)"/><circle cx="20" cy="22" r="10" fill="#f1c40f" transform="rotate(2 20 28)"/><text x="20" y="46" font-size="7" font-weight="900" font-family="sans-serif" fill="#fff" text-anchor="middle" transform="rotate(2 20 28)">EVACUATE</text>`,
    `<rect x="0" y="0" width="40" height="56" ${Art.st('#f4f4f0', 2)}/><path d="M14 10 h12 v10 h10 v12 h-10 v10 h-12 v-10 h-10 v-12 h10z" fill="#d33"/><text x="20" y="52" font-size="6" font-weight="700" font-family="sans-serif" fill="#333" text-anchor="middle">FIRST AID</text>`][v % 3],
  clock: () => `<circle cx="16" cy="16" r="15" ${Art.st('#f4f0e6', 3)}/><path d="M16 16 V6 M16 16 L23 20" stroke="${OL}" stroke-width="2.2" stroke-linecap="round"/>${[0, 1, 2, 3].map(i => `<circle cx="${16 + Math.cos(i * 1.5708) * 11}" cy="${16 + Math.sin(i * 1.5708) * 11}" r="1.4" fill="${OL}"/>`).join('')}`,
  ac: () => `<rect x="0" y="0" width="70" height="26" rx="5" ${Art.st('#e8ecef')}/><path d="M6 18 H64" stroke="#9aa4ac" stroke-width="2"/><path d="M6 21 H64" stroke="#9aa4ac" stroke-width="2"/><circle cx="60" cy="8" r="2" fill="#3f6"/><path d="M20 26 q2 8 0 14" stroke="rgba(120,180,220,.5)" stroke-width="2" fill="none"/>`,
  pipe: () => `<path d="M0 8 H120" stroke="${OL}" stroke-width="12"/><path d="M0 8 H120" stroke="#7a828a" stroke-width="8"/><path d="M0 6 H120" stroke="rgba(255,255,255,.25)" stroke-width="2"/>${[20, 70].map(x => `<rect x="${x}" y="0" width="8" height="16" rx="1" ${Art.st('#5a626a', 2)}/>`).join('')}`,
  shelf: (v) => `<rect x="0" y="22" width="70" height="6" rx="1" ${Art.st('#7a5634', 2)}/><path d="M8 28 L14 36 M62 28 L56 36" stroke="${OL}" stroke-width="3"/><rect x="6" y="6" width="10" height="16" rx="2" ${Art.st('#c0392b', 1.8)}/><path d="M22 22 V10 Q22 4 28 4 Q34 4 34 10 V22Z" ${Art.st('#2e86c1', 1.8)}/><rect x="42" y="12" width="20" height="10" rx="1" ${Art.st('#e8d8a8', 1.8)}/>`,
};
Art.deco = function (k, v) {
  const sizes = { window: [80, 84], picture: [54, 42], poster: [40, 56], clock: [32, 32], ac: [70, 26], pipe: [120, 16], shelf: [70, 36] };
  const [w, h] = sizes[k]; const vv = (v || 0) % 4;
  return Art.make(`d_${k}_${vv}`, w, h, DECO_ART[k](vv), 10, 0.6);
};
// Wall texture overlays (neutral light/dark marks over the room tint)
Art.patterns = {};
Art.wallPattern = function (ctx, paper) {
  if (Art.patterns[paper]) return Art.patterns[paper];
  const defs = {
    stripe: [48, 48, `<rect width="48" height="48" fill="none"/><rect x="0" width="16" height="48" fill="rgba(255,255,255,.05)"/><rect x="16" width="2" height="48" fill="rgba(0,0,0,.08)"/><path d="M32 10 q4 6 0 12 q-4-6 0-12z M32 34 q4 6 0 12 q-4-6 0-12z" fill="rgba(255,255,255,.07)"/><circle cx="32" cy="28" r="1.6" fill="rgba(255,255,255,.08)"/>`],
    tile: [32, 32, `<rect x="1" y="1" width="30" height="30" rx="2" fill="rgba(255,255,255,.06)" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/><path d="M4 4 H14" stroke="rgba(255,255,255,.12)" stroke-width="2"/>`],
    brick: [64, 32, `<g fill="rgba(255,255,255,.05)" stroke="rgba(0,0,0,.22)" stroke-width="1.5"><rect x="1" y="1" width="30" height="14" rx="1.5"/><rect x="33" y="1" width="30" height="14" rx="1.5"/><rect x="-15" y="17" width="30" height="14" rx="1.5"/><rect x="17" y="17" width="30" height="14" rx="1.5"/><rect x="49" y="17" width="30" height="14" rx="1.5"/></g><rect x="36" y="4" width="10" height="3" fill="rgba(255,255,255,.07)"/>`],
    panel: [60, 60, `<rect x="2" y="2" width="56" height="56" rx="2" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="2"/><rect x="6" y="6" width="48" height="48" rx="1" fill="rgba(255,255,255,.035)"/>`],
  };
  const d = defs[paper] || defs.panel;
  const o = Art.make('pat_' + paper, d[0], d[1], d[2], 0);
  if (!o.img.complete || !o.img.naturalWidth) return null;
  const pat = ctx.createPattern(o.img, 'repeat');
  if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(0.5));
  Art.patterns[paper] = pat;
  return pat;
};


// ---------- Background layers (procedural illustrated SVG tiles) ----------
Art.skyline = function (kind, layer) {
  const key = `sky_${kind}_${layer}`;
  if (Art.cache[key]) return Art.cache[key];
  const W = 900, H = 340, r = U.rng(layer * 991 + kind.length * 31);
  let s = '';
  if (kind === 'city' || kind === 'sea' || kind === 'open') {
    const far = layer === 0;
    const col = far ? '#1c2238' : '#11141f', win = far ? 'rgba(255,214,140,.30)' : 'rgba(255,214,140,.55)';
    let x = 0;
    while (x < W) {
      const bw = (kind === 'open' ? 50 : 40) + r() * 80, bh = kind === 'open' ? 40 + r() * 70 : (far ? 120 : 70) + r() * (far ? 200 : 150);
      const top = H - bh;
      s += `<rect x="${x}" y="${top}" width="${bw + 1}" height="${bh}" fill="${col}"/>`;
      const roof = r();
      if (roof < 0.2) s += `<path d="M${x + bw * 0.2} ${top} V${top - 18} H${x + bw * 0.45} V${top}" fill="${col}"/><ellipse cx="${x + bw * 0.32}" cy="${top - 20}" rx="${bw * 0.14}" ry="5" fill="${col}"/>`; // water tower
      else if (roof < 0.4) s += `<path d="M${x + bw / 2} ${top} V${top - 30 - r() * 30}" stroke="${col}" stroke-width="3"/><circle cx="${x + bw / 2}" cy="${top - 32}" r="1.6" fill="#f44" opacity=".8"/>`;
      else if (roof < 0.55) s += `<path d="M${x} ${top} L${x + bw / 2} ${top - 20} L${x + bw} ${top}Z" fill="${col}"/>`;
      else if (roof < 0.65) s += `<path d="M${x + bw * 0.6} ${top} l8 -14 l10 6 l6 -10 V${top}Z" fill="${col}"/>`; // broken top
      for (let wy = top + 10; wy < H - 10; wy += 14) for (let wx = x + 6; wx < x + bw - 8; wx += 11) if (r() < (far ? 0.12 : 0.16)) s += `<rect x="${wx}" y="${wy}" width="5" height="7" fill="${win}"/>`;
      if (!far && r() < 0.3) s += `<path d="M${x + r() * bw} ${top + 10} q6 20 -4 40 q10 10 0 30" stroke="rgba(0,0,0,.4)" stroke-width="2" fill="none"/>`;
      x += bw + (r() < 0.2 ? 10 + r() * 30 : 0);
    }
    if (!far && kind !== 'open') for (let i = 0; i < 6; i++) { const sx = r() * W; s += `<path d="M${sx} ${H - 100 - r() * 100} q-20 -60 10 -120 q-30 -40 0 -90" stroke="rgba(60,60,70,.25)" stroke-width="${10 + r() * 14}" fill="none" stroke-linecap="round"/>`; } // smoke
  } else if (kind === 'forest') {
    const col = layer ? '#0c1812' : '#15261e';
    for (let i = 0; i < 40; i++) { const x = r() * W, h = 90 + r() * 160 + layer * 40, w = 26 + r() * 24; s += `<path d="M${x} ${H} V${H - h * 0.15} L${x - w} ${H - h * 0.15} L${x - w * 0.3} ${H - h * 0.5} L${x - w * 0.7} ${H - h * 0.5} L${x} ${H - h} L${x + w * 0.7} ${H - h * 0.5} L${x + w * 0.3} ${H - h * 0.5} L${x + w} ${H - h * 0.15} L${x} ${H - h * 0.15}Z" fill="${col}"/>`; }
  } else if (kind === 'snow') {
    const col = layer ? '#a8b8cc' : '#7d90aa';
    let d = `M0 ${H}`; for (let x = 0; x <= W; x += 60) d += ` L${x} ${H - 80 - Math.abs(Math.sin(x * 0.01 + layer)) * (layer ? 80 : 200) - r() * 30}`; d += ` L${W} ${H}Z`;
    s += `<path d="${d}" fill="${col}"/>`;
    for (let x = 0; x <= W; x += 60) if (!layer && r() < 0.6) s += `<path d="M${x - 14} ${H - 150} l14 -30 l14 30 q-14 -8 -28 0z" fill="#e8f0f8" opacity=".7"/>`;
  } else if (kind === 'desert') {
    const col = layer ? '#8a4f3a' : '#6a3a3a';
    let d = `M0 ${H}`; for (let x = 0; x <= W; x += 30) d += ` L${x} ${H - 60 - Math.sin(x * 0.012 + layer * 2) * 40 - (layer ? 0 : 40)}`; d += ` L${W} ${H}Z`;
    s += `<path d="${d}" fill="${col}"/>`;
    if (layer) for (let i = 0; i < 4; i++) { const x = r() * W; s += `<path d="M${x} ${H - 40} V${H - 90} M${x} ${H - 70} h-10 v-12 M${x} ${H - 60} h10 v-14" stroke="#4a2a22" stroke-width="7" stroke-linecap="round" fill="none"/>`; }
  }
  return Art.make(key, W, H, s, 0);
};
Art.door = function (outer) {
  return Art.make('door_' + (outer ? 1 : 0), 30, DOOR_H, `<defs>${Art.lg('dr', outer ? '#5a4632' : '#8a6440', outer ? '#3a2c1e' : '#5e4228', true)}</defs>
    <path d="M2 4 L28 14 V${DOOR_H - 6} L2 ${DOOR_H}Z" ${Art.st('url(#dr)')}/>
    <path d="M7 18 L23 24 V58 L7 54Z M7 70 L23 74 V${DOOR_H - 18} L7 ${DOOR_H - 14}Z" fill="rgba(0,0,0,.18)" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>
    <circle cx="22" cy="${DOOR_H / 2 + 6}" r="2.5" ${Art.st('#d4b06a', 1.5)}/>`, 3);
};

// ---------- Item icons (40x40) ----------
const ammoBox = (c, label) => `<path d="M6 16 L20 10 L34 16 V32 L20 38 L6 32Z" ${Art.st('#6b5a3a', 2)}/><path d="M6 16 L20 22 L34 16 L20 10Z" ${Art.st('#8a7650', 2)}/><path d="M20 22 V38" stroke="${OL}" stroke-width="1.5"/>
  ${[0, 1, 2].map(i => `<rect x="${12 + i * 5}" y="${3 + (i % 2) * 2}" width="4" height="12" rx="1.5" ${Art.st(c, 1.4)}/><rect x="${12 + i * 5}" y="${10 + (i % 2) * 2}" width="4" height="5" fill="#b08a40" stroke="${OL}" stroke-width="1"/>`).join('')}
  <text x="13" y="31" font-size="6" font-weight="900" font-family="sans-serif" fill="#f0e0b0" transform="skewY(22) translate(0 -7)">${label}</text>`;
const ICON_ART = {
  nails: `<path d="M7 17 H33 V35 H7Z" ${Art.st('#b4895a')}/><path d="M7 17 L11 11 H29 L33 17" ${Art.st('#c9a06a', 2)}/><path d="M7 23 H33" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>${[[12, 9, -0.3], [18, 7, 0.1], [24, 8, 0.4], [28, 10, -0.2]].map(([x, y, a]) => `<g transform="rotate(${a * 57} ${x} ${y + 8})"><path d="M${x} ${y} V${y + 13}" stroke="${OL}" stroke-width="3.6" stroke-linecap="round"/><path d="M${x} ${y} V${y + 13}" stroke="#c9d1d8" stroke-width="1.8" stroke-linecap="round"/><path d="M${x - 2.6} ${y} H${x + 2.6}" stroke="${OL}" stroke-width="3.4" stroke-linecap="round"/><path d="M${x - 2} ${y} H${x + 2}" stroke="#e4e9ec" stroke-width="1.6" stroke-linecap="round"/></g>`).join('')}<path d="M4 37 L14 34" stroke="${OL}" stroke-width="3.4" stroke-linecap="round"/><path d="M4 37 L14 34" stroke="#c9d1d8" stroke-width="1.6" stroke-linecap="round"/>`,
  lockpick: `<path d="M8 30 L26 12" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M8 30 L26 12" stroke="#c9d1d8" stroke-width="2.6" stroke-linecap="round"/><path d="M26 12 L31 9 L29 14" fill="none" stroke="${OL}" stroke-width="3.6" stroke-linejoin="round"/><path d="M26 12 L31 9 L29 14" fill="none" stroke="#e4e9ec" stroke-width="1.6"/><path d="M12 34 L32 22" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M12 34 L32 22" stroke="#9aa2aa" stroke-width="2.6" stroke-linecap="round"/><path d="M32 22 L34 26" stroke="${OL}" stroke-width="3.4" stroke-linecap="round"/><circle cx="8" cy="30" r="4" ${Art.st('#c0392b', 1.8)}/>`,
  a9: ammoBox('#d4b040', '9mm'), a44: ammoBox('#c08a30', '.44'), a12: ammoBox('#c03a2a', '12g'), a556: ammoBox('#6a9a4a', '5.56'), a762: ammoBox('#4a7aa0', '7.62'),
  bolt: `<path d="M6 34 L30 10" stroke="${OL}" stroke-width="4.5"/><path d="M6 34 L30 10" stroke="#a87a4a" stroke-width="2.5"/><path d="M30 10 L36 4 L33 13Z" ${Art.st('#c9d1d8', 1.4)}/><path d="M6 34 L4 28 M6 34 L12 36 M9 31 L7 25 M9 31 L15 33" stroke="#c0392b" stroke-width="2"/><path d="M14 36 L36 14" stroke="${OL}" stroke-width="3.5" opacity=".9"/><path d="M14 36 L36 14" stroke="#b08a5a" stroke-width="2"/>`,
  pack_school: `<path d="M13 9 Q20 2 27 9" fill="none" stroke="${OL}" stroke-width="3"/><path d="M13 9 Q20 2 27 9" fill="none" stroke="#2e5f90" stroke-width="1.6"/><rect x="8" y="8" width="24" height="29" rx="6" ${Art.st('#3f7fbf')}/><rect x="11" y="22" width="18" height="12" rx="3" ${Art.st('#2e5f90', 1.6)}/><path d="M11 26 H29" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/><path d="M12 13 Q20 10 28 13" stroke="rgba(255,255,255,.25)" stroke-width="2" fill="none"/>`,
  pack_day: `<path d="M13 9 Q20 2 27 9" fill="none" stroke="${OL}" stroke-width="3"/><path d="M13 9 Q20 2 27 9" fill="none" stroke="#5a4632" stroke-width="1.6"/><rect x="8" y="8" width="24" height="29" rx="6" ${Art.st('#7a6248')}/><rect x="11" y="22" width="18" height="12" rx="3" ${Art.st('#5a4632', 1.6)}/><path d="M11 26 H29" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/><path d="M12 13 Q20 10 28 13" stroke="rgba(255,255,255,.25)" stroke-width="2" fill="none"/>`,
  pack_hiking: `<path d="M13 9 Q20 2 27 9" fill="none" stroke="${OL}" stroke-width="3"/><path d="M13 9 Q20 2 27 9" fill="none" stroke="#8a4420" stroke-width="1.6"/><rect x="8" y="8" width="24" height="29" rx="6" ${Art.st('#c0632e')}/><rect x="11" y="22" width="18" height="12" rx="3" ${Art.st('#8a4420', 1.6)}/><path d="M11 26 H29" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/><path d="M12 13 Q20 10 28 13" stroke="rgba(255,255,255,.25)" stroke-width="2" fill="none"/><rect x="6" y="14" width="4" height="16" rx="2" fill="#5a3a20"/><rect x="30" y="14" width="4" height="16" rx="2" fill="#5a3a20"/>`,
  pack_duffel: `<path d="M12 14 Q20 6 28 14" fill="none" stroke="${OL}" stroke-width="3"/><rect x="3" y="14" width="34" height="18" rx="9" ${Art.st('#3d4a5c')}/><path d="M8 23 H32" stroke="#c9a227" stroke-width="2"/><circle cx="7" cy="23" r="3" ${Art.st('#2c3644', 1.4)}/><circle cx="33" cy="23" r="3" ${Art.st('#2c3644', 1.4)}/>`,
  pack_military: `<path d="M13 9 Q20 2 27 9" fill="none" stroke="${OL}" stroke-width="3"/><path d="M13 9 Q20 2 27 9" fill="none" stroke="#44522a" stroke-width="1.6"/><rect x="8" y="8" width="24" height="29" rx="6" ${Art.st('#5a6b3a')}/><rect x="11" y="22" width="18" height="12" rx="3" ${Art.st('#44522a', 1.6)}/><path d="M11 26 H29" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/><path d="M12 13 Q20 10 28 13" stroke="rgba(255,255,255,.25)" stroke-width="2" fill="none"/><path d="M14 16 H26 M14 19 H26" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>`,
  pack_raid: `<path d="M13 9 Q20 2 27 9" fill="none" stroke="${OL}" stroke-width="3"/><path d="M13 9 Q20 2 27 9" fill="none" stroke="#1f2226" stroke-width="1.6"/><rect x="8" y="8" width="24" height="29" rx="6" ${Art.st('#2f3338')}/><rect x="11" y="22" width="18" height="12" rx="3" ${Art.st('#1f2226', 1.6)}/><path d="M11 26 H29" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/><path d="M12 13 Q20 10 28 13" stroke="rgba(255,255,255,.25)" stroke-width="2" fill="none"/><rect x="6" y="12" width="5" height="18" rx="2" fill="#44494f"/><rect x="29" y="12" width="5" height="18" rx="2" fill="#44494f"/><path d="M14 15 H26" stroke="#c0392b" stroke-width="2"/>`,
  key_military: `<rect x="5" y="9" width="30" height="22" rx="3" ${Art.st('#5a6b3a')}/><rect x="9" y="13" width="9" height="11" rx="1" fill="#d9d2b8"/><path d="M21 15 H31 M21 19 H29 M21 23 H31" stroke="#e8e0c0" stroke-width="1.6"/><rect x="5" y="26" width="30" height="5" fill="#c9a227"/>`,
  key_lab: `<rect x="5" y="9" width="30" height="22" rx="3" ${Art.st('#2f6f8a')}/><rect x="9" y="13" width="8" height="6" rx="1" fill="#e8c860"/><path d="M9 24 H31 M9 27 H24" stroke="rgba(255,255,255,.5)" stroke-width="1.4"/><circle cx="28" cy="15" r="3.5" fill="none" stroke="#9fe8ff" stroke-width="1.6"/>`,
  key_police: `<circle cx="13" cy="20" r="7" ${Art.st('#c9a227')}/><circle cx="13" cy="20" r="2.6" fill="#3a2a0c"/><path d="M20 20 H35 M30 20 V26 M34 20 V25" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M20 20 H35 M30 20 V26 M34 20 V25" stroke="#d9b13a" stroke-width="3" stroke-linecap="round"/>`,
  pipebomb: `<rect x="9" y="13" width="22" height="20" rx="2" ${Art.st('#7a7f86')}/><rect x="7" y="11" width="26" height="5" rx="1.5" ${Art.st('#5a5f66', 1.6)}/><rect x="7" y="30" width="26" height="5" rx="1.5" ${Art.st('#5a5f66', 1.6)}/><path d="M14 18 H26 M14 23 H26 M14 28 H26" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/><path d="M20 11 Q22 4 28 5" stroke="${OL}" stroke-width="2" fill="none"/><circle cx="29" cy="5" r="2.6" fill="#ffb03a"/><path d="M11 16 V30" stroke="rgba(255,255,255,.3)" stroke-width="2"/>`,
  spiketrap: `<rect x="4" y="24" width="32" height="8" rx="1.5" ${Art.st('#9a6e3e')}/><path d="M8 24 L9 13 M13 24 L13 11 M18 24 L19 12 M23 24 L23 10 M28 24 L29 12 M33 24 L32 13" stroke="#c9ced3" stroke-width="2.4" stroke-linecap="round"/><path d="M8 24 L9 13 M13 24 L13 11 M18 24 L19 12 M23 24 L23 10 M28 24 L29 12 M33 24 L32 13" stroke="${OL}" stroke-width="0.8" stroke-linecap="round" opacity=".5"/><path d="M6 27 H34" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/>`,
  mine:    `<ellipse cx="20" cy="27" rx="16" ry="7" ${Art.st('#4b5236')}/><ellipse cx="20" cy="23" rx="10" ry="4.5" ${Art.st('#6a7350', 1.6)}/><rect x="17" y="15" width="6" height="6" rx="1" ${Art.st('#8a8f96', 1.4)}/><circle cx="29" cy="22" r="2.2" fill="#ff3b2f"/><path d="M8 28 Q12 31 18 31" stroke="rgba(255,255,255,.2)" stroke-width="2" fill="none"/>`,
  grenade: `<path d="M20 12 Q32 12 32 25 Q32 37 20 37 Q8 37 8 25 Q8 12 20 12Z" ${Art.st('#4a5a32')}/><path d="M12 20 H28 M10 26 H30 M12 32 H28 M16 13 V36 M24 13 V36" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/><rect x="15" y="6" width="10" height="7" rx="1" ${Art.st('#8a9096', 1.6)}/><path d="M25 8 Q34 4 33 14" stroke="${OL}" stroke-width="2" fill="none"/><circle cx="30" cy="5" r="3" fill="none" stroke="#c9a227" stroke-width="1.8"/><path d="M12 18 Q14 14 18 14" stroke="rgba(255,255,255,.3)" stroke-width="2" fill="none"/>`,
  gunparts: `<circle cx="16" cy="20" r="10" ${Art.st('#8a9096')}/><circle cx="16" cy="20" r="4" ${Art.st('#4a5056', 1.4)}/>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="14" y="7" width="4" height="5" fill="#8a9096" stroke="${OL}" stroke-width="1.2" transform="rotate(${i * 60} 16 20)"/>`).join('')}<rect x="22" y="24" width="14" height="6" rx="1" ${Art.st('#3a3f45', 1.5)}/><path d="M26 30 L25 37 H30 L31 30" ${Art.st('#2a2e33', 1.4)}/>`,
  scope: `<rect x="6" y="14" width="28" height="10" rx="3" ${Art.st('#2a2e33')}/><rect x="2" y="12" width="7" height="14" rx="2" ${Art.st('#3a3f45', 1.6)}/><rect x="31" y="13" width="7" height="12" rx="2" ${Art.st('#3a3f45', 1.6)}/><ellipse cx="5" cy="19" rx="1.6" ry="4" fill="#5a9ac0"/><rect x="14" y="24" width="4" height="6" fill="#1e2227"/><rect x="24" y="24" width="4" height="6" fill="#1e2227"/><path d="M10 16 H28" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>`,
  extmag: `<path d="M12 4 H26 L28 36 Q20 39 10 36Z" ${Art.st('#3a3f45')}/><path d="M12 10 H26 M12 16 H27 M11 22 H27 M11 28 H28" stroke="rgba(255,255,255,.12)" stroke-width="1.5"/><rect x="14" y="0" width="10" height="5" rx="1" ${Art.st('#d4b040', 1.4)}/>`,
  silencer: `<rect x="3" y="14" width="34" height="12" rx="5" ${Art.st('#2c3034')}/><path d="M10 14 V26 M17 14 V26 M24 14 V26 M31 14 V26" stroke="rgba(255,255,255,.12)" stroke-width="1.5"/><path d="M6 17 H34" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>`,
  grip: `<path d="M8 10 H32 V16 H26 L24 36 H16 L14 16 H8Z" ${Art.st('#3a3f45')}/><path d="M16 20 H24 M16 25 H24 M16 30 H24" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>`,
  scrap: `<path d="M6 30 L12 18 L20 22 L26 12 L34 20 L30 34 L14 36Z" ${Art.st('#7a7e84')}/><path d="M12 18 L16 30 M26 12 L24 26" stroke="rgba(0,0,0,.3)" stroke-width="1.4"/><circle cx="22" cy="28" r="3" ${Art.st('#9aa0a6', 1.2)}/><path d="M8 12 l6 -6 M28 36 l6 2" stroke="#a0603a" stroke-width="3"/>`,
  cloth: `<path d="M6 14 Q14 8 24 12 Q34 8 36 16 L34 32 Q24 36 16 32 Q8 36 4 30Z" ${Art.st('#c9b8a0')}/><path d="M10 18 Q20 22 32 18 M8 24 Q20 28 34 24" stroke="rgba(0,0,0,.25)" stroke-width="1.4" fill="none"/><path d="M28 30 Q32 36 36 38" stroke="#a89880" stroke-width="2" fill="none"/>`,
  chem: `<path d="M15 4 H25 V14 L33 32 Q34 37 28 37 H12 Q6 37 7 32 L15 14Z" ${Art.st('rgba(220,235,245,.9)')}/><path d="M10 26 H30 L32 32 Q33 35 28 35 H12 Q7 35 8 32Z" fill="#7ad04a"/><circle cx="16" cy="30" r="1.6" fill="rgba(255,255,255,.7)"/><circle cx="22" cy="27" r="1" fill="rgba(255,255,255,.7)"/><rect x="13" y="2" width="14" height="4" rx="1" ${Art.st('#555', 1.4)}/>`,
  elec: `<rect x="5" y="10" width="30" height="22" rx="2" ${Art.st('#2e7a4a')}/><path d="M9 16 H20 V22 H28 M12 28 H24" stroke="#d4b040" stroke-width="1.6" fill="none"/><rect x="16" y="14" width="8" height="8" ${Art.st('#1e2227', 1.2)}/>${[0, 1, 2, 3].map(i => `<path d="M${10 + i * 6} 32 V37" stroke="#c9d1d8" stroke-width="1.8"/>`).join('')}<circle cx="30" cy="15" r="2" fill="#e74c3c"/>`,
  canned: `<path d="M9 9 H31 V33 Q20 37 9 33Z" ${Art.st('#b8bec4')}/><ellipse cx="20" cy="9" rx="11" ry="3.5" ${Art.st('#d8dde0', 1.6)}/><rect x="9" y="15" width="22" height="12" fill="#c0392b" stroke="${OL}" stroke-width="1"/><circle cx="20" cy="21" r="4" fill="#f1c40f"/><path d="M12 12 V31" stroke="rgba(255,255,255,.35)" stroke-width="2"/>`,
  water: `<path d="M16 4 H24 V9 Q30 12 30 18 V34 Q30 38 26 38 H14 Q10 38 10 34 V18 Q10 12 16 9Z" ${Art.st('rgba(150,200,235,.85)')}/><rect x="15" y="2" width="10" height="4" rx="1" ${Art.st('#2e86c1', 1.4)}/><rect x="10" y="20" width="20" height="9" fill="#2e86c1" stroke="${OL}" stroke-width="1"/><path d="M13 14 V34" stroke="rgba(255,255,255,.55)" stroke-width="2"/>`,
  bar: `<rect x="4" y="12" width="32" height="16" rx="2" ${Art.st('#6a3a1e')}/><path d="M4 12 H20 L22 28 H4Z" ${Art.st('#c0392b', 1.6)}/><path d="M14 12 V28 M28 12 V28 M22 20 H36" stroke="rgba(0,0,0,.3)" stroke-width="1.4"/><text x="12" y="23" font-size="6" font-weight="900" font-family="sans-serif" fill="#fff" text-anchor="middle">CHOC</text>`,
  mre: `<rect x="4" y="10" width="32" height="22" rx="3" ${Art.st('#7a6a40')}/><path d="M4 16 H36" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="20" y="27" font-size="8" font-weight="900" font-family="sans-serif" fill="#2a2414" text-anchor="middle">MRE</text><path d="M30 10 L36 4" stroke="${OL}" stroke-width="1.5"/>`,
  stew: `<path d="M6 18 H34 Q34 34 20 34 Q6 34 6 18Z" ${Art.st('#c0392b')}/><ellipse cx="20" cy="18" rx="14" ry="4" ${Art.st('#a0522d', 1.6)}/><circle cx="15" cy="17" r="2" fill="#e67e22"/><circle cx="23" cy="18" r="2" fill="#27ae60"/><path d="M14 12 Q12 8 15 4 M20 12 Q18 7 21 3 M26 12 Q24 8 27 5" stroke="rgba(255,255,255,.5)" stroke-width="1.6" fill="none"/>`,
  bandage: `<path d="M8 26 Q4 18 12 14 L28 6 Q36 4 36 12 Q36 18 30 22 L14 30 Q8 32 8 26Z" ${Art.st('#efe6d4')}/><path d="M14 16 L24 30 M20 12 L30 26" stroke="rgba(0,0,0,.15)" stroke-width="1.4"/><rect x="17" y="15" width="9" height="9" rx="1" transform="rotate(-26 21 19)" fill="#e8c8a0" stroke="${OL}" stroke-width="1"/>`,
  pills: `<path d="M10 14 H30 V34 Q30 37 27 37 H13 Q10 37 10 34Z" ${Art.st('#e67e22')}/><rect x="9" y="7" width="22" height="8" rx="2" ${Art.st('#f4f4f0', 1.6)}/><rect x="13" y="20" width="14" height="9" fill="#fff" stroke="${OL}" stroke-width="1"/><path d="M17 24.5 h6 M20 21.5 v6" stroke="#d33" stroke-width="1.8"/><path d="M13 16 V34" stroke="rgba(255,255,255,.3)" stroke-width="2"/>`,
  medkit: `<rect x="4" y="12" width="32" height="24" rx="4" ${Art.st('#d63031')}/><path d="M14 12 V8 Q14 6 16 6 H24 Q26 6 26 8 V12" fill="none" stroke="${OL}" stroke-width="2.2"/><rect x="16" y="17" width="8" height="15" rx="1" fill="#fff"/><rect x="12.5" y="20.5" width="15" height="8" rx="1" fill="#fff"/><path d="M7 15 V32" stroke="rgba(255,255,255,.25)" stroke-width="2"/>`,
  antiviral: `<path d="M6 34 L26 14" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><path d="M6 34 L26 14" stroke="rgba(220,235,245,.95)" stroke-width="6" stroke-linecap="round"/><path d="M9 31 L19 21" stroke="#4fd1c5" stroke-width="5"/><path d="M26 14 L32 8 M29 5 L35 11" stroke="${OL}" stroke-width="3" stroke-linecap="round"/><path d="M4 36 L1 39" stroke="#c9d1d8" stroke-width="2"/>`,
  adrenaline: `<path d="M8 32 L28 12" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><path d="M8 32 L28 12" stroke="#f1c40f" stroke-width="6" stroke-linecap="round"/><path d="M15 21 L19 25 M19 17 L23 21" stroke="${OL}" stroke-width="1.4"/><path d="M28 12 L34 6" stroke="${OL}" stroke-width="3"/><path d="M5 35 L2 38" stroke="#c9d1d8" stroke-width="2"/><path d="M30 26 L26 32 H30 L27 38" stroke="#e67e22" stroke-width="2" fill="none"/>`,
  watch: `<rect x="15" y="2" width="10" height="36" rx="3" ${Art.st('#8a6a2a')}/><circle cx="20" cy="20" r="10" ${Art.st('#e0b84a')}/><circle cx="20" cy="20" r="7" ${Art.st('#fffaf0', 1.2)}/><path d="M20 20 V15 M20 20 L23 22" stroke="${OL}" stroke-width="1.4"/>`,
  jewelry: `<path d="M8 10 Q20 34 32 10" fill="none" stroke="#e0b84a" stroke-width="2.5"/><path d="M20 22 L26 28 L20 36 L14 28Z" ${Art.st('#4fd1c5', 1.6)}/><path d="M20 22 L20 36 M14 28 H26" stroke="rgba(255,255,255,.5)" stroke-width="1"/>`,
  laptop: `<path d="M8 6 H32 V26 H8Z" ${Art.st('#3a3f45')}/><rect x="10.5" y="8.5" width="19" height="15" fill="#3a6a9a"/><path d="M12 10 L18 20" stroke="rgba(255,255,255,.25)" stroke-width="2"/><path d="M4 26 H36 L38 32 H2Z" ${Art.st('#8a9096')}/>`,
  gold: `<path d="M4 30 L10 16 H30 L36 30Z" ${Art.st('#e0b030')}/><path d="M10 16 L14 24 H26 L30 16" fill="none" stroke="#a07a10" stroke-width="1.5"/><path d="M4 30 L14 24 H26 L36 30" fill="#c9971a" stroke="${OL}" stroke-width="1.5"/><path d="M13 19 H22" stroke="rgba(255,255,255,.6)" stroke-width="2"/>`,
  fuse: `<rect x="8" y="12" width="24" height="16" rx="3" ${Art.st('rgba(220,235,245,.9)')}/><rect x="2" y="14" width="7" height="12" rx="1" ${Art.st('#c9a227', 1.6)}/><rect x="31" y="14" width="7" height="12" rx="1" ${Art.st('#c9a227', 1.6)}/><path d="M9 20 Q14 15 18 22 T27 19 T31 20" stroke="#e67e22" stroke-width="1.6" fill="none"/>`,
  datadrive: `<rect x="8" y="4" width="24" height="32" rx="3" ${Art.st('#2e5a8a')}/><rect x="12" y="4" width="16" height="10" fill="#c9d1d8" stroke="${OL}" stroke-width="1.2"/><rect x="21" y="6" width="4" height="6" fill="#2e5a8a"/><rect x="12" y="20" width="16" height="12" rx="1" fill="#e8e2d2"/><path d="M14 24 H26 M14 28 H22" stroke="#555" stroke-width="1.2"/>`,
  sample: `<rect x="14" y="2" width="12" height="36" rx="6" ${Art.st('rgba(220,235,245,.9)')}/><rect x="15.5" y="16" width="9" height="20" rx="4.5" fill="#9dff3c"/><circle cx="19" cy="22" r="1.4" fill="#2a6a10"/><circle cx="22" cy="28" r="1.8" fill="#2a6a10"/><rect x="12" y="1" width="16" height="6" rx="2" ${Art.st('#d63031', 1.4)}/>`,
  radio: `<rect x="6" y="12" width="28" height="24" rx="3" ${Art.st('#3a4a32')}/><path d="M26 12 L30 2" stroke="${OL}" stroke-width="2.4"/><circle cx="16" cy="24" r="6" ${Art.st('#2a2e33', 1.4)}/><path d="M12 22 H20 M12 25 H20 M12 28 H20" stroke="#5a6068" stroke-width="1"/><rect x="25" y="17" width="6" height="4" fill="#9dff3c"/><circle cx="28" cy="29" r="2.5" ${Art.st('#c9a227', 1.2)}/>`,
  cash: `<rect x="4" y="12" width="32" height="18" rx="2" ${Art.st('#4fae5a')}/><rect x="7" y="15" width="26" height="12" rx="1" fill="none" stroke="#2f7a3a" stroke-width="1.2"/><circle cx="20" cy="21" r="4" fill="#2f7a3a"/><rect x="2" y="8" width="32" height="18" rx="2" ${Art.st('#5cbf66')}/><circle cx="18" cy="17" r="4" fill="#3a8a44"/>`,
};
Art.iconArt = function (id) { return ICON_ART[id] ? Art.make('ic_' + id, 40, 40, ICON_ART[id], 3, 0.8) : null; };
Art.icon = function (id, rot) {
  if (WEAPON_ART[id]) { const o = Parts.weapon(id); return `<img class="wicon" src="${o.img.src}" style="${rot ? 'transform:rotate(90deg);' : ''}" draggable="false">`; }
  const o = Art.iconArt(id);
  if (o) return `<img class="iicon" src="${o.img.src}" draggable="false">`;
  return ITEMS[id].icon;
};

// ---------- External sprite overrides (assets/sprites/*.png listed in assets/sprites/manifest.js) ----------
// If a key exists in window.ASSET_MANIFEST, that PNG replaces the built-in vector art.
const Override = {
  imgs: {}, loaded: 0,
  init() {
    const list = (window.ASSET_MANIFEST || []);
    for (const key of list) {
      const img = new Image();
      img.onload = () => { this.loaded++; };
      img.onerror = () => { delete this.imgs[key]; };
      img.src = 'assets/sprites/' + key + '.png' + (window.ASSET_VER ? '?v=' + window.ASSET_VER : '');
      this.imgs[key] = img;
    }
  },
  get(key) { const i = this.imgs[key]; return i && i.complete && i.naturalWidth ? i : null; },
  has(key) { return !!this.imgs[key]; },
  // wrap an override image as an Art-like object occupying box w x h (bottom-centre aligned)
  obj(key, w, h, base) {
    const img = this.imgs[key]; if (!img) return null;
    return { img, w, h, pad: 0, ext: true, px: base && base.px, py: base && base.py };
  },
};
(function hookOverrides() {
  const _furn = Art.furn;
  Art.furn = function (kind, v) { const def = FURN[kind]; if (def && Override.has('furn_' + kind)) { const o = Override.obj('furn_' + kind, def.w, def.h); o.byHeight = true; return o; } return _furn(kind, v); };
  const _icon = Art.iconArt;
  // key items are generated at runtime (k_N) and share two pictures: location keycard / stage pass
  // ranked attachments share their family's picture (art); a new family borrows a similar one (artAlt) until its own exists
  const iconName = id => {
    if (ITEMS[id] && ITEMS[id].t === 'key') return ITEMS[id].icon === '🎫' ? 'icon_pass' : 'icon_key';
    let k = id;
    for (let i = 0; i < 3 && ITEMS[k]; i++) { if (Override.has('icon_' + k)) return 'icon_' + k; k = ITEMS[k].art || ITEMS[k].artAlt || k; }
    return 'icon_' + k;
  };
  Art.iconArt = function (id) { const n = iconName(id); return Override.has(n) ? Override.obj(n, 40, 40) : _icon(id); };
  const _wpn = Parts.weapon;
  Parts.weapon = function (id) { const b = _wpn.call(Parts, id); if (b && Override.has('wpn_' + id)) return Override.obj('wpn_' + id, b.w, b.h, b); return b; };
  const _deco = Art.deco;
  Art.deco = function (k, v) { const b = _deco(k, v); return Override.has('deco_' + k) ? Override.obj('deco_' + k, b.w, b.h) : b; };
  const swapRig = (rig, prefix) => {
    if (!rig) return rig;
    const parts = ['head', 'torso', 'arm', 'leg'];
    if (!parts.every(p => Override.has(prefix + '_' + p))) return rig;
    const out = { ext: true };
    for (const p of parts) out[p] = Override.imgs[prefix + '_' + p];
    out.full = Override.imgs[prefix] || null;
    return out;
  };
  const _char = Art.char; Art.char = id => swapRig(_char(id), 'char_' + id);
  const _zom = Art.zombie; Art.zombie = (i, sp) => swapRig(_zom(i, sp), 'zombie_' + (sp || 'walker' + (i % 5)));
  const _surv = Art.survivor; Art.survivor = k => swapRig(_surv(k), 'surv_' + k);
  const _pack = Parts.pack; Parts.pack = () => Override.has('backpack') ? Override.obj('backpack', 20, 30) : _pack();
  const _pat = Art.wallPattern;
  Art.wallPattern = function (ctx, paper) {
    const key = 'wall_' + paper, img = Override.get(key);
    if (!img) return _pat(ctx, paper);
    if (Art.patterns[key]) return Art.patterns[key];
    const pat = ctx.createPattern(img, 'repeat'); if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(160 / img.naturalWidth));
    pat._ext = true;
    return (Art.patterns[key] = pat);
  };
  // floor texture (Gemini) — squashed vertically to fake the floor's perspective
  Art.floorPattern = function (ctx, style) {
    const key = 'floor_' + style, img = Override.get(key);
    if (!img) return null;
    if (Art.patterns[key]) return Art.patterns[key];
    const pat = ctx.createPattern(img, 'repeat'); const k = 110 / img.naturalWidth;
    if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(k, k * 0.32));
    return (Art.patterns[key] = pat);
  };
  // panorama backgrounds (Gemini) replace the procedural skyline
  const _sky = Art.skyline;
  Art.skyline = function (kind, layer) {
    const k = { sea: 'city', open: 'city' }[kind] || kind;
    const key = `bg_${k}_${layer}`, img = Override.get(key);
    if (!img) return _sky(kind, layer);
    const wide = img.naturalWidth / img.naturalHeight > 3.5, W = k === 'city' ? 1400 : wide ? 1250 : 1050;
    const dim = k === 'snow' ? 0.7 : k === 'desert' ? 0.85 : 1;
    return { img, w: W, h: W * img.naturalHeight / img.naturalWidth, ext: true, night: (layer ? 0.42 : 0.3) * dim };
  };
})();
// draw: external images are fitted into the box keeping aspect (bottom-centre)
const _artDraw = Art.draw;
Art.draw = function (ctx, o, x, y, w, h) {
  if (!o || !o.ext) return _artDraw.call(Art, ctx, o, x, y, w, h);
  const img = o.img; if (!img.complete || !img.naturalWidth) return false;
  const bw = w || o.w, bh = h || o.h;
  let k = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
  if (o.byHeight) { k = bh / img.naturalHeight; if (img.naturalWidth * k > bw * 1.5) k = bw * 1.5 / img.naturalWidth; }
  const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
  const flt = o.filt ? o.filt : o.night ? `brightness(${o.night.toFixed(2)}) saturate(0.6) hue-rotate(-12deg)` : o.back ? 'brightness(0.72)' : null;
  ctx.drawImage(FilterCache.get(img, flt), x + (bw - dw) / 2, y + (bh - dh), dw, dh);
  return true;
};

// ---------- weapon part & blueprint icons ----------
Object.assign(ICON_ART, {
  p_receiver: `<path d="M4 14 H30 V24 H22 L20 30 H14 L13 24 H4Z" ${Art.st('#3a3f45')}/><rect x="6" y="16" width="14" height="4" fill="#1e2227"/><circle cx="26" cy="19" r="2" fill="#8a9096"/><path d="M30 17 H37" stroke="${OL}" stroke-width="3"/>`,
  p_barrel:   `<rect x="2" y="16" width="34" height="7" rx="2" ${Art.st('#4a5056')}/><rect x="30" y="14" width="7" height="11" rx="1.5" ${Art.st('#2a2e33', 1.5)}/><path d="M5 18 H29" stroke="rgba(255,255,255,.3)" stroke-width="1.5"/><circle cx="35" cy="19.5" r="1.6" fill="#111"/>`,
  p_stock:    `<path d="M4 12 L26 16 V24 L4 34 Q2 23 4 12Z" ${Art.st('#7a5532')}/><path d="M26 16 H36 V22 H26" ${Art.st('#3a3f45', 1.8)}/><path d="M8 18 L22 20" stroke="rgba(255,255,255,.25)" stroke-width="2"/>`,
  p_trigger:  `<path d="M8 12 H32 V20 H8Z" ${Art.st('#3a3f45')}/><path d="M16 20 Q16 32 26 32 Q30 30 28 26" fill="none" stroke="${OL}" stroke-width="3"/><path d="M20 20 Q20 27 23 27" fill="none" stroke="#c9a227" stroke-width="2.5"/>`,
  p_spring:   `<path d="M6 30 L12 10 L16 30 L20 10 L24 30 L28 10 L34 30" fill="none" stroke="${OL}" stroke-width="5" stroke-linejoin="round"/><path d="M6 30 L12 10 L16 30 L20 10 L24 30 L28 10 L34 30" fill="none" stroke="#b8c0c8" stroke-width="2.5" stroke-linejoin="round"/>`,
  p_blade:    `<path d="M6 30 L30 6 Q36 4 34 10 L10 34Z" ${Art.st('#d5dde4')}/><path d="M10 28 L30 8" stroke="#fff" stroke-width="1.5"/><path d="M4 32 L8 36" stroke="#7a5532" stroke-width="4"/>`,
  p_handle:   `<rect x="16" y="4" width="8" height="32" rx="3" ${Art.st('#7a5532')}/><path d="M16 12 H24 M16 18 H24 M16 24 H24" stroke="#4a3220" stroke-width="2"/><rect x="14" y="2" width="12" height="5" rx="1" ${Art.st('#8a9096', 1.5)}/>`,
  blueprint:  `<path d="M6 6 H30 Q34 6 34 10 V34 H10 Q6 34 6 30Z" ${Art.st('#2a6aa8')}/><path d="M10 10 H30 M10 16 H30 M10 22 H30 M10 28 H30 M14 8 V32 M22 8 V32" stroke="rgba(255,255,255,.18)" stroke-width="1"/><path d="M11 22 H26 V18 H29 V24 H17 L16 28 H13 L13 24 H11Z" fill="none" stroke="#e8f4ff" stroke-width="1.6"/><path d="M30 34 Q34 34 34 30" fill="#1a4a7a" stroke="${OL}" stroke-width="1.5"/>`,
});
for (const id of Object.keys(ITEMS)) if (ITEMS[id].t === 'blueprint') ICON_ART[id] = ICON_ART.blueprint;
(function () {
  const _icon = Art.icon;
  Art.icon = function (id, rot) {
    const it = ITEMS[id];
    if (it && it.t === 'blueprint' && WEAPON_ART[it.bp]) {
      return `<span class="bpicon"><img src="${Parts.weapon(it.bp).img.src}" draggable="false"></span>`;
    }
    return _icon(id, rot);
  };
})();
