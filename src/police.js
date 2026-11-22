// police.js — the Palmera Bay Police Department: a wanted level that answers
// crimes, predictive pursuit with ramming, roadblocks at three stars, and a
// helicopter with a searchlight and a loudspeaker at four. Every active unit
// reports its tactic and distance to the HUD's PBPD RESPONSE panel.
window.PH3 = window.PH3 || {};

PH3.heat = 0;              // 0..5, the stars are ceil(heat)
PH3.lastCrimeAt = 0;
PH3.policeUnits = [];
PH3.heli = null;
PH3.roadblock = null;
PH3.decoy = null;

PH3.stars = function () { return Math.ceil(PH3.heat - 0.001); };

PH3.addCrime = function (amount, x, z) {
  PH3.heat = Math.min(5, PH3.heat + amount);
  PH3.lastCrimeAt = performance.now();
  if (x !== undefined) PH3.raiseAlarm(x, z);
};

function playerPos() {
  return PH3.player.inCar ? PH3.player.car.position : PH3.hero.position;
}
function playerVel() {
  if (PH3.player.inCar) {
    const c = PH3.player.car;
    return { x: Math.sin(c.rotation.y) * (c.userData.speed || 0), z: Math.cos(c.rotation.y) * (c.userData.speed || 0) };
  }
  return { x: 0, z: 0 };
}
function policeTarget() {
  if (PH3.decoy && PH3.decoy.until > performance.now()) return PH3.decoy.point;
  return playerPos();
}

function spawnUnit() {
  const mesh = PH3.makeVehicle('police', 0xf2f2f2);
  const p = playerPos();
  const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 30;
  mesh.position.set(
    THREE.MathUtils.clamp(p.x + Math.cos(a) * d, -200, 262),
    0,
    THREE.MathUtils.clamp(p.z + Math.sin(a) * d, -272, 262));
  mesh.userData.patrol = { speed: 0 };
  PH3.scene.add(mesh); PH3.policeUnits.push(mesh);
  return mesh;
}

function buildRoadblock() {
  const p = playerPos(), v = playerVel();
  const ahead = { x: p.x + v.x * 2.2, z: p.z + v.z * 2.2 };
  const grp = new THREE.Group();
  const cars = [];
  for (const off of [-4.2, 4.2]) {
    const c = PH3.makeVehicle('police', 0xf2f2f2);
    c.position.set(ahead.x + off, 0, ahead.z);
    c.rotation.y = Math.PI / 2 + (off > 0 ? 0.25 : -0.25);
    grp.add(c); cars.push(c);
  }
  const barrierMat = new THREE.MeshLambertMaterial({ color: 0xe4572e });
  for (let i = -1; i <= 1; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 0.5), barrierMat);
    b.position.set(ahead.x + i * 2.8, 0.45, ahead.z + 2.5); grp.add(b);
  }
  PH3.scene.add(grp);
  PH3.roadblock = { group: grp, cars, x: ahead.x, z: ahead.z };
}

const LOUD_LINES = [
  '📢 PBPD — STOP THE VEHICLE. THIS IS YOUR ONLY WARNING.',
  '📢 AIR UNIT OVERHEAD. PULL OVER AND KEEP HANDS VISIBLE.',
  '📢 SUSPECT IN PALMERA BAY — ALL UNITS CONVERGE.',
  '📢 THIS IS THE PBPD. THE BAY IS CLOSED TO YOU. STOP NOW.',
];
let loudIdx = 0, loudNext = 0;

