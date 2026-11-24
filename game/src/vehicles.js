// Surya Bay vehicles: car + boat factories and arcade physics.
(function () {
  'use strict';
  const SB = window.SB;
  const T = SB.THREE;
  const U = SB.utils;
  const rng = SB.rng;

  function paint(color) { return new T.MeshLambertMaterial({ color }); }
  function mkCar(color, isTraffic) {
    const g = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(4.4, 1.1, 2.1), paint(color));
    body.position.y = 0.85; g.add(body);
    const cabin = new T.Mesh(new T.BoxGeometry(2.4, 0.9, 1.9), paint(0x1a2530));
    cabin.position.set(-0.2, 1.8, 0); g.add(cabin);
    const wheelGeo = new T.CylinderGeometry(0.42, 0.42, 0.35, 10);
    const wheelMat = paint(0x141414);
    g.userData.wheels = [];
    [[1.5, 1.05], [1.5, -1.05], [-1.5, 1.05], [-1.5, -1.05]].forEach(([x, z]) => {
      const w = new T.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2; w.position.set(x, 0.42, z); g.add(w); g.userData.wheels.push(w);
    });
    const light = new T.Mesh(new T.BoxGeometry(0.2, 0.3, 1.8), new T.MeshBasicMaterial({ color: 0xfff6c0 }));
    light.position.set(2.25, 0.9, 0); g.add(light);
    g.userData = Object.assign(g.userData, {
      kind: 'car', speed: 0, steer: 0, health: 100, stalled: false,
      isTraffic: !!isTraffic, color,
    });
    return g;
  }
  function mkBoat(color) {
    const g = new T.Group();
    const hull = new T.Mesh(new T.BoxGeometry(7.5, 1.2, 2.8), paint(color));
    hull.position.y = 0.7; g.add(hull);
    const bow = new T.Mesh(new T.ConeGeometry(1.4, 2.6, 4), paint(color));
    bow.rotation.z = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(4.8, 0.7, 0); g.add(bow);
    const deck = new T.Mesh(new T.BoxGeometry(3, 0.9, 2.2), paint(0xe8e2d2));
    deck.position.set(-0.6, 1.6, 0); g.add(deck);
    const mast = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 3, 6), paint(0x333333));
    mast.position.set(-0.6, 3.4, 0); g.add(mast);
    g.userData = { kind: 'boat', speed: 0, steer: 0, health: 100 };
    return g;
  }

  SB.vehicleApi = {
    mkCar, mkBoat,
    spawnParked() {
      const colors = [0xd84a2f, 0x2f7fd8, 0xe0a52f, 0x3fae5a, 0x8f5fd8, 0xe8e8e8, 0x222831, 0xff7fb0];
      for (let i = 0; i < 14; i++) {
        const c = mkCar(colors[i % colors.length], false);
        const rx = -245 + rng() * 490, rz = -245 + rng() * 480;
        c.position.set(Math.round(rx / 70) * 70 + (rng() > 0.5 ? 9 : -9), 0, Math.round(rz / 70) * 70);
        c.rotation.y = (rng() > 0.5 ? 0 : Math.PI / 2) + (rng() - 0.5) * 0.2;
        SB.scene.add(c); SB.cars.push(c);
      }
      // 5 drivable boats moored at the harbor piers
      const boatColors = [0xffffff, 0xffd23f, 0x2fb7ff, 0xff5a3c, 0x3fae5a];
      for (let i = 0; i < 5; i++) {
        const b = mkBoat(boatColors[i]);
        b.position.set(210 + i * 22, 0.4, 330 + (i % 2) * 14);
        b.rotation.y = Math.PI / 2;
        SB.scene.add(b); SB.boats.push(b);
      }
    },
    nearestCar(pos, maxD) {
      let best = null, bd = maxD * maxD;
      SB.cars.forEach((c) => {
        const d = U.dist2(pos.x, pos.z, c.position.x, c.position.z);
        if (d < bd) { bd = d; best = c; }
      });
      return best;
    },
    nearestBoat(pos, maxD) {
      let best = null, bd = maxD * maxD;
      SB.boats.forEach((b) => {
        const d = U.dist2(pos.x, pos.z, b.position.x, b.position.z);
        if (d < bd) { bd = d; best = b; }
      });
      return best;
    },
    driveCar(car, dt) {
      const k = SB.keys;
      const slick = SB.weather !== 'CLEAR';
      const steerMul = slick ? 1.35 : 1;
      const drag = slick ? 0.35 : 0.6;
      let accel = 0;
      if (k['KeyW'] || k['ArrowUp']) accel = 26;
      if (k['KeyS'] || k['ArrowDown']) accel = -16;
      if (k['Space']) accel *= 0.25; // handbrake
      const u = car.userData;
      u.speed += accel * dt;
      u.speed *= Math.pow(1 - drag, dt * 2);
      u.speed = U.clamp(u.speed, -14, 34);
      let steer = 0;
      if (k['KeyA'] || k['ArrowLeft']) steer = 1;
      if (k['KeyD'] || k['ArrowRight']) steer = -1;
      u.steer = U.lerp(u.steer, steer, 1 - Math.pow(0.001, dt));
      if (Math.abs(u.speed) > 0.5) {
        car.rotation.y += u.steer * 1.5 * steerMul * dt * Math.sign(u.speed) * U.clamp(Math.abs(u.speed) / 12, 0.3, 1);
      }
      const fwd = car.rotation.y;
      car.position.x += Math.sin(fwd) * u.speed * dt;
      car.position.z += Math.cos(fwd) * u.speed * dt;
      car.position.x = U.clamp(car.position.x, -275, 275);
      car.position.z = U.clamp(car.position.z, -275, 258);
      // flood stall on the beach strip
      if (SB.tide > 0.75 && car.position.z > SB.beachZ - 8 && !SB.crew[1].on) {
        u.stalled = true; u.speed *= 0.9;
      } else if (SB.tide <= 0.75) u.stalled = false;
      if (u.stalled) u.speed = U.lerp(u.speed, 0, dt * 3);
      SB.audioApi.enginePitch(u.speed);
      return Math.abs(u.speed) * 3.6;
    },
    driveBoat(boat, dt) {
      const k = SB.keys;
      const u = boat.userData;
      let accel = 0;
      if (k['KeyW'] || k['ArrowUp']) accel = 20;
      if (k['KeyS'] || k['ArrowDown']) accel = -10;
      u.speed += accel * dt;
      u.speed *= Math.pow(0.55, dt);
      u.speed = U.clamp(u.speed, -8, 30);
      let steer = 0;
      if (k['KeyA'] || k['ArrowLeft']) steer = 1;
      if (k['KeyD'] || k['ArrowRight']) steer = -1;
      u.steer = U.lerp(u.steer, steer, 1 - Math.pow(0.01, dt));
      if (Math.abs(u.speed) > 0.5) boat.rotation.y += u.steer * 0.9 * dt * Math.sign(u.speed);
      boat.position.x += Math.sin(boat.rotation.y) * u.speed * dt;
      boat.position.z += Math.cos(boat.rotation.y) * u.speed * dt;
      boat.position.x = U.clamp(boat.position.x, -380, 380);
      boat.position.z = U.clamp(boat.position.z, 296, 640);
      boat.position.y = 0.4 + Math.sin(SB.time * 1.6 + boat.position.x * 0.05) * 0.18;
      boat.rotation.z = Math.sin(SB.time * 1.2) * 0.03 + u.steer * 0.05;
      return Math.abs(u.speed) * 3.6;
    },
  };
})();
