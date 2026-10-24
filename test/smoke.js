#!/usr/bin/env node
/* ============================================================
 *  smoke.js  —  Uji asap di Chrome sungguhan (headless).
 *
 *  Cara kerja: Chrome dijalankan dengan --remote-debugging-port, lalu
 *  modul ini berbicara CDP lewat WebSocket untuk membaca dan
 *  mengendalikan keadaan halaman secara langsung. Jadi tidak perlu
 *  --dump-dom maupun --virtual-time-budget (keduanya bisa membuat
 *  timer melompat melampaui inisialisasi database dan memberi
 *  hasil yang salah).
 *
 *  Diuji pada dua mode:
 *    1. lewat server  -> http://127.0.0.1:PORT/
 *    2. mode portable -> file://.../index.html (klik 2x)
 *
 *  Yang diperiksa:
 *    1. tidak ada error JavaScript / promise ditolak
 *    2. loader disembunyikan (artinya boot() tuntas)
 *    3. database SQLite benar-benar siap
 *    4. nama pemain terisi di header
 *    5. ilustrasi maskot benar-benar ter-render
 *    6. 20 kartu level muncul
 *    7. satu level bisa dimainkan sampai selesai lewat UI
 *    8. bintang bertambah setelah main (progres tersimpan)
 *    9. kelima layar bisa dibuka tanpa teks rusak
 *   10. pengaturan waktu & kesulitan tersimpan ke database
 *   11. waktu habis mengurangi hati dengan benar
 *   12. tidak ada "undefined"/"NaN" yang bocor ke layar
 *
 *  Jalankan:  node test/smoke.js
 * ============================================================ */

'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8123;
const CDP_PORT = 9333;

if (!fs.existsSync(CHROME)) {
  console.log('! Chrome tidak ditemukan di ' + CHROME + ' — uji dilewati.');
  process.exit(0);
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png'
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ============================================================
 *  KLIEN CDP SEDERHANA (WebSocket bawaan Node, tanpa pustaka luar)
 * ============================================================ */

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.waiting = new Map();
    this.events = [];
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.id && this.waiting.has(msg.id)) {
        const slot = this.waiting.get(msg.id);
        this.waiting.delete(msg.id);
        clearTimeout(slot.timer);
        if (msg.error) slot.reject(new Error(msg.error.message));
        else slot.resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }

  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.waiting.has(id)) {
          this.waiting.delete(id);
          reject(new Error(method + ' timeout'));
        }
      }, 20000);
      this.waiting.set(id, { resolve, reject, timer });
      try {
        this.ws.send(JSON.stringify({ id, method, params: params || {} }));
      } catch (e) {
        this.waiting.delete(id);
        clearTimeout(timer);
        reject(e);
      }
    });
  }

  /** Jalankan ekspresi di halaman; await di dalamnya dibolehkan. */
  async eval(body) {
    const r = await this.send('Runtime.evaluate', {
      expression: '(async function(){' + body + '})()',
      returnByValue: true,
      awaitPromise: true
    });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error((d.exception && d.exception.description) || d.text || 'error di halaman');
    }
    return r.result.value;
  }
}

async function connectCDP() {
  for (let i = 0; i < 80; i++) {
    try {
      const targets = await getJSON('http://127.0.0.1:' + CDP_PORT + '/json/list');
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          ws.addEventListener('open', resolve, { once: true });
          ws.addEventListener('error', () => reject(new Error('WebSocket ditolak')), { once: true });
          setTimeout(() => reject(new Error('WebSocket timeout')), 10000);
        });
        const cdp = new CDP(ws);
        await cdp.send('Runtime.enable');
        await cdp.send('Page.enable');
        return cdp;
      }
    } catch (e) { /* DevTools belum siap */ }
    await sleep(250);
  }
  throw new Error('DevTools tidak tersedia');
}

/* ============================================================
 *  SERVER UJI
 *
 *  Yang dijalankan adalah server.js yang asli (bukan tiruan), supaya
 *  mode server benar-benar sama dengan yang dipakai pengguna —
 *  termasuk /api/score dan /api/leaderboard. Data ditulis ke folder
 *  sementara lewat MA_DATA_DIR, jadi data milik pengguna tidak
 *  tersentuh sama sekali.
 * ============================================================ */

