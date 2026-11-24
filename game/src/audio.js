// Surya Bay audio: all WebAudio synthesized, no assets.
(function () {
  'use strict';
  const SB = window.SB;
  let ctx = null, master = null, musicTimer = null, engineOsc = null, engineGain = null;
  function ensure() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || SB.muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  function noise(dur, vol, freq) {
    if (!ctx || SB.muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  const api = {
    init() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) { if (master) master.gain.value = m ? 0 : 0.5; },
    gun() { noise(0.12, 0.5, 2600); tone(180, 0.08, 'square', 0.25, 60); },
    shotgun() { noise(0.28, 0.7, 1500); tone(120, 0.2, 'sawtooth', 0.3, 40); },
    hit() { tone(900, 0.06, 'sine', 0.25, 1400); },
    pickup() { tone(520, 0.09, 'sine', 0.25); setTimeout(() => tone(780, 0.12, 'sine', 0.25), 90); },
    cash() { tone(880, 0.08, 'sine', 0.22); setTimeout(() => tone(1320, 0.14, 'sine', 0.22), 80); },
    rankUp() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.25), i * 110)); },
    siren() { tone(700, 0.5, 'sine', 0.08, 1100); },
    splash() { noise(0.35, 0.35, 700); },
    engine(on) {
      ensure(); if (!ctx) return;
      if (on && !engineOsc) {
        engineOsc = ctx.createOscillator(); engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
        engineGain.gain.value = 0.05;
        engineOsc.connect(engineGain); engineGain.connect(master); engineOsc.start();
      } else if (!on && engineOsc) { try { engineOsc.stop(); } catch (e) {} engineOsc = null; engineGain = null; }
    },
    enginePitch(speed) { if (engineOsc) engineOsc.frequency.value = 45 + Math.abs(speed) * 4; },
    startMusic() {
      ensure(); if (!ctx || musicTimer) return;
      const bass = [55, 55, 65.4, 49];
      let step = 0;
      musicTimer = setInterval(() => {
        if (SB.muted || SB.paused || !SB.started) return;
        const root = bass[step % 4];
        tone(root, 0.5, 'triangle', 0.10);
        if (step % 2 === 0) tone(root * 3, 0.22, 'sine', 0.05);
        if (step % 8 === 6) { tone(root * 4, 0.15, 'square', 0.04); tone(root * 6, 0.15, 'square', 0.03); }
        step++;
      }, 460);
    },
  };
  SB.audioApi = api;
})();
