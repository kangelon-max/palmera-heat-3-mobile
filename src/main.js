// main.js — Palmera Heat III's engine room: renderer, camera, the hero's
// feet and wheels, gunplay, the WebAudio synth (gunshots, drums, the Sahur
// chant), the day clock, title screen wiring, and the frame loop that runs
// every system. Screenshot staging lives at the bottom: ?shot=cover|night|
// map|title poses the game exactly as the screenshots were taken.
window.PH3 = window.PH3 || {};

PH3.playing = false;
PH3.mapOpen = false;
PH3.shake = 0;
PH3.player = { inCar: false, car: null, hp: 100, armour: 40 };
PH3.keys = {};

// ---------------- audio: everything is synthesised, nothing is a file ----
PH3.initAudio = function () {
  if (PH3.audio) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  function noise(dur, freq, gain, when) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(when); src.stop(when + dur);
  }
  function tone(freq, dur, gain, when, type, slide) {
    const o = ctx.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, when);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(when); o.stop(when + dur);
  }
  PH3.audio = {
    shot(kind) {
      const t = ctx.currentTime;
      if (kind === 'shotgun') { noise(0.28, 900, 0.5, t); tone(120, 0.2, 0.4, t, 'triangle', 40); }
      else if (kind === 'smg') { noise(0.09, 2400, 0.3, t); tone(220, 0.06, 0.2, t, 'square', 90); }
      else { noise(0.14, 1800, 0.38, t); tone(160, 0.1, 0.25, t, 'triangle', 60); }
    },
    dryFire() { tone(1200, 0.03, 0.1, ctx.currentTime, 'square'); },
    drum(size) {
      const t = ctx.currentTime;
      tone(68, 0.5, 0.85 * size, t, 'sine', 34);            // the deep TUNG
      noise(0.18, 300, 0.3 * size, t);
      tone(140, 0.22, 0.3 * size, t, 'triangle', 70);
    },
    chant() {
      const t = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        tone(66, 0.55, 0.9, t + i * 0.42, 'sine', 32);
        noise(0.2, 280, 0.32, t + i * 0.42);
      }
      tone(52, 1.1, 0.95, t + 1.3, 'sine', 28);              // SAHUR — the long one
      noise(0.5, 200, 0.3, t + 1.3);
    },
    smash() { const t = ctx.currentTime; noise(0.4, 500, 0.6, t); tone(90, 0.35, 0.5, t, 'sine', 30); },
    busted() { const t = ctx.currentTime; tone(392, 0.16, 0.2, t, 'square'); tone(311, 0.16, 0.2, t + 0.18, 'square'); tone(233, 0.3, 0.2, t + 0.36, 'square'); },
  };
};

// ---------------- boot ----------------
PH3.init = function () {
  const canvas = document.getElementById('scene');
  PH3.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  PH3.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  PH3.renderer.setSize(innerWidth, innerHeight);
  PH3.renderer.shadowMap.enabled = true;
  PH3.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  PH3.scene = new THREE.Scene();
  PH3.scene.fog = new THREE.Fog(0xdd9a68, 130, 1350);
  PH3.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 3200);
  PH3.camera.position.set(-150, 26, 130);

  PH3.buildSky(PH3.scene);
  PH3.buildWorld();
  PH3.spawnTraffic(26);
  PH3.hero = PH3.makeHero();
  PH3.hero.position.set(-182, 0, 8);
  PH3.hero.rotation.y = -0.7;
  PH3.scene.add(PH3.hero);
  PH3.spawnCrowds(46);
  PH3.dre = PH3.makeDre();
  PH3.dre.position.set(-179, 0, 12);
  PH3.scene.add(PH3.dre);
  PH3.initSahur();
  PH3.initJobs();
  PH3.initHUD();
  PH3.focusPoint = PH3.hero.position.clone();
  wireInput();
  wireTitle();
  stageFromURL();
  requestAnimationFrame(PH3.frame);
};

