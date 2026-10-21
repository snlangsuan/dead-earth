// ---------- Where you are: city skylines, location landmarks, local-language signs ----------
// Every city has its own distant skyline with its landmarks (sky_<stage>), every location the outside of the real place
// standing at the street next to the building (lm_<stage>_<i>), both painted by Gemini and listed in window.LOC_ART
// (assets/sprites/manifest.js). They are loaded only for the city being played. On top of that the signs are in the
// local language: the location's name board at the entrance and the exit signs inside.
const LocArt = {
  // language spoken in each city (signs)
  LANG: {
    as_0: 'th', as_1: 'en', as_2: 'zht', as_3: 'ko', as_4: 'ja', as_5: 'zh', as_6: 'hi', as_7: 'ar',
    oc_0: 'en', oc_1: 'en', oc_2: 'en', oc_3: 'en',
    eu_0: 'ru', eu_1: 'de', eu_2: 'fr', eu_3: 'en', eu_4: 'it',
    af_0: 'ar', af_1: 'en', af_2: 'am', af_3: 'sw', af_4: 'fr', af_5: 'en', af_6: 'en',
    na_0: 'es', na_1: 'en', na_2: 'en', na_3: 'en', na_4: 'en', na_5: 'en',
    sa_0: 'es', sa_1: 'es', sa_2: 'pt', sa_3: 'es', sa_4: 'es',
    an_0: 'en', an_1: 'ru', an_2: 'en',
  },
  EXIT: { th: 'ทางออก', en: 'EXIT', zht: '出口', zh: '出口', ko: '비상구', ja: '非常口', hi: 'निकास', ar: 'مخرج', ru: 'ВЫХОД', de: 'AUSGANG', fr: 'SORTIE', it: 'USCITA', am: 'መውጫ', sw: 'TOKEA', es: 'SALIDA', pt: 'SAÍDA' },
  // each location's own name, as it is written there
  NAME: {
    as_0: ['ตลาดนัดจตุจักร', 'สถานีรถไฟกรุงเทพ (หัวลำโพง)', 'โรงพยาบาลกลาง', 'สยามสแควร์'],
    as_1: ['Marina Bay Hotel', 'Pasir Panjang Terminal', 'Chinatown Food Centre', 'Changi Airport'],
    as_2: ['九龍唐樓', '旺角街市', '維多利亞港碼頭', '瑪麗醫院'],
    as_3: ['강남', '서울역', '명동 백화점', '대한고등학교', '용산기지'],
    as_4: ['新宿', '渋谷駅', '秋葉原', 'お台場研究所', '銀座ホテル'],
    as_5: ['老胡同', '工业园区工厂', '中心派出所', '北京医院', '王府井百货'],
    as_6: ['क्रॉफर्ड मार्केट', 'छत्रपति शिवाजी टर्मिनस', 'मुंबई बंदरगाह', 'धारावी', 'बॉम्बे अस्पताल'],
    as_7: ['سوق الذهب ديرة', 'دبي مول', 'فندق على البحر', 'ميناء جبل علي', 'مطار دبي الدولي'],
    oc_0: ['The Rocks', 'Darling Harbour', 'Royal Prince Alfred Hospital'],
    oc_1: ['Queen Victoria Market', 'Flinders Street Station', 'University of Melbourne', 'Biolab'],
    oc_2: ['Old Mine', 'Naval Base', 'Fremantle Harbour'],
    oc_3: ['Bush Village', 'Auckland CBD', 'Sky Tower Hotel', 'Auckland Airport'],
    eu_0: ['Станция метро', 'ГУМ', 'Военная база', 'Институт вирусологии'],
    eu_1: ['Kreuzberg', 'Charité', 'Hauptbahnhof', 'Fabrik am Fluss'],
    eu_2: ['Montmartre', 'Les Halles', 'Hôtel des Quais', 'Gare du Nord', 'Institut Pasteur'],
    eu_3: ["King's Cross", 'Camden Market', "St Thomas' Hospital", 'Canary Wharf', 'Scotland Yard'],
    eu_4: ['Centro Storico', 'Roma Termini', 'Policlinico Gemelli', 'Via del Corso'],
    af_0: ['خان الخليلي', 'محطة رمسيس', 'مستشفى القاهرة', 'قاعدة الجيزة'],
    af_1: ['Balogun Market', 'Apapa Port', 'Victoria Island', 'Ikeja Factory'],
    af_2: ['መርካቶ', 'የደጋ መንደር', 'የወረርሽኝ ምርምር ተቋም', 'ቦሌ አየር ማረፊያ'],
    af_3: ['Kibera', 'Hospitali ya Kenyatta', 'Kambi ya Walinzi', 'Westgate'],
    af_4: ['Marché Central', 'Port fluvial', 'Village de la forêt', 'Laboratoire', 'Commissariat de Gombe'],
    af_5: ['Old Gold Mine', 'Soweto', 'Sandton City', 'Smelter', 'Army Base'],
    af_6: ['V&A Waterfront', 'Camps Bay Hotel', 'Groote Schuur Hospital', "Simon's Town Naval Base", 'Coastal Research Station'],
    na_0: ['Mercado de La Merced', 'Coyoacán', 'Hospital General', 'Estación Central de Policía'],
    na_1: ['Hollywood', 'Port of Long Beach', 'LAX', 'Century City', 'Aircraft Plant'],
    na_2: ['The Loop', 'Steel Mill', 'Union Station', '1st District Police', 'Northwestern Hospital'],
    na_3: ['Chinatown', 'University of Toronto', 'Lakeshore Hotel', 'Virus Lab'],
    na_4: ['Times Square', 'Grand Central Terminal', 'Mount Sinai', 'Brooklyn Docks', 'Fifth Avenue', 'Fort Hamilton'],
    na_5: ["Hunters' Village", 'Elmendorf AFB', 'Ice Harbor'],
    sa_0: ['Plaza de Paloquemao', 'La Candelaria', 'Hospital San Ignacio', 'Estación de Policía'],
    sa_1: ['Miraflores', 'Puerto del Callao', 'Mina Andina', 'Aeropuerto Jorge Chávez'],
    sa_2: ['Favela', 'Hotel Copacabana', 'Shopping Barra', 'Porto do Rio', 'Fiocruz'],
    sa_3: ['La Boca', 'Estación Retiro', 'Hospital Italiano', 'Base Naval'],
    sa_4: ['Puerto del Fin del Mundo', 'Aldea de Pescadores', 'Base de Abastecimiento', 'Estación de Investigación Marina'],
    an_0: ['Research Camp', 'Vehicle Shed', 'Command Center', 'Ice Lab'],
    an_1: ['Обсерватория', 'Тоннель подо льдом', 'Склад', 'Медпункт'],
    an_2: ['Outer Base', 'Quarantine Block', 'Nest Core', 'Final Control', 'Last Bunker'],
  },
  lang(run) { return (run && run.stage && this.LANG[run.stage.id]) || 'en'; },
  // the art for the city being played: loaded on demand (nothing else is fetched)
  ensure(stage) {
    const list = window.LOC_ART || [];
    for (const key of list) {
      if (!(key === 'sky_' + stage.id || key.startsWith('lm_' + stage.id + '_')) || Override.imgs[key]) continue;
      const img = new Image();
      img.onerror = () => { delete Override.imgs[key]; };
      img.src = 'assets/sprites/' + key + '.png' + (window.ASSET_VER ? '?v=' + window.ASSET_VER : '');
      Override.imgs[key] = img;
    }
  },
  landmark(run) {
    if (!run || !run.stage || run.restricted) return null;
    return Override.get('lm_' + run.stage.id + '_' + run.locIdx);
  },
  sky(run) { return run && run.stage ? Override.get('sky_' + run.stage.id) : null; },
  // the landmark stands across the street from the left entrance; the name board at the entrance
  BOX: { x0: -STREET + 6, x1: -150, h: 330 },
  sig(run) { return (this.landmark(run) ? 'L' : '-') + (run.stage ? run.stage.id + ':' + run.locIdx : ''); },
  draw(ctx, run) {
    const img = this.landmark(run), B = this.BOX;
    if (img) {
      const bw = B.x1 - B.x0, k = Math.min(bw / img.naturalWidth, B.h / img.naturalHeight), dw = img.naturalWidth * k, dh = img.naturalHeight * k;
      // night and distance: darker and a little bluer than the street in front of it
      ctx.drawImage(FilterCache.get(img, 'brightness(0.62) saturate(0.75)'), B.x0 + (bw - dw) / 2, -18 - dh, dw, dh);
    }
    this.board(ctx, run);
  },
  // name board on two posts beside the entrance: the local name large, the Thai name under it
  board(ctx, run) {
    if (!run.stage || run.restricted) return;
    const local = (this.NAME[run.stage.id] || [])[run.locIdx] || run.loc.n, th = run.loc.n, same = local === th;
    const cv = this._board && this._board.key === local + '|' + th ? this._board.cv : null;
    const c = cv || (this._board = { key: local + '|' + th, cv: this.boardCanvas(local, same ? null : th) }).cv;
    const w = c.width / 3, h = c.height / 3, x = -40 - w, y = -18 - h - 104;   // up on posts, above head height
    ctx.fillStyle = '#2a2d31'; ctx.fillRect(x + 10, y + h - 4, 5, 108); ctx.fillRect(x + w - 15, y + h - 4, 5, 108);
    ctx.drawImage(c, x, y, w, h);
  },
  boardCanvas(big, small) {
    const S = 3, m = document.createElement('canvas').getContext('2d');
    const F1 = `bold ${16 * S}px Kanit,system-ui,sans-serif`, F2 = `${10 * S}px Kanit,system-ui,sans-serif`;
    m.font = F1; const w1 = m.measureText(big).width; m.font = F2; const w2 = small ? m.measureText(small).width : 0;
    const W = Math.ceil(Math.max(w1, w2) + 22 * S), H = (small ? 44 : 30) * S;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    c.fillStyle = '#1d2a33'; c.strokeStyle = '#0b0f12'; c.lineWidth = 2 * S;
    c.beginPath(); c.roundRect(S, S, W - 2 * S, H - 2 * S, 4 * S); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(220,230,235,0.55)'; c.lineWidth = S; c.beginPath(); c.roundRect(4 * S, 4 * S, W - 8 * S, H - 8 * S, 3 * S); c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(W * ((i * 37) % 100) / 100, H * ((i * 53) % 100) / 100, (3 + i % 3) * S, 0, 7); c.fill(); }   // dirt
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#e9eef0'; c.font = F1; c.fillText(big, W / 2, (small ? 17 : 15.5) * S);
    if (small) { c.fillStyle = '#b9c4c9'; c.font = F2; c.fillText(small, W / 2, 34 * S); }
    return cv;
  },
  exitWord(run) { return this.EXIT[this.lang(run)] || 'EXIT'; },
};

(function hookLocArt() {
  // load the city's art when a run starts
  const _start = Run.start;
  Run.start = function (...a) { const r = _start.apply(this, a); try { if (this.stage) LocArt.ensure(this.stage); } catch (e) { console.error(e); } return r; };
  // the city's own far skyline replaces the generic one
  const _sky = Art.skyline;
  Art.skyline = function (kind, layer) {
    const img = layer === 0 && typeof Run !== 'undefined' && Run.map && LocArt.sky(Run);
    if (!img) return _sky(kind, layer);
    const W = 1500;
    return { img, w: W, h: W * img.naturalHeight / img.naturalWidth, ext: true, night: 0.34 };
  };
})();
