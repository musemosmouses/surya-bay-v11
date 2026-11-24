// Surya Bay HUD: dense panels, dispatch, minimap, weapon slots, crew cards.
(function () {
  'use strict';
  const SB = window.SB;
  const U = SB.utils;
  const $ = (id) => document.getElementById(id);
  let toastTimer = null;

  function starStr() {
    let s = '';
    for (let i = 0; i < 5; i++) s += i < SB.wanted ? '★' : '☆';
    return s;
  }

  const api = {
    build() {
      // weapon slots 1-7
      const w = $('weapons');
      w.innerHTML = '';
      const names = ['PISTOL', 'SHOTGUN', 'SMG', 'RIFLE', 'SNIPER', 'ROCKET', 'MELEE'];
      names.forEach((n, i) => {
        const d = document.createElement('div');
        d.className = 'slot' + (i < 2 ? '' : ' locked');
        d.innerHTML = (i + 1) + '<br>' + n + (i < 2 ? '' : '<br>LOCKED');
        w.appendChild(d);
      });
      // crew cards
      const c = $('crew');
      c.innerHTML = '';
      SB.crew.forEach((member) => {
        const d = document.createElement('div');
        d.className = 'card';
        d.innerHTML = '<b>' + member.face + ' ' + member.name + '</b> · ' + member.text + '<br>' + member.desc;
        c.appendChild(d);
      });
      this.refresh();
    },
    showHud(on) {
      ['hud-top', 'dispatch', 'mission', 'weather', 'radio', 'minimap', 'speed', 'weapons', 'crew'].forEach((id) => {
        const el = $(id); if (el) el.style.display = on ? (id === 'radio' ? 'block' : (id === 'crew' || id === 'weapons' ? 'flex' : 'block')) : 'none';
      });
      $('menu').style.display = on ? 'none' : 'flex';
    },
    refresh() {
      $('stars').textContent = starStr();
      $('money').textContent = '$' + SB.money;
      $('rank').textContent = SB.ranks[SB.rankIdx];
      $('hpbar').style.width = Math.max(0, SB.hp) + '%';
      $('armorbar').style.width = Math.max(0, SB.armor) + '%';
      $('wname').textContent = SB.weapons[SB.weapon].name;
      $('ammo').textContent = SB.weapon === 'shotgun' ? SB.weapons.shotgun.ammo + ' shells' : '∞';
      $('mtitle').textContent = SB.mission ? SB.mission.title : 'FREE ROAM';
      $('mobj').textContent = SB.missionApi ? SB.missionApi.currentObjective() : '';
      $('mcount').textContent = 'Missions done: ' + SB.deliveries + ' / 8 · Races won: ' + SB.racesWon + ' · Kills: ' + SB.kills;
      $('wtext').textContent = SB.weather === 'CLEAR' ? '☀ CLEAR' : SB.weather === 'RAIN' ? '🌧 RAIN — SLICK ROADS' : '⛈ STORM';
      $('ttext').textContent = SB.tide > 0.75 ? 'TIDE HIGH — FLOOD' : SB.tide > 0.4 ? 'TIDE MID' : 'TIDE LOW';
      const v = SB.vehicle || SB.boat;
      $('vcond').textContent = SB.vehicle ? (SB.vehicle.userData.stalled ? 'STALLED — FLOOD' : 'CAR · HP ' + Math.round(SB.vehicle.userData.health)) : SB.boat ? 'BOAT · HP ' + Math.round(SB.boat.userData.health) : 'ON FOOT';
      // active slot highlight
      document.querySelectorAll('#weapons .slot').forEach((el, i) => {
        el.classList.toggle('on', (SB.weapon === 'pistol' && i === 0) || (SB.weapon === 'shotgun' && i === 1));
      });
    },
    renderDispatch(lines) {
      const el = $('units');
      if (!el) return;
      el.innerHTML = lines.map((l) => '<div class="unit ' + l.cls + '">' + l.text + '</div>').join('');
    },
    toast(msg) {
      const t = $('toast');
      t.textContent = msg; t.style.display = 'block';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3200);
    },
    hitmarker() {
      const t = $('toast');
      t.textContent = '✖ HIT'; t.style.display = 'block';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { t.style.display = 'none'; }, 350);
    },
    nextRadio() {
      SB.radioIdx = (SB.radioIdx + 1) % SB.radioLines.length;
      $('radioline').textContent = SB.radioLines[SB.radioIdx];
      $('radio').style.display = 'block';
    },
    drawMinimap() {
      const cv = $('mm');
      if (!cv || !SB.started) return;
      const ctx = cv.getContext('2d');
      const S = 190, scale = S / 700;
      const toX = (x) => S / 2 + x * scale;
      const toY = (z) => S / 2 + z * scale;
      ctx.clearRect(0, 0, S, S);
      ctx.fillStyle = '#0a2033'; ctx.fillRect(0, 0, S, S);
      // sea + beach
      ctx.fillStyle = '#1a6f9e'; ctx.fillRect(0, toY(300), S, S - toY(300));
      ctx.fillStyle = '#e0c98f'; ctx.fillRect(0, toY(262), S, toY(300) - toY(262));
      // roads
      ctx.strokeStyle = '#4a5560'; ctx.lineWidth = 4;
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(toX(i * 70), 0); ctx.lineTo(toX(i * 70), S); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, toY(i * 70)); ctx.lineTo(S, toY(i * 70)); ctx.stroke();
      }
      // harbor piers
      ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 5;
      for (let p = 0; p < 3; p++) { ctx.beginPath(); ctx.moveTo(toX(215 + p * 22), toY(255)); ctx.lineTo(toX(215 + p * 22), toY(345)); ctx.stroke(); }
      // race gates
      if (SB.cityApi && SB.cityApi.gates) {
        ctx.fillStyle = '#ff4fd8';
        SB.cityApi.gates.forEach((g) => { ctx.beginPath(); ctx.arc(toX(g.position.x), toY(g.position.z), 4, 0, 7); ctx.fill(); });
      }
      const dot = (x, z, color, r) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(toX(x), toY(z), r || 3, 0, 7); ctx.fill(); };
      SB.boats.forEach((b) => dot(b.position.x, b.position.z, '#7fe3ff', 3));
      SB.marine.forEach((m) => dot(m.position.x, m.position.z, '#ff2222', 4));
      SB.cops.forEach((c) => dot(c.position.x, c.position.z, '#2266ff', 3.5));
      SB.traffic.forEach((c) => dot(c.position.x, c.position.z, '#e8e8e8', 2));
      if (SB.boat) dot(SB.boat.position.x, SB.boat.position.z, '#7dff9b', 5);
      else if (SB.vehicle) dot(SB.vehicle.position.x, SB.vehicle.position.z, '#7dff9b', 5);
      else if (SB.player) dot(SB.player.position.x, SB.player.position.z, '#7dff9b', 5);
      // player facing wedge
      if (SB.player) {
        ctx.strokeStyle = '#7dff9b'; ctx.lineWidth = 2;
        const px = SB.player.position.x, pz = SB.player.position.z;
        ctx.beginPath(); ctx.moveTo(toX(px), toY(pz));
        ctx.lineTo(toX(px - Math.sin(SB.camYaw) * 22), toY(pz - Math.cos(SB.camYaw) * 22)); ctx.stroke();
      }
    },
  };
  SB.hudApi = api;
})();
