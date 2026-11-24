// Surya Bay police: wanted decay, land pursuit, marine patrol, heli, dispatch.
(function () {
  'use strict';
  const SB = window.SB;
  const T = SB.THREE;
  const U = SB.utils;
  const rng = SB.rng;
  const CALLSIGNS = ['UNIT 12', 'UNIT 7', 'UNIT 23', 'UNIT 31', 'K-9 UNIT', 'UNIT 5'];
  const TACTICS = ['boxing in the suspect', 'setting a roadblock on the strip', 'pursuit in progress — keep distance', 'air support requested', 'suspect heading for the harbor', 'spike strip ready on Bay Road'];
  const MARINE_CALLS = ['MARINE 1', 'MARINE 2'];
  const MARINE_TACTICS = ['cutting off the harbor mouth', 'ramming speed — take the boat down', 'shadowing the suspect vessel', 'blocking the pier exit'];

  function mkCopCar() {
    const c = SB.vehicleApi.mkCar(0x1a2a3a, false);
    const bar = new T.Mesh(new T.BoxGeometry(1.2, 0.25, 0.5), new T.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.set(-0.2, 2.4, 0); c.add(bar);
    const bar2 = new T.Mesh(new T.BoxGeometry(1.2, 0.25, 0.5), new T.MeshBasicMaterial({ color: 0x2266ff }));
    bar2.position.set(-0.2, 2.4, 0.6); c.add(bar2);
    c.userData.hp = 60; c.userData.kind = 'cop';
    return c;
  }
  function mkMarineBoat() {
    const b = SB.vehicleApi.mkBoat(0xd8232a);
    const stripe = new T.Mesh(new T.BoxGeometry(5, 0.4, 2.9), new T.MeshBasicMaterial({ color: 0xffffff }));
    stripe.position.y = 1.2; b.add(stripe);
    b.userData.hp = 120; b.userData.kind = 'marine';
    return b;
  }
  function mkHeli() {
    const g = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(4, 1.6, 2), new T.MeshLambertMaterial({ color: 0x223344 }));
    g.add(body);
    const rotor = new T.Mesh(new T.BoxGeometry(9, 0.15, 0.5), new T.MeshLambertMaterial({ color: 0x111111 }));
    rotor.position.y = 1.2; g.add(rotor);
    g.userData.rotor = rotor;
    const coneGeo = new T.ConeGeometry(7, 26, 16, 1, true);
    const coneMat = new T.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false });
    const cone = new T.Mesh(coneGeo, coneMat);
    cone.position.y = -14; cone.rotation.x = Math.PI; g.add(cone);
    g.userData.cone = cone;
    const spot = new T.Mesh(new T.CircleGeometry(6, 16), new T.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.35 }));
    spot.rotation.x = -Math.PI / 2; spot.position.y = -26.5; g.add(spot);
    g.userData.spot = spot;
    return g;
  }

  const api = {
    heli: null, dispatchT: 0, dispatchLines: [],
    build() {
      this.heli = mkHeli();
      this.heli.visible = false;
      SB.scene.add(this.heli);
      this.refreshDispatch();
    },
    refreshDispatch() {
      const lines = [];
      const n = Math.min(SB.wanted + 1, 3);
      for (let i = 0; i < n; i++) {
        lines.push({ cls: '', text: (CALLSIGNS[(i + Math.floor(SB.time / 20)) % CALLSIGNS.length]) + ' — ' + TACTICS[Math.floor(rng() * TACTICS.length)] });
      }
      if (SB.boat) {
        lines.push({ cls: 'marine', text: 'MARINE 1 — ' + MARINE_TACTICS[Math.floor(rng() * MARINE_TACTICS.length)] });
        if (SB.wanted >= 2) lines.push({ cls: 'marine', text: 'MARINE 2 — ' + MARINE_TACTICS[Math.floor(rng() * MARINE_TACTICS.length)] });
      }
      if (SB.wanted >= 3) lines.push({ cls: 'air', text: 'AIR ONE — spotlight on suspect, tracking from above' });
      if (SB.wanted === 0) lines.push({ cls: '', text: 'All units — quiet night on the strip. Stand by.' });
      this.dispatchLines = lines;
      SB.hudApi && SB.hudApi.renderDispatch(lines);
    },
    update(dt) {
      // wanted decay when hidden (no cops near)
      const decayMul = SB.crew[2].on ? 2 : 1;
      if (SB.wanted > 0) {
        SB.wantedHeat -= dt * 4 * decayMul;
        const anyNear = SB.cops.some((c) => SB.player && U.dist2(c.position.x, c.position.z, SB.player.position.x, SB.player.position.z) < 2500);
        if (!anyNear && SB.wantedHeat <= 0) { SB.wanted--; SB.wantedHeat = 40; if (SB.wanted === 0) SB.hudApi && SB.hudApi.toast('✅ Heat is off — you are clean'); }
      }
      const target = SB.player ? (SB.vehicle ? SB.vehicle.position : (SB.boat ? SB.boat.position : SB.player.position)) : null;
      if (!target) return;
      // land police: spawn up to wanted count, chase + ram
      const wantCops = SB.wanted >= 1 ? Math.min(SB.wanted, 4) : 0;
      while (SB.cops.length < wantCops) {
        const c = mkCopCar();
        const ang = rng() * Math.PI * 2;
        c.position.set(target.x + Math.sin(ang) * 55, 0, U.clamp(target.z + Math.cos(ang) * 55, -270, 255));
        SB.scene.add(c); SB.cops.push(c);
      }
      while (SB.cops.length > wantCops) {
        const c = SB.cops.pop(); SB.scene.remove(c);
      }
      SB.cops.forEach((c) => {
        const u = c.userData;
        if (u.hp <= 0) { // wrecked: respawn later
          u.hp = 60;
          const ang = rng() * Math.PI * 2;
          c.position.set(target.x + Math.sin(ang) * 70, 0, U.clamp(target.z + Math.cos(ang) * 70, -270, 255));
        }
        const dx = target.x - c.position.x, dz = target.z - c.position.z;
        const d = Math.hypot(dx, dz) || 1;
        const want = Math.atan2(dx, dz);
        let diff = want - c.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.rotation.y += U.clamp(diff, -2.2 * dt, 2.2 * dt);
        const sp = d > 12 ? 24 : 16;
        c.position.x += Math.sin(c.rotation.y) * sp * dt;
        c.position.z += Math.cos(c.rotation.y) * sp * dt;
        if (d < 4.5) { // ram!
          SB.playerApi.damage(8 * dt);
          if (SB.vehicle) { SB.vehicle.userData.health -= 8 * dt; if (SB.vehicle.userData.health <= 0) { SB.vehicle.userData.health = 100; SB.hudApi.toast('🔧 Car wrecked — BIKO towed you a fresh one'); } }
          const push = 6 * dt;
          if (SB.vehicle) { SB.vehicle.position.x += Math.sin(c.rotation.y) * push; SB.vehicle.position.z += Math.cos(c.rotation.y) * push; }
        }
      });
      // marine police: max 2 patrol boats chase + ram when wanted on water
      const onWater = !!SB.boat;
      const wantMarine = onWater && SB.wanted >= 1 ? Math.min(2, SB.wanted) : 0;
      while (SB.marine.length < wantMarine) {
        const b = mkMarineBoat();
        const ang = rng() * Math.PI * 2;
        b.position.set(target.x + Math.sin(ang) * 45, 0.4, U.clamp(target.z + Math.cos(ang) * 45, 300, 600));
        SB.scene.add(b); SB.marine.push(b);
        SB.hudApi && SB.hudApi.toast('🚨 MARINE POLICE on the water!');
      }
      while (SB.marine.length > wantMarine) { const b = SB.marine.pop(); SB.scene.remove(b); }
      SB.marine.forEach((b) => {
        const u = b.userData;
        if (u.hp <= 0) { u.hp = 120; b.position.set(target.x + 40, 0.4, target.z + 40); }
        const dx = target.x - b.position.x, dz = target.z - b.position.z;
        const d = Math.hypot(dx, dz) || 1;
        const want = Math.atan2(dx, dz);
        let diff = want - b.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        b.rotation.y += U.clamp(diff, -1.6 * dt, 1.6 * dt);
        const sp = d > 10 ? 26 : 18;
        b.position.x += Math.sin(b.rotation.y) * sp * dt;
        b.position.z += Math.cos(b.rotation.y) * sp * dt;
        b.position.y = 0.4 + Math.sin(SB.time * 1.6) * 0.18;
        if (d < 5) { // ram the player's boat
          SB.playerApi.damage(6 * dt);
          if (SB.boat) { SB.boat.position.x += Math.sin(b.rotation.y) * 5 * dt; SB.boat.position.z += Math.cos(b.rotation.y) * 5 * dt; }
        }
      });
      // heli at wanted >= 3 with spotlight cone tracking the player
      if (SB.wanted >= 3) {
        this.heli.visible = true;
        const hx = target.x + Math.sin(SB.time * 0.4) * 14;
        const hz = target.z + Math.cos(SB.time * 0.4) * 14;
        this.heli.position.set(hx, 42, hz);
        this.heli.userData.rotor.rotation.y += dt * 22;
        this.heli.userData.spot.position.set(target.x - hx, -41.5, target.z - hz);
        this.heli.userData.cone.lookAt(target.x, 0, target.z);
        if (rng() < dt * 0.5) SB.audioApi.siren();
      } else this.heli.visible = false;
      // dispatch refresh every ~6 s
      this.dispatchT += dt;
      if (this.dispatchT > 6) { this.dispatchT = 0; this.refreshDispatch(); }
    },
  };
  SB.policeApi = api;
})();
