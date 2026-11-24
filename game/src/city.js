// Surya Bay city: ground, sea, beach, road grid, buildings, harbor, props, sky.
(function () {
  'use strict';
  const SB = window.SB;
  const T = SB.THREE;
  const rng = SB.rng;
  const U = SB.utils;

  function mat(color, rough) { return new T.MeshLambertMaterial({ color, roughness: rough == null ? 0.9 : rough }); }
  function box(w, h, d, color, x, y, z, parent) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z); (parent || SB.scene).add(m); return m;
  }

  SB.cityApi = {
    buildings: [], roadLines: [], lamps: [], gates: [],
    build() {
      const scene = SB.scene;
      // sky + fog + lights
      SB.sky = new T.Mesh(new T.SphereGeometry(900, 16, 12), new T.MeshBasicMaterial({ color: 0x87bfe8, side: T.BackSide, fog: false }));
      scene.add(SB.sky);
      SB.sun = new T.DirectionalLight(0xffe6b0, 1.25); SB.sun.position.set(180, 260, 120); scene.add(SB.sun);
      scene.add(new T.AmbientLight(0xbfd9ff, 0.75));
      scene.fog = new T.Fog(0x9fc4e0, 220, 850);

      // ground: city slab
      const ground = new T.Mesh(new T.PlaneGeometry(620, 620), mat(0x3d4a3a));
      ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 0); scene.add(ground);
      // beach sand strip
      const sand = new T.Mesh(new T.PlaneGeometry(620, 46), mat(0xe0c98f));
      sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.05, 285); scene.add(sand);
      // sea
      SB.sea = new T.Mesh(new T.PlaneGeometry(900, 420), new T.MeshLambertMaterial({ color: 0x1a6f9e, transparent: true, opacity: 0.92 }));
      SB.sea.rotation.x = -Math.PI / 2; SB.sea.position.set(0, 0.35, 520); scene.add(SB.sea);
      SB.seaBaseY = 0.35;

      // road grid: roads every 70 units, width 14
      const roadMat = mat(0x2a2e33);
      for (let i = -4; i <= 4; i++) {
        const c = i * 70;
        const h = new T.Mesh(new T.PlaneGeometry(560, 14), roadMat);
        h.rotation.x = -Math.PI / 2; h.position.set(0, 0.08, c); scene.add(h);
        const v = new T.Mesh(new T.PlaneGeometry(14, 560), roadMat);
        v.rotation.x = -Math.PI / 2; v.position.set(c, 0.08, 0); scene.add(v);
        // dashes
        for (let k = -260; k <= 260; k += 26) {
          const dash = new T.Mesh(new T.PlaneGeometry(6, 0.7), mat(0xd8d8d8));
          dash.rotation.x = -Math.PI / 2; dash.position.set(k, 0.1, c + 0.4); scene.add(dash);
        }
      }
      // beach road along the shore
      const shore = new T.Mesh(new T.PlaneGeometry(560, 12), roadMat);
      shore.rotation.x = -Math.PI / 2; shore.position.set(0, 0.08, 258); scene.add(shore);

      // buildings: seeded blocks, skip road lines and harbor corner
      const palette = [0xc9a06a, 0x8fa8bf, 0xd8b48f, 0x7fa88f, 0xb08a9a, 0xe8dcc0, 0x6f87a8, 0xc47f5a];
      for (let gx = -3; gx <= 3; gx++) for (let gz = -3; gz <= 3; gz++) {
        if (gx === 3 && gz >= 2) continue; // harbor corner stays open
        const bx = gx * 70 + 35, bz = gz * 70 + 35;
        if (Math.abs(bz) > 250) continue;
        const n = 1 + Math.floor(rng() * 2);
        for (let b = 0; b < n; b++) {
          const w = 16 + rng() * 18, d = 16 + rng() * 18, h = 10 + rng() * 42;
          const x = bx + (b ? 12 : -12) * (rng() > 0.5 ? 1 : -1) * 0.4;
          const z = bz + (b ? -8 : 8) * 0.4;
          const m = box(w, h, d, palette[Math.floor(rng() * palette.length)], x, h / 2, z);
          m.userData.isBuilding = true;
          this.buildings.push(m);
          // lit windows strip
          const win = box(w * 0.92, h * 0.55, 0.3, 0xffe9a8, x, h * 0.62, z + d / 2 + 0.16);
          win.material = new T.MeshBasicMaterial({ color: 0xffe9a8 });
        }
      }
      // billboards
      const bb = box(26, 10, 1, 0xff5a3c, -105, 26, -35); bb.material = new T.MeshBasicMaterial({ color: 0xff5a3c });
      const bb2 = box(22, 9, 1, 0x2fb7ff, 105, 30, 105); bb2.material = new T.MeshBasicMaterial({ color: 0x2fb7ff });

      // harbor district: east corner — piers, containers, cranes, warehouses
      const harbor = new T.Group(); scene.add(harbor);
      for (let p = 0; p < 3; p++) {
        const pier = box(10, 2, 90, 0x6b4a2f, 215 + p * 22, 1, 300, harbor);
        pier.userData.isPier = true;
      }
      const contColors = [0xd84a2f, 0x2f7fd8, 0x3fae5a, 0xe0a52f];
      for (let i = 0; i < 26; i++) {
        const cx = 185 + rng() * 70, cz = 225 + rng() * 35;
        box(12, 3.4, 3.2, contColors[i % 4], cx, 1.8 + Math.floor(i / 13) * 3.5, cz, harbor);
      }
      for (let i = 0; i < 2; i++) { // cranes
        const cx = 195 + i * 45;
        box(4, 34, 4, 0xe8b52f, cx, 17, 250, harbor);
        box(30, 3, 3, 0xe8b52f, cx + 8, 32, 250, harbor);
        const cable = box(0.5, 14, 0.5, 0x222222, cx + 20, 25, 250, harbor);
      }
      box(46, 14, 24, 0x9aa4ad, 200, 7, 215, harbor); // warehouse
      box(40, 12, 20, 0x7d8a94, 245, 6, 220, harbor);
      // boardwalk lamps + palms along beach road
      for (let x = -260; x <= 260; x += 40) {
        const pole = box(0.5, 7, 0.5, 0x333a40, x, 3.5, 250);
        const lamp = new T.Mesh(new T.SphereGeometry(0.9, 8, 6), new T.MeshBasicMaterial({ color: 0xfff2b0 }));
        lamp.position.set(x, 7.2, 250); scene.add(lamp); this.lamps.push(lamp);
        const trunk = box(0.8, 9, 0.8, 0x6b4a2f, x + 18, 4.5, 268);
        const top = new T.Mesh(new T.ConeGeometry(4.5, 5, 7), mat(0x2f9e5a));
        top.position.set(x + 18, 11, 268); scene.add(top);
      }
      // drifting clouds
      SB.clouds = [];
      for (let i = 0; i < 9; i++) {
        const cl = new T.Group();
        for (let j = 0; j < 3; j++) {
          const s = new T.Mesh(new T.SphereGeometry(9 + rng() * 8, 8, 6), new T.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
          s.position.set(j * 10 - 10, rng() * 3, rng() * 4); cl.add(s);
        }
        cl.position.set(-350 + rng() * 700, 90 + rng() * 50, -250 + rng() * 550);
        scene.add(cl); SB.clouds.push(cl);
      }
      // flood sheet (hidden until high tide)
      SB.flood = new T.Mesh(new T.PlaneGeometry(620, 50), new T.MeshLambertMaterial({ color: 0x2a7fb8, transparent: true, opacity: 0.55 }));
      SB.flood.rotation.x = -Math.PI / 2; SB.flood.position.set(0, 0.5, 268); SB.flood.visible = false;
      scene.add(SB.flood);
      // race gates (pink rings) — positioned by missions at runtime
      this.gateGroup = new T.Group(); scene.add(this.gateGroup);
    },
    setGatePositions(list) {
      this.gateGroup.clear();
      this.gates = [];
      list.forEach((p, i) => {
        const ring = new T.Mesh(new T.TorusGeometry(5, 0.6, 8, 20), new T.MeshBasicMaterial({ color: 0xff4fd8 }));
        ring.position.set(p.x, 4.5, p.z); this.gateGroup.add(ring); this.gates.push(ring);
      });
    },
  };
})();