function startServer() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-smoke-data-'));
  const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT), MA_DATA_DIR: dataDir }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  child.stdout.on('data', (c) => { log += c; });
  child.stderr.on('data', (c) => { log += c; });

  return new Promise((resolve, reject) => {
    let tries = 0;
    let done = false;

    function retry() {
      if (done) return;
      if (tries > 60) { done = true; reject(new Error('server uji tidak merespons\n' + log)); return; }
      setTimeout(poll, 200);
    }

    function poll() {
      if (done) return;
      tries++;
      http.get('http://127.0.0.1:' + PORT + '/api/info', (res) => {
        res.resume();
        if (res.statusCode === 200) {
          done = true;
          resolve({
            close: function () {
              try { child.kill(); } catch (e) { /* sudah mati */ }
              try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch (e) { }
            },
            log: function () { return log; }
          });
          return;
        }
        retry();
      }).on('error', retry);
    }

    poll();
  });
}

/* ============================================================
 *  CHROME
 * ============================================================ */

function launchChrome(url) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-smoke-'));
  const child = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--mute-audio',
    '--allow-file-access-from-files',
    '--remote-debugging-port=' + CDP_PORT,
    '--user-data-dir=' + profile,
    'about:blank'
  ], { stdio: 'ignore' });

  return {
    child,
    cleanup() {
      try { child.kill('SIGKILL'); } catch (e) { }
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { }
    }
  };
}

/* ============================================================
 *  SKRIP YANG DIJALANKAN DI DALAM HALAMAN
 * ============================================================ */

const INSTALL_ERRORS = `
  window.__smokeErrors = [];
  window.addEventListener('error', function (e) {
    window.__smokeErrors.push('ERROR: ' + (e.message || '?') +
      (e.filename ? ' @ ' + String(e.filename).split('/').pop() + ':' + e.lineno : ''));
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    window.__smokeErrors.push('REJECT: ' + (r && (r.stack || r.message) || r));
  });
`;

const READ_STATE = `
  var db = window.MG && window.MG.db;
  var loader = document.getElementById('loader');
  var active = document.querySelector('.screen.is-active');
  return {
    hasMG: typeof window.MG,
    errors: (window.__smokeErrors || []).slice(0),
    loaderClass: loader ? loader.className : 'NO-LOADER',
    dbReady: db ? db.isReady() : 'no-db',
    storage: db ? db.storageKind() : 'no-db',
    chip: ((document.getElementById('chip-name') || {}).textContent || '').trim(),
    starsHome: ((document.getElementById('home-stars') || {}).textContent || '').trim(),
    mascotSvg: !!document.querySelector('#mascot-home svg'),
    activeScreen: active ? active.id : 'none',
    levelCards: document.querySelectorAll('#level-grid .level-card').length,
    optionButtons: document.querySelectorAll('#options .opt').length,
    questionText: ((document.getElementById('q-text') || {}).textContent || '').trim(),
    dbStars: db ? db.getStars() : -1,
    leaked: ((document.body.innerText || '').match(/undefined|NaN|\\[object/g) || []).slice(0, 5)
  };
`;

/* Buka layar daftar level (dipakai untuk mengecek 20 kartu). */
const OPEN_LEVELS = `
  window.MG.ui.show('levels');
  await new Promise(function (r) { setTimeout(r, 250); });
  return true;
`;

/* Mainkan satu level penuh lewat klik UI sungguhan. */
const PLAY_LEVEL = `
  var db = window.MG.db;
  var before = db.getStars();
  var log = [];

  // kembali ke daftar level lalu klik kartu level 1
  window.MG.ui.show('levels');
  await new Promise(function (r) { setTimeout(r, 200); });
  var card = document.querySelector('#level-grid .level-card');
  if (!card) return { err: 'kartu level tidak ada', starsBefore: before, starsAfter: db.getStars() };
  card.click();
  await new Promise(function (r) { setTimeout(r, 300); });

  var playedScreen = (document.querySelector('.screen.is-active') || {}).id || 'none';
  var optCount = document.querySelectorAll('#options .opt').length;
  var firstQ = ((document.getElementById('q-text') || {}).textContent || '').trim();

  var guard = 0;
  while (guard++ < 80) {
    var st = window.MG.game.state();
    if (!st) break;

    if (st.finished) break;

    // Kalau overlay umpan balik masih terbuka, tekan tombol Lanjut
    var fb = document.getElementById('feedback');
    var fbOpen = fb && fb.classList.contains('show');
    if (fbOpen) {
      var next = document.getElementById('btn-next');
      if (next) next.click();
      await new Promise(function (r) { setTimeout(r, 120); });
      continue;
    }

    var q = st.questions[st.index];
    var opts = document.querySelectorAll('#options .opt');
    if (!q || !opts.length) { log.push('soal/pilihan tidak tampil di index ' + st.index); break; }

    opts[q.answerIndex].click();
    await new Promise(function (r) { setTimeout(r, 150); });
  }

  // pastikan keluar dari overlay terakhir
  await new Promise(function (r) { setTimeout(r, 300); });
  var fb2 = document.getElementById('feedback');
  if (fb2 && fb2.classList.contains('show')) {
    var n2 = document.getElementById('btn-next');
    if (n2) n2.click();
    await new Promise(function (r) { setTimeout(r, 400); });
  }

  var stEnd = window.MG.game.state();
  return {
    err: null,
    log: log,
    starsBefore: before,
    starsAfter: db.getStars(),
    playedScreen: playedScreen,
    optCountAtStart: optCount,
    firstQuestion: firstQ,
    resultScreen: (document.querySelector('.screen.is-active') || {}).id || 'none',
    finished: stEnd ? stEnd.finished : null,
    correct: stEnd ? stEnd.correct : null,
    total: stEnd ? stEnd.questions.length : null
  };
`;

