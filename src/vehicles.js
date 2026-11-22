// vehicles.js — every vehicle in Palmera Bay: traffic sedans, sports cars,
// trucks and a bus, original-livery STOCK CARS with big numbers, GP-style
// racing motorcycles with leathered riders, PBPD interceptors and the police
// helicopter. Traffic drives the road grid on the correct side, turns at
// intersections and queues behind slower cars.
window.PH3 = window.PH3 || {};

PH3.traffic = [];
PH3.spinners = []; // rotors and wheels that turn every frame

const CAR_NAMES = {
  sedan: 'Solano Sedan', sport: 'Vantara GT', truck: 'Hauler 600', bus: 'Bayliner Bus',
  taxi: 'Palmera Cab', stock: 'Stock Car · Coco Racing', bike: 'GP Racer · Azul Speed',
  police: 'PBPD Interceptor',
};
PH3.CAR_NAMES = CAR_NAMES;

function liveryTexture(number, team, bg, fg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 128);
  g.fillStyle = fg; g.beginPath(); g.moveTo(0, 128); g.lineTo(256, 30); g.lineTo(256, 128); g.fill();
  g.fillStyle = '#ffffff'; g.font = '900 74px sans-serif'; g.textAlign = 'center';
  g.fillText(number, 128, 82);
  g.font = '900 17px sans-serif'; g.fillText(team, 128, 112);
  return new THREE.CanvasTexture(c);
}

function wheels(g, x, z, r, mat) {
  const geo = new THREE.CylinderGeometry(r, r, 0.32, 12);
  const out = [];
  for (const [dx, dz] of [[-x, -z], [x, -z], [-x, z], [x, z]]) {
    const w = new THREE.Mesh(geo, mat);
    w.rotation.z = Math.PI / 2; w.position.set(dx, r, dz); w.castShadow = true;
    g.add(w); out.push(w); PH3.spinners.push(w);
  }
  return out;
}

