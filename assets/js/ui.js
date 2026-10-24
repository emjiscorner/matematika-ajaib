/* ============================================================
 *  ui.js  —  Tampilan: navigasi layar, kartu level, kartu soal,
 *  tombol jawaban, timer, umpan balik, hasil, pengaturan, statistik.
 * ============================================================ */
(function (global) {
  'use strict';

  var MG = global.MG = global.MG || {};
  var U = MG.utils;
  var $ = U.$, $$ = U.$$, on = U.on, el = U.el;
  var UI = MG.ui = {};

  var currentScreen = 'home';
  var levelTrack = 'sd';   // jalur yang sedang dilihat di peta level ('sd' | 'tk')

  /* ============================================================
   *  NAVIGASI LAYAR
   * ============================================================ */
  UI.show = function (name) {
    $$('.screen').forEach(function (s) {
      s.classList.toggle('is-active', s.id === 'screen-' + name);
    });
    currentScreen = name;
    try { window.scrollTo(0, 0); } catch (e) { }

    // judul header
    var sub = $('#topbar-sub');
    var titles = {
      home: 'Pilih level untuk mulai',
      levels: '20 level, kesulitan bertingkat',
      play: 'Jawab dengan cepat!',
      result: 'Hasil permainan',
      settings: 'Atur sesuai kebutuhanmu',
      stats: 'Rekam jejak belajar',
      players: 'Tiap pemain punya progres sendiri',
      leaderboard: 'Lihat siapa yang paling Nilainya',
      help: 'Baca aturan mainnya'
    };
    if (sub) sub.textContent = titles[name] || '';
    $('#btn-home').style.visibility = (name === 'home' || name === 'play') ? 'hidden' : 'visible';

    if (name === 'levels') UI.renderLevels();
    if (name === 'stats') UI.renderStats();
    if (name === 'settings') UI.fillSettings();
    if (name === 'players') UI.renderPlayers();
    if (name === 'leaderboard') UI.renderLeaderboard();
  };
  UI.current = function () { return currentScreen; };

  /* ============================================================
   *  BERANDA
   * ============================================================ */
  UI.refreshHome = function () {
    var ov = MG.db.getOverview();
    $('#home-stars').textContent = ov.stars;
    $('#home-badges').textContent = Object.keys(MG.db.getBadges()).length;
    $('#home-done').textContent = ov.cleared + '/' + (MG.CONFIG.LEVELS_COUNT + MG.CONFIG.TK_LEVELS_COUNT);
    $('#home-acc').textContent = Math.round(ov.accuracy * 100) + '%';

    var p = MG.db.getPlayer();
    if (p) {
      $('#chip-avatar').textContent = p.avatar;
      $('#chip-name').textContent = p.name;
      $('#switch-name').textContent = p.name.split(' ')[0];
    }
    $('#mascot-home').innerHTML = MG.art.mascot(ov.cleared === 0 ? 'happy' : 'cheer');
  };

  var BUBBLES = [
    'Halo! Aku Bobi. Ayo belajar bareng! 😊',
    'Sudah tahu cara mainnya belum? 😄',
    'Kalau siap, klik Mulai Belajar! 🚀'
  ];

  UI.showBubble = function (text, ms) {
    var b = $('#mascot-bubble');
    if (!b) return;
    b.innerHTML = text;
    b.classList.add('show');
    clearTimeout(UI._bubbleT);
    UI._bubbleT = setTimeout(function () { b.classList.remove('show'); }, ms || 4200);
  };

  /* ============================================================
   *  PETA LEVEL
   * ============================================================ */
  UI.setLevelTrack = function (track) {
    levelTrack = (track === 'tk') ? 'tk' : 'sd';
    $$('#track-tabs button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-track') === levelTrack);
    });
    UI.renderLevels();
  };

  UI.renderLevels = function () {
    var grid = $('#level-grid');
    grid.innerHTML = '';
    var track = levelTrack;
    var isTk = track === 'tk';
    var levels = isTk ? MG.CONFIG.TK_LEVELS : MG.CONFIG.LEVELS;
    var total = MG.levelCount(track);
    var progress = MG.db.getAllProgress(track);
    var unlocked = MG.db.getUnlockedLevel(track);

    levels.forEach(function (LV) {
      var p = progress[LV.n];
      var locked = LV.n > unlocked;
      var stars = p ? p.best_stars : 0;
      var cleared = p && p.cleared;

      var card = el('button', 'level-card' + (locked ? ' locked' : '') + (LV.n === unlocked && !locked ? ' current' : '') + (isTk ? ' tk-card' : ''));
      card.style.animationDelay = (LV.n * 0.02) + 's';
      card.style.borderColor = locked ? '' : 'hsl(' + LV.hue + ' 85% 62%)';

      var starsHtml = '';
      for (var i = 0; i < 3; i++) {
        starsHtml += '<span class="s' + (i < stars ? ' on' : '') + '">' +
          (i < stars ? '⭐' : '☆') + '</span>';
      }

      var label = isTk ? ('TK ' + LV.n) : ('Lv ' + LV.n);
      card.innerHTML =
        '<span class="lv-n">' + label + '</span>' +
        (cleared ? '<span class="lv-check">✓</span>' : '') +
        '<span class="lv-emoji">' + LV.emoji + '</span>' +
        '<span class="lv-title">' + LV.title + '</span>' +
        '<span class="lv-stars">' + starsHtml + '</span>';

      card.title = (isTk ? 'TK ' : 'Level ') + LV.n + '. ' + LV.title + ' — ' + LV.desc;
      if (locked) {
        card.disabled = false;
        on(card, 'click', function () {
          MG.audio.play('lock');
          U.modal({
            emoji: '🔒', title: MG.levelLabel(track, LV.n) + ' Terkunci',
            text: 'Selesaikan <b>' + MG.levelLabel(track, LV.n - 1) + '</b> dulu untuk membuka level ini.',
            buttons: [{ label: 'Main ' + MG.levelLabel(track, LV.n - 1), cls: 'btn-primary', onClick: function () { UI.startLevel(LV.n, track); } },
            { label: 'OK' }]
          });
        });
      } else {
        on(card, 'click', function () { UI.startLevel(LV.n, track); });
      }
      grid.appendChild(card);
    });

    var done = MG.db.getClearedCount(track);
    $('#levels-progress').style.width = (done / total * 100) + '%';
    $('#levels-progress-text').textContent = done + ' dari ' + total + ' level selesai';
  };

  /* ============================================================
   *  PEMAIN BANYAK ORANG
   * ============================================================ */

  var draftAvatar = null;
  var draftGrade = 1;

  function gradeName(g) { return 'Kelas ' + (g || 1); }

  function buildGradePicker(box, selected, onPick) {
    if (!box) return;
    box.innerHTML = '';
    for (var g = 1; g <= 6; g++) {
      (function (n) {
        var b = el('button', n === selected ? 'on' : '', String(n));
        b.title = 'Kelas ' + n;
        on(b, 'click', function () {
          $$('#' + box.id + ' button').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          MG.audio.play('tap');
          onPick(n);
        });
        box.appendChild(b);
      })(g);
    }
  }

  function buildAvatarPicker(box, selected, onPick) {
    if (!box) return;
    box.innerHTML = '';
    MG.CONFIG.AVATARS.forEach(function (a) {
      var b = el('button', a === selected ? 'on' : '', a);
      on(b, 'click', function () {
        $$('#' + box.id + ' button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        MG.audio.play('tap');
        onPick(a);
      });
      box.appendChild(b);
    });
  }

  UI.renderPlayers = function () {
    var grid = $('#player-grid');
    if (!grid) return;
    grid.innerHTML = '';

    var activeId = MG.db.activePlayerId();
    var players = MG.db.listPlayers();

    if (!players.length) {
      grid.innerHTML = '<p class="hint-text" style="text-align:center">Belum ada pemain. Tambahkan dulu di bawah.</p>';
      return;
    }

    players.forEach(function (p) {
      var s = MG.db.playerSummary(p.id);
      var card = el('button', 'pcard' + (p.id === activeId ? ' active' : ''));
      card.style.borderColor = p.id === activeId ? '' : (p.color || '');
      if (p.color) card.style.boxShadow = '0 0 0 3px ' + p.color + '33, var(--sh-md)';

      var when = 'Belum pernah main';
      if (s.lastSeen) when = 'Main ' + U.formatDate(s.lastSeen);

      card.innerHTML =
        (p.id === activeId ? '<span class="p-tag">AKTIF</span>' : '') +
        (players.length > 1 ? '<span class="p-del" title="Hapus pemain">🗑️</span>' : '') +
        '<span class="p-av">' + U.esc(p.avatar) + '</span>' +
        '<span class="p-name">' + U.esc(p.name) + '</span>' +
        '<span class="p-meta">' + gradeName(p.grade) + '</span>' +
        '<span class="p-stats">' +
        '<span>⭐ ' + s.stars + '</span>' +
        '<span>✅ ' + s.cleared + '</span>' +
        '<span>🎯 ' + Math.round(s.accuracy * 100) + '%</span>' +
        '</span>' +
        '<span class="p-meta">' + U.esc(when) + '</span>';

      card.title = p.name + ' — ' + gradeName(p.grade) + ' · ' + s.stars + ' bintang, ' +
        s.cleared + ' level selesai';

      // tombol hapus (saat ini kartu adalah <button>, jadi butuh stopPropagation)
      var del = card.querySelector('.p-del');
      if (del) {
        on(del, 'click', function (ev) {
          ev.stopPropagation();
          ev.preventDefault();
          UI.confirmDeletePlayer(p);
        });
      }

      on(card, 'click', function () {
        MG.audio.play('click');
        UI.switchPlayer(p.id);
      });

      grid.appendChild(card);
    });
  };

  UI.confirmDeletePlayer = function (p) {
    var s = MG.db.playerSummary(p.id);
    U.modal({
      emoji: '🗑️', title: 'Hapus pemain ' + p.name + '?',
      text: 'Progres <b>' + U.esc(p.name) + '</b> (' + s.stars + ' bintang, ' +
        s.cleared + ' level selesai) akan dihapus permanen dari perangkat ini. ' +
        'Pemain lain <b>tidak</b> terpengaruh.',
      buttons: [
        { label: 'Batal', cls: 'btn-ghost' },
        {
          label: 'Ya, Hapus', cls: 'btn-danger', onClick: function () {
            var ok = MG.db.deletePlayer(p.id);
            if (!ok) { U.toast('Pemain terakhir tidak bisa dihapus.', 'warn'); return; }
            MG.audio.play('lose');
            U.toast('Pemain ' + p.name + ' dihapus.');
            UI.renderPlayers();
            UI.refreshHome();
            MG.db.saveNow();
          }
        }
      ]
    });
  };

  /** Ganti pemain aktif lalu muat ulang semua layar. */
  UI.switchPlayer = function (id) {
    var p = MG.db.selectPlayer(id);
    if (!p) { U.toast('Pemain tidak ditemukan.', 'err'); return; }

    UI.applyPlayerSettings();
    UI.refreshHome();
    UI.renderPlayers();
    MG.db.publishScore(true);
    MG.db.saveNow();
    U.toast('Halo, ' + p.name + '! 👋');
    UI.show('home');
  };

  /* ---- form pemain baru ---- */
  UI.openNewPlayerForm = function () {
    var card = $('#card-new-player');
    if (!card) return;
    draftGrade = 1;
    draftAvatar = MG.CONFIG.AVATARS[Math.floor(Math.random() * MG.CONFIG.AVATARS.length)];
    $('#inp-pname').value = '';
    buildGradePicker($('#grade-picker'), 1, function (g) { draftGrade = g; });
    buildAvatarPicker($('#new-avatar-picker'), draftAvatar, function (a) { draftAvatar = a; });
    card.hidden = false;
    MG.audio.play('whoosh');
    try { $('#inp-pname').focus(); } catch (e) { }
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  UI.closeNewPlayerForm = function () {
    var card = $('#card-new-player');
    if (card) card.hidden = true;
  };

  UI.saveNewPlayer = function () {
    var input = $('#inp-pname');
    var name = input ? input.value.trim() : '';
    if (!name) {
      U.toast('Tuliskan nama pemain dulu ya.', 'warn');
      if (input) input.focus();
      return;
    }
    var p = MG.db.createPlayer(name, draftAvatar || '🙂', draftGrade);
    UI.closeNewPlayerForm();
    UI.applyPlayerSettings();
    MG.audio.play('badge');
    U.toast('Pemain baru siap main! 🎉');
    UI.renderPlayers();
    UI.refreshHome();
    MG.db.saveNow();
    UI.show('home');
    return p;
  };

  /* ============================================================
   *  PAPAN PERINGKAT
   * ============================================================ */

  var lbTab = 'local';
  var lbRows = [];
  var lbLoading = false;

  UI.setLeaderboardTab = function (tab) {
    lbTab = tab;
    $$('#lb-tabs button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-tab') === tab);
    });
    UI.renderLeaderboard();
  };

  UI.renderLeaderboard = function () {
    var podium = $('#lb-podium');
    var tbody = $('#lb-tbody');
    var note = $('#lb-note');
    var sub = $('#lb-sub');
    if (!podium || !tbody) return;

    var me = MG.db.getPlayer();

    if (lbTab === 'local') {
      if (sub) sub.textContent = 'Semua pemain di perangkat ini (' +
        MG.db.playerCount() + ' orang)';
      lbRows = MG.db.getLocalLeaderboard(20);
      lbLoading = false;
      if (note) {
        note.textContent = 'Peringkat dihitung dari bintang, level yang selesai, lalu ketelitian. ' +
          'Data ini tersimpan di perangkat ini, jadi tetap ada tanpa internet.';
      }
      drawLeaderboard(podium, tbody, lbRows);
      return;
    }

    // ---- tab online ----
    if (!MG.db.onlineAvailable()) {
      if (sub) sub.textContent = 'Peringkat dari server';
      lbRows = [];
      drawLeaderboard(podium, tbody, []);
      if (note) {
        note.innerHTML = 'Papan peringkat online butuh server. Jalankan <code>node server.js</code> ' +
          'atau klik 2x <code>Main Game.command</code>, lalu buka lewat alamat yang muncul di browser.';
      }
      return;
    }

    if (lbLoading) return;
    lbLoading = true;
    drawLeaderboard(podium, tbody, lbRows);
    if (sub) sub.textContent = 'Memuat peringkat dari server…';

    // kirim skor kita dulu supaya peringkat di server selalu ter-update
    MG.db.publishScore(true).then(function () {
      return MG.db.fetchLeaderboard(20);
    }).then(function (res) {
      lbLoading = false;
      if (UI.current() !== 'leaderboard') return;
      if (!res.ok) {
        if (sub) sub.textContent = 'Peringkat dari server';
        lbRows = [];
        drawLeaderboard(podium, tbody, []);
        if (note) note.textContent = 'Server tidak bisa dihubungi. Cek apakah server.js masih berjalan.';
        return;
      }
      lbRows = res.rows.map(function (r) {
        return Object.assign({}, r, { isMe: !!(r.uid && me && r.uid === me.uid) });
      });
      if (sub) {
        sub.textContent = res.rows.length
          ? res.rows.length + ' pemain terdaftar'
          : 'Belum ada pemain di server';
      }
      if (note) {
        var txt = 'Peringkat ini dibagikan ke semua perangkat yang memakai server yang sama. ';
        if (res.myRank) txt += 'Posisimu: #' + res.myRank + ' dari ' + (res.total || res.rows.length) + '.';
        note.textContent = txt;
      }
      drawLeaderboard(podium, tbody, lbRows);
    });
  };

  function drawLeaderboard(podium, tbody, rows) {
    // podium untuk 3 teratas
    podium.innerHTML = '';
    var top = rows.slice(0, 3);
    var order = [1, 0, 2];    // tampilkan nominee ke-2, ke-1, ke-3
    order.forEach(function (idx) {
      var r = top[idx];
      if (!r) return;
      var medal = ['🥇', '🥈', '🥉'][idx];
      var pod = el('div', 'lb-pod p' + (idx + 1),
        '<span class="lb-medal">' + medal + '</span>' +
        '<span class="lb-av">' + U.esc(r.avatar || '🙂') + '</span>' +
        '<span class="lb-name">' + U.esc(r.name) + '</span>' +
        '<span class="lb-stars">⭐ ' + r.stars + '</span>' +
        '<span class="lb-points">' + U.thousand(r.points != null ? r.points : 0) + ' poin</span>');
      pod.title = 'Peringkat ' + (idx + 1) + ': ' + r.name;
      podium.appendChild(pod);
    });

    // tabel lengkap
    tbody.innerHTML = '';
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#6B6490">' +
        'Belum ada data peringkat. Mainkan satu level dulu ya! 🎮</td></tr>';
      return;
    }

    var meUid = (MG.db.getPlayer() || {}).uid;
    rows.forEach(function (r, i) {
      var isMe = !!(meUid && r.uid && r.uid === meUid);
      var tr = el('tr', isMe ? 'me' : '');
      tr.innerHTML =
        '<td>' + (r.rank != null ? r.rank : i + 1) + '</td>' +
        '<td><span class="lb-who"><span>' + U.esc(r.avatar || '🙂') + '</span>' +
        '<span>' + U.esc(r.name) + (isMe ? ' (kamu)' : '') + '</span></span></td>' +
        '<td>' + r.stars + '</td>' +
        '<td>' + r.cleared + '/' + (MG.CONFIG.LEVELS_COUNT + MG.CONFIG.TK_LEVELS_COUNT) + '</td>' +
        '<td>' + Math.round((r.accuracy || 0) * 100) + '%</td>' +
        '<td>' + U.thousand(r.points != null ? r.points : 0) + '</td>';
      tbody.appendChild(tr);
    });
  }

  /* ============================================================
   *  MULAI LEVEL
   * ============================================================ */
  UI.startLevel = function (n, track) {
    track = (track === 'tk') ? 'tk' : 'sd';
    // Samakan tab jalur dengan level yang sedang dibuka.
    if (levelTrack !== track) {
      levelTrack = track;
      $$('#track-tabs button').forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-track') === track);
      });
    }
    var s = MG.game.start(n, track);
    var LV = s.levelInfo;

    $('#play-level-name').innerHTML = '<span style="font-size:20px">' + LV.emoji + '</span> ' +
      MG.levelLabel(track, n) + ' · ' + LV.title;
    $('#play-score').textContent = '0';
    $('#btn-nextlevel').style.display = '';
    $('#btn-nextlevel').disabled = (n >= MG.levelCount(track));

    MG.audio.play('whoosh');
    UI.show('play');
    UI.nextQuestion();
  };

  /* ============================================================
   *  SOAL BERIKUTNYA
   * ============================================================ */
  UI.nextQuestion = function () {
    var st = MG.game.state();
    var q;

    if (st.index >= st.questions.length) { UI.finishGame(); return; }
    q = MG.game.beginQuestion();

    if (!q) { UI.finishGame(); return; }

    var total = MG.game.state().questions.length;
    $('#play-qnum').textContent = (st.index + 1) + '/' + total;
    $('#play-progress').style.width = (st.index / total * 100) + '%';
    UI.renderHearts();

    // kartu soal
    var card = $('#q-card');
    card.style.animation = 'none';
    void card.offsetWidth;           // paksa reflow agar animasi ulang
    card.style.animation = '';

    $('#q-art').innerHTML = MG.art.render(q.art);
    $('#q-text').innerHTML = q.text;
    $('#q-topic').textContent = q.topicName || '';

    // pilihan jawaban
    var box = $('#options');
    box.innerHTML = '';
    q.answers.forEach(function (a, i) {
      var b = el('button', 'opt', U.esc(a));
      b.style.animationDelay = (i * 0.06) + 's';
      b.setAttribute('data-key', 'ABCD'[i]);
      b.setAttribute('aria-label', 'Pilihan ' + 'ABCD'[i]);
      on(b, 'click', function () { UI.pickAnswer(i); });
      box.appendChild(b);
    });

    $('#btn-hint').disabled = !q.hint;
    $('#btn-skip').disabled = false;
    UI.startTimer();

    // sapaan dari maskot untuk soal pertama
    if (st.index === 0) {
      UI.showBubble('Ayo, soal pertama! Pilih jawaban yang benar 💪', 3500);
    }
  };

  /* ============================================================
   *  TIMER
   * ============================================================ */
  var timerRAF = null, timerStart = 0, timerLimit = 0, lastTickSec = -1;

  UI.startTimer = function () {
    UI.stopTimer();
    timerLimit = MG.game.timeForQuestion() * 1000;
    timerStart = performance.now();
    lastTickSec = -1;

    var wrap = $('#timer'), fill = $('#timer-fill'), label = $('#timer-label');
    wrap.classList.remove('warn', 'danger');

    // Tanpa batas waktu: tampilkan penanda damai, tanpa hitung mundur.
    if (timerLimit <= 0) {
      wrap.classList.add('unlimited');
      fill.style.width = '100%';
      label.textContent = '∞';
      return;
    }
    wrap.classList.remove('unlimited');

    function frame(now) {
      var left = Math.max(0, timerLimit - (now - timerStart));
      var pct = (left / timerLimit) * 100;
      fill.style.width = pct + '%';

      var secs = Math.ceil(left / 1000);
      if (secs !== lastTickSec) {
        lastTickSec = secs;
        label.textContent = secs + 's';
        if (secs <= 5 && secs > 0) MG.audio.play('tick');
        if (secs <= 3) wrap.classList.add('danger');
        else if (secs <= 8) wrap.classList.add('warn');
      }

      if (left <= 0) {
        UI.stopTimer();
        UI.timeUp();
        return;
      }
      timerRAF = requestAnimationFrame(frame);
    }
    timerRAF = requestAnimationFrame(frame);
  };

  UI.stopTimer = function () {
    if (timerRAF) cancelAnimationFrame(timerRAF);
    timerRAF = null;
  };

  /* ============================================================
   *  MENJAWAB
   * ============================================================ */
  UI.pickAnswer = function (i) {
    var st = MG.game.state();
    if (st.finished || $('#feedback').classList.contains('show')) return;
    if (st.answered > st.index) return;      // sudah dijawab soal ini

    UI.stopTimer();
    MG.audio.play('click');

    var q = st.questions[st.index];
    var res = MG.game.answer(i, false);
    var opts = $$('#options .opt');

    opts.forEach(function (b, k) { b.disabled = true; });
    opts[i].classList.add(res.correct ? 'correct' : 'wrong');
    if (!res.correct) opts[res.correctIndex].classList.add('correct');
    opts.forEach(function (b, k) { if (k !== i && k !== res.correctIndex) b.classList.add('dim'); });

    if (res.correct) {
      MG.audio.play('correct');
      if (res.combo >= 2) { MG.audio.play('combo', res.combo); UI.showCombo(res.combo); }
      FX.confettiSmall();
    } else {
      MG.audio.play('wrong');
      FX.shake();
      UI.renderHearts(res.hearts);
    }

    UI.showFeedback(res, q);
  };

  UI.timeUp = function () {
    var st = MG.game.state();
    if (st.finished || $('#feedback').classList.contains('show')) return;
    if (st.answered > st.index) return;

    MG.audio.play('timeout');
    var res = MG.game.answer(null, true);
    var opts = $$('#options .opt');
    opts.forEach(function (b) { b.disabled = true; b.classList.add('dim'); });
    opts[res.correctIndex].classList.remove('dim');
    opts[res.correctIndex].classList.add('correct');
    UI.renderHearts(res.hearts);
    FX.shake();

    var q = st.questions[st.index];
    UI.showFeedback(res, q, true);
  };

  UI.showCombo = function (combo) {
    var d = el('div', 'combo-badge', '🔥 ' + combo + '× beruntun!');
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 1600);
  };

  UI.renderHearts = function (override) {
    var st = MG.game.state();
    var h = override == null ? st.hearts : override;
    var box = $('#hearts');
    box.innerHTML = '';
    for (var i = 0; i < MG.CONFIG.START_HEARTS; i++) {
      box.appendChild(el('span', 'heart' + (i < h ? '' : ' lost'), i < h ? '❤️' : '🤍'));
    }
  };

  /* ============================================================
   *  UMPAN BALIK
   * ============================================================ */
  UI.showFeedback = function (res, q, timedOut) {
    var fb = $('#feedback');
    var title = $('#feedback-title');
    var sub = $('#feedback-sub');
    var emoji = $('#feedback-emoji');
    var next = $('#btn-next');

    if (res.correct) {
      var fast = res.timeMs <= 5000;
      emoji.textContent = res.combo >= 3 ? '🔥' : (fast ? '⚡' : '🎉');
      title.textContent = res.combo >= 3 ? 'Hebat! ' + res.combo + '× beruntun!' : 'Benar! 🎊';
      title.className = 'feedback-title good';
      var speedTxt = res.timeMs <= 3000 ? 'Kilat! ' :
        res.timeMs <= 7000 ? 'Cepat! ' :
          res.timeMs <= 12000 ? '' : 'Pelan, tapi benar. ';
      sub.innerHTML = speedTxt + (res.combo > 1 ? 'Bonus beruntun ' + res.combo + '×!' : '') +
        '<br><span class="pt">+' + res.gained + ' poin</span>';
    } else {
      emoji.textContent = timedOut ? '⏰' : '🤔';
      title.textContent = timedOut ? 'Waktu habis!' : 'Hampir benar!';
      title.className = 'feedback-title bad';
      sub.innerHTML = 'Jawaban yang benar: <b>' + U.esc(q.answers[res.correctIndex]) + '</b>' +
        (q.hint ? '<br><small>' + q.hint + '</small>' : '');
    }

    next.textContent = res.finished ? 'Lihat Hasil ➜' : 'Lanjut ➜';
    fb.classList.add('show');
  };

  UI.dismissFeedback = function () {
    $('#feedback').classList.remove('show');
    var st = MG.game.state();
    // hati habis -> permainan selesai lebih cepat
    if (st.hearts <= 0) { UI.finishGame(); return; }
    // majukan penanda soal; null berarti sudah tidak ada soal tersisa
    if (!MG.game.nextQuestion()) { UI.finishGame(); return; }
    UI.nextQuestion();
  };

  /* ============================================================
   *  HASIL
   * ============================================================ */
  UI.finishGame = function () {
    UI.stopTimer();
    $('#feedback').classList.remove('show');

    var res = MG.game.summary();
    var rec = MG.db.recordAttempt(res);
    var earned = MG.game.checkBadges(res);

    var track = res.track === 'tk' ? 'tk' : 'sd';
    var passed = res.cleared;

    // tampilkan
    $('#result-mascot').innerHTML = MG.art.mascot(passed ? 'cheer' : 'sad');
    $('#result-title').textContent = passed
      ? (res.stars === 3 ? 'Sempurna, ' + res.levelInfo.title + '!' : MG.levelLabel(track, res.level) + ' Tuntas!')
      : MG.levelLabel(track, res.level) + ' Belum Tuntas';
    $('#result-sub').textContent = passed
      ? res.starsLabel + ' — lanjut ke level berikutnya, ' + firstName() + '!'
      : 'Butuh minimal 60% jawaban benar. Ayo coba lagi!';

    var starsBox = $('#result-stars');
    starsBox.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      starsBox.innerHTML += MG.art.star(i < res.stars, 54).replace('class="art-svg"', 'class="art-svg' + (i < res.stars ? '' : ' off') + '"');
    }

    $('#result-correct').textContent = res.correct + '/' + res.total;
    $('#result-acc').textContent = Math.round(res.accuracy * 100) + '%';
    $('#result-time').textContent = Math.round(res.durationMs / 1000) + 'd';
    $('#result-score').textContent = res.score;

    // rekor
    var p = MG.db.getLevelProgress(res.level, track);
    var bestMsg = '';
    if (rec.newStars) bestMsg = '⭐ Rekor baru! Kamu dapat ' + res.stars + ' bintang di ' + MG.levelLabel(track, res.level) + '.';
    else if (rec.newBest) bestMsg = '🏅 Skor tertinggi baru: ' + res.score + ' poin!';
    else if (p) bestMsg = 'Rekor terbaikmu: ' + p.best_stars + ' bintang · ' + p.best_score + ' poin.';
    $('#result-best').textContent = bestMsg;

    // lencana baru
    var bx = $('#result-badges');
    bx.innerHTML = '';
    earned.forEach(function (b, i) {
      var n = el('div', 'nbadge', '<i>' + b.emoji + '</i> ' + b.name);
      n.style.animationDelay = (0.15 + i * 0.1) + 's';
      bx.appendChild(n);
    });

    // tombol level berikutnya
    var nextLv = res.level + 1;
    var nextBtn = $('#btn-nextlevel');
    if (!passed || nextLv > MG.levelCount(track)) {
      nextBtn.style.display = 'none';
    } else {
      nextBtn.style.display = '';
      nextBtn.innerHTML = '➡️ ' + MG.levelLabel(track, nextLv) + ': ' + MG.levelOf(track, nextLv).title;
      nextBtn.disabled = false;
    }

    if (passed) {
      MG.audio.play(res.stars === 3 ? 'win' : 'levelUp');
      FX.confettiBig();
    } else {
      MG.audio.play('lose');
    }
    if (earned.length) setTimeout(function () { MG.audio.play('badge'); }, 600);

    UI.show('result');
    MG.db.saveNow();
    lbRows = [];                 // peringkat lokal perlu dihitung ulang
    MG.db.publishScore(true);    // kirim ke papan peringkat server
  };

  function firstName() {
    var p = MG.db.getPlayer();
    return p ? p.name.split(' ')[0] : 'kamu';
  }

  /* ============================================================
   *  STATISTIK
   * ============================================================ */
  UI.renderStats = function () {
    var p = MG.db.getPlayer();
    $('#stats-player').textContent = 'Pemain: ' + (p ? p.name + ' ' + p.avatar : '-');

    var progressSd = MG.db.getAllProgress('sd');
    var progressTk = MG.db.getAllProgress('tk');
    var tbody = $('#stats-tbody');
    tbody.innerHTML = '';

    function addRow(LV, track, pr, label, emoji) {
      var stars = pr ? '⭐'.repeat(pr.best_stars) + '☆'.repeat(3 - pr.best_stars) : '—';
      var tr = el('tr');
      tr.innerHTML =
        '<td>' + label + ' ' + emoji + '</td>' +
        '<td>' + LV.title + '</td>' +
        '<td class="stars-cell">' + stars + '</td>' +
        '<td>' + (pr ? pr.best_correct + '/' + MG.CONFIG.QUESTIONS_PER_LEVEL : '—') + '</td>' +
        '<td>' + (pr ? pr.plays : 0) + 'x</td>' +
        '<td>' + (pr && pr.last_played_at ? U.formatDate(pr.last_played_at) : '—') + '</td>';
      tbody.appendChild(tr);
    }

    MG.CONFIG.TK_LEVELS.forEach(function (LV) {
      addRow(LV, 'tk', progressTk[LV.n], 'TK ' + LV.n, LV.emoji);
    });
    MG.CONFIG.LEVELS.forEach(function (LV) {
      addRow(LV, 'sd', progressSd[LV.n], 'Lv ' + LV.n, LV.emoji);
    });

    // lencana
    var owned = MG.db.getBadges();
    var bg = $('#badge-grid');
    bg.innerHTML = '';
    MG.BADGES.forEach(function (b) {
      var got = !!owned[b.code];
      var cell = el('div', 'badge-cell' + (got ? ' got' : ''),
        '<span class="bico">' + b.emoji + '</span><span class="bname">' + b.name + '</span>');
      cell.title = got ? (b.desc + ' — didapat ' + U.formatDate(owned[b.code])) : ('Belum didapat: ' + b.desc);
      bg.appendChild(cell);
    });

    // riwayat
    var hist = MG.db.getHistory(20);
    var hb = $('#history-tbody');
    hb.innerHTML = '';
    if (!hist.length) {
      hb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#6B6490">Belum ada permainan. Ayo mulai! 🎮</td></tr>';
    } else {
      hist.forEach(function (h, i) {
        var hTrack = h.track === 'tk' ? 'tk' : 'sd';
        var tr = el('tr');
        tr.innerHTML =
          '<td>' + (i + 1) + '</td>' +
          '<td>' + MG.levelLabel(hTrack, h.level) + ' ' + MG.levelOf(hTrack, h.level).emoji + '</td>' +
          '<td>' + (h.cleared ? '✅ Lulus' : '💪 Belum') + '</td>' +
          '<td>' + h.correct + '/' + h.total + '</td>' +
          '<td>' + U.formatDuration(h.duration_ms) + '</td>' +
          '<td>' + h.score + '</td>' +
          '<td>' + U.formatDate(h.played_at) + '</td>';
        hb.appendChild(tr);
      });
    }
  };

  /* ============================================================
   *  PENGATURAN
   * ============================================================ */

  /** Muat pengaturan milik pemain ke MG.game.settings. */
  UI.applyPlayerSettings = function () {
    var s = MG.game.settings;
    var p = MG.db.getPlayer();

    if (p) {
      s.playerName = p.name;
      s.avatar = p.avatar;
      s.grade = p.grade || 1;
    }

    // waktu & kesulitan: nilai pemain dulu, baru nilai bawaan perangkat
    // 0 berarti tanpa batas waktu.
    var t = parseInt(MG.db.getPlayerSetting('time_limit', MG.db.getSetting('time_limit', '20')), 10);
    s.timeLimit = (t === 0 || (t >= 5 && t <= 180)) ? t : 20;

    var d = MG.db.getPlayerSetting('difficulty', MG.db.getSetting('difficulty', 'sedang'));
    s.difficulty = MG.CONFIG.DIFFICULTY[d] ? d : 'sedang';

    s.sfx = MG.db.getSetting('sfx', '1') !== '0';
    s.music = MG.db.getSetting('music', '1') !== '0';
    return p;
  };

  var settingsGrade = 1;

  /** Perbarui label waktu pada layar pengaturan. */
  function paintTimeLabel() {
    var s = MG.game.settings;
    var unlimited = $('#inp-time-unlimited').checked;
    $('#inp-time').disabled = unlimited;
    $('#time-val').textContent = unlimited ? 'Tanpa batas ∞' : (s.timeLimit + ' detik');
  }

  UI.fillSettings = function () {
    var s = MG.game.settings;
    var p = MG.db.getPlayer();
    var unlimited = MG.game.isUnlimited();
    $('#inp-name').value = p ? p.name : s.playerName;
    $('#inp-time').value = unlimited ? 20 : s.timeLimit;
    $('#inp-time-unlimited').checked = unlimited;
    paintTimeLabel();
    $('#inp-sfx').checked = !!s.sfx;
    $('#inp-music').checked = !!s.music;
    $$('#seg-difficulty button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-diff') === s.difficulty);
    });
    settingsGrade = p ? (p.grade || 1) : (s.grade || 1);
    buildGradePicker($('#grade-picker-settings'), settingsGrade, function (g) { settingsGrade = g; });
    buildAvatarPicker($('#avatar-picker'), p ? p.avatar : s.avatar, function (a) {
      var nm = $('#inp-name').value.trim() || 'Pemain';
      MG.db.updatePlayer(nm, a);
      MG.game.settings.avatar = a;
      UI.refreshHome();
    });
  };

  UI.saveSettings = function () {
    var s = MG.game.settings;
    var nm = $('#inp-name').value.trim() || 'Pemain';
    var avBtn = $('#avatar-picker button.on');
    var av = (avBtn && avBtn.textContent) || s.avatar || '🙂';
    var unlimited = $('#inp-time-unlimited').checked;
    var t = unlimited ? 0 : (parseInt($('#inp-time').value, 10) || 20);

    s.playerName = nm;
    s.avatar = av;
    s.timeLimit = t;
    s.sfx = $('#inp-sfx').checked;
    s.music = $('#inp-music').checked;

    var onBtn = $('#seg-difficulty button.on');
    s.difficulty = (onBtn && onBtn.getAttribute('data-diff')) || 'sedang';

    MG.db.updatePlayer(nm, av, settingsGrade);

    // Waktu & kesulitan disimpan untuk pemain ini (dan juga jadi nilai bawaan
    // pemain baru di perangkat ini). Suara & musik berlaku untuk seluruh perangkat.
    MG.db.setPlayerSetting('time_limit', t);
    MG.db.setPlayerSetting('difficulty', s.difficulty);
    MG.db.setSetting('time_limit', t);
    MG.db.setSetting('difficulty', s.difficulty);
    MG.db.setSetting('sfx', s.sfx ? 1 : 0);
    MG.db.setSetting('music', s.music ? 1 : 0);

    MG.audio.setSfx(s.sfx);
    MG.audio.setMusic(s.music);
    MG.db.publishScore(true);
    UI.refreshHome();
  };

  /* ============================================================
   *  EFEK VISUAL (kanvas)
   * ============================================================ */
  var FX = UI.fx = {};
  var canvas = null, ctx = null, particles = [], rafId = null;

  FX.init = function () {
    canvas = $('#fx-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    FX.resize();
    on(global, 'resize', FX.resize);
  };

  FX.resize = function () {
    if (!canvas) return;
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    canvas.width = global.innerWidth * dpr;
    canvas.height = global.innerHeight * dpr;
    canvas.style.width = global.innerWidth + 'px';
    canvas.style.height = global.innerHeight + 'px';
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  var COLORS = ['#FF5C8A', '#FFC93C', '#4ECDC4', '#7C6BFF', '#35A7FF', '#3FBF6F', '#FF7B4D'];

  function spawnConfetti(count, originY, spread) {
    for (var i = 0; i < count; i++) {
      particles.push({
        x: global.innerWidth * (0.2 + Math.random() * 0.6),
        y: originY == null ? -20 - Math.random() * 120 : originY,
        vx: (Math.random() - 0.5) * (spread || 8),
        vy: 2.5 + Math.random() * 5.5,
        w: 7 + Math.random() * 7,
        h: 10 + Math.random() * 12,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 150
      });
    }
    startLoop();
  }

  FX.confettiSmall = function () { spawnConfetti(34, global.innerHeight * 0.32, 12); };
  FX.confettiBig = function () { spawnConfetti(130, -20, 10); };

  function startLoop() {
    if (rafId) return;
    rafId = requestAnimationFrame(loop);
  }

  function loop() {
    if (!ctx) { rafId = null; return; }
    ctx.clearRect(0, 0, global.innerWidth, global.innerHeight);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.14;          // gravitasi
      p.vx *= 0.995;
      p.rot += p.vr;
      p.life--;

      if (p.life <= 0 || p.y > global.innerHeight + 40) { particles.splice(i, 1); continue; }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (particles.length) rafId = requestAnimationFrame(loop);
    else { rafId = null; ctx.clearRect(0, 0, global.innerWidth, global.innerHeight); }
  }

  FX.shake = function () {
    var el = $('#q-card');
    if (!el) return;
    el.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-9px)' },
      { transform: 'translateX(8px)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(0)' }
    ], { duration: 340, easing: 'ease-in-out' });
  };

  /* ============================================================
   *  PASANG SEMUA ACARA
   * ============================================================ */
  UI.bind = function () {
    /* navigasi */
    on($('#btn-home'), 'click', function () { MG.audio.play('tap'); UI.show('home'); UI.refreshHome(); });
    on($('#btn-play'), 'click', function () {
      MG.audio.play('click');
      var n = MG.db.getUnlockedLevel();
      // cari level pertama yang belum selesai-perfect untuk dilanjutkan
      var progress = MG.db.getAllProgress();
      for (var lv = 1; lv <= n; lv++) {
        var pr = progress[lv];
        if (!pr || !pr.cleared || pr.best_stars < 3) { n = lv; break; }
      }
      UI.startLevel(n);
    });
    on($('#btn-levels'), 'click', function () { MG.audio.play('tap'); UI.show('levels'); });
    on($('#btn-play-tk'), 'click', function () {
      MG.audio.play('click');
      levelTrack = 'tk';
      var n = MG.db.getUnlockedLevel('tk');
      var progress = MG.db.getAllProgress('tk');
      for (var lv = 1; lv <= n; lv++) {
        var pr = progress[lv];
        if (!pr || !pr.cleared || pr.best_stars < 3) { n = lv; break; }
      }
      UI.startLevel(n, 'tk');
    });
    on($('#btn-stats'), 'click', function () { MG.audio.play('tap'); UI.show('stats'); });
    on($('#btn-help'), 'click', function () { MG.audio.play('tap'); UI.show('help'); });
    on($('#btn-leaderboard'), 'click', function () { MG.audio.play('tap'); lbTab = 'local'; lbRows = []; UI.setLeaderboardTab('local'); UI.show('leaderboard'); });
    on($('#btn-help-close'), 'click', function () { MG.audio.play('tap'); UI.back(); });
    on($('#btn-stats-close'), 'click', function () { MG.audio.play('tap'); UI.back(); });
    on($('#btn-lb-close'), 'click', function () { MG.audio.play('tap'); UI.back(); });
    on($('#btn-settings'), 'click', function () { MG.audio.play('tap'); UI.show('settings'); });

    /* ganti / tambah pemain */
    on($('#chip-player'), 'click', function () { MG.audio.play('tap'); UI.show('players'); });
    on($('#btn-switch-player'), 'click', function () { MG.audio.play('tap'); UI.show('players'); });
    on($('#btn-manage-players'), 'click', function () { MG.audio.play('tap'); UI.show('players'); });
    on($('#btn-players-close'), 'click', function () { MG.audio.play('tap'); UI.back(); });
    on($('#btn-add-player'), 'click', function () { UI.openNewPlayerForm(); });
    on($('#btn-cancel-player'), 'click', function () { MG.audio.play('tap'); UI.closeNewPlayerForm(); });
    on($('#btn-save-player'), 'click', function () { UI.saveNewPlayer(); });
    on($('#inp-pname'), 'keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); UI.saveNewPlayer(); }
    });
    on($('#inp-pname'), 'keydown', function (e) {
      if (e.key === 'Escape') UI.closeNewPlayerForm();
    });

    /* tab papan peringkat */
    $$('#lb-tabs button').forEach(function (b) {
      on(b, 'click', function () {
        MG.audio.play('tap');
        lbRows = [];
        UI.setLeaderboardTab(b.getAttribute('data-tab'));
      });
    });

    /* tombol suara */
    on($('#btn-sound'), 'click', function () {
      var s = MG.game.settings;
      s.sfx = !s.sfx;
      MG.audio.setSfx(s.sfx);
      MG.db.setSetting('sfx', s.sfx ? 1 : 0);
      this.classList.toggle('off', !s.sfx);
      this.querySelector('.ico').textContent = s.sfx ? '🔊' : '🔇';
    });

    /* permainan */
    on($('#btn-next'), 'click', function () { MG.audio.play('click'); UI.dismissFeedback(); });
    on($('#btn-hint'), 'click', function () {
      var st = MG.game.state();
      if (!st) return;
      var q = st.questions[st.index];
      if (!q || !q.hint) return;
      MG.game.useHint();
      MG.audio.play('tap');
      U.toast('💡 ' + q.hint, '');
      // tampilkan petunjuk di kartu soal
      var t = $('#q-topic');
      t.textContent = '💡 ' + q.hint;
      this.disabled = true;
    });
    on($('#btn-skip'), 'click', function () {
      MG.audio.play('tap');
      UI.timeUp();
    });
    on($('#btn-quit'), 'click', function () {
      MG.audio.play('tap');
      U.modal({
        emoji: '🤔', title: 'Keluar dari level?',
        text: 'Progres level ini yang sudah berjalan <b>tidak akan disimpan</b>.',
        buttons: [
          { label: 'Lanjut Main', cls: 'btn-primary' },
          {
            label: 'Keluar', cls: 'btn-danger', onClick: function () {
              UI.stopTimer();
              UI.show('levels');
            }
          }
        ]
      });
    });

    /* hasil */
    on($('#btn-retry'), 'click', function () {
      MG.audio.play('click');
      var st = MG.game.state();
      UI.startLevel(st.level, st.track);
    });
    on($('#btn-nextlevel'), 'click', function () {
      MG.audio.play('click');
      var st = MG.game.state();
      UI.startLevel(st.level + 1, st.track);
    });
    on($('#btn-tomap'), 'click', function () { MG.audio.play('tap'); UI.show('levels'); });

    /* tab jalur level (SD / TK) */
    $$('#track-tabs button').forEach(function (b) {
      on(b, 'click', function () {
        MG.audio.play('tap');
        UI.setLevelTrack(b.getAttribute('data-track'));
      });
    });

    /* pengaturan */
    on($('#inp-time'), 'input', function () {
      MG.game.settings.timeLimit = parseInt(this.value, 10) || 20;
      paintTimeLabel();
    });
    on($('#inp-time-unlimited'), 'change', function () {
      MG.audio.play('tap');
      MG.game.settings.timeLimit = this.checked ? 0 : (parseInt($('#inp-time').value, 10) || 20);
      paintTimeLabel();
    });
    on($('#inp-sfx'), 'change', function () {
      MG.audio.setSfx(this.checked);
      if (this.checked) MG.audio.play('tap');
    });
    on($('#inp-music'), 'change', function () { MG.audio.setMusic(this.checked); });
    $$('#seg-difficulty button').forEach(function (b) {
      on(b, 'click', function () {
        $$('#seg-difficulty button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        MG.audio.play('tap');
      });
    });
    on($('#btn-settings-close'), 'click', function () {
      UI.saveSettings();
      MG.audio.play('click');
      U.toast('Pengaturan disimpan ✅');
      UI.back();
    });
    on($('#btn-export'), 'click', function () { UI.exportData(); });
    on($('#btn-import'), 'click', function () { $('#file-import').click(); });
    on($('#file-import'), 'change', function () { UI.importData(this.files[0]); });
    on($('#btn-reset'), 'click', function () {
      var p = MG.db.getPlayer();
      U.modal({
        emoji: '🗑️', title: 'Hapus progres ' + (p ? p.name : 'pemain ini') + '?',
        text: 'Progres, skor, bintang, dan lencana milik <b>' +
          U.esc(p ? p.name : 'pemain ini') + '</b> akan dihapus permanen. ' +
          'Pemain lain di perangkat ini <b>tidak</b> terpengaruh. ' +
          'Tindakan ini tidak bisa dibatalkan.',
        buttons: [
          { label: 'Batal', cls: 'btn-ghost' },
          {
            label: 'Ya, Hapus', cls: 'btn-danger', onClick: function () {
              MG.db.reset().then(function () {
                U.toast('Progres ' + (p ? p.name : 'pemain ini') + ' telah dihapus.', 'warn');
                lbRows = [];
                UI.refreshHome();
                UI.show('home');
              });
            }
          }
        ]
      });
    });
    on($('#btn-reset-all'), 'click', function () {
      U.modal({
        emoji: '💣', title: 'Hapus SEMUA pemain?',
        text: 'Seluruh pemain dan progresnya akan dihapus permanen dari perangkat ini, ' +
          'termasuk papan peringkat di server. <b>Tindakan ini tidak bisa dibatalkan.</b>',
        buttons: [
          { label: 'Batal', cls: 'btn-ghost' },
          {
            label: 'Ya, Hapus Semua', cls: 'btn-danger', onClick: function () {
              MG.db.reset(true).then(function () {
                U.toast('Semua data telah dihapus.', 'warn');
                lbRows = [];
                UI.refreshHome();
                UI.show('home');
              });
            }
          }
        ]
      });
    });

    /* pintasan keyboard: A/B/C/D atau 1-4 untuk menjawab */
    on(document, 'keydown', function (e) {
      if (UI.current() !== 'play') return;
      if ($('#feedback').classList.contains('show')) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); UI.dismissFeedback(); }
        return;
      }
      var k = e.key.toUpperCase();
      var idx = 'ABCD'.indexOf(k);
      if (idx >= 0 && idx < 4) { UI.pickAnswer(idx); return; }
      if (['1', '2', '3', '4'].indexOf(e.key) >= 0) { UI.pickAnswer(+e.key - 1); return; }
      if (e.key === 'h' || e.key === 'H') $('#btn-hint').click();
    });
  };

  UI.back = function () {
    UI.show('home');
    UI.refreshHome();
  };

  /* ---------- ekspor / impor ---------- */
  UI.exportData = function () {
    var b64 = MG.db.exportBase64();
    if (!b64) { U.toast('Belum ada data untuk diekspor.', 'warn'); return; }
    var payload = JSON.stringify({
      app: 'matematika-ajaib',
      version: 1,
      exported_at: U.now(),
      db: b64
    });
    var blob = new Blob([payload], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'progres-matematika-ajaib-' + U.today() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    U.toast('Progres berhasil diekspor 📥');
  };

  UI.importData = function (file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try { data = JSON.parse(String(reader.result)); }
      catch (e) { U.toast('File tidak bisa dibaca.', 'err'); return; }

      if (!data || data.app !== 'matematika-ajaib' || !data.db) {
        U.toast('Itu bukan file progres game ini.', 'err');
        return;
      }
      U.modal({
        emoji: '📥', title: 'Impor progres?',
        text: 'Progres yang ada sekarang akan <b>diganti</b> dengan isi file.',
        buttons: [
          { label: 'Batal', cls: 'btn-ghost' },
          {
            label: 'Ya, Impor', cls: 'btn-primary', onClick: function () {
              MG.db.importBase64(data.db).then(function () {
                U.toast('Progres berhasil diimpor! 🎉');
                UI.refreshHome();
                UI.show('home');
              }, function (err) {
                U.toast(err.message || 'Gagal mengimpor.', 'err');
              });
            }
          }
        ]
      });
    };
    reader.readAsText(file);
  };

})(window);