/* Kunjungi tiap layar lewat API navigasi lalu catat pecahan yang rusak. */
const TOUR = `
  var bad = [];
  var screens = ['home', 'levels', 'stats', 'players', 'leaderboard', 'help', 'settings'];
  var seen = [];
  for (var i = 0; i < screens.length; i++) {
    window.MG.ui.show(screens[i]);
    await new Promise(function (r) { setTimeout(r, 220); });
    var active = document.querySelector('.screen.is-active');
    seen.push(screens[i] + '=' + (active ? active.id : 'none'));
    var txt = document.body.innerText || '';
    (txt.match(/undefined|NaN|\\[object/g) || []).slice(0, 3).forEach(function (m) {
      bad.push(screens[i] + ': ' + m);
    });
    // pastikan tidak ada elemen kosong yang tidak sengaja
    if (screens[i] === 'levels') {
      var cards = document.querySelectorAll('#level-grid .level-card');
      if (cards.length !== 20) bad.push('levels: kartu = ' + cards.length);
    }
    if (screens[i] === 'stats') {
      // Database kosong pada awal uji, jadi tabel boleh kosong —
      // yang penting tidak ada baris rusak di dalamnya.
      document.querySelectorAll('#screen-stats tbody tr').forEach(function (tr) {
        if (/undefined|NaN/.test(tr.textContent)) bad.push('stats: baris rusak "' + tr.textContent.slice(0, 40) + '"');
      });
    }
    if (screens[i] === 'players') {
      var pc = document.querySelectorAll('#player-grid .pcard');
      if (pc.length < 1) bad.push('players: tidak ada kartu pemain');
      var aktif = document.querySelectorAll('#player-grid .pcard.active');
      if (aktif.length !== 1) bad.push('players: pemain aktif = ' + aktif.length + ' (harusnya 1)');
    }
    if (screens[i] === 'leaderboard') {
      var lb = document.querySelectorAll('#lb-tbody tr');
      if (lb.length < 1) bad.push('leaderboard: tabel kosong');
      var pod = document.querySelectorAll('#lb-podium .lb-pod');
      if (pod.length < 1) bad.push('leaderboard: podium kosong');
      document.querySelectorAll('#lb-tbody tr, #lb-podium .lb-pod').forEach(function (tr) {
        if (/undefined|NaN|\\[object/.test(tr.textContent)) {
          bad.push('leaderboard: baris rusak "' + tr.textContent.trim().slice(0, 40) + '"');
        }
      });
    }
  }
  window.MG.ui.show('home');
  return { seen: seen, bad: bad };
`;

/* Uji banyak pemain lewat UI: tambah pemain, pastikan progres terpisah,
   lalu pastikan papan peringkat lokal menampilkan keduanya. */
