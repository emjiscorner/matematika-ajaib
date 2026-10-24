/* ============================================================
 *  utils.js  —  Pembantu umum: RNG, format angka, acak, modal, toast
 * ============================================================ */
(function (global) {
  'use strict';

  var MG = global.MG = global.MG || {};
  var U = MG.utils = {};

  /* ---------- Random ---------- */
  U.randInt = function (rng, min, max) {           // inklusif
    return min + Math.floor(rng() * (max - min + 1));
  };
  U.pick = function (rng, arr) { return arr[Math.floor(rng() * arr.length)]; };

  U.shuffle = function (rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  /** Ambil n elemen berbeda dari array (unbiased). */
  U.sample = function (rng, arr, n) {
    return U.shuffle(rng, arr).slice(0, n);
  };

  U.chance = function (rng, p) { return rng() < p; };

  /** RNG acak sungguhan (unseeded). */
  U.rng = Math.random;

  /** RNG berbenih supaya soal bisa diulang persis bila perlu. */
  U.seeded = function (seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  };

  /* ---------- Angka & teks ---------- */

  /** Buang angka desimal trailing: 3.0 -> 3, 3.50 -> 3.5 */
  U.trimNum = function (n) {
    if (!isFinite(n)) return '0';
    var r = Math.round(n * 1e6) / 1e6;
    return String(r);
  };

  /** Format angka dengan pemisah ribuan (Indonesia) */
  U.thousand = function (n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  /** "3/4" dari {n:3,d:4} */
  U.frac = function (n, d) { return n + '/' + d; };

  /** Ubah desimal jadi pecahan sederhana (untuk soal desimal) */
  U.decToFrac = function (x) {
    // x seperti 0.25 -> 1/4 ; 0.5 -> 1/2
    var whole = Math.floor(x);
    var rest = Math.round((x - whole) * 100);
    if (rest === 0) return String(whole || 0);
    var d = 100, n = rest, a = d, b = n;
    while (b) { var t = a % b; a = b; b = t; }
    n = n / a; d = d / a;
    return whole > 0 ? (whole + ' ' + n + '/' + d) : (n + '/' + d);
  };

  /* ---------- Matriks ---------- */

  /**
   * Susun 4 pilihan jawaban yang unik.
   * @param {number} answer     nilai yang benar
   * @param {object} o          {rng, min, step, spread, dec, candidates, allowNegative}
   * @returns {{options:string[], answerIndex:number}}
   */
  U.buildOptions = function (answer, o) {
    o = o || {};
    var rng = o.rng || Math.random;
    var nOpts = MG.CONFIG.OPTIONS_COUNT;
    var dec = o.dec || 0;
    var step = o.step == null ? 1 : o.step;
    var spread = o.spread == null ? 2 : o.spread;
    var min = o.min == null ? -Infinity : o.min;

    var set = [];
    var seen = {};
    function fmt(v) { return dec ? U.trimNum(+v.toFixed(dec)) : String(Math.round(v)); }
    function add(v) {
      if (v == null || !isFinite(v)) return false;
      if (!o.allowNegative && v < 0) return false;
      if (v < min) return false;
      var key = fmt(v);
      if (seen[key]) return false;
      seen[key] = 1; set.push(v); return true;
    }

    add(answer);

    // 1) kandidat khusus (mis. hasil salah yang "khas")
    var pool = [];
    if (o.candidates) pool = pool.concat(o.candidates);

    // 2) penggeseran di sekitar jawaban
    var d = step;
    var offs = [];
    for (var i = 1; i <= spread * 3; i++) { offs.push(i * step); offs.push(-i * step); }
    if (step > 1) { offs.push(step / 2 > 0 ? step / 2 : 1, 2 * step, -2 * step); }
    offs = U.shuffle(rng, offs);
    pool = pool.concat(offs.map(function (o2) { return answer + o2; }));

    // 3) nilai acak dalam rentang wajar
    var range = Math.max(step * 12, spread * 10);
    for (var k = 0; k < 40; k++) {
      var v = answer + Math.round((rng() * 2 - 1) * range);
      pool.push(Math.round(v / step) * step);
    }

    for (var p = 0; p < pool.length && set.length < nOpts; p++) add(pool[p]);

    // 4) cadangan terakhir: tebak angka acak di sekitar rentang jawaban
    var guard = 0;
    while (set.length < nOpts && guard++ < 500) {
      add(U.randInt(rng, min < 0 ? 0 : min, (min < 0 ? 0 : min) + range * 2 + step));
    }

    var vals = U.shuffle(rng, set.slice(0, nOpts));
    var options = vals.map(fmt);
    var answerIndex = options.indexOf(fmt(answer));
    if (answerIndex < 0) { // jaga-jaga: jawaban somehow hilang
      options[0] = fmt(answer);
      answerIndex = 0;
    }
    return { options: options, answerIndex: answerIndex };
  };

  /** Varian pembangun pilihan jawaban berbasis teks (mis. "3/4"). */
  U.buildTextOptions = function (answerText, wrongTexts, rng) {
    var nOpts = MG.CONFIG.OPTIONS_COUNT;
    var uniq = [];
    var seen = {};

    // Jawaban benar selalu dimasukkan lebih dulu supaya tidak pernah tertimpa.
    function push(t) {
      if (t == null || t === '') return false;
      var s = String(t);
      if (seen[s]) return false;
      seen[s] = 1; uniq.push(s); return true;
    }

    push(answerText);
    U.shuffle(rng, wrongTexts || []).forEach(function (t) { if (uniq.length < nOpts) push(t); });

    // cadangan kalau masih kurang
    var filler = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-1', '-2'];
    for (var f = 0; f < filler.length && uniq.length < nOpts; f++) push(filler[f]);
    while (uniq.length < nOpts) push('opsi ' + (uniq.length + 1));

    var arr = U.shuffle(rng, uniq);
    var answerIndex = arr.indexOf(String(answerText));
    if (answerIndex < 0) { // jaga-jaga
      arr[0] = String(answerText);
      answerIndex = 0;
    }
    return { options: arr, answerIndex: answerIndex };
  };

  /** Deteksi jumlah angka desimal yang perlu (0, 1, atau 2). */
  U.decimalsOf = function (n) {
    if (!isFinite(n)) return 0;
    if (Number.isInteger(n)) return 0;
    var r = Math.round(n * 100) / 100;
    return Number.isInteger(r) ? 1 : 2;
  };

  /* ---------- DOM ---------- */
  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  U.on = function (el, ev, fn) { if (el) el.addEventListener(ev, fn); };

  U.el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  U.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- Toast ---------- */
  var toastTimer = null;
  U.toast = function (msg, kind) {
    var t = U.$('#toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + (kind || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 2400);
  };

  /* ---------- Modal ---------- */
  /**
   * Tampilkan modal. buttons = [{label, cls, onClick, close:true}]
   */
  U.modal = function (o) {
    var m = U.$('#modal');
    U.$('#modal-emoji').textContent = o.emoji || '🎮';
    U.$('#modal-title').textContent = o.title || '';
    U.$('#modal-text').innerHTML = o.text || '';
    var box = U.$('#modal-actions');
    box.innerHTML = '';
    (o.buttons || [{ label: 'Oke' }]).forEach(function (b) {
      var btn = U.el('button', 'btn ' + (b.cls || 'btn-ghost'), b.label);
      U.on(btn, 'click', function () {
        if (b.close !== false) U.closeModal();
        if (b.onClick) b.onClick();
      });
      box.appendChild(btn);
    });
    m.classList.add('show');
  };
  U.closeModal = function () {
    var m = U.$('#modal');
    if (m) m.classList.remove('show');
  };

  /* ---------- Waktu ---------- */
  U.now = function () { return new Date().toISOString(); };

  U.formatDate = function (iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '-';
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return p(d.getDate()) + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };

  U.formatDuration = function (ms) {
    var s = Math.round(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return m > 0 ? (m + 'm ' + s + 'd') : (s + 'd');
  };

  /** Tanggal hari ini sebagai YYYY-MM-DD */
  U.today = function () { return U.now().slice(0, 10); };

})(window);
