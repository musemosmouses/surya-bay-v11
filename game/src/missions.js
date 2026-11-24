// Surya Bay missions: 8 story missions, hot harbor deliveries, street race.
(function () {
  'use strict';
  const SB = window.SB;
  const T = SB.THREE;
  const U = SB.utils;
  const rng = SB.rng;
  const CREW_LINES = {
    MARA: ['Mara: strip is clear, go go go.', 'Mara: cops on Bay Road — take the alley.', 'Mara: package is hot. Do not stop.'],
    BIKO: ['Biko: engine sounds sweet. She will hold.', 'Biko: if she stalls in the flood, call me.', 'Biko: brakes are fresh, trust them.'],
    LENA: ['Lena: client pays on delivery. No excuses.', 'Lena: the King is watching this one.', 'Lena: finish it and the rank is yours.'],
  };
  let marker = null, markerRing = null;

  const MISSIONS = [
    { title: '1 · First Drop', who: 'LENA', face: '👱‍♀️', pay: 150, steps: [
      { text: 'Pick up the package at the pier warehouse.', at: [200, 218], radius: 10 },
      { text: 'Deliver it to the boardwalk cafe.', at: [-140, 252], radius: 10 } ] },
    { title: '2 · Taxi Rush', who: 'MARA', face: '👩', pay: 200, steps: [
      { text: 'Pick up the fare at City Hall plaza.', at: [-35, -35], radius: 10 },
      { text: 'Drop the fare at the beach hotel.', at: [175, 252], radius: 10 } ] },
    { title: '3 · Getaway', who: 'BIKO', face: '🧔', pay: 300, steps: [
      { text: 'Grab the car at the garage on Bay Road.', at: [70, 0], radius: 10 },
      { text: 'Lose the heat, then reach the safehouse.', at: [-210, -210], radius: 12, heat: 2 } ] },
    { title: '4 · Turf Defense', who: 'LENA', face: '👱‍♀️', pay: 400, steps: [
      { text: 'Hold the corner — rivals are coming.', at: [35, 105], radius: 12, hold: 20 },
      { text: 'Chase the last rival off the block.', at: [105, 105], radius: 12 } ] },
    { title: '5 · Harbor Delivery', who: 'MARA', face: '👩', pay: 450, steps: [
      { text: 'Collect the crate from the container yard.', at: [210, 240], radius: 10 },
      { text: 'Deliver by boat to the far pier.', at: [250, 380], radius: 12, boat: true } ] },
    { title: '6 · Harbor Run', who: 'BIKO', face: '🧔', pay: 700, steps: [
      { text: 'Steal the speedboat at pier 2.', at: [232, 330], radius: 10, boat: true },
      { text: 'Outrun marine police to the open sea marker.', at: [0, 560], radius: 16, heat: 3, boat: true } ] },
    { title: '7 · Sunset Sprint', who: 'LENA', face: '👱‍♀️', pay: 900, steps: [
      { text: 'Race through all 5 gates before the timer ends.', at: [0, 0], radius: 0, race: true } ] },
    { title: '8 · King of Surya Bay', who: 'LENA', face: '👱‍♀️', pay: 1500, steps: [
      { text: 'Beat 6 rivals across the city — final gate at the strip.', at: [-140, 252], radius: 12, race: true, rivals: 6 } ] },
  ];

  const RACE_GATES = [
    { x: -140, z: -140 }, { x: 140, z: -140 }, { x: 140, z: 140 }, { x: -140, z: 140 }, { x: 0, z: 0 },
  ];

  function ensureMarker() {
    if (marker) return;
    marker = new T.Mesh(new T.CylinderGeometry(3, 3, 0.5, 20), new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85 }));
    marker.visible = false; SB.scene.add(marker);
    markerRing = new T.Mesh(new T.TorusGeometry(4, 0.35, 8, 24), new T.MeshBasicMaterial({ color: 0xffd23f }));
    markerRing.rotation.x = Math.PI / 2; markerRing.visible = false; SB.scene.add(markerRing);
  }
  function say(who, face, line) {
    const d = document.getElementById('dialog');
    if (!d) return;
    document.getElementById('dwho').textContent = who;
    document.getElementById('dface').textContent = face;
    document.getElementById('dline').textContent = line;
    d.style.display = 'block';
  }
  function stepText(m) {
    const s = m.steps[SB.missionStep];
    return s ? s.text : '';
  }

  const api = {
    missions: MISSIONS,
    raceGateIdx: 0, raceT: 0, raceTimer: 0, holdT: 0, hotRun: false,
    build() { ensureMarker(); },
    start(i) {
      SB.missionIdx = i; SB.missionStep = 0;
      SB.mission = MISSIONS[i];
      this.raceGateIdx = 0; this.holdT = 0;
      // Harbor Delivery can go HOT (~40%, seeded): +2 stars + sea chase
      this.hotRun = false;
      if (SB.mission.title.indexOf('Harbor Delivery') === 0 && rng() < 0.4) {
        this.hotRun = true;
        SB.addWanted(2);
        SB.hudApi && SB.hudApi.toast('🔥 HOT RUN! +2 stars — marine police are coming!');
      }
      const m = SB.mission;
      say(m.who, m.face, CREW_LINES[m.who][Math.floor(rng() * CREW_LINES[m.who].length)] + ' ' + m.steps[0].text);
      SB.hudApi && SB.hudApi.refresh();
      this.placeMarker();
    },
    placeMarker() {
      ensureMarker();
      const m = SB.mission;
      if (!m) { marker.visible = false; markerRing.visible = false; return; }
      const s = m.steps[SB.missionStep];
      if (!s || s.race) {
        if (s && s.race) {
          SB.cityApi.setGatePositions(RACE_GATES);
          const g = RACE_GATES[this.raceGateIdx];
          marker.position.set(g.x, 0.4, g.z); markerRing.position.set(g.x, 1, g.z);
          marker.visible = true; markerRing.visible = true;
          this.raceTimer = s.rivals ? 150 : 90;
        } else { marker.visible = false; markerRing.visible = false; }
        return;
      }
      marker.position.set(s.at[0], 0.4, s.at[1]);
      markerRing.position.set(s.at[0], 1, s.at[1]);
      marker.visible = true; markerRing.visible = true;
    },
    update(dt) {
      if (!SB.mission) return;
      const m = SB.mission;
      const s = m.steps[SB.missionStep];
      if (!s) return;
      const pos = SB.vehicle ? SB.vehicle.position : (SB.boat ? SB.boat.position : (SB.player ? SB.player.position : { x: 0, z: 0 }));
      if (s.race) {
        this.raceTimer -= dt;
        const g = RACE_GATES[this.raceGateIdx];
        const d = U.dist2(pos.x, pos.z, g.x, g.z);
        if (d < 100) {
          this.raceGateIdx++;
          SB.audioApi.pickup();
          SB.hudApi && SB.hudApi.toast('🏁 Gate ' + this.raceGateIdx + '/' + RACE_GATES.length);
          if (this.raceGateIdx >= RACE_GATES.length) { this.complete(); return; }
          this.placeMarker();
        }
        if (this.raceTimer <= 0) {
          SB.hudApi && SB.hudApi.toast('⏱️ Race failed — timer out. Try again!');
          SB.mission = null; SB.missionIdx = -1; SB.cityApi.setGatePositions([]);
          marker.visible = false; markerRing.visible = false;
          SB.hudApi && SB.hudApi.refresh();
        }
        return;
      }
      if (s.hold) {
        const d = U.dist2(pos.x, pos.z, s.at[0], s.at[1]);
        if (d < s.radius * s.radius) {
          this.holdT += dt;
          if (this.holdT >= s.hold) { this.advance(); return; }
        } else this.holdT = 0;
        return;
      }
      if (s.heat && SB.wanted < s.heat) SB.addWanted(s.heat - SB.wanted);
      const d = U.dist2(pos.x, pos.z, s.at[0], s.at[1]);
      if (d < s.radius * s.radius) this.advance();
    },
    advance() {
      const m = SB.mission;
      SB.missionStep++;
      SB.audioApi.pickup();
      if (SB.missionStep >= m.steps.length) { this.complete(); return; }
      const s = m.steps[SB.missionStep];
      say(m.who, m.face, s.text);
      this.placeMarker();
      SB.hudApi && SB.hudApi.refresh();
    },
    complete() {
      const m = SB.mission;
      let pay = m.pay;
      if (this.hotRun) pay = Math.round(pay * 1.5);
      SB.addMoney(pay);
      SB.deliveries++;
      SB.audioApi.cash();
      SB.hudApi && SB.hudApi.toast('✅ ' + m.title + ' complete — $' + pay);
      if (m.title.indexOf('Sunset Sprint') === 0 || m.title.indexOf('King of') === 0) SB.racesWon++;
      SB.mission = null;
      SB.cityApi.setGatePositions([]);
      if (marker) { marker.visible = false; markerRing.visible = false; }
      const next = SB.missionIdx + 1;
      if (next < MISSIONS.length) {
        setTimeout(() => { if (!SB.mission) this.start(next); }, 2500);
      } else {
        SB.missionIdx = MISSIONS.length;
        say('LENA', '👱‍♀️', 'That is every job, King. Surya Bay is yours — repeat the street race whenever you want.');
      }
      SB.hudApi && SB.hudApi.refresh();
    },
    startStreetRace() {
      if (SB.mission) { SB.hudApi && SB.hudApi.toast('Finish the story job first!'); return; }
      SB.mission = { title: 'Street Race (side job)', who: 'MARA', face: '👩', pay: 250, steps: [{ text: 'Race through all 5 gates.', at: [0, 0], radius: 0, race: true }] };
      SB.missionIdx = -2; SB.missionStep = 0;
      this.raceGateIdx = 0; this.raceTimer = 90;
      say('MARA', '👩', 'Side race — five gates, ninety seconds. Go!');
      this.placeMarker();
      SB.hudApi && SB.hudApi.refresh();
    },
    currentObjective() {
      if (!SB.mission) return 'Explore Surya Bay. Press E near a car or boat. Missions start automatically.';
      const s = SB.mission.steps[SB.missionStep];
      if (!s) return SB.mission.title;
      if (s.race) return SB.mission.title + ' — gate ' + (this.raceGateIdx + 1) + '/5 · ' + Math.max(0, Math.ceil(this.raceTimer)) + 's left';
      if (s.hold) return SB.mission.title + ' — hold the corner ' + Math.ceil(Math.max(0, s.hold - this.holdT)) + 's';
      return SB.mission.title + ' — ' + s.text;
    },
  };
  SB.missionApi = api;
})();