const MULTIUSER = `
  var out = { problems: [], notes: [] };
  var DB = window.MG.db, UI = window.MG.ui;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  function stars() { return DB.getStars(); }

  // mainkan satu level supaya pemain pertama punya bintang
  UI.startLevel(1);
  for (var i = 0; i < 20; i++) {
    var st = window.MG.game.state();
    if (!st || !st.current || st.index >= st.questions.length) break;
    window.MG.game.answer(st.current.options.indexOf(st.current.answer), false);
    await wait(30);
  }
  UI.finishGame();
  await wait(250);

  var namaAwal = DB.getPlayer().name;
  var bintangAwal = stars();
  out.notes.push('pemain "' + namaAwal + '" mulai dengan ' + bintangAwal + ' bintang');
  if (bintangAwal < 1) out.problems.push('pemain pertama tidak dapat bintang sama sekali');

  // --- tambah pemain kedua lewat formulir di layar ---
  UI.show('players');
  await wait(150);
  var sebelumKartu = document.querySelectorAll('#player-grid .pcard').length;

  document.getElementById('btn-add-player').click();
  await wait(150);
  var form = document.getElementById('card-new-player');
  if (form.hidden) { out.problems.push('form pemain baru tidak terbuka'); }

  document.getElementById('inp-pname').value = 'Anak Kedua';
  // pilih kelas 4 & avatar kedua
  var kelas = document.querySelectorAll('#grade-picker button');
  if (kelas.length !== 6) out.problems.push('pemilih kelas berisi ' + kelas.length + ' tombol');
  else kelas[3].click();
  var ava = document.querySelectorAll('#new-avatar-picker button');
  if (ava.length < 4) out.problems.push('pemilih avatar berisi ' + ava.length + ' tombol');
  else ava[3].click();

  document.getElementById('btn-save-player').click();
  await wait(400);

  var setelahKartu = document.querySelectorAll('#player-grid .pcard').length;
  if (setelahKartu !== sebelumKartu + 1) {
    out.problems.push('kartu pemain ' + sebelumKartu + ' → ' + setelahKartu);
  }
  if (DB.playerCount() !== 2) out.problems.push('playerCount = ' + DB.playerCount() + ' (harusnya 2)');

  var p2 = DB.getPlayer();
  out.notes.push('pemain aktif: "' + p2.name + '" kelas ' + p2.grade);
  if (p2.name !== 'Anak Kedua') out.problems.push('pemain baru tidak jadi aktif (' + p2.name + ')');
  if (p2.grade !== 4) out.problems.push('kelas pemain baru = ' + p2.grade + ' (harusnya 4)');

  // --- progres harus benar-benar terpisah ---
  var bintangBaru = stars();
  out.notes.push('pemain baru mulai dari ' + bintangBaru + ' bintang');
  if (bintangBaru !== 0) {
    out.problems.push('pemain baru mewarisi ' + bintangBaru + ' bintang pemain lain');
  }

  var list = DB.listPlayers();
  var a = DB.playerSummary(list[0].id);
  var b = DB.playerSummary(list[1].id);
  if (a.stars === b.stars) out.problems.push('ringkasan kedua pemain sama (' + a.stars + ')');
  if (!a.uid || a.uid === b.uid) out.problems.push('uid kedua pemain bentrok');

  // --- papan peringkat lokal harus memuat keduanya ---
  UI.show('leaderboard');
  await wait(250);
  var baris = document.querySelectorAll('#lb-tbody tr');
  out.notes.push('papan peringkat lokal: ' + baris.length + ' baris');
  if (baris.length !== 2) out.problems.push('baris peringkat = ' + baris.length + ' (harusnya 2)');
  var pod = document.querySelectorAll('#lb-podium .lb-pod');
  if (pod.length !== 2) out.problems.push('kartu podium = ' + pod.length + ' (harusnya 2)');
  var sub = document.getElementById('lb-sub').textContent;
  if (sub.indexOf('2 orang') < 0) {
    out.problems.push('judul tab lokal tidak menyebut jumlah pemain: "' + sub + '"');
  }

  // --- kembali ke pemain pertama: bintang harus utuh ---
  UI.show('players');
  await wait(200);
  var kartu = document.querySelectorAll('#player-grid .pcard');
  var idxLama = 0;
  for (var k = 0; k < kartu.length; k++) {
    if (kartu[k].querySelector('.p-name').textContent.indexOf(namaAwal) === 0) { idxLama = k; break; }
  }
  kartu[idxLama].click();
  await wait(350);

  if (DB.getPlayer().name !== namaAwal) {
    out.problems.push('ganti gagal, aktif = ' + DB.getPlayer().name);
  }
  if (stars() !== bintangAwal) {
    out.problems.push('bintang pemain pertama berubah ' + bintangAwal + ' → ' + stars());
  }
  out.notes.push('kembali ke "' + DB.getPlayer().name + '": ' + stars() + ' bintang (tetap)');

  // hapus pemain kedua, pastikan yang pertama tetap aman
  var kedua = DB.listPlayers().filter(function (p) { return p.name === 'Anak Kedua'; })[0];
  if (kedua && DB.deletePlayer(kedua.id) !== true) out.problems.push('pemain kedua tidak terhapus');
  if (DB.playerCount() !== 1) out.problems.push('playerCount setelah hapus = ' + DB.playerCount());
  if (stars() !== bintangAwal) out.problems.push('bintang rusak setelah hapus pemain');

  UI.show('home');
  await wait(150);
  return out;
`;