PH3.makeVehicle = function (type, colorHex) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: colorHex });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1c2836 });
  const tyre = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const chrome = new THREE.MeshLambertMaterial({ color: 0xc8ccd4 });
  const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh; };
  const B = (w, h, d, mat, x, y, z) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z);

  if (type === 'bike') {
    B(0.5, 0.5, 2.3, paint, 0, 0.62, 0);                       // fairing body
    B(0.44, 0.34, 0.8, paint, 0, 0.86, 0.72);                   // nose + screen base
    B(0.4, 0.3, 0.1, glass, 0, 1.02, 1.05);                     // windscreen
    B(0.34, 0.16, 0.7, tyre, 0, 0.78, -0.72);                   // tail unit
    const wg = new THREE.CylinderGeometry(0.34, 0.34, 0.12, 12);
    for (const dz of [0.95, -0.95]) {
      const w = add(new THREE.Mesh(wg, tyre), 0, 0.34, dz); PH3.spinners.push(w);
    }
    // rider in leathers + helmet, tucked over the tank
    const leathers = new THREE.MeshLambertMaterial({ color: colorHex });
    B(0.44, 0.62, 0.3, leathers, 0, 1.18, -0.28).rotation.x = 0.62;
    B(0.4, 0.5, 0.24, leathers, 0, 0.86, -0.72).rotation.x = -0.5;
    const helmet = add(new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xf2f2f2 })), 0, 1.52, 0.02);
    B(0.3, 0.1, 0.05, glass, 0, 1.52, 0.22);
    g.userData.length = 2.3;
  } else if (type === 'stock') {
    const num = String(7 + Math.floor(Math.random() * 88));
    const liv = liveryTexture(num, 'COCO RACING', '#' + new THREE.Color(colorHex).getHexString(), '#122');
    const livMat = new THREE.MeshLambertMaterial({ map: liv });
    B(2.15, 0.52, 4.9, paint, 0, 0.62, 0);                      // low wide body
    const sideL = B(0.06, 0.8, 3.6, livMat, -1.09, 0.98, 0);    // numbered doors
    const sideR = B(0.06, 0.8, 3.6, livMat, 1.09, 0.98, 0);
    B(2.0, 0.5, 2.0, paint, 0, 1.12, -0.25);                    // cabin
    B(1.9, 0.1, 0.9, glass, 0, 1.2, 0.85);                      // windshield band
    B(2.3, 0.09, 0.55, tyre, 0, 1.28, -2.25);                   // big rear spoiler
    B(0.12, 0.42, 0.12, tyre, -0.95, 1.05, -2.25); B(0.12, 0.42, 0.12, tyre, 0.95, 1.05, -2.25);
    B(2.16, 0.3, 0.3, tyre, 0, 0.42, 2.42);                     // splitter
    wheels(g, 1.0, 1.55, 0.42, tyre);
    g.userData.length = 4.9;
  } else if (type === 'bus') {
    B(2.5, 2.6, 9.6, paint, 0, 1.75, 0);
    B(2.54, 0.9, 9.0, glass, 0, 2.25, 0);
    B(2.54, 0.5, 0.4, chrome, 0, 0.8, 4.85);
    wheels(g, 1.15, 3.2, 0.5, tyre);
    g.userData.length = 9.6;
  } else if (type === 'truck') {
    B(2.3, 1.9, 2.2, paint, 0, 1.5, 2.6);                       // cab
    B(2.2, 0.7, 0.15, glass, 0, 1.95, 3.68);
    B(2.45, 2.5, 4.6, new THREE.MeshLambertMaterial({ color: 0xd8d3c8 }), 0, 1.8, -0.9); // cargo box
    wheels(g, 1.05, 2.6, 0.5, tyre);
    g.userData.length = 7.4;
  } else { // sedan / sport / taxi / police share a shell
    const sporty = type === 'sport';
    B(1.9, 0.55, 4.5, paint, 0, 0.62, 0);
    B(1.7, 0.5, sporty ? 1.9 : 2.2, paint, 0, 1.08, sporty ? -0.3 : -0.1);
    B(1.74, 0.42, 0.9, glass, 0, 1.1, 0.72);
    B(1.74, 0.36, 0.7, glass, 0, 1.1, -1.05);
    if (sporty) { B(2.0, 0.08, 0.4, tyre, 0, 1.06, -2.2); B(0.5, 0.22, 0.3, chrome, -0.5, 0.5, -2.3); B(0.5, 0.22, 0.3, chrome, 0.5, 0.5, -2.3); }
    if (type === 'taxi') B(0.9, 0.22, 0.4, new THREE.MeshBasicMaterial({ color: 0xffe9b0 }), 0, 1.44, -0.1);
    if (type === 'police') {
      B(1.94, 0.4, 4.54, new THREE.MeshLambertMaterial({ color: 0x14161c }), 0, 0.66, 0);
      const barR = B(0.55, 0.16, 0.5, new THREE.MeshBasicMaterial({ color: 0xff2e2e }), -0.42, 1.44, -0.1);
      const barB = B(0.55, 0.16, 0.5, new THREE.MeshBasicMaterial({ color: 0x2e6aff }), 0.42, 1.44, -0.1);
      g.userData.lightBar = [barR, barB];
      const doorTex = liveryTexture('PBPD', 'PALMERA BAY PD', '#f2f2f2', '#14161c');
      const dm = new THREE.MeshLambertMaterial({ map: doorTex });
      B(0.05, 0.62, 2.6, dm, -0.97, 0.72, 0); B(0.05, 0.62, 2.6, dm, 0.97, 0.72, 0);
    }
    // headlights + tail lights
    const hl = new THREE.MeshBasicMaterial({ color: 0xfff3c0 });
    B(0.4, 0.14, 0.06, hl, -0.6, 0.68, 2.26); B(0.4, 0.14, 0.06, hl, 0.6, 0.68, 2.26);
    const tl = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    B(0.4, 0.12, 0.06, tl, -0.6, 0.7, -2.26); B(0.4, 0.12, 0.06, tl, 0.6, 0.7, -2.26);
    wheels(g, 0.92, 1.45, 0.36, tyre);
    g.userData.length = 4.5;
  }
  g.userData.type = type;
  g.userData.name = CAR_NAMES[type];
  g.userData.damage = 0;
  g.userData.speed = 0;
  return g;
};