let lastT = performance.now();
PH3.frame = function (now) {
  requestAnimationFrame(PH3.frame);
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (PH3.playing && !PH3.mapOpen) {
    PH3.timeHours = (PH3.timeHours + dt * 24 / PH3.DAY_LENGTH) % 24;
    PH3.updatePlayer(dt);
    PH3.updateTraffic(dt);
    PH3.updatePeople(dt);
    PH3.updateDre(dt);
    PH3.updatePolice(dt);
    PH3.updateJobs(dt);
    PH3.updateSahur(dt);
    PH3.updateFlips(dt);
  }
  PH3.focusPoint.copy(PH3.player.inCar ? PH3.player.car.position : PH3.hero.position);
  PH3.updateSky(dt);
  PH3.updateWorld(dt);
  PH3.updateCamera(dt);
  if (PH3.playing) PH3.updateHUD(dt);
  PH3.renderer.render(PH3.scene, PH3.camera);
};

// ---------------- player ----------------
const camState = { yaw: 2.4, dist: 9.5 };
PH3.updatePlayer = function (dt) {
  const K = PH3.keys, hero = PH3.hero;
  if (PH3.player.inCar) {
    const car = PH3.player.car, u = car.userData;
    const accel = u.type === 'sport' || u.type === 'stock' ? 30 : u.type === 'bike' ? 34 : 21;
    const top = (u.type === 'bus' || u.type === 'truck' ? 21 : 34) * (1 - (u.damage || 0) / 260);
    if (K.KeyW) u.speed = Math.min(top, (u.speed || 0) + accel * dt);
    else if (K.KeyS) u.speed = Math.max(-10, (u.speed || 0) - accel * 0.9 * dt);
    else u.speed = (u.speed || 0) * (1 - Math.min(1, dt * 1.4));
    const steer = (K.KeyA ? 1 : 0) - (K.KeyD ? 1 : 0);
    if (Math.abs(u.speed) > 0.4) car.rotation.y += steer * dt * 1.5 * Math.sign(u.speed) * Math.min(1, Math.abs(u.speed) / 9);
    const px = car.position.x, pz = car.position.z;
    car.position.x += Math.sin(car.rotation.y) * u.speed * dt;
    car.position.z += Math.cos(car.rotation.y) * u.speed * dt;
    PH3.collide(car.position, 1.9);
    if (Math.abs(car.position.x - px) + Math.abs(car.position.z - pz) < Math.abs(u.speed) * dt * 0.4 && Math.abs(u.speed) > 6) {
      u.damage = Math.min(100, (u.damage || 0) + Math.abs(u.speed) * 0.55);
      PH3.shake = Math.max(PH3.shake, 0.35);
      u.speed *= -0.25;
      if (PH3.audio) PH3.audio.smash();
    }
    hero.visible = false;
    hero.position.copy(car.position);
    if (u.type === 'bike') car.rotation.z = steer * -0.18;
    return;
  }
  hero.visible = true;
  let mx = 0, mz = 0;
  const cy = camState.yaw;
  if (K.KeyW) { mx -= Math.sin(cy); mz -= Math.cos(cy); }
  if (K.KeyS) { mx += Math.sin(cy); mz += Math.cos(cy); }
  if (K.KeyA) { mx -= Math.cos(cy); mz += Math.sin(cy); }
  if (K.KeyD) { mx += Math.cos(cy); mz -= Math.sin(cy); }
  const moving = Math.hypot(mx, mz) > 0.01;
  const run = K.ShiftLeft || K.ShiftRight;
  const speed = run ? 8.6 : 4.4;
  if (moving) {
    const d = Math.hypot(mx, mz); mx /= d; mz /= d;
    hero.position.x += mx * speed * dt;
    hero.position.z += mz * speed * dt;
    hero.rotation.y = Math.atan2(mx, mz);
    PH3.collide(hero.position, 0.55);
  }
  PH3.animatePerson(hero, moving ? speed : 0, dt);
  // enter-car prompt
  const near = nearestCar(4.6);
  PH3.showPrompt(near ? '[F] Enter ' + near.userData.name : null);
};