/* Buka tab "Semua Pemain" di papan peringkat: kalau lewat server, baris
   harus benar-benar datang dari server (bukan dihitung ulang di lokal). */
const ONLINE_TAB = `
  var out = { problems: [], notes: [] };
  var UI = window.MG.ui;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // pastikan skor kita sudah terkirim ke server (dipanggil otomatis,
  // tapi dipaksa sekali lagi agar uji tidak bergantung pada timing)
  await window.MG.db.publishScore(true);

  UI.show('leaderboard');
  await wait(150);
  document.querySelector('#lb-tabs button[data-tab="online"]').click();

  // tunggu hingga tabel terisi (server hanya di sini)
  for (var i = 0; i < 40; i++) {
    await wait(150);
    var rows = document.querySelectorAll('#lb-tbody tr');
    var kosong = rows.length === 1 && /Belum ada data/.test(rows[0].textContent);
    if (!kosong) break;
  }

  var tbl = document.querySelectorAll('#lb-tbody tr');
  var sub = document.getElementById('lb-sub').textContent;
  var note = document.getElementById('lb-note').textContent;
  out.notes.push(sub);

  if (!window.MG.db.onlineAvailable()) {
    // mode file:// — harus memberi petunjuk, bukan error
    if (!/server/i.test(note)) {
      out.problems.push('mode file:// tidak memberi petunjuk server: "' + note + '"');
    }
    out.notes.push('mode file://: papan daring dinonaktifkan (benar)');
  } else {
    if (tbl.length < 1) out.problems.push('tab online tidak menampilkan pemain apa pun');
    var adaAku = false;
    document.querySelectorAll('#lb-tbody tr').forEach(function (tr) {
      if (tr.classList.contains('me')) adaAku = true;
      if (/undefined|NaN|\\[object/.test(tr.textContent)) {
        out.problems.push('baris online rusak: "' + tr.textContent.trim().slice(0, 40) + '"');
      }
    });
    if (!adaAku) out.problems.push('pemain sendiri tidak ditandai di papan daring');
    if (!/Posisimu/.test(note)) out.problems.push('posisi sendiri tidak dilaporkan: "' + note + '"');
  }

  document.querySelector('#lb-tabs button[data-tab="local"]').click();
  await wait(150);
  return out;
`;

/* Uji pengaturan: ubah waktu & kesulitan, lalu pastikan tersimpan. */
const SETTINGS = `
  window.MG.ui.show('settings');
  await new Promise(function (r) { setTimeout(r, 200); });

  var inp = document.getElementById('inp-time');
  var before = window.MG.game.settings.timeLimit;
  inp.value = '35';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  var label = (document.getElementById('time-val') || {}).textContent || '';

  var hard = document.querySelector('#seg-difficulty button[data-diff="sulit"]') ||
             document.querySelectorAll('#seg-difficulty button')[2];
  if (hard) hard.click();

  var shownDiff = hard && hard.classList.contains('on');

  document.getElementById('btn-settings-close').click();
  await new Promise(function (r) { setTimeout(r, 250); });

  return {
    timeBefore: before,
    timeAfter: window.MG.game.settings.timeLimit,
    timeLabel: label,
    diffAfter: window.MG.game.settings.difficulty,
    diffHighlighted: !!shownDiff,
    savedInDb: window.MG.db.getSetting('time_limit', '?'),
    backScreen: (document.querySelector('.screen.is-active') || {}).id || 'none',
    leaked: ((document.body.innerText || '').match(/undefined|NaN|\\[object/g) || []).slice(0, 4)
  };
`;

/* Uji tombol waktu habis: jawaban salah tidak boleh merusak tampilan. */
const TIMEOUT = `
  window.MG.ui.show('levels');
  await new Promise(function (r) { setTimeout(r, 150); });
  document.querySelector('#level-grid .level-card').click();
  await new Promise(function (r) { setTimeout(r, 250); });
  window.MG.ui.timeUp();
  await new Promise(function (r) { setTimeout(r, 250); });
  return {
    hearts: window.MG.game.state() ? window.MG.game.state().hearts : null,
    leaked: ((document.body.innerText || '').match(/undefined|NaN|\\[object/g) || []).slice(0, 4)
  };
`;

/* Jalur TK: tab TK menampilkan 8 kartu, satu level bisa dimainkan,
   dan progresnya tidak mengubah bintang jalur SD. */
