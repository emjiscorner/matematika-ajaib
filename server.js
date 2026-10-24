#!/usr/bin/env node
/* ============================================================
 *  server.js  —  Server lokal OPSIONAL untuk Matematika Ajaib
 *
 *  Game ini sudah bisa dibuka langsung (klik 2x index.html).
 *  File ini cuma Tambahan supaya:
 *    - progres ikut tersimpan di file data/game.sqlite di disk,
 *    - bisa dibuka dari HP/komputer lain di jaringan yang sama.
 *
 *  Jalankan:   node server.js
 *  Alamat:     http://localhost:8080
 *
 *  Tidak memakai dependency apa pun (cukup modul bawaan Node).
 *  Butuh Node.js 18 atau lebih baru.
 * ============================================================ */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
// MA_DATA_DIR dipakai oleh uji agar tidak menyentuh data milik pengguna
const DATA_DIR = process.env.MA_DATA_DIR
  ? path.resolve(process.env.MA_DATA_DIR)
  : path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'game.sqlite');
const BLOB_FILE = path.join(DATA_DIR, 'progress.bin');   // salinan file SQLite browser
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

/* ------------------------------------------------------------
 *  Penyimpanan cadangan memakai SQLite bawaan Node (node:sqlite).
 *  Kalau modul ini tidak tersedia, kita tetap jalan tanpa DB.
 * ------------------------------------------------------------ */
let nodeSqlite = null;
let sqliteDB = null;

