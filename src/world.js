// world.js — Palmera Bay itself: the road grid, hundreds of dressed buildings,
// street props, and the landmarks the owner asked for — Palmera Pier with its
// lit ferris wheel and coaster, the hillside PALMERA sign, the observatory,
// the beach gym and the port lighthouse. Everything is procedural: facade
// textures are painted on canvases, windows light up after dark, and every
// building registers a collider so the city is solid.
window.PH3 = window.PH3 || {};

PH3.ROADS_V = [-196, -110, -20, 70, 160, 250];   // x of north-south roads
PH3.ROADS_H = [-240, -150, -60, 30, 120, 210];   // z of east-west roads
PH3.ROAD_W = 17;
PH3.colliders = [];
PH3.litMats = [];      // facade materials whose windows glow at night
PH3.glowMats = [];     // sprite materials for lamp halos
PH3.landmarks = [
  { name: 'PALMERA PIER', x: -300, z: 30 },
  { name: 'FERRIS WHEEL', x: -318, z: 30 },
  { name: 'BEACH GYM', x: -228, z: -118 },
  { name: 'PALMERA SIGN', x: 348, z: -40 },
  { name: 'OBSERVATORY', x: 332, z: 150 },
  { name: 'PORT OF PALMERA', x: 40, z: 275 },
  { name: 'LIGHTHOUSE', x: -246, z: 288 },
  { name: "MARLA'S SAFEHOUSE", x: -84, z: -186 },
];

const SHOP_NAMES = ['TOMO NOODLE', 'CAFE SOL', 'PALMERA PAWN', 'VICE VINYL', 'HOTEL COCO', 'SURF & CO', 'BANANA BAR', 'NEON NAILS', 'TACO BRAVO', 'KAYA MART', 'AZUL HOTEL', 'PIER 9'];
let shopIdx = 0;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

function facadeTextures(base, trim) {
  const map = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, 0, w, 10);
    // ground floor: shopfront with awning and a sign band
    g.fillStyle = '#20242e'; g.fillRect(0, h - 52, w, 52);
    g.fillStyle = '#3fd2c0'; g.fillRect(6, h - 46, 34, 30); g.fillRect(48, h - 46, 34, 30); g.fillRect(90, h - 46, 32, 30);
    g.fillStyle = trim; g.fillRect(0, h - 62, w, 12);
    g.fillStyle = '#fff'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center';
    g.fillText(SHOP_NAMES[shopIdx++ % SHOP_NAMES.length], w / 2, h - 53);
    // window grid with frames
    for (let y = 0; y < 9; y++) for (let x = 0; x < 4; x++) {
      const wx = 10 + x * 30, wy = 16 + y * 20;
      g.fillStyle = '#12161f'; g.fillRect(wx - 2, wy - 2, 20, 14);
      g.fillStyle = (x * 7 + y * 3) % 5 === 0 ? '#ffd9a0' : '#5f7d99';
      g.fillRect(wx, wy, 16, 10);
    }
  });
  const win = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 9; y++) for (let x = 0; x < 4; x++) {
      if ((x * 7 + y * 3) % 3 !== 0) continue;
      g.fillStyle = (x + y) % 2 ? '#ffb45c' : '#cfe8ff';
      g.fillRect(10 + x * 30, 16 + y * 20, 16, 10);
    }
  });
  return { map, win };
}

const _mats = {};
function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); (parent || PH3.scene).add(m); return m;
}
function cyl(rt, rb, h, mat, x, y, z, parent, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), mat);
  m.position.set(x, y, z); (parent || PH3.scene).add(m); return m;
}
PH3.box = box; PH3.cyl = cyl;