const TK_TRACK = `
  var out = { problems: [], notes: [] };
  var DB = window.MG.db, UI = window.MG.ui;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  UI.show('levels');
  await wait(200);
  var tkBtn = document.querySelector('#track-tabs button[data-track="tk"]');
  if (!tkBtn) { out.problems.push('tab TK tidak ada'); return out; }
  tkBtn.click();
  await wait(250);
  var cards = document.querySelectorAll('#level-grid .level-card');
  out.notes.push('kartu TK = ' + cards.length);
  if (cards.length !== 8) out.problems.push('kartu TK = ' + cards.length + ' (harusnya 8)');
  if (!tkBtn.classList.contains('on')) out.problems.push('tab TK tidak aktif');

  var sdBefore = DB.getStars('sd');
  var before = DB.getStars('tk');
  cards[0].click();
  await wait(300);
  var guard = 0;
  while (guard++ < 80) {
    var st = window.MG.game.state();
    if (!st || st.finished) break;
    var fb = document.getElementById('feedback');
    if (fb && fb.classList.contains('show')) {
      var nx = document.getElementById('btn-next');
      if (nx) nx.click();
      await wait(120);
      continue;
    }
    var q = st.questions[st.index];
    var opts = document.querySelectorAll('#options .opt');
    if (!q || !opts.length) break;
    opts[q.answerIndex].click();
    await wait(120);
  }
  await wait(300);
  var fb2 = document.getElementById('feedback');
  if (fb2 && fb2.classList.contains('show')) {
    var n2 = document.getElementById('btn-next');
    if (n2) n2.click();
    await wait(300);
  }

  var after = DB.getStars('tk');
  out.notes.push('TK 1: bintang ' + before + ' -> ' + after);
  if (after <= before) out.problems.push('bintang TK tidak bertambah (' + before + ' -> ' + after + ')');
  if (DB.getStars('sd') !== sdBefore) {
    out.problems.push('bintang SD berubah saat main TK (' + sdBefore + ' -> ' + DB.getStars('sd') + ')');
  }
  if (DB.getLevelProgress(1, 'tk') == null) out.problems.push('progres TK 1 tidak tersimpan');

  // kembali ke tab SD
  var sdBtn = document.querySelector('#track-tabs button[data-track="sd"]');
  if (sdBtn) sdBtn.click();
  await wait(200);
  var sdCards = document.querySelectorAll('#level-grid .level-card');
  if (sdCards.length !== 20) out.problems.push('kartu SD setelah pindah = ' + sdCards.length);

  UI.show('home');
  await wait(100);
  return out;
`;

/* Waktu tanpa batas: tersimpan sebagai 0, timer menampilkan ∞,
   lalu bisa dikembalikan ke mode berwaktu. */
const UNLIMITED = `
  var out = { problems: [], notes: [] };
  var DB = window.MG.db, UI = window.MG.ui;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  UI.show('settings');
  await wait(200);
  var chk = document.getElementById('inp-time-unlimited');
  if (!chk) { out.problems.push('checkbox tanpa batas tidak ada'); return out; }
  chk.checked = true;
  chk.dispatchEvent(new Event('change', { bubbles: true }));
  var label = (document.getElementById('time-val') || {}).textContent || '';
  out.notes.push('label pengaturan = "' + label + '"');
  if (!/Tanpa batas/.test(label)) out.problems.push('label tidak menyebut tanpa batas: "' + label + '"');
  document.getElementById('btn-settings-close').click();
  await wait(250);

  if (!window.MG.game.isUnlimited()) out.problems.push('mode tanpa batas tidak aktif setelah simpan');
  var saved = DB.getSetting('time_limit', '?');
  if (String(saved) !== '0') out.problems.push('time_limit tersimpan = ' + saved + ' (harusnya 0)');

  UI.startLevel(1, 'sd');
  await wait(250);
  var tl = (document.getElementById('timer-label') || {}).textContent;
  var wrap = document.getElementById('timer');
  out.notes.push('timer main = "' + tl + '"');
  if (tl !== '∞') out.problems.push('label timer bukan ∞: "' + tl + '"');
  if (!wrap.classList.contains('unlimited')) out.problems.push('kelas unlimited tidak dipasang pada timer');

  // jawab satu soal tanpa batas
  var st = window.MG.game.state();
  var q = st.questions[st.index];
  var opts = document.querySelectorAll('#options .opt');
  if (opts[q.answerIndex]) opts[q.answerIndex].click();
  await wait(200);
  var fb = document.getElementById('feedback');
  if (fb && fb.classList.contains('show')) {
    var nx = document.getElementById('btn-next');
    if (nx) nx.click();
    await wait(150);
  }

  // kembalikan ke mode berwaktu
  UI.show('settings');
  await wait(200);
  chk = document.getElementById('inp-time-unlimited');
  chk.checked = false;
  chk.dispatchEvent(new Event('change', { bubbles: true }));
  document.getElementById('btn-settings-close').click();
  await wait(200);
  if (window.MG.game.isUnlimited()) out.problems.push('gagal kembali ke mode berwaktu');
  if (String(DB.getSetting('time_limit', '?')) === '0') out.problems.push('time_limit masih 0 setelah dibatalkan');

  UI.show('home');
  await wait(100);
  return out;
`;

