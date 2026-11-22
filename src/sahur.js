// sahur.js — TUNG TUNG TUNG SAHUR, the giant of Palmera Bay, rebuilt to be
// loved: rich procedural wood grain with rings and knots, an expressive
// carved face, jointed limbs, a stomping walk, a two-handed bat wind-up and
// swing, a landing shockwave, debris when a police car goes over, and deep
// layered drums timed to his feet. Summoned by the glossy SUMMON button or
// the T key; he hunts PBPD cars for ~45 seconds, +Ŧ25 a flip.
window.PH3 = window.PH3 || {};

PH3.sahur = { group: null, state: 'away', until: 0, cooldownUntil: 0, target: null, swingT: 0, stepT: 0 };

function woodTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#a9743f'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 70; i++) {                       // vertical grain streaks
    g.strokeStyle = 'rgba(' + (90 + (i % 40)) + ',52,20,' + (0.12 + (i % 5) * 0.05) + ')';
    g.lineWidth = 1 + (i % 3);
    const x = (i * 41) % 256;
    g.beginPath(); g.moveTo(x, 0);
    g.bezierCurveTo(x + 6, 170, x - 6, 340, x + 3, 512); g.stroke();
  }
  for (const [kx, ky] of [[60, 120], [180, 300], [110, 430]]) {  // knots with rings
    for (let r = 12; r > 2; r -= 3) {
      g.strokeStyle = 'rgba(80,46,16,0.55)'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(kx, ky, r * 1.4, r, 0.3, 0, 7); g.stroke();
    }
    g.fillStyle = '#4a2c10'; g.beginPath(); g.ellipse(kx, ky, 3.4, 2.4, 0.3, 0, 7); g.fill();
  }
  for (let i = 0; i < 7; i++) {                        // growth rings near the top
    g.strokeStyle = 'rgba(90,52,20,0.4)'; g.lineWidth = 2;
    g.beginPath(); g.arc(128, 26, 8 + i * 7, 0, 7); g.stroke();
  }
  return new THREE.CanvasTexture(c);
}

function faceTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  g.strokeStyle = '#3a2110'; g.fillStyle = '#3a2110'; g.lineCap = 'round';
  // heavy carved brows
  g.lineWidth = 11;
  g.beginPath(); g.moveTo(38, 74); g.lineTo(104, 92); g.stroke();
  g.beginPath(); g.moveTo(218, 74); g.lineTo(152, 92); g.stroke();
  // wide eyes with carved pupils
  g.fillStyle = '#f7efdc';
  g.beginPath(); g.ellipse(72, 112, 24, 17, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(184, 112, 24, 17, 0, 0, 7); g.fill();
  g.fillStyle = '#241305';
  g.beginPath(); g.arc(76, 114, 8, 0, 7); g.fill();
  g.beginPath(); g.arc(180, 114, 8, 0, 7); g.fill();
  // nose: two carved strokes
  g.lineWidth = 7;
  g.beginPath(); g.moveTo(128, 118); g.lineTo(118, 152); g.lineTo(136, 156); g.stroke();
  // the grin: wide, toothy, delighted
  g.lineWidth = 10;
  g.beginPath(); g.arc(128, 168, 74, 0.25, Math.PI - 0.25); g.stroke();
  g.lineWidth = 5;
  for (let i = 0; i < 5; i++) {
    const x = 78 + i * 25;
    g.beginPath(); g.moveTo(x, 196 - Math.abs(i - 2) * 7); g.lineTo(x, 214 - Math.abs(i - 2) * 7); g.stroke();
  }
  // cheek carve lines
  g.lineWidth = 5;
  g.beginPath(); g.arc(40, 160, 16, -0.6, 1.2); g.stroke();
  g.beginPath(); g.arc(216, 160, 16, Math.PI - 1.2, Math.PI + 0.6); g.stroke();
  return new THREE.CanvasTexture(c);
}