PH3.buildWorld = function () {
  const scene = PH3.scene;
  const grass = new THREE.MeshLambertMaterial({ color: 0x6f9e4e });
  const sand = new THREE.MeshLambertMaterial({ color: 0xe8cf9a });
  const concrete = new THREE.MeshLambertMaterial({ color: 0x9aa0a4 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4442 });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1700, 1200), grass);
  ground.rotation.x = -Math.PI / 2; ground.position.set(60, -0.05, 0); ground.receiveShadow = true; scene.add(ground);

  // The sea, west of the beach, with the pier reaching into it.
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 1200),
    new THREE.MeshLambertMaterial({ color: 0x17749e, transparent: true, opacity: 0.94 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(-700, 0.12, 0); scene.add(sea);
  PH3.sea = sea;
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(46, 700), sand);
  beach.rotation.x = -Math.PI / 2; beach.position.set(-234, 0.02, 0); beach.receiveShadow = true; scene.add(beach);

  // Hills to the east: three broad rises the sign and observatory sit on.
  const hillMat = new THREE.MeshLambertMaterial({ color: 0x5d8a44 });
  for (const [x, z, r, h] of [[352, -60, 130, 26], [345, 140, 110, 20], [360, 300, 120, 16]]) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 24), hillMat);
    hill.position.set(x, h / 2 - 1, z); scene.add(hill);
  }

  // Roads: asphalt strips with painted dashes, sidewalks, crosswalks.
  const asphalt = new THREE.MeshLambertMaterial({ color: 0x33373d });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
  const walkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const x of PH3.ROADS_V) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(PH3.ROAD_W, 560), asphalt);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.06, -10); r.receiveShadow = true; scene.add(r);
    for (const sx of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 560), concrete);
      sw.rotation.x = -Math.PI / 2; sw.position.set(x + sx * (PH3.ROAD_W / 2 + 1.7), 0.09, -10); scene.add(sw);
    }
    for (let z = -275; z < 265; z += 18) box(0.5, 0.04, 7, dashMat, x, 0.1, z, scene);
  }
  for (const z of PH3.ROADS_H) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(500, PH3.ROAD_W), asphalt);
    r.rotation.x = -Math.PI / 2; r.position.set(35, 0.055, z); r.receiveShadow = true; scene.add(r);
    for (const sz of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(500, 3.4), concrete);
      sw.rotation.x = -Math.PI / 2; sw.position.set(35, 0.085, z + sz * (PH3.ROAD_W / 2 + 1.7)); scene.add(sw);
    }
    for (let x = -180; x < 250; x += 18) box(7, 0.04, 0.5, dashMat, x, 0.1, z, scene);
    for (const x of PH3.ROADS_V) for (let s = -3; s <= 3; s++) if (s !== 0)
      box(0.9, 0.04, 2.6, walkMat, x + s * 2.1, 0.1, z - 6.8, scene);
  }

  buildBuildings(roofMat);
  buildPalmsAndProps();
  buildPier();
  buildSignAndObservatory();
  buildPort();
  buildBeachGym();
};

function buildBuildings(roofMat) {
  const scene = PH3.scene;
  const palettes = [['#e8d8b8', '#ff5f6d'], ['#f2a65a', '#2076b8'], ['#e88bb0', '#2ec4b6'], ['#cfd8dc', '#b83a8c'], ['#f7e8c9', '#e4572e'], ['#a8d8ea', '#274690']];
  const variants = palettes.map(([b, t]) => {
    const { map, win } = facadeTextures(b, t);
    const m = new THREE.MeshLambertMaterial({ map, emissive: 0xffc27a, emissiveMap: win, emissiveIntensity: 0 });
    PH3.litMats.push(m); return m;
  });
  const xs = [-238, ...PH3.ROADS_V, 292], zs = [-282, ...PH3.ROADS_H, 252];
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
    const bw = xs[i + 1] - xs[i] - PH3.ROAD_W - 8, bd = zs[j + 1] - zs[j] - PH3.ROAD_W - 8;
    if (bw < 22 || bd < 22) continue;
    if ((i * 5 + j * 3) % 11 === 4) continue; // a few open plazas
    if (cz > 225) continue;                    // the port takes the south
    const n = 1 + ((i + j) % 2);
    for (let k = 0; k < n; k++) {
      const w = bw / n - 5, d = bd - 6, h = 14 + ((i * 13 + j * 7 + k * 29) % 34);
      const x = cx - bw / 2 + (k + 0.5) * (bw / n), z = cz;
      const mat = variants[(i * 3 + j + k) % variants.length];
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        [mat, mat, roofMat, roofMat, mat, mat]);
      b.position.set(x, h / 2, z); b.castShadow = true; b.receiveShadow = true; scene.add(b);
      PH3.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      // rooftop props: water tank, AC boxes, a helipad on the tall ones
      if (h > 30) {
        cyl(2.2, 2.2, 3.4, new THREE.MeshLambertMaterial({ color: 0x8a5a34 }), x + w / 4, h + 1.7, z, scene);
        const pad = cyl(6, 6, 0.3, new THREE.MeshLambertMaterial({ color: 0x2c2f36 }), x - w / 4, h + 0.15, z, scene);
        pad.scale.z = 1;
      } else {
        box(3, 1.4, 2.4, roofMat, x + w / 5, h + 0.7, z + d / 5, scene);
      }
      // awning over the shopfront
      const awn = box(w * 0.7, 0.25, 2.6, new THREE.MeshLambertMaterial({ color: 0xe4572e }), x, 3.4, z - d / 2 - 1.1, scene);
      awn.rotation.x = 0.35;
    }
  }
}

