/* ============================================================
 *  audio.js  —  Efek suara & musik latar dibuat dengan Web Audio API
 *  (tanpa file audio eksternal, jadi tetap ringan & portable)
 * ============================================================ */
(function (global) {
  'use strict';

  var MG = global.MG = global.MG || {};
  var Audio2 = MG.audio = {};

  var ctx = null;
  var master = null;      // gain utama
  var sfxGain = null;
  var musicGain = null;
  var musicTimer = null;
  var musicStep = 0;

  Audio2.sfxOn = true;
  Audio2.musicOn = true;

  function ensure() {
    if (ctx) return ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.9;
    sfxGain.connect(master);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
    return ctx;
  }

  /** Browser butuh user gesture sebelum boleh bunyi. */
  Audio2.unlock = function () {
    var c = ensure();
    if (c && c.state === 'suspended') c.resume();
  };

  /* ---------- Blok sintesis dasar ---------- */

  /** Satu nada */
  function tone(opts) {
    if (!Audio2.sfxOn) return;
    var c = ensure(); if (!c) return;
    var t0 = c.currentTime + (opts.delay || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + opts.dur);

    var peak = (opts.vol == null ? 0.3 : opts.vol);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.03, opts.dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);

    osc.connect(g); g.connect(opts.bus || sfxGain);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  /** Seruan gaussian pendek (klik, pop) */
  function noise(opts) {
    if (!Audio2.sfxOn) return;
    var c = ensure(); if (!c) return;
    var dur = opts.dur || 0.08;
    var t0 = c.currentTime + (opts.delay || 0);
    var len = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, opts.shape || 2);
    }
    var src = c.createBufferSource();
    src.buffer = buf;
    var g = c.createGain();
    g.gain.value = opts.vol == null ? 0.2 : opts.vol;
    var f = c.createBiquadFilter();
    f.type = opts.filter || 'bandpass';
    f.frequency.value = opts.freq || 1800;
    f.Q.value = opts.q || 1.2;
    src.connect(f); f.connect(g); g.connect(opts.bus || sfxGain);
    src.start(t0);
  }

  /* ---------- Efek suara game ---------- */

  var SFX = {
    click: function () {
      noise({ freq: 2600, dur: 0.05, vol: 0.14, shape: 3 });
      tone({ type: 'triangle', freq: 660, to: 880, dur: 0.07, vol: 0.14 });
    },
    tap: function () {
      noise({ freq: 1400, dur: 0.06, vol: 0.13, shape: 3 });
    },
    correct: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone({ type: 'sine', freq: f, dur: 0.20, delay: i * 0.07, vol: 0.26 });
        tone({ type: 'triangle', freq: f * 2, dur: 0.12, delay: i * 0.07, vol: 0.07 });
      });
    },
    wrong: function () {
      tone({ type: 'sawtooth', freq: 300, to: 150, dur: 0.28, vol: 0.18 });
      tone({ type: 'sine', freq: 200, to: 110, dur: 0.32, delay: 0.06, vol: 0.14 });
      noise({ freq: 700, dur: 0.12, vol: 0.08, delay: 0.05, filter: 'lowpass' });
    },
    tick: function () {
      tone({ type: 'square', freq: 1200, dur: 0.03, vol: 0.06 });
    },
    timeout: function () {
      tone({ type: 'sawtooth', freq: 440, to: 110, dur: 0.5, vol: 0.16 });
    },
    star: function () {
      [880, 1108.73, 1318.51].forEach(function (f, i) {
        tone({ type: 'sine', freq: f, dur: 0.26, delay: i * 0.09, vol: 0.22 });
      });
    },
    levelUp: function () {
      var seq = [392, 523.25, 659.25, 783.99, 1046.5, 1318.51];
      seq.forEach(function (f, i) {
        tone({ type: 'triangle', freq: f, dur: 0.30, delay: i * 0.10, vol: 0.24 });
        tone({ type: 'sine', freq: f * 1.5, dur: 0.20, delay: i * 0.10, vol: 0.08 });
      });
    },
    win: function () {
      var seq = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51];
      seq.forEach(function (f, i) {
        tone({ type: 'triangle', freq: f, dur: 0.34, delay: i * 0.13, vol: 0.26 });
      });
    },
    lose: function () {
      [440, 392, 330, 262].forEach(function (f, i) {
        tone({ type: 'triangle', freq: f, dur: 0.36, delay: i * 0.16, vol: 0.22 });
      });
    },
    combo: function (n) {
      var base = 523.25 * Math.pow(1.0595, Math.min(12, (n || 1) * 2));
      tone({ type: 'sine', freq: base, dur: 0.16, vol: 0.16 });
      tone({ type: 'sine', freq: base * 1.5, dur: 0.14, delay: 0.05, vol: 0.10 });
    },
    badge: function () {
      [1046.5, 1318.51, 1567.98, 2093].forEach(function (f, i) {
        tone({ type: 'sine', freq: f, dur: 0.4, delay: i * 0.08, vol: 0.20 });
      });
    },
    whoosh: function () {
      noise({ freq: 900, dur: 0.22, vol: 0.09, filter: 'bandpass', q: 0.6 });
    },
    lock: function () {
      tone({ type: 'square', freq: 180, to: 120, dur: 0.18, vol: 0.10 });
    }
  };

  Audio2.play = function (name, arg) {
    if (!Audio2.sfxOn) return;
    Audio2.unlock();
    var f = SFX[name];
    if (f) { try { f(arg); } catch (e) { /* abaikan */ } }
  };

  /* ---------- Musik latar sederhana ---------- */

  // Nada diatonik untuk lagu anak (pentatonik agar terasa ramah)
  var SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
  var BASE_FREQ = 261.63; // C4

  function scaleNote(i) {
    var oct = Math.floor(i / SCALE.length);
    var semi = SCALE[i % SCALE.length] + oct * 12;
    return BASE_FREQ * Math.pow(2, semi / 12);
  }

  function musicTick() {
    var c = ensure(); if (!c) return;
    if (!Audio2.musicOn) return;

    var i = musicStep % 8;
    var f = scaleNote([0, 2, 4, 2, 5, 4, 2, 0][i]);
    var t0 = c.currentTime;

    // nada utama (kalimat naik-turun)
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.55, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
    osc.connect(g); g.connect(musicGain);
    osc.start(t0); osc.stop(t0 + 0.45);

    // pad lembut
    var pad = c.createOscillator();
    var pg = c.createGain();
    pad.type = 'sine';
    pad.frequency.value = f / 2;
    pg.gain.setValueAtTime(0.0001, t0);
    pg.gain.exponentialRampToValueAtTime(0.18, t0 + 0.12);
    pg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
    pad.connect(pg); pg.connect(musicGain);
    pad.start(t0); pad.stop(t0 + 0.9);

    // ketukan hi-hat lembut
    if (i % 2 === 1) {
      var src = c.createBufferSource();
      var len = Math.floor(c.sampleRate * 0.05);
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 3);
      src.buffer = buf;
      var hg = c.createGain(); hg.gain.value = 0.07;
      var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000;
      src.connect(hp); hp.connect(hg); hg.connect(musicGain);
      src.start(t0 + 0.25);
    }

    musicStep++;
  }

  Audio2.startMusic = function () {
    var c = ensure(); if (!c) return;
    Audio2.unlock();
    if (musicTimer) return;
    musicTick();
    musicTimer = setInterval(musicTick, 520);
  };

  Audio2.stopMusic = function () {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  };

  Audio2.setSfx = function (on) {
    Audio2.sfxOn = !!on;
    if (Audio2.sfxOn) Audio2.play('tap');
  };

  Audio2.setMusic = function (on) {
    Audio2.musicOn = !!on;
    if (Audio2.musicOn) Audio2.startMusic();
    else Audio2.stopMusic();
  };

})(window);
