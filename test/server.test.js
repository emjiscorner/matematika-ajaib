#!/usr/bin/env node
/* ============================================================
 *  server.test.js  —  Uji server.js + sinkronisasi dua arah.
 *
 *  Yang diperiksa:
 *    1. server menyalakan diri dan menjawab /api/info
 *    2. berkas statis tersaji dengan benar (index.html, css, js, vendor)
 *    3. progres dari peramban bisa di-POST ke server
 *    4. progres bisa ditarik lagi lewat GET /api/state
 *    5. isinya benar-benar file .sqlite (dibaca node:sqlite)
 *    6. tarikan progres otomatis (pullFromServer) mengganti data lokal
 *    7. jalur tidak dikenal & metode ilegal ditolak dengan rapi
 *
 *  Jalankan:  node test/server.test.js
 * ============================================================ */

'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT) || 8099;
const BASE = 'http://127.0.0.1:' + PORT;

let passed = 0;
const failures = [];

async function test(name, fn) {
  try {
    const r = await fn();
    passed++;
    console.log('  ✓ ' + name + (r ? ' — ' + r : ''));
  } catch (err) {
    failures.push({ name, err });
    console.log('  ✗ ' + name);
    console.log('      ' + (err && err.message ? err.message : err));
  }
}

function section(t) {
  console.log('\n' + t);
  console.log('─'.repeat(Math.max(4, t.length)));
}