function buildPalmsAndProps() {
  const scene = PH3.scene;
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6844 });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2e9e4f, side: THREE.DoubleSide });
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 6.4, 6);
  const frondGeo = new THREE.ConeGeometry(0.5, 4.6, 4);
  function palm(x, z, lean) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.z = lean || 0;
    const t = new THREE.Mesh(trunkGeo, trunkMat); t.position.y = 3.2; t.castShadow = true; g.add(t);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(frondGeo, frondMat);
      f.position.y = 6.6; f.rotation.z = 1.15; f.rotation.y = i * Math.PI / 3;
      f.translateY(1.6); g.add(f);
    }
    scene.add(g);
  }
  for (let z = -260; z < 270; z += 26) { palm(-214, z, 0.06); palm(-178, z + 12, -0.05); }
  for (let x = -180; x < 260; x += 55) palm(x, 224, 0.03);

  // Streetlights with halos that wake up at night.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0 });
  const glowTex = (() => { const t = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,220,150,0.9)'); gr.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }); return t; })();
  PH3.lampGlowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false });
  function lamp(x, z) {
    cyl(0.09, 0.12, 5.6, poleMat, x, 2.8, z, scene, 6);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), bulbMat); b.position.set(x, 5.7, z); scene.add(b);
    const s = new THREE.Sprite(PH3.lampGlowMat); s.position.set(x, 5.7, z); s.scale.set(4.4, 4.4, 1); scene.add(s);
  }
  for (const x of PH3.ROADS_V) for (let z = -260; z < 260; z += 52) lamp(x + 9.6, z);
  for (const z of PH3.ROADS_H) for (let x = -180; x < 250; x += 64) lamp(x, z + 9.6);

  // Traffic lights at the big intersections.
  PH3.trafficMats = { r: new THREE.MeshBasicMaterial({ color: 0x551111 }), g: new THREE.MeshBasicMaterial({ color: 0x115511 }) };
  for (const x of [-110, 70, 160]) for (const z of [-60, 120]) {
    cyl(0.08, 0.1, 4.4, poleMat, x + 10, 2.2, z + 10, scene, 6);
    const head = box(0.7, 1.7, 0.7, poleMat, x + 10, 4.9, z + 10, scene);
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), PH3.trafficMats.r); r.position.set(x + 10, 5.45, z + 9.6); scene.add(r);
    const g2 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), PH3.trafficMats.g); g2.position.set(x + 10, 4.55, z + 9.6); scene.add(g2);
  }

  // Benches, bins, hydrants, news boxes, market stalls on the beachfront.
  const benchMat = new THREE.MeshLambertMaterial({ color: 0x7a4a26 });
  const binMat = new THREE.MeshLambertMaterial({ color: 0x2e7d4f });
  for (let z = -240; z < 250; z += 44) {
    box(2.2, 0.5, 0.6, benchMat, -186, 0.5, z, scene);
    cyl(0.4, 0.4, 0.9, binMat, -207, 0.45, z + 8, scene, 8);
    box(0.8, 1.1, 0.6, new THREE.MeshLambertMaterial({ color: 0xc23b2e }), -176, 0.55, z + 20, scene);
  }
  const stallCols = [0xff5f6d, 0x2ec4b6, 0xffb347, 0xb83a8c];
  for (let i = 0; i < 6; i++) {
    const z = -140 + i * 34, x = -222;
    box(3.4, 1.1, 2, benchMat, x, 0.55, z, scene);
    const canopy = box(3.8, 0.15, 2.6, new THREE.MeshLambertMaterial({ color: stallCols[i % 4] }), x, 2.3, z, scene);
    canopy.rotation.z = 0.08;
    for (const dx of [-1.6, 1.6]) cyl(0.06, 0.06, 2.3, benchMat, x + dx, 1.15, z, scene, 6);
  }
}

