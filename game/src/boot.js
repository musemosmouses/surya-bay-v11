// Surya Bay boot: renderer, game loop, menu/pause, deterministic shot staging.
(function () {
  'use strict';
  const SB = window.SB;
  const T = SB.THREE;
  const U = SB.utils;

  const canvas = document.getElementById('c');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  SB.renderer = renderer;
  const scene = new T.Scene();
  SB.scene = scene;
  const camera = new T.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 2000);
  camera.position.set(0, 8, 60);
  SB.camera = camera;
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  SB.cityApi.build();
  SB.weatherApi.build();
  SB.vehicleApi.spawnParked();
  SB.worldApi.spawn();
  SB.playerApi.build();
  SB.policeApi.build();
  SB.missionApi.build();
  SB.hudApi.build();
  SB.hudApi.nextRadio();

  // deterministic shot staging for screenshots (?shot=storm|boat|race|tide)
  function stageShot() {
    const s = SB.shot;
    if (!s) return;
    SB.started = true;
    SB.hudApi.showHud(true);
    SB.audioApi.init();
    if (s === 'storm') {
      SB.weather = 'STORM'; SB.weatherT = 210; SB.tide = 0.4; SB.tideT = 100;
      SB.addWanted(3);
      SB.player.position.set(0, 0, 140);
      const car = SB.vehicleApi.nearestCar(SB.player.position, 200);
      if (car) { SB.vehicle = car; SB.player.visible = false; car.position.set(0, 0, 140); car.rotation.y = 0; }
      SB.missionApi.start(2);
      SB.missionStep = 1;
      SB.missionApi.placeMarker();
      SB.camYaw = 0;
    } else if (s === 'boat') {
      SB.weather = 'CLEAR'; SB.weatherT = 0; SB.tide = 0.3;
      SB.addWanted(3);
      const b = SB.boats[1] || SB.boats[0];
      SB.boat = b; SB.player.visible = false;
      b.position.set(60, 0.4, 420); b.rotation.y = 0.3;
      SB.missionApi.start(5);
      SB.missionStep = 1;
      SB.missionApi.placeMarker();
      SB.camYaw = 0.2;
    } else if (s === 'race') {
      SB.weather = 'RAIN'; SB.weatherT = 110; SB.tide = 0.2;
      SB.player.position.set(-140, 0, -140);
      const car = SB.vehicleApi.nearestCar(SB.player.position, 200);
      if (car) { SB.vehicle = car; SB.player.visible = false; car.position.set(-140, 0, -140); car.rotation.y = 0.8; }
      SB.missionApi.start(6);
      SB.camYaw = 0.8;
    } else if (s === 'tide') {
      SB.weather = 'CLEAR'; SB.weatherT = 0; SB.tide = 0.95; SB.tideT = 195;
      SB.player.position.set(-70, 0, 245);
      SB.missionApi.start(0);
      SB.camYaw = Math.PI;
    }
    SB.policeApi.refreshDispatch();
    SB.hudApi.refresh();
  }

  function startGame() {
    if (SB.started && !SB.shot) return;
    SB.started = true;
    SB.audioApi.init();
    SB.audioApi.startMusic();
    SB.hudApi.showHud(true);
    canvas.requestPointerLock && canvas.requestPointerLock();
    const saved = SB.loadGame();
    if (saved && saved.money != null) {
      SB.money = saved.money; SB.hp = saved.hp; SB.armor = saved.armor;
      SB.rankIdx = saved.rankIdx || 0; SB.missionIdx = saved.missionIdx || 0;
      SB.deliveries = saved.deliveries || 0; SB.racesWon = saved.racesWon || 0;
      SB.player.position.set(saved.x || 0, 0, saved.z || 40);
      SB.hudApi.toast('💾 Save loaded — welcome back to Surya Bay');
    }
    if (SB.missionIdx >= 0 && SB.missionIdx < 8 && !SB.mission) SB.missionApi.start(SB.missionIdx);
    else if (SB.missionIdx < 0 && !SB.mission) SB.missionApi.start(0); // fresh game opens on mission 1
    SB.hudApi.refresh();
  }

  document.getElementById('playbtn').addEventListener('click', startGame);
  document.getElementById('resumebtn').addEventListener('click', () => SB.bootApi.togglePause());
  document.getElementById('savebtn').addEventListener('click', () => {
    SB.saveGame();
    SB.hudApi.toast('💾 Game saved');
  });
  document.getElementById('menubtn').addEventListener('click', () => {
    SB.paused = false;
    $('pause').style.display = 'none';
    SB.started = false;
    SB.hudApi.showHud(false);
  });
  function $(id) { return document.getElementById(id); }

  const api = {
    togglePause() {
      if (!SB.started) return;
      SB.paused = !SB.paused;
      $('pause').style.display = SB.paused ? 'flex' : 'none';
      const st = $('pausestat');
      if (st) st.textContent = 'Cash $' + SB.money + ' · Rank ' + SB.ranks[SB.rankIdx] + ' · Missions ' + SB.deliveries + '/8 · Wanted ' + SB.wanted + '★';
      if (!SB.paused) canvas.requestPointerLock && canvas.requestPointerLock();
    },
  };
  SB.bootApi = api;

  // main loop
  let last = performance.now();
  let hudT = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (SB.started && !SB.paused) {
      SB.time += dt;
      SB.playerApi.move(dt);
      SB.worldApi.update(dt);
      SB.policeApi.update(dt);
      SB.weatherApi.update(dt);
      SB.missionApi.update(dt);
      // crew mechanic: BIKO slowly repairs the car
      if (SB.vehicle && SB.crew[1].on && SB.vehicle.userData.health < 100) {
        SB.vehicle.userData.health = Math.min(100, SB.vehicle.userData.health + dt * 1.2);
      }
      // shotgun ammo slow trickle pickup
      if (SB.weapons.shotgun.ammo < 24 && Math.floor(SB.time) % 45 === 0 && dt > 0) {
        SB.weapons.shotgun.ammo = Math.min(24, SB.weapons.shotgun.ammo + 1);
      }
      hudT += dt;
      if (hudT > 0.25) { hudT = 0; SB.hudApi.refresh(); SB.hudApi.drawMinimap(); }
      // speed display
      const spd = SB.vehicle ? Math.abs(SB.vehicle.userData.speed) * 3.6 : SB.boat ? Math.abs(SB.boat.userData.speed) * 3.6 : 0;
      const spdEl = document.getElementById('spd');
      if (spdEl) spdEl.textContent = Math.round(spd);
    }
    SB.updateCamera(dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);

  // auto-start when a shot is requested (headless captures)
  if (SB.shot) {
    setTimeout(stageShot, 300);
  }
  // expose a tiny debug hook for the verifier
  window.__SB__ = SB;
})();