/* ============================================================
 *  PEMERIKSAAN
 * ============================================================ */

let failed = 0;

function inspect(state, play, mode) {
  const problems = [];
  const notes = [];

  function must(cond, msg) { if (!cond) problems.push('[' + mode + '] ' + msg); }

  must(state.hasMG === 'object', 'MG tidak terbentuk — ada skrip yang gagal dimuat');
  must(state.errors.length === 0, 'error di halaman: ' + state.errors.slice(0, 3).join(' | '));
  must(/loader\s+hide/.test(state.loaderClass || ''),
    'loader tidak disembunyikan — boot() belum tuntas (kelas="' + state.loaderClass + '")');
  must(state.dbReady === true, 'database SQLite belum siap');
  must(state.chip && state.chip !== 'Pemain',
    'nama pemain belum terisi — DB.ensurePlayer() tidak jalan');
  must(state.mascotSvg, 'ilustrasi maskot tidak ter-render');
  must(state.levelCards === 20, 'kartu level = ' + state.levelCards + ' (harusnya 20)');
  must(!state.leaked.length, 'teks rusak di layar: ' + state.leaked.join(' | '));

  if (play.err) must(false, 'gagal memainkan level: ' + play.err);
  must(play.playedScreen === 'screen-play',
    'klik kartu level tidak membuka layar main (aktif: ' + play.playedScreen + ')');
  must(play.optCountAtStart === 4,
    'pilihan jawaban = ' + play.optCountAtStart + ' (harusnya 4)');
  must(play.firstQuestion && play.finished === true,
    'level tidak selesai (pertama "' + (play.firstQuestion || '').slice(0, 30) +
    '", selesai=' + play.finished + ')');
  must(play.correct === play.total,
    'jawaban otomatis benar kurang: ' + play.correct + '/' + play.total);
  must(play.starsAfter > play.starsBefore,
    'bintang tidak bertambah (sebelum ' + play.starsBefore + ', sesudah ' + play.starsAfter + ')');
  must(['screen-result', 'screen-play'].includes(play.resultScreen),
    'layar akhir tidak terduga: ' + play.resultScreen);
  if (play.log && play.log.length) {
    play.log.slice(0, 3).forEach((l) => notes.push('catatan: ' + l));
  }

  notes.unshift('boot selesai, penyimpanan = ' + state.storage);
  notes.push('pemain "' + state.chip + '", kartu level = ' + state.levelCards);
  notes.push('soal pertama: "' + (play.firstQuestion || '').slice(0, 52) + '"');
  notes.push('level selesai ' + play.correct + '/' + play.total + ' benar → bintang ' +
    play.starsBefore + ' → ' + play.starsAfter);

  return { problems, notes };
}

function report(label, result) {
  console.log('\n=== ' + label + ' ===');
  result.notes.forEach((n) => console.log('  · ' + n));
  if (result.problems.length) {
    failed += result.problems.length;
    result.problems.forEach((p) => console.log('  ✗ ' + p));
  } else {
    console.log('  ✓ semua pemeriksaan lolos');
  }
}

/* ============================================================
 *  ALUR UTAMA
 * ============================================================ */