function req(method, urlPath, body, headers) {
  return new Promise((resolve, reject) => {
    const r = http.request({
      host: '127.0.0.1', port: PORT, path: urlPath, method,
      headers: Object.assign({}, headers || {})
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ code: res.statusCode, headers: res.headers, body: buf, text: buf.toString('utf8') });
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Jalankan server di folder sementara ---------- */
function runServer(dataDir) {
  const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT), MA_DATA_DIR: dataDir }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let out = '';
  child.stdout.on('data', (c) => { out += c; });
  child.stderr.on('data', (c) => { out += c; });
  return { child, log: () => out };
}

(async function main() {
  // Server diuji memakai folder data sendiri di folder sementara, jadi
  // data milik pengguna sama sekali tidak tersentuh. MA_DATA_DIR dipakai
  // untuk itu (lihat server.js).
  const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-srvdata-'));
  const userDataDir = path.join(ROOT, 'data');
  const srv = runServer(backupDir);

  /* ============================================================ */
  section('1. PENYALAAN SERVER');
  /* ============================================================ */

  let up = false;
  for (let i = 0; i < 40; i++) {
    await sleep(150);
    try { await req('GET', '/api/info'); up = true; break; } catch (e) { /* belum siap */ }
  }

  await test('server menyala dan menjawab /api/info', async () => {
    assert.ok(up, 'server tidak menjawab di ' + BASE + '\n' + srv.log());
    const r = await req('GET', '/api/info');
    assert.strictEqual(r.code, 200);
    const info = JSON.parse(r.text);
    assert.strictEqual(info.app, 'Matematika Ajaib');
    assert.ok(info.node, 'versi Node tidak dilaporkan');
    return 'Node ' + info.node + ', sqlite=' + info.sqlite;
  });

  await test('node:sqlite aktif dan berkas data dibuat', () => {
    assert.ok(fs.existsSync(backupDir), 'folder data uji tidak dibuat');
    const dbFile = path.join(backupDir, 'game.sqlite');
    assert.ok(fs.existsSync(dbFile), 'data/game.sqlite tidak dibuat');
    return fs.statSync(dbFile).size + ' byte';
  });

  /* ============================================================ */
  section('2. PENYAJIAN BERKAS STATIS');
  /* ============================================================ */

  await test('index.html tersaji sebagai HTML', async () => {
    const r = await req('GET', '/');
    assert.strictEqual(r.code, 200);
    assert.ok(/text\/html/.test(r.headers['content-type']), 'content-type salah');
    assert.ok(/<title>Matematika Ajaib/.test(r.text), 'halaman bukan game');
    return r.body.length + ' byte';
  });

  await test('CSS & JS tersaji dengan content-type yang benar', async () => {
    const css = await req('GET', '/assets/css/style.css');
    assert.strictEqual(css.code, 200);
    assert.ok(/text\/css/.test(css.headers['content-type']));

    const js = await req('GET', '/assets/js/db.js');
    assert.strictEqual(js.code, 200);
    assert.ok(/text\/javascript/.test(js.headers['content-type']));

    const wasm = await req('GET', '/assets/vendor/sql-wasm.js');
    assert.strictEqual(wasm.code, 200);
    assert.ok(wasm.body.length > 10000, 'sql-wasm.js terlalu kecil');
    return 'css ' + css.body.length + 'B, db.js ' + js.body.length + 'B, vendor ' + wasm.body.length + 'B';
  });

  await test('jalur di luar folder game ditolak', async () => {
    // path traversal harus ditolak: 403 (di luar ROOT) atau 404 (tidak ada)
    for (const p of ['/../../etc/passwd', '/%2e%2e%2f%2e%2e%2fetc%2fpasswd', '/etc/passwd']) {
      const r = await req('GET', p);
      assert.ok(r.code === 403 || r.code === 404,
        p + ' menjawab status ' + r.code + ' (harusnya 403/404)');
      assert.ok(!/root:/.test(r.text), 'berkas sistem bocor lewat ' + p);
    }
    return '3 varian traversal ditolak';
  });

  await test('berkas tidak ada menjawab 404 dengan pesan', async () => {
    const r = await req('GET', '/tidak-ada.html');
    assert.strictEqual(r.code, 404);
    assert.ok(r.text.length > 0, 'pesan kosong');
  });

  await test('metode ilegal pada API ditolak', async () => {
    const r = await req('DELETE', '/api/state');
    assert.strictEqual(r.code, 405);
  });

  /* ============================================================ */
  section('3. KIRIM PROGRES DARI PERAMBAN');
  /* ============================================================ */

  // buat database sungguhan lewat modul game
  const env = require('./env');
  env.loadAll({ db: true });
  const MG = env.win.MG;
  env.win.location = { protocol: 'http:', href: BASE + '/', origin: BASE };

  await MG.db.init();
  MG.db.ensurePlayer('Uji Server', '🐢');
  MG.db.recordAttempt({
    level: 1, correct: 9, total: 10, score: 210, stars: 2, durationMs: 30000,
    heartsLeft: 2, cleared: true,
    questions: [{ topic: 'count', topicName: 'Menghitung', text: '2 + 3 = ?', given: '5', answer: '5', isCorrect: true, timeMs: 900 }]
  });
  const bytes = Buffer.from(MG.db.exportBase64(), 'base64');

  await test('file yang dikirim benar-benar SQLite', () => {
    assert.strictEqual(bytes.subarray(0, 15).toString('latin1'), 'SQLite format 3');
    return bytes.length.toLocaleString('id-ID') + ' byte';
  });

  await test('POST /api/state menyimpan progres', async () => {
    const r = await req('POST', '/api/state', bytes, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': bytes.length
    });
    assert.strictEqual(r.code, 200, 'status ' + r.code);
    const j = JSON.parse(r.text);
    assert.strictEqual(j.ok, true);
    assert.strictEqual(j.bytes, bytes.length);
    return j.bytes + ' byte diterima';
  });

  await test('berkas progress.bin tertulis di disk', () => {
    const p = path.join(backupDir, 'progress.bin');
    assert.ok(fs.existsSync(p), 'progress.bin tidak ada');
    assert.ok(fs.readFileSync(p).equals(bytes), 'isi progress.bin beda');
    return fs.statSync(p).size.toLocaleString('id-ID') + ' byte';
  });

  /* ============================================================ */
  section('4. TARIK PROGRES KEMBALI');
  /* ============================================================ */

  await test('GET /api/state mengembalikan byte yang sama', async () => {
    const r = await req('GET', '/api/state');
    assert.strictEqual(r.code, 200);
    assert.strictEqual(Number(r.headers['content-length']), bytes.length);
    assert.ok(r.body.equals(bytes), 'isi berbeda dari yang dikirim');
    assert.strictEqual(r.body.subarray(0, 15).toString('latin1'), 'SQLite format 3');
    return 'identik, ' + r.body.length + ' byte';
  });

  await test('/api/info melaporkan ada simpanan', async () => {
    const r = await req('GET', '/api/info');
    const info = JSON.parse(r.text);
    assert.strictEqual(info.hasSave, true, 'hasSave masih false padahal ada kiriman');
  });

  await test('progres dari server dibaca dengan benar', async () => {
    const r = await req('GET', '/api/state');
    const { DatabaseSync } = require('node:sqlite');
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ma-srv-')), 'x.sqlite');
    fs.writeFileSync(tmp, r.body);
    const d = new DatabaseSync(tmp, { readOnly: true });
    try {
      const p = d.prepare('SELECT name, avatar FROM players').get();
      assert.ok(p, 'tabel players kosong');
      assert.strictEqual(p.name, 'Uji Server', 'nama = ' + p.name);
      assert.strictEqual(p.avatar, '🐢', 'avatar = ' + JSON.stringify(p.avatar));
      const s = d.prepare('SELECT COALESCE(SUM(best_stars),0) AS s FROM level_progress').get();
      assert.strictEqual(s.s, 2, 'bintang = ' + s.s);
      assert.strictEqual(d.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    } finally {
      d.close();
      fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
    }
    return 'pemain "Uji Server", 2 bintang';
  });

  await test('salinan di data/game.sqlite juga terbaca', () => {
    const { DatabaseSync } = require('node:sqlite');
    const d = new DatabaseSync(path.join(backupDir, 'game.sqlite'), { readOnly: true });
    try {
      const slot = d.prepare("SELECT byte_size FROM save_slots WHERE name='browser'").get();
      assert.ok(slot, 'tidak ada simpanan di save_slots');
      assert.strictEqual(slot.byte_size, bytes.length);
      const act = d.prepare('SELECT COUNT(*) AS c FROM activity').get();
      assert.ok(act.c > 0, 'riwayat aktivitas kosong');
      return 'save_slots ' + slot.byte_size + 'B, ' + act.c + ' baris aktivitas';
    } finally { d.close(); }
  });

  /* ============================================================ */
  section('5. TARIKAN OTOMATIS DARI SISI PERAMBAN');
  /* ============================================================ */

  await test('pullFromServer() mengambil data yang lebih baru', async () => {
    // Arahkan fetch ke server sungguhan; DB lokal sengaja dikosongkan
    // supaya data server yang menang saat ditarik.
    env.win.fetch = function (url, opts) {
      if (opts && opts.method === 'POST') return Promise.resolve({ ok: true, status: 200, headers: { get: () => '0' } });
      return new Promise((resolve, reject) => {
        http.get(BASE + '/api/state', (r) => {
          const c = [];
          r.on('data', (x) => c.push(x));
          r.on('end', () => {
            const b = Buffer.concat(c);
            resolve({
              ok: r.statusCode === 200, status: r.statusCode,
              headers: { get: () => String(b.length) },
              arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
            });
          });
        }).on('error', reject);
      });
    };

    // reset dulu supaya lokal benar-benar kosong (timestamp lama)
    await MG.db.reset();
    MG.db.ensurePlayer('Lokal Kosong', '🤖');
    assert.strictEqual(MG.db.getStars(), 0, 'lokal seharusnya kosong');

    const changed = await MG.db.pullFromServer();
    assert.strictEqual(changed, true, 'server tidak ditarik');

    assert.strictEqual(MG.db.getStars(), 2, 'bintang lokal = ' + MG.db.getStars());
    assert.strictEqual(MG.db.getPlayer().name, 'Uji Server', 'pemain lokal = ' + MG.db.getPlayer().name);
    return 'data server menggantikan data lokal';
  });

  await test('tarikan kedua tidak menimpa dengan data yang sama', async () => {
    const before = MG.db.getStars();
    const changed = await MG.db.pullFromServer();
    assert.strictEqual(changed, false, 'harusnya tidak berubah');
    assert.strictEqual(MG.db.getStars(), before);
    return 'tidak berubah (aman)';
  });

  /* ============================================================ */
  section('6. BANYAK PEMAIN DI SERVER');
  /* ============================================================ */

  await test('tiap pemain punya slot simpanan yang terpisah', async () => {
    // Dua blob berbeda: anak1 memakai data sekarang, anak2 memakai data
    // yang sudah di-reset. Kalau slot tertimpa, keduanya akan sama.
    const blobSatu = Buffer.from(MG.db.exportBase64(), 'base64');
    await MG.db.reset(true);
    MG.db.ensurePlayer('Anak Dua', '👧');
    const blobDua = Buffer.from(MG.db.exportBase64(), 'base64');
    assert.ok(!blobSatu.equals(blobDua), 'dua blob harus berbeda agar uji berarti');

    const slotBytes = { anak1: blobSatu, anak2: blobDua };

    for (const slot of ['anak1', 'anak2']) {
      const r = await req('POST', '/api/state?slot=' + slot, slotBytes[slot], {
        'Content-Type': 'application/octet-stream',
        'Content-Length': slotBytes[slot].length
      });
      assert.strictEqual(r.code, 200, 'slot ' + slot + ' status ' + r.code);
      const j = JSON.parse(r.text);
      assert.strictEqual(j.ok, true);
      assert.strictEqual(j.slot, slot, 'slot tidak dikembalikan dengan benar');
    }

    for (const slot of ['anak1', 'anak2']) {
      const r = await req('GET', '/api/state?slot=' + slot);
      assert.strictEqual(r.code, 200, 'slot ' + slot + ' tidak bisa ditarik');
      assert.ok(r.body.equals(slotBytes[slot]),
        'isi slot ' + slot + ' tertimpa oleh pemain lain');
    }

    // slot bawaan tidak ikut berubah
    const def = await req('GET', '/api/state');
    assert.strictEqual(def.code, 200);
    assert.ok(def.body.equals(bytes), 'slot bawaan (browser) ikut berubah');

    // slot yang belum pernah dipakai menjawab 404, bukan data orang lain
    const kosong = await req('GET', '/api/state?slot=anak3');
    assert.strictEqual(kosong.code, 404, 'slot kosong answered ' + kosong.code);

    const { DatabaseSync } = require('node:sqlite');
    const d = new DatabaseSync(path.join(backupDir, 'game.sqlite'), { readOnly: true });
    try {
      const names = d.prepare('SELECT name FROM save_slots ORDER BY name').all().map((r) => r.name);
      assert.deepStrictEqual(names, ['anak1', 'anak2', 'browser'], 'slot: ' + names.join(','));
    } finally { d.close(); }
    return '3 slot terpisah, tidak ada yang tertimpa';
  });

  await test('slot juga bisa dipilih lewat header', async () => {
    const blob = Buffer.from(MG.db.exportBase64(), 'base64');
    const r = await req('POST', '/api/state', blob, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': blob.length,
      'X-MA-Player': 'anakHeader'
    });
    assert.strictEqual(r.code, 200);
    assert.strictEqual(JSON.parse(r.text).slot, 'anakHeader');

    const back = await req('GET', '/api/state?slot=anakHeader');
    assert.strictEqual(back.code, 200);
    assert.ok(back.body.equals(blob), 'isi slot header tidak cocok');
    return 'header X-MA-Player dipakai';
  });

  await test('slot dengan karakter aneh dibersihkan, bukan ditolak', async () => {
    const r = await req('POST', '/api/state?slot=' + encodeURIComponent('../../etc/passwd'), bytes, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': bytes.length
    });
    assert.strictEqual(r.code, 200, 'status ' + r.code);
    assert.strictEqual(JSON.parse(r.text).slot, 'etcpasswd',
      'karakter berbahaya tidak dibuang: ' + JSON.parse(r.text).slot);
    return 'menjadi "etcpasswd"';
  });

  /* ============================================================ */
  section('7. PAPAN PERINGKAT');
  /* ============================================================ */

  const players = [
    { uid: 'p1', name: 'Budi', avatar: '🐼', grade: 2, stars: 60, cleared: 20, score: 13020, accuracy: 1, attempts: 21 },
    { uid: 'p2', name: 'Sari', avatar: '👧', grade: 3, stars: 15, cleared: 5, score: 3100, accuracy: 0.95, attempts: 5 },
    { uid: 'p3', name: 'Andi', avatar: '🤖', grade: 5, stars: 33, cleared: 11, score: 6900, accuracy: 0.88, attempts: 11 },
    { uid: 'p4', name: 'Dewi', avatar: '🦄', grade: 1, stars: 6, cleared: 2, score: 1200, accuracy: 0.7, attempts: 3 }
  ];

  await test('POST /api/score menyimpan beberapa pemain', async () => {
    for (const p of players) {
      const body = Buffer.from(JSON.stringify(p), 'utf8');
      const r = await req('POST', '/api/score', body, {
        'Content-Type': 'application/json',
        'Content-Length': body.length
      });
      assert.strictEqual(r.code, 200, p.name + ' status ' + r.code + ' — ' + r.text);
      const j = JSON.parse(r.text);
      assert.strictEqual(j.ok, true);
      assert.ok(j.rank >= 1 && j.rank <= 4, 'peringkat ' + p.name + ' = ' + j.rank);
    }
    return players.length + ' pemain terdaftar';
  });

  await test('GET /api/leaderboard mengurutkan dari yang tertinggi', async () => {
    const r = await req('GET', '/api/leaderboard?limit=10');
    assert.strictEqual(r.code, 200);
    const j = JSON.parse(r.text);
    assert.strictEqual(j.rows.length, 4, 'baris = ' + j.rows.length);
    assert.strictEqual(j.total, 4);
    assert.deepStrictEqual(j.rows.map((x) => x.name), ['Budi', 'Andi', 'Sari', 'Dewi']);
    assert.deepStrictEqual(j.rows.map((x) => x.rank), [1, 2, 3, 4]);

    // bintang harus lebih dominan daripada jumlah level & akurasi
    assert.strictEqual(j.rows[0].stars, 60);
    assert.ok(j.rows[0].points > j.rows[1].points, 'poin tidak menurun');
    return j.rows.map((x) => '#' + x.rank + ' ' + x.name).join(' · ');
  });

  await test('limit dan uid diri dilaporkan', async () => {
    const j = JSON.parse((await req('GET', '/api/leaderboard?limit=2&uid=p4')).text);
    assert.strictEqual(j.rows.length, 2, 'limit tidak dipatuhi');
    assert.strictEqual(j.rank, 4, 'peringkat sendiri salah: ' + j.rank);
    assert.strictEqual(j.rows[0].name, 'Budi');
    return 'limit 2 dari 4, posisiku #4';
  });

  await test('limit di-clamp ke rentang aman', async () => {
    const j = JSON.parse((await req('GET', '/api/leaderboard?limit=99999')).text);
    assert.ok(j.rows.length <= 100, 'baris = ' + j.rows.length);
    const neg = JSON.parse((await req('GET', '/api/leaderboard?limit=-5')).text);
    assert.ok(neg.rows.length >= 1 && neg.rows.length <= 100);
  });

  await test('kirim ulang tidak menurunkan rekor', async () => {
    // kirim angka yang lebih kecil untuk pemain yang sama
    const body = Buffer.from(JSON.stringify({
      uid: 'p1', name: 'Budi', avatar: '🐼', grade: 2,
      stars: 3, cleared: 1, score: 100, accuracy: 0.5, attempts: 99
    }), 'utf8');
    const r = await req('POST', '/api/score', body, {
      'Content-Type': 'application/json',
      'Content-Length': body.length
    });
    assert.strictEqual(r.code, 200);

    const j = JSON.parse((await req('GET', '/api/leaderboard')).text);
    const budi = j.rows.find((x) => x.uid === 'p1');
    assert.strictEqual(budi.stars, 60, 'bintang Budi turun jadi ' + budi.stars);
    assert.strictEqual(budi.cleared, 20, 'level Budi turun');
    assert.strictEqual(budi.rank, 1, 'Budi bukan juara lagi');
    // tapi angka yang boleh turun (akurasi, jumlah main) tetap diperbarui
    assert.strictEqual(budi.accuracy, 0.5, 'akurasi tidak ikut diperbarui');
    assert.strictEqual(budi.plays, 99, 'jumlah permainan tidak diperbarui');
    return 'rekor 60 bintang dipertahankan';
  });

  await test('nama & angka kelewat panjang di-clamp dan dibersihkan', async () => {
    // uid memanjang beyond the 40-character limit -> dipotong, bukan ditolak
    const uidPanjang = 'x' + '9'.repeat(60);
    const uidBersih = uidPanjang.slice(0, 40);
    const body = Buffer.from(JSON.stringify({
      uid: uidPanjang, name: 'N'.repeat(80), avatar: 'A'.repeat(30),
      grade: 99, stars: 1, cleared: 1, score: 1, accuracy: 5, attempts: 1
    }), 'utf8');
    const r = await req('POST', '/api/score', body, {
      'Content-Type': 'application/json',
      'Content-Length': body.length
    });
    assert.strictEqual(r.code, 200, 'status ' + r.code);

    const j = JSON.parse((await req('GET', '/api/leaderboard?limit=100')).text);
    const row = j.rows.find((x) => x.uid === uidBersih);
    assert.ok(row, 'baris tidak tersimpan dengan uid ' + uidBersih);
    assert.strictEqual(row.name.length, 24, 'nama = ' + row.name.length + ' karakter');
    assert.strictEqual(row.grade, 6, 'kelas di-clamp ke 1-6, dapat ' + row.grade);
    assert.strictEqual(row.accuracy, 1, 'akurasi di-clamp ke 0-1, dapat ' + row.accuracy);

    // uid berisi tanda baca harus dibuang, bukan disimpan mentah
    const body2 = Buffer.from(JSON.stringify({
      uid: 'sari/../rahasia', name: 'Sari', stars: 2, cleared: 1, score: 10, accuracy: 0.5, attempts: 1
    }), 'utf8');
    const r2 = await req('POST', '/api/score', body2, {
      'Content-Type': 'application/json',
      'Content-Length': body2.length
    });
    assert.strictEqual(r2.code, 200);
    const j2 = JSON.parse((await req('GET', '/api/leaderboard?limit=100')).text);
    assert.ok(j2.rows.find((x) => x.uid === 'sarirahasia'), 'uid berbahaya tidak dibersihkan');
    assert.ok(!j2.rows.find((x) => String(x.uid).includes('/')), 'uid menyimpan garis miring');
    return 'nama 24 huruf, kelas 6, akurasi 100%, uid dibersihkan';
  });

  await test('skor tanpa uid ditolak dengan pesan jelas', async () => {
    const body = Buffer.from(JSON.stringify({ name: 'Tanpa ID', stars: 5 }), 'utf8');
    const r = await req('POST', '/api/score', body, {
      'Content-Type': 'application/json',
      'Content-Length': body.length
    });
    assert.strictEqual(r.code, 400, 'status ' + r.code);
    const j = JSON.parse(r.text);
    assert.strictEqual(j.ok, false);
    assert.ok(j.reason, 'tidak ada alasan');
    return '400 + "' + j.reason + '"';
  });

  await test('JSON rusak ditolak, server tetap hidup', async () => {
    const body = Buffer.from('{ ini bukan json', 'utf8');
    const r = await req('POST', '/api/score', body, {
      'Content-Type': 'application/json',
      'Content-Length': body.length
    });
    assert.strictEqual(r.code, 400);
    const info = JSON.parse((await req('GET', '/api/info')).text);
    assert.strictEqual(info.players, 6, 'jumlah pemain = ' + info.players);
    return '400, papan peringkat masih ada ' + info.players + ' pemain';
  });

  await test('metode ilegal pada API peringkat ditolak', async () => {
    assert.strictEqual((await req('DELETE', '/api/leaderboard')).code, 405);
    assert.strictEqual((await req('POST', '/api/leaderboard')).code, 405);
    assert.strictEqual((await req('GET', '/api/score')).code, 405);
  });

  await test('/api/info melaporkan status papan peringkat', async () => {
    const info = JSON.parse((await req('GET', '/api/info')).text);
    assert.strictEqual(info.leaderboard, true);
    assert.strictEqual(info.players, 6);
  });

  await test('tabel leaderboard benar-benar ada di data/game.sqlite', async () => {
    const { DatabaseSync } = require('node:sqlite');
    const d = new DatabaseSync(path.join(backupDir, 'game.sqlite'), { readOnly: true });
    try {
      const cols = d.prepare('PRAGMA table_info(leaderboard)').all().map((r) => r.name);
      ['uid', 'name', 'avatar', 'grade', 'stars', 'cleared', 'score', 'accuracy', 'plays', 'updated_at']
        .forEach((c) => assert.ok(cols.includes(c), 'kolom ' + c + ' tidak ada'));
      const n = d.prepare('SELECT COUNT(*) AS c FROM leaderboard').get().c;
      assert.strictEqual(n, 6, 'baris leaderboard = ' + n);
      assert.strictEqual(d.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
      return cols.length + ' kolom, ' + n + ' baris';
    } finally { d.close(); }
  });

  /* ============================================================ */
  section('8. KONDISI AWAL');
  /* ============================================================ */

  await test('GET /api/state tanpa simpanan menjawab 404', async () => {
    // pakai server kedua di folder kosong supaya tidak ganggu yang di atas
    const port2 = PORT + 1;
    const dataDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-data2-'));
    const srv2 = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
      env: Object.assign({}, process.env, { PORT: String(port2), MA_DATA_DIR: dataDir2 }),
      stdio: 'ignore'
    });
    try {
      let ok = false;
      for (let i = 0; i < 40; i++) {
        await sleep(150);
        try {
          await new Promise((res, rej) => {
            http.get('http://127.0.0.1:' + port2 + '/api/info', (r) => { r.resume(); res(); })
              .on('error', rej);
          });
          ok = true; break;
        } catch (e) { /* belum siap */ }
      }
      assert.ok(ok, 'server kedua tidak menyala');

      const info = await new Promise((res, rej) => {
        http.get('http://127.0.0.1:' + port2 + '/api/info', (r) => {
          let s = ''; r.on('data', (c) => { s += c; }); r.on('end', () => res(JSON.parse(s)));
        }).on('error', rej);
      });
      assert.strictEqual(info.hasSave, false, 'hasSave seharusnya false');

      const st = await new Promise((res, rej) => {
        http.get('http://127.0.0.1:' + port2 + '/api/state', (r) => {
          let s = ''; r.on('data', (c) => { s += c; });
          r.on('end', () => res({ code: r.statusCode, text: s }));
        }).on('error', rej);
      });
      assert.strictEqual(st.code, 404);
      assert.ok(/Belum ada data/.test(st.text), 'pesan: ' + st.text);
      return '404 + pesan jelas';
    } finally {
      srv2.kill('SIGKILL');
      await sleep(200);
      fs.rmSync(dataDir2, { recursive: true, force: true });
    }
  });

  await test('POST kosong ditolak', async () => {
    const r = await req('POST', '/api/state', '', { 'Content-Length': 0 });
    assert.strictEqual(r.code, 400, 'status ' + r.code);
  });

  /* ============================================================ */
  srv.child.kill('SIGTERM');
  await sleep(400);
  srv.child.kill('SIGKILL');

  // bersihkan folder data uji
  fs.rmSync(backupDir, { recursive: true, force: true });

  // pastikan data milik pengguna tetap utuh
  if (fs.existsSync(userDataDir)) {
    const still = fs.readdirSync(userDataDir);
    if (still.length) console.log('  ℹ️  data milik pengguna tetap utuh: ' + still.join(', '));
  }

  console.log('\n' + '─'.repeat(52));
  if (failures.length) {
    console.log('❌ GAGAL: ' + failures.length + ' dari ' + (passed + failures.length) + ' uji');
    failures.forEach((f) => console.log('\n' + f.name + '\n' + (f.err.stack || f.err)));
    process.exit(1);
  }
  console.log('✅ SEMUA ' + passed + ' UJI SERVER LOLOS');
  process.exit(0);
})().catch((err) => {
  console.error('\n💥 Error tak terduga:\n' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