function buildPier() {
  const scene = PH3.scene;
  const deckMat = new THREE.MeshLambertMaterial({ color: 0xa9743f });
  const deck = box(130, 0.8, 20, deckMat, -282, 2.6, 30, scene);
  deck.receiveShadow = true;
  for (let x = -222; x > -345; x -= 14) for (const dz of [-8, 8])
    cyl(0.35, 0.35, 3.4, deckMat, x, 0.8, 30 + dz, scene, 6);
  for (let x = -222; x > -345; x -= 10) {
    box(0.18, 1, 0.18, deckMat, x, 3.5, 20.6, scene); box(0.18, 1, 0.18, deckMat, x, 3.5, 39.4, scene);
  }
  box(118, 0.14, 0.14, deckMat, -282, 3.95, 20.6, scene); box(118, 0.14, 0.14, deckMat, -282, 3.95, 39.4, scene);
  // pier lamps so the boardwalk glows after dark
  const lampPole = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  for (let x = -232; x > -338; x -= 21) {
    cyl(0.07, 0.09, 3.6, lampPole, x, 4.8, 21.5, scene, 6);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe9b0 }));
    bulb.position.set(x, 6.7, 21.5); scene.add(bulb);
    if (PH3.lampGlowMat) {
      const s = new THREE.Sprite(PH3.lampGlowMat);
      s.position.set(x, 6.7, 21.5); s.scale.set(4, 4, 1); scene.add(s);
    }
  }
  // Pier sign
  const signTex = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#7a1f3d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffe9b0'; g.font = '900 34px sans-serif'; g.textAlign = 'center';
    g.fillText('PALMERA PIER', w / 2, 43);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(17, 4.2), new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }));
  sign.position.set(-222, 6.4, 30); sign.rotation.y = Math.PI / 2; scene.add(sign);

  // The ferris wheel: rim, spokes, glowing bulbs and cabins, turning slowly.
  const wheel = new THREE.Group(); wheel.position.set(-322, 15, 30); scene.add(wheel);
  PH3.ferris = wheel;
  const rimMat = new THREE.MeshLambertMaterial({ color: 0xe8ecff });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(13, 0.35, 8, 40), rimMat); wheel.add(rim);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd23e });
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6), bulbMat);
    b.position.set(Math.cos(a) * 13, Math.sin(a) * 13, 0); wheel.add(b);
    const spoke = cyl(0.07, 0.07, 13, rimMat, Math.cos(a) * 6.5, Math.sin(a) * 6.5, 0, wheel, 5);
    spoke.rotation.z = a - Math.PI / 2;
  }
  const cabinCols = [0xff5f6d, 0x2ec4b6, 0xffb347, 0xb83a8c, 0x2076b8, 0x37d67a, 0xffe9b0, 0xff7a2e];
  PH3.ferrisCabins = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const cab = box(2.2, 2, 2, new THREE.MeshLambertMaterial({ color: cabinCols[i] }), Math.cos(a) * 13, Math.sin(a) * 13, 0, wheel);
    PH3.ferrisCabins.push(cab);
  }
  for (const dz of [-3, 3]) {
    const leg = cyl(0.4, 0.5, 16, rimMat, -322, 7, 30 + dz, scene, 8); leg.rotation.x = dz > 0 ? 0.18 : -0.18;
  }

  // The coaster: a looping track silhouette along the pier's south side.
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, x = -238 - t * 96;
    pts.push(new THREE.Vector3(x, 5 + Math.sin(t * Math.PI * 3) * 3.4 + t * 2, 47));
  }
  const track = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.28, 6),
    new THREE.MeshLambertMaterial({ color: 0xc23b2e }));
  scene.add(track);
  for (let x = -240; x > -332; x -= 12) cyl(0.22, 0.22, 6, rimMat, x, 3, 47, scene, 6);
}

function buildSignAndObservatory() {
  const scene = PH3.scene;
  // PALMERA in tall white letters on the hillside, facing the city.
  const letters = 'PALMERA';
  for (let i = 0; i < letters.length; i++) {
    const tex = canvasTex(64, 96, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = '#f5f2e8';
      g.font = '900 84px sans-serif'; g.textAlign = 'center'; g.fillText(letters[i], w / 2, 76);
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 8),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    p.position.set(330, 27.5, -72 + i * 9.4); p.rotation.y = -Math.PI / 2; scene.add(p);
  }
  // Observatory: tower + dome on the eastern hill.
  const stone = new THREE.MeshLambertMaterial({ color: 0xd8d3c8 });
  cyl(6, 7, 10, stone, 332, 19, 150, scene, 14);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x9fb6c9 }));
  dome.position.set(332, 24, 150); scene.add(dome);
  box(1.2, 1, 5, new THREE.MeshLambertMaterial({ color: 0x2c2f36 }), 332, 26.5, 150, scene);
}