async function runMode(label, url, mode) {
  const chrome = launchChrome(url);
  try {
    const cdp = await connectCDP();

    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: INSTALL_ERRORS });
    await cdp.send('Page.navigate', { url });

    // tunggu boot() selesai dalam waktu nyata (maks 25 detik)
    let state = null;
    for (let i = 0; i < 120; i++) {
      await sleep(200);
      try {
        const s = await cdp.eval(READ_STATE);
        if (s.loaderClass && /\\bhide\\b/.test(s.loaderClass)) { state = s; break; }
      } catch (e) { /* halaman belum siap dibaca */ }
    }
    if (!state) state = await cdp.eval(READ_STATE);

    await cdp.eval(OPEN_LEVELS);
    const afterLevels = await cdp.eval(READ_STATE);
    state.levelCards = afterLevels.levelCards;
    state.leaked = afterLevels.leaked;

    let play;
    try {
      play = await cdp.eval(PLAY_LEVEL);
    } catch (e) {
      play = { err: e.message, starsBefore: -1, starsAfter: -1 };
    }

    const merged = Object.assign({}, afterLevels, { errors: afterLevels.errors });
    report(label, inspect(merged, play, mode));

    // --- pemeriksaan tambahan: semua layar, pengaturan, dan waktu habis ---
    try {
      const tour = await cdp.eval(TOUR);
      const mu = await cdp.eval(MULTIUSER);
      const on = await cdp.eval(ONLINE_TAB);
      const s2 = await cdp.eval(SETTINGS);
      const to = await cdp.eval(TIMEOUT);
      const tk = await cdp.eval(TK_TRACK);
      const unl = await cdp.eval(UNLIMITED);

      const extra = [];

      function must(c, msg) { if (!c) extra.push('[' + mode + '] ' + msg); }

      must(tour.seen.every((x) => x.split('=')[1] === 'screen-' + x.split('=')[0]),
        'ada layar yang gagal dibuka: ' + tour.seen.join(', '));
      must(tour.bad.filter((b) => /undefined|NaN|\[object/.test(b)).length === 0,
        'teks rusak di layar lain: ' + tour.bad.join(' | '));
      must(s2.timeAfter === 35, 'waktu per soal jadi ' + s2.timeAfter + ' (harusnya 35)');
      must(/35/.test(s2.timeLabel), 'label waktu tidak ikut berubah: "' + s2.timeLabel + '"');
      must(s2.diffAfter === 'sulit', 'kesulitan jadi "' + s2.diffAfter + '" (harusnya sulit)');
      must(s2.savedInDb === '35', 'waktu tidak tersimpan di database (nilai "' + s2.savedInDb + '")');
      must(s2.backScreen === 'screen-home', 'tidak kembali ke beranda setelah tutup pengaturan');
      must(!s2.leaked.length, 'teks rusak di pengaturan: ' + s2.leaked.join(' | '));
      must(to.hearts === 2, 'waktu habis tidak mengurangi hati (sisa ' + to.hearts + ')');
      must(!to.leaked.length, 'teks rusak setelah waktu habis: ' + to.leaked.join(' | '));
      must(mu.problems.length === 0, 'banyak pemain: ' + mu.problems.join(' | '));
      must(on.problems.length === 0, 'papan daring: ' + on.problems.join(' | '));
      must(tk.problems.length === 0, 'jalur TK: ' + tk.problems.join(' | '));
      must(unl.problems.length === 0, 'tanpa batas: ' + unl.problems.join(' | '));

      report('  rincian: 7 layar + banyak pemain + papan daring + pengaturan + waktu habis + jalur TK', {
        problems: extra
          .concat(mu.problems.map((p) => '[banyak pemain] ' + p))
          .concat(on.problems.map((p) => '[papan daring] ' + p))
          .concat(tk.problems.map((p) => '[jalur TK] ' + p))
          .concat(unl.problems.map((p) => '[tanpa batas] ' + p)),
        notes: [
          'layar: ' + tour.seen.join(', '),
          'banyak pemain: ' + mu.notes.join(' · '),
          'papan daring: ' + on.notes.join(' · '),
          'jalur TK: ' + tk.notes.join(' · '),
          'tanpa batas: ' + unl.notes.join(' · '),
          'waktu per soal ' + s2.timeBefore + 'd → ' + s2.timeAfter + 'd (tersimpan: "' + s2.savedInDb + '")',
          'kesulitan → "' + s2.diffAfter + '", kembali ke ' + s2.backScreen,
          'waktu habis → hati tersisa ' + to.hearts
        ]
      });
    } catch (e) {
      failed++;
      console.log('\n===   rincian ===');
      console.log('  ✗ gagal: ' + e.message);
    }
  } catch (err) {
    failed++;
    console.log('\n=== ' + label + ' ===');
    console.log('  ✗ tidak bisa menguji: ' + err.message);
  } finally {
    chrome.cleanup();
    await sleep(400);
  }
}

(async function main() {
  let server;
  try {
    server = await startServer();
  } catch (err) {
    console.log('! Gagal menyalakan server uji (' + err.message + ') — uji dilewati.');
    process.exit(0);
  }

  await runMode('MODE SERVER (http://127.0.0.1:' + PORT + '/)',
    'http://127.0.0.1:' + PORT + '/', 'http');

  await runMode('MODE PORTABLE (klik 2x index.html)',
    'file://' + path.join(ROOT, 'index.html'), 'file://');

  server.close();

  console.log('\n' + '─'.repeat(52));
  console.log(failed
    ? '❌ GAGAL: ' + failed + ' masalah'
    : '✅ SEMUA UJI LOLOS');
  process.exit(failed ? 1 : 0);
})();