PH3.makeHelicopter = function () {
  const g = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: 0x1d2733 });
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
  add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, 5.2), body), 0, 0, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 1.6), new THREE.MeshLambertMaterial({ color: 0x8fd2ff })), 0, 0.25, 2.9);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.6), body), 0, 0.4, -4.6);
  add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.2), body), 0, 0.8, -6.8);
  const rotor = add(new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x222 })), 0, 1.35, 0);
  const tail = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.4), new THREE.MeshLambertMaterial({ color: 0x222 })), 0.35, 0.5, -6.8);
  PH3.spinners.push({ rotation: rotor.rotation, axis: 'y', speed: 22, isObj: true, obj: rotor });
  PH3.spinners.push({ rotation: tail.rotation, axis: 'x', speed: 30, isObj: true, obj: tail });
  add(new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 0.3), body), 0, -1.3, 0.8);
  add(new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 0.3), body), 0, -1.3, -0.8);
  // searchlight cone + real spotlight
  const cone = new THREE.Mesh(new THREE.ConeGeometry(4.6, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff3c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.set(0, -13.5, 1); g.add(cone);
  const spot = new THREE.SpotLight(0xfff3c0, 1.6, 90, 0.4, 0.5);
  spot.position.set(0, -1, 1); g.add(spot); g.add(spot.target); spot.target.position.set(0, -30, 1);
  g.userData.cone = cone;
  return g;
};

// ---- traffic ----
const TRAFFIC_TYPES = ['sedan', 'sedan', 'sedan', 'sport', 'taxi', 'truck', 'bus', 'stock', 'bike', 'sedan', 'sport', 'stock', 'bike'];
const TRAFFIC_COLOURS = [0xff5f6d, 0x2ec4b6, 0xffb347, 0x2076b8, 0xf2f2f2, 0x37d67a, 0xb83a8c, 0xffd23e, 0xe4572e, 0x8fd2ff];

PH3.spawnTraffic = function (count) {
  for (let i = 0; i < count; i++) {
    const type = TRAFFIC_TYPES[i % TRAFFIC_TYPES.length];
    const mesh = PH3.makeVehicle(type, TRAFFIC_COLOURS[i % TRAFFIC_COLOURS.length]);
    const vertical = i % 2 === 0;
    const road = vertical ? PH3.ROADS_V[i % PH3.ROADS_V.length] : PH3.ROADS_H[i % PH3.ROADS_H.length];
    const dir = i % 4 < 2 ? 1 : -1;
    const along = -260 + (i * 47) % 500;
    const lane = 2.4 * dir;
    if (vertical) mesh.position.set(road + lane, 0, along);
    else mesh.position.set(along, 0, road + (dir > 0 ? -lane : lane));
    mesh.userData.traffic = { vertical, dir, road, speed: 10 + (i % 5) * 1.7, cruise: 10 + (i % 5) * 1.7 };
    mesh.rotation.y = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    PH3.scene.add(mesh); PH3.traffic.push(mesh);
  }
  // The two set-piece events: a stock-car pack lapping the coast loop and
  // GP bikes carving the beachfront, flagged so jobs can point at them.
  PH3.stockEvent = PH3.traffic.filter(v => v.userData.type === 'stock');
  PH3.bikeEvent = PH3.traffic.filter(v => v.userData.type === 'bike');
};

PH3.updateTraffic = function (dt) {
  for (const v of PH3.traffic) {
    if (v.userData.driven) continue;
    const t = v.userData.traffic; if (!t) continue;
    // slow for a car ahead in the same lane
    let target = t.cruise;
    for (const o of PH3.traffic) {
      if (o === v || !o.userData.traffic) continue;
      const dx = o.position.x - v.position.x, dz = o.position.z - v.position.z;
      const fx = Math.sin(v.rotation.y), fz = Math.cos(v.rotation.y);
      const ahead = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
      if (ahead > 0 && ahead < 9 && side < 1.8) target = Math.min(target, o.userData.traffic.speed * 0.85);
    }
    t.speed += (target - t.speed) * Math.min(1, dt * 2);
    const fx = Math.sin(v.rotation.y), fz = Math.cos(v.rotation.y);
    v.position.x += fx * t.speed * dt;
    v.position.z += fz * t.speed * dt;
    // turn at intersections
    const roads = t.vertical ? PH3.ROADS_H : PH3.ROADS_V;
    const along = t.vertical ? v.position.z : v.position.x;
    for (const r of roads) {
      if (Math.abs(along - r) < 0.9 && Math.random() < 0.35) {
        const nd = Math.random() < 0.5 ? 1 : -1;
        if (t.vertical) { // was north-south, now turns onto the east-west road r
          v.position.z = r + (nd > 0 ? -2.4 : 2.4);
          v.rotation.y = nd > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {          // was east-west, now turns onto the north-south road r
          v.position.x = r + (nd > 0 ? 2.4 : -2.4);
          v.rotation.y = nd > 0 ? 0 : Math.PI;
        }
        t.vertical = !t.vertical; t.dir = nd;
        break;
      }
    }
    if (v.position.x < -205 && t.vertical) v.position.x = -205;
    if (v.position.x > 268) { v.position.x = 268; v.rotation.y = -Math.PI / 2; t.vertical = false; }
    if (v.position.z > 262) { v.position.z = 262; v.rotation.y = Math.PI; t.vertical = true; }
    if (v.position.z < -268) { v.position.z = -268; v.rotation.y = 0; t.vertical = true; }
    if (v.userData.type === 'bike') v.rotation.z = Math.sin(performance.now() * 0.002 + v.id) * 0.06;
    PH3.collide(v.position, 1.4);
  }
  for (const s of PH3.spinners) {
    if (s.isObj) s.obj.rotation[s.axis] += s.speed * dt;
    else s.rotation.x += dt * 6;
  }
};