function buildPort() {
  const scene = PH3.scene;
  const contCols = [0xc23b2e, 0x2076b8, 0x37a24a, 0xe08a2e, 0x707880];
  for (let i = 0; i < 26; i++) {
    const x = -140 + (i % 7) * 46, z = 252 + Math.floor(i / 7) * 17;
    box(11, 3.4, 4.6, new THREE.MeshLambertMaterial({ color: contCols[i % 5] }), x, 1.7 + (i % 3 === 0 ? 3.4 : 0), z, scene);
  }
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xe0a52e });
  for (const x of [-80, 60]) {
    box(2, 26, 2, craneMat, x, 13, 268, scene); box(2, 26, 2, craneMat, x + 14, 13, 268, scene);
    box(34, 2.4, 2.4, craneMat, x + 2, 26, 268, scene);
    box(1, 10, 1, craneMat, x - 6, 20, 268, scene);
  }
  // Warehouse row
  for (let i = 0; i < 4; i++)
    box(30, 9, 16, new THREE.MeshLambertMaterial({ color: 0x8b93a0 }), -120 + i * 62, 4.5, 296, scene);
  // Lighthouse on its jetty, with a beam that sweeps at night.
  const lhTex = canvasTex(64, 128, (g, w, h) => {
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#f2f2f2' : '#c23b2e'; g.fillRect(0, i * h / 6, w, h / 6); }
  });
  cyl(2.4, 3.4, 17, new THREE.MeshLambertMaterial({ map: lhTex }), -246, 8.5, 288, scene, 12);
  const lampRoom = cyl(1.7, 1.7, 2.6, new THREE.MeshBasicMaterial({ color: 0xffe9b0 }), -246, 18.2, 288, scene, 10);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(4.5, 34, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  beam.rotation.z = Math.PI / 2; beam.position.set(-246 - 16, 18.2, 288); scene.add(beam);
  PH3.lighthouseBeam = beam;
  box(8, 1, 26, new THREE.MeshLambertMaterial({ color: 0x9aa0a4 }), -246, 0.4, 272, scene);
}

function buildBeachGym() {
  const scene = PH3.scene;
  const mat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  box(16, 0.3, 10, new THREE.MeshLambertMaterial({ color: 0xd8c491 }), -228, 0.15, -118, scene);
  for (const dx of [-6, 6]) { cyl(0.12, 0.12, 2.6, mat, -228 + dx, 1.3, -121, scene, 6); }
  box(13, 0.14, 0.14, mat, -228, 2.6, -121, scene);
  for (let i = 0; i < 5; i++) {
    const w = cyl(0.55, 0.55, 0.3, mat, -234 + i * 3, 0.4, -114, scene, 12); w.rotation.x = Math.PI / 2;
    box(1.8, 0.5, 0.5, mat, -234 + i * 3, 0.35, -117.5, scene);
  }
  const signTex = canvasTex(256, 48, (g, w, h) => {
    g.fillStyle = '#243b6b'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffe9b0';
    g.font = '900 28px sans-serif'; g.textAlign = 'center'; g.fillText('MUSCLE SANDS GYM', w / 2, 33);
  });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(11, 2), new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }));
  s.position.set(-228, 3.4, -124); scene.add(s);
}

PH3.districtAt = function (x, z) {
  if (x < -186) return 'BEACHFRONT · Palmera Pier';
  if (z > 224) return 'PORT OF PALMERA · Dockside';
  if (x > 282) return 'THE HILLS · Observatory Rd';
  if (z < -180) return 'OLD TOWN · Marla’s Block';
  return 'DOWNTOWN · Sol Avenue';
};

PH3.updateWorld = function (dt) {
  if (PH3.ferris) {
    PH3.ferris.rotation.z += dt * 0.12;
    for (const cab of PH3.ferrisCabins) cab.rotation.z = -PH3.ferris.rotation.z;
  }
  if (PH3.sea) PH3.sea.position.y = 0.12 + Math.sin(performance.now() * 0.0006) * 0.05;
  const dark = PH3.skyState.darkness;
  for (const m of PH3.litMats) m.emissiveIntensity = dark * 0.95;
  if (PH3.lampGlowMat) PH3.lampGlowMat.opacity = dark * 0.85;
  if (PH3.lighthouseBeam) {
    PH3.lighthouseBeam.material.opacity = dark * 0.30;
    PH3.lighthouseBeam.rotation.y += dt * 0.7;
  }
  if (PH3.trafficMats) {
    const green = Math.floor(performance.now() / 4000) % 2 === 0;
    PH3.trafficMats.g.color.setHex(green ? 0x2eff6a : 0x115511);
    PH3.trafficMats.r.color.setHex(green ? 0x551111 : 0xff2e2e);
  }
};

// Resolve a point out of every building collider (circle vs AABB push-out).
PH3.collide = function (pos, radius) {
  for (const c of PH3.colliders) {
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx, dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) { const d = Math.sqrt(d2); pos.x = nx + dx / d * radius; pos.z = nz + dz / d * radius; }
      else pos.x = c.maxX + radius;
    }
  }
  pos.x = Math.max(-344, Math.min(336, pos.x));
  pos.z = Math.max(-292, Math.min(308, pos.z));
};
