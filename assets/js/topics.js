/* ============================================================
 *  topics.js  —  Bank soal matematika SD
 *
 *  Setiap topic adalah fungsi (rng, level) => soal:
 *    {
 *      text : "2 + 3 = ?"          // teks soal (HTML aman, <b> boleh)
 *      art  : { kind:'items', ...} // deskripsi ilustrasi (opsional)
 *      answer : 5                   // nilai jawaban benar (angka/pecahan)
 *      answers : ["4","5","6","7"]  // 4 pilihan (teks)
 *      answerIndex : 1              // posisi jawaban benar
 *      topic : 'addSmall'           // label topik (untuk statistik)
 *      topicName : 'Penjumlahan'     // nama enak untuk ditampilkan
 *      hint : "..."                 // petunjuk singkat
 *    }
 *
 *  Tidak ada soal yang diulang 2x dalam satu level (dicek oleh game.js).
 * ============================================================ */
(function (global) {
  'use strict';

  var MG = global.MG = global.MG || {};
  var U = MG.utils;
  var Topics = MG.topics = {};

  var ri = U.randInt, pk = U.pick, sh = U.shuffle;

  /* ============================================================
   *  PEMBANTU
   * ============================================================ */

  /** Bikin soal dari nilai jawaban angka biasa. */
  function num(text, answer, o) {
    o = o || {};
    // Safety net: kalau jawaban bukan bilangan bulat, desimalnya dideteksi otomatis
    // supaya pilihan jawaban tidak pernah "membulatkan" jawaban yang benar.
    if (o.dec == null) o.dec = U.decimalsOf(answer);
    var safeAnswer = o.dec ? Math.round(answer * Math.pow(10, o.dec)) / Math.pow(10, o.dec) : Math.round(answer);
    var res = U.buildOptions(safeAnswer, o);
    return {
      text: text,
      art: o.art || null,
      answer: safeAnswer,
      answers: res.options,
      answerIndex: res.answerIndex,
      topic: o.topic,
      topicName: o.topicName,
      hint: o.hint || ''
    };
  }

  /** Bikin soal dari jawaban teks (mis. "3/4"). */
  function txt(text, answerText, wrongTexts, o) {
    o = o || {};
    var res = U.buildTextOptions(answerText, wrongTexts, o.rng || Math.random);
    return {
      text: text,
      art: o.art || null,
      answer: answerText,
      answers: res.options,
      answerIndex: res.answerIndex,
      topic: o.topic,
      topicName: o.topicName,
      hint: o.hint || ''
    };
  }

  /* Kata & nama untuk soal cerita */
  var NAMA = ['Budi', 'Sari', 'Dodo', 'Lina', 'Riko', 'Maya', 'Toni', 'Citra', 'Adi', 'Nisa', 'Gilang', 'Putri'];
  var BARANG = ['apel', 'bola', 'buku', 'pena', 'kue', 'stiker', 'kapur', 'kelering', 'gula', 'permen'];
  var HEWAN = ['kelinci', 'ayam', 'kucing', 'burung', 'ikan', 'kambing', 'sapi', 'anjing'];
  var WARNA = ['merah', 'biru', 'kuning', 'hijau', 'pink', 'ungu', 'jingga', 'cokelat'];

  /* ============================================================
   *  LEVEL 1-3: PENGHITUNGAN & PENJUMLAHAN KECIL
   * ============================================================ */

  Topics.count = function (rng, lv) {
    var max = Math.min(lv.scale.countMax, 12);
    var n = ri(rng, 3, max);
    var item = pk(rng, ['apple', 'star', 'fish', 'flower', 'balloon', 'cookie', 'duck', 'heart', 'leaf']);
    var art = { kind: 'items', count: n, item: item, jitter: true };
    var q = 'Berapa banyak <b>' + (Art_name(item)) + '</b> yang terlihat?';
    return num(q, n, {
      rng: rng, min: 1, spread: 2, topic: 'count', topicName: 'Menghitung',
      art: art,
      hint: 'Hitung satu per satu dari kiri ke kanan.'
    });
  };

  function Art_name(k) {
    return (MG.art.itemNames[k] || 'benda');
  }

  Topics.shapeCount = function (rng, lv) {
    var shapes = ['persegi', 'segitiga', 'lingkaran', 'persegi panjang', 'jajar genjang'];
    var shapesArt = { 'persegi': 'square', 'segitiga': 'triangle', 'lingkaran': 'circle', 'persegi panjang': 'rect', 'jajar genjang': 'trapezoid' };
    var s = pk(rng, shapes);
    var n = ri(rng, 2, 6);
    var art = { kind: 'shape', shape: shapesArt[s], labels: {} };
    var q = 'Gambar di atas adalah bentuk <b>' + s + '</b>. Kalau ada <b>' + n + '</b> ' + s + ', berapakah jumlah sisinya jika dijumlahkan?';
    // sederhana: jumlah sisi * jumlah -> hasil hitung sederhana
    var sisi = { 'persegi': 4, 'segitiga': 3, 'lingkaran': 0, 'persegi panjang': 4, 'jajar genjang': 4 }[s];
    var ans = sisi * n;
    return num(q, ans, {
      rng: rng, min: 0, spread: 1, step: Math.max(1, Math.floor(ans / 5)), topic: 'shapeCount', topicName: 'Bentuk & Sisi',
      art: art,
      hint: 'Banyaknya ' + s + ' = ' + sisi + ', jumlah sisinya ' + ans + '.'
    });
  };

  Topics.addSmall = function (rng, lv) {
    var max = lv.scale.max;
    var a = ri(rng, 1, Math.max(2, max - 2));
    var b = ri(rng, 1, Math.max(2, Math.max(2, max - a)));
    var useArt = lv.n <= 4 && U.chance(rng, 0.45);
    var art = useArt ? { kind: 'groups', groups: a, per: b, item: pk(rng, ['apple', 'star', 'ball', 'fish']) } : null;
    var q = useArt
      ? 'Ada <b>' + a + '</b> kelompok. Setiap kelompok berisi <b>' + b + '</b> bola. Berapa jumlah semuanya?'
      : '<b>' + a + '</b> + <b>' + b + '</b> = ?';
    return num(q, a + b, {
      rng: rng, min: 0, spread: 2, topic: 'addSmall', topicName: 'Penjumlahan',
      art: art,
      hint: a + ' + ' + b + ' = ' + (a + b) + '. Ingat: ' + (a + b - a) + ' ditambah ' + a + '.'
    });
  };

  Topics.subSmall = function (rng, lv) {
    var max = lv.scale.max;
    var a = ri(rng, Math.min(4, max), max);
    var b = ri(rng, 1, Math.max(1, a - 1));
    var q = '<b>' + a + '</b> − <b>' + b + '</b> = ?';
    return num(q, a - b, {
      rng: rng, min: 0, spread: 2, topic: 'subSmall', topicName: 'Pengurangan',
      hint: 'Dari ' + a + ' dikurangi ' + b + '. Coba hitung mundur ' + b + ' langkah.'
    });
  };

  Topics.missingAdd = function (rng, lv) {
    var max = lv.scale.max;
    var a = ri(rng, 1, max - 2);
    var sum = a + ri(rng, 1, Math.min(max - a, 8));
    var q = '<b>' + a + '</b> + … = <b>' + sum + '</b>  →  berapakah yang hilang?';
    return num(q, sum - a, {
      rng: rng, min: 1, spread: 1, topic: 'missingAdd', topicName: 'Angka Hilang',
      hint: sum + ' − ' + a + ' = ' + (sum - a) + '.'
    });
  };

  Topics.compare = function (rng, lv) {
    var max = Math.max(4, Math.min(lv.scale.max, 1000));
    var a = ri(rng, 1, max);
    var b = ri(rng, 1, max);
    var guard = 0;
    while (b === a && guard++ < 20) b = ri(rng, 1, max);
    if (b === a) b = (a % max) + 1;
    var bigger = a > b ? a : b;
    var smaller = a > b ? b : a;
    var mode = ri(rng, 0, 2);
    var q, ans;
    if (mode === 0) {
      q = 'Bilangan mana yang <b>lebih besar</b>?';
      ans = bigger;
    } else if (mode === 1) {
      q = 'Bilangan mana yang <b>lebih kecil</b>?';
      ans = smaller;
    } else {
      q = 'Bandingkan <b>' + a + '</b> dan <b>' + b + '</b>. Selisihnya berapa?';
      ans = bigger - smaller;
    }
    return num(q, ans, {
      rng: rng, min: 0, spread: Math.max(2, Math.floor(max / 12)), step: max > 200 ? 5 : 1,
      topic: 'compare', topicName: 'Bandingkan Bilangan',
      art: { kind: 'balance', left: a, right: b, leftItems: a, rightItems: b },
      hint: mode === 2 ? (bigger + ' − ' + smaller + ' = ' + ans + '.') : ('Yang lebih besar adalah ' + bigger + '.')
    });
  };

  Topics.pattern = function (rng, lv) {
    var kinds = ['tambah', 'kurang'];
    var k = pk(rng, kinds);
    var start = ri(rng, 1, lv.n <= 3 ? 5 : 20);
    var step = ri(rng, 2, lv.n <= 3 ? 4 : 9);
    var items = [], val = start;
    var n = 5;
    for (var i = 0; i < n; i++) { items.push(val); val += (k === 'tambah' ? step : -step); }
    if (k === 'kurang' && items[items.length - 1] < 0) { start += step * n; val = start; items = []; for (i = 0; i < n; i++) { items.push(val); val -= step; } }
    var blankIdx = ri(rng, 1, n - 2);
    var answer = items[blankIdx];
    var shown = items.slice();
    shown[blankIdx] = null;
    return num('Lengkapi pola bilangan berikut!', answer, {
      rng: rng, min: 0, spread: Math.max(1, Math.floor(step / 2)), step: step > 4 ? 2 : 1,
      topic: 'pattern', topicName: 'Pola Bilangan',
      art: { kind: 'pattern', items: shown },
      hint: 'Setiap angka ' + (k === 'tambah' ? 'ditambah ' + step : 'dikurangi ' + step) + '.'
    });
  };

  /* ============================================================
   *  LEVEL 4-6: SAMPAI 100, JAM, UANG
   * ============================================================ */

  Topics.add100 = function (rng, lv) {
    var max = lv.scale.max;
    var tens = ri(rng, 1, Math.floor(max / 10) - 1) * 10;
    var ones = ri(rng, 1, 9);
    var a = tens + ones;
    var b = ri(rng, 1, Math.max(1, max - a));
    // pendek: tambah satuan & tegak lurus bila memungkinkan
    var art = null;
    if (U.chance(rng, 0.35)) {
      art = { kind: 'numberline', min: 0, max: max > 200 ? 100 : Math.max(20, Math.ceil(a / 10) * 10), points: [a, a + b], highlight: 1 };
    }
    return num('<b>' + a + '</b> + <b>' + b + '</b> = ?', a + b, {
      rng: rng, min: 0, spread: 5, step: 1, topic: 'add100', topicName: 'Penjumlahan',
      art: art,
      hint: 'Jumlahkan satuan dulu, lalu puluhan. (' + a + ' + ' + b + ')'
    });
  };

  Topics.sub100 = function (rng, lv) {
    var max = lv.scale.max;
    var a = ri(rng, Math.max(20, Math.floor(max * 0.4)), max);
    var b = ri(rng, 1, Math.max(1, a - Math.floor(max * 0.2)));
    return num('<b>' + a + '</b> − <b>' + b + '</b> = ?', a - b, {
      rng: rng, min: 0, spread: 5, topic: 'sub100', topicName: 'Pengurangan',
      hint: 'Kurangi satuannya dulu, lalu kurangirepository tegak lurus dengan cara yang sama.'
    });
  };

  Topics.missing100 = function (rng, lv) {
    var max = lv.scale.max;
    var a = ri(rng, 10, max - 10);
    var sum = a + ri(rng, 5, Math.min(50, max - a));
    return num('<b>' + a + '</b> + … = <b>' + sum + '</b>', sum - a, {
      rng: rng, min: 1, spread: 3, topic: 'missing100', topicName: 'Angka Hilang',
      hint: sum + ' − ' + a + ' = ' + (sum - a) + '.'
    });
  };

  Topics.numberline = function (rng, lv) {
    var max = lv.scale.max;
    var stepSize = pk(rng, [2, 5, 10]);
    var start = ri(rng, 0, 20);
    var end = Math.min(max, start + ri(rng, 3, 6) * stepSize);
    var pts = [start];
    for (var i = 1; i <= 4; i++) pts.push(Math.min(end, start + i * stepSize));
    var hi = ri(rng, 1, pts.length - 1);
    var ans = pts[hi];
    var q = 'Perhatikan garis bilangan. Berapakah bilangan yang ditandai <b>titik merah</b>?';
    return num(q, ans, {
      rng: rng, min: 0, spread: Math.max(1, stepSize / 2), step: stepSize > 4 ? 2 : 1,
      topic: 'numberline', topicName: 'Garis Bilangan',
      art: { kind: 'numberline', min: Math.max(0, start - stepSize * 2), max: pts[pts.length - 1] + stepSize * 2, points: pts, highlight: hi },
      hint: 'Setiap langkah bertambah ' + stepSize + '.'
    });
  };

  Topics.placeValue2 = function (rng, lv) {
    var n = ri(rng, 10, lv.scale.max);
    var tens = Math.floor(n / 10) % 10;
    var askTens = U.chance(rng, 0.5);
    var q = 'Pada bilangan <b>' + n + '</b>, berapakah nilai <b>' + (askTens ? 'puluhan' : 'satuan') + '</b>-nya?';
    return num(q, askTens ? tens : n % 10, {
      rng: rng, min: 0, spread: 1, topic: 'placeValue2', topicName: 'Nilai Tempat',
      art: { kind: 'placeValue', num: n },
      hint: 'Tulis ' + n + ' → nilai tempatnya: ' + (askTens ? tens + ' puluh' : (n % 10) + ' satuan') + '.'
    });
  };

  Topics.placeValue3 = function (rng, lv) {
    var n = ri(rng, 100, lv.scale.max);
    var ask = pk(rng, ['ratusan', 'puluhan', 'satuan']);
    var val = { 'ratusan': Math.floor(n / 100) % 10, 'puluhan': Math.floor(n / 10) % 10, 'satuan': n % 10 }[ask];
    var q = 'Pada bilangan <b>' + n + '</b>, berapakah nilai <b>' + ask + '</b>-nya?';
    return num(q, val, {
      rng: rng, min: 0, spread: 1, topic: 'placeValue3', topicName: 'Nilai Tempat',
      art: { kind: 'placeValue', num: n },
      hint: ask.charAt(0).toUpperCase() + ask.slice(1) + ' dari ' + n + ' adalah ' + val + '.'
    });
  };

  Topics.timeHour = function (rng, lv) {
    var h = ri(rng, 1, 12);
    return num('Jam berapa yang ditunjukkan? <b>(momen tepat di jam)</b>', h, {
      rng: rng, min: 1, max: 12, spread: 1, topic: 'timeHour', topicName: 'Membaca Jam',
      art: { kind: 'clock', h: h, m: 0 },
      hint: 'Jarum panjang di angka 12, jarum pendek menunjuk angka ' + h + '.'
    });
  };

  Topics.timeMinute = function (rng, lv) {
    var h = ri(rng, 1, 12);
    var m = pk(rng, [15, 30, 45]);
    var jam = (m === 15 ? h + 0.25 : m === 30 ? h + 0.5 : h + 0.75);
    // gunakan format "h:mm" agar tidak ada desimal
    var label = h + ':' + (m === 15 ? '15' : m === 30 ? '30' : '45');
    return txt('Jam berapa yang ditunjukkan oleh jam di atas?', label, [
      h + ':00', h + ':10', h + ':20', h + ':25', h + ':35', h + ':40', h + ':50',
      (h % 12 + 1) + ':15', (h % 12 + 1) + ':30', (h % 12 + 1) + ':45'
    ].filter(function (x) { return x !== label; }).slice(0, 8), {
      rng: rng, topic: 'timeMinute', topicName: 'Membaca Jam',
      art: { kind: 'clock', h: h, m: m },
      hint: 'Jarum panjang di angka ' + (m / 5) + ' → ' + m + ' menit.'
    });
  };

  Topics.moneySimple = function (rng, lv) {
    var nCoins = ri(rng, 2, 6);
    var nNotes = ri(rng, 0, 2);
    var total = nCoins * 100 + nNotes * 5000;
    var q = 'Berapa rupiah semua uang di atas?';
    return num(q, total, {
      rng: rng, min: 0, spread: Math.max(100, nCoins * 100), step: 100,
      topic: 'moneySimple', topicName: 'Uang',
      art: { kind: 'money', coins: nCoins, notes: nNotes },
      hint: nCoins + ' koin × 100 = ' + (nCoins * 100) + (nNotes ? ', dan ' + nNotes + ' uang 5000 = ' + (nNotes * 5000) : '') + '.'
    });
  };

  /* ============================================================
   *  LEVEL 6-10: PERKALIAN & PEMBAGIAN
   * ============================================================ */

  Topics.mul25 = function (rng, lv) {
    var k = pk(rng, [2, 5]);
    var n = ri(rng, 2, 10);
    var q = '<b>' + n + '</b> × <b>' + k + '</b> = ?';
    var useGroups = U.chance(rng, 0.4);
    return num(q, n * k, {
      rng: rng, min: 0, spread: k, step: 1, topic: 'mul25', topicName: 'Perkalian',
      art: useGroups ? { kind: 'groups', groups: k, per: n, item: pk(rng, ['ball', 'star', 'flower']) } : null,
      hint: n + ' × ' + k + ' = ' + (n * k) + '. (tambah ' + n + ' sebanyak ' + k + ' kali)'
    });
  };

  Topics.mul345 = function (rng, lv) {
    var k = pk(rng, [3, 4]);
    var n = ri(rng, 2, 12);
    return num('<b>' + n + '</b> × <b>' + k + '</b> = ?', n * k, {
      rng: rng, min: 0, spread: k, step: 1, topic: 'mul345', topicName: 'Perkalian',
      hint: 'Tambah ' + n + ' sebanyak ' + k + ' kali.'
    });
  };

  Topics.timesTable = function (rng, lv) {
    var a = ri(rng, 2, 10), b = ri(rng, 2, 10);
    var ans = a * b;
    return num('Berapa <b>' + a + '</b> × <b>' + b + '</b>?', ans, {
      rng: rng, min: 0, spread: Math.max(1, Math.floor(a / 2)), step: 1,
      topic: 'timesTable', topicName: 'Perkalian',
      hint: a + ' × ' + b + ' = ' + ans + '.'
    });
  };

  Topics.divSmall = function (rng, lv) {
    var k = ri(rng, 2, 10);
    var n = ri(rng, 2, 10);
    var total = n * k;
    return num('<b>' + total + '</b> ÷ <b>' + k + '</b> = ?', n, {
      rng: rng, min: 0, spread: Math.max(1, Math.floor(n / 2)), step: 1,
      topic: 'divSmall', topicName: 'Pembagian',
      hint: total + ' dibagi ' + k + ' sama dengan ' + n + '.'
    });
  };

  Topics.div25 = function (rng, lv) {
    var k = pk(rng, [2, 5]);
    var n = ri(rng, 2, 20);
    var total = n * k;
    return num('<b>' + total + '</b> ÷ <b>' + k + '</b> = ?', n, {
      rng: rng, min: 0, spread: Math.max(1, Math.floor(n / 3)), step: 1,
      topic: 'div25', topicName: 'Pembagian',
      hint: 'Berapa kali ' + k + ' dalam ' + total + '? = ' + n + '.'
    });
  };

  Topics.beforeAfter = function (rng, lv) {
    var n = ri(rng, 10, lv.scale.max);
    var askB = U.chance(rng, 0.5);
    var ans = askB ? n + 1 : n - 1;
    return num('Bilangan <b>' + (askB ? 'setelah' : 'sebelum') + '</b> <b>' + n + '</b> adalah?', ans, {
      rng: rng, min: 0, spread: 2, topic: 'beforeAfter', topicName: 'Bilangan',
      hint: (askB ? 'Tambahkan 1 ke ' + n : 'Kurangi 1 dari ' + n) + ' → ' + ans + '.'
    });
  };

  Topics.add200 = function (rng, lv) {
    var max = lv.scale.max;
    var a = ri(rng, 10, max - 5);
    var b = ri(rng, 5, Math.max(5, max - a));
    return num('<b>' + a + '</b> + <b>' + b + '</b> = ?', a + b, {
      rng: rng, min: 0, spread: 10, step: 1, topic: 'add200', topicName: 'Penjumlahan',
      hint: a + ' + ' + b + ' = ' + (a + b) + '.'
    });
  };

  Topics.sub200 = function (rng, lv) {
    var max = lv.scale.max;
    var a = ri(rng, Math.floor(max * 0.3), max);
    var b = ri(rng, 5, Math.max(5, a - Math.floor(max * 0.1)));
    return num('<b>' + a + '</b> − <b>' + b + '</b> = ?', a - b, {
      rng: rng, min: 0, spread: 10, topic: 'sub200', topicName: 'Pengurangan',
      hint: a + ' − ' + b + ' = ' + (a - b) + '.'
    });
  };

  Topics.add3digit = function (rng, lv) {
    var a = ri(rng, 100, lv.scale.max);
    var b = ri(rng, 100, Math.max(100, Math.min(900, lv.scale.max - a + 100)));
    return num('<b>' + a + '</b> + <b>' + b + '</b> = ?', a + b, {
      rng: rng, min: 0, spread: 50, step: 10, topic: 'add3digit', topicName: 'Penjumlahan',
      hint: 'Jumlahkan ribuan → ratusan → puluhan → satuan.'
    });
  };

  Topics.sub3digit = function (rng, lv) {
    var a = ri(rng, 300, lv.scale.max);
    var b = ri(rng, 100, Math.max(100, a - 50));
    return num('<b>' + a + '</b> − <b>' + b + '</b> = ?', a - b, {
      rng: rng, min: 0, spread: 50, step: 10, topic: 'sub3digit', topicName: 'Pengurangan',
      hint: 'Kurangkan berurutan dari satuan ke ribuan.'
    });
  };

  Topics.wordAddSub = function (rng, lv) {
    var nama = pk(rng, NAMA), barang = pk(rng, BARANG);
    var a = ri(rng, 5, 30);
    var b = ri(rng, 1, Math.min(20, a));
    var tambah = U.chance(rng, 0.5);
    var q = tambah
      ? '<b>' + nama + '</b> punya <b>' + a + '</b> ' + barang + '. Ibu memberi lagi <b>' + b + '</b>. Berapa ' + barang + ' yang dimiliki ' + nama + ' sekarang?'
      : '<b>' + nama + '</b> punya <b>' + a + '</b> ' + barang + '. ' + nama + ' memberi <b>' + b + '</b> ' + barang + ' ke teman. Berapa yang tersisa?';
    var ans = tambah ? a + b : a - b;
    return num(q, ans, {
      rng: rng, min: 0, spread: 5, topic: 'wordAddSub', topicName: 'Soal Cerita',
      hint: (tambah ? 'Tambah: ' : 'Kurang: ') + a + (tambah ? ' + ' : ' − ') + b + ' = ' + ans + '.'
    });
  };

  Topics.wordMulDiv = function (rng, lv) {
    var nama = pk(rng, NAMA), barang = pk(rng, BARANG);
    var k = ri(rng, 2, 5), n = ri(rng, 2, 8);
    var mul = U.chance(rng, 0.5);
    var q = mul
      ? '<b>' + nama + '</b> mengoleksi <b>' + k + '</b> bungkus ' + barang + '. Tiap bungkus berisi <b>' + n + '</b> ' + barang + '. Berapa jumlah ' + barang + ' semua?'
      : '<b>' + nama + '</b> punya <b>' + (k * n) + '</b> ' + barang + '. ' + nama + ' membaginya kepada <b>' + k + '</b> teman sama banyak. Berapa yang diterima tiap teman?';
    var ans = mul ? k * n : n;
    return num(q, ans, {
      rng: rng, min: 0, spread: Math.max(2, n), topic: 'wordMulDiv', topicName: 'Soal Cerita',
      hint: (mul ? 'Perkalian: ' : 'Pembagian: ') + (mul ? (k + ' × ' + n) : (k * n + ' ÷ ' + k)) + ' = ' + ans + '.'
    });
  };

  Topics.wordMulti = function (rng, lv) {
    var nama = pk(rng, NAMA), barang = pk(rng, BARANG), hewan = pk(rng, HEWAN);
    var k = ri(rng, 3, 6), n = ri(rng, 3, 9), extra = ri(rng, 2, 10);
    var mode = ri(rng, 0, 2);
    var q, ans, hint;

    if (mode === 0) {
      // (kandang x isi) + tambahan
      q = 'Di zoo ada <b>' + k + '</b> kandang. Tiap kandang berisi <b>' + n + '</b> ' + hewan +
        '. Petugas menambah <b>' + extra + '</b> ' + hewan + ' lagi di luar kandang. ' +
        'Berapa total ' + hewan + ' sekarang?';
      ans = k * n + extra;
      hint = 'Pertama ' + k + ' \u00d7 ' + n + ' = ' + (k * n) + ', lalu ' + (k * n) + ' + ' + extra + ' = ' + ans + '.';
    } else if (mode === 1) {
      // beli sebagian, sisanya
      var punya = k * n + extra;
      var beli = k * extra;
      q = 'Warung punya <b>' + punya + '</b> ' + barang + '. <b>' + nama + '</b> membeli <b>' +
        beli + '</b> ' + barang + '. Berapa ' + barang + ' yang tersisa?';
      ans = punya - beli;
      hint = punya + ' \u2212 ' + beli + ' = ' + ans + ' ' + barang + '.';
    } else {
      // (total / per) - dipakai
      var per = pk(rng, [3, 4, 5, 6]);
      var paket = ri(rng, 3, 8);
      var total = per * paket;
      var dipakai = ri(rng, 1, paket - 1);
      q = 'Ada <b>' + total + '</b> ' + barang + ' yang dibagi rata ke <b>' + paket + '</b> orang. ' +
        nama + ' memakai <b>' + dipakai + '</b> ' + barang + '. Sisa milik ' + nama + ' berapa?';
      ans = per - dipakai;
      hint = total + ' \u00f7 ' + paket + ' = ' + per + ' per orang, lalu ' + per + ' \u2212 ' + dipakai + ' = ' + ans + '.';
    }
    return num(q, ans, {
      rng: rng, min: 0, spread: Math.max(2, Math.floor(Math.max(1, ans) / 2)),
      topic: 'wordMulti', topicName: 'Soal Cerita', hint: hint
    });
  };

  /* ============================================================
   *  LEVEL 11-13: KELILING, LUAS, PECAHAN, DESIMAL
   * ============================================================ */

  Topics.rectArea = function (rng, lv) {
    var w = ri(rng, 2, 12), h = ri(rng, 2, 12);
    var ans = w * h;
    return num('Luas persegi panjang di atas berapa? (satuan cm²)', ans, {
      rng: rng, min: 0, spread: Math.max(2, Math.floor(w / 2)), step: 1,
      topic: 'rectArea', topicName: 'Luas',
      art: { kind: 'rect', w: w, h: h, hl: 'w', hlLabel: w + ' cm' },
      hint: 'Luas = panjang × lebar = ' + w + ' × ' + h + ' = ' + ans + ' cm².'
    });
  };

  Topics.rectPerimeter = function (rng, lv) {
    var w = ri(rng, 2, 12), h = ri(rng, 2, 12);
    var ans = 2 * (w + h);
    return num('Keliling persegi panjang di atas berapa? (satuan cm)', ans, {
      rng: rng, min: 0, spread: Math.max(2, Math.floor(w)), step: 1,
      topic: 'rectPerimeter', topicName: 'Keliling',
      art: { kind: 'rect', w: w, h: h, hl: 'h', hlLabel: h + ' cm' },
      hint: 'Keliling = 2 × (p + l) = 2 × (' + w + ' + ' + h + ') = ' + ans + ' cm.'
    });
  };

  Topics.compositeArea = function (rng, lv) {
    // Luas bangun = luas penuh dikurangi sudut yang dipotong
    var w = ri(rng, 6, 14), h = ri(rng, 5, 12);
    var sw = ri(rng, 2, Math.floor(w / 2)), sh = ri(rng, 2, Math.floor(h / 2));
    var ans = w * h - sw * sh;
    var art = {
      kind: 'shape', shape: 'rect',
      labels: { w: w + ' cm', h: h + ' cm' }
    };
    return num('Luas daerah <b>biru</b> pada gambar itu berapa? (Hitung dari luas penuh ' + w +
      ' \u00d7 ' + h + ', dikurangi potongan merah ' + sw + ' \u00d7 ' + sh + '.)', ans, {
      rng: rng, min: 0, spread: Math.max(3, Math.floor(sw * sh / 3)), step: 1,
      topic: 'compositeArea', topicName: 'Luas Majemuk', art: art,
      hint: 'Penuh: ' + w + ' \u00d7 ' + h + ' = ' + (w * h) + '. Dipotong: ' + sw + ' \u00d7 ' + sh +
        ' = ' + (sw * sh) + '. Selisih = ' + ans + '.'
    });
  };

  Topics.volume = function (rng, lv) {
    var a = ri(rng, 2, 8), b = ri(rng, 2, 8), c = pk(rng, [1, 2, 2, 3]);
    var ans = a * b * c;
    return num('Volume balok di atas berapa? (satuan cm³)', ans, {
      rng: rng, min: 0, spread: Math.max(3, Math.floor(a)), step: 1,
      topic: 'volume', topicName: 'Volume',
      art: { kind: 'cube', a: a, b: b, c: c },
      hint: 'Volume = p × l × t = ' + a + '×' + b + '×' + c + ' = ' + ans + ' cm³.'
    });
  };

  Topics.fractionIntro = function (rng, lv) {
    var d = pk(rng, [2, 3, 4, 5, 6, 8]);
    var n = ri(rng, 1, d);
    var artKind = U.chance(rng, 0.5) ? 'fractionCircle' : 'fractionBar';
    return txt('Bilangan pecahan yang ditunjukkan pada gambar adalah?', n + '/' + d, [
      (d - n) + '/' + d, n + '/' + (d + 1), (n + 1) + '/' + d, (n * 2) + '/' + (d * 2),
      '1/' + d, n + '/' + (d * 2)
    ].filter(function (x) { return x !== n + '/' + d && x.indexOf('/') > 0; }), {
      rng: rng, topic: 'fractionIntro', topicName: 'Pecahan',
      art: { kind: artKind, n: n, d: d },
      hint: 'Bagian yang diwarnai ' + n + ' dari total ' + d + ' bagian → ' + n + '/' + d + '.'
    });
  };

  Topics.fractionCompare = function (rng, lv) {
    // penyebut minimal 4 supaya ada beberapa pembilang berbeda
    var d = pk(rng, [4, 5, 6, 8, 10, 12]);
    var n1 = ri(rng, 1, d - 1), n2 = ri(rng, 1, d - 1);
    var guard = 0;
    while (n2 === n1 && guard++ < 20) n2 = ri(rng, 1, d - 1);
    if (n2 === n1) n2 = (n1 % (d - 1)) + 1;
    var bigger = n1 > n2 ? n1 + '/' + d : n2 + '/' + d;
    var smaller = n1 > n2 ? n2 + '/' + d : n1 + '/' + d;
    var askBig = U.chance(rng, 0.5);
    var answerText = askBig ? bigger : smaller;
    return txt('Mana yang lebih <b>' + (askBig ? 'besar' : 'kecil') + '</b>?', answerText,
      [smaller, bigger, '1/' + d, (n1 + 1) + '/' + d, (n2 + 1) + '/' + d]
        .filter(function (x, i, a) { return a.indexOf(x) === i && x !== answerText; }), {
        rng: rng, topic: 'fractionCompare', topicName: 'Bandingkan Pecahan',
        art: { kind: 'fractionCircle', n: n1, d: d },
        hint: 'Penyebut sama (' + d + '), jadi bandingkan pembilang: ' + n1 + ' vs ' + n2 + '.'
      });
  };

  Topics.fractionAddSame = function (rng, lv) {
    var d = pk(rng, [4, 5, 6, 8, 10, 12]);
    var a = ri(rng, 1, d - 2), b = ri(rng, 1, d - a);
    var s = a + b;
    var whole = Math.floor(s / d), rem = s % d;
    var ansText = rem === 0 ? String(whole) : (whole > 0 ? (whole + ' ' + rem + '/' + d) : (rem + '/' + d));
    return txt('<b>' + a + '/' + d + '</b> + <b>' + b + '/' + d + '</b> = ?', ansText, [
      (a + b) + '/' + (d * 2), (a * b) + '/' + d, rem + '/' + d,
      (s) + '/' + (d + 1), a + '/' + (a + b)
    ].filter(function (x) { return x !== ansText; }), {
      rng: rng, topic: 'fractionAddSame', topicName: 'Penjumlahan Pecahan',
      art: { kind: 'fractionBar', n: a, d: d },
      hint: 'Penyebut sama, jumlahkan pembilang: ' + a + ' + ' + b + ' = ' + s + '/' + d + (rem === 0 ? ' = ' + whole : '') + '.'
    });
  };

  Topics.decimalIntro = function (rng, lv) {
    var whole = ri(rng, 1, 30);
    var d = ri(rng, 1, 9);
    var val = whole + d / 10;
    var askFrac = U.chance(rng, 0.5);
    if (askFrac) {
      var fr = U.decToFrac(val);
      return txt('Ubah bilangan desimal <b>' + U.trimNum(val) + '</b> menjadi pecahan.', fr, [
        U.trimNum(whole) + '/' + d, (d) + '/' + 10, U.decToFrac(whole + (d + 1) / 10), U.decToFrac(whole - d / 10)
      ].filter(function (x) { return x !== fr; }), {
        rng: rng, topic: 'decimalIntro', topicName: 'Bilangan Desimal',
        hint: U.trimNum(val) + ' = ' + whole + ' + ' + d + '/10.'
      });
    }
    // tentukan tempat desimal
    var digit = d;
    return num('Berapa digit <b>' + digit + '</b> pada bilangan desimal <b>' + U.trimNum(val) + '</b>? (nilai tempatnya)', digit, {
      rng: rng, min: 0, max: 9, spread: 1,
      topic: 'decimalIntro', topicName: 'Bilangan Desimal',
      hint: 'Angka ' + digit + ' ada di belakang tanda koma → satuan desimal.'
    });
  };

  Topics.decimalArith = function (rng, lv) {
    var a = ri(rng, 10, 60), b = ri(rng, 10, 60);
    var da = ri(rng, 1, 9) / 10, db = ri(rng, 1, 9) / 10;
    var x = a + da, y = b + db;
    var add = U.chance(rng, 0.5);
    var ans = add ? x + y : x - y;
    return num(U.trimNum(x) + (add ? ' + ' : ' − ') + U.trimNum(y) + ' = ?', ans, {
      rng: rng, dec: 1, min: 0, spread: 2, step: 0.1,
      topic: 'decimalArith', topicName: 'Desimal',
      hint: 'Samakan koma desimal dulu: ' + U.trimNum(x) + ' dan ' + U.trimNum(y) + '.'
    });
  };

  /* ============================================================
   *  LEVEL 14-16: PERSEN, RASIO, BILANGAN BULAT, SATUAN, ALJABAR
   * ============================================================ */

  function gcdFn(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }

  /* ---------- Topik tambahan: sudut ---------- */
  Topics.angleBasic = function (rng, lv) {
    var mode = ri(rng, 0, 1);

    if (mode === 0) {
      // Namai jenis sudut
      var deg = pk(rng, [30, 45, 60, 75, 90, 105, 120, 135, 150, 180]);
      var jenis = deg < 90 ? 'lancip' : deg === 90 ? 'siku' : deg < 180 ? 'tumpul' : 'lurus';
      return txt('Sudut di bawah besarnya <b>' + deg + '°</b>. <b>Macam sudut</b> itu apa?',
        jenis, ['lancip', 'siku', 'tumpul', 'lurus', 'reflex'].filter(function (x) { return x !== jenis; }), {
          rng: rng, topic: 'angleBasic', topicName: 'Sudut',
          art: { kind: 'shape', shape: 'angle', labels: { deg: deg } },
          hint: deg < 90 ? 'Kurang dari 90° = lancip.' : deg === 90 ? 'Tepat 90° = siku.' :
            deg < 180 ? 'Antara 90° dan 180° = tumpul.' : 'Tepat 180° = lurus.'
        });
    }

    // Jumlah sudut pada segitiga / segiempat
    var askSudut = pk(rng, [90, 60, 120]);
    var kontek, nama;
    if (askSudut === 90) { kontek = 'persegi'; nama = 4; }
    else if (askSudut === 60) { kontek = 'segitiga sama sisi'; nama = 3; }
    else { kontek = 'segi enam'; nama = 6; }
    var perSudut = 360 / nama;
    return num('Berapa besar <b>tiap sudut</b> pada ' + kontek + ' (bagi rata)? (dalam derajat)',
      perSudut, {
        rng: rng, min: 0, spread: 10, step: 5,
        topic: 'angleBasic', topicName: 'Sudut',
        art: { kind: 'shape', shape: nama === 3 ? 'triangle' : nama === 4 ? 'square' : 'circle', labels: {} },
        hint: 'Jumlah sudut penuh 360°. ' + 360 + ' ÷ ' + nama + ' = ' + perSudut + '°.'
      });
  };

  /* ---------- Topik tambahan: perkalian angka 2 digit ---------- */
  Topics.mul2digit = function (rng, lv) {
    var mode = ri(rng, 0, 2);

    if (mode === 0) {
      var a = ri(rng, 11, 40), k = ri(rng, 2, 9);
      return num('<b>' + a + '</b> × <b>' + k + '</b> = ?', a * k, {
        rng: rng, min: 0, spread: Math.max(2, k), step: 1,
        topic: 'mul2digit', topicName: 'Perkalian',
        hint: a + ' × ' + k + ' = ' + (a * k) + '. (' + a + ' dijumlahkan ' + k + ' kali)'
      });
    }

    if (mode === 1) {
      var n = ri(rng, 3, 12), k2 = ri(rng, 3, 9);
      var prod = n * k2;
      return num('<b>' + prod + '</b> ÷ <b>' + n + '</b> = ?', k2, {
        rng: rng, min: 0, spread: Math.max(2, k2), step: 1,
        topic: 'mul2digit', topicName: 'Perkalian & Pembagian',
        hint: 'Berapa kali ' + n + ' dalam ' + prod + '? = ' + k2 + '.'
      });
    }

    var x = ri(rng, 12, 25), y = ri(rng, 3, 6);
    return num('Luas <b>' + x + ' × ' + y + '</b> sama dengan berapa?', x * y, {
      rng: rng, min: 0, spread: Math.max(2, y), step: 1,
      topic: 'mul2digit', topicName: 'Perkalian',
      art: { kind: 'rect', w: x, h: y, hl: 'w', hlLabel: x + ' cm' },
      hint: x + ' × ' + y + ' = ' + (x * y) + ' cm².'
    });
  };

  /** Bangun soal persen dengan jawaban yang SELALU bilangan bulat. */
  Topics.percent = function (rng, lv) {
    var mode = ri(rng, 0, 2);

    if (mode === 0) {
      // p% dari n  ->  pilih n sebagai kelipatan (100/gcd(p,100)) supaya hasilnya bulat
      var p = pk(rng, [10, 20, 25, 50, 75, 5, 30, 40, 60, 80]);
      var unit = 100 / gcdFn(p, 100);
      var n = unit * ri(rng, 1, 8);
      var ans = n * p / 100;
      return num('<b>' + p + '%</b> dari <b>' + n + '</b> adalah?', ans, {
        rng: rng, min: 0, spread: Math.max(2, Math.floor(ans / 4)), step: ans % 5 === 0 ? 5 : 1,
        topic: 'percent', topicName: 'Persen',
        hint: n + ' × ' + p + '/100 = ' + ans + '.'
      });
    }

    if (mode === 1) {
      // x adalah p% dari berapa?
      var p2 = pk(rng, [10, 20, 25, 40, 50, 60, 75, 80]);
      var unit2 = 100 / gcdFn(p2, 100);
      var n2 = unit2 * ri(rng, 2, 10);
      var ans2 = n2 * p2 / 100;
      return num('<b>' + ans2 + '</b> itu <b>' + p2 + '%</b> dari berapa?', n2, {
        rng: rng, min: 0, spread: Math.max(5, Math.floor(n2 / 4)), step: unit2 > 1 ? unit2 : 1,
        topic: 'percent', topicName: 'Persen',
        hint: p2 + '% dari ' + n2 + ' = ' + ans2 + '. Jadi jawabannya ' + n2 + '.'
      });
    }

    // x adalah berapa persen dari y  -> pasangan yang sudah dijamin bulat
    var pairs = [
      [200, 20], [200, 40], [200, 50], [200, 100], [200, 160], [200, 180],
      [400, 40], [400, 80], [400, 100], [400, 240], [400, 320],
      [500, 50], [500, 100], [500, 150], [500, 250], [500, 400],
      [800, 80], [800, 160], [800, 200], [800, 320], [800, 640],
      [1000, 100], [1000, 200], [1000, 250], [1000, 400], [1000, 800]
    ];
    var pr = pk(rng, pairs);
    var ansP = pr[1] / pr[0] * 100;
    return num('Berapa persen <b>' + pr[1] + '</b> dari <b>' + pr[0] + '</b>?', ansP, {
      rng: rng, min: 0, spread: Math.max(5, ansP / 4), step: ansP % 10 === 0 ? 10 : 5,
      topic: 'percent', topicName: 'Persen',
      candidates: [ansP + 10, ansP - 10, ansP * 2, ansP / 2],
      hint: pr[1] + ' ÷ ' + pr[0] + ' = ' + ansP + '%.'
    });
  };

  Topics.integerOps = function (rng, lv) {
    var a = ri(rng, 2, 20), b = ri(rng, 1, 9);
    var mode = ri(rng, 0, 2);
    var q, ans, hint;
    if (mode === 0) {
      q = '(−' + a + ') + (' + b + ') = ?';
      ans = -a + b;
      hint = 'Bilangan bulat: −' + a + ' + ' + b + ' = ' + ans + '.';
    } else if (mode === 1) {
      q = '(−' + a + ') − (' + b + ') = ?'; ans = -a - b;
      hint = '−' + a + ' − ' + b + ' = −' + (a + b) + '.';
    } else {
      q = '(+' + a + ') × (−' + b + ') = ?'; ans = -a * b;
      hint = 'Positif × negatif = negatif. ' + a + ' × ' + b + ' = ' + (a * b) + '.';
    }
    return num(q, ans, {
      rng: rng, min: -a * b - 20, allowNegative: true, spread: Math.max(2, b), step: 1,
      topic: 'integerOps', topicName: 'Bilangan Bulat',
      hint: hint
    });
  };

  Topics.orderOps = function (rng, lv) {
    var a = ri(rng, 2, 12), b = ri(rng, 2, 8), c = ri(rng, 2, 6);
    var mode = ri(rng, 0, 2);
    var q, ans, hint;
    if (mode === 0) {
      q = a + ' × ' + b + ' + ' + c + ' = ?'; ans = a * b + c;
      hint = 'Perkalian dulu: ' + a + '×' + b + '=' + (a * b) + ', lalu +' + c + '=' + ans + '.';
    } else if (mode === 1) {
      q = '(' + a + ' + ' + b + ') × ' + c + ' = ?'; ans = (a + b) * c;
      hint = 'Tanda kurung dulu: ' + a + '+' + b + '=' + (a + b) + ', lalu ×' + c + '=' + ans + '.';
    } else {
      q = a + ' + ' + b + ' × ' + c + ' = ?'; ans = a + b * c;
      hint = 'Perkalian dulu: ' + b + '×' + c + '=' + (b * c) + ', lalu +' + a + '=' + ans + '.';
    }
    return num(q, ans, { rng: rng, min: 0, spread: Math.max(2, Math.floor(ans / 5)), topic: 'orderOps', topicName: 'Urutan Operasi', hint: hint });
  };

  Topics.ratioSimple = function (rng, lv) {
    var a = ri(rng, 2, 12), b = ri(rng, 2, 12);
    var guard = 0;
    while (b === a && guard++ < 20) b = ri(rng, 2, 12);
    if (b === a) b = (a % 12) + 2;
    var mode = ri(rng, 0, 1);

    if (mode === 0) {
      // Sederhanakan perbandingan menjadi 1 : x
      var g = gcdFn(a, b);
      var x = (b / g);
      return txt('Sederhanakan perbandingan <b>' + a + ' : ' + b + '</b> menjadi <b>1 : ?</b>',
        String(x), [String(a), String(b), String(x + 1), String(x - 1), String(a + b)]
          .filter(function (v) { return v !== String(x) && +v > 0; }), {
          rng: rng, topic: 'ratioSimple', topicName: 'Perbandingan',
          art: { kind: 'balance', left: a, right: b, leftItems: a, rightItems: b },
          hint: 'FPB(' + a + ',' + b + ') = ' + g + '. Maka ' + a + '/' + g + ' : ' + b + '/' + g + ' = 1 : ' + x + '.'
        });
    }

    // Cari nilai x pada perbandingan Equivalent
    var t = ri(rng, 2, 6);
    var ans = a * t;
    return num('Perhatikan perbandingan berikut:<br><b>' + a + ' : ' + b + ' = ' + (a * t) +
      ' : x</b><br>Nilai <b>x</b> adalah?', ans, {
      rng: rng, min: 0, spread: Math.max(2, b), step: 1,
      topic: 'ratioSimple', topicName: 'Perbandingan',
      art: { kind: 'balance', left: a * t, right: b * t, leftItems: a, rightItems: b },
      hint: 'Perkalian silang: ' + a + ' \u00d7 t = ' + (a * t) + ', maka t = ' + t + '. Jadi x = ' + b + ' \u00d7 ' + t + ' = ' + ans + '.'
    });
  };

  Topics.unitConvert = function (rng, lv) {
    var kind = ri(rng, 0, 2);
    if (kind === 0) {
      var m = ri(rng, 2, 9);
      return num('<b>' + m + ' meter</b> = ... sentimeter?', m * 100, {
        rng: rng, min: 0, spread: 50, step: 10, topic: 'unitConvert', topicName: 'Satuan Panjang',
        hint: '1 m = 100 cm. ' + m + ' × 100 = ' + (m * 100) + ' cm.'
      });
    } else if (kind === 1) {
      var kg = ri(rng, 2, 9);
      return num('<b>' + (kg * 1000) + ' gram</b> = ... kilogram?', kg, {
        rng: rng, min: 0, spread: 1, topic: 'unitConvert', topicName: 'Satuan Berat',
        hint: '1 kg = 1000 gram. ' + (kg * 1000) + ' ÷ 1000 = ' + kg + ' kg.'
      });
    } else {
      var jam = ri(rng, 2, 6);
      return num('<b>' + jam + ' jam</b> = ... menit?', jam * 60, {
        rng: rng, min: 0, spread: 30, step: 10, topic: 'unitConvert', topicName: 'Satuan Waktu',
        hint: '1 jam = 60 menit. ' + jam + ' × 60 = ' + (jam * 60) + ' menit.'
      });
    }
  };

  Topics.average = function (rng, lv) {
    var n = ri(rng, 3, 5);
    var vals = [];
    var sum = 0;
    for (var i = 0; i < n; i++) { var v = ri(rng, 2, 20); vals.push(v); sum += v; }
    // pastikan rata-rata tepat (pembagi habis)
    var guard = 0;
    while (sum % n !== 0 && guard++ < 200) { vals[n - 1]++; sum++; }
    return num('Rata-rata dari ' + vals.join(', ') + ' adalah?', sum / n, {
      rng: rng, min: 0, spread: 2, step: 1,
      topic: 'average', topicName: 'Rata-rata',
      hint: '(' + vals.join('+') + ') ÷ ' + n + ' = ' + sum + ' ÷ ' + n + ' = ' + (sum / n) + '.'
    });
  };

  Topics.algebra = function (rng, lv) {
    var mode = ri(rng, 0, 2);
    if (mode === 0) {
      var x = ri(rng, 2, 20);
      var a = ri(rng, 2, 12);
      return num('Jika <b>x = ' + x + '</b>, maka <b>x × ' + a + '</b> = ?', x * a, {
        rng: rng, min: 0, spread: a, topic: 'algebra', topicName: 'Aljabar',
        hint: x + ' × ' + a + ' = ' + (x * a) + '.'
      });
    } else if (mode === 1) {
      var y = ri(rng, 2, 12);
      var b = ri(rng, 2, 12);
      var prod = y * b;
      return num('Nilai <b>y</b> jika <b>y × ' + b + ' = ' + prod + '</b>?', y, {
        rng: rng, min: 0, spread: Math.max(1, Math.floor(y / 2)), topic: 'algebra', topicName: 'Aljabar',
        hint: prod + ' ÷ ' + b + ' = ' + y + '.'
      });
    } else {
      var n = ri(rng, 2, 12);
      var t = ri(rng, 2, 9);
      return num('Jika <b>n + ' + t + ' = ' + (n + t) + '</b>, maka <b>n</b> = ?', n, {
        rng: rng, min: 0, spread: 2, topic: 'algebra', topicName: 'Aljabar',
        hint: (n + t) + ' − ' + t + ' = ' + n + '.'
      });
    }
  };

  Topics.primeFactor = function (rng, lv) {
    var mode = ri(rng, 0, 1);
    if (mode === 0) {
      var n = pk(rng, [12, 15, 18, 20, 21, 24, 25, 27, 28, 30, 36, 40, 42, 45, 48, 50, 60]);
      var count = primeFactorCount(n);
      return num('Berapa banyak <b>faktor prima berbeda</b> dari bilangan <b>' + n + '</b>?', count, {
        rng: rng, min: 1, spread: 1, topic: 'primeFactor', topicName: 'Faktor Prima',
        hint: primeFactorText(n) + ' → ' + count + ' faktor prima berbeda.'
      });
    } else {
      var num2 = pk(rng, [12, 18, 20, 24, 30, 36, 40, 45, 60]);
      var largest = largestPrimeFactor(num2);
      return num('Faktor prima terbesar dari <b>' + num2 + '</b> adalah?', largest, {
        rng: rng, min: 2, spread: 3, topic: 'primeFactor', topicName: 'Faktor Prima',
        hint: primeFactorText(num2) + ' → terbesar ' + largest + '.'
      });
    }
  };

  function primeFactorText(n) {
    var res = [], c = 2;
    while (c * c <= n) { while (n % c === 0) { res.push(c); n /= c; } c++; }
    if (n > 1) res.push(n);
    return res.join(' × ');
  }
  function primeFactorCount(n) {
    var res = [], c = 2;
    while (c * c <= n) { if (n % c === 0) { res.push(c); while (n % c === 0) n /= c; } c++; }
    if (n > 1) res.push(n);
    return res.length;
  }
  function largestPrimeFactor(n) {
    var res = [], c = 2;
    while (c * c <= n) { if (n % c === 0) { res.push(c); while (n % c === 0) n /= c; } c++; }
    if (n > 1) res.push(n);
    return Math.max.apply(null, res);
  }

  Topics.gcdlcm = function (rng, lv) {
    var pairs = [[12, 18], [8, 12], [6, 9], [10, 15], [4, 8], [9, 15], [12, 24], [16, 20], [10, 20], [15, 25], [18, 24], [14, 21]];
    var p = pk(rng, pairs);
    var gcd = gcdFn(p[0], p[1]);
    var lcm = p[0] * p[1] / gcd;
    var askG = U.chance(rng, 0.5);
    return num('FPB dari <b>' + p[0] + '</b> dan <b>' + p[1] + '</b> adalah?' + (askG ? '' : ' (LCM)'), askG ? gcd : lcm, {
      rng: rng, min: 1, spread: Math.max(2, Math.floor(gcd / 2)),
      candidates: [askG ? lcm : gcd, p[0] + p[1], p[0] * p[1]],
      topic: 'gcdlcm', topicName: 'FPB & LCM',
      hint: askG ? 'FPB terbesar yang membagi keduanya = ' + gcd + '.' : 'LCM = (' + p[0] + '×' + p[1] + ')÷' + gcd + ' = ' + lcm + '.'
    });
  };

  function gcdFn(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }

  /* ============================================================
   *  LEVEL 17-20: KECEPATAN, KUADRAT, MIX SULIT
   * ============================================================ */

  Topics.speed = function (rng, lv) {
    var mode = ri(rng, 0, 2);
    var speed = pk(rng, [20, 30, 40, 50, 60, 80, 100, 120]);

    if (mode === 0) {
      var t = ri(rng, 2, 6);
      var d = speed * t;
      return num('Sebuah mobil melaju dengan kecepatan <b>' + speed + ' km/jam</b> selama <b>' +
        t + ' jam</b>. Jarak yang ditempuh berapa km?', d, {
        rng: rng, min: 0, spread: Math.max(10, speed), step: 10,
        topic: 'speed', topicName: 'Kecepatan',
        art: { kind: 'items', count: 1, item: 'car' },
        hint: 'Jarak = kecepatan \u00d7 waktu = ' + speed + ' \u00d7 ' + t + ' = ' + d + ' km.'
      });
    }
    if (mode === 1) {
      var t2 = ri(rng, 2, 6);
      var s2 = pk(rng, [20, 30, 40, 50, 60, 80]);
      var d2 = s2 * t2;
      return num('Mobil menempuh <b>' + d2 + ' km</b> dalam <b>' + t2 + ' jam</b> dengan kecepatan tetap. ' +
        'Kecepatan rata-ratanya berapa km/jam?', s2, {
        rng: rng, min: 0, spread: Math.max(5, s2 / 2), step: 5,
        topic: 'speed', topicName: 'Kecepatan',
        art: { kind: 'items', count: 1, item: 'car' },
        hint: 'Kecepatan = jarak \u00f7 waktu = ' + d2 + ' \u00f7 ' + t2 + ' = ' + s2 + '.'
      });
    }
    var t3 = pk(rng, [1, 2, 3]);
    var d3 = speed * t3;
    return num('Berapa <b>waktu</b> (dalam jam) yang diperlukan untuk menempuh <b>' + d3 +
      ' km</b> dengan kecepatan <b>' + speed + ' km/jam</b>?', t3, {
      rng: rng, min: 1, spread: 1,
      topic: 'speed', topicName: 'Kecepatan',
      art: { kind: 'items', count: 1, item: 'car' },
      hint: 'Waktu = jarak \u00f7 kecepatan = ' + d3 + ' \u00f7 ' + speed + ' = ' + t3 + ' jam.'
    });
  };

  Topics.square = function (rng, lv) {
    var mode = ri(rng, 0, 1);
    var n = ri(rng, 2, 15);
    if (mode === 0) {
      return num('<b>' + n + '²</b> = ?', n * n, {
        rng: rng, min: 0, spread: Math.max(3, n), topic: 'square', topicName: 'Kuadrat & Pangkat',
        hint: n + '² = ' + n + ' × ' + n + ' = ' + (n * n) + '.'
      });
    }
    var root = ri(rng, 2, 12);
    var sq = root * root;
    return num('√<b>' + sq + '</b> = ?', root, {
      rng: rng, min: 0, spread: Math.max(1, Math.floor(root / 2)), topic: 'square', topicName: 'Kuadrat & Pangkat',
      hint: root + ' × ' + root + ' = ' + sq + '.'
    });
  };

  /* Soal campuran tingkat olimpiade */
  Topics.hardMix = function (rng, lv) {
    var pool = ['percent', 'ratioSimple', 'fractionAddSame', 'algebra', 'speed', 'orderOps', 'average', 'integerOps', 'square'];
    var t = pk(rng, pool);
    return Topics[t](rng, lv);
  };

  /* ============================================================
   *  LEVEL TK (usia 4-6) — pengenalan angka, berhitung, bentuk, warna,
   *  pola, perbandingan, tambah/kurang visual, jam & uang.
   *  Semua memakai gambar supaya bisa dikerjakan tanpa membaca lancar.
   * ============================================================ */

  var TK_ITEMS = ['apple', 'star', 'ball', 'fish', 'flower', 'balloon', 'cookie', 'duck', 'heart', 'leaf'];
  var TK_SHAPES = ['circle', 'square', 'triangle', 'rect'];
  var TK_SHAPE_NAME = { circle: 'lingkaran', square: 'persegi', triangle: 'segitiga', rect: 'persegi panjang' };
  var TK_COLORS = [
    { hex: '#FF5C5C', name: 'merah' },
    { hex: '#4EA8FF', name: 'biru' },
    { hex: '#FFC93C', name: 'kuning' },
    { hex: '#57B947', name: 'hijau' },
    { hex: '#FF8AC4', name: 'pink' },
    { hex: '#B388FF', name: 'ungu' }
  ];

  Topics.tkCount = function (rng, lv) {
    var max = Math.min(lv.scale.countMax || 10, 10);
    var n = ri(rng, 2, Math.max(3, max));
    var item = pk(rng, TK_ITEMS);
    return num('Berapa banyak <b>' + Art_name(item) + '</b>? Ayo hitung!', n, {
      rng: rng, min: 1, spread: 2, topic: 'tkCount', topicName: 'Menghitung',
      art: { kind: 'items', count: n, item: item, jitter: true, cols: 5 },
      hint: 'Hitung satu per satu sambil menunjuk: 1, 2, 3, ...'
    });
  };

  Topics.tkNumberRecognize = function (rng, lv) {
    var max = Math.min(lv.scale.max || 5, 10);
    var n = ri(rng, 1, max);
    var item = pk(rng, TK_ITEMS);
    if (U.chance(rng, 0.5)) {
      return num('Ada berapa gambar? Pilih angkanya!', n, {
        rng: rng, min: 1, spread: 2, topic: 'tkNumberRecognize', topicName: 'Kenal Angka',
        art: { kind: 'items', count: n, item: item },
        hint: 'Jumlah gambarnya ' + n + '.'
      });
    }
    var wrongs = [];
    for (var i = 1; i <= max + 2; i++) if (i !== n) wrongs.push(String(i));
    return txt('Pilih <b>angka</b> yang sesuai dengan jumlah gambar!', String(n), wrongs, {
      rng: rng, topic: 'tkNumberRecognize', topicName: 'Kenal Angka',
      art: { kind: 'items', count: n, item: item },
      hint: 'Hitung gambarnya, lalu pilih angka ' + n + '.'
    });
  };

  Topics.tkBeforeAfter = function (rng, lv) {
    var max = Math.max(4, Math.min(lv.scale.max || 10, 15));
    var n = ri(rng, 2, max - 1);
    var askAfter = U.chance(rng, 0.5);
    var ans = askAfter ? n + 1 : n - 1;
    var items = askAfter
      ? [Math.max(0, n - 2), n - 1, n, null]
      : [null, n, n + 1, n + 2];
    return num('Lengkapi urutan angkanya!', ans, {
      rng: rng, min: 0, spread: 2, topic: 'tkBeforeAfter', topicName: 'Urutan Angka',
      art: { kind: 'pattern', items: items },
      hint: 'Urutan angkanya bertambah 1. Jadi angka yang hilang adalah ' + ans + '.'
    });
  };

  Topics.tkCompare = function (rng, lv) {
    var max = Math.min(lv.scale.countMax || 10, 10);
    var a = ri(rng, 1, max - 1);
    var b = ri(rng, 1, max - 1);
    var guard = 0;
    while (b === a && guard++ < 20) b = ri(rng, 1, max - 1);
    if (b === a) b = a === 1 ? 2 : 1;
    var askMore = U.chance(rng, 0.5);
    var answer = askMore ? Math.max(a, b) : Math.min(a, b);
    var other = askMore ? Math.min(a, b) : Math.max(a, b);
    return num('Mana yang <b>' + (askMore ? 'lebih banyak' : 'lebih sedikit') + '</b>?', answer, {
      rng: rng, min: 0, spread: 2, candidates: [other],
      topic: 'tkCompare', topicName: 'Membandingkan',
      art: { kind: 'balance', left: a, right: b, leftItems: a, rightItems: b },
      hint: 'Kelompok ' + answer + ' lebih ' + (askMore ? 'banyak' : 'sedikit') + ' dari ' + other + '.'
    });
  };

  Topics.tkBigSmall = function (rng, lv) {
    var item = pk(rng, TK_ITEMS);
    if (U.chance(rng, 0.5)) {
      var bigLeft = U.chance(rng, 0.5);
      return txt('Benda mana yang <b>lebih besar</b>?', bigLeft ? 'kiri' : 'kanan',
        [bigLeft ? 'kanan' : 'kiri', 'sama besar', 'tidak ada'], {
          rng: rng, topic: 'tkBigSmall', topicName: 'Besar & Kecil',
          art: { kind: 'sizeCompare', item: item, bigSide: bigLeft ? 'left' : 'right' },
          hint: 'Bandingkan ukuran kedua gambar.'
        });
    }
    var longTop = U.chance(rng, 0.5);
    return txt('Garis mana yang <b>lebih panjang</b>?', longTop ? 'atas' : 'bawah',
      [longTop ? 'bawah' : 'atas', 'sama panjang', 'tidak ada'], {
        rng: rng, topic: 'tkBigSmall', topicName: 'Panjang & Pendek',
        art: { kind: 'longShort', longTop: longTop },
        hint: 'Garis yang lebih panjang adalah garis ' + (longTop ? 'atas' : 'bawah') + '.'
      });
  };

  Topics.tkPattern = function (rng, lv) {
    if (U.chance(rng, 0.5)) {
      var s1 = pk(rng, TK_SHAPES), s2 = pk(rng, TK_SHAPES);
      var guard = 0;
      while (s2 === s1 && guard++ < 20) s2 = pk(rng, TK_SHAPES);
      return txt('Lanjutkan polanya! Bentuk apa yang hilang?', TK_SHAPE_NAME[s2],
        TK_SHAPES.filter(function (s) { return s !== s2; }).map(function (s) { return TK_SHAPE_NAME[s]; }), {
          rng: rng, topic: 'tkPattern', topicName: 'Pola Bentuk',
          art: { kind: 'shapePattern', items: [s1, s2, s1, s2, s1, null] },
          hint: 'Polanya bergantian ' + TK_SHAPE_NAME[s1] + ' dan ' + TK_SHAPE_NAME[s2] + '.'
        });
    }
    var c1 = pk(rng, TK_COLORS), c2 = pk(rng, TK_COLORS);
    var g = 0;
    while (c2.name === c1.name && g++ < 20) c2 = pk(rng, TK_COLORS);
    return txt('Lanjutkan polanya! Warna apa yang hilang?', c2.name,
      TK_COLORS.filter(function (c) { return c.name !== c2.name; }).map(function (c) { return c.name; }), {
        rng: rng, topic: 'tkPattern', topicName: 'Pola Warna',
        art: { kind: 'colorPattern', items: [c1.hex, c2.hex, c1.hex, c2.hex, c1.hex, null] },
        hint: 'Polanya bergantian warna ' + c1.name + ' dan ' + c2.name + '.'
      });
  };

  Topics.tkShape = function (rng, lv) {
    var shape = pk(rng, TK_SHAPES);
    return txt('Bentuk apa ini?', TK_SHAPE_NAME[shape],
      TK_SHAPES.filter(function (s) { return s !== shape; }).map(function (s) { return TK_SHAPE_NAME[s]; }), {
        rng: rng, topic: 'tkShape', topicName: 'Bentuk',
        art: { kind: 'tkShape', shape: shape },
        hint: 'Bentuk ini namanya ' + TK_SHAPE_NAME[shape] + '.'
      });
  };

  Topics.tkColor = function (rng, lv) {
    var c = pk(rng, TK_COLORS);
    return txt('Warna apa ini?', c.name,
      TK_COLORS.filter(function (x) { return x.name !== c.name; }).map(function (x) { return x.name; }), {
        rng: rng, topic: 'tkColor', topicName: 'Warna',
        art: { kind: 'color', hex: c.hex },
        hint: 'Warnanya ' + c.name + '.'
      });
  };

  Topics.tkClassify = function (rng, lv) {
    var set = U.sample(rng, TK_ITEMS, 3);
    var target = set[0];
    var wrongs = set.slice(1).map(function (it) { return Art_name(it); });
    return txt('Gambar apa yang ada di kotak?', Art_name(target), wrongs, {
      rng: rng, topic: 'tkClassify', topicName: 'Mengelompokkan',
      art: { kind: 'items', count: 1, item: target },
      hint: 'Gambar itu adalah ' + Art_name(target) + '.'
    });
  };

  Topics.tkAddVisual = function (rng, lv) {
    var max = Math.min(lv.scale.max || 5, 6);
    var a = ri(rng, 1, max - 1);
    var b = ri(rng, 1, max - a);
    var item = pk(rng, TK_ITEMS);
    return num('<b>' + a + '</b> + <b>' + b + '</b> = ?', a + b, {
      rng: rng, min: 0, spread: 2, topic: 'tkAddVisual', topicName: 'Tambah',
      art: { kind: 'twoGroups', left: a, right: b, item: item },
      hint: a + ' ditambah ' + b + ' sama dengan ' + (a + b) + '.'
    });
  };

  Topics.tkSubVisual = function (rng, lv) {
    var max = Math.min(lv.scale.max || 5, 6);
    var total = ri(rng, 2, max);
    var take = ri(rng, 1, total - 1);
    var item = pk(rng, TK_ITEMS);
    return num('<b>' + total + '</b> − <b>' + take + '</b> = ?', total - take, {
      rng: rng, min: 0, spread: 2, topic: 'tkSubVisual', topicName: 'Kurang',
      art: { kind: 'minusVisual', total: total, take: take, item: item },
      hint: total + ' benda, dicoret ' + take + ', sisanya ' + (total - take) + '.'
    });
  };

  Topics.tkClockHour = function (rng, lv) {
    var h = ri(rng, 1, 12);
    return num('Jam berapa ini?', h, {
      rng: rng, min: 1, spread: 1, topic: 'tkClockHour', topicName: 'Membaca Jam',
      art: { kind: 'clock', h: h, m: 0 },
      hint: 'Jarum pendek menunjuk angka ' + h + '.'
    });
  };

  Topics.tkMoneySimple = function (rng, lv) {
    var n = ri(rng, 1, 5);
    return num('Berapa jumlah uang koin di gambar?', n * 100, {
      rng: rng, min: 100, spread: 2, step: 100,
      candidates: [(n + 1) * 100, (n + 2) * 100],
      topic: 'tkMoneySimple', topicName: 'Uang',
      art: { kind: 'money', coins: n, notes: 0 },
      hint: n + ' koin seratus berarti ' + (n * 100) + ' rupiah.'
    });
  };

  /* ============================================================
   *  DAFTAR & PENJELASAN
   * ============================================================ */

  Topics.NAMES = {
    count: 'Menghitung', shapeCount: 'Bentuk & Sisi', addSmall: 'Penjumlahan', subSmall: 'Pengurangan',
    missingAdd: 'Angka Hilang', compare: 'Bandingkan', pattern: 'Pola Bilangan',
    add100: 'Penjumlahan', sub100: 'Pengurangan', missing100: 'Angka Hilang', numberline: 'Garis Bilangan',
    placeValue2: 'Nilai Tempat', placeValue3: 'Nilai Tempat', timeHour: 'Jam', timeMinute: 'Jam',
    moneySimple: 'Uang', mul25: 'Perkalian', mul345: 'Perkalian', timesTable: 'Perkalian',
    divSmall: 'Pembagian', div25: 'Pembagian', beforeAfter: 'Bilangan', add200: 'Penjumlahan',
    sub200: 'Pengurangan', add3digit: 'Penjumlahan', sub3digit: 'Pengurangan',
    wordAddSub: 'Soal Cerita', wordMulDiv: 'Soal Cerita', wordMulti: 'Soal Cerita',
    rectArea: 'Luas', rectPerimeter: 'Keliling', compositeArea: 'Luas Majemuk', volume: 'Volume',
    angleBasic: 'Sudut', mul2digit: 'Perkalian',
    fractionIntro: 'Pecahan', fractionCompare: 'Bandingkan Pecahan', fractionAddSame: 'Penjumlahan Pecahan',
    decimalIntro: 'Desimal', decimalArith: 'Desimal', percent: 'Persen', integerOps: 'Bilangan Bulat',
    orderOps: 'Urutan Operasi', ratioSimple: 'Perbandingan', unitConvert: 'Satuan', average: 'Rata-rata',
    algebra: 'Aljabar', primeFactor: 'Faktor Prima', gcdlcm: 'FPB & LCM', speed: 'Kecepatan', square: 'Kuadrat',
    hardMix: 'Campuran',
    // Level TK
    tkCount: 'Menghitung', tkNumberRecognize: 'Kenal Angka', tkBeforeAfter: 'Urutan Angka',
    tkCompare: 'Membandingkan', tkBigSmall: 'Besar & Panjang', tkPattern: 'Pola',
    tkShape: 'Bentuk', tkColor: 'Warna', tkClassify: 'Mengelompokkan',
    tkAddVisual: 'Tambah', tkSubVisual: 'Kurang', tkClockHour: 'Jam', tkMoneySimple: 'Uang'
  };

  /** Daftar semua key yang tersedia (untuk validasi config). */
  Topics.keys = function () { return Object.keys(Topics.NAMES); };

})(window);
