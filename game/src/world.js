// Surya Bay world life: traffic AI cars + pedestrians.
(function () {
  'use strict';
  const SB = window.SB;
  const T = SB.THREE;
  const U = SB.utils;
  const rng = SB.rng;
  const skinTones = [0xe8b98a, 0xc98d5f, 0x8a5a3b, 0xf0c8a0];
  const shirtCols = [0xd84a2f, 0x2f7fd8, 0x3fae5a, 0xe0a52f, 0x8f5fd8, 0xffffff, 0x222831];

  function mkPed() {
    const g = new T.Group();
    const skin = skinTones[Math.floor(rng() * skinTones.length)];
    const body = new T.Mesh(new T.BoxGeometry(0.7, 1.0, 0.4), new T.MeshLambertMaterial({ color: shirtCols[Math.floor(rng() * shirtCols.length)] }));
    body.position.y = 1.0; g.add(body);
    const head = new T.Mesh(new T.SphereGeometry(0.32, 10, 8), new T.MeshLambertMaterial({ color: skin }));
    head.position.y = 1.85; g.add(head);
    const legL = new T.Mesh(new T.BoxGeometry(0.25, 0.7, 0.25), new T.MeshLambertMaterial({ color: 0x2a3440 }));
    legL.position.set(0, 0.35, 0.18); g.add(legL);
    const legR = legL.clone(); legR.position.z = -0.18; g.add(legR);
    g.userData = { kind: 'ped', speed: 1 + rng() * 1.4, heading: rng() * Math.PI * 2, flee: 0, legL, legR, phase: rng() * 6 };
    return g;
  }

  SB.worldApi = {
    spawn() {
      // traffic cars on road loops
      const colors = [0x9aa4ad, 0xd84a2f, 0x2f7fd8, 0xe0a52f, 0x3fae5a, 0xffffff];
      for (let i = 0; i < 12; i++) {
        const c = SB.vehicleApi.mkCar(colors[i % colors.length], true);
        const horizontal = rng() > 0.5;
        const lane = (Math.floor(rng() * 9) - 4) * 70;
        if (horizontal) { c.position.set(-260 + rng() * 520, 0, lane + (rng() > 0.5 ? 3.5 : -3.5)); c.rotation.y = rng() > 0.5 ? Math.PI / 2 : -Math.PI / 2; }
        else { c.position.set(lane + (rng() > 0.5 ? 3.5 : -3.5), 0, -260 + rng() * 520); c.rotation.y = rng() > 0.5 ? 0 : Math.PI; }
        c.userData.speed = 8 + rng() * 6;
        c.userData.dir = 1;
        SB.scene.add(c); SB.traffic.push(c);
      }
      for (let i = 0; i < 36; i++) {
        const p = mkPed();
        p.position.set(-260 + rng() * 520, 0, -255 + rng() * 500);
        p.rotation.y = p.userData.heading;
        SB.scene.add(p); SB.peds.push(p);
      }
    },
    update(dt) {
      // traffic: cruise along its road, slow near the player, wrap at edges
      SB.traffic.forEach((c) => {
        const u = c.userData;
        const px = SB.player ? SB.player.position.x : 1e9;
        const pz = SB.player ? SB.player.position.z : 1e9;
        const near = U.dist2(px, pz, c.position.x, c.position.z) < 900;
        const target = near ? 2 : u.speed;
        const cur = u.cruiseSpeed || (u.cruiseSpeed = u.speed);
        const sp = U.lerp(cur, near ? 2 : cur, dt);
        c.position.x += Math.sin(c.rotation.y) * sp * dt;
        c.position.z += Math.cos(c.rotation.y) * sp * dt;
        if (c.position.x > 275) c.position.x = -275;
        if (c.position.x < -275) c.position.x = 275;
        if (c.position.z > 270) c.position.z = -270;
        if (c.position.z < -270) c.position.z = 270;
      });
      // peds: wander sidewalks, flee gunfire / nearby speeding car
      const gun = SB.lastShotT != null && SB.time - SB.lastShotT < 2;
      SB.peds.forEach((p) => {
        const u = p.userData;
        let fleeing = u.flee > 0;
        if (gun && SB.player) {
          const d = U.dist2(p.position.x, p.position.z, SB.player.position.x, SB.player.position.z);
          if (d < 2500) { u.flee = 3; fleeing = true; }
        }
        if (fleeing) {
          u.flee -= dt;
          const dx = p.position.x - (SB.player ? SB.player.position.x : 0);
          const dz = p.position.z - (SB.player ? SB.player.position.z : 0);
          const len = Math.hypot(dx, dz) || 1;
          p.position.x += (dx / len) * 5 * dt;
          p.position.z += (dz / len) * 5 * dt;
          p.rotation.y = Math.atan2(dx, dz);
        } else {
          if (rng() < dt * 0.08) u.heading = rng() * Math.PI * 2;
          p.rotation.y = u.heading;
          p.position.x += Math.sin(u.heading) * u.speed * dt;
          p.position.z += Math.cos(u.heading) * u.speed * dt;
          p.position.x = U.clamp(p.position.x, -272, 272);
          p.position.z = U.clamp(p.position.z, -272, 262);
        }
        u.phase += dt * (fleeing ? 14 : 7);
        u.legL.rotation.x = Math.sin(u.phase) * 0.55;
        u.legR.rotation.x = -Math.sin(u.phase) * 0.55;
      });
    },
  };
})();
