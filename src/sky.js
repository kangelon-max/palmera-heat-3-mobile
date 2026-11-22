// sky.js — Palmera Bay's sky: a full day cycle with a travelling sun and moon,
// layered drifting clouds, stars, and lighting that follows the hour.
// The cycle runs on its own (a full day in four minutes) and the L key jumps
// between the four signature looks: morning gold, noon blue, orange sunset,
// deep night. Sun and moon positions drive the directional light, the fog,
// the cloud tint and every lamp in the city.
window.PH3 = window.PH3 || {};

PH3.DAY_LENGTH = 240; // seconds per full in-game day
PH3.timeHours = 17.4; // the game opens in golden afternoon

// Keyframed looks: [hour, skyTop, skyBottom, fog, sunColour, sunPower, ambient]
PH3.SKY_KEYS = [
  [0.0,  0x060a24, 0x101a3a, 0x0a1026, 0x8fb4ff, 0.12, 0.32],
  [5.5,  0x1a2450, 0x3a3a66, 0x1a2040, 0xaFC4ff, 0.20, 0.36],
  [7.0,  0x5f8fce, 0xffd9a0, 0xd9c9a8, 0xffd9a3, 0.85, 0.55],
  [12.0, 0x2f7fe0, 0xbfe6ff, 0xcfe4ee, 0xfff3d6, 1.25, 0.72],
  [16.5, 0x3a6fd8, 0xffe3b0, 0xe8d3ac, 0xffe0ae, 1.05, 0.62],
  [18.2, 0x35479e, 0xff8a3d, 0xdd9a68, 0xff9448, 0.80, 0.52],
  [19.6, 0x141c4e, 0xd95f43, 0x4a3050, 0xff7a50, 0.30, 0.40],
  [21.0, 0x060a24, 0x101a3a, 0x0a1026, 0x8fb4ff, 0.12, 0.32],
  [24.0, 0x060a24, 0x101a3a, 0x0a1026, 0x8fb4ff, 0.12, 0.32],
];

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColour(c1, c2, t, out) { return out.setHex(c1).lerp(new THREE.Color(c2), t); }

PH3.skyState = { darkness: 0, sunsetness: 0, sunElev: 1 };

function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = 30 + Math.random() * 196, y = 44 + Math.random() * 40, r = 16 + Math.random() * 30;
    const grad = g.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c); return t;
}

function moonTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(108, 100, 20, 128, 128, 128);
  grad.addColorStop(0, '#fdfdf4'); grad.addColorStop(0.85, '#dfe3da'); grad.addColorStop(1, '#c9cec2');
  g.fillStyle = grad; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.fillStyle = 'rgba(160,166,155,0.5)';
  const craters = [[80, 80, 20], [170, 70, 13], [150, 160, 24], [70, 170, 11], [200, 130, 9], [110, 120, 8], [185, 195, 14]];
  for (const [x, y, r] of craters) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(140,146,135,0.35)';
  for (const [x, y, r] of craters) { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }
  return new THREE.CanvasTexture(c);
}

PH3.buildSky = function (scene) {
  const sky = {};
  PH3.sky = sky;

  // Gradient dome driven by two uniforms, so the whole sky can melt from
  // noon blue to sunset orange to night without swapping materials.
  sky.domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x35479e) }, bottom: { value: new THREE.Color(0xff8a3d) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP;' +
      'void main(){ float h = clamp(normalize(vP).y * 1.6 + 0.18, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.8)), 1.0); }',
  });
  sky.dome = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 14), sky.domeMat);
  scene.add(sky.dome);

  sky.sunLight = new THREE.DirectionalLight(0xffe0ae, 1.0);
  sky.sunLight.castShadow = true;
  sky.sunLight.shadow.mapSize.set(2048, 2048);
  sky.sunLight.shadow.camera.left = -190; sky.sunLight.shadow.camera.right = 190;
  sky.sunLight.shadow.camera.top = 190; sky.sunLight.shadow.camera.bottom = -190;
  sky.sunLight.shadow.camera.far = 1600;
  scene.add(sky.sunLight); scene.add(sky.sunLight.target);
  sky.hemi = new THREE.HemisphereLight(0xbfe0ff, 0x8a6a4a, 0.55);
  scene.add(sky.hemi);

  // The sun: a bright disc with a soft halo sprite.
  const glowTex = cloudTexture();
  sky.sun = new THREE.Mesh(new THREE.CircleGeometry(46, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false }));
  sky.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffc46b, transparent: true, opacity: 0.95, fog: false, depthWrite: false }));
  sky.sunGlow.scale.set(420, 210, 1);
  scene.add(sky.sun); scene.add(sky.sunGlow);

  // The moon: big, cratered, with its own cool halo.
  sky.moon = new THREE.Mesh(new THREE.CircleGeometry(40, 32),
    new THREE.MeshBasicMaterial({ map: moonTexture(), fog: false }));
  sky.moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xaFC8ff, transparent: true, opacity: 0.5, fog: false, depthWrite: false }));
  sky.moonGlow.scale.set(300, 150, 1);
  scene.add(sky.moon); scene.add(sky.moonGlow);

  // Stars: a fixed shell of points that fades in with the dark.
  const starGeo = new THREE.BufferGeometry();
  const pos = [];
  for (let i = 0; i < 900; i++) {
    const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.48 + 0.05, r = 1400;
    pos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sky.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0 }));
  scene.add(sky.stars);

  // Clouds: two drifting layers of soft billboards at different heights.
  const tex = cloudTexture();
  sky.clouds = [];
  sky.cloudMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false });
  for (let i = 0; i < 46; i++) {
    const s = new THREE.Sprite(sky.cloudMat);
    const layer = i % 2;
    s.position.set((Math.random() - 0.5) * 1900, 190 + layer * 90 + Math.random() * 50, (Math.random() - 0.5) * 1900);
    const w = 190 + Math.random() * 260;
    s.scale.set(w, w * 0.36, 1);
    s.userData.speed = 1.1 + Math.random() * 1.6;
    scene.add(s); sky.clouds.push(s);
  }
  return sky;
};

