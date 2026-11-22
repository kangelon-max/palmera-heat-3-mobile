// people.js — the people of Palmera Bay: our original hero (floral shirt,
// gold chain, slicked hair — a modern crime-game lead of our own design),
// crowds of pedestrians who stroll, chat in pairs and scatter at gunfire,
// fixer Marla Voss, and crew wheelman Dre.
window.PH3 = window.PH3 || {};

PH3.peds = [];
PH3.alarm = { x: 0, z: 0, until: 0 };

function limb(w, h, d, mat, x, y, z, parent) {
  const geo = new THREE.BoxGeometry(w, h, d); geo.translate(0, -h / 2, 0);
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  parent.add(m); return m;
}

function floralTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ff8a5c'; g.fillRect(0, 0, 128, 128);
  const cols = ['#ff5f6d', '#ffd23e', '#2ec4b6', '#ffffff'];
  for (let i = 0; i < 26; i++) {
    g.fillStyle = cols[i % 4];
    const x = (i * 37) % 128, y = (i * 53) % 128;
    for (let p = 0; p < 5; p++) {
      g.beginPath();
      g.ellipse(x + Math.cos(p * 1.26) * 5, y + Math.sin(p * 1.26) * 5, 4.6, 2.4, p * 1.26, 0, 7);
      g.fill();
    }
    g.fillStyle = '#7a4a26'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill();
  }
  return new THREE.CanvasTexture(c);
}

PH3.makePerson = function (opts) {
  opts = opts || {};
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: opts.skin || 0xc98a5a });
  const shirt = opts.floral
    ? new THREE.MeshLambertMaterial({ map: floralTexture() })
    : new THREE.MeshLambertMaterial({ color: opts.shirt || 0x2076b8 });
  const pants = new THREE.MeshLambertMaterial({ color: opts.pants || 0x2b3242 });
  const hairM = new THREE.MeshLambertMaterial({ color: opts.hair || 0x1c1410 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34), shirt);
  torso.position.y = 1.12; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.44, 0.4), skin);
  head.position.y = 1.76; head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.44), hairM);
  hair.position.set(0, 2.0, -0.02); g.add(hair);
  if (opts.slick) { const quiff = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.2), hairM); quiff.position.set(0, 1.98, 0.16); g.add(quiff); }
  if (opts.chain) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 8, 18),
      new THREE.MeshBasicMaterial({ color: 0xffd23e }));
    chain.position.set(0, 1.44, 0.19); chain.rotation.x = 0.5; g.add(chain);
  }
  if (opts.cap) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.46), new THREE.MeshLambertMaterial({ color: opts.cap }));
    cap.position.y = 2.02; g.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.3), cap.material);
    brim.position.set(0, 1.97, 0.36); g.add(brim);
  }
  if (opts.shades) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.05), new THREE.MeshBasicMaterial({ color: 0x0a0a12 }));
    sh.position.set(0, 1.8, 0.21); g.add(sh);
  }
  const armL = limb(0.16, 0.72, 0.16, shirt, -0.4, 1.46, 0, g);
  const armR = limb(0.16, 0.72, 0.16, shirt, 0.4, 1.46, 0, g);
  const handL = limb(0.14, 0.2, 0.14, skin, 0, -0.72, 0, armL);
  const legL = limb(0.2, 0.78, 0.2, pants, -0.16, 0.76, 0, g);
  const legR = limb(0.2, 0.78, 0.2, pants, 0.16, 0.76, 0, g);
  g.userData.parts = { armL, armR, legL, legR, head, torso };
  g.userData.phase = Math.random() * 6;
  return g;
};

PH3.animatePerson = function (p, speed, dt) {
  const u = p.userData;
  u.phase += dt * (4 + speed * 1.6);
  const s = Math.sin(u.phase) * Math.min(1, speed * 0.22 + 0.12);
  const P = u.parts;
  P.legL.rotation.x = s; P.legR.rotation.x = -s;
  if (!u.holdArm) { P.armL.rotation.x = -s * 0.8; P.armR.rotation.x = s * 0.8; }
  P.torso.position.y = 1.12 + Math.abs(Math.sin(u.phase)) * 0.03;
};

PH3.makeHero = function () {
  const hero = PH3.makePerson({ floral: true, slick: true, chain: true, shades: true, pants: 0xf2ead8, skin: 0xa06a3c });
  hero.userData.isHero = true;
  return hero;
};