function buildGiant() {
  const wood = new THREE.MeshLambertMaterial({ map: woodTexture() });
  const woodDark = new THREE.MeshLambertMaterial({ color: 0x7d4f22 });
  const g = new THREE.Group();
  const P = {};
  // legs: jointed thigh + shin
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * 1.5, 6.4, 0); g.add(hip);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.7, 3.4, 9), wood);
    thigh.position.y = -1.7; thigh.castShadow = true; hip.add(thigh);
    const shin = new THREE.Group(); shin.position.y = -3.4; hip.add(shin);
    const shinM = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.52, 3.2, 9), wood);
    shinM.position.y = -1.6; shinM.castShadow = true; shin.add(shinM);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 2.6), woodDark);
    foot.position.set(0, -3.2, 0.5); shin.add(foot);
    P[side < 0 ? 'hipL' : 'hipR'] = hip; P[side < 0 ? 'shinL' : 'shinR'] = shin;
  }
  // the great log body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 8.6, 14), wood);
  body.position.y = 10.6; body.castShadow = true; g.add(body); P.body = body;
  // carved face on the upper body
  const face = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6),
    new THREE.MeshBasicMaterial({ map: faceTexture(), transparent: true }));
  face.position.set(0, 12.6, 2.68); g.add(face);
  // stubby top branches like a crown
  for (const [x, r] of [[-1.4, 0.5], [0.2, 0.38], [1.5, 0.44]]) {
    const br = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, 1.6, 7), wood);
    br.position.set(x, 15.6, 0); br.rotation.z = x * 0.22; g.add(br);
  }
  // arms: shoulder groups, upper + forearm; the right pair carries the bat
  for (const side of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(side * 2.8, 13.6, 0); g.add(sh);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.52, 3.6, 9), wood);
    up.position.y = -1.8; up.castShadow = true; sh.add(up);
    const el = new THREE.Group(); el.position.y = -3.6; sh.add(el);
    const fo = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 3.4, 9), wood);
    fo.position.y = -1.7; fo.castShadow = true; el.add(fo);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.62, 9, 9), woodDark);
    hand.position.y = -3.5; el.add(hand);
    P[side < 0 ? 'shL' : 'shR'] = sh; P[side < 0 ? 'elL' : 'elR'] = el;
    sh.rotation.z = side * 0.22;
  }
  // THE BAT: a great tapered club in the right hand
  const bat = new THREE.Group(); bat.position.set(0, -3.5, 0); P.elR.add(bat);
  const batM = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.85, 6.4, 10), wood);
  batM.position.y = -3.4; batM.castShadow = true; bat.add(batM);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.5, 9, 9), woodDark);
  knob.position.y = -0.2; bat.add(knob);
  bat.rotation.x = Math.PI; // barrel up while carried
  P.bat = bat;
  // soft contact shadow that shrinks as he falls
  const shTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const gr = c.getContext('2d').createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    const g2 = c.getContext('2d'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(11, 11),
    new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.06;
  g.add(shadow); P.shadow = shadow;
  g.userData.parts = P;
  g.visible = false;
  return g;
}

// dust puffs and smash debris: two small pools of sprites/boxes
const puffs = [], debris = [];
function burst(x, y, z, n, spread, up) {
  for (let i = 0; i < n; i++) {
    let s = puffs.find(p => !p.visible);
    if (!s) {
      if (puffs.length > 40) break;
      s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: PH3.dustTexture, color: 0xd8c491, transparent: true, opacity: 0.7, depthWrite: false }));
      PH3.scene.add(s); puffs.push(s);
    }
    s.position.set(x + (Math.random() - 0.5) * 3, y + Math.random(), z + (Math.random() - 0.5) * 3);
    s.userData.v = { x: (Math.random() - 0.5) * spread, y: Math.random() * up, z: (Math.random() - 0.5) * spread };
    s.userData.life = 1;
    s.scale.set(3, 3, 1); s.visible = true;
  }
}
function smashDebris(x, z) {
  for (let i = 0; i < 10; i++) {
    let d = debris.find(p => !p.visible);
    if (!d) {
      if (debris.length > 30) break;
      d = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.7),
        new THREE.MeshLambertMaterial({ color: 0x2c313a }));
      PH3.scene.add(d); debris.push(d);
    }
    d.position.set(x, 1.2, z);
    d.userData.v = { x: (Math.random() - 0.5) * 12, y: 5 + Math.random() * 6, z: (Math.random() - 0.5) * 12 };
    d.userData.life = 1.1; d.visible = true;
  }
}

