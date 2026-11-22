// jobs.js — Marla Voss's six story jobs: sequenced stages with markers,
// timers, checkpoint races, a steal-and-deliver, two lose-the-tail escapes
// and the Big Score finale. Cash, respect and district standing persist in a
// localStorage save, and finishing job six rolls the completion screen.
window.PH3 = window.PH3 || {};

PH3.state = { cash: 350, respect: 12, standing: 55, job: 0, done: false };
PH3.jobStage = 0;
PH3.stageTimeLeft = -1;
PH3.jobCar = null;

const J = (name, reward, respect, stages) => ({ name, reward, respect, stages });
const G = (obj, x, z, dlg) => ({ kind: 'goto', obj, x, z, dlg });
const T = (obj, x, z, time, dlg) => ({ kind: 'timer', obj, x, z, time, dlg });
const E = (obj, heat, dlg) => ({ kind: 'escape', obj, heat, dlg });
const S = (obj, x, z, dlg) => ({ kind: 'steal', obj, x, z, dlg });
const D = (obj, x, z, dlg) => ({ kind: 'deliver', obj, x, z, dlg });

PH3.JOBS = [
  J('Port Run', 600, 6, [
    G('Drive to the Port of Palmera docks and take the package.', 40, 268, 'Marla: "Package is on the docks, love. In and out, nobody sees a thing."'),
    T('Deliver the package to Marla’s safehouse in Old Town.', -84, -182, 150, 'Marla: "Clock is running. The buyer does not wait."'),
  ]),
  J('Heat Check', 450, 5, [
    G('Meet Marla’s runner at the Sol Avenue lights.', 70, -52, 'Dre: "Runner looks twitchy. Keep the engine warm."'),
    E('Lose the PBPD tail — drop below two stars.', 2.5, 'Marla: "You have company. Lose them, then come home."'),
  ]),
  J('Coast Run', 800, 8, [
    T('Checkpoint 1/5 — south down the coast road.', -196, -150, 150, 'Marla: "Five lights on the coast. Beat the tide clock."'),
    T('Checkpoint 2/5 — past the beach gym.', -196, -52, 150),
    T('Checkpoint 3/5 — the pier gates.', -196, 30, 150),
    T('Checkpoint 4/5 — north beachfront.', -196, 122, 150),
    T('Final checkpoint — the marina turn.', -104, 210, 150, 'Dre: "That is how you drive a coast, baby!"'),
  ]),
  J('Grand Tourer', 1100, 9, [
    S('Steal the marked Vantara GT from the Downtown showroom row.', 160, -142, 'Marla: "A collector wants that GT. The showroom will not miss it. Much."'),
    D('Deliver the GT to the Hills garage, paint intact.', 246, 112, 'Dre: "Easy on the corners — the paint IS the paycheck."'),
  ]),
  J('Ambush at the Docks', 1500, 11, [
    G('Meet the contact at the container yard.', 62, 262, 'Marla: "Something smells off about this meet. Stay sharp."'),
    E('It was a sting — break the PBPD ambush and vanish.', 4, 'Dre: "IT IS A TRAP — DRIVE, DRIVE!"'),
    G('Get back to Marla’s safehouse.', -84, -182, 'Marla: "You made it out. The bay talks about you now."'),
  ]),
  J('The Big Score', 3000, 16, [
    G('Hit the Banco Sol vault team rendezvous, Downtown.', -14, -66, 'Marla: "Tonight we stop being small. The Big Score, love."'),
    T('Checkpoint — coast road south, stay ahead of the response.', -196, -140, 170),
    T('Checkpoint — through the pier lights.', -196, 34, 170),
    D('Bring the score to the Port of Palmera fence.', 44, 272, 'Marla: "Palmera is ours. Every last street of it."'),
  ]),
];

PH3.currentStage = function () {
  const job = PH3.JOBS[PH3.state.job];
  return job ? job.stages[PH3.jobStage] : null;
};

PH3.jobInfo = function () {
  if (PH3.state.done) return { kicker: 'PALMERA BAY · FREE ROAM', name: 'The Bay Is Yours', stage: 'All six jobs complete', obj: 'Cruise, race the coast, or stir the PBPD.', frac: 1 };
  const job = PH3.JOBS[PH3.state.job], st = PH3.currentStage();
  let stage = 'STAGE ' + (PH3.jobStage + 1) + '/' + job.stages.length;
  if (st.kind === 'timer' && PH3.stageTimeLeft >= 0) stage += ' · ' + Math.ceil(PH3.stageTimeLeft) + 's';
  if (st.kind === 'escape') stage += ' · heat ' + PH3.stars() + '★';
  return {
    kicker: 'STORY JOB ' + (PH3.state.job + 1) + ' / 6 · MARLA VOSS',
    name: job.name, stage, obj: st.obj,
    frac: PH3.stageTimeLeft >= 0 && st.time ? 1 - PH3.stageTimeLeft / st.time : (PH3.jobStage + 1) / job.stages.length,
  };
};

