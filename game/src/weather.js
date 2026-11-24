// Surya Bay weather + tide: deterministic CLEAR→RAIN→STORM, 400 s tide, flood.
(function () {
  'use strict';
  const SB = window.SB;
  const T = SB.THREE;
  const U = SB.utils;
  const CYCLE = ['CLEAR', 'RAIN', 'STORM'];
  const CYCLE_LEN = 300, TIDE_LEN = 400;
  let rain = null;

  const api = {
    build() {
      // simple rain particle field, hidden unless raining
      const geo = new T.BufferGeometry();
      const N = 900, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (SB.rng() - 0.5) * 220;
        pos[i * 3 + 1] = SB.rng() * 60;
        pos[i * 3 + 2] = (SB.rng() - 0.5) * 220;
      }
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      rain = new T.Points(geo, new T.PointsMaterial({ color: 0x9fc8ff, size: 0.55, transparent: true, opacity: 0.7 }));
      rain.visible = false;
      SB.scene.add(rain);
      this.rain = rain;
    },
    update(dt) {
      SB.weatherT += dt;
      SB.tideT += dt;
      const phase = Math.floor(SB.weatherT / (CYCLE_LEN / 3)) % 3;
      const next = CYCLE[phase];
      if (next !== SB.weather) {
        SB.weather = next;
        SB.hudApi && SB.hudApi.toast(next === 'CLEAR' ? '☀️ Sky clearing over Surya Bay' : next === 'RAIN' ? '🌧️ Rain — roads are slick, steering ×1.35' : '⛈️ STORM — sky dark, sea rough');
        SB.hudApi && SB.hudApi.refresh();
      }
      // tide: 0..1 sine over TIDE_LEN
      SB.tide = 0.5 + 0.5 * Math.sin((SB.tideT / TIDE_LEN) * Math.PI * 2 - Math.PI / 2);
      const high = SB.tide > 0.75;
      if (SB.flood) SB.flood.visible = high;
      const fw = document.getElementById('floodwarn');
      if (fw) fw.style.display = high ? 'block' : 'none';
      // sky + light by weather
      if (SB.sky) {
        const col = SB.weather === 'CLEAR' ? 0x87bfe8 : SB.weather === 'RAIN' ? 0x6a7f92 : 0x46586e;
        SB.sky.material.color.setHex(col);
        SB.scene.fog.color.setHex(col);
        if (SB.sun) SB.sun.intensity = SB.weather === 'CLEAR' ? 1.25 : SB.weather === 'RAIN' ? 0.7 : 0.55;
      }
      // rain follows the player
      if (this.rain) {
        const raining = SB.weather !== 'CLEAR';
        this.rain.visible = raining;
        if (raining) {
          const anchor = SB.vehicle ? SB.vehicle.position : (SB.boat ? SB.boat.position : (SB.player ? SB.player.position : { x: 0, z: 0 }));
          this.rain.position.set(anchor.x, 0, anchor.z);
          const pos = this.rain.geometry.attributes.position;
          const fall = (SB.weather === 'STORM' ? 55 : 34) * dt;
          for (let i = 0; i < pos.count; i++) {
            let y = pos.getY(i) - fall;
            if (y < 0) y = 60;
            pos.setY(i, y);
          }
          pos.needsUpdate = true;
        }
      }
      // clouds drift
      if (SB.clouds) SB.clouds.forEach((c, i) => { c.position.x += dt * (2 + i * 0.4); if (c.position.x > 420) c.position.x = -420; });
      // sea bob
      if (SB.sea) SB.sea.position.y = SB.seaBaseY + SB.tide * 0.55 + Math.sin(SB.time * 0.9) * 0.06;
    },
  };
  SB.weatherApi = api;
})();