PH3.updatePolice = function (dt) {
  const now = performance.now();
  const stars = PH3.stars();
  const p = playerPos();

  // Heat cools when the player lies low and no unit has eyes on them.
  if (now - PH3.lastCrimeAt > 22000 && PH3.heat > 0) {
    let nearest = 1e9;
    for (const u of PH3.policeUnits) nearest = Math.min(nearest, u.position.distanceTo(p));
    if (nearest > 42) PH3.heat = Math.max(0, PH3.heat - dt * 0.03);
  }

  const want = stars === 0 ? 0 : Math.min(7, stars * 2);
  while (PH3.policeUnits.length < want) spawnUnit();
  while (PH3.policeUnits.length > want + 2) {
    const u = PH3.policeUnits.pop(); PH3.scene.remove(u);
  }

  const tgt = policeTarget(), vel = playerVel();
  for (const u of PH3.policeUnits) {
    if (u.userData.flipped) { u.userData.tactic = 'WRECKED'; u.userData.dist = Math.round(u.position.distanceTo(p)); continue; }
    const ud = u.userData.patrol;
    // Predictive pursuit: aim where the player will be, not where they are.
    const dist = u.position.distanceTo(tgt);
    const lead = THREE.MathUtils.clamp(dist / 30, 0, 1.6);
    const aim = { x: tgt.x + vel.x * lead, z: tgt.z + vel.z * lead };
    const dx = aim.x - u.position.x, dz = aim.z - u.position.z;
    const wantHeading = Math.atan2(dx, dz);
    let dh = wantHeading - u.rotation.y;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    u.rotation.y += THREE.MathUtils.clamp(dh, -1.9 * dt, 1.9 * dt);
    const topSpeed = dist < 16 ? 30 : 24; // the final approach is a ram
    ud.speed += ((Math.abs(dh) > 1.2 ? 7 : topSpeed) - ud.speed) * Math.min(1, dt * 1.6);
    u.position.x += Math.sin(u.rotation.y) * ud.speed * dt;
    u.position.z += Math.cos(u.rotation.y) * ud.speed * dt;
    PH3.collide(u.position, 1.7);
    u.userData.tactic = dist < 18 ? 'RAMMING' : dist < 55 ? 'PURSUIT' : 'INTERCEPT';
    u.userData.dist = Math.round(dist);
    // light bar strobes
    if (u.userData.lightBar) {
      const on = Math.floor(now / 160) % 2 === 0;
      u.userData.lightBar[0].material.color.setHex(on ? 0xff2e2e : 0x661111);
      u.userData.lightBar[1].material.color.setHex(on ? 0x112266 : 0x2e6aff);
    }
    // drive-by fire at 2+ stars when close
    if (stars >= 2 && dist < 30 && Math.random() < dt * 0.7 && PH3.onPoliceShot) PH3.onPoliceShot(u);
    // far units teleport-recycle so the pressure never dies
    if (dist > 240) {
      const a = Math.random() * Math.PI * 2;
      u.position.set(p.x + Math.cos(a) * 80, 0, p.z + Math.sin(a) * 80);
      PH3.collide(u.position, 1.7);
    }
  }

  // Roadblock at three stars, cleared when the heat dies.
  if (stars >= 3 && !PH3.roadblock) buildRoadblock();
  if (stars < 2 && PH3.roadblock) {
    PH3.scene.remove(PH3.roadblock.group); PH3.roadblock = null;
  }

  // The helicopter at four stars: spotlight, loudspeaker, presence.
  if (stars >= 4 && !PH3.heli) {
    PH3.heli = PH3.makeHelicopter();
    PH3.scene.add(PH3.heli);
    loudNext = 0;
  }
  if (stars < 4 && PH3.heli) { PH3.scene.remove(PH3.heli); PH3.heli = null; PH3.showLoud(null); }
  if (PH3.heli) {
    const h = PH3.heli;
    h.position.x += (p.x - h.position.x) * Math.min(1, dt * 0.8);
    h.position.z += (p.z - 10 - h.position.z) * Math.min(1, dt * 0.8);
    h.position.y = 30 + Math.sin(now * 0.001) * 1.6;
    h.rotation.y = Math.atan2(p.x - h.position.x, p.z - h.position.z);
    if (now > loudNext) {
      PH3.showLoud(LOUD_LINES[loudIdx++ % LOUD_LINES.length]);
      loudNext = now + 9000;
    }
  }
};

PH3.responseList = function () {
  const out = [];
  for (const u of PH3.policeUnits.slice(0, 3))
    out.push({ unit: 'UNIT ' + (PH3.policeUnits.indexOf(u) + 1) + ' · INTERCEPTOR', tactic: u.userData.tactic || 'PURSUIT', dist: (u.userData.dist || 0) + ' m' });
  if (PH3.roadblock) out.push({ unit: 'ROADBLOCK', tactic: 'SEALING ROAD', dist: Math.round(Math.hypot(PH3.roadblock.x - playerPos().x, PH3.roadblock.z - playerPos().z)) + ' m' });
  if (PH3.heli) out.push({ unit: 'AIR UNIT 1', tactic: 'SPOTLIGHT TRACKING', dist: 'OVERHEAD' });
  return out;
};

// Dre's G-key decoy: he peels off and every unit chases him for ten seconds.
PH3.triggerDecoy = function () {
  if (PH3.decoy && PH3.decoy.until > performance.now()) return false;
  const p = PH3.dre ? PH3.dre.position : playerPos();
  PH3.decoy = { point: { x: p.x, z: p.z }, until: performance.now() + 10000, cooldownUntil: performance.now() + 55000 };
  return true;
};
PH3.decoyReady = function () {
  return !PH3.decoy || performance.now() > PH3.decoy.cooldownUntil;
};
