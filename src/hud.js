// hud.js — everything the player reads: the mission card, clock and stars,
// weapon slots, the PBPD RESPONSE panel, Dre's crew card, dialogue, the
// circular street radar, the full city map with labelled landmarks, and the
// glossy SUMMON button with its cooldown sweep.
window.PH3 = window.PH3 || {};

const $ = id => document.getElementById(id);
PH3.WEAPONS = [
  { name: 'FISTS', key: 'fists' }, { name: 'PISTOL', key: 'pistol' },
  { name: 'SMG', key: 'smg' }, { name: 'SHOTGUN', key: 'shotgun' },
];
PH3.weapon = 0;
PH3.ammo = { pistol: 48, smg: 120, shotgun: 18 };

let dlgTimer = 0, toastTimer = 0, loudTimer = 0;
PH3.showDialogue = function (who, line) {
  $('dlgWho').textContent = who; $('dlgLine').textContent = line;
  $('dialogue').classList.remove('hidden'); dlgTimer = 6.5;
};
PH3.showToast = function (text) {
  $('toast').textContent = text; $('toast').classList.remove('hidden'); toastTimer = 3.6;
};
PH3.showPrompt = function (text) {
  if (text) { $('prompt').textContent = text; $('prompt').classList.remove('hidden'); }
  else $('prompt').classList.add('hidden');
};
PH3.showLoud = function (text) {
  if (text) { $('loud').textContent = text; $('loud').classList.remove('hidden'); loudTimer = 5; }
  else $('loud').classList.add('hidden');
};

PH3.initHUD = function () {
  const w = $('weapons');
  w.innerHTML = '';
  PH3.WEAPONS.forEach((wp, i) => {
    const d = document.createElement('div');
    d.className = 'wslot' + (i === 0 ? ' sel' : '');
    d.id = 'wslot' + i;
    d.innerHTML = '<b>' + (i + 1) + ' · ' + wp.name + '</b><span class="ammo"></span>';
    w.appendChild(d);
  });
  $('summonBtn').addEventListener('click', () => { if (PH3.summonSahur) PH3.summonSahur(); });
  $('mapClose').addEventListener('click', () => PH3.toggleMap(false));
  $('doneBtn').addEventListener('click', () => $('done').classList.add('hidden'));
};

PH3.toggleMap = function (force) {
  const open = force !== undefined ? force : $('mapWrap').classList.contains('hidden');
  $('mapWrap').classList.toggle('hidden', !open);
  PH3.mapOpen = open;
  if (open) PH3.drawMap();
};

const RADIO = ['♪ RADIO PALMERA 98.3 · "Sol Over The Bay"', '♪ COCO FM 101.1 · Stock-Car Sundays', '♪ AZUL WAVE 94.7 · Night Pier Sessions', '♪ RADIO PALMERA 98.3 · Marla’s Traffic Report'];