function startStage() {
  const st = PH3.currentStage(); if (!st) return;
  PH3.stageTimeLeft = st.kind === 'timer' ? st.time : -1;
  if (st.kind === 'escape') PH3.addCrime(st.heat, PH3.hero.position.x, PH3.hero.position.z);
  if (st.kind === 'steal' && !PH3.jobCar) {
    PH3.jobCar = PH3.makeVehicle('sport', 0xffd23e);
    PH3.jobCar.position.set(st.x, 0, st.z);
    PH3.jobCar.rotation.y = Math.PI / 2;
    PH3.jobCar.userData.jobCar = true;
    PH3.scene.add(PH3.jobCar);
  }
  moveMarker(st);
  if (st.dlg) {
    const who = st.dlg.startsWith('Dre') ? 'DRE — CREW' : 'MARLA VOSS';
    PH3.showDialogue(who, st.dlg.replace(/^[^:]+: /, ''));
  }
}

function moveMarker(st) {
  if (!PH3.jobMarker) return;
  if (st.kind === 'escape') { PH3.jobMarker.visible = false; return; }
  PH3.jobMarker.visible = true;
  PH3.jobMarker.position.set(st.x, 0, st.z);
}

function completeJob() {
  const job = PH3.JOBS[PH3.state.job];
  PH3.state.cash += job.reward;
  PH3.state.respect += job.respect;
  PH3.state.standing = Math.min(100, PH3.state.standing + 4);
  PH3.showToast('JOB COMPLETE · +Ŧ' + job.reward + ' · +' + job.respect + ' RESPECT');
  PH3.state.job++;
  PH3.jobStage = 0;
  if (PH3.jobCar) { PH3.scene.remove(PH3.jobCar); PH3.jobCar = null; }
  if (PH3.state.job >= PH3.JOBS.length) {
    PH3.state.done = true;
    PH3.saveGame();
    const d = document.getElementById('done');
    document.getElementById('doneStats').textContent =
      'Cash Ŧ' + PH3.state.cash + ' · Respect ' + PH3.state.respect + ' · Palmera standing ' + PH3.state.standing + '/100';
    d.classList.remove('hidden');
    return;
  }
  PH3.saveGame();
  startStage();
}

function advanceStage() {
  const job = PH3.JOBS[PH3.state.job];
  PH3.jobStage++;
  if (PH3.jobStage >= job.stages.length) completeJob();
  else startStage();
}

PH3.initJobs = function () {
  // The objective marker: a pillar of golden light you can see across town.
  const grp = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 15; grp.add(beam);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.22, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.4; grp.add(ring);
  PH3.scene.add(grp);
  PH3.jobMarker = grp;
  PH3.loadSave();
  if (!PH3.state.done) startStage();
  else moveMarker({ kind: 'escape' });
};

PH3.updateJobs = function (dt) {
  if (PH3.state.done || !PH3.playing) return;
  const st = PH3.currentStage(); if (!st) return;
  if (PH3.jobMarker && PH3.jobMarker.visible) {
    PH3.jobMarker.children[1].rotation.z += dt * 1.4;
    PH3.jobMarker.position.y = Math.sin(performance.now() * 0.003) * 0.3;
  }
  if (st.kind === 'timer') {
    PH3.stageTimeLeft -= dt;
    if (PH3.stageTimeLeft < 0) {
      PH3.showDialogue('MARLA VOSS', '"Too slow. Again — and this time, fly."');
      PH3.stageTimeLeft = st.time;
      return;
    }
  }
  const p = PH3.player.inCar ? PH3.player.car.position : PH3.hero.position;
  if (st.kind === 'escape') {
    if (PH3.stars() <= 1 && performance.now() - PH3.lastCrimeAt > 1500) advanceStage();
    return;
  }
  const d = Math.hypot(p.x - st.x, p.z - st.z);
  if (st.kind === 'steal') {
    if (PH3.player.inCar && PH3.player.car === PH3.jobCar) advanceStage();
    return;
  }
  if (st.kind === 'deliver') {
    if (d < 8 && PH3.player.inCar && (!PH3.JOBS[PH3.state.job].stages[PH3.jobStage - 1] || PH3.player.car)) advanceStage();
    return;
  }
  if (d < 7) advanceStage();
};

PH3.saveGame = function () {
  try {
    localStorage.setItem('ph3-save', JSON.stringify({
      cash: PH3.state.cash, respect: PH3.state.respect,
      standing: PH3.state.standing, job: PH3.state.job, done: PH3.state.done,
    }));
  } catch (e) { /* private mode: the bay forgets, we play on */ }
};

PH3.loadSave = function () {
  try {
    const s = JSON.parse(localStorage.getItem('ph3-save') || 'null');
    if (s) Object.assign(PH3.state, s);
  } catch (e) { /* fresh start */ }
  PH3.jobStage = 0;
};

PH3.resetSave = function () {
  try { localStorage.removeItem('ph3-save'); } catch (e) {}
  PH3.state = { cash: 350, respect: 12, standing: 55, job: 0, done: false };
  PH3.jobStage = 0;
  if (PH3.jobCar) { PH3.scene.remove(PH3.jobCar); PH3.jobCar = null; }
  startStage();
};