function initSqlite() {
  try {
    const { DatabaseSync } = require('node:sqlite');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    sqliteDB = new DatabaseSync(DB_FILE);
    sqliteDB.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS save_slots (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        byte_size  INTEGER NOT NULL,
        blob       BLOB NOT NULL,
        saved_at   TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS activity (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        event     TEXT NOT NULL,
        detail    TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS leaderboard (
        uid        TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        avatar     TEXT,
        grade      INTEGER,
        stars      INTEGER NOT NULL DEFAULT 0,
        cleared    INTEGER NOT NULL DEFAULT 0,
        score      INTEGER NOT NULL DEFAULT 0,
        accuracy   REAL NOT NULL DEFAULT 0,
        plays      INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_lb_rank ON leaderboard(stars, cleared, score);
    `);
    nodeSqlite = true;
    console.log('  ✓ Database SQLite   : data/game.sqlite');
  } catch (err) {
    nodeSqlite = false;
    console.log('  ⚠ node:sqlite tidak tersedia (' + err.message.split('\n')[0] + ')');
    console.log('    → progres tetap disimpan ke data/progress.bin');
  }
}

/* ------------------------------------------------------------
 *  Slot simpanan
 *
 *  Setiap pemain punya slot sendiri (berdasarkan uid-nya) supaya
 *  progres satu orang tidak menimpa orang lain di perangkat atau
 *  jaringan yang sama. Slot 'browser' dipakai sebagai bawaan
 *  (peramban yang tidak mengirim uid) dan juga menjadi salinan
 *  cadangan di data/progress.bin.
 * ------------------------------------------------------------ */

const DEFAULT_SLOT = 'browser';

function safeSlot(raw) {
  const s = String(raw || '').trim();
  if (!s) return DEFAULT_SLOT;
  // hanya huruf, angka, dan tanda hubung/garis bawah; maksimal 40 karakter
  const clean = s.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  return clean || DEFAULT_SLOT;
}

function saveBlob(buffer, label, slot) {
  const name = safeSlot(slot);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (name === DEFAULT_SLOT) fs.writeFileSync(BLOB_FILE, buffer);

  if (nodeSqlite && sqliteDB) {
    try {
      sqliteDB.prepare('DELETE FROM save_slots WHERE name = ?').run(name);
      sqliteDB.prepare('INSERT INTO save_slots (name, byte_size, blob, saved_at) VALUES (?,?,?,?)')
        .run(name, buffer.length, buffer, new Date().toISOString());
      sqliteDB.prepare('INSERT INTO activity (event, detail, created_at) VALUES (?,?,?)')
        .run('save', name + ' ' + buffer.length + ' bytes' + (label ? ' (' + label + ')' : ''),
          new Date().toISOString());
    } catch (err) {
      console.log('  ⚠ gagal menulis ke SQLite:', err.message);
    }
  }
}

function loadBlob(slot) {
  const name = safeSlot(slot);
  if (nodeSqlite && sqliteDB) {
    try {
      const row = sqliteDB.prepare('SELECT blob FROM save_slots WHERE name = ?').get(name);
      if (row && row.blob) return Buffer.from(row.blob);
    } catch (e) { /* lanjut ke berkas */ }
  }
  if (name !== DEFAULT_SLOT) return null;
  if (!fs.existsSync(BLOB_FILE)) return null;
  try {
    return fs.readFileSync(BLOB_FILE);
  } catch (e) {
    return null;
  }
}

/* ------------------------------------------------------------
 *  Papan peringkat
 * ------------------------------------------------------------ */

// Bobot sama dengan MG.db.rankPoints di sisi peramban:
// bintang jauh lebih bernilai daripada jumlah level.
function rankScore(row) {
  return row.stars * 10000 + row.cleared * 100 + Math.round(row.accuracy * 100);
}

function upsertScore(s) {
  if (!nodeSqlite || !sqliteDB) return { ok: false, reason: 'sqlite tidak tersedia' };
  const uid = String(s.uid || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  if (!uid) return { ok: false, reason: 'uid tidak valid' };

  const now = new Date().toISOString();
  const name = String(s.name || 'Pemain').slice(0, 24);
  const avatar = String(s.avatar || '🙂').slice(0, 8);
  const grade = Math.max(1, Math.min(6, parseInt(s.grade, 10) || 1));
  const stars = Math.max(0, parseInt(s.stars, 10) || 0);
  const cleared = Math.max(0, parseInt(s.cleared, 10) || 0);
  const score = Math.max(0, parseInt(s.score, 10) || 0);
  const plays = Math.max(0, parseInt(s.attempts != null ? s.attempts : s.plays, 10) || 0);
  let accuracy = parseFloat(s.accuracy);
  if (!isFinite(accuracy)) accuracy = 0;
  accuracy = Math.max(0, Math.min(1, accuracy));

  try {
    // Jangan turunkan rekor: simpan nilai terbaik yang pernah dicapai.
    sqliteDB.prepare(`
      INSERT INTO leaderboard (uid, name, avatar, grade, stars, cleared, score, accuracy, plays, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(uid) DO UPDATE SET
        name       = excluded.name,
        avatar     = excluded.avatar,
        grade      = excluded.grade,
        stars      = MAX(leaderboard.stars, excluded.stars),
        cleared    = MAX(leaderboard.cleared, excluded.cleared),
        score      = MAX(leaderboard.score, excluded.score),
        accuracy   = excluded.accuracy,
        plays      = excluded.plays,
        updated_at = excluded.updated_at
    `).run(uid, name, avatar, grade, stars, cleared, score, accuracy, plays, now);
    logActivity('score', name + ' ' + stars + ' bintang');
    return { ok: true, uid: uid, rank: rankOf(uid) };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

function rankOf(uid) {
  const rows = sqliteDB.prepare('SELECT * FROM leaderboard').all();
  rows.sort((a, b) => rankScore(b) - rankScore(a) || b.stars - a.stars ||
    String(a.name).localeCompare(String(b.name)));
  for (let i = 0; i < rows.length; i++) if (rows[i].uid === uid) return i + 1;
  return 0;
}

function leaderboardRows(limit, uid) {
  if (!nodeSqlite || !sqliteDB) return { rows: [], rank: 0, total: 0 };
  const rows = sqliteDB.prepare('SELECT * FROM leaderboard').all();
  rows.sort((a, b) => rankScore(b) - rankScore(a) || b.stars - a.stars ||
    String(a.name).localeCompare(String(b.name)));

  let rank = 0;
  for (let i = 0; i < rows.length; i++) if (uid && rows[i].uid === uid) rank = i + 1;

  const n = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  return {
    rows: rows.slice(0, n).map((r, i) => ({
      rank: i + 1,
      uid: r.uid,
      name: r.name,
      avatar: r.avatar,
      grade: r.grade,
      stars: r.stars,
      cleared: r.cleared,
      score: r.score,
      accuracy: r.accuracy,
      plays: r.plays,
      points: rankScore(r)
    })),
    rank: rank,
    total: rows.length
  };
}

function logActivity(event, detail) {
  if (!nodeSqlite || !sqliteDB) return;
  try {
    sqliteDB.prepare('INSERT INTO activity (event, detail, created_at) VALUES (?,?,?)')
      .run(event, detail || '', new Date().toISOString());
  } catch (e) { /* abaikan */ }
}

/* ------------------------------------------------------------
 *  Server HTTP
 * ------------------------------------------------------------ */

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('Terlalu besar')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';

  // Cegah path traversal
  const full = path.normalize(path.join(ROOT, rel));
  if (!full.startsWith(ROOT)) {
    res.writeHead(403); res.end('403 Forbidden'); return;
  }

  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 — Berkas tidak ditemukan: ' + rel);
      return;
    }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(full).pipe(res);
  });
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';
  const qIndex = url.indexOf('?');
  const pathOnly = qIndex >= 0 ? url.slice(0, qIndex) : url;
  const query = new URLSearchParams(qIndex >= 0 ? url.slice(qIndex + 1) : '');

  // --- API: papan peringkat ---
  if (pathOnly === '/api/leaderboard') {
    if (req.method !== 'GET') { res.writeHead(405); res.end('Method not allowed'); return; }
    const out = leaderboardRows(query.get('limit'), query.get('uid'));
    json(res, 200, out);
    return;
  }

  // --- API: kirim skor pemain ---
  if (pathOnly === '/api/score') {
    if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return; }
    try {
      const body = await readBody(req, 64 * 1024);
      let data;
      try { data = JSON.parse(body.toString('utf8') || '{}'); }
      catch (e) { res.writeHead(400); res.end('Format JSON tidak dikenali'); return; }
      const out = upsertScore(data);
      json(res, out.ok ? 200 : 400, out);
    } catch (err) {
      json(res, 500, { ok: false, reason: err.message });
    }
    return;
  }

  // --- API: simpan / muat progres (satu slot per pemain) ---
  if (pathOnly === '/api/state') {
    // slot bisa lewat ?slot=... atau header X-MA-Player (dipakai peramban)
    const slot = query.get('slot') || req.headers['x-ma-player'] || req.headers['x-player'];
    if (req.method === 'POST') {
      try {
        const body = await readBody(req, 32 * 1024 * 1024);
        if (!body.length) { res.writeHead(400); res.end('Data kosong'); return; }
        saveBlob(body, safeSlot(slot), slot);
        json(res, 200, { ok: true, bytes: body.length, slot: safeSlot(slot) });
      } catch (err) {
        res.writeHead(500); res.end(String(err.message));
      }
      return;
    }
    if (req.method === 'GET') {
      const buf = loadBlob(slot);
      if (!buf) { res.writeHead(404); res.end('Belum ada data tersimpan'); return; }
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': buf.length
      });
      res.end(buf);
      return;
    }
    res.writeHead(405); res.end('Method not allowed');
    return;
  }

  // --- API: info server ---
  if (pathOnly === '/api/info') {
    let players = 0;
    if (nodeSqlite && sqliteDB) {
      try {
        players = sqliteDB.prepare('SELECT COUNT(*) AS c FROM leaderboard').get().c;
      } catch (e) { players = 0; }
    }
    json(res, 200, {
      app: 'Matematika Ajaib',
      sqlite: nodeSqlite,
      dbFile: nodeSqlite ? path.relative(ROOT, DB_FILE) : null,
      hasSave: !!loadBlob(),
      leaderboard: !!nodeSqlite,
      players: players,
      node: process.version
    });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405); res.end('Method not allowed');
    return;
  }
  serveStatic(req, res, url);
});

/* ------------------------------------------------------------
 *  Jalankan
 * ------------------------------------------------------------ */

function localAddresses() {
  const out = [];
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const i of ifs[name] || []) {
      if (i.family === 'IPv4' && !i.internal) out.push(i.address);
    }
  }
  return out;
}

function start() {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║        MATEMATIKA AJAIB                 ║');
  console.log('  ║      game edukasi matematika SD 1-6      ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');

  initSqlite();

  server.listen(PORT, () => {
    console.log('  🎮 Buka di browser   : http://localhost:' + PORT);
    const nets = localAddresses();
    if (nets.length) {
      console.log('  📱 Dari HP / komputer lain (Wi-Fi yang sama):');
      nets.forEach((ip) => console.log('       http://' + ip + ':' + PORT));
    }
    console.log('');
    console.log('  💾 Progres otomatis disimpan ke: data/progress.bin');
    if (nodeSqlite) {
      console.log('     dan dicadangkan di        : data/game.sqlite');
      console.log('  🏆 Papan peringkat tersimpan di: data/game.sqlite (tabel leaderboard)');
      console.log('     setiap pemain punya slotnya sendiri, jadi progres tidak tertimpa');
    }
    console.log('  🛑 Hentikan server            : Ctrl + C');
    console.log('');
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('\n  ❌ Port ' + PORT + ' sudah dipakai program lain.');
    console.error('     Coba jalankan dengan port lain:  PORT=9000 node server.js\n');
  } else {
    console.error('\n  ❌ Server gagal:', err.message, '\n');
  }
  process.exit(1);
});

// tutup dengan rapi supaya file SQLite tidak rusak
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log('\n  👋 Sampai jumpa lagi!');
    try { if (sqliteDB) sqliteDB.close(); } catch (e) { }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 800);
  });
}

start();