function nearestCar(range) {
  let best = null, bd = range;
  const all = [...PH3.traffic, ...PH3.policeUnits];
  if (PH3.jobCar) all.push(PH3.jobCar);
  for (const c of all) {
    if (c.userData.flipped) continue;
    const d = c.position.distanceTo(PH3.hero.position);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

PH3.enterExitCar = function () {
  if (PH3.player.inCar) {
    const car = PH3.player.car;
    car.userData.driven = false;
    car.userData.speed = 0;
    PH3.hero.position.set(car.position.x + Math.cos(car.rotation.y) * 2.4, 0, car.position.z - Math.sin(car.rotation.y) * 2.4);
    PH3.hero.visible = true;
    PH3.player.inCar = false; PH3.player.car = null;
    return;
  }
  const car = nearestCar(4.6);
  if (!car) return;
  car.userData.driven = true;
  car.userData.speed = 0;
  PH3.player.inCar = true; PH3.player.car = car;
  if (car.userData.type === 'police' || car.userData.jobCar) PH3.addCrime(0.7, car.position.x, car.position.z);
  PH3.showPrompt(null);
};

PH3.damagePlayer = function (amount) {
  if (PH3.player.armour > 0) {
    const absorbed = Math.min(PH3.player.armour, amount * 0.7);
    PH3.player.armour -= absorbed; amount -= absorbed;
  }
  PH3.player.hp -= amount;
  PH3.shake = Math.max(PH3.shake, 0.22);
  if (PH3.player.hp <= 0) PH3.wasted();
};

PH3.wasted = function () {
  if (PH3.audio) PH3.audio.busted();
  PH3.showDialogue('PBPD DISPATCH', '"Suspect down. Palmera breathes again — for now."');
  PH3.heat = 0;
  for (const u of PH3.policeUnits) PH3.scene.remove(u);
  PH3.policeUnits = [];
  if (PH3.heli) { PH3.scene.remove(PH3.heli); PH3.heli = null; }
  if (PH3.roadblock) { PH3.scene.remove(PH3.roadblock.group); PH3.roadblock = null; }
  if (PH3.player.inCar) PH3.enterExitCar();
  PH3.hero.position.set(-84, 0, -172);
  PH3.player.hp = 100; PH3.player.armour = 40;
  PH3.state.cash = Math.max(0, PH3.state.cash - 100);
};

PH3.onPoliceShot = function (unit) {
  if (Math.random() < 0.4) PH3.damagePlayer(2.5 + Math.random() * 3);
  if (PH3.audio) PH3.audio.shot('pistol');
};

// ---------------- gunplay ----------------
const tracers = [];
PH3.fireWeapon = function () {
  if (!PH3.playing || PH3.player.inCar || PH3.mapOpen) return;
  const wp = PH3.WEAPONS[PH3.weapon];
  const hero = PH3.hero;
  hero.userData.holdArm = true;
  hero.userData.parts.armR.rotation.x = -1.45;
  setTimeout(() => { hero.userData.holdArm = false; }, 350);
  if (wp.key === 'fists') {
    for (const p of PH3.peds) {
      if (p.position.distanceTo(hero.position) < 2.4 && !p.userData.dead) {
        knockDown(p); PH3.addCrime(0.5, hero.position.x, hero.position.z);
        break;
      }
    }
    return;
  }
  if (PH3.ammo[wp.key] <= 0) { if (PH3.audio) PH3.audio.dryFire(); return; }
  PH3.ammo[wp.key]--;
  if (PH3.audio) PH3.audio.shot(wp.key);
  PH3.addCrime(0.85, hero.position.x, hero.position.z);
  // hitscan along the camera's aim
  const origin = hero.position.clone(); origin.y = 1.5;
  const dir = new THREE.Vector3();
  PH3.camera.getWorldDirection(dir);
  const ray = new THREE.Raycaster(origin, dir, 1, 110);
  const targets = [...PH3.peds, ...PH3.policeUnits, ...PH3.traffic];
  if (PH3.jobCar) targets.push(PH3.jobCar);
  const hits = ray.intersectObjects(targets, true);
  let end = origin.clone().addScaledVector(dir, 60);
  if (hits.length) {
    end = hits[0].point;
    let root = hits[0].object;
    while (root.parent && !root.userData.parts && !root.userData.type) root = root.parent;
    if (root.userData.parts && !root.userData.dead) { knockDown(root); PH3.addCrime(0.4, hero.position.x, hero.position.z); }
    else if (root.userData.type) { root.userData.damage = Math.min(100, (root.userData.damage || 0) + 7); }
  }
  // tracer + muzzle flash
  const geo = new THREE.BufferGeometry().setFromPoints([origin.clone().add(new THREE.Vector3(0, 0.1, 0)), end]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9 }));
  PH3.scene.add(line); tracers.push({ line, life: 0.09 });
  const flash = new THREE.PointLight(0xffc46b, 2.2, 12);
  flash.position.copy(origin).addScaledVector(dir, 1.2);
  PH3.scene.add(flash); tracers.push({ line: flash, life: 0.05, isLight: true });
};

