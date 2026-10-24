/* ============================================================
 *  art.js  —  Ilustrasi SVG orisinal (tidak memakai aset eksternal)
 *  Semua gambar digambar sendiri sebagai SVG supaya bebas hak cipta,
 *  tajam di semua ukuran layar, dan tidak menambah file gambar.
 * ============================================================ */
(function (global) {
  'use strict';

  var MG = global.MG = global.MG || {};
  var Art = MG.art = {};

  /* ---------- Helper ---------- */

  function svg(inner, w, h, extra) {
    var vb = '0 0 ' + w + ' ' + h;
    return '<svg class="art-svg" viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" ' +
      (extra || '') + ' role="img">' + inner + '</svg>';
  }

  Art.svg = svg;

  /** Gradien standar untuk DIGPAKAI ulang antar gambar. */
  Art.defs = function (id, from, to, angle) {
    var a = (angle == null ? 90 : angle);
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1" gradientTransform="rotate(' + a + ' .5 .5)">' +
      '<stop offset="0" stop-color="' + from + '"/><stop offset="1" stop-color="' + to + '"/>' +
      '</linearGradient>';
  };

  /* ============================================================
   *  OBJEK KECIL untuk soal pencacahan
   * ============================================================ */
  var ITEMS = {

    apple: function () {
      return '<g><path d="M32 16c-4-6-14-7-19-1-6 8-3 22 5 28 5 4 9 1 14 1s9 3 14-1c8-6 11-20 5-28-5-6-15-5-19 1z" fill="#F2483B" stroke="#B32A20" stroke-width="2.5"/>' +
        '<path d="M32 16c1-8 4-11 10-12-1 7-4 10-10 12z" fill="#57B947" stroke="#2F8C2B" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M32 20v34" stroke="#7A1F17" stroke-width="2" opacity=".35"/>' +
        '<ellipse cx="23" cy="27" rx="5" ry="7" fill="#fff" opacity=".35"/></g>';
    },
    banana: function () {
      return '<g><path d="M12 22c0 18 14 30 40 30 8 0 12-3 12-7 0-5-6-6-12-6-18 0-28-8-28-18 0-5-4-8-8-7-3 1-4 4-4 8z" fill="#FFCF33" stroke="#C79400" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M14 24c2 14 16 23 38 23" stroke="#E0A800" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M14 18c0-3 2-5 5-5" stroke="#7A5C00" stroke-width="3" fill="none" stroke-linecap="round"/></g>';
    },
    star: function () {
      var pts = '32,6 39,25 59,25 43,37 49,57 32,45 15,57 21,37 5,25 25,25';
      return '<g><polygon points="' + pts + '" fill="#FFC93C" stroke="#D79A00" stroke-width="2.5" stroke-linejoin="round"/></g>';
    },
    fish: function () {
      return '<g><path d="M14 32c8-14 28-18 40-6 4 4 4 8 0 12-12 12-32 8-40-6z" fill="#3FA9F5" stroke="#1868A8" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M52 26c6-6 10-6 12-6-2 4-2 8 0 12-2 0-6 0-12-6z" fill="#66C7FF" stroke="#1868A8" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<circle cx="22" cy="28" r="3.5" fill="#fff" stroke="#1868A8" stroke-width="2"/>' +
        '<circle cx="22" cy="28" r="1.6" fill="#123"/></g>';
    },
    flower: function () {
      var p = '';
      for (var i = 0; i < 6; i++) {
        p += '<ellipse cx="32" cy="15" rx="8" ry="12" fill="#FF7BC4" stroke="#C4348C" stroke-width="2" transform="rotate(' + (i * 60) + ' 32 32)"/>';
      }
      return '<g>' + p + '<circle cx="32" cy="32" r="9" fill="#FFD83B" stroke="#C79400" stroke-width="2.5"/>' +
        '<path d="M32 44v14" stroke="#3E9B3A" stroke-width="4" stroke-linecap="round"/></g>';
    },
    balloon: function () {
      return '<g><ellipse cx="32" cy="26" rx="17" ry="20" fill="#7C6BFF" stroke="#4A38C4" stroke-width="2.5"/>' +
        '<path d="M32 46l-5 6h10z" fill="#4A38C4"/>' +
        '<path d="M32 52c4 6-4 8 0 14" stroke="#8A7F99" stroke-width="2.5" fill="none"/>' +
        '<path d="M23 18c3-4 8-6 12-6" stroke="#fff" stroke-width="4" fill="none" opacity=".5" stroke-linecap="round"/></g>';
    },
    ball: function () {
      return '<g><circle cx="32" cy="32" r="23" fill="#FF7043" stroke="#B93A12" stroke-width="2.5"/>' +
        '<path d="M32 9v46M9 32h46" stroke="#B93A12" stroke-width="2.5"/>' +
        '<circle cx="32" cy="32" r="9" fill="none" stroke="#B93A12" stroke-width="2.5"/></g>';
    },
    cookie: function () {
      var c = '';
      var spots = [[22, 24], [42, 22], [32, 38], [20, 44], [44, 42]];
      spots.forEach(function (s) { c += '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="4" fill="#6B3E1E"/>'; });
      return '<g><circle cx="32" cy="32" r="23" fill="#E0A96D" stroke="#A9702F" stroke-width="2.5"/>' + c + '</g>';
    },
    duck: function () {
      return '<g><ellipse cx="30" cy="38" rx="20" ry="15" fill="#FFD83B" stroke="#C79400" stroke-width="2.5"/>' +
        '<circle cx="40" cy="20" r="12" fill="#FFD83B" stroke="#C79400" stroke-width="2.5"/>' +
        '<path d="M50 20h9l-9 6z" fill="#FF8C1A" stroke="#B85C00" stroke-width="2" stroke-linejoin="round"/>' +
        '<circle cx="43" cy="17" r="2.6" fill="#333"/></g>';
    },
    heart: function () {
      return '<g><path d="M32 54C18 44 8 36 8 26a12 12 0 0 1 24-5 12 12 0 0 1 24 5c0 10-10 18-24 28z" fill="#FF5C8A" stroke="#C4235A" stroke-width="2.5" stroke-linejoin="round"/></g>';
    },
    car: function () {
      return '<g><path d="M8 44l4-14c1-4 4-6 8-6h24c4 0 7 2 9 6l5 14z" fill="#4FC3F7" stroke="#1868A8" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<circle cx="20" cy="46" r="8" fill="#37474F" stroke="#1B262C" stroke-width="2.5"/>' +
        '<circle cx="46" cy="46" r="8" fill="#37474F" stroke="#1B262C" stroke-width="2.5"/>' +
        '<circle cx="20" cy="46" r="3" fill="#B0BEC5"/><circle cx="46" cy="46" r="3" fill="#B0BEC5"/></g>';
    },
    leaf: function () {
      return '<g><path d="M12 52C12 26 28 10 52 10c0 24-16 40-40 42z" fill="#57B947" stroke="#2F8C2B" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M12 52L44 18" stroke="#2F8C2B" stroke-width="2.5"/></g>';
    }
  };

  Art.ITEMS = Object.keys(ITEMS);
  Art.itemNames = {
    apple: 'apel', banana: 'pisang', star: 'bintang', fish: 'ikan', flower: 'bunga',
    balloon: 'balon', ball: 'bola', cookie: 'kue', duck: 'bebek', heart: 'hati',
    car: 'mobil', leaf: 'daun'
  };

  /** Satu objek kecil (viewBox 0 0 64 64) */
  Art.item = function (name, x, y, size) {
    var f = ITEMS[name] || ITEMS.star;
    var s = size || 64;
    return '<g transform="translate(' + x + ',' + y + ') scale(' + (s / 64) + ')">' + f() + '</g>';
  };

  /* ============================================================
   *  MASCOT: "Bobi" — burung hokum lucu
   * ============================================================ */
  Art.mascot = function (mood, size) {
    mood = mood || 'happy';
    var body = '#7C6BFF', bodyD = '#4A38C4', belly = '#EDE7FF';

    var face;
    if (mood === 'happy' || mood === 'cheer') {
      face = '<path d="M20 34q5 6 10 0" stroke="#2B2350" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M34 34q5 6 10 0" stroke="#2B2350" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    } else if (mood === 'sad') {
      face = '<path d="M20 37q5-6 10 0" stroke="#2B2350" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M34 37q5-6 10 0" stroke="#2B2350" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M30 46q-4 3 1 5" stroke="#2B2350" stroke-width="3" fill="none" stroke-linecap="round"/>';
    } else if (mood === 'surprised') {
      face = '<circle cx="25" cy="35" r="7" fill="#fff" stroke="#2B2350" stroke-width="3"/>' +
        '<circle cx="39" cy="35" r="7" fill="#fff" stroke="#2B2350" stroke-width="3"/>' +
        '<circle cx="25" cy="36" r="3" fill="#2B2350"/><circle cx="39" cy="36" r="3" fill="#2B2350"/>' +
        '<ellipse cx="32" cy="48" rx="5" ry="6" fill="#FF8FA8" stroke="#2B2350" stroke-width="2.5"/>';
    } else if (mood === 'sleepy') {
      face = '<path d="M20 35q5 5 10 0" stroke="#2B2350" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M34 35q5 5 10 0" stroke="#2B2350" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    } else { // thinking
      face = '<circle cx="25" cy="35" r="3.5" fill="#2B2350"/><circle cx="39" cy="35" r="3.5" fill="#2B2350"/>' +
        '<path d="M26 47q6 4 12 0" stroke="#2B2350" stroke-width="3" fill="none" stroke-linecap="round"/>';
    }

    var wings = (mood === 'cheer')
      ? '<path d="M6 40L-4 22l16 8z" fill="#5B4BE8" stroke="#2B2350" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M58 40l10-18-16 8z" fill="#5B4BE8" stroke="#2B2350" stroke-width="2.5" stroke-linejoin="round"/>'
      : '<path d="M8 44q-6 10 2 16 6 3 8-6z" fill="' + bodyD + '" stroke="#2B2350" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M56 44q6 10-2 16-6 3-8-6z" fill="' + bodyD + '" stroke="#2B2350" stroke-width="2.5" stroke-linejoin="round"/>';

    var s = size || 100;
    var inner =
      '<defs><radialGradient id="bobGrad" cx=".4" cy=".3"><stop offset="0" stop-color="#A99CFF"/><stop offset="1" stop-color="' + bodyD + '"/></radialGradient></defs>' +
      // kuping
      '<path d="M14 22l-2-14 14 8z" fill="#7C6BFF" stroke="#2B2350" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M50 22l2-14-14 8z" fill="#7C6BFF" stroke="#2B2350" stroke-width="2.5" stroke-linejoin="round"/>' +
      wings +
      // badan
      '<ellipse cx="32" cy="40" rx="26" ry="27" fill="url(#bobGrad)" stroke="#2B2350" stroke-width="3"/>' +
      '<ellipse cx="32" cy="48" rx="17" ry="18" fill="' + belly + '"/>' +
      // mata + mulut
      '<g>' + face + '</g>' +
      // paruh
      '<path d="M32 38l8 5-8 6-8-6z" fill="#FFA726" stroke="#B26A00" stroke-width="2.5" stroke-linejoin="round"/>' +
      // kaki
      '<path d="M24 66v6M40 66v6" stroke="#FFA726" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M18 72h12M36 72h12" stroke="#FFA726" stroke-width="4" stroke-linecap="round"/>';

    var out = svg(inner, 64, 76);
    if (s && s !== 100) {
      out = out.replace('class="art-svg"', 'class="art-svg" style="width:' + s + 'px;height:auto"');
    }
    return out;
  };

  /* ============================================================
   *  ARTI PERTAMA / LATAR
   * ============================================================ */

  /** Pecahan lingkaran (pie) */
  Art.fractionCircle = function (n, d, color) {
    var r = 46, cx = 60, cy = 60;
    var c = color || '#FF6B6B';
    var s = '<circle cx="60" cy="60" r="' + r + '" fill="#FFF3D6" stroke="#E0C48A" stroke-width="4"/>';
    for (var i = 0; i < d; i++) {
      var a0 = -Math.PI / 2 + i * 2 * Math.PI / d;
      var a1 = a0 + 2 * Math.PI / d;
      var large = (2 * Math.PI / d) > Math.PI ? 1 : 0;
      var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      var fill = i < n ? c : 'none';
      s += '<path d="M' + cx + ' ' + cy + ' L' + x0.toFixed(2) + ' ' + y0.toFixed(2) +
        ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' Z" ' +
        'fill="' + fill + '" stroke="' + (i < n ? '#B23A3A' : '#E0C48A') + '" stroke-width="2.5"/>';
    }
    return svg(s, 120, 120);
  };

  /** Bar pecahan (batang) */
  Art.fractionBar = function (n, d, color) {
    var w = 22, gap = 4, i;
    var s = '';
    for (i = 0; i < d; i++) {
      var x = i * (w + gap);
      var fill = i < n ? (color || '#4ECDC4') : '#EFEFF6';
      var stroke = i < n ? '#2E8F88' : '#C9C9D6';
      s += '<rect x="' + x + '" y="8" width="' + w + '" height="52" rx="6" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3"/>';
    }
    var total = d * (w + gap) - gap;
    return svg('<g>' + s + '</g>', total, 68);
  };

  /** Jam analog */
  Art.clock = function (h, m) {
    h = h % 12; if (h === 0) h = 12;
    m = m || 0;
    var cx = 70, cy = 70, r = 62;
    var minA = (m / 60) * Math.PI * 2 - Math.PI / 2;
    var hourA = ((h % 12) / 12 + m / 720) * Math.PI * 2 - Math.PI / 2;
    var ticks = '';
    for (var i = 0; i < 12; i++) {
      var a = i * Math.PI / 6 - Math.PI / 2;
      var x1 = cx + (r - 12) * Math.cos(a), y1 = cy + (r - 12) * Math.sin(a);
      var x2 = cx + (r - 4) * Math.cos(a), y2 = cy + (r - 4) * Math.sin(a);
      ticks += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
        '" stroke="#5B4BE8" stroke-width="' + (i % 3 === 0 ? 5 : 3) + '" stroke-linecap="round"/>';
    }
    var inner =
      '<defs><radialGradient id="clk" cx=".35" cy=".3"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EFEAFD"/></radialGradient></defs>' +
      '<circle cx="70" cy="70" r="' + (r + 8) + '" fill="#FFD166" stroke="#D79A00" stroke-width="4"/>' +
      '<circle cx="70" cy="70" r="' + r + '" fill="url(#clk)" stroke="#5B4BE8" stroke-width="4"/>' +
      ticks +
      '<line x1="70" y1="70" x2="' + (70 + 34 * Math.cos(hourA)).toFixed(1) + '" y2="' + (70 + 34 * Math.sin(hourA)).toFixed(1) +
      '" stroke="#2B2350" stroke-width="8" stroke-linecap="round"/>' +
      '<line x1="70" y1="70" x2="' + (70 + 50 * Math.cos(minA)).toFixed(1) + '" y2="' + (70 + 50 * Math.sin(minA)).toFixed(1) +
      '" stroke="#FF6B6B" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="70" cy="70" r="6" fill="#2B2350"/>';
    return svg(inner, 140, 140);
  };

  /** Uang: koin (nilai dalam sen) dan uang kertas */
  Art.money = function (coins, notes) {
    var s = '';
    var i;
    coins = coins || 0; notes = notes || 0;
    var perRow = 5, coinD = 40, gap = 6;
    var noteW = 88, noteH = 52, noteGap = 14;
    var coinsInRow = Math.min(perRow, Math.max(coins, 0));
    var rows = coins > 0 ? Math.ceil(coins / perRow) : 0;
    var coinRowW = coins > 0 ? coinsInRow * (coinD + gap) - gap + 16 : 0;
    var notesRowW = notes > 0 ? notes * noteW + (notes - 1) * noteGap + 20 : 0;
    var W = Math.max(coinRowW, notesRowW, 120);
    var noteCols = ['#7ED957', '#5AC8E8', '#FF9F68'];
    var topY = 12;
    if (notes > 0) {
      var startNX = (W - (notes * noteW + (notes - 1) * noteGap)) / 2;
      for (i = 0; i < notes; i++) {
        var nx = startNX + i * (noteW + noteGap), ny = topY;
        s += '<g transform="rotate(' + (-4 + i * 4) + ' ' + (nx + noteW / 2) + ' ' + (ny + noteH / 2) + ')">' +
          '<rect x="' + nx + '" y="' + ny + '" width="' + noteW + '" height="' + noteH + '" rx="8" fill="' + noteCols[i % 3] + '" stroke="#2F6B4F" stroke-width="3"/>' +
          '<circle cx="' + (nx + noteW / 2) + '" cy="' + (ny + noteH / 2) + '" r="16" fill="#fff" opacity=".55"/>' +
          '<text x="' + (nx + noteW / 2) + '" y="' + (ny + noteH / 2 + 6) + '" font-size="15" text-anchor="middle" fill="#2F6B4F" font-family="sans-serif" font-weight="bold">5000</text></g>';
      }
      topY += noteH + 14;
    }
    if (coins > 0) {
      for (i = 0; i < coins; i++) {
        var r = Math.floor(i / perRow);
        var inRow = Math.min(perRow, coins - r * perRow);
        var rowW = inRow * (coinD + gap) - gap;
        var startCX = (W - rowW) / 2 + coinD / 2;
        var cx = startCX + (i % perRow) * (coinD + gap);
        var cy = topY + coinD / 2 + r * (coinD + gap);
        s += '<g><circle cx="' + cx + '" cy="' + cy + '" r="20" fill="#FFD166" stroke="#C79400" stroke-width="3"/>' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="14" fill="none" stroke="#C79400" stroke-width="2"/>' +
          '<text x="' + cx + '" y="' + (cy + 6) + '" font-size="17" text-anchor="middle" fill="#8A6300" font-family="sans-serif" font-weight="bold">100</text></g>';
      }
      topY += rows * (coinD + gap) - gap;
    }
    return svg('<g>' + s + '</g>', W, topY + 12);
  };

  /** Persegi panjang dengan label sisi (untuk luas & keliling) */
  Art.rectSides = function (w, h, hl, hlLabel) {
    hl = hl || 'w';
    var W = 220, H = 150, x = 52, y = 42;
    var scale = Math.min(110 / w, 80 / h);
    var sw = Math.max(24, Math.round(w * scale));
    var sh = Math.max(24, Math.round(h * scale));
    var fill = hl === 'w' ? 'rgba(255,107,107,.25)' : 'rgba(124,107,255,.28)';
    var stroke = hl === 'w' ? '#E5484D' : '#5B4BE8';
    var inner =
      '<defs><pattern id="hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">' +
      '<line x1="0" y1="0" x2="0" y2="8" stroke="' + stroke + '" stroke-width="2" opacity=".45"/></pattern></defs>' +
      '<rect x="' + x + '" y="' + y + '" width="' + sw + '" height="' + sh + '" rx="6" fill="url(#hatch)" stroke="' + stroke + '" stroke-width="4"/>';
    // Label lebar (atas) dan label tinggi (kiri) — keduanya selalu tampil,
    // yang disoroti memakai warna tebal, yang lain abu-abu.
    var wColor = hl === 'w' ? '#E5484D' : '#8A86A3';
    var hColor = hl === 'h' ? '#5B4BE8' : '#8A86A3';
    inner += '<line x1="' + x + '" y1="' + (y - 10) + '" x2="' + (x + sw) + '" y2="' + (y - 10) + '" stroke="' + wColor + '" stroke-width="2"/>' +
      '<line x1="' + x + '" y1="' + (y - 15) + '" x2="' + x + '" y2="' + (y - 5) + '" stroke="' + wColor + '" stroke-width="2"/>' +
      '<line x1="' + (x + sw) + '" y1="' + (y - 15) + '" x2="' + (x + sw) + '" y2="' + (y - 5) + '" stroke="' + wColor + '" stroke-width="2"/>' +
      '<text x="' + (x + sw / 2) + '" y="' + (y - 18) + '" font-size="18" text-anchor="middle" fill="' + wColor + '" font-family="sans-serif" font-weight="bold">' + (hl === 'w' && hlLabel ? hlLabel : w + ' cm') + '</text>';
    inner += '<line x1="' + (x - 10) + '" y1="' + y + '" x2="' + (x - 10) + '" y2="' + (y + sh) + '" stroke="' + hColor + '" stroke-width="2"/>' +
      '<line x1="' + (x - 15) + '" y1="' + y + '" x2="' + (x - 5) + '" y2="' + y + '" stroke="' + hColor + '" stroke-width="2"/>' +
      '<line x1="' + (x - 15) + '" y1="' + (y + sh) + '" x2="' + (x - 5) + '" y2="' + (y + sh) + '" stroke="' + hColor + '" stroke-width="2"/>' +
      '<text x="' + (x - 24) + '" y="' + (y + sh / 2) + '" font-size="18" text-anchor="middle" dominant-baseline="middle" fill="' + hColor + '" font-family="sans-serif" font-weight="bold" transform="rotate(-90 ' + (x - 24) + ' ' + (y + sh / 2) + ')">' + (hl === 'h' && hlLabel ? hlLabel : h + ' cm') + '</text>';
    return svg(inner, W + 30, H + 20);
  };

  /** Kubus 3 dimensi (untuk volume) */
  Art.cube = function (a, b, c) {
    a = a || 4; b = b || 4; c = c || 4;
    var s = 62, d = 26;
    var top = 'M20 40 L' + (20 + s) + ' 40 L' + (20 + s + d) + ' ' + (40 - d) + ' L' + (20 + d) + ' ' + (40 - d) + ' Z';
    var left = 'M20 40 L' + (20 + s) + ' 40 L' + (20 + s) + ' ' + (40 + s) + ' L20 ' + (40 + s) + ' Z';
    var right = 'M' + (20 + s) + ' 40 L' + (20 + s + d) + ' ' + (40 - d) + ' L' + (20 + s + d) + ' ' + (40 - d + s) + ' L' + (20 + s) + ' ' + (40 + s) + ' Z';
    var inner =
      '<path d="' + top + '" fill="#9BE7FF" stroke="#1868A8" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="' + left + '" fill="#4FC3F7" stroke="#1868A8" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="' + right + '" fill="#2196C9" stroke="#1868A8" stroke-width="3" stroke-linejoin="round"/>' +
      '<text x="' + (20 + s / 2) + '" y="' + (40 + s + 22) + '" font-size="19" text-anchor="middle" fill="#1868A8" font-family="sans-serif" font-weight="bold">' + a + '</text>' +
      '<text x="' + (20 + s + 16) + '" y="' + (40 + s / 2 + 6) + '" font-size="19" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="bold">' + b + '</text>' +
      '<text x="' + (20 + s / 2 + 14) + '" y="' + (40 - d + 4) + '" font-size="19" fill="#1868A8" font-family="sans-serif" font-weight="bold">' + c + '</text>';
    return svg(inner, 160, 150);
  };

  /** Garis bilangan dengan titik */
  Art.numberLine = function (min, max, points, highlight) {
    var W = 320, x1 = 18, x2 = W - 18, y = 52;
    var span = Math.max(1, max - min);
    var step = span <= 12 ? 1 : span <= 30 ? 2 : span <= 60 ? 5 : 10;
    var marks = '';
    for (var v = Math.ceil(min / step) * step; v <= max; v += step) {
      var px = x1 + (v - min) / span * (x2 - x1);
      marks += '<line x1="' + px.toFixed(1) + '" y1="' + (y - 8) + '" x2="' + px.toFixed(1) + '" y2="' + (y + 8) + '" stroke="#5B4BE8" stroke-width="2.5"/>' +
        '<text x="' + px.toFixed(1) + '" y="' + (y + 26) + '" font-size="12" text-anchor="middle" fill="#5B4BE8" font-family="sans-serif" font-weight="bold">' + v + '</text>';
    }
    var dots = '';
    (points || []).forEach(function (p, i) {
      var px = x1 + (p - min) / span * (x2 - x1);
      var isHi = highlight != null && i === highlight;
      dots += '<circle cx="' + px.toFixed(1) + '" cy="' + y + '" r="' + (isHi ? 11 : 8) + '" fill="' + (isHi ? '#FF6B6B' : '#FFD166') + '" stroke="#3A2E6E" stroke-width="3"/>';
    });
    var arrow = '<path d="M' + x1 + ' ' + (y - 6) + ' L' + (x1 - 12) + ' ' + y + ' L' + x1 + ' ' + (y + 6) + ' Z" fill="#5B4BE8"/>' +
      '<path d="M' + x2 + ' ' + (y - 6) + ' L' + (x2 + 12) + ' ' + y + ' L' + x2 + ' ' + (y + 6) + ' Z" fill="#5B4BE8"/>';
    return svg('<g>' + arrow + '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="#5B4BE8" stroke-width="3"/>' + marks + dots + '</g>', W, 80);
  };

  /** Blok nilai tempat: ribuan / ratusan / puluhan / satuan */
  Art.placeValue = function (num) {
    var th = Math.floor(num / 1000) % 10;
    var hu = Math.floor(num / 100) % 10;
    var te = Math.floor(num / 10) % 10;
    var sa = num % 10;
    var cols = [
      { label: 'Ribuan', n: th, c: '#FF6B6B' },
      { label: 'Ratusan', n: hu, c: '#FFA726' },
      { label: 'Puluhan', n: te, c: '#4ECDC4' },
      { label: 'Satuan', n: sa, c: '#7C6BFF' }
    ];
    var x = 8;
    var s = '';
    cols.forEach(function (col, idx) {
      if (idx > 0) {
        s += '<line x1="' + (x - 9) + '" y1="18" x2="' + (x - 9) + '" y2="92" stroke="#B9B4D0" stroke-width="3" stroke-dasharray="5 4"/>';
      }
      var label = idx === 0 ? 'Ribuan' : idx === 1 ? 'Ratusan' : idx === 2 ? 'Puluhan' : 'Satuan';
      var unit = idx === 0 ? 'ribu' : idx === 1 ? 'ratus' : idx === 2 ? 'puluh' : 'satuan';
      for (var k = 0; k < col.n; k++) {
        var gy = 88 - (k + 1) * 17;
        s += '<rect x="' + x + '" y="' + gy + '" width="66" height="15" rx="3" fill="' + col.c + '" stroke="#fff" stroke-width="1.5"/>';
        s += '<text x="' + (x + 33) + '" y="' + (gy + 12) + '" font-size="11" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="bold">100</text>';
      }
      s += '<text x="' + (x + 33) + '" y="12" font-size="12" text-anchor="middle" fill="#5B4BE8" font-family="sans-serif" font-weight="bold">' + label + '</text>';
      s += '<text x="' + (x + 33) + '" y="108" font-size="15" text-anchor="middle" fill="#3A2E6E" font-family="sans-serif" font-weight="bold">' + col.n + ' ' + unit + '</text>';
      x += 78;
    });
    return svg('<g>' + s + '</g>', x + 8, 120);
  };

  /** Susunan bilangan berpola (dengan "?") */
  Art.patternRow = function (items, blanks) {
    var box = 52, gap = 10;
    var s = '';
    items.forEach(function (v, i) {
      var x = i * (box + gap);
      var isBlank = v === null;
      s += '<rect x="' + x + '" y="8" width="' + box + '" height="' + box + '" rx="12" fill="' + (isBlank ? '#FFE9A8' : '#FFFFFF') + '" stroke="' + (isBlank ? '#E0A02E' : '#B9B4D0') + '" stroke-width="3"/>' +
        '<text x="' + (x + box / 2) + '" y="' + (8 + box / 2 + 11) + '" font-size="26" text-anchor="middle" fill="' + (isBlank ? '#C79400' : '#5B4BE8') + '" font-family="sans-serif" font-weight="bold">' + (isBlank ? '?' : v) + '</text>';
      if (i < items.length - 1) {
        s += '<circle cx="' + (x + box + gap / 2) + '" cy="' + (8 + box / 2) + '" r="3" fill="#B9B4D0"/>';
      }
    });
    return svg('<g>' + s + '</g>', items.length * (box + gap), 70);
  };

  /** Bangun datar untuk luas: segitiga, lingkaran, trapesium */
  Art.shape = function (kind, labels) {
    labels = labels || {};
    var s = '';
    if (kind === 'triangle') {
      s = '<polygon points="20,110 110,20 200,110" fill="#FFD166" stroke="#D79A00" stroke-width="4" stroke-linejoin="round"/>' +
        '<text x="110" y="128" font-size="18" text-anchor="middle" fill="#8A6300" font-family="sans-serif" font-weight="bold">' + (labels.b || '') + '</text>' +
        '<text x="112" y="60" font-size="18" text-anchor="middle" fill="#8A6300" font-family="sans-serif" font-weight="bold">' + (labels.t || '') + '</text>';
    } else if (kind === 'circle') {
      s = '<circle cx="110" cy="65" r="48" fill="#B8E6FF" stroke="#1868A8" stroke-width="4"/>' +
        '<line x1="110" y1="65" x2="110" y2="17" stroke="#1868A8" stroke-width="3"/>' +
        '<circle cx="110" cy="65" r="3" fill="#1868A8"/>' +
        '<text x="122" y="40" font-size="17" fill="#1868A8" font-family="sans-serif" font-weight="bold">' + (labels.r || '') + '</text>';
    } else if (kind === 'square') {
      s = '<rect x="55" y="15" width="110" height="110" rx="6" fill="#C9F7C5" stroke="#2F8C2B" stroke-width="4"/>' +
        '<text x="110" y="145" font-size="18" text-anchor="middle" fill="#2F8C2B" font-family="sans-serif" font-weight="bold">' + (labels.s || '') + '</text>';
    } else if (kind === 'trapezoid') {
      s = '<polygon points="50,25 170,25 200,115 20,115" fill="#E0C6FF" stroke="#7C4DFF" stroke-width="4" stroke-linejoin="round"/>' +
        '<line x1="50" y1="25" x2="170" y2="25" stroke="#7C4DFF" stroke-width="2" stroke-dasharray="5 4"/>' +
        '<text x="110" y="18" font-size="16" text-anchor="middle" fill="#7C4DFF" font-family="sans-serif" font-weight="bold">' + (labels.a || '') + '</text>' +
        '<text x="205" y="75" font-size="16" fill="#7C4DFF" font-family="sans-serif" font-weight="bold">' + (labels.b || '') + '</text>' +
        '<line x1="50" y1="120" x2="170" y2="120" stroke="#7C4DFF" stroke-width="6" stroke-linecap="round"/>' +
        '<text x="110" y="140" font-size="16" text-anchor="middle" fill="#7C4DFF" font-family="sans-serif" font-weight="bold">' + (labels.c || '') + '</text>';
    } else if (kind === 'rect') {
      s = '<rect x="45" y="20" width="150" height="90" rx="6" fill="#FFF0C2" stroke="#D79A00" stroke-width="4"/>' +
        '<text x="120" y="130" font-size="18" text-anchor="middle" fill="#8A6300" font-family="sans-serif" font-weight="bold">' + (labels.h || '') + '</text>' +
        '<text x="200" y="70" font-size="18" fill="#8A6300" font-family="sans-serif" font-weight="bold">' + (labels.w || '') + '</text>';
    } else if (kind === 'angle') {
      var rad = (labels.deg || 90) * Math.PI / 180;
      var R = 80, ex = 20 + R * Math.cos(rad), ey = 110 - R * Math.sin(rad);
      s = '<line x1="20" y1="110" x2="20+R+14" y2="110" stroke="#5B4BE8" stroke-width="4" stroke-linecap="round"/>' +
        '<line x1="20" y1="110" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1) + '" stroke="#FF6B6B" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M' + (20 + 32 * Math.cos(rad)).toFixed(1) + ' ' + (110 - 32 * Math.sin(rad)).toFixed(1) +
        ' A32 32 0 0 1 52 110 Z" fill="#FFD166" opacity=".8" stroke="#D79A00" stroke-width="2"/>' +
        '<text x="' + (28 + 48 * Math.cos(rad / 2)) + '" y="' + (104 - 48 * Math.sin(rad / 2)) + '" font-size="16" text-anchor="middle" fill="#8A6300" font-family="sans-serif" font-weight="bold">' + (labels.deg || '') + '°</text>';
    }
    return svg('<g>' + s + '</g>', 240, 155);
  };

  /** Timbangan untuk perbandingan */
  Art.balance = function (leftVal, rightVal, leftItems, rightItems) {
    var tilt = leftVal > rightVal ? -10 : leftVal < rightVal ? 10 : 0;
    var s = '<g transform="translate(24,26)"><g transform="rotate(' + tilt + ' 120 70)">' +
      '<rect x="20" y="66" width="200" height="10" rx="5" fill="#8D7BE8" stroke="#3A2E6E" stroke-width="3"/>' +
      '<rect x="110" y="80" width="20" height="60" rx="6" fill="#B9B4D0" stroke="#3A2E6E" stroke-width="3"/>' +
      '<polygon points="120,140 96,168 144,168" fill="#B9B4D0" stroke="#3A2E6E" stroke-width="3" stroke-linejoin="round"/>';
    [[20, leftItems], [220, rightItems]].forEach(function (pair) {
      s += '<line x1="' + (pair[0]) + '" y1="66" x2="' + (pair[0]) + '" y2="30" stroke="#3A2E6E" stroke-width="3"/>' +
        '<rect x="' + (pair[0] - 34) + '" y="30" width="68" height="14" rx="6" fill="#FFD166" stroke="#3A2E6E" stroke-width="3"/>' +
        '<text x="' + pair[0] + '" y="24" font-size="19" text-anchor="middle" fill="#5B4BE8" font-family="sans-serif" font-weight="bold">' + pair[1] + '</text>';
    });
    s += '</g></g>';
    return svg(s, 292, 210);
  };

  /* ============================================================
   *  ILUSTRASI TK (bentuk sederhana, warna, tambah/kurang visual)
   * ============================================================ */

  /** Bentuk datar sederhana untuk anak TK (tanpa garis ukur). */
  Art.tkShape = function (kind) {
    var fill = { circle: '#B8E6FF', square: '#C9F7C5', triangle: '#FFD166', rect: '#E0C6FF' }[kind] || '#FFD166';
    var stroke = { circle: '#1868A8', square: '#2F8C2B', triangle: '#D79A00', rect: '#7C4DFF' }[kind] || '#D79A00';
    var s = '';
    if (kind === 'circle') s = '<circle cx="120" cy="95" r="72" fill="' + fill + '" stroke="' + stroke + '" stroke-width="5"/>';
    else if (kind === 'square') s = '<rect x="48" y="23" width="144" height="144" rx="10" fill="' + fill + '" stroke="' + stroke + '" stroke-width="5"/>';
    else if (kind === 'triangle') s = '<polygon points="120,22 212,172 28,172" fill="' + fill + '" stroke="' + stroke + '" stroke-width="5" stroke-linejoin="round"/>';
    else s = '<rect x="36" y="48" width="168" height="94" rx="12" fill="' + fill + '" stroke="' + stroke + '" stroke-width="5"/>';
    return svg('<g>' + s + '</g>', 240, 196);
  };

  /** Bulatan berwarna untuk soal mengenal warna. */
  Art.colorBlob = function (hex) {
    var c = hex || '#FFC93C';
    return svg('<g><circle cx="120" cy="95" r="74" fill="' + c + '" stroke="#ffffff" stroke-width="7"/>' +
      '<circle cx="120" cy="95" r="74" fill="none" stroke="rgba(43,35,80,.15)" stroke-width="3"/></g>', 240, 196);
  };

  /** Dua kelompok benda berdampingan (untuk penjumlahan visual). */
  Art.twoGroups = function (left, right, item) {
    item = item || 'apple';
    var size = 40, gap = 6, pad = 12;
    function group(count) {
      var cols = Math.min(count, 3);
      var rows = Math.ceil(count / cols);
      var inner = '';
      for (var i = 0; i < count; i++) {
        var c = i % cols, r = Math.floor(i / cols);
        inner += Art.item(item, pad + c * (size + gap), pad + r * (size + gap), size);
      }
      return { inner: inner, w: cols * size + (cols - 1) * gap + pad * 2, h: rows * size + (rows - 1) * gap + pad * 2 };
    }
    var L = group(left), R = group(right);
    var H = Math.max(L.h, R.h);
    var plusX = L.w + 20;
    var rhsX = plusX + 34;
    var s = L.inner +
      '<rect x="0" y="0" width="' + L.w + '" height="' + L.h + '" rx="14" fill="none" stroke="#B9B4D0" stroke-width="3" stroke-dasharray="7 6"/>' +
      '<text x="' + plusX + '" y="' + (H / 2 + 12) + '" font-size="40" font-weight="bold" fill="#5B4BE8" font-family="sans-serif">+</text>' +
      '<g transform="translate(' + rhsX + ',0)">' + R.inner + '</g>' +
      '<rect x="' + rhsX + '" y="0" width="' + R.w + '" height="' + R.h + '" rx="14" fill="none" stroke="#B9B4D0" stroke-width="3" stroke-dasharray="7 6"/>';
    return svg('<g>' + s + '</g>', rhsX + R.w, H);
  };

  /** Baris pola warna; null berarti kotak "?" yang harus dilengkapi. */
  Art.colorPattern = function (items) {
    var size = 64, gap = 12;
    var s = '';
    (items || []).forEach(function (hex, i) {
      var x = i * (size + gap);
      if (hex === null) {
        s += '<rect x="' + x + '" y="4" width="' + size + '" height="' + size + '" rx="12" fill="#FFE9A8" stroke="#E0A02E" stroke-width="4"/>' +
          '<text x="' + (x + size / 2) + '" y="' + (4 + size / 2 + 14) + '" font-size="36" text-anchor="middle" fill="#C79400" font-family="sans-serif" font-weight="bold">?</text>';
        return;
      }
      s += '<rect x="' + x + '" y="4" width="' + size + '" height="' + size + '" rx="12" fill="' + hex + '" stroke="#ffffff" stroke-width="5"/>' +
        '<rect x="' + x + '" y="4" width="' + size + '" height="' + size + '" rx="12" fill="none" stroke="rgba(43,35,80,.15)" stroke-width="3"/>';
    });
    return svg('<g>' + s + '</g>', (items || []).length * (size + gap), size + 8);
  };

  /** Dua garis horizontal, salah satunya lebih panjang (panjang vs pendek). */
  Art.longShort = function (longTop) {
    var y1 = 40, y2 = 110, L = 200, S = 110;
    var topW = longTop ? L : S, botW = longTop ? S : L;
    var s = '<rect x="20" y="' + (y1 - 9) + '" width="' + topW + '" height="18" rx="9" fill="#FF8AC4" stroke="#D14D8A" stroke-width="3"/>' +
      '<rect x="20" y="' + (y2 - 9) + '" width="' + botW + '" height="18" rx="9" fill="#4EA8FF" stroke="#1868A8" stroke-width="3"/>';
    return svg('<g>' + s + '</g>', 250, 150);
  };

  /** Dua benda sejenis dengan ukuran berbeda (besar vs kecil). */
  Art.sizeCompare = function (item, bigSide) {
    item = item || 'apple';
    var big = 128, small = 64;
    var leftBig = bigSide === 'left';
    var lSize = leftBig ? big : small, rSize = leftBig ? small : big;
    var H = big + 16;
    var lx = 24, rx = 24 + big + 40;
    var s = '<g transform="translate(' + lx + ',' + (H - lSize - 8) + ')">' + Art.item(item, 0, 0, lSize) + '</g>' +
      '<g transform="translate(' + rx + ',' + (H - rSize - 8) + ')">' + Art.item(item, 0, 0, rSize) + '</g>';
    return svg('<g>' + s + '</g>', rx + big + 24, H);
  };

  /** Baris pola bentuk; null berarti kotak "?" yang harus dilengkapi. */
  Art.shapePattern = function (items) {
    var size = 64, gap = 12;
    var s = '';
    (items || []).forEach(function (name, i) {
      var x = i * (size + gap);
      if (name === null) {
        s += '<rect x="' + x + '" y="4" width="' + size + '" height="' + size + '" rx="12" fill="#FFE9A8" stroke="#E0A02E" stroke-width="4"/>' +
          '<text x="' + (x + size / 2) + '" y="' + (4 + size / 2 + 14) + '" font-size="36" text-anchor="middle" fill="#C79400" font-family="sans-serif" font-weight="bold">?</text>';
        return;
      }
      var tile = Art.tkShape(name).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      s += '<g transform="translate(' + x + ',4) scale(' + (size / 240) + ')">' + tile + '</g>';
    });
    return svg('<g>' + s + '</g>', (items || []).length * (size + gap), size + 8);
  };

  /** Beberapa benda dengan sebagiannya dicoret (pengurangan visual). */
  Art.minusVisual = function (total, take, item) {
    item = item || 'apple';
    var size = 46, gap = 8, cols = Math.min(total, 5);
    var rows = Math.ceil(total / cols);
    var s = '';
    for (var i = 0; i < total; i++) {
      var c = i % cols, r = Math.floor(i / cols);
      var x = c * (size + gap), y = r * (size + gap);
      var g = Art.item(item, x, y, size);
      if (i < take) {
        g = '<g opacity="0.32">' + g + '</g>' +
          '<line x1="' + (x + 8) + '" y1="' + (y + 8) + '" x2="' + (x + size - 8) + '" y2="' + (y + size - 8) + '" stroke="#FF5C5C" stroke-width="6" stroke-linecap="round"/>' +
          '<line x1="' + (x + size - 8) + '" y1="' + (y + 8) + '" x2="' + (x + 8) + '" y2="' + (y + size - 8) + '" stroke="#FF5C5C" stroke-width="6" stroke-linecap="round"/>';
      }
      s += g;
    }
    return svg('<g>' + s + '</g>', cols * size + (cols - 1) * gap, rows * size + (rows - 1) * gap);
  };

  /* ============================================================
   *  IKON / LENCANA
   * ============================================================ */
  Art.star = function (filled, size) {
    var s = size || 56;
    var pts = '32,4 41,24 63,26 47,40 52,62 32,50 12,62 17,40 1,26 23,24';
    return svg('<polygon points="' + pts + '" fill="' + (filled ? '#FFC93C' : '#E6E4F0') + '" stroke="' +
      (filled ? '#D79A00' : '#CFCCE0') + '" stroke-width="3" stroke-linejoin="round"/>', 64, 66)
      .replace('class="art-svg"', 'class="art-svg" style="width:' + s + 'px;height:auto"');
  };

  Art.trophy = function (size) {
    var s = size || 90;
    var inner =
      '<path d="M20 12h44v22a22 22 0 0 1-44 0z" fill="#FFD166" stroke="#D79A00" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M20 18H10a10 10 0 0 0 10 14M60 18h10a10 10 0 0 1-10 14" fill="none" stroke="#D79A00" stroke-width="4" stroke-linecap="round"/>' +
      '<rect x="36" y="54" width="12" height="12" fill="#E8B400" stroke="#D79A00" stroke-width="3"/>' +
      '<rect x="24" y="66" width="36" height="10" rx="4" fill="#E8B400" stroke="#D79A00" stroke-width="3"/>';
    return svg(inner, 80, 84).replace('class="art-svg"', 'class="art-svg" style="width:' + s + 'px;height:auto"');
  };

  Art.badge = function (emoji, color, size) {
    var s = size || 72;
    var inner =
      '<circle cx="40" cy="40" r="36" fill="' + (color || '#7C6BFF') + '" stroke="#fff" stroke-width="4"/>' +
      '<circle cx="40" cy="40" r="28" fill="none" stroke="#fff" stroke-width="2" opacity=".5" stroke-dasharray="4 4"/>' +
      '<text x="40" y="53" font-size="34" text-anchor="middle">' + emoji + '</text>';
    return svg(inner, 80, 80).replace('class="art-svg"', 'class="art-svg" style="width:' + s + 'px;height:auto"');
  };

  Art.medal = function (emoji, size) {
    var s = size || 84;
    var inner =
      '<path d="M22 6h14l10 26-12 8z" fill="#FF6B6B" stroke="#C4235A" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M50 6h14L54 32l-12-8z" fill="#4ECDC4" stroke="#2E8F88" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle cx="34" cy="52" r="22" fill="#FFD166" stroke="#D79A00" stroke-width="4"/>' +
      '<circle cx="34" cy="52" r="15" fill="none" stroke="#D79A00" stroke-width="2" opacity=".6"/>' +
      '<text x="34" y="60" font-size="20" text-anchor="middle">' + emoji + '</text>';
    return svg(inner, 80, 84).replace('class="art-svg"', 'class="art-svg" style="width:' + s + 'px;height:auto"');
  };

  /** Kartu pip (kartu angka) */
  Art.cards = function (pips) {
    var s = '';
    var cols = ['#FF6B6B', '#FFC93C', '#4ECDC4', '#7C6BFF'];
    for (var i = 0; i < 4; i++) {
      var x = i * 34;
      var on = pips > i;
      s += '<g transform="rotate(' + (i * 5 - 7) + ' ' + (x + 27) + ' 54)">' +
        '<rect x="' + x + '" y="12" width="54" height="82" rx="10" fill="#fff" stroke="#3A2E6E" stroke-width="4"/>' +
        (on ? '<circle cx="' + (x + 27) + '" cy="53" r="15" fill="' + cols[i] + '"/>' : '') +
        '</g>';
    }
    return svg('<g>' + s + '</g>', 168, 110);
  };

  Art.dice = function (value) {
    var pos = {
      1: [[32, 32]], 2: [[16, 16], [48, 48]],
      3: [[16, 16], [32, 32], [48, 48]],
      4: [[16, 16], [48, 16], [16, 48], [48, 48]],
      5: [[16, 16], [48, 16], [32, 32], [16, 48], [48, 48]],
      6: [[16, 14], [48, 14], [16, 32], [48, 32], [16, 50], [48, 50]]
    }[value] || [[32, 32]];
    var s = '<rect x="4" y="4" width="56" height="56" rx="12" fill="#fff" stroke="#5B4BE8" stroke-width="4"/>';
    pos.forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6" fill="#3A2E6E"/>'; });
    return svg(s, 64, 64);
  };

  /* ============================================================
   *  RENDER ART PERTAMA (dipakai topics.js)
   * ============================================================ */

  /**
   * Render ilustrasi berdasarkan deskripsi dari generator soal.
   * @param {object} a  deskripsi art
   * @returns {string} HTML SVG
   */
  Art.render = function (a) {
    if (!a) return '';
    switch (a.kind) {
      case 'items': {
        // grid objek untuk soal pencacahan
        var name = a.item || 'apple';
        var cols = Math.min(a.count, a.cols || 5);
        var box = 58, gap = 8;
        var rows = Math.ceil(a.count / cols);
        var W = cols * box + (cols - 1) * gap;
        var H = rows * box + (rows - 1) * gap;
        var s = '';
        for (var i = 0; i < a.count; i++) {
          var c = i % cols, r = Math.floor(i / cols);
          var jx = a.jitter ? (((i * 37) % 7) - 3) : 0;
          var jy = a.jitter ? (((i * 53) % 7) - 3) : 0;
          s += Art.item(name, c * (box + gap) + jx, r * (box + gap) + jy, box - 4);
        }
        return svg('<g>' + s + '</g>', W, H);
      }
      case 'groups': {
        // beberapa kelompok objek (mis. 3 x 4 apel)
        var name2 = a.item || 'apple';
        var cols2 = a.per || 5, size2 = 40;
        var s2 = '';
        for (var g = 0; g < a.groups; g++) {
          var gx = g * (a.per * (size2 + 2) + 14);
          var rowH = Math.ceil(a.per / 5) * (size2 + 2);
          for (var k = 0; k < a.per; k++) {
            var cc = k % 5, rr = Math.floor(k / 5);
            s2 += Art.item(name2, gx + cc * (size2 + 2), rr * (size2 + 2), size2 - 2);
          }
          s2 += '<rect x="' + (gx - 6) + '" y="-6" width="' + (a.per > 5 ? 5 * (size2 + 2) : a.per * (size2 + 2)) +
            '" height="' + (rowH + 12) + '" rx="12" fill="none" stroke="#B9B4D0" stroke-width="3" stroke-dasharray="7 6"/>';
        }
        var totalW = a.groups * (a.per * (size2 + 2) + 14) + 8;
        return svg('<g>' + s2 + '</g>', totalW, Math.ceil(a.per / 5) * (size2 + 2) + 16);
      }
      case 'clock': return Art.clock(a.h, a.m);
      case 'money': return Art.money(a.coins, a.notes);
      case 'fractionCircle': return Art.fractionCircle(a.n, a.d, a.color);
      case 'fractionBar': return Art.fractionBar(a.n, a.d, a.color);
      case 'rect': return Art.rectSides(a.w, a.h, a.hl, a.hlLabel);
      case 'cube': return Art.cube(a.a, a.b, a.c);
      case 'numberline': return Art.numberLine(a.min, a.max, a.points, a.highlight);
      case 'placeValue': return Art.placeValue(a.num);
      case 'pattern': return Art.patternRow(a.items);
      case 'shape': return Art.shape(a.shape, a.labels);
      case 'balance': return Art.balance(a.left, a.right, a.leftItems, a.rightItems);
      case 'dice': return Art.dice(a.value);
      case 'cards': return Art.cards(a.pips);
      case 'tkShape': return Art.tkShape(a.shape);
      case 'color': return Art.colorBlob(a.hex);
      case 'twoGroups': return Art.twoGroups(a.left, a.right, a.item);
      case 'minusVisual': return Art.minusVisual(a.total, a.take, a.item);
      case 'shapePattern': return Art.shapePattern(a.items);
      case 'colorPattern': return Art.colorPattern(a.items);
      case 'longShort': return Art.longShort(a.longTop);
      case 'sizeCompare': return Art.sizeCompare(a.item, a.bigSide);
      case 'none': return '';
      default: return '';
    }
  };

})(window);