PH3.updateHUD = function (dt) {
  if (dlgTimer > 0) { dlgTimer -= dt; if (dlgTimer <= 0) $('dialogue').classList.add('hidden'); }
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.add('hidden'); }
  if (loudTimer > 0) { loudTimer -= dt; if (loudTimer <= 0) $('loud').classList.add('hidden'); }

  const info = PH3.jobInfo();
  $('mcKicker').textContent = info.kicker;
  $('mcName').textContent = info.name;
  $('mcStage').textContent = info.stage;
  $('mcObj').textContent = info.obj;
  $('mcBar').style.width = Math.round(THREE.MathUtils.clamp(info.frac, 0, 1) * 100) + '%';

  const hh = Math.floor(PH3.timeHours), mm = Math.floor((PH3.timeHours - hh) * 60);
  $('clock').textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  $('phase').textContent = PH3.phaseName();
  $('money').textContent = 'Ŧ' + PH3.state.cash.toLocaleString('en-US');
  $('respect').textContent = PH3.state.respect;
  const st = PH3.state.standing;
  $('standing').textContent = (st > 70 ? 'BELOVED' : st > 45 ? 'NEUTRAL' : 'WANTED BY LANDLORDS') + ' · ' + st;
  const stars = PH3.stars();
  $('stars').innerHTML = '★'.repeat(stars) + '<span class="off">' + '★'.repeat(5 - stars) + '</span>';

  const p = PH3.player.inCar ? PH3.player.car.position : PH3.hero.position;
  $('district').textContent = PH3.districtAt(p.x, p.z).toUpperCase();

  PH3.WEAPONS.forEach((wp, i) => {
    const el = $('wslot' + i); if (!el) return;
    el.classList.toggle('sel', PH3.weapon === i);
    el.querySelector('.ammo').textContent = wp.key === 'fists' ? '∞' : String(PH3.ammo[wp.key]);
  });

  // PBPD response panel: only while the bay is watching you
  const list = PH3.responseList ? PH3.responseList() : [];
  if (list.length && PH3.stars() > 0) {
    $('response').classList.remove('hidden');
    $('responseList').innerHTML = list.map(u =>
      '<div class="unit"><span>' + u.unit + '</span><em>' + u.tactic + ' · ' + u.dist + '</em></div>').join('');
  } else $('response').classList.add('hidden');

  const crewAbility = document.querySelector('#crewCard .ability');
  if (crewAbility) crewAbility.textContent = PH3.decoyReady && PH3.decoyReady()
    ? '[G] DRAW HEAT · decoy ready' : '[G] DRAW HEAT · recharging…';

  $('hpFill').style.width = Math.max(0, PH3.player.hp) + '%';
  $('arFill').style.width = Math.max(0, PH3.player.armour) + '%';

  if (PH3.player.inCar) {
    const c = PH3.player.car;
    $('vehicleHud').classList.remove('hidden');
    $('speed').textContent = Math.round(Math.abs(c.userData.speed || 0) * 3.6);
    $('vname').textContent = c.userData.name;
    $('dmg').textContent = 'DAMAGE ' + Math.round(c.userData.damage || 0) + '%';
    $('radio').textContent = RADIO[Math.floor(PH3.timeHours / 3) % RADIO.length];
  } else $('vehicleHud').classList.add('hidden');

  const btn = $('summonBtn');
  const ready = PH3.sahurReady ? PH3.sahurReady() : false;
  btn.classList.toggle('cooling', !ready);
  btn.querySelector('.sub').textContent = ready ? 'TUNG SAHUR' :
    (PH3.sahur && PH3.sahur.state !== 'away' ? 'ON STAGE…' : 'READY IN ' + Math.ceil((PH3.sahur.cooldownUntil - performance.now()) / 1000) + 's');

  PH3.drawRadar();
};

// ---- the circular radar: streets, sea, and every blip that matters ----
PH3.drawRadar = function () {
  const cv = $('radar'); if (!cv || !PH3.hero) return;
  const g = cv.getContext('2d');
  const C = 86, R = 84, S = 0.5; // px per metre
  const p = PH3.player.inCar ? PH3.player.car.position : PH3.hero.position;
  g.clearRect(0, 0, 172, 172);
  g.save();
  g.beginPath(); g.arc(C, C, R, 0, 7); g.clip();
  g.fillStyle = '#0d2b22'; g.fillRect(0, 0, 172, 172);
  // sea to the west
  g.fillStyle = '#12507a';
  const seaEdge = C + (-212 - p.x) * S;
  if (seaEdge > 0) g.fillRect(0, 0, Math.min(172, seaEdge), 172);
  // roads
  g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 3;
  for (const x of PH3.ROADS_V) { const px = C + (x - p.x) * S; if (px > -4 && px < 176) { g.beginPath(); g.moveTo(px, 0); g.lineTo(px, 172); g.stroke(); } }
  for (const z of PH3.ROADS_H) { const py = C + (z - p.z) * S; if (py > -4 && py < 176) { g.beginPath(); g.moveTo(0, py); g.lineTo(172, py); g.stroke(); } }
  const blip = (x, z, col, r) => {
    const px = C + (x - p.x) * S, py = C + (z - p.z) * S;
    if (px < 2 || px > 170 || py < 2 || py > 170) return;
    g.fillStyle = col; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill();
  };
  for (const v of PH3.traffic) blip(v.position.x, v.position.z, 'rgba(220,220,220,0.5)', 1.6);
  for (const u of PH3.policeUnits) blip(u.position.x, u.position.z, Math.floor(performance.now() / 300) % 2 ? '#ff4040' : '#4060ff', 3);
  if (PH3.heli) blip(PH3.heli.position.x, PH3.heli.position.z, '#ff4040', 3);
  if (PH3.dre) blip(PH3.dre.position.x, PH3.dre.position.z, '#39a0ff', 2.6);
  const st = PH3.currentStage && PH3.currentStage();
  if (st && st.x !== undefined) blip(st.x, st.z, '#ffd23e', 4);
  // player arrow
  const heading = PH3.player.inCar ? PH3.player.car.rotation.y : PH3.hero.rotation.y;
  g.translate(C, C); g.rotate(heading);
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(0, 3); g.lineTo(-5, 6); g.closePath(); g.fill();
  g.restore();
  g.strokeStyle = 'rgba(174,243,255,0.5)'; g.lineWidth = 1;
  g.beginPath(); g.arc(C, C, R - 1, 0, 7); g.stroke();
};