PH3.initSahur = function () {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  PH3.dustTexture = new THREE.CanvasTexture(c);
  PH3.sahur.group = buildGiant();
  PH3.scene.add(PH3.sahur.group);
  // the shockwave ring, reused at every landing and smash
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.3, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0 }));
  ring.rotation.x = Math.PI / 2;
  PH3.scene.add(ring);
  PH3.sahur.ring = ring;
};

PH3.sahurReady = function () { return performance.now() > PH3.sahur.cooldownUntil && PH3.sahur.state === 'away'; };
PH3.sahurCooldownFrac = function () {
  const S = PH3.sahur;
  if (S.state !== 'away') return 1;
  return THREE.MathUtils.clamp(1 - (S.cooldownUntil - performance.now()) / 60000, 0, 1);
};

PH3.summonSahur = function () {
  const S = PH3.sahur;
  if (!PH3.sahurReady()) return false;
  const p = PH3.player.inCar ? PH3.player.car.position : PH3.hero.position;
  S.group.position.set(p.x + 14, 130, p.z + 6);
  S.group.visible = true;
  S.state = 'dropping';
  S.until = performance.now() + 45000;
  S.cooldownUntil = performance.now() + 60000;
  S.target = null;
  if (PH3.audio) PH3.audio.chant();
  PH3.showDialogue('PALMERA BAY', '"TUNG… TUNG… TUNG… SAHUR!" — the giant answers.');
  return true;
};

function flipCar(car) {
  car.userData.flipping = 1.2;
  PH3.state.cash += 25;
  PH3.showToast('SAHUR SMASH · +Ŧ25');
  smashDebris(car.position.x, car.position.z);
  if (PH3.audio) PH3.audio.smash();
}

