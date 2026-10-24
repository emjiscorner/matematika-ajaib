#!/usr/bin/env node
/* ============================================================
 *  db.test.js  —  Uji database SQLite tanpa browser.
 *
 *  Yang diperiksa:
 *    1. sql.js benar-benar bisa dibuka dari WASM inline (tanpa network)
 *    2. ke-7 tabel dibuat dengan benar
 *    3. pemain, pengaturan, dan progres level tersimpan & dibaca kembali
 *    4. main 20 level sempurna -> 60 bintang, 20 level lulus, semua terbuka
 *    5. statistik, riwayat, dan statistik per topik akurat
 *    6. lencana (badge) Giving out sesuai syarat
 *    7. ekspor -> reset -> impor mengembalikan data persis seperti semula
 *    8. hasil ekspor benar-benar file .sqlite sah (dibuka node:sqlite)
 *
 *  Jalankan:  node test/db.test.js
 * ============================================================ */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const env = require('./env');
const { win } = env;

/* ---------- kerangka uji sederhana ---------- */
let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    const r = fn();
    passed++;
    console.log('  ✓ ' + name + (r ? ' — ' + r : ''));
  } catch (err) {
    failures.push({ name, err });
    console.log('  ✗ ' + name);
    console.log('      ' + (err && err.message ? err.message : err));
  }
}