// ---- the full map: the whole bay, its landmarks labelled ----
PH3.drawMap = function () {
  const cv = $('mapCanvas'); if (!cv) return;
  const g = cv.getContext('2d');
  const W = 880, H = 600;
  const sx = x => (x + 360) / 740 * W;
  const sy = z => (z + 320) / 640 * H;
  g.fillStyle = '#0d2b22'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#12507a'; g.fillRect(0, 0, sx(-212), H);
  g.fillStyle = '#e8cf9a'; g.fillRect(sx(-258), 0, sx(-212) - sx(-258), H);
  g.fillStyle = '#274d24'; g.fillRect(sx(292), 0, W - sx(292), H);
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 4;
  for (const x of PH3.ROADS_V) { g.beginPath(); g.moveTo(sx(x), 0); g.lineTo(sx(x), H); g.stroke(); }
  for (const z of PH3.ROADS_H) { g.beginPath(); g.moveTo(0, sy(z)); g.lineTo(W, sy(z)); g.stroke(); }
  // pier
  g.strokeStyle = '#a9743f'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(sx(-216), sy(30)); g.lineTo(sx(-340), sy(30)); g.stroke();
  g.fillStyle = '#ffd23e'; g.beginPath(); g.arc(sx(-322), sy(30), 10, 0, 7); g.fill();
  // labels (right-aligned when they would run off the east edge)
  g.font = '700 13px sans-serif';
  for (const lm of PH3.landmarks) {
    g.fillStyle = '#ffe9b0';
    g.beginPath(); g.arc(sx(lm.x), sy(lm.z), 4, 0, 7); g.fill();
    const dy = lm.name === 'FERRIS WHEEL' ? 20 : 4;
    if (sx(lm.x) > W - 190) { g.textAlign = 'right'; g.fillText(lm.name, sx(lm.x) - 8, sy(lm.z) + dy); }
    else { g.textAlign = 'left'; g.fillText(lm.name, sx(lm.x) + 8, sy(lm.z) + dy); }
  }
  g.textAlign = 'left';
  g.fillStyle = '#8dff9a'; g.font = '800 15px sans-serif';
  g.fillText('DOWNTOWN', sx(-40), sy(-90));
  g.fillText('BEACHFRONT', sx(-190), sy(160));
  g.fillText('THE HILLS', sx(300), sy(-140));
  g.fillStyle = '#ff8f8f';
  for (const u of PH3.policeUnits) { g.beginPath(); g.arc(sx(u.position.x), sy(u.position.z), 4, 0, 7); g.fill(); }
  const p = PH3.player.inCar ? PH3.player.car.position : PH3.hero.position;
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx(p.x), sy(p.z), 6, 0, 7); g.fill();
  g.strokeStyle = '#ffd23e'; g.lineWidth = 2; g.beginPath(); g.arc(sx(p.x), sy(p.z), 10, 0, 7); g.stroke();
  const st = PH3.currentStage && PH3.currentStage();
  if (st && st.x !== undefined) {
    g.fillStyle = '#ffd23e'; g.beginPath(); g.arc(sx(st.x), sy(st.z), 7, 0, 7); g.fill();
    g.fillStyle = '#0b1026'; g.font = '900 10px sans-serif'; g.textAlign = 'center';
    g.fillText('JOB', sx(st.x), sy(st.z) + 3);
  }
};
