/* ============================================================
 *  db.js  —  Lapisan database SQLite (sql.js / WebAssembly)
 *
 *  Cara kerja:
 *   1. Database ini adalah file SQLite sungguhan (format .sqlite).
 *   2. File itu disimpan utuh di IndexedDB (atau localStorage sebagai
 *      cadangan) supaya progres anak tetap ada saat aplikasi dibuka lagi.
 *   3. Kalau game dijalankan lewat server.js, file yang sama juga
 *      disalin ke disk (data/game.sqlite) sebagai cadangan kedua.
 * ============================================================ */
(function (global) {
  'use strict';

  var MG = global.MG = global.MG || {};
  var U = MG.utils;
  var DB = MG.db = {};

  var SQLJS = null;   // modul sql.js hasil initSqlJs (pemilik .Database)
  var ENGINE = null;  // instance Database sql.js yang sedang dipakai
  var ready = false;
  var storage = 'none';// 'indexeddb' | 'localstorage' | 'memory'
  var serverSync = false;

  /* ============================================================
   *  PENYIMPANAN (IndexedDB → localStorage → memori)
   * ============================================================ */

  var IDB_NAME = 'matematika-ajaib';
  var IDB_STORE = 'files';

  /**
   * Buka database IndexedDB.
   * Ada batas waktu supaya halaman tidak menggantung kalau IndexedDB
   * diblokir peramban (sering terjadi saat file:// di Safari/Firefox).
   */
  function idbOpen(timeoutMs) {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) return reject(new Error('IndexedDB tidak tersedia'));

      var timer = null;
      function done(fn, arg) {
        if (timer) { clearTimeout(timer); timer = null; }
        fn(arg);
      }

      var req;
      try { req = global.indexedDB.open(IDB_NAME, 1); }
      catch (e) { return reject(e); }

      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = function () { done(resolve, req.result); };
      req.onerror = function () { done(reject, req.error || new Error('IndexedDB gagal')); };
      req.onblocked = function () { done(reject, new Error('IndexedDB diblokir')); };

      timer = setTimeout(function () {
        timer = null;
        reject(new Error('IndexedDB timeout'));
      }, timeoutMs || 3000);
    });
  }

  function idbSet(key, val, timeoutMs) {
    return idbOpen(timeoutMs).then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(val, key);
        tx.oncomplete = function () { db.close(); resolve(true); };
        tx.onerror = function () { db.close(); reject(tx.error || new Error('IndexedDB tulis gagal')); };
        tx.onabort = function () { db.close(); reject(tx.error || new Error('IndexedDB dibatalkan')); };
      });
    });
  }

  function idbGet(key, timeoutMs) {
    return idbOpen(timeoutMs).then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readonly');
        var r = tx.objectStore(IDB_STORE).get(key);
        r.onsuccess = function () { db.close(); resolve(r.result || null); };
        r.onerror = function () { db.close(); reject(tx.error || new Error('IndexedDB baca gagal')); };
      });
    });
  }

  function lsKey(key) { return 'ma:' + key; }

  /* Byte array <-> base64 */
  function bytesToB64(bytes) {
    var bin = '';
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return global.btoa(bin);
  }

  function b64ToBytes(b64) {
    var bin = global.atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  var store = {
    save: function (bytes) {
      if (storage === 'indexeddb') {
        return idbSet(MG.CONFIG.STORAGE_KEY, bytes, 2500).catch(function () {
          // IndexedDB tidak bisa dipakai — pindah permanen ke localStorage
          storage = 'localstorage';
          return lsSave(bytes);
        });
      }
      return lsSave(bytes);
    },
    load: function () {
      if (storage === 'indexeddb') {
        return idbGet(MG.CONFIG.STORAGE_KEY, 2500).then(function (v) {
          return v || lsLoad();
        }).catch(function () { return lsLoad(); });
      }
      return Promise.resolve(lsLoad());
    }
  };

  function lsSave(bytes) {
    try { global.localStorage.setItem(lsKey(MG.CONFIG.STORAGE_KEY), bytesToB64(bytes)); return Promise.resolve(); }
    catch (e) { storage = 'memory'; return Promise.resolve(); }
  }
  function lsLoad() {
    try {
      var s = global.localStorage.getItem(lsKey(MG.CONFIG.STORAGE_KEY));
      return s ? b64ToBytes(s) : null;
    } catch (e) { return null; }
  }

  /* ============================================================
   *  SKEMA TABEL
   * ============================================================ */
  var SCHEMA = [
    `CREATE TABLE IF NOT EXISTS players (
       id         INTEGER PRIMARY KEY AUTOINCREMENT,
       name       TEXT NOT NULL,
       avatar     TEXT NOT NULL DEFAULT '🙂',
       created_at TEXT NOT NULL
     );`,
    /* Catatan: papan peringkat TIDAK memakai tabel tersendiri di peramban.
   Peringkat dihitung langsung dari tabel players + level_progress
   (lihat DB.getLocalLeaderboard), sedangkan peringkat online disimpan
   di server (lihat server.js). Tidak ada tabel leaderboard di sini
   supaya file ekspor tetap ramping. */
    `CREATE TABLE IF NOT EXISTS level_progress (
       player_id       INTEGER NOT NULL,
       level           INTEGER NOT NULL,
       track           TEXT NOT NULL DEFAULT 'sd',
       best_score      INTEGER NOT NULL DEFAULT 0,
       best_stars      INTEGER NOT NULL DEFAULT 0,
       best_correct    INTEGER NOT NULL DEFAULT 0,
       plays           INTEGER NOT NULL DEFAULT 0,
       cleared         INTEGER NOT NULL DEFAULT 0,
       no_heart_clear  INTEGER NOT NULL DEFAULT 0,
       last_played_at  TEXT,
       PRIMARY KEY (player_id, level, track)
     );`,
    `CREATE TABLE IF NOT EXISTS attempts (
       id          INTEGER PRIMARY KEY AUTOINCREMENT,
       player_id   INTEGER NOT NULL,
       level       INTEGER NOT NULL,
       track       TEXT NOT NULL DEFAULT 'sd',
       correct     INTEGER NOT NULL,
       total       INTEGER NOT NULL,
       accuracy    REAL NOT NULL,
       score       INTEGER NOT NULL,
       stars       INTEGER NOT NULL,
       duration_ms INTEGER NOT NULL,
       hearts_left INTEGER NOT NULL DEFAULT 0,
       cleared     INTEGER NOT NULL DEFAULT 0,
       played_at   TEXT NOT NULL
     );`,
    `CREATE TABLE IF NOT EXISTS question_log (
       id         INTEGER PRIMARY KEY AUTOINCREMENT,
       attempt_id INTEGER,
       player_id  INTEGER NOT NULL,
       level      INTEGER NOT NULL,
       topic      TEXT,
       topic_name TEXT,
       question   TEXT,
       given      TEXT,
       answer     TEXT,
       is_correct INTEGER NOT NULL DEFAULT 0,
       time_ms    INTEGER NOT NULL DEFAULT 0,
       logged_at  TEXT NOT NULL
     );`,
    `CREATE TABLE IF NOT EXISTS topic_stats (
       player_id INTEGER NOT NULL,
       topic      TEXT NOT NULL,
       topic_name TEXT,
       correct    INTEGER NOT NULL DEFAULT 0,
       total      INTEGER NOT NULL DEFAULT 0,
       PRIMARY KEY (player_id, topic)
     );`,
    `CREATE TABLE IF NOT EXISTS badges (
       id        INTEGER PRIMARY KEY AUTOINCREMENT,
       player_id INTEGER NOT NULL,
       code      TEXT NOT NULL,
       earned_at TEXT NOT NULL,
       UNIQUE (player_id, code)
     );`,
    `CREATE TABLE IF NOT EXISTS settings (
       key   TEXT PRIMARY KEY,
       value TEXT
     );`,
    'CREATE INDEX IF NOT EXISTS idx_attempts_player ON attempts(player_id, played_at);',
    'CREATE INDEX IF NOT EXISTS idx_qlog_player ON question_log(player_id, logged_at);'
  ];

  /* ============================================================
   *  MIGRASI
   *
   *  Databases lama (dari versi game sebelumnya) belum punya kolom
   *  ini. SQLite tidak punya "ADD COLUMN IF NOT EXISTS", jadi kolom
   *  dicek dulu lewat PRAGMA table_info, baru ditambahkan bila belum ada.
   * ============================================================ */

  var PLAYER_COLUMNS = [
    ['uid', "TEXT DEFAULT ''"],
    ['grade', 'INTEGER NOT NULL DEFAULT 1'],
    ['color', "TEXT DEFAULT ''"],
    ['time_limit', 'INTEGER'],
    ['difficulty', "TEXT DEFAULT ''"],
    ['track', "TEXT DEFAULT 'sd'"],
    ['last_seen', 'TEXT']
  ];

  function hasColumn(table, col) {
    var rows = all('PRAGMA table_info(' + table + ')');
    return rows.some(function (r) { return r.name === col; });
  }

  /** Id pendek yang stabil untuk seorang pemain (dipakai di leaderboard). */
  function newUid() {
    return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function migrate() {
    PLAYER_COLUMNS.forEach(function (c) {
      if (!hasColumn('players', c[0])) {
        try { run('ALTER TABLE players ADD COLUMN ' + c[0] + ' ' + c[1]); }
        catch (e) { console.warn('[db] gagal menambah kolom ' + c[0], e); }
      }
    });

    // Kolom 'track' memisahkan progres level TK dari level SD
    // (database lama otomatis dianggap 'sd').
    if (!hasColumn('attempts', 'track')) {
      try { run("ALTER TABLE attempts ADD COLUMN track TEXT NOT NULL DEFAULT 'sd'"); }
      catch (e) { console.warn('[db] gagal menambah kolom track pada attempts', e); }
    }
    // level_progress ikut memakai 'track' di kunci utama. Database lama
    // (yang kuncinya hanya player_id+level) dibangun ulang supaya level TK
    // dan SD tidak saling menimpa. Menambah kolom saja tidak cukup karena
    // kunci utamanya juga harus berubah.
    if (!hasColumn('level_progress', 'track')) {
      try {
        run("CREATE TABLE level_progress_new (" +
          "player_id INTEGER NOT NULL, level INTEGER NOT NULL, track TEXT NOT NULL DEFAULT 'sd'," +
          "best_score INTEGER NOT NULL DEFAULT 0, best_stars INTEGER NOT NULL DEFAULT 0," +
          "best_correct INTEGER NOT NULL DEFAULT 0, plays INTEGER NOT NULL DEFAULT 0," +
          "cleared INTEGER NOT NULL DEFAULT 0, no_heart_clear INTEGER NOT NULL DEFAULT 0," +
          "last_played_at TEXT, PRIMARY KEY (player_id, level, track))");
        run("INSERT INTO level_progress_new (player_id, level, track, best_score, best_stars, best_correct, plays, cleared, no_heart_clear, last_played_at) " +
          "SELECT player_id, level, 'sd', best_score, best_stars, best_correct, plays, cleared, no_heart_clear, last_played_at FROM level_progress");
        run('DROP TABLE level_progress');
        run('ALTER TABLE level_progress_new RENAME TO level_progress');
      } catch (e) { console.warn('[db] gagal memigrasikan track level_progress', e); }
    }

    // pastikan semua pemain punya uid & waktu main terakhir
    var rows = all("SELECT id FROM players WHERE uid IS NULL OR uid = ''");
    rows.forEach(function (r) {
      run('UPDATE players SET uid = ?, last_seen = COALESCE(last_seen, created_at) WHERE id = ?',
        [newUid(), r.id]);
    });

    try {
      run('CREATE INDEX IF NOT EXISTS idx_players_uid ON players(uid)');
    } catch (e) { /* indeks bersifat opsional */ }
  }

  /* ============================================================
   *  LENCANA (badge)
   * ============================================================ */
  MG.BADGES = [
    { code: 'first',     emoji: '🌱', name: 'Langkah Pertama',  desc: 'Menyelesaikan level pertama' },
    { code: 'perfect',   emoji: '🎯', name: 'Sempurna',        desc: 'Mendapat 3 bintang di suatu level' },
    { code: 'combo5',    emoji: '🔥', name: 'Beruntun 5',       desc: '5 jawaban benar berturut-turut' },
    { code: 'level5',    emoji: '🏅', name: 'Level 5 Tuntas',   desc: 'Menyelesaikan 5 level' },
    { code: 'level10',   emoji: '🏆', name: 'Level 10 Tuntas',  desc: 'Menyelesaikan 10 level' },
    { code: 'level20',   emoji: '👑', name: 'Master Matematika', desc: 'Menyelesaikan seluruh 20 level' },
    { code: 'fast',      emoji: '⚡', name: 'Jawab Kilat',      desc: 'Menjawab benar dalam 3 detik' },
    { code: 'scholar50', emoji: '📚', name: 'Pelajar Rajin',    desc: '50 jawaban benar' },
    { code: 'genius',    emoji: '🧠', name: 'Jenius',           desc: '200 jawaban benar' },
    { code: 'stars25',   emoji: '⭐', name: 'Bintang 25',       desc: 'Mengumpulkan 25 bintang' },
    { code: 'stars50',   emoji: '🌟', name: 'Bintang 50',       desc: 'Mengumpulkan 50 bintang' },
    { code: 'flawless',  emoji: '💎', name: 'Tanpa Salah',      desc: 'Menyelesaikan level tanpa kehilangan hati' },
    { code: 'topicPro',  emoji: '🧩', name: 'Serba Bisa',       desc: 'Benar di 10 topik berbeda' },
    { code: 'night',     emoji: '🦉', name: 'Pelajar Sabuk',    desc: 'Bermain 7 hari berbeda' }
  ];
  MG.badgeByCode = function (code) {
    for (var i = 0; i < MG.BADGES.length; i++) if (MG.BADGES[i].code === code) return MG.BADGES[i];
    return null;
  };

  /* ============================================================
   *  INISIALISASI
   * ============================================================ */

  /** Deteksi media penyimpanan terbaik yang tersedia di peramban ini. */
  function detectStorage() {
    function tryLocal() {
      try {
        global.localStorage.setItem('__probe__', '1');
        global.localStorage.removeItem('__probe__');
        return 'localstorage';
      } catch (e) { return 'memory'; }
    }

    // Tes tulis-baca sungguhan; kalau macet, langsung pindah localStorage.
    return idbSet('__probe__', new Uint8Array([1]), 1500)
      .then(function () { return 'indexeddb'; })
      .catch(function () { return tryLocal(); });
  }

  DB.init = function () {
    if (ready) return Promise.resolve(true);

    return detectStorage()
      .then(function (kind) { storage = kind; })
      .then(loadSQLite)
      .then(function (bytes) {
        ENGINE = new SQLJS.Database(bytes ? bytes : undefined);
        ENGINE.run(SCHEMA.join('\n'));
        ENGINE.run('PRAGMA foreign_keys = ON;');
        ready = true;
        migrate();
        return true;
      })
      .catch(function (err) {
        console.error('[db] gagal inisialisasi:', err);
        U.toast('Database tidak bisa dibuka. Progres mungkin tidak tersimpan.', 'err');
        return false;
      });
  };

  function loadSQLite() {
    if (typeof global.initSqlJs !== 'function') return Promise.reject(new Error('sql.js tidak termuat'));

    // Wasm sudah ditanam sebagai base64 supaya tetap jalan dari file://
    var cfg = {};
    if (global.SQL_WASM_BASE64) {
      cfg.wasmBinary = b64ToBytes(global.SQL_WASM_BASE64);
    } else if (global.location && global.location.protocol.indexOf('http') === 0) {
      cfg.locateFile = function (f) { return 'assets/vendor/' + f; };
    } else {
      return Promise.reject(new Error('sql-wasm tidak tersedia untuk file://'));
    }

    return global.initSqlJs(cfg).then(function (mod) {
      SQLJS = mod;
      return store.load();
    });
  }

  DB.isReady = function () { return ready; };
  DB.storageKind = function () { return storage; };

  /* ============================================================
   *  HELPER QUERY
   *
   *  Catatan: di sql.js, Statement hanya punya bind() berbentuk daftar
   *  nilai (stmt.bind([a, b])), bukan bind(nomor, nilai). Supaya aman,
   *  semua query berparameter di sini memakai run()/exec() yang sudah
   *  menerima daftar parameter dengan benar.
   * ============================================================ */

  /** Ubah satu nilai / array menjadi daftar parameter sql.js. */
  function norm(params) {
    if (params === undefined || params === null) return undefined;
    var arr = Array.isArray(params) ? params : [params];
    return arr.length ? arr : undefined;
  }

  function run(sql, params) {
    if (!ready) throw new Error('DB belum siap');
    ENGINE.run(sql, norm(params));
    return ENGINE.getRowsModified();
  }

  function all(sql, params) {
    if (!ready) return [];
    var res = ENGINE.exec(sql, norm(params));
    if (!res || !res.length || !res[0].values) return [];
    var cols = res[0].columns;
    var rows = res[0].values;
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var row = {};
      for (var j = 0; j < cols.length; j++) row[cols[j]] = rows[i][j];
      out.push(row);
    }
    return out;
  }

  function one(sql, params) { var r = all(sql, params); return r.length ? r[0] : null; }

  function scalar(sql, params) {
    var r = all(sql, params);
    if (!r.length) return null;
    var k = Object.keys(r[0])[0];
    return r[0][k];
  }

  /* ============================================================
   *  PEMAIN (banyak pemain, satu perangkat)
   *
   *  Satu perangkat bisa dipakai beberapa anak. Tiap pemain punya
   *  baris sendiri di tabel players; semua progres (level_progress,
   *  attempts, question_log, topic_stats, badges) memakai player_id
   *  sehingga tidak saling tercampur. Pemain yang sedang dipakai
   *  disimpan di tabel settings dengan kunci 'active_player'.
   * ============================================================ */

  var PLAYER_COLORS = ['#7C6BFF', '#FF5C8A', '#3FBF6F', '#FF9F1C', '#35A7FF', '#E43F8F'];

  /** Nama warna acak untuk kartu pemain baru. */
  function pickColor() {
    return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
  }

  /** Pemain aktif; bila tidak ada, ambil yang pertama. */
  DB.getPlayer = function () {
    var id = parseInt(DB.getSetting('active_player', '0'), 10) || 0;
    if (id) {
      var p = one('SELECT * FROM players WHERE id = ?', [id]);
      if (p) return p;
    }
    return one('SELECT * FROM players ORDER BY id ASC LIMIT 1');
  };

  DB.activePlayerId = function () {
    var p = DB.getPlayer();
    return p ? p.id : 0;
  };

  DB.listPlayers = function () {
    return all('SELECT * FROM players ORDER BY id ASC');
  };

  DB.playerCount = function () {
    return scalar('SELECT COUNT(*) AS c FROM players') || 0;
  };

  DB.createPlayer = function (name, avatar, grade) {
    var nm = String(name || 'Pemain').trim().slice(0, 16) || 'Pemain';
    run(`INSERT INTO players (name, avatar, grade, color, uid, created_at, last_seen)
         VALUES (?,?,?,?,?,?,?)`,
      [nm, avatar || '🙂', grade || 1, pickColor(), newUid(), U.now(), U.now()]);
    var id = lastInsertId();
    save();
    var p = DB.getPlayerById(id);
    DB.selectPlayer(id);
    return p;
  };

  DB.getPlayerById = function (id) {
    return one('SELECT * FROM players WHERE id = ?', [id]);
  };

  /** Jadikan pemain dengan id tertentu sebagai pemain aktif. */
  DB.selectPlayer = function (id) {
    var p = DB.getPlayerById(id);
    if (!p) return null;
    DB.setSetting('active_player', p.id);
    run('UPDATE players SET last_seen = ? WHERE id = ?', [U.now(), p.id]);
    return DB.getPlayer();
  };

  DB.deletePlayer = function (id) {
    if (DB.playerCount() <= 1) return false;      // harus selalu ada satu pemain
    var rows = [
      'DELETE FROM level_progress WHERE player_id = ?',
      'DELETE FROM attempts WHERE player_id = ?',
      'DELETE FROM question_log WHERE player_id = ?',
      'DELETE FROM topic_stats WHERE player_id = ?',
      'DELETE FROM badges WHERE player_id = ?'
    ];
    rows.forEach(function (sql) { run(sql, [id]); });
    run('DELETE FROM players WHERE id = ?', [id]);

    // kalau pemain aktif dihapus, pindah ke pemain yang tersisa
    var active = parseInt(DB.getSetting('active_player', '0'), 10) || 0;
    if (active === id) {
      var next = one('SELECT id FROM players ORDER BY id ASC LIMIT 1');
      if (next) {
        run('UPDATE players SET last_seen = ? WHERE id = ?', [U.now(), next.id]);
        DB.setSetting('active_player', next.id);
      }
    }
    save();
    return true;
  };

  DB.ensurePlayer = function (name, avatar) {
    var p = DB.getPlayer();
    if (p) {
      run('UPDATE players SET name = ?, avatar = ? WHERE id = ?', [name || p.name, avatar || p.avatar, p.id]);
      return DB.getPlayer();
    }
    return DB.createPlayer(name || 'Pemain', avatar || '🙂', 1);
  };

  DB.updatePlayer = function (name, avatar, grade) {
    var p = DB.getPlayer();
    if (!p) return DB.createPlayer(name, avatar, grade);
    run('UPDATE players SET name = ?, avatar = ? WHERE id = ?',
      [name || p.name, avatar || p.avatar, p.id]);
    if (grade) run('UPDATE players SET grade = ? WHERE id = ?', [grade, p.id]);
    return DB.getPlayer();
  };

  function pid() {
    return DB.activePlayerId();
  }

  /* ---------- ringkasan untuk leaderboard ---------- */

  /**
   * Angka gabungan untuk peringkat.
   * Bobotnya disengaja: bintang jauh lebih bernilai daripada jumlah
   * level, supaya Collecting bintang tetap jadi tujuan utama.
   */
  DB.rankPoints = function (s) {
    return Math.round(s.stars * 10000 + s.cleared * 100 + s.accuracy * 100);
  };

  /** Ringkasan satu pemain (id tertentu, default: pemain aktif). */
  DB.playerSummary = function (id) {
    var pidv = id == null ? pid() : id;
    var p = DB.getPlayerById(pidv);
    if (!p) return null;

    var lp = one(`SELECT COALESCE(SUM(best_stars),0) AS stars,
                         COALESCE(SUM(best_score),0) AS score,
                         COALESCE(SUM(cleared),0)    AS cleared
                  FROM level_progress WHERE player_id = ?`, [pidv]) || {};
    var at = one(`SELECT COUNT(*) AS attempts,
                         COALESCE(SUM(correct),0) AS correct,
                         COALESCE(SUM(total),0)   AS questions
                  FROM attempts WHERE player_id = ?`, [pidv]) || {};
    var badges = scalar('SELECT COUNT(*) AS c FROM badges WHERE player_id = ?', [pidv]) || 0;

    var q = at.questions || 0;
    var accuracy = q ? (at.correct || 0) / q : 0;

    var out = {
      id: pidv,
      uid: p.uid,
      name: p.name,
      avatar: p.avatar,
      grade: p.grade || 1,
      color: p.color || '',
      stars: lp.stars || 0,
      score: lp.score || 0,
      cleared: lp.cleared || 0,
      attempts: at.attempts || 0,
      accuracy: accuracy,
      badges: badges,
      lastSeen: p.last_seen || p.created_at,
      lastPlayed: one('SELECT MAX(played_at) AS t FROM attempts WHERE player_id = ?', [pidv]) ?
        one('SELECT MAX(played_at) AS t FROM attempts WHERE player_id = ?', [pidv]).t : null
    };
    out.points = DB.rankPoints(out);
    return out;
  };

  /** Semua pemain di perangkat ini, sudah diurutkan dari yang tertinggi. */
  DB.getLocalLeaderboard = function (limit) {
    var rows = DB.listPlayers().map(function (p) { return DB.playerSummary(p.id); });
    rows.sort(function (a, b) {
      return b.points - a.points || b.stars - a.stars || (a.name < b.name ? -1 : 1);
    });
    rows.forEach(function (r, i) { r.rank = i + 1; });
    return limit ? rows.slice(0, limit) : rows;
  };

  /* ============================================================
   *  PENGATURAN
   * ============================================================ */
  DB.getSetting = function (key, fallback) {
    var v = scalar('SELECT value FROM settings WHERE key = ?', [key]);
    return v == null ? fallback : v;
  };
  DB.setSetting = function (key, value) {
    run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, String(value)]);
    save();
  };
  DB.getAllSettings = function () {
    var o = {}, rows = all('SELECT key, value FROM settings');
    rows.forEach(function (r) { o[r.key] = r.value; });
    return o;
  };

  /* ---------- pengaturan milik seorang pemain ----------
   *
   *  Nilai bawaan (tabel settings) berlaku untuk perangkat ini; bila
   *  seorang pemain punya nilainya sendiri, nilai itulah yang dipakai.
   *  Jadi satu anak bisa memakai waktu 15 detik sementara saudaranya
   *  tetap 30 detik di perangkat yang sama.
   */

  var PLAYER_SETTING_COLS = {
    time_limit: 'time_limit',
    difficulty: 'difficulty',
    track: 'track'
  };

  DB.getPlayerSetting = function (key, fallback) {
    var col = PLAYER_SETTING_COLS[key];
    if (!col) return fallback;
    var p = DB.getPlayer();
    if (!p) return fallback;
    var v = p[col];
    // dikembalikan sebagai teks, sama seperti DB.getSetting()
    return (v == null || v === '') ? fallback : String(v);
  };

  DB.setPlayerSetting = function (key, value) {
    var col = PLAYER_SETTING_COLS[key];
    if (!col) return;
    var p = DB.getPlayer();
    if (!p) return;
    run('UPDATE players SET ' + col + ' = ? WHERE id = ?',
      [value == null || value === '' ? null : value, p.id]);
    save();
  };

  /* ============================================================
   *  PROGRES LEVEL
   * ============================================================ */

  /** Normalisasi nama jalur. */
  function trk(track) { return (track || 'sd') === 'tk' ? 'tk' : 'sd'; }

  DB.getLevelProgress = function (level, track) {
    return one('SELECT * FROM level_progress WHERE player_id = ? AND level = ? AND track = ?',
      [pid(), level, trk(track)]);
  };

  DB.getAllProgress = function (track) {
    var rows = all('SELECT * FROM level_progress WHERE player_id = ? AND track = ? ORDER BY level ASC',
      [pid(), trk(track)]);
    var map = {};
    rows.forEach(function (r) { map[r.level] = r; });
    return map;
  };

  /** Level tertinggi yang sudah terbuka pada jalur tertentu (1 = selalu terbuka). */
  DB.getUnlockedLevel = function (track) {
    var t = trk(track);
    var max = MG.levelCount(t);
    var map = DB.getAllProgress(t);
    var maxUnlocked = 1;
    for (var lv = 1; lv < max; lv++) {
      if (map[lv] && map[lv].cleared) maxUnlocked = Math.max(maxUnlocked, lv + 1);
      else break;
    }
    return Math.min(maxUnlocked, max);
  };

  /** Total bintang (SD + TK) atau hanya satu jalur bila diminta. */
  DB.getStars = function (track) {
    var rows = track
      ? all('SELECT best_stars FROM level_progress WHERE player_id = ? AND track = ?', [pid(), trk(track)])
      : all('SELECT best_stars FROM level_progress WHERE player_id = ?', [pid()]);
    var t = 0;
    rows.forEach(function (r) { t += r.best_stars; });
    return t;
  };

  DB.getMaxStars = function () {
    return (MG.CONFIG.LEVELS_COUNT + MG.CONFIG.TK_LEVELS_COUNT) * 3;
  };

  /** Jumlah level selesai (SD + TK) atau hanya satu jalur bila diminta. */
  DB.getClearedCount = function (track) {
    var sql = track
      ? 'SELECT COUNT(*) AS c FROM level_progress WHERE player_id = ? AND track = ? AND cleared = 1'
      : 'SELECT COUNT(*) AS c FROM level_progress WHERE player_id = ? AND cleared = 1';
    return scalar(sql, track ? [pid(), trk(track)] : [pid()]) || 0;
  };

  /* ============================================================
   *  MENYIMPAN HASIL SATU PERMAINAN
   * ============================================================ */

  /**
   * @param {object} r {level, correct, total, score, stars, durationMs, heartsLeft, cleared, questions:[]}
   * @returns {{attemptId:number, newStars:boolean, newBest:boolean}}
   */
  DB.recordAttempt = function (r) {
    var p = pid();
    var track = trk(r.track);
    var accuracy = r.total ? r.correct / r.total : 0;
    var now = U.now();

    run(`INSERT INTO attempts
         (player_id, level, track, correct, total, accuracy, score, stars, duration_ms, hearts_left, cleared, played_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [p, r.level, track, r.correct, r.total, accuracy, r.score, r.stars, r.durationMs, r.heartsLeft, r.cleared ? 1 : 0, now]);
    var attemptId = lastInsertId();

    // log per soal
    (r.questions || []).forEach(function (q) {
      run(`INSERT INTO question_log
           (attempt_id, player_id, level, topic, topic_name, question, given, answer, is_correct, time_ms, logged_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [attemptId, p, r.level, q.topic, q.topicName, stripTags(q.text), q.given == null ? '' : String(q.given),
          String(q.answer), q.isCorrect ? 1 : 0, q.timeMs || 0, now]);
      run(`INSERT INTO topic_stats (player_id, topic, topic_name, correct, total) VALUES (?,?,?,?,?)
           ON CONFLICT(player_id, topic) DO UPDATE SET
             correct    = topic_stats.correct + excluded.correct,
             total      = topic_stats.total + excluded.total,
             topic_name = COALESCE(excluded.topic_name, topic_stats.topic_name)`,
        [p, q.topic || 'lainnya', q.topicName || null, q.isCorrect ? 1 : 0, 1]);
    });

    // gabung ke level_progress
    var prev = DB.getLevelProgress(r.level, track);
    var bestStars = prev ? prev.best_stars : 0;
    var bestScore = prev ? prev.best_score : 0;
    var bestCorrect = prev ? prev.best_correct : 0;
    var plays = prev ? prev.plays : 0;
    var cleared = prev ? prev.cleared : 0;
    var noHeart = prev ? prev.no_heart_clear : 0;

    var newStars = r.stars > bestStars;
    var newBest = r.score > bestScore;

    if (prev) {
      run(`UPDATE level_progress SET
             best_score = ?, best_stars = ?, best_correct = ?, plays = plays + 1,
             cleared = ?, no_heart_clear = ?, last_played_at = ?
           WHERE player_id = ? AND level = ? AND track = ?`,
        [Math.max(bestScore, r.score), Math.max(bestStars, r.stars), Math.max(bestCorrect, r.correct),
          cleared || (r.cleared ? 1 : 0), noHeart || (r.cleared && r.heartsLeft >= MG.CONFIG.START_HEARTS ? 1 : 0),
          now, p, r.level, track]);
    } else {
      run(`INSERT INTO level_progress
           (player_id, level, track, best_score, best_stars, best_correct, plays, cleared, no_heart_clear, last_played_at)
           VALUES (?,?,?,?,?,?,1,?,?,?)`,
        [p, r.level, track, r.score, r.stars, r.correct, r.cleared ? 1 : 0,
          (r.cleared && r.heartsLeft >= MG.CONFIG.START_HEARTS) ? 1 : 0, now]);
    }

    save();
    return { attemptId: attemptId, newStars: newStars, newBest: newBest };
  };

  function lastInsertId() {
    try { return scalar('SELECT last_insert_rowid() AS id'); } catch (e) { return 0; }
  }

  function stripTags(s) {
    return String(s == null ? '' : s).replace(/<[^>]*>/g, '');
  }

  /* ============================================================
   *  HISTORI & STATISTIK
   * ============================================================ */

  DB.getHistory = function (limit) {
    return all(`SELECT * FROM attempts WHERE player_id = ? ORDER BY id DESC LIMIT ?`,
      [pid(), limit || 20]);
  };

  DB.getOverview = function () {
    var o = one(`SELECT
        COUNT(*)            AS attempts,
        COALESCE(SUM(correct),0)   AS correct,
        COALESCE(SUM(total),0)     AS questions,
        COALESCE(SUM(score),0)     AS score,
        COALESCE(SUM(duration_ms),0) AS duration_ms
      FROM attempts WHERE player_id = ?`, [pid()]) || {};

    var cleared = DB.getClearedCount();
    var stars = DB.getStars();
    var q = o.questions || 0;
    var c = o.correct || 0;

    return {
      attempts: o.attempts || 0,
      correct: c,
      questions: q,
      accuracy: q ? c / q : 0,
      totalScore: o.score || 0,
      durationMs: o.duration_ms || 0,
      cleared: cleared,
      stars: stars,
      maxStars: DB.getMaxStars(),
      daysPlayed: DB.getPlayDays().length
    };
  };

  DB.getPlayDays = function () {
    var rows = all(`SELECT DISTINCT substr(played_at, 1, 10) AS d
                   FROM attempts WHERE player_id = ? ORDER BY d DESC`, [pid()]);
    return rows.map(function (r) { return r.d; });
  };

  DB.getTopicStats = function () {
    return all(`SELECT t.topic, t.topic_name, t.correct, t.total
                FROM topic_stats t WHERE t.player_id = ?
                ORDER BY t.total DESC`, [pid()]);
  };

  /** Topik yang paling sering dikeluhkan (untuk saran belajar). */
  DB.getWeakTopics = function (limit) {
    return all(`SELECT topic, SUM(correct) AS correct, SUM(total) AS total
                FROM topic_stats WHERE player_id = ? AND total >= 3
                GROUP BY topic
                HAVING total >= 3
                ORDER BY (CAST(correct AS REAL)/total) ASC
                LIMIT ?`, [pid(), limit || 3]);
  };

  /* ============================================================
   *  LENCANA
   * ============================================================ */

  DB.getBadges = function () {
    var rows = all('SELECT code, earned_at FROM badges WHERE player_id = ? ORDER BY earned_at ASC', [pid()]);
    var out = {};
    rows.forEach(function (r) { out[r.code] = r.earned_at; });
    return out;
  };

  DB.hasBadge = function (code) {
    return !!scalar('SELECT 1 AS x FROM badges WHERE player_id = ? AND code = ?', [pid(), code]);
  };

  /** Beri lencana kalau belum punya. Return true kalau benar-benar baru didapat. */
  DB.awardBadge = function (code) {
    if (DB.hasBadge(code)) return false;
    run('INSERT OR IGNORE INTO badges (player_id, code, earned_at) VALUES (?,?,?)', [pid(), code, U.now()]);
    save();
    return true;
  };

  /* ============================================================
   *  PENYIMPANAN / PEMUATAN / EKSIMPOR
   * ============================================================ */

  var saveTimer = null;

  /** Simpan file SQLite ke penyimpanan browser (debounce 700ms). */
  function save() {
    if (!ready) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        var bytes = ENGINE.export();
        store.save(bytes).then(function () { syncToServer(bytes); }, function () { });
      } catch (e) { console.warn('[db] gagal menyimpan:', e); }
    }, 700);
  }
  DB.saveNow = function () {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!ready) return Promise.resolve();
    var bytes = ENGINE.export();
    return store.save(bytes).then(function () { return syncToServer(bytes); });
  };

  /** True bila halaman dijalankan lewat HTTP (ada server.js). */
  function serverReachable() {
    return !!(global.fetch && global.location &&
      global.location.protocol.indexOf('http') === 0);
  }

  /** Id pemain untuk slot simpanan server (biar tiap orang punya salinan sendiri). */
  function slotKey() {
    var p = DB.getPlayer();
    return p && p.uid ? p.uid : 'browser';
  }

  /* Sinkronisasi opsional ke server.js (kalau ada) */
  function syncToServer(bytes) {
    if (!serverSync || !serverReachable()) return Promise.resolve();
    try {
      return fetch('/api/state?slot=' + encodeURIComponent(slotKey()), {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: bytes
      }).catch(function () { /* diam saja, kelangsungan lokal tetap aman */ });
    } catch (e) { return Promise.resolve(); }
  }

  DB.setServerSync = function (on) { serverSync = !!on; };
  DB.serverSyncEnabled = function () { return serverSync; };

  /**
   * Periksa apakah menukar database dengan `incoming` akan menghapus
   * pemain yang masih punya progres di perangkat ini.
   * @returns {string|null}  nama pemain yang hilang, atau null bila aman
   */
  function wouldLosePlayers(incoming) {
    try {
      var remote = incoming.exec('SELECT uid FROM players;');
      var remoteUids = {};
      (remote[0] ? remote[0].values : []).forEach(function (row) {
        if (row[0]) remoteUids[row[0]] = true;
      });

      var lokal = all('SELECT id, uid, name FROM players');
      for (var i = 0; i < lokal.length; i++) {
        var p = lokal[i];
        if (!p.uid || remoteUids[p.uid]) continue;
        // pemain ini tidak ada di server — kalau masih punya progres,
        // menimpa akan menghapusnya.
        var punya = scalar('SELECT COUNT(*) AS c FROM level_progress WHERE player_id = ?', [p.id]) || 0;
        if (punya > 0) return p.name + ' (' + punya + ' level)';
      }
      return null;
    } catch (e) {
      return null;  // kalau tidak bisa diperiksa, biarkan yang lama berlaku
    }
  }

  /** Tarik data dari server bila tersedia dan datanya lebih baru dari lokal. */
  DB.pullFromServer = function () {
    if (!serverReachable()) {
      return Promise.resolve(false);
    }
    return fetch('/api/state?slot=' + encodeURIComponent(slotKey()), { method: 'GET' }).then(function (r) {
      if (!r.ok) return false;
      var len = Number(r.headers.get('content-length') || 0);
      if (!len) return false;
      return r.arrayBuffer().then(function (buf) {
        if (!buf.byteLength) return false;
        var localBytes = ENGINE.export();
        var newer = false;
        try {
          var ts = function (b) {
            var d = new SQLJS.Database(new Uint8Array(b));
            var v = d.exec("SELECT MAX(played_at) AS t FROM attempts;");
            d.close();
            return (v[0] && v[0].values[0][0]) || '';
          };
          newer = ts(buf) > ts(localBytes);
        } catch (e) { newer = false; }
        if (!newer) return false;

        var incoming = new SQLJS.Database(new Uint8Array(buf));
        var guard = wouldLosePlayers(incoming);
        var exported = incoming.export();
        incoming.close();

        if (guard) {
          // Ada pemain di perangkat ini yang tidak ada di data server dan
          // sudah punya progres. Menimpanya berarti menghapus progres itu,
          // jadi lebih baik dibatalkan diam-diam.
          console.warn('[db] tarikan server dibatalkan:', guard);
          return false;
        }

        ENGINE.close();
        ENGINE = new SQLJS.Database(exported);
        ENGINE.run(SCHEMA.join('\n'));
        ready = true;
        migrate();
        store.save(exported);
        return true;
      });
    }).catch(function () { return false; });
  };

  /* ============================================================
   *  PAPAN PERINGKAT (LEADERBOARD)
   *
   *  Tiga sumber data:
   *    1. perangkat ini  -> DB.getLocalLeaderboard()
   *    2. server lokal   -> POST /api/score   (kirim hasil kita)
   *    3. server lokal   -> GET  /api/leaderboard (lihat semua pemain)
   *
   *  Kalau game dibuka dengan klik 2x (file://) tidak ada server,
   *  jadi papan peringkat online otomatis disembunyikan.
   * ============================================================ */

  var lastPublished = 0;

  /** True bila papan peringkat online bisa dipakai. */
  DB.onlineAvailable = function () { return serverReachable(); };

  /** Kirim ringkasan pemain aktif ke server (dibatasi 1x per 20 detik). */
  DB.publishScore = function (force) {
    if (!serverReachable()) return Promise.resolve(false);
    var now = Date.now();
    if (!force && now - lastPublished < 20000) return Promise.resolve(false);
    var s = DB.playerSummary();
    if (!s || !s.uid) return Promise.resolve(false);
    lastPublished = now;

    return fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s)
    }).then(function (r) { return r.ok; })
      .catch(function () { return false; });
  };

  /**
   * Ambil papan peringkat dari server.
   * @returns {Promise<{ok:boolean, rows:Array, myRank:number}>}
   */
  DB.fetchLeaderboard = function (limit) {
    if (!serverReachable()) return Promise.resolve({ ok: false, rows: [], myRank: 0 });
    var me = DB.getPlayer();
    var url = '/api/leaderboard?limit=' + (limit || 20) +
      (me && me.uid ? '&uid=' + encodeURIComponent(me.uid) : '');
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      return { ok: true, rows: (j && j.rows) || [], myRank: (j && j.rank) || 0 };
    }).catch(function () { return { ok: false, rows: [], myRank: 0 }; });
  };

  DB.exportBase64 = function () {
    if (!ready) return null;
    return bytesToB64(ENGINE.export());
  };

  /** Impor dari base64 (hasil ekspor). Kembalikan true kalau berhasil. */
  DB.importBase64 = function (b64) {
    var bytes;
    try { bytes = b64ToBytes(b64); }
    catch (e) { return Promise.reject(new Error('Format file tidak dikenali')); }

    // validasi: harus benar-benar file SQLite
    var incoming;
    try {
      incoming = new SQLJS.Database(bytes);
      var t = incoming.exec("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1;");
      if (!t.length) { incoming.close(); return Promise.reject(new Error('Bukan file progres game')); }
    } catch (e) {
      return Promise.reject(new Error('File rusak / bukan file SQLite'));
    }

    var exported = incoming.export();
    incoming.close();
    ENGINE.close();
    ENGINE = new SQLJS.Database(exported);
    ENGINE.run(SCHEMA.join('\n'));
    ready = true;
    migrate();
    return store.save(exported);
  };

  /* ============================================================
   *  RESET
   * ============================================================ */

  /**
   * Hapus progres pemain aktif saja (pemain lain tidak tersentuh).
   * @param {boolean} semua  true = hapus progres semua pemain di perangkat
   */
  DB.reset = function (semua) {
    if (!ready) return Promise.resolve();
    if (semua) {
      ENGINE.run('DELETE FROM attempts; DELETE FROM question_log; DELETE FROM level_progress;' +
        ' DELETE FROM topic_stats; DELETE FROM badges;');
      try { ENGINE.run("DELETE FROM sqlite_sequence WHERE name IN ('attempts','question_log');"); } catch (e) { }
    } else {
      var p = pid();
      run('DELETE FROM level_progress WHERE player_id = ?', [p]);
      run('DELETE FROM attempts WHERE player_id = ?', [p]);
      run('DELETE FROM question_log WHERE player_id = ?', [p]);
      run('DELETE FROM topic_stats WHERE player_id = ?', [p]);
      run('DELETE FROM badges WHERE player_id = ?', [p]);
    }
    return DB.saveNow();
  };

  /** Ganti seluruh isi database (dipakai saat ganti pemain). */
  DB.switchPlayer = function (name, avatar) {
    DB.ensurePlayer(name, avatar);
    return DB.saveNow();
  };

  DB.raw = { run: run, all: all, one: one, scalar: scalar };

})(window);