PH3.updateSahur = function (dt) {
  const S = PH3.sahur, g = S.group;
  if (!g) return;
  // particles always tick
  for (const s of puffs) {
    if (!s.visible) continue;
    s.userData.life -= dt * 0.8;
    if (s.userData.life <= 0) { s.visible = false; continue; }
    s.position.x += s.userData.v.x * dt; s.position.y += s.userData.v.y * dt; s.position.z += s.userData.v.z * dt;
    s.material.opacity = 0.7 * s.userData.life;
    const sc = s.scale.x + dt * 5; s.scale.set(sc, sc, 1);
  }
  for (const d of debris) {
    if (!d.visible) continue;
    d.userData.life -= dt;
    if (d.userData.life <= 0 || d.position.y < 0.2) { d.visible = false; continue; }
    d.userData.v.y -= 22 * dt;
    d.position.x += d.userData.v.x * dt; d.position.y += d.userData.v.y * dt; d.position.z += d.userData.v.z * dt;
    d.rotation.x += dt * 7; d.rotation.z += dt * 5;
  }
  if (S.ring && S.ring.material.opacity > 0) {
    S.ring.scale.multiplyScalar(1 + dt * 2.6);
    S.ring.material.opacity -= dt * 0.9;
  }
  if (S.state === 'away') return;
  const P = g.userData.parts;
  const now = performance.now();

  if (S.state === 'dropping') {
    g.position.y -= 150 * dt;
    P.shadow.material.opacity = THREE.MathUtils.clamp(1 - g.position.y / 130, 0.1, 0.55);
    if (g.position.y <= 0) {
      g.position.y = 0;
      S.state = 'hunting';
      PH3.shake = Math.min(1.4, 26 / Math.max(8, g.position.distanceTo(PH3.camera.position)) * 1.4);
      burst(g.position.x, 1, g.position.z, 16, 9, 3);
      S.ring.position.set(g.position.x, 0.5, g.position.z);
      S.ring.scale.set(2, 2, 2); S.ring.material.opacity = 0.85;
      if (PH3.audio) PH3.audio.drum(1);
    }
    return;
  }
  if (now > S.until && S.state === 'hunting') S.state = 'leaving';
  if (S.poseLock) return;
  if (S.state === 'leaving') {
    // a friendly wave, then the great leap home
    P.shR.rotation.z = -2.6 + Math.sin(now * 0.02) * 0.3;
    S.leaveT = (S.leaveT || 0) + dt;
    if (S.leaveT > 1.1) {
      g.position.y += (S.leaveT - 1.1) * 130 * dt * 4;
      if (g.position.y > 140) { S.state = 'away'; g.visible = false; S.leaveT = 0; P.shR.rotation.z = 0.22; }
    }
    return;
  }
  // hunting: find a police car, stomp to it, and swing
  if (!S.target || S.target.userData.flipped || !PH3.scene.children.includes(S.target)) {
    let best = null, bd = 95;
    for (const u of PH3.policeUnits) {
      const d = g.position.distanceTo(u.position);
      if (d < bd && !u.userData.flipped) { bd = d; best = u; }
    }
    S.target = best;
  }
  const idleSway = Math.sin(now * 0.0016) * 0.045;
  P.body.rotation.z = idleSway;
  if (!S.target) { // no police: stomp a slow circle near the player and pose
    const p = PH3.hero.position;
    const a = now * 0.0004;
    const tx = p.x + Math.cos(a) * 20, tz = p.z + Math.sin(a) * 20;
    walkToward(g, P, tx, tz, 5.5, dt, S);
    return;
  }
  const t = S.target;
  const d = Math.hypot(t.position.x - g.position.x, t.position.z - g.position.z);
  if (S.swingT > 0) {
    // the swing: wind-up, then the fall of the bat
    S.swingT += dt;
    const w = S.swingT;
    if (w < 0.45) { const k = w / 0.45; P.shR.rotation.x = -2.4 * k; P.shL.rotation.x = -1.7 * k; P.bat.rotation.x = Math.PI - 0.9 * k; }
    else if (w < 0.63) {
      const k = (w - 0.45) / 0.18;
      P.shR.rotation.x = -2.4 + 3.4 * k; P.shL.rotation.x = -1.7 + 2.4 * k; P.bat.rotation.x = Math.PI - 0.9 + 1.5 * k;
      if (!S.hitDone && k > 0.75) { S.hitDone = true; flipCar(t); PH3.shake = Math.max(PH3.shake || 0, 0.7); burst(t.position.x, 1, t.position.z, 8, 6, 2.5); }
    } else { S.swingT = 0; S.hitDone = false; S.target = null; P.shR.rotation.x = 0; P.shL.rotation.x = 0; }
    return;
  }
  if (d < 10.5) { S.swingT = 0.001; S.hitDone = false; g.rotation.y = Math.atan2(t.position.x - g.position.x, t.position.z - g.position.z); return; }
  walkToward(g, P, t.position.x, t.position.z, 10.5, dt, S);
};

function walkToward(g, P, tx, tz, speed, dt, S) {
  const dx = tx - g.position.x, dz = tz - g.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 1.2) return;
  g.rotation.y = Math.atan2(dx, dz);
  g.position.x += dx / d * speed * dt;
  g.position.z += dz / d * speed * dt;
  S.stepT += dt * speed * 0.42;
  const s = Math.sin(S.stepT * Math.PI);
  P.hipL.rotation.x = s * 0.62; P.hipR.rotation.x = -s * 0.62;
  P.shinL.rotation.x = Math.max(0, -s) * 0.7; P.shinR.rotation.x = Math.max(0, s) * 0.7;
  P.shL.rotation.x = -s * 0.4; P.shR.rotation.x = s * 0.4;
  g.position.y = Math.abs(Math.sin(S.stepT * Math.PI)) * 0.5;
  const stepPhase = Math.floor(S.stepT);
  if (stepPhase !== S.lastStep) {
    S.lastStep = stepPhase;
    if (PH3.audio) PH3.audio.drum(0.7);
    burst(g.position.x, 0.4, g.position.z, 3, 3, 1.2);
  }
}

// Cars the giant has flipped tumble and settle upside down.
PH3.updateFlips = function (dt) {
  for (const u of PH3.policeUnits) {
    if (u.userData.flipping > 0) {
      u.userData.flipping -= dt;
      u.rotation.z = Math.min(Math.PI, u.rotation.z + dt * 4.4);
      u.position.y = Math.abs(Math.sin(u.rotation.z)) * 0.9;
      if (u.userData.flipping <= 0) { u.userData.flipped = true; u.rotation.z = Math.PI; u.position.y = 0.75; }
    }
  }
};