async function testAsync(name, fn) {
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

function section(title) {
  console.log('\n' + title);
  const line = '─'.repeat(Math.max(4, title.length));
  console.log(line);
}

/* ---------- muat modul game ---------- */
env.loadAll({ db: true });

const MG = win.MG;
const DB = MG.db;
const Game = MG.game;

/** Main satu level dari awal sampai selesai; jawaban benar semua. */
function playPerfect(level) {
  Game.start(level);
  for (let i = 0; i < Game.state().questions.length; i++) {
    const q = Game.beginQuestion();
    Game.answer(q.answerIndex, false);
    if (!Game.state().finished) Game.nextQuestion();
  }
  const res = Game.summary();
  DB.recordAttempt(res);
  const earned = Game.checkBadges(res);
  return { res, earned };
}

async function main() {
  /* ============================================================ */
  section('1. MESIN SQLITE');
  /* ============================================================ */

  await testAsync('sql.js termuat (WASM inline, tanpa fetch)', async () => {
    assert.strictEqual(typeof win.initSqlJs, 'function', 'initSqlJs tidak ada');
    assert.strictEqual(typeof win.SQL_WASM_BASE64, 'string', 'WASM inline tidak ditemukan');
    return (win.SQL_WASM_BASE64.length / 1024).toFixed(0) + ' KB base64';
  });

  await testAsync('DB.init() berhasil', async () => {
    const ok = await DB.init();
    assert.strictEqual(ok, true, 'DB.init() mengembalikan ' + ok);
    assert.strictEqual(DB.isReady(), true);
    return 'penyimpanan = ' + DB.storageKind();
  });

  await testAsync('fallback localStorage dipakai saat IndexedDB tidak ada', () => {
    assert.strictEqual(DB.storageKind(), 'localstorage');
  });

  /* ============================================================ */
  section('2. SKEMA TABEL');
  /* ============================================================ */

  const TABLES = ['players', 'level_progress', 'attempts', 'question_log',
    'topic_stats', 'badges', 'settings'];

  test('semua tabel wajib dibuat', () => {
    const rows = DB.raw.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const have = rows.map((r) => r.name);
    TABLES.forEach((t) => assert.ok(have.includes(t), 'tabel "' + t + '" tidak ada'));
    return have.length + ' objek';
  });

  test('indeks pendukung tersedia', () => {
    const rows = DB.raw.all("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'");
    assert.ok(rows.length >= 2, 'indeks kurang dari 2');
    return rows.map((r) => r.name).join(', ');
  });

  /* ============================================================ */
  section('3. PEMAIN & PENGATURAN');
  /* ============================================================ */

  test('buat pemain pertama', () => {
    assert.strictEqual(DB.getPlayer(), null, 'sebelumnya harus kosong');
    const p = DB.ensurePlayer('Ani', '🦊');
    assert.ok(p && p.id, 'pemain tidak tersimpan');
    assert.strictEqual(p.name, 'Ani');
    assert.strictEqual(p.avatar, '🦊');
    return 'id=' + p.id + ' nama=' + p.name;
  });

  test('pemain tidak dibuat dua kali', () => {
    DB.ensurePlayer('Ani', '🦊');
    DB.ensurePlayer('Ani', '🦊');
    const rows = DB.raw.all('SELECT * FROM players');
    assert.strictEqual(rows.length, 1, 'jumlah pemain = ' + rows.length);
    return 'tetap 1 pemain';
  });

  test('ganti nama & avatar pemain', () => {
    const p = DB.updatePlayer('Budi', '🐼');
    assert.strictEqual(p.name, 'Budi');
    assert.strictEqual(p.avatar, '🐼');
  });

  test('simpan & baca pengaturan', () => {
    DB.setSetting('timeLimit', 25);
    DB.setSetting('difficulty', 'sulit');
    assert.strictEqual(DB.getSetting('timeLimit', 20), '25');
    assert.strictEqual(DB.getSetting('difficulty', 'sedang'), 'sulit');
    assert.strictEqual(DB.getSetting('tidakAda', 'jatuh'), 'jatuh', 'nilai bawaan tidak dipakai');
    const all = DB.getAllSettings();
    assert.ok(all.timeLimit === '25' && all.difficulty === 'sulit');
    DB.setSetting('timeLimit', 30);
    assert.strictEqual(DB.getSetting('timeLimit'), '30', 'nilai lama tidak tertimpa');
    return '4 baris di tabel settings';
  });

  /* ============================================================ */
  section('4. MAIN SELURUH 20 LEVEL (SEMUA BENAR)');
  /* ============================================================ */

  let lastRes = null;
  test('20 level bisa dimainkan penuh dan hasilnya dicatat', () => {
    for (let lv = 1; lv <= MG.CONFIG.LEVELS_COUNT; lv++) {
      const { res } = playPerfect(lv);
      assert.strictEqual(res.total, MG.CONFIG.QUESTIONS_PER_LEVEL, 'level ' + lv + ' soal != 10');
      assert.strictEqual(res.correct, 10, 'level ' + lv + ' benar != 10');
      assert.strictEqual(res.stars, 3, 'level ' + lv + ' bintang != 3');
      assert.strictEqual(res.cleared, true, 'level ' + lv + ' tidak lulus');
      assert.strictEqual(res.heartsLeft, MG.CONFIG.START_HEARTS, 'level ' + lv + ' hati habis');
      lastRes = res;
    }
    return '20 level × 10 soal, skor level 20 = ' + lastRes.score;
  });

  test('total bintang = 60 (SD), maksimum 84 (SD + TK)', () => {
    assert.strictEqual(DB.getStars(), 60);
    assert.strictEqual(DB.getStars('sd'), 60);
    assert.strictEqual(DB.getStars('tk'), 0);
    assert.strictEqual(DB.getMaxStars(), 84);
  });

  test('20 level tercatat lulus', () => {
    assert.strictEqual(DB.getClearedCount(), 20);
    const map = DB.getAllProgress();
    assert.strictEqual(Object.keys(map).length, 20);
    Object.keys(map).forEach((lv) => {
      assert.strictEqual(map[lv].best_stars, 3, 'level ' + lv + ' bintang terbaik != 3');
      assert.strictEqual(map[lv].cleared, 1);
      assert.strictEqual(map[lv].no_heart_clear, 1, 'level ' + lv + ' bukan selesai tanpa salah');
      assert.strictEqual(map[lv].plays, 1);
    });
  });

  test('level 20 terbuka (tidak ada level tersembunyi tertinggal)', () => {
    assert.strictEqual(DB.getUnlockedLevel(), MG.CONFIG.LEVELS_COUNT);
  });

  test('main ulang tidak menurunkan rekor', () => {
    const before = DB.getLevelProgress(1);
    playPerfect(1);
    const after = DB.getLevelProgress(1);
    assert.strictEqual(after.best_stars, before.best_stars);
    assert.ok(after.best_score >= before.best_score, 'skor terbaik turun');
    assert.strictEqual(after.plays, 2, 'hitungan main tidak bertambah');
    return 'plays level 1 = ' + after.plays;
  });

  /* ============================================================ */
  section('5. STATISTIK & RIWAYAT');
  /* ============================================================ */

  test('20 baris attempts + 210 baris question_log', () => {
    const a = DB.raw.scalar('SELECT COUNT(*) AS c FROM attempts');
    const q = DB.raw.scalar('SELECT COUNT(*) AS c FROM question_log');
    assert.strictEqual(a, 21, 'attempts = ' + a);
    assert.strictEqual(q, 210, 'question_log = ' + q);
    return a + ' percobaan, ' + q + ' soal';
  });

  test('question_log menaut ke attempt_id dengan benar', () => {
    const bad = DB.raw.scalar('SELECT COUNT(*) AS c FROM question_log WHERE attempt_id IS NULL');
    assert.strictEqual(bad, 0, bad + ' baris tanpa attempt_id');
    const orphan = DB.raw.all(
      'SELECT COUNT(*) AS c FROM question_log l LEFT JOIN attempts a ON a.id = l.attempt_id WHERE a.id IS NULL');
    assert.strictEqual(orphan[0].c, 0, orphan[0].c + ' baris yatim');
  });

  test('question_log menyimpan teks soal tanpa tag HTML', () => {
    const rows = DB.raw.all("SELECT question FROM question_log WHERE question LIKE '%<%' LIMIT 5");
    assert.strictEqual(rows.length, 0, 'masih ada tag HTML: ' + JSON.stringify(rows[0] || {}));
  });

  test('ringkasan overview konsisten', () => {
    const o = DB.getOverview();
    assert.strictEqual(o.attempts, 21);
    assert.strictEqual(o.questions, 210);
    assert.strictEqual(o.correct, 210);
    assert.strictEqual(Number(o.accuracy.toFixed(4)), 1);
    assert.ok(o.totalScore > 0, 'total skor 0');
    assert.strictEqual(o.cleared, 20);
    assert.strictEqual(o.stars, 60);
    assert.strictEqual(o.maxStars, 84);
    assert.strictEqual(o.daysPlayed, 1);
    return 'total skor ' + o.totalScore;
  });

  test('riwayat attempt terbaru di depan', () => {
    const h = DB.getHistory(5);
    assert.strictEqual(h.length, 5);
    assert.strictEqual(h[0].level, 1, 'percobaan terbaru seharusnya level 1 (dimainkan ulang)');
    for (let i = 1; i < h.length; i++) assert.ok(h[i - 1].id > h[i].id, 'urutan riwayat tidak menurun');
    return '5 terbaru: ' + h.map((r) => 'L' + r.level).join(' ');
  });

  test('statistik per topik terisi', () => {
    const ts = DB.getTopicStats();
    assert.ok(ts.length >= 10, 'topik hanya ' + ts.length);
    const total = ts.reduce((s, t) => s + t.total, 0);
    assert.strictEqual(total, 210, 'jumlah soal per topik = ' + total);
    const weak = DB.getWeakTopics(3);
    assert.ok(Array.isArray(weak) && weak.length <= 3);
    return ts.length + ' topik tercatat';
  });

  test('hari dimainkan unik', () => {
    const days = DB.getPlayDays();
    assert.strictEqual(days.length, 1);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(days[0]), 'format tanggal: ' + days[0]);
    return days[0];
  });

  /* ============================================================ */
  section('6. LENCANA');
  /* ============================================================ */

  test('MG.BADGES mendaftarkan 14 lencana unik', () => {
    assert.strictEqual(MG.BADGES.length, 14);
    const codes = MG.BADGES.map((b) => b.code);
    assert.strictEqual(new Set(codes).size, 14, 'kode lencana kembar');
    MG.BADGES.forEach((b) => {
      assert.ok(b.emoji && b.name && b.desc, 'lencana ' + b.code + ' tidak lengkap');
    });
    return codes.length + ' lencana';
  });

  test('lencana otomatis diberikan sesuai syaratnya', () => {
    const got = Object.keys(DB.getBadges());
    const expect = ['first', 'perfect', 'combo5', 'level5', 'level10', 'level20',
      'fast', 'scholar50', 'genius', 'stars25', 'stars50', 'flawless', 'topicPro'];
    const missing = expect.filter((c) => !got.includes(c));
    assert.deepStrictEqual(missing, [], 'lencana belum didapat: ' + missing.join(', '));
    assert.strictEqual(got.length, expect.length, 'lencana tambahan tak terduga: ' + got.filter((g) => !expect.includes(g)).join(', '));
    return got.length + ' lencana diperoleh';
  });

  test('lencana tidak diberikan dua kali', () => {
    assert.strictEqual(DB.awardBadge('first'), false);
    assert.strictEqual(DB.awardBadge('level20'), false);
    const n = DB.raw.scalar("SELECT COUNT(*) AS c FROM badges WHERE code='first'");
    assert.strictEqual(n, 1);
  });

  test('lencana "Pelajar Sabuk" muncul setelah 7 hari berbeda', () => {
    const p = DB.getPlayer();
    for (let d = 1; d <= 6; d++) {
      const day = new Date(Date.now() - d * 86400000).toISOString();
      DB.raw.run(
        'INSERT INTO attempts (player_id, level, correct, total, accuracy, score, stars, duration_ms, hearts_left, cleared, played_at)' +
        ' VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [p.id, 1, 10, 10, 1, 300, 3, 60000, 3, 1, day]);
    }
    assert.strictEqual(DB.getOverview().daysPlayed, 7);
    const earned = Game.checkBadges(lastRes);
    const codes = earned.map((b) => b.code);
    assert.ok(codes.includes('night'), 'lencana malam tidak diberikan');
    return 'diberikan: ' + codes.join(', ');
  });

  /* ============================================================ */
  section('7. EKSPOR → RESET → IMPOR');
  /* ============================================================ */

  const backup = DB.exportBase64();
  const snap = {
    attempts: DB.raw.scalar('SELECT COUNT(*) AS c FROM attempts'),
    questions: DB.raw.scalar('SELECT COUNT(*) AS c FROM question_log'),
    badges: Object.keys(DB.getBadges()).length
  };

  test('ekspor menghasilkan base64 yang wajar', () => {
    assert.strictEqual(typeof backup, 'string');
    assert.ok(backup.length > 2000, 'base64 cuma ' + backup.length + ' karakter');
    return (backup.length / 1024).toFixed(0) + ' KB base64';
  });

  await testAsync('reset() mengosongkan progres tapi pemain tetap ada', async () => {
    await DB.reset();
    assert.strictEqual(DB.getClearedCount(), 0);
    assert.strictEqual(DB.getStars(), 0);
    assert.strictEqual(DB.getUnlockedLevel(), 1, 'level 1 harus tetap terbuka');
    assert.strictEqual(DB.raw.scalar('SELECT COUNT(*) AS c FROM attempts'), 0);
    assert.strictEqual(DB.raw.scalar('SELECT COUNT(*) AS c FROM question_log'), 0);
    assert.strictEqual(DB.raw.scalar('SELECT COUNT(*) AS c FROM topic_stats'), 0);
    assert.strictEqual(Object.keys(DB.getBadges()).length, 0);
    assert.ok(DB.getPlayer(), 'pemain ikut terhapus');
  });

  await testAsync('impor mengembalikan seluruh progres', async () => {
    await DB.importBase64(backup);
    assert.strictEqual(DB.getStars(), 60);
    assert.strictEqual(DB.getClearedCount(), 20);
    assert.strictEqual(DB.getUnlockedLevel(), 20);
    assert.strictEqual(DB.raw.scalar('SELECT COUNT(*) AS c FROM attempts'), snap.attempts);
    assert.strictEqual(DB.raw.scalar('SELECT COUNT(*) AS c FROM question_log'), snap.questions);
    assert.strictEqual(Object.keys(DB.getBadges()).length, snap.badges);
    assert.strictEqual(DB.getPlayer().name, 'Budi');
    return snap.attempts + ' percobaan & ' + snap.badges + ' lencana kembali';
  });

  await testAsync('impor file sampah ditolak dengan pesan jelas', async () => {
    const junk = Buffer.from('ini bukan database sqlite sama sekali').toString('base64');
    await assert.rejects(() => DB.importBase64(junk), /rusak|Bukan file progres/);
    // data lama harus tetap utuh setelah impor gagal
    assert.strictEqual(DB.getStars(), 60);
  });

  await testAsync('data tersimpan ke localStorage setelah saveNow()', async () => {
    await DB.saveNow();
    const key = 'ma:' + MG.CONFIG.STORAGE_KEY;
    const saved = win.localStorage.getItem(key);
    assert.ok(saved && saved.length > 2000, 'localStorage kosong');
    const again = DB.exportBase64();
    assert.strictEqual(saved, again, 'isi localStorage beda dengan ekspor terbaru');
    return (saved.length / 1024).toFixed(0) + ' KB di localStorage';
  });

  /* ============================================================ */
  section('8. FILE .SQLITE ASLI');
  /* ============================================================ */

  test('hasil ekspor adalah file SQLite yang sah', () => {
    const bytes = Buffer.from(backup, 'base64');
    assert.strictEqual(bytes.subarray(0, 15).toString('latin1'), 'SQLite format 3',
      'kepala file bukan "SQLite format 3"');

    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ma-db-')), 'game.sqlite');
    fs.writeFileSync(tmp, bytes);
    assert.strictEqual(fs.statSync(tmp).size, bytes.length);

    let DatabaseSync = null;
    try { ({ DatabaseSync } = require('node:sqlite')); } catch (e) { DatabaseSync = null; }

    if (!DatabaseSync) {
      console.log('      (node:sqlite tidak tersedia — lewati pembacaan mandiri)');
      return bytes.length.toLocaleString('id-ID') + ' byte';
    }

    const db = new DatabaseSync(tmp, { readOnly: true });
    try {
      const tbl = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map((r) => r.name);
      TABLES.forEach((t) => assert.ok(tbl.includes(t), 'tabel "' + t + '" hilang di file ekspor'));
      const stars = db.prepare('SELECT COALESCE(SUM(best_stars),0) AS s FROM level_progress').get();
      assert.strictEqual(stars.s, 60, 'total bintang di file = ' + stars.s);
      const badge = db.prepare('SELECT COUNT(*) AS c FROM badges').get();
      assert.strictEqual(badge.c, 14, 'lencana di file = ' + badge.c);
      assert.strictEqual(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    } finally {
      db.close();
      fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
    }
    return '60 bintang + 14 lencana terbaca oleh node:sqlite';
  });

  /* ============================================================ */
  section('9. BANYAK PEMAIN (MULTI-USER)');
  /* ============================================================ */

  test('pemain kedua dibuat tanpa merusak pemain pertama', () => {
    const before = DB.playerSummary(DB.getPlayer().id);
    assert.strictEqual(DB.playerCount(), 1);

    const p2 = DB.createPlayer('Sari', '👧', 3);
    assert.ok(p2 && p2.id, 'pemain kedua gagal dibuat');
    assert.strictEqual(DB.playerCount(), 2);
    assert.strictEqual(p2.name, 'Sari');
    assert.strictEqual(p2.avatar, '👧');
    assert.strictEqual(p2.grade, 3);
    assert.ok(p2.uid && p2.uid.length >= 6, 'uid pemain kosong');

    // pemain baru otomatis jadi aktif
    assert.strictEqual(DB.activePlayerId(), p2.id);

    // pemain pertama tidak berubah
    const after = DB.playerSummary(before.id);
    assert.strictEqual(after.stars, before.stars, 'bintang pemain pertama berubah');
    assert.strictEqual(after.name, before.name);
    return '2 pemain, uid="' + p2.uid + '"';
  });

  test('pemain baru mulai dari nol (tidak mewarisi progres orang lain)', () => {
    assert.strictEqual(DB.getStars(), 0, 'bintang tidak nol');
    assert.strictEqual(DB.getClearedCount(), 0);
    assert.strictEqual(DB.getUnlockedLevel(), 1);
    assert.strictEqual(DB.getOverview().attempts, 0);
    assert.strictEqual(Object.keys(DB.getBadges()).length, 0);
  });

  test('main 3 level sebagai pemain kedua', () => {
    for (let lv = 1; lv <= 3; lv++) playPerfect(lv);
    assert.strictEqual(DB.getStars(), 9, 'bintang pemain kedua = ' + DB.getStars());
    assert.strictEqual(DB.getClearedCount(), 3);
    return '3 level selesai, 9 bintang';
  });

  test('kemampuan pemain kedua terpisah dari pemain pertama', () => {
    const sari = DB.listPlayers().find((p) => p.name === 'Sari');
    const budi = DB.listPlayers().find((p) => p.name === 'Budi');

    const s = DB.playerSummary(sari.id);
    const b = DB.playerSummary(budi.id);
    assert.strictEqual(s.stars, 9, 'Sari = ' + s.stars);
    assert.strictEqual(b.stars, 60, 'Budi = ' + b.stars);
    assert.strictEqual(s.uid !== b.uid, true, 'uid kedua pemain sama');
    return 'Sari 9 bintang, Budi 60 bintang';
  });

  test('berpindah pemain hanya mengubah tampilan, bukan data', () => {
    const budi = DB.listPlayers().find((p) => p.name === 'Budi');
    DB.selectPlayer(budi.id);
    assert.strictEqual(DB.getPlayer().name, 'Budi');
    assert.strictEqual(DB.getStars(), 60, 'bintang Budi tidak kembali');

    const sari = DB.listPlayers().find((p) => p.name === 'Sari');
    DB.selectPlayer(sari.id);
    assert.strictEqual(DB.getStars(), 9, 'bintang Sari tidak kembali');
    return 'Budi ↔ Sari bergantian dengan benar';
  });

  test('pemain terakhir tidak bisa dihapus', () => {
    const all = DB.listPlayers();
    assert.ok(all.length >= 2, 'butuh minimal 2 pemain untuk uji ini');

    // turunkan dulu ke satu pemain, lalu coba hapus lagi
    all.slice(1).forEach((p) => DB.deletePlayer(p.id));
    assert.strictEqual(DB.playerCount(), 1, 'penurunan jumlah pemain gagal');

    const only = DB.listPlayers()[0];
    assert.strictEqual(DB.deletePlayer(only.id), false, 'pemain terakhir boleh dihapus');
    assert.strictEqual(DB.playerCount(), 1, 'pemain terakhir hilang');
    assert.ok(DB.getPlayer(), 'tidak ada pemain aktif');
    return 'pemain "' + only.name + '" dilindungi';
  });

  test('buat lagi pemain kedua untuk uji leaderboard', () => {
    const p = DB.createPlayer('Sari', '👧', 3);
    assert.strictEqual(DB.playerCount(), 2);
    return 'Sari dibuat ulang (id=' + p.id + ')';
  });

  test('hapus pemain: semua jejaknya hilang, pemain lain utuh', () => {
    // pakai pemain sekali pakai (Andi) supaya Budi & Sari tidak terganggu
    const andi = DB.createPlayer('Andi', '🤖', 5);
    playPerfect(1);
    assert.strictEqual(DB.getStars(), 3, 'Andi main 1 level');

    const budi = DB.listPlayers().find((p) => p.name === 'Budi');
    const sari = DB.listPlayers().find((p) => p.name === 'Sari');
    const budiBefore = DB.playerSummary(budi.id);
    const sariBefore = DB.playerSummary(sari.id);

    assert.strictEqual(DB.deletePlayer(andi.id), true);
    assert.strictEqual(DB.playerCount(), 2);
    // pemain aktif yang dihapus otomatis diganti pemain yang tersisa
    assert.ok(DB.getPlayer(), 'tidak ada pemain aktif setelah dihapus');
    assert.notStrictEqual(DB.getPlayer().id, andi.id, 'pemain terhapus masih aktif');

    const leftovers = DB.raw.all('SELECT * FROM players WHERE id = ?', [andi.id]);
    assert.strictEqual(leftovers.length, 0, 'baris pemain masih ada');
    ['level_progress', 'attempts', 'question_log', 'topic_stats', 'badges'].forEach((t) => {
      const n = DB.raw.scalar('SELECT COUNT(*) AS c FROM ' + t + ' WHERE player_id = ?', [andi.id]);
      assert.strictEqual(n, 0, t + ' masih punya baris untuk pemain yang dihapus');
    });

    assert.strictEqual(DB.playerSummary(budi.id).stars, budiBefore.stars, 'progres Budi ikut terhapus');
    assert.strictEqual(DB.playerSummary(sari.id).stars, sariBefore.stars, 'progres Sari ikut terhapus');

    DB.selectPlayer(sari.id);
    return 'Andi terhapus bersih, Budi & Sari utuh';
  });

  test('pengaturan waktu bisa berbeda per pemain', () => {
    DB.setPlayerSetting('time_limit', 45);
    assert.strictEqual(DB.getPlayerSetting('time_limit', 20), '45');
    DB.setSetting('time_limit', 15);
    // nilai pemain sendiri menang atas nilai bawaan perangkat
    assert.strictEqual(DB.getPlayerSetting('time_limit', DB.getSetting('time_limit', '20')), '45');
    return 'waktu pemain = 45, bawaan perangkat = 15';
  });

  test('leaderboard lokal mengurutkan semua pemain', () => {
    const sariRow = DB.listPlayers().find((p) => p.name === 'Sari');
    DB.selectPlayer(sariRow.id);
    DB.setPlayerSetting('time_limit', 20);
    assert.strictEqual(DB.getPlayer().name, 'Sari', 'pemain aktif bukan Sari');
    for (let lv = 1; lv <= 5; lv++) playPerfect(lv);
    assert.strictEqual(DB.getStars(), 15, 'bintang Sari = ' + DB.getStars());

    const lb = DB.getLocalLeaderboard();
    assert.strictEqual(lb.length, 2, 'jumlah baris = ' + lb.length);
    assert.deepStrictEqual(lb.map((r) => r.rank), [1, 2]);
    assert.strictEqual(lb[0].name, 'Budi', 'juara seharusnya Budi (60 bintang)');
    assert.strictEqual(lb[0].stars, 60);
    assert.strictEqual(lb[1].name, 'Sari', 'pembuatnya');
    assert.strictEqual(lb[1].stars, 15);
    assert.ok(lb[0].points > lb[1].points, 'poin tidak terurut');
    assert.ok(lb[1].accuracy > 0.99, 'akurasi Sari = ' + lb[1].accuracy);
    return lb.map((r) => r.rank + '. ' + r.name + ' (' + r.stars + '⭐)').join(' · ');
  });

  test('limit papan peringkat dipatuhi', () => {
    const top1 = DB.getLocalLeaderboard(1);
    assert.strictEqual(top1.length, 1);
    assert.strictEqual(top1[0].name, 'Budi');
  });

  test('peringkat dihitung dengan bobot bintang > level > akurasi', () => {
    // bintang harus menang jauh, walau jumlah level dan akurasinya kalah
    const a = DB.rankPoints({ stars: 10, cleared: 3, accuracy: 0.9 });
    const b = DB.rankPoints({ stars: 9, cleared: 20, accuracy: 1 });
    assert.ok(a > b, 'bintang harus lebih dominan: ' + a + ' vs ' + b);

    // sama-sama bintang & level, lalu akurasi jadi pemutus
    const c = DB.rankPoints({ stars: 5, cleared: 5, accuracy: 0.5 });
    const d = DB.rankPoints({ stars: 5, cleared: 5, accuracy: 0.9 });
    assert.ok(d > c, 'akurasi jadi pemutus terakhir');

    // lebih banyak level tetap menambah poin
    const e = DB.rankPoints({ stars: 5, cleared: 9, accuracy: 0.5 });
    assert.ok(e > c, 'jumlah level tidak berpengaruh');
    return a + ' > ' + b + ' > ' + d;
  });

  await testAsync('reset() hanya menghapus pemain aktif', async () => {
    const budi = DB.listPlayers().find((p) => p.name === 'Budi');
    const sari = DB.listPlayers().find((p) => p.name === 'Sari');
    const sariBefore = DB.playerSummary(sari.id);

    DB.selectPlayer(budi.id);
    assert.strictEqual(DB.getStars(), 60, 'pengecekan awal gagal');

    await DB.reset();

    assert.strictEqual(DB.getStars(), 0, 'progres pemain aktif belum terhapus');
    assert.strictEqual(DB.getClearedCount(), 0);
    const sariAfter = DB.playerSummary(sari.id);
    assert.strictEqual(sariAfter.stars, sariBefore.stars, 'progres pemain lain ikut terhapus');
    assert.strictEqual(sariAfter.attempts, sariBefore.attempts);
    assert.strictEqual(DB.playerCount(), 2, 'pemain ikut terhapus');
    DB.selectPlayer(sari.id);
    return 'pemain aktif kosong, pemain lain aman';
  });

  await testAsync('reset(true) mengosongkan semua pemain sekaligus', async () => {
    await DB.reset(true);
    assert.strictEqual(DB.playerCount(), 2, 'pemain ikut terhapus');
    const stars = DB.raw.scalar('SELECT COALESCE(SUM(best_stars),0) AS s FROM level_progress');
    assert.strictEqual(stars, 0, 'bintang tersisa = ' + stars);
    const att = DB.raw.scalar('SELECT COUNT(*) AS c FROM attempts');
    assert.strictEqual(att, 0, 'percobaan tersisa = ' + att);
    return 'semua pemain tetap ada, progres kosong';
  });

  await testAsync('publishScore/fetchLeaderboard diam-diam saat file://', async () => {
    assert.strictEqual(DB.onlineAvailable(), false, 'file:// seharusnya bukan online');
    const published = await DB.publishScore(true);
    assert.strictEqual(published, false);
    const lb = await DB.fetchLeaderboard(10);
    assert.strictEqual(lb.ok, false);
    assert.deepStrictEqual(lb.rows, []);
    assert.strictEqual(lb.myRank, 0);
    return 'tidak melempar error tanpa server';
  });

  await testAsync('publishScore mengirim ringkasan pemain ke server', async () => {
    DB.setServerSync(true);
    win.location = { protocol: 'http:', href: 'http://localhost/', origin: 'http://localhost' };

    let sent = null;
    win.fetch = function (url, opts) {
      if (opts && opts.method === 'POST') {
        sent = { url: url, body: JSON.parse(opts.body) };
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }
      return Promise.reject(new Error('tidak diharapkan'));
    };

    const p = DB.getPlayer();
    const ok = await DB.publishScore(true);
    assert.strictEqual(ok, true);
    assert.ok(sent, 'tidak ada data yang dikirim');
    assert.strictEqual(sent.url, '/api/score');
    assert.strictEqual(sent.body.uid, p.uid);
    assert.strictEqual(sent.body.name, p.name);
    assert.strictEqual(typeof sent.body.stars, 'number');
    assert.strictEqual(typeof sent.body.cleared, 'number');
    assert.strictEqual(typeof sent.body.accuracy, 'number');
    assert.strictEqual(sent.body.grade, p.grade);
    DB.setServerSync(false);
    return 'dikirim ' + sent.body.name + ' uid=' + sent.body.uid;
  });

  await testAsync('fetchLeaderboard membaca baris dari server', async () => {
    win.fetch = function () {
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({
          rows: [
            { rank: 1, uid: 'aaa', name: 'Budi', avatar: '🐼', grade: 2, stars: 60, cleared: 20, score: 13020, accuracy: 1, plays: 21, points: 62000 },
            { rank: 2, uid: 'bbb', name: 'Sari', avatar: '👧', grade: 3, stars: 15, cleared: 5, score: 3100, accuracy: 0.95, plays: 5, points: 15095 }
          ],
          rank: 2,
          total: 2
        })
      });
    };
    const lb = await DB.fetchLeaderboard(5);
    assert.strictEqual(lb.ok, true);
    assert.strictEqual(lb.rows.length, 2);
    assert.strictEqual(lb.rows[0].name, 'Budi');
    assert.strictEqual(lb.rows[0].points, 62000);
    assert.strictEqual(lb.myRank, 2);
    return '2 baris, posisiku #' + lb.myRank;
  });

  await testAsync('server yang gagal tidak membuat game error', async () => {
    win.fetch = function () { return Promise.reject(new Error('jaringan putus')); };
    assert.strictEqual((await DB.fetchLeaderboard()).ok, false);
    assert.strictEqual(await DB.publishScore(true), false);
    win.fetch = undefined;
    return 'ditangani dengan rapi';
  });

  await testAsync('sinkronisasi memakai slot terpisah per pemain', async () => {
    const p = DB.getPlayer();
    const urls = [];
    win.fetch = function (url) {
      urls.push(url);
      return Promise.resolve({ ok: true, status: 200, headers: { get: () => '0' } });
    };
    win.location = { protocol: 'http:', href: 'http://localhost/', origin: 'http://localhost' };
    DB.setServerSync(true);
    await DB.saveNow();
    DB.setServerSync(false);
    const stateUrl = urls.find((u) => u.indexOf('/api/state') === 0);
    assert.ok(stateUrl, 'tidak ada kiriman /api/state: ' + JSON.stringify(urls));
    assert.ok(stateUrl.indexOf('slot=' + encodeURIComponent(p.uid)) > 0,
      'slot tidak memakai uid pemain: ' + stateUrl);
    return stateUrl;
  });

  await testAsync('tarikan server tidak boleh menghapus pemain yang masih punya progres', async () => {
    // Siapkan kondisi nyata: dua pemain lokal, keduanya punya bintang.
    DB.reset(true);
    // sisakan tepat satu pemain supaya kondisi awal bersih
    DB.listPlayers().slice(1).forEach((p) => DB.deletePlayer(p.id));
    assert.strictEqual(DB.playerCount(), 1, 'penyetelan pemain gagal');

    DB.updatePlayer('Budi', '🐼', 2);
    const budi = DB.getPlayer();
    for (let lv = 1; lv <= 4; lv++) playPerfect(lv);

    const andi = DB.createPlayer('Andi', '🤖', 5);
    for (let lv = 1; lv <= 2; lv++) playPerfect(lv);
    DB.selectPlayer(budi.id);
    assert.strictEqual(DB.playerCount(), 2, 'harus ada 2 pemain');
    const andiStars = DB.playerSummary(andi.id).stars;
    assert.ok(andiStars > 0, 'Andi harus punya bintang');

    // --- Data "server": hanya memuat Budi, bukan Andi ---
    DB.deletePlayer(andi.id);
    DB.selectPlayer(budi.id);
    const serverBytes = Buffer.from(DB.exportBase64(), 'base64');

    // kembalikan kondisi lokal: Budi + Andi (dengan uid baru)
    await DB.importBase64(serverBytes.toString('base64'));
    const budi2 = DB.listPlayers().find((p) => p.name === 'Budi');
    DB.selectPlayer(budi2.id);
    const andi2 = DB.createPlayer('Andi', '🤖', 5);
    for (let lv = 1; lv <= 2; lv++) playPerfect(lv);
    DB.selectPlayer(budi2.id);
    assert.strictEqual(DB.playerCount(), 2, 'lokal harus punya 2 pemain');

    // --- buat data server benar-benar "lebih baru" ---
    // (men mundurkan waktu main lokal, supaya perbandingan timestamp
    //  mengizinkan tarikan — agar yang diuji adalah Penjaga, bukan jam)
    DB.raw.run("UPDATE attempts SET played_at = '2000-01-01T00:00:00.000Z'");
    DB.raw.run("UPDATE settings SET value = value WHERE key = 'active_player'");

    win.location = { protocol: 'http:', href: 'http://localhost/', origin: 'http://localhost' };
    function stubServer(bytes) {
      win.fetch = function () {
        return Promise.resolve({
          ok: true, status: 200,
          headers: { get: () => String(bytes.length) },
          arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length)
        });
      };
    }
    stubServer(serverBytes);

    const changed = await DB.pullFromServer();
    assert.strictEqual(changed, false, 'tarikan seharusnya dibatalkan, bukan menimpa');
    assert.strictEqual(DB.playerCount(), 2, 'pemain hilang setelah tarikan: ' + DB.playerCount());
    assert.ok(DB.listPlayers().some((p) => p.name === 'Andi'), 'Andi hilang dari perangkat');
    const andiAfter = DB.playerSummary(DB.listPlayers().find((p) => p.name === 'Andi').id);
    assert.strictEqual(andiAfter.stars, andiStars,
      'bintang Andi berubah ' + andiStars + ' → ' + andiAfter.stars);
    return 'tarikan dibatalkan, kedua pemain tetap ada';
  });

  await testAsync('tarikan tetap jalan kalau semua pemain ada di server', async () => {
    // kebalikan dari uji sebelumnya: server memuat kedua pemain, jadi
    // Penjaga tidak boleh memblokirnya. Ini yang memastikan Penjaga tadi
    // bukan sekadar menolak SEMUA tarikan.
    const lengkap = Buffer.from(DB.exportBase64(), 'base64');
    const jumlahSebelum = DB.playerCount();
    const namaSebelum = DB.listPlayers().map((p) => p.name).sort().join(',');

    win.location = { protocol: 'http:', href: 'http://localhost/', origin: 'http://localhost' };
    win.fetch = function () {
      return Promise.resolve({
        ok: true, status: 200,
        headers: { get: () => String(lengkap.length) },
        arrayBuffer: async () => lengkap.buffer.slice(lengkap.byteOffset, lengkap.byteOffset + lengkap.length)
      });
    };

    // mundurkan waktu main lokal supaya data server terlihat lebih baru
    DB.raw.run("UPDATE attempts SET played_at = '1990-01-01T00:00:00.000Z'");

    const changed = await DB.pullFromServer();
    assert.strictEqual(changed, true, 'tarikan lengkap seharusnya berhasil');
    assert.strictEqual(DB.playerCount(), jumlahSebelum, 'jumlah pemain berubah');
    assert.strictEqual(DB.listPlayers().map((p) => p.name).sort().join(','), namaSebelum,
      'daftar pemain berubah');
    return 'Penjaga tidak memblokir tarikan yang aman';
  });

  /* ============================================================ */
  section('10. MODE SERVER LAMA');
  /* ============================================================ */

  // kembalikan ke mode file:// (sebelumnya diuji dengan fetch palsu)
  win.location = { protocol: 'file:', href: 'file:///index.html', origin: 'null' };
  win.fetch = undefined;

  await testAsync('tanpa fetch/lokasi http, sinkronisasi server dilewati diam-diam', async () => {
    assert.strictEqual(DB.onlineAvailable(), false, 'seharusnya kembali ke mode file://');
    DB.setServerSync(true);
    assert.strictEqual(DB.serverSyncEnabled(), true);
    await DB.saveNow();
    assert.ok(DB.isReady(), 'database rusak setelah saveNow()');
    DB.setServerSync(false);
    return 'tidak melempar error';
  });

  await testAsync('pullFromServer() bernilai false pada mode file://', async () => {
    const pulled = await DB.pullFromServer();
    assert.strictEqual(pulled, false);
  });

  await testAsync('progres tetap utuh setelah seluruh rangkaian uji', async () => {
    const budi = DB.listPlayers().find((p) => p.name === 'Budi');
    DB.selectPlayer(budi.id);
    assert.strictEqual(DB.playerCount(), 2, 'jumlah pemain berubah');
    assert.strictEqual(DB.getPlayer().name, 'Budi', 'pemain aktif salah');
    const names = DB.listPlayers().map((p) => p.name).sort();
    assert.deepStrictEqual(names, ['Andi', 'Budi'], 'daftar pemain berubah: ' + names.join(', '));
    return names.join(' & ') + ' siap dipakai';
  });

  /* ============================================================ */
  section('11. JALUR TK & WAKTU TANPA BATAS');
  /* ============================================================ */

  /** Main satu level pada jalur tertentu, semua benar. */
  function playPerfectTrack(track, level) {
    Game.start(level, track);
    for (let i = 0; i < Game.state().questions.length; i++) {
      const q = Game.beginQuestion();
      Game.answer(q.answerIndex, false);
      if (!Game.state().finished) Game.nextQuestion();
    }
    const res = Game.summary();
    DB.recordAttempt(res);
    Game.checkBadges(res);
    return res;
  }

  test('level TK punya definisi & topik yang valid', () => {
    assert.strictEqual(MG.CONFIG.TK_LEVELS.length, MG.CONFIG.TK_LEVELS_COUNT);
    assert.strictEqual(DB.getMaxStars(), (MG.CONFIG.LEVELS_COUNT + MG.CONFIG.TK_LEVELS_COUNT) * 3);
    const q = Game.buildQuestions(1, 'tk');
    assert.strictEqual(q.length, MG.CONFIG.QUESTIONS_PER_LEVEL);
    q.forEach((item) => {
      assert.ok(item.topic.indexOf('tk') === 0, 'topik bukan topik TK: ' + item.topic);
      assert.strictEqual(item.answers.length, 4);
      assert.ok(item.answers.indexOf(item.answers[item.answerIndex]) >= 0);
    });
    assert.strictEqual(MG.tkLevel(3).track, 'tk');
    return 'TK 1 pakai topik ' + q.map((x) => x.topic).join(', ');
  });

  test('progres TK terpisah dari SD walau nomor levelnya sama', () => {
    const sdStarsBefore = DB.getStars('sd');
    const sdClearedBefore = DB.getClearedCount('sd');
    const beforeSd = DB.getLevelProgress(1, 'sd');
    const beforeSdStars = beforeSd ? beforeSd.best_stars : 0;
    assert.strictEqual(DB.getLevelProgress(1, 'tk'), null, 'TK 1 seharusnya belum dimainkan');

    playPerfectTrack('tk', 1);

    const tk1 = DB.getLevelProgress(1, 'tk');
    const sd1 = DB.getLevelProgress(1, 'sd');
    assert.ok(tk1 && tk1.track === 'tk', 'progres TK 1 tidak tersimpan');
    assert.strictEqual(tk1.best_stars, 3);
    assert.strictEqual(tk1.cleared, 1);
    assert.strictEqual((sd1 ? sd1.best_stars : 0), beforeSdStars, 'progres SD level 1 ikut berubah');

    // jalur SD sama sekali tidak terganggu
    assert.strictEqual(DB.getStars('sd'), sdStarsBefore, 'bintang SD berubah: ' + DB.getStars('sd'));
    assert.strictEqual(DB.getClearedCount('sd'), sdClearedBefore, 'level SD selesai berubah');
    assert.strictEqual(DB.getStars('tk'), 3);
    return 'SD tetap ' + sdStarsBefore + '⭐, TK 1 = ' + tk1.best_stars + '⭐';
  });

  test('membuka level & hitungan selesai per jalur', () => {
    const sdClearedBefore = DB.getClearedCount('sd');
    assert.strictEqual(DB.getClearedCount('tk'), 1);
    assert.strictEqual(DB.getUnlockedLevel('tk'), 2, 'TK berikutnya tidak terbuka');

    playPerfectTrack('tk', 2);
    assert.strictEqual(DB.getUnlockedLevel('tk'), 3);
    assert.strictEqual(DB.getClearedCount('tk'), 2);
    assert.strictEqual(DB.getClearedCount(), sdClearedBefore + 2, 'total selesai harus SD + 2 TK');
    return 'TK terbuka sampai level ' + DB.getUnlockedLevel('tk');
  });

  test('riwayat menyimpan track dengan benar', () => {
    const h = DB.getHistory(5);
    assert.ok(h.some((r) => r.track === 'tk'), 'tidak ada riwayat TK');
    assert.ok(h.some((r) => r.track === 'sd'), 'tidak ada riwayat SD');
  });

  test('waktu tanpa batas: tanpa hitung mundur & tanpa bonus cepat', () => {
    const simpan = Game.settings.timeLimit;
    Game.settings.timeLimit = 0;
    assert.strictEqual(Game.isUnlimited(), true);
    assert.strictEqual(Game.timeForQuestion(), 0, 'limit seharusnya 0');

    Game.start(1, 'sd');
    const q = Game.beginQuestion();
    const res = Game.answer(q.answerIndex, false);
    assert.strictEqual(res.correct, true);
    assert.strictEqual(res.gained, MG.CONFIG.SCORE.BASE, 'bonus waktu seharusnya 0');
    assert.strictEqual(res.timedOut, false);

    Game.settings.timeLimit = simpan;
    assert.strictEqual(Game.isUnlimited(), false);
    return 'mode unlimited → +' + res.gained + ' poin (murni jawaban benar)';
  });

  test('waktu per soal yang panjang (180 detik) diterima', () => {
    const simpan = Game.settings.timeLimit;
    Game.settings.timeLimit = 180;
    assert.strictEqual(Game.isUnlimited(), false);
    assert.strictEqual(Game.timeForQuestion(), 180);
    Game.settings.timeLimit = simpan;
    return '180s OK';
  });

  /* ============================================================ */
  console.log('\n' + '─'.repeat(52));
  if (failures.length) {
    console.log('❌ GAGAL: ' + failures.length + ' dari ' + (passed + failures.length) + ' uji');
    failures.forEach((f) => console.log('\n' + f.name + '\n' + (f.err.stack || f.err)));
    process.exit(1);
  }
  console.log('✅ SEMUA ' + passed + ' UJI DATABASE LOLOS');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n💥 Error tak terduga:\n' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