const PED_SPOTS = [];
PH3.spawnCrowds = function (count) {
  const cols = [0xff5f6d, 0x2ec4b6, 0xffb347, 0x2076b8, 0xf2f2f2, 0x37d67a, 0xb83a8c, 0xffd23e, 0xe4572e, 0x8fd2ff, 0xff9ec4, 0x9be15d];
  const skins = [0xf2c79b, 0xc98a5a, 0x8a5a34, 0x6e4520, 0xe8b088];
  for (let i = 0; i < count; i++) {
    const p = PH3.makePerson({
      shirt: cols[i % cols.length], pants: cols[(i + 5) % cols.length],
      skin: skins[i % skins.length], cap: i % 5 === 0 ? 0xff5f6d : null,
    });
    // crowds gather where the city lives: sidewalks, the pier, the beach
    const zone = i % 3;
    let x, z;
    if (zone === 0) { x = -282 + Math.random() * 24 - 12; z = -60 + Math.random() * 170; p.position.set(x < -330 ? -300 : x, 3.1, z); if (i % 2) p.position.x = -282 + (Math.random() - 0.5) * 90; p.position.y = 3.1; }
    else if (zone === 1) { x = -186 + (Math.random() - 0.5) * 14; z = -260 + Math.random() * 520; p.position.set(x, 0, z); }
    else { const r = PH3.ROADS_V[i % PH3.ROADS_V.length]; x = r + 10.5; z = -260 + Math.random() * 520; p.position.set(x, 0, z); }
    p.userData.ped = { target: null, speed: 1.1 + Math.random() * 0.9, chat: Math.random() < 0.14, flee: 0 };
    PH3.scene.add(p); PH3.peds.push(p);
  }
  // Marla Voss waits at her safehouse stoop in Old Town.
  const marla = PH3.makePerson({ shirt: 0x7a1f3d, pants: 0x1c1c26, skin: 0xe8b088, hair: 0x3a2415 });
  marla.position.set(-84, 0, -176); marla.rotation.y = Math.PI;
  PH3.scene.add(marla); PH3.marla = marla;
};

PH3.raiseAlarm = function (x, z) { PH3.alarm.x = x; PH3.alarm.z = z; PH3.alarm.until = performance.now() + 2600; };

PH3.updatePeople = function (dt) {
  const now = performance.now();
  const heroPos = PH3.hero ? PH3.hero.position : null;
  for (const p of PH3.peds) {
    const u = p.userData.ped;
    const dxA = p.position.x - PH3.alarm.x, dzA = p.position.z - PH3.alarm.z;
    if (now < PH3.alarm.until && dxA * dxA + dzA * dzA < 900) u.flee = 1.6;
    if (u.flee > 0) {
      u.flee -= dt;
      const d = Math.max(1, Math.hypot(dxA, dzA));
      p.position.x += dxA / d * 5.2 * dt; p.position.z += dzA / d * 5.2 * dt;
      p.rotation.y = Math.atan2(dxA, dzA);
      PH3.animatePerson(p, 5, dt);
      continue;
    }
    if (u.chat) { PH3.animatePerson(p, 0, dt); continue; }
    if (!u.target || Math.hypot(u.target.x - p.position.x, u.target.z - p.position.z) < 1.2) {
      const onPier = p.position.y > 2;
      u.target = onPier
        ? { x: -330 + Math.random() * 105, z: 22 + Math.random() * 16 }
        : { x: p.position.x + (Math.random() - 0.5) * 90, z: p.position.z + (Math.random() - 0.5) * 90 };
    }
    const dx = u.target.x - p.position.x, dz = u.target.z - p.position.z;
    const d = Math.max(0.001, Math.hypot(dx, dz));
    p.position.x += dx / d * u.speed * dt;
    p.position.z += dz / d * u.speed * dt;
    p.rotation.y = Math.atan2(dx, dz);
    if (p.position.y < 2) PH3.collide(p.position, 0.5);
    PH3.animatePerson(p, u.speed * 2.2, dt);
  }
  if (PH3.marla) PH3.animatePerson(PH3.marla, 0, dt);
};

// Dre: crew wheelman. Shadows the hero on foot; when the hero drives, Dre
// sprints for the car and rides along (he reappears at the door on exit).
PH3.makeDre = function () {
  const dre = PH3.makePerson({ shirt: 0x243b6b, pants: 0x14161c, skin: 0x6e4520, cap: 0xffb347 });
  dre.userData.isDre = true;
  return dre;
};

PH3.updateDre = function (dt) {
  const dre = PH3.dre, hero = PH3.hero;
  if (!dre || !hero) return;
  if (PH3.player.inCar) { dre.visible = false; return; }
  dre.visible = true;
  const anchor = PH3.decoy && PH3.decoy.until > performance.now() ? PH3.decoy.point : hero.position;
  const dx = anchor.x - dre.position.x, dz = anchor.z - dre.position.z;
  const d = Math.hypot(dx, dz);
  if (d > 3.2) {
    const sp = d > 14 ? 6.4 : 3.4;
    dre.position.x += dx / d * sp * dt; dre.position.z += dz / d * sp * dt;
    dre.rotation.y = Math.atan2(dx, dz);
    PH3.animatePerson(dre, sp, dt);
  } else {
    dre.rotation.y = hero.rotation.y;
    PH3.animatePerson(dre, 0, dt);
  }
  PH3.collide(dre.position, 0.5);
};