function knockDown(p) {
  p.userData.dead = true;
  p.rotation.x = -Math.PI / 2;
  p.position.y = p.position.y > 2 ? p.position.y : 0.35;
  const i = PH3.peds.indexOf(p);
  if (i >= 0) PH3.peds.splice(i, 1);
  setTimeout(() => PH3.scene.remove(p), 9000);
}

// ---------------- camera ----------------
PH3.updateCamera = function (dt) {
  const cam = PH3.camera;
  if (PH3.camLock) {
    cam.position.copy(PH3.camLock.pos);
    cam.lookAt(PH3.camLock.look);
    return;
  }
  if (!PH3.playing) {
    // title panorama: a slow golden sweep high over the bay and the coast
    const t = performance.now() * 0.00005;
    cam.position.set(Math.cos(t) * 175 - 110, 54 + Math.sin(t * 2.3) * 7, Math.sin(t) * 175);
    cam.lookAt(-70, 4, 0);
    return;
  }
  const target = PH3.player.inCar ? PH3.player.car : PH3.hero;
  const back = PH3.player.inCar ? 11.5 : 8.2;
  const up = PH3.player.inCar ? 4.2 : 3.1;
  const heading = target.rotation.y;
  camState.yaw += (((heading + Math.PI) - camState.yaw + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 4);
  const cx = target.position.x + Math.sin(camState.yaw) * -Math.cos(0) * back * Math.cos(0.12);
  const desired = new THREE.Vector3(
    target.position.x - Math.sin(heading) * -back * 0 + Math.sin(camState.yaw) * back,
    target.position.y + up,
    target.position.z + Math.cos(camState.yaw) * back);
  // simpler stable chase: behind the heading, smoothed
  desired.set(
    target.position.x - Math.sin(heading) * back,
    target.position.y + up,
    target.position.z - Math.cos(heading) * back);
  cam.position.lerp(desired, Math.min(1, dt * 5));
  PH3.shake = Math.max(0, (PH3.shake || 0) - dt * 2.2);
  const sh = PH3.shake * 0.35;
  cam.position.x += (Math.random() - 0.5) * sh;
  cam.position.y += (Math.random() - 0.5) * sh;
  const look = target.position.clone(); look.y += 2.1;
  cam.lookAt(look);
  // tracers fade here so they live in one place
  for (let i = tracers.length - 1; i >= 0; i--) {
    tracers[i].life -= dt;
    if (tracers[i].life <= 0) { PH3.scene.remove(tracers[i].line); tracers.splice(i, 1); }
  }
};

// ---------------- input & title ----------------
function wireInput() {
  addEventListener('keydown', e => {
    PH3.keys[e.code] = true;
    if (!PH3.playing) return;
    if (e.code === 'KeyF') PH3.enterExitCar();
    if (e.code === 'KeyL') PH3.cyclePhase();
    if (e.code === 'KeyM') PH3.toggleMap();
    if (e.code === 'KeyT') PH3.summonSahur();
    if (e.code === 'KeyG') {
      if (PH3.triggerDecoy()) PH3.showDialogue('DRE — CREW', '"On it — I will pull the heat. GO!"');
      else PH3.showToast('DECOY RECHARGING…');
    }
    if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 4) PH3.weapon = n - 1;
    }
  });
  addEventListener('keyup', e => { PH3.keys[e.code] = false; });
  addEventListener('mousedown', e => { if (e.target === PH3.renderer.domElement) PH3.fireWeapon(); });
  addEventListener('wheel', e => {
    if (!PH3.playing) return;
    PH3.weapon = (PH3.weapon + (e.deltaY > 0 ? 1 : 3)) % 4;
  });
  addEventListener('resize', () => {
    PH3.camera.aspect = innerWidth / innerHeight;
    PH3.camera.updateProjectionMatrix();
    PH3.renderer.setSize(innerWidth, innerHeight);
  });
}

function startGame(fresh) {
  PH3.initAudio();
  if (fresh) PH3.resetSave();
  document.getElementById('title').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  PH3.playing = true;
  PH3.showDialogue('MARLA VOSS', '"There he is. Palmera is hot tonight — let us make it hotter."');
}

