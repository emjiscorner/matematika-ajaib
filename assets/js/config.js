/* ============================================================
 *  config.js  —  Pengaturan global & definisi 20 level
 *  Game: Matematika Ajaib (game edukasi matematika SD kelas 1-6)
 * ============================================================ */
(function (global) {
  'use strict';

  var MG = global.MG = global.MG || {};

  MG.CONFIG = {
    TITLE: 'Matematika Ajaib',
    TAGLINE: 'Belajar matematika sambil bermain',
    LEVELS_COUNT: 20,
    TK_LEVELS_COUNT: 8,
    QUESTIONS_PER_LEVEL: 10,
    OPTIONS_COUNT: 4,
    START_HEARTS: 3,
    DB_FILE: 'matematika-ajaib.sqlite',
    STORAGE_KEY: 'matematika-ajaib.db',

    // Penskoran
    SCORE: {
      BASE: 10,           // poin dasar tiap jawaban benar
      TIME_BONUS_MAX: 10, // bonus maksimal karena cepat
      HINT_PENALTY: 3,    // pengurangan poin bila memakai petunjuk
      COMBO_STEP: 1,      // pengali combo: 1x, 2x, 3x, ...
      COMBO_MAX: 4        // batas pengali combo
    },

    // Bintang per level
    STARS: [
      { need: 0.6, stars: 1, label: 'Bagus!' },
      { need: 0.8, stars: 2, label: 'Hebat!' },
      { need: 1.0, stars: 3, label: 'Sempurna!' }
    ],

    // Kesulitan → pengali bonus waktu
    DIFFICULTY: {
      santai: { label: 'Santai', timeBonus: 0.6, timeLabel: 'waktu plasmanya' },
      sedang: { label: 'Sedang', timeBonus: 1.0, timeLabel: 'waktu biasa' },
      sulit: { label: 'Sulit', timeBonus: 1.5, timeLabel: 'waktu cepat' }
    },

    AVATARS: ['🙂', '👦', '👧', '🧒', '👧‍🚀', '🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🦄', '🐙', '🤖', '👽', '🦖'],

    // ------------------------------------------------------------------
    //  20 LEVEL —difficultynya naik bertahap (bukan diikat kelas).
    //  Setiap level memilih soal acak dari daftar topik + jangkauan angka
    //  yang mengikuti tingkat kesulitan level tersebut.
    // ------------------------------------------------------------------
    LEVELS: [
      {
        n: 1, title: 'Kenali Angka', emoji: '🐣', hue: 45,
        desc: 'Mengenal angka, menghitung, dan membandingkan bilangan kecil.',
        topics: ['count', 'addSmall', 'subSmall', 'compare', 'shapeCount'],
        scale: { max: 10, countMax: 10 }
      },
      {
        n: 2, title: 'Tambah & Kurang', emoji: '🧮', hue: 30,
        desc: 'Penjumlahan dan pengurangan sampai 20.',
        topics: ['addSmall', 'subSmall', 'missingAdd', 'compare', 'count'],
        scale: { max: 20, countMax: 20 }
      },
      {
        n: 3, title: 'Pola Angka', emoji: '🔢', hue: 15,
        desc: 'Menentukan pola bilangan dan angka yang hilang.',
        topics: ['addSmall', 'subSmall', 'missingAdd', 'pattern', 'compare'],
        scale: { max: 20, countMax: 20 }
      },
      {
        n: 4, title: 'Bilang Ratusan', emoji: '💯', hue: 350,
        desc: 'Tambah, kurang, dan nilai tempat sampai 100.',
        topics: ['add100', 'sub100', 'missing100', 'numberline', 'placeValue2'],
        scale: { max: 100, countMax: 20 }
      },
      {
        n: 5, title: 'Jam & Uang', emoji: '⏰', hue: 200,
        desc: 'Membaca jam analog dan menghitung uang.',
        topics: ['add100', 'sub100', 'timeHour', 'moneySimple', 'missing100'],
        scale: { max: 100, countMax: 20 }
      },
      {
        n: 6, title: 'Kaliplication', emoji: '✖️', hue: 260,
        desc: 'Perkalian 2 dan 5, serta pola bilangan.',
        topics: ['mul25', 'add100', 'sub100', 'pattern', 'numberline'],
        scale: { max: 100, countMax: 20 }
      },
      {
        n: 7, title: 'Perkalian Fluid', emoji: '🚀', hue: 285,
        desc: 'Perkalian 2, 3, 4, dan 5 sampai 100.',
        topics: ['mul25', 'mul345', 'add200', 'sub200', 'beforeAfter'],
        scale: { max: 200, countMax: 20 }
      },
      {
        n: 8, title: 'Mulai Pembagian', emoji: '➗', hue: 320,
        desc: 'Pembagian tepat dengan 2 dan 5, serta soal cerita.',
        topics: ['div25', 'mul345', 'sub200', 'wordAddSub', 'timeMinute'],
        scale: { max: 200, countMax: 20 }
      },
      {
        n: 9, title: 'Tabel Perkalian', emoji: '📋', hue: 165,
        desc: 'Perkalian sampai 10 dan nilai tempat ratusan.',
        topics: ['timesTable', 'div25', 'divSmall', 'add200', 'placeValue3'],
        scale: { max: 500, countMax: 20 }
      },
      {
        n: 10, title: 'Angka Tiga Digit', emoji: '🏙️', hue: 145,
        desc: 'Penjumlahan/pengurangan tiga angka dan pembagian.',
        topics: ['add3digit', 'sub3digit', 'divSmall', 'timesTable', 'wordMulDiv'],
        scale: { max: 1000, countMax: 20 }
      },
      {
        n: 11, title: 'Keliling & Luas', emoji: '📐', hue: 190,
        desc: 'Menghitung keliling dan luas persegi, persegi panjang, segitiga.',
        topics: ['rectArea', 'rectPerimeter', 'compare', 'add3digit', 'divSmall'],
        scale: { max: 1000, countMax: 20 }
      },
      {
        n: 12, title: 'Mulai Pecahan', emoji: '🥧', hue: 225,
        desc: 'Mengenal pecahan, membandingkan, dan sudut sederhana.',
        topics: ['fractionIntro', 'fractionCompare', 'angleBasic', 'compare', 'divSmall'],
        scale: { max: 1000, countMax: 20 }
      },
      {
        n: 13, title: 'Volume & Desimal', emoji: '🧊', hue: 175,
        desc: 'Volume kubus, perkalian dua angka, dan bilangan desimal.',
        topics: ['volume', 'mul2digit', 'decimalIntro', 'fractionIntro', 'rectArea'],
        scale: { max: 2000, countMax: 20 }
      },
      {
        n: 14, title: 'Persen', emoji: '💯', hue: 5,
        desc: 'Menghitung persen, bilangan bulat, dan urutan operasi.',
        topics: ['percent', 'integerOps', 'orderOps', 'decimalIntro', 'fractionCompare'],
        scale: { max: 5000, countMax: 20 }
      },
      {
        n: 15, title: 'Rasio & Satuan', emoji: '⚖️', hue: 95,
        desc: 'Perbandingan sederhana, konversi satuan, dan rata-rata.',
        topics: ['ratioSimple', 'unitConvert', 'average', 'percent', 'decimalArith'],
        scale: { max: 5000, countMax: 20 }
      },
      {
        n: 16, title: 'Aljabar', emoji: '🔤', hue: 265,
        desc: 'Persamaan sederhana, faktor prima, dan FPB/LCM.',
        topics: ['algebra', 'primeFactor', 'gcdlcm', 'average', 'orderOps'],
        scale: { max: 10000, countMax: 20 }
      },
      {
        n: 17, title: 'Kecepatan', emoji: '🚗', hue: 205,
        desc: 'Kecepatan, jarak, waktu, dan pecahan berpenyebut sama.',
        topics: ['speed', 'fractionAddSame', 'decimalArith', 'ratioSimple', 'volume'],
        scale: { max: 10000, countMax: 20 }
      },
      {
        n: 18, title: 'Kuadrat & Gabungan', emoji: '🧮', hue: 240,
        desc: 'Kuadrat bilangan, luas bangun majemuk, dan soal cerita panjang.',
        topics: ['square', 'compositeArea', 'wordMulti', 'fractionAddSame', 'percent'],
        scale: { max: 20000, countMax: 20 }
      },
      {
        n: 19, title: 'Tantangan', emoji: '🔥', hue: 20,
        desc: 'Soal cerita langkah banyak dan penalaran matematis.',
        topics: ['wordMulti', 'ratioSimple', 'percent', 'integerOps', 'algebra', 'fractionAddSame'],
        scale: { max: 20000, countMax: 20 }
      },
      {
        n: 20, title: 'Olimpiade', emoji: '👑', hue: 285,
        desc: 'Level tersulit! Gabungan operasi, logika angka, dan soal cerita.',
        topics: ['hardMix', 'algebra', 'ratioSimple', 'percent', 'fractionAddSame', 'orderOps', 'speed'],
        scale: { max: 50000, countMax: 20 }
      }
    ],

    // ------------------------------------------------------------------
    //  8 LEVEL TK — untuk anak usia 4-6 tahun (sebelum masuk SD).
    //  Semua soal memakai gambar agar bisa dikerjakan tanpa membaca
    //  lancar. Jalur ini terpisah dari 20 level SD supaya progres
    //  level SD yang lama tidak terganggu.
    // ------------------------------------------------------------------
    TK_LEVELS: [
      {
        n: 1, track: 'tk', title: 'Kenal Angka', emoji: '1️⃣', hue: 320,
        desc: 'Mengenal lambang bilangan 1 sampai 5.',
        topics: ['tkNumberRecognize', 'tkCount', 'tkCompare', 'tkColor'],
        scale: { max: 5, countMax: 5 }
      },
      {
        n: 2, track: 'tk', title: 'Berhitung', emoji: '🔟', hue: 300,
        desc: 'Menghitung benda sampai 10 dan angka sebelum/sesudah.',
        topics: ['tkCount', 'tkNumberRecognize', 'tkBeforeAfter', 'tkCompare', 'tkColor'],
        scale: { max: 10, countMax: 10 }
      },
      {
        n: 3, track: 'tk', title: 'Bentuk & Warna', emoji: '🔺', hue: 260,
        desc: 'Mengenal bentuk, warna, dan mengelompokkan benda.',
        topics: ['tkShape', 'tkColor', 'tkClassify', 'tkPattern', 'tkCount'],
        scale: { max: 10, countMax: 10 }
      },
      {
        n: 4, track: 'tk', title: 'Lebih Banyak', emoji: '⚖️', hue: 200,
        desc: 'Membandingkan mana yang lebih banyak, lebih besar, lebih panjang.',
        topics: ['tkCompare', 'tkBigSmall', 'tkClassify', 'tkCount', 'tkPattern'],
        scale: { max: 10, countMax: 10 }
      },
      {
        n: 5, track: 'tk', title: 'Pola Ceria', emoji: '🎨', hue: 150,
        desc: 'Melanjutkan pola bentuk dan warna yang berulang.',
        topics: ['tkPattern', 'tkShape', 'tkColor', 'tkBigSmall', 'tkCount'],
        scale: { max: 10, countMax: 10 }
      },
      {
        n: 6, track: 'tk', title: 'Tambah Seru', emoji: '➕', hue: 45,
        desc: 'Penjumlahan sederhana sampai 5 dengan bantuan gambar.',
        topics: ['tkAddVisual', 'tkCount', 'tkNumberRecognize', 'tkCompare', 'tkPattern'],
        scale: { max: 5, countMax: 5 }
      },
      {
        n: 7, track: 'tk', title: 'Kurang Seru', emoji: '➖', hue: 20,
        desc: 'Pengurangan sederhana sampai 5 dengan bantuan gambar.',
        topics: ['tkSubVisual', 'tkAddVisual', 'tkCount', 'tkCompare', 'tkShape'],
        scale: { max: 5, countMax: 5 }
      },
      {
        n: 8, track: 'tk', title: 'Jam & Uang', emoji: '⏰', hue: 100,
        desc: 'Membaca jam bulat dan mengenal nilai uang sederhana.',
        topics: ['tkClockHour', 'tkMoneySimple', 'tkCount', 'tkAddVisual', 'tkBigSmall'],
        scale: { max: 10, countMax: 10 }
      }
    ]
  };


  MG.level = function (n) {
    return MG.CONFIG.LEVELS[Math.max(1, Math.min(MG.CONFIG.LEVELS_COUNT, n)) - 1];
  };

  /** Level TK ke-n (1..TK_LEVELS_COUNT). */
  MG.tkLevel = function (n) {
    return MG.CONFIG.TK_LEVELS[Math.max(1, Math.min(MG.CONFIG.TK_LEVELS_COUNT, n)) - 1];
  };

  /** Banyak level pada sebuah jalur ('tk' atau 'sd'). */
  MG.levelCount = function (track) {
    return (track || 'sd') === 'tk' ? MG.CONFIG.TK_LEVELS_COUNT : MG.CONFIG.LEVELS_COUNT;
  };

  /** Ambil definisi level pada jalur tertentu. */
  MG.levelOf = function (track, n) {
    return (track || 'sd') === 'tk' ? MG.tkLevel(n) : MG.level(n);
  };

  /** Teks label level untuk ditampilkan, mis. "TK 3" atau "Level 12". */
  MG.levelLabel = function (track, n) {
    return (track || 'sd') === 'tk' ? ('TK ' + n) : ('Level ' + n);
  };

})(window);
