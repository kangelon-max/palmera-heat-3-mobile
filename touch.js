// Palmera Heat III — phone touch controls (personal-play copy only).
// The game reads window keydown/keyup (e.code) and canvas mousedown,
// so these controls simply dispatch the same events a keyboard/mouse would.
(function () {
  if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;

  var css = document.createElement('style');
  css.textContent =
    'html,body{touch-action:none;overscroll-behavior:none}' +
    '#tc{position:fixed;inset:0;pointer-events:none;z-index:60;font-family:inherit}' +
    '#tc .joy{position:absolute;left:18px;bottom:86px;width:128px;height:128px;border-radius:50%;' +
    'background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.20),rgba(20,16,10,.38) 70%);' +
    'border:2px solid rgba(255,210,130,.55);pointer-events:auto}' +
    '#tc .nub{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;' +
    'background:radial-gradient(circle at 50% 35%,#ffe9bd,#e8a33d 75%);box-shadow:0 4px 14px rgba(0,0,0,.45)}' +
    '#tc .pad{position:absolute;right:14px;bottom:80px;display:grid;grid-template-columns:repeat(3,58px);gap:10px;pointer-events:auto}' +
    '#tc button{width:58px;height:58px;border-radius:50%;border:2px solid rgba(255,210,130,.55);' +
    'background:radial-gradient(circle at 50% 32%,rgba(255,255,255,.22),rgba(20,16,10,.55) 72%);' +
    'color:#ffe9bd;font-size:11px;font-weight:800;letter-spacing:.4px;text-shadow:0 1px 3px #000}' +
    '#tc button.on{background:radial-gradient(circle at 50% 32%,#ffe9bd,#e8a33d 78%);color:#3a2405}' +
    '#tc .row{position:absolute;right:14px;bottom:224px;display:flex;gap:8px;pointer-events:auto}' +
    '#tc .row button{width:44px;height:44px;font-size:13px}';
  document.head.appendChild(css);

  var root = document.createElement('div');
  root.id = 'tc';
  root.innerHTML =
    '<div class="joy" id="tcJoy"><div class="nub" id="tcNub"></div></div>' +
    '<div class="row">' +
    '<button data-k="Digit1">1</button><button data-k="Digit2">2</button>' +
    '<button data-k="Digit3">3</button><button data-k="Digit4">4</button></div>' +
    '<div class="pad">' +
    '<button data-k="KeyM">MAP</button><button data-k="KeyL">TIME</button><button data-k="KeyG">DECOY</button>' +
    '<button data-k="KeyF">CAR</button><button id="tcFire">FIRE</button><button data-k="KeyT">SAHUR</button></div>';
  document.body.appendChild(root);

  function key(code, down) {
    document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup',
      { code: code, key: code, bubbles: true, cancelable: true }));
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup',
      { code: code, key: code, bubbles: true, cancelable: true }));
  }
  function tap(code) { key(code, true); setTimeout(function () { key(code, false); }, 90); }

  // Buttons: momentary keys + fire.
  Array.prototype.forEach.call(root.querySelectorAll('button[data-k]'), function (b) {
    b.addEventListener('touchstart', function (e) {
      e.preventDefault(); b.classList.add('on'); tap(b.getAttribute('data-k'));
      setTimeout(function () { b.classList.remove('on'); }, 140);
    }, { passive: false });
  });
  var fire = document.getElementById('tcFire');
  function fireEvt(type) {
    var c = document.querySelector('canvas');
    if (c) c.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
  }
  fire.addEventListener('touchstart', function (e) {
    e.preventDefault(); fire.classList.add('on'); fireEvt('mousedown');
  }, { passive: false });
  fire.addEventListener('touchend', function (e) {
    e.preventDefault(); fire.classList.remove('on'); fireEvt('mouseup');
  }, { passive: false });

  // Joystick -> WASD.
  var joy = document.getElementById('tcJoy'), nub = document.getElementById('tcNub');
  var held = {}, joyId = null;
  function setDir(code, on) {
    if (on && !held[code]) { held[code] = 1; key(code, true); }
    if (!on && held[code]) { delete held[code]; key(code, false); }
  }
  function joyMove(t) {
    var r = joy.getBoundingClientRect();
    var dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
    var max = r.width / 2 - 8, d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    nub.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    var dead = 14;
    setDir('KeyW', dy < -dead); setDir('KeyS', dy > dead);
    setDir('KeyA', dx < -dead); setDir('KeyD', dx > dead);
  }
  function joyEnd() {
    joyId = null; nub.style.transform = '';
    ['KeyW', 'KeyA', 'KeyS', 'KeyD'].forEach(function (c) { setDir(c, false); });
  }
  joy.addEventListener('touchstart', function (e) {
    e.preventDefault(); var t = e.changedTouches[0]; joyId = t.identifier; joyMove(t);
  }, { passive: false });
  joy.addEventListener('touchmove', function (e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++)
      if (e.changedTouches[i].identifier === joyId) joyMove(e.changedTouches[i]);
  }, { passive: false });
  joy.addEventListener('touchend', function (e) { e.preventDefault(); joyEnd(); }, { passive: false });
  joy.addEventListener('touchcancel', joyEnd);
})();
