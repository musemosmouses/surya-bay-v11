// Surya Bay core: seeded RNG, shared game state, input, save/load, camera rig.
// Everything else hangs off the single global SB object.
(function () {
  'use strict';
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }

  const params = new URLSearchParams(location.search);
  const seed = parseInt(params.get('seed') || '7', 10) || 7;
  const shot = params.get('shot') || '';

  const SB = {
    seed, shot, rng: mulberry(seed),
    THREE: window.THREE,
    citySize: 560,          // city spans -280..280; sea starts past z = 300
    seaZ: 300, beachZ: 262,
    time: 0, paused: false, started: false, muted: false,
    money: 250, hp: 100, armor: 0, wanted: 0, wantedHeat: 0,
    rankIdx: 0, ranks: ['COURIER', 'RUNNER', 'FIXER', 'KING'],
    rankMoney: [0, 800, 2500, 6000],
    weapon: 'pistol', weapons: { pistol: { name: 'PISTOL', ammo: Infinity, owned: true }, shotgun: { name: 'SHOTGUN', ammo: 24, owned: true } },
    keys: {}, mouseDX: 0, mouseDY: 0, camYaw: 0.6, camPitch: 0.32, camDist: 9,
    player: null, vehicle: null, boat: null,
    traffic: [], peds: [], cops: [], marine: [], boats: [], cars: [],
    missionIdx: -1, mission: null, missionStep: 0, raceActive: false,
    weather: 'CLEAR', weatherT: 0, tideT: 0, tide: 0, // tide 0..1
    kills: 0, deliveries: 0, racesWon: 0,
    crew: [
      { id: 'mara', name: 'MARA', face: '👩', text: 'Scout', desc: 'Police blips show 2× range on minimap', on: true },
      { id: 'biko', name: 'BIKO', face: '🧔', text: 'Mechanic', desc: 'Cars repair slowly; stall immune in floods', on: true },
      { id: 'lena', name: 'LENA', face: '👱‍♀️', text: 'Fixer', desc: 'Wanted decays 2× faster when hidden', on: true },
    ],
    radioLines: [
      'SURYA FM: golden hour over the bay, drive safe out there.',
      'SURYA FM: harbor ferry delayed — tide running high tonight.',
      'DJ NARA: request line open, Surya. Who is cruising the strip?',
      'SURYA FM: police scanner says the strip is hot. Keep it clean.',
      'DJ NARA: sunset sprint sign-ups at the pier. Bring a fast car.',
    ],
    radioIdx: 0,
    saveKey: 'suryabay-v11-save',
  };
  window.SB = SB;
  SB.utils = { mulberry, pick, clamp, lerp, dist2 };

  // ---- input ----
  addEventListener('keydown', (e) => {
    SB.keys[e.code] = true;
    if (e.code === 'KeyQ') SB.playerApi && SB.playerApi.swapWeapon();
    if (e.code === 'KeyR') SB.hudApi && SB.hudApi.nextRadio();
    if (e.code === 'KeyM') { SB.muted = !SB.muted; SB.audioApi && SB.audioApi.setMuted(SB.muted); }
    if (e.code === 'KeyP' || e.code === 'Escape') SB.bootApi && SB.bootApi.togglePause();
    if (e.code === 'Digit1') SB.playerApi && SB.playerApi.selectSlot(0);
    if (e.code === 'Digit2') SB.playerApi && SB.playerApi.selectSlot(1);
    if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { SB.keys[e.code] = false; });
  addEventListener('mousemove', (e) => {
    if (!SB.started || SB.paused) return;
    SB.mouseDX += e.movementX || 0; SB.mouseDY += e.movementY || 0;
  });
  addEventListener('mousedown', (e) => {
    if (!SB.started || SB.paused || e.button !== 0) return;
    SB.playerApi && SB.playerApi.fire();
  });
  document.addEventListener('pointerlockchange', () => {
    SB.locked = document.pointerLockElement === document.getElementById('c');
  });

  // ---- save / load ----
  SB.saveGame = function () {
    try {
      const s = { money: SB.money, hp: SB.hp, armor: SB.armor, rankIdx: SB.rankIdx, missionIdx: SB.missionIdx, deliveries: SB.deliveries, racesWon: SB.racesWon, kills: SB.kills, x: SB.player ? SB.player.position.x : 0, z: SB.player ? SB.player.position.z : 0 };
      localStorage.setItem(SB.saveKey, JSON.stringify(s));
      return true;
    } catch (e) { return false; }
  };
  SB.loadGame = function () {
    try {
      const raw = localStorage.getItem(SB.saveKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  };
  SB.addMoney = function (n) {
    SB.money += n;
    while (SB.rankIdx < 3 && SB.money >= SB.rankMoney[SB.rankIdx + 1]) {
      SB.rankIdx++;
      SB.hudApi && SB.hudApi.toast('🏆 RANK UP — ' + SB.ranks[SB.rankIdx]);
      SB.audioApi && SB.audioApi.rankUp();
    }
  };
  SB.addWanted = function (n) {
    SB.wanted = clamp(SB.wanted + n, 0, 5);
    SB.wantedHeat = 100;
  };

  // ---- camera rig ----
  SB.updateCamera = function (dt) {
    const cam = SB.camera;
    SB.camYaw -= SB.mouseDX * 0.0032;
    SB.camPitch = clamp(SB.camPitch + SB.mouseDY * 0.0024, -0.15, 1.1);
    SB.mouseDX = 0; SB.mouseDY = 0;
    let tx, ty, tz;
    if (SB.vehicle) { tx = SB.vehicle.position.x; ty = 2.2; tz = SB.vehicle.position.z; }
    else if (SB.boat) { tx = SB.boat.position.x; ty = 2.0; tz = SB.boat.position.z; }
    else if (SB.player) { tx = SB.player.position.x; ty = 2.0; tz = SB.player.position.z; }
    else { tx = 0; ty = 2; tz = 0; }
    const d = SB.vehicle || SB.boat ? SB.camDist + 4 : SB.camDist;
    const cx = tx - Math.sin(SB.camYaw) * Math.cos(SB.camPitch) * d;
    const cz = tz - Math.cos(SB.camYaw) * Math.cos(SB.camPitch) * d;
    const cy = ty + Math.sin(SB.camPitch) * d + 1.5;
    cam.position.set(lerp(cam.position.x, cx, 1 - Math.pow(0.001, dt)), lerp(cam.position.y, cy, 1 - Math.pow(0.001, dt)), lerp(cam.position.z, cz, 1 - Math.pow(0.001, dt)));
    cam.lookAt(tx, ty, tz);
  };
})();
