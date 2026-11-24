// Surya Bay player: on-foot movement, enter/exit, weapons, health, money, rank.
(function () {
  'use strict';
  const SB = window.SB;
  const T = SB.THREE;
  const U = SB.utils;
  const rng = SB.rng;

  function mkPlayerMesh() {
    const g = new T.Group();
    const jacket = new T.MeshLambertMaterial({ color: 0xff8c2f });
    const body = new T.Mesh(new T.BoxGeometry(0.8, 1.1, 0.45), jacket);
    body.position.y = 1.05; g.add(body);
    const head = new T.Mesh(new T.SphereGeometry(0.34, 12, 10), new T.MeshLambertMaterial({ color: 0xe8b98a }));
    head.position.y = 1.95; g.add(head);
    const cap = new T.Mesh(new T.CylinderGeometry(0.36, 0.38, 0.14, 12), new T.MeshLambertMaterial({ color: 0x222831 }));
    cap.position.y = 2.2; g.add(cap);
    const legMat = new T.MeshLambertMaterial({ color: 0x2a3440 });
    const legL = new T.Mesh(new T.BoxGeometry(0.3, 0.85, 0.3), legMat);
    legL.position.set(0, 0.42, 0.2); g.add(legL);
    const legR = legL.clone(); legR.position.z = -0.2; g.add(legR);
    const armMat = jacket;
    const armR = new T.Mesh(new T.BoxGeometry(0.25, 0.9, 0.25), armMat);
    armR.position.set(0.55, 1.1, 0); g.add(armR);
    g.userData = { legL, legR, armR, phase: 0, punchT: 0 };
    return g;
  }

  let muzzle = null, tracer = null;
  function ensureFx() {
    if (muzzle) return;
    muzzle = new T.Mesh(new T.SphereGeometry(0.35, 8, 6), new T.MeshBasicMaterial({ color: 0xffe27a }));
    muzzle.visible = false; SB.scene.add(muzzle);
    tracer = new T.Mesh(new T.BoxGeometry(0.06, 0.06, 6), new T.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.8 }));
    tracer.visible = false; SB.scene.add(tracer);
  }

  const api = {
    build() {
      SB.player = mkPlayerMesh();
      SB.player.position.set(0, 0, 40);
      SB.scene.add(SB.player);
      ensureFx();
    },
    move(dt) {
      const p = SB.player, k = SB.keys;
      if (!p) return;
      if (SB.vehicle) { SB.vehicleApi.driveCar(SB.vehicle, dt); return; }
      if (SB.boat) { SB.vehicleApi.driveBoat(SB.boat, dt); return; }
      const flooded = SB.tide > 0.75 && p.position.z > SB.beachZ - 8;
      let speed = (k['ShiftLeft'] || k['ShiftRight']) ? 11 : 6;
      if (flooded) speed *= 0.6;
      let fx = 0, fz = 0;
      const yaw = SB.camYaw;
      const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
      if (k['KeyW'] || k['ArrowUp']) { fx += fwdX; fz += fwdZ; }
      if (k['KeyS'] || k['ArrowDown']) { fx -= fwdX; fz -= fwdZ; }
      if (k['KeyA'] || k['ArrowLeft']) { fx -= rightX; fz -= rightZ; }
      if (k['KeyD'] || k['ArrowRight']) { fx += rightX; fz += rightZ; }
      const len = Math.hypot(fx, fz);
      const u = p.userData;
      if (len > 0.01) {
        fx /= len; fz /= len;
        p.position.x += fx * speed * dt;
        p.position.z += fz * speed * dt;
        p.rotation.y = Math.atan2(fx, fz);
        u.phase += dt * speed * 1.4;
        u.legL.rotation.x = Math.sin(u.phase) * 0.7;
        u.legR.rotation.x = -Math.sin(u.phase) * 0.7;
      } else {
        u.legL.rotation.x *= 0.8; u.legR.rotation.x *= 0.8;
      }
      if (u.punchT > 0) { u.punchT -= dt; u.armR.rotation.x = -1.6 * Math.max(0, u.punchT / 0.25); }
      else u.armR.rotation.x *= 0.85;
      p.position.x = U.clamp(p.position.x, -275, 275);
      p.position.z = U.clamp(p.position.z, -275, 640);
      if (p.position.z > SB.seaZ + 4 && !SB.boat) { // swimming: slow, drains a little
        p.position.z = SB.seaZ + 4;
        SB.hp = Math.max(1, SB.hp - dt * 1.5);
      }
      if (k['KeyE'] && !this._eHeld) {
        this._eHeld = true;
        this.tryEnter();
      }
      if (!k['KeyE']) this._eHeld = false;
      if (k['KeyF'] && !this._fHeld) { this._fHeld = true; this.punch(); }
      if (!k['KeyF']) this._fHeld = false;
    },
    tryEnter() {
      const p = SB.player;
      if (SB.vehicle) { // exit car
        SB.vehicle = null; SB.audioApi.engine(false);
        p.position.set(p.position.x + 3, 0, p.position.z);
        p.visible = true; return;
      }
      if (SB.boat) {
        SB.boat = null; p.visible = true;
        p.position.set(p.position.x, 0, SB.seaZ - 6);
        SB.audioApi.splash(); return;
      }
      const car = SB.vehicleApi.nearestCar(p.position, 7);
      if (car) {
        SB.vehicle = car; p.visible = false;
        SB.audioApi.engine(true);
        if (!car.userData.isTraffic && SB.wanted < 1) SB.addWanted(1); // stealing
        SB.hudApi && SB.hudApi.toast('🚗 In the car — drive!');
        return;
      }
      const boat = SB.vehicleApi.nearestBoat(p.position, 9);
      if (boat) {
        SB.boat = boat; p.visible = false;
        SB.audioApi.splash();
        SB.hudApi && SB.hudApi.toast('⛵ Boat away — harbor is yours');
        return;
      }
      // near water edge: allow boarding a boat from the pier
      if (p.position.z > SB.beachZ - 4) {
        const b2 = SB.vehicleApi.nearestBoat({ x: p.position.x, z: 330 }, 60);
        if (b2) { SB.boat = b2; p.visible = false; SB.audioApi.splash(); }
      }
    },
    punch() {
      const u = SB.player.userData; u.punchT = 0.25;
      SB.audioApi.hit();
      // knock a nearby ped / cop
      SB.peds.forEach((ped) => {
        if (U.dist2(ped.position.x, ped.position.z, SB.player.position.x, SB.player.position.z) < 9) {
          ped.userData.flee = 4; SB.kills += 0; SB.addWanted(1);
        }
      });
    },
    fire() {
      ensureFx();
      const w = SB.weapons[SB.weapon];
      if (SB.weapon === 'shotgun') {
        if (w.ammo <= 0) { SB.hudApi && SB.hudApi.toast('Shotgun empty — press Q for pistol'); return; }
        w.ammo--;
        SB.audioApi.shotgun();
      } else SB.audioApi.gun();
      SB.lastShotT = SB.time;
      const p = SB.player;
      const origin = SB.vehicle ? SB.vehicle.position : (SB.boat ? SB.boat.position : p.position);
      const dir = new T.Vector3(-Math.sin(SB.camYaw), -0.05, -Math.cos(SB.camYaw));
      muzzle.position.set(origin.x + dir.x * 2, 2, origin.z + dir.z * 2);
      muzzle.visible = true;
      setTimeout(() => { muzzle.visible = false; }, 60);
      tracer.position.copy(muzzle.position);
      tracer.lookAt(muzzle.position.clone().add(dir.clone().multiplyScalar(30)));
      tracer.visible = true;
      setTimeout(() => { tracer.visible = false; }, 70);
      const pellets = SB.weapon === 'shotgun' ? 5 : 1;
      let hitAny = false;
      for (let i = 0; i < pellets; i++) {
        const spread = SB.weapon === 'shotgun' ? (rng() - 0.5) * 0.16 : 0;
        const d2 = new T.Vector3(dir.x + spread, dir.y, dir.z + (rng() - 0.5) * 0.1).normalize();
        // hit cops
        SB.cops.forEach((cop) => {
          if (cop.userData.hp <= 0) return;
          const to = new T.Vector3(cop.position.x - origin.x, 0, cop.position.z - origin.z);
          const along = to.dot(d2);
          if (along > 0 && along < 60) {
            const perp = to.clone().addScaledVector(d2, -along).length();
            if (perp < 2.2) { cop.userData.hp -= SB.weapon === 'shotgun' ? 34 : 25; hitAny = true; }
          }
        });
        SB.marine.forEach((m) => {
          if (m.userData.hp <= 0) return;
          const to = new T.Vector3(m.position.x - origin.x, 0, m.position.z - origin.z);
          const along = to.dot(d2);
          if (along > 0 && along < 80) {
            const perp = to.clone().addScaledVector(d2, -along).length();
            if (perp < 3.5) { m.userData.hp -= 20; hitAny = true; }
          }
        });
        SB.peds.forEach((ped) => {
          const to = new T.Vector3(ped.position.x - origin.x, 0, ped.position.z - origin.z);
          const along = to.dot(d2);
          if (along > 0 && along < 50) {
            const perp = to.clone().addScaledVector(d2, -along).length();
            if (perp < 1.6) { ped.userData.flee = 5; hitAny = true; }
          }
        });
      }
      if (hitAny) { SB.audioApi.hit(); SB.hudApi && SB.hudApi.hitmarker(); }
      SB.addWanted(1);
      if (SB.wanted >= 3) SB.audioApi.siren();
    },
    swapWeapon() {
      SB.weapon = SB.weapon === 'pistol' ? 'shotgun' : 'pistol';
      SB.audioApi.pickup();
      SB.hudApi && SB.hudApi.refresh();
    },
    selectSlot(i) {
      // slots: 1 pistol, 2 shotgun, 3-7 locked (shown in HUD)
      if (i === 0) SB.weapon = 'pistol';
      else if (i === 1) SB.weapon = 'shotgun';
      else SB.hudApi && SB.hudApi.toast('🔒 Slot ' + (i + 1) + ' LOCKED — earn rank to unlock');
      SB.hudApi && SB.hudApi.refresh();
    },
    damage(n) {
      if (SB.armor > 0) { const absorbed = Math.min(SB.armor, n); SB.armor -= absorbed; n -= absorbed; }
      SB.hp -= n;
      if (SB.hp <= 0) {
        SB.hp = 100; SB.armor = 0; SB.wanted = 0;
        SB.money = Math.max(0, SB.money - 100);
        if (SB.player) SB.player.position.set(0, 0, 40);
        if (SB.vehicle) SB.vehicle = null;
        if (SB.boat) SB.boat = null;
        if (SB.player) SB.player.visible = true;
        SB.hudApi && SB.hudApi.toast('💀 Busted / wasted — $100 hospital bill, back at the strip');
      }
    },
    heal(n) { SB.hp = Math.min(100, SB.hp + n); },
  };
  SB.playerApi = api;
})();