function skyKeysAt(h) {
  const K = PH3.SKY_KEYS;
  for (let i = 0; i < K.length - 1; i++) {
    if (h >= K[i][0] && h <= K[i + 1][0]) {
      const t = (h - K[i][0]) / (K[i + 1][0] - K[i][0] || 1);
      return { a: K[i], b: K[i + 1], t };
    }
  }
  return { a: K[0], b: K[1], t: 0 };
}

const _c1 = new THREE.Color(), _c2 = new THREE.Color();
PH3.updateSky = function (dt) {
  const sky = PH3.sky, scene = PH3.scene;
  const h = PH3.timeHours;
  const { a, b, t } = skyKeysAt(h);

  lerpColour(a[1], b[1], t, _c1); sky.domeMat.uniforms.top.value.copy(_c1);
  lerpColour(a[2], b[2], t, _c1); sky.domeMat.uniforms.bottom.value.copy(_c1);
  lerpColour(a[3], b[3], t, _c1); scene.fog.color.copy(_c1);
  sky.dome.position.copy(PH3.camera.position);

  // Sun path: rises east, crosses overhead, sets west into the sea.
  const dayT = (h - 6) / 12;                        // unwrapped: past 18:00 the angle runs on and the sun sits below the horizon
  const sunAng = dayT * Math.PI;
  const sunDir = new THREE.Vector3(Math.cos(sunAng) * 0.85, Math.sin(sunAng), -0.30).normalize();
  const sunUp = sunDir.y > -0.06;
  // Moon path: the night shift, 18:00 -> 06:00.
  const nightT = (((h - 18) + 24) % 24) / 12;
  const moonAng = nightT * Math.PI;
  const moonDir = new THREE.Vector3(Math.cos(moonAng) * 0.8, Math.sin(moonAng) * 0.9 + 0.04, -0.42).normalize();
  const moonUp = h >= 18 || h < 6;

  const cam = PH3.camera.position;
  sky.sun.position.copy(cam).addScaledVector(sunDir, 1350);
  sky.sun.lookAt(cam);
  sky.sunGlow.position.copy(sky.sun.position);
  sky.moon.position.copy(cam).addScaledVector(moonDir, 1330);
  sky.moon.lookAt(cam);
  sky.moonGlow.position.copy(sky.moon.position);
  sky.sun.visible = sunUp; sky.sunGlow.visible = sunUp;
  sky.moon.visible = moonUp; sky.moonGlow.visible = moonUp;

  // The light follows whichever body is up; the moon gives a cool wash.
  const focus = PH3.focusPoint || cam;
  if (sunUp) {
    sky.sunLight.position.copy(focus).addScaledVector(sunDir, 500);
    lerpColour(a[4], b[4], t, _c1); sky.sunLight.color.copy(_c1);
    sky.sunLight.intensity = lerp(a[5], b[5], t) * Math.max(0.25, Math.min(1, sunDir.y * 2.4 + 0.35));
  } else {
    sky.sunLight.position.copy(focus).addScaledVector(moonDir, 500);
    sky.sunLight.color.setHex(0x8fb4ff);
    sky.sunLight.intensity = 0.22;
  }
  sky.sunLight.target.position.copy(focus);
  sky.hemi.intensity = lerp(a[6], b[6], t);

  const darkness = THREE.MathUtils.clamp(1 - (sunDir.y * 2.2 + 0.55), 0, 1);
  PH3.skyState.darkness = darkness;
  PH3.skyState.sunElev = sunDir.y;
  PH3.skyState.sunsetness = THREE.MathUtils.clamp(1 - Math.abs(sunDir.y - 0.12) * 3.4, 0, 1) * (h > 12 ? 1 : 0.4);
  sky.stars.material.opacity = darkness * 0.95;
  sky.stars.position.copy(cam);

  // Clouds drift and take the sun's colour: white, then orange-pink, then slate.
  lerpColour(0xffffff, 0xff9a5c, PH3.skyState.sunsetness, _c1);
  lerpColour(_c1.getHex(), 0x2c3550, darkness, _c2);
  sky.cloudMat.color.copy(_c2);
  sky.cloudMat.opacity = 0.85 - darkness * 0.3;
  for (const s of sky.clouds) {
    s.position.x += s.userData.speed * dt;
    if (s.position.x > 1050) s.position.x = -1050;
  }
  // The sun disc flushes deep orange as it touches the sea.
  sky.sun.material.color.setHex(0xfff2c0).lerp(new THREE.Color(0xff7a2e), PH3.skyState.sunsetness);
};

PH3.phaseName = function () {
  const h = PH3.timeHours;
  if (h < 5.5) return 'DEEP NIGHT';
  if (h < 9) return 'MORNING GOLD';
  if (h < 15.5) return 'PALMERA NOON';
  if (h < 19.4) return 'GOLDEN HOUR';
  if (h < 21) return 'DUSK EMBERS';
  return 'PALMERA NIGHT';
};

PH3.cyclePhase = function () {
  const stops = [7.2, 12.2, 17.7, 23.2];
  for (const s of stops) if (PH3.timeHours < s - 0.05) { PH3.timeHours = s; return; }
  PH3.timeHours = stops[0];
};