function wireTitle() {
  document.getElementById('btnContinue').addEventListener('click', () => startGame(false));
  document.getElementById('btnNew').addEventListener('click', () => startGame(true));
  document.getElementById('btnSettings').addEventListener('click', function () {
    const on = !PH3.renderer.shadowMap.enabled;
    PH3.renderer.shadowMap.enabled = on;
    this.textContent = on ? 'Settings · Shadows ON' : 'Settings · Shadows OFF';
  });
}

// ---------------- screenshot staging & probe ----------------
function stageFromURL() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return;
  startGame(false);
  if (shot === 'title') {
    document.getElementById('title').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    PH3.playing = false;
    PH3.timeHours = 7.4;
    return;
  }
  setTimeout(() => {
    if (shot === 'cover') {
      PH3.timeHours = 17.8;
      PH3.state.job = 2; PH3.jobStage = 2; PH3.stageTimeLeft = 96;
      if (PH3.jobMarker) PH3.jobMarker.position.set(-196, 0, 30);
      const car = PH3.makeVehicle('sport', 0xff5f6d);
      car.position.set(-193.5, 0, 74); car.rotation.y = Math.PI;
      car.userData.driven = true; car.userData.speed = 14;
      PH3.scene.add(car);
      PH3.player.inCar = true; PH3.player.car = car;
      PH3.hero.position.copy(car.position);
      PH3.heat = 4.3; PH3.lastCrimeAt = performance.now();
      const cop = PH3.makeVehicle('police', 0xf2f2f2);
      cop.position.set(-197, 1.4, 50); cop.rotation.z = 2.3; cop.rotation.y = 0.6;
      cop.userData.flipping = 0; cop.userData.flipped = true;
      PH3.scene.add(cop); PH3.policeUnits.push(cop);
      PH3.summonSahur();
      const S = PH3.sahur;
      S.group.position.set(-204, 0, 42);
      S.state = 'hunting'; S.target = cop; S.swingT = 0.52; S.hitDone = true; S.poseLock = true;
      const P = S.group.userData.parts;
      P.shR.rotation.x = -1.1; P.shL.rotation.x = -0.6; P.bat.rotation.x = Math.PI + 0.5;
      S.group.rotation.y = Math.atan2(cop.position.x - S.group.position.x, cop.position.z - S.group.position.z);
      const stock = PH3.makeVehicle('stock', 0x2076b8);
      stock.position.set(-186.5, 0, 62); stock.rotation.y = Math.PI;
      PH3.scene.add(stock);
      const bike = PH3.makeVehicle('bike', 0xff5f6d);
      bike.position.set(-203, 0, 66); bike.rotation.y = Math.PI - 0.15;
      PH3.scene.add(bike);
      PH3.showDialogue('MARLA VOSS', '"Stage 3 — through the pier lights. And whatever THAT is behind you… drive faster."');
      PH3.camLock = { pos: new THREE.Vector3(-172, 8, 84), look: new THREE.Vector3(-216, 6, 34) };
    } else if (shot === 'night') {
      PH3.timeHours = 4.1;
      PH3.hero.position.set(-272, 3.1, 18);
      PH3.hero.rotation.y = -1.2;
      PH3.dre.position.set(-269, 3.1, 22);
      PH3.camLock = { pos: new THREE.Vector3(-250, 7, 44), look: new THREE.Vector3(-320, 26, 6) };
    } else if (shot === 'map') {
      PH3.timeHours = 12.4;
      PH3.toggleMap(true);
    }
  }, 900);
}

// A tiny probe surface the play-test drives: start, shoot, summon, cycle.
window.__probe = {
  start() { startGame(false); return 'playing=' + PH3.playing; },
  fire() { PH3.weapon = 1; PH3.fireWeapon(); return 'ammo=' + PH3.ammo.pistol; },
  summon() { const ok = PH3.summonSahur(); return 'summon=' + ok + ' state=' + PH3.sahur.state; },
  cycle() { PH3.cyclePhase(); return 'hours=' + PH3.timeHours.toFixed(1) + ' phase=' + PH3.phaseName(); },
  state() {
    return JSON.stringify({
      playing: PH3.playing, hours: +PH3.timeHours.toFixed(2), stars: PH3.stars(),
      units: PH3.policeUnits.length, peds: PH3.peds.length, traffic: PH3.traffic.length,
      job: PH3.jobInfo().name, sahur: PH3.sahur.state,
    });
  },
};

document.addEventListener('DOMContentLoaded', PH3.init);
