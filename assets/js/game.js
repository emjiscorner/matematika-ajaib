/* ============================================================
 *  game.js  —  Mesin permainan: level, soal, skor, waktu, hati, lencana
 *  Tidak menyentuh DOM langsung (itu urusan ui.js).
 * ============================================================ */
(function (global) {
  'use strict';

  var MG = global.MG = global.MG || {};
  var U = MG.utils;
  var Game = MG.game = {};

  /* ============================================================
   *  PENGATURAN PEMAIN (diisi oleh main.js dari database)
   * ============================================================ */
  var settings = {
    playerName: 'Pemain',
    avatar: '🙂',
    timeLimit: 20,        // detik per soal (0 = tanpa batas)
    difficulty: 'sedang',
    sfx: true,
    music: true
  };
  Game.settings = settings;

  /** Waktu tanpa batas? (timeLimit 0 atau kurang) */
  Game.isUnlimited = function (v) {
    var t = v == null ? settings.timeLimit : v;
    return !(t > 0);
  };

  /* ============================================================
   *  STATUS
   * ============================================================ */
  var state = null;

  Game.state = function () { return state; };

  /* ============================================================
   *  MEMBUAT DAFTAR SOAL UNTUK SEBUAH LEVEL
   * ============================================================ */

  /**
   * Bangun 10 soal acak untuk sebuah level.
   * Algoritma: pilih topik secara bergiliran dari daftar topik level agar
   * semua topik muncul, lalu isi sisanya acak; dan avoid duplikat soal.
   */
  Game.buildQuestions = function (levelNo, track) {
    var LV = MG.levelOf(track || 'sd', levelNo);
    var rng = U.rng;
    var total = MG.CONFIG.QUESTIONS_PER_LEVEL;
    var topics = LV.topics.slice();
    var out = [];
    var usedTexts = {};

    // bagikan topik agar semua_topic muncul minimal 1x
    var queue = U.shuffle(rng, topics);
    while (queue.length < total) queue = queue.concat(U.shuffle(rng, topics));
    queue = queue.slice(0, total);

    var guard = 0;
    while (out.length < total && guard++ < total * 25) {
      var t = queue[out.length % queue.length];
      var fn = MG.topics[t];
      if (!fn) { out.push(null); continue; }
      var q;
      try { q = fn(rng, LV); } catch (e) { console.warn('[game] generator ' + t + ' gagal:', e); out.push(null); continue; }
      var key = t + '|' + q.text.replace(/<[^>]*>/g, '');
      if (usedTexts[key]) continue;               // soal persis sama, coba lagi
      usedTexts[key] = 1;
      q.index = out.length;
      q.level = levelNo;
      out.push(q);
    }

    // Pastikan jumlah tetap pas walau ada topik bermasalah
    while (out.length < total) {
      var t2 = U.pick(rng, topics);
      var fn2 = MG.topics[t2];
      var q2 = fn2 ? fn2(rng, LV) : null;
      if (q2) { q2.index = out.length; q2.level = levelNo; }
      out.push(q2);
    }
    return out.slice(0, total);
  };

  /* ============================================================
   *  MULAI LEVEL
   * ============================================================ */
  Game.start = function (levelNo, track) {
    track = track || 'sd';
    var LV = MG.levelOf(track, levelNo);
    state = {
      level: levelNo,
      track: track,
      levelInfo: LV,
      questions: Game.buildQuestions(levelNo, track),
      index: 0,
      hearts: MG.CONFIG.START_HEARTS,
      score: 0,
      combo: 0,
      bestCombo: 0,
      correct: 0,
      answered: 0,
      hintsUsed: 0,
      hintsThisQ: 0,
      startedAt: Date.now(),
      qStartedAt: 0,
      results: [],        // detail tiap soal
      finished: false,
      timeLimit: settings.timeLimit,
      difficulty: settings.difficulty
    };
    return state;
  };

  /* ============================================================
   *  WAKTU
   * ============================================================ */

  /** Batas waktu efektif (detik) setelah penyesuaian kesulitan. 0 = tanpa batas. */
  Game.timeForQuestion = function () {
    if (Game.isUnlimited()) return 0;
    var mult = (MG.CONFIG.DIFFICULTY[settings.difficulty] || MG.CONFIG.DIFFICULTY.sedang).timeBonus;
    return Math.max(5, Math.round(settings.timeLimit * mult));
  };

  Game.beginQuestion = function () {
    state.qStartedAt = Date.now();
    state.hintsThisQ = 0;
    return state.questions[state.index];
  };

  Game.elapsedMs = function () {
    return state ? Math.max(0, Date.now() - state.qStartedAt) : 0;
  };

  /* ============================================================
   *  MENJAWAB
   * ============================================================ */

  /**
   * @param {number} chosenIndex
   * @param {boolean} timedOut  true bila waktu habis
   * @returns {object} {correct, correctIndex, gained, combo, hearts, timeMs, timedOut, finished}
   */
  Game.answer = function (chosenIndex, timedOut) {
    var q = state.questions[state.index];
    var unlimited = Game.isUnlimited();
    // Tanpa batas waktu: pakai waktu jawab sungguhan (dibatasi wajar 1 jam).
    var timeMs = unlimited
      ? Math.min(Game.elapsedMs(), 3600000)
      : Math.min(Game.timeForQuestion() * 1000, Game.elapsedMs());
    var isCorrect = !timedOut && chosenIndex === q.answerIndex;

    var gained = 0;
    var C = MG.CONFIG.SCORE;

    if (isCorrect) {
      state.combo++;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.correct++;

      // Tanpa batas waktu tidak mendapat bonus cepat (adil dengan mode berwaktu).
      var timeRatio = unlimited
        ? 0
        : Math.max(0, Math.min(1, 1 - (timeMs / (state.timeLimit * 1000))));  // 1 = sangat cepat

      gained = C.BASE + Math.round(C.TIME_BONUS_MAX * timeRatio * Game.difficultyRatio());
      // pengali beruntun
      var mult = Math.min(C.COMBO_MAX, 1 + Math.floor(state.combo / 2));
      gained *= mult;
      // kurangi penalti petunjuk
      gained = Math.max(1, gained - state.hintsThisQ * C.HINT_PENALTY);

      state.score += gained;
    } else {
      state.combo = 0;
      state.hearts--;
    }

    state.answered++;
    state.results.push({
      topic: q.topic,
      topicName: q.topicName,
      text: q.text,
      given: (timedOut || chosenIndex == null) ? null : q.answers[chosenIndex],
      answer: q.answers[q.answerIndex],
      isCorrect: isCorrect,
      timeMs: timeMs,
      gained: gained
    });

    var finished = false;
    if (state.hearts <= 0 || state.answered >= state.questions.length) {
      finished = true;
      state.finished = true;
    }

    return {
      correct: isCorrect,
      correctIndex: q.answerIndex,
      gained: gained,
      combo: state.combo,
      hearts: state.hearts,
      timeMs: timeMs,
      timedOut: !!timedOut,
      finished: finished
    };
  };

  /** Pengali kesulitan untuk bonus waktu. */
  Game.difficultyRatio = function () {
    return settings.difficulty === 'sulit' ? 1.35 :
      settings.difficulty === 'santai' ? 0.7 : 1;
  };

  Game.useHint = function () {
    if (!state) return false;
    state.hintsUsed++;
    state.hintsThisQ++;
    return true;
  };

  Game.nextQuestion = function () {
    if (!state) return null;
    state.index++;
    if (state.index >= state.questions.length) { state.finished = true; return null; }
    return Game.beginQuestion();
  };

  /* ============================================================
   *  HASIL & BINTANG
   * ============================================================ */

  /** Selesai >= 60% benar dianggap melewati level. */
  Game.isCleared = function () {
    if (!state) return false;
    var total = state.questions.length;
    var ratio = state.correct / total;
    // Kalau hati habis di tengah, tetap boleh lulus kalau akurasinya bagus
    return ratio >= 0.6;
  };

  Game.starsFor = function () {
    if (!Game.isCleared()) return 0;
    var ratio = state.correct / state.questions.length;
    var stars = 0;
    MG.CONFIG.STARS.forEach(function (s) {
      if (ratio >= s.need) stars = s.stars;
    });
    return stars;
  };

  Game.starsLabel = function (stars) {
    for (var i = 0; i < MG.CONFIG.STARS.length; i++) {
      if (MG.CONFIG.STARS[i].stars === stars) return MG.CONFIG.STARS[i].label;
    }
    return stars > 0 ? 'Bagus!' : 'Belum lulus';
  };

  Game.summary = function () {
    var total = state.questions.length;
    var stars = Game.starsFor();
    var res = {
      level: state.level,
      track: state.track,
      levelInfo: state.levelInfo,
      correct: state.correct,
      total: total,
      answered: state.answered,
      accuracy: state.correct / total,
      score: state.score,
      stars: stars,
      starsLabel: Game.starsLabel(stars),
      durationMs: Date.now() - state.startedAt,
      heartsLeft: Math.max(0, state.hearts),
      cleared: Game.isCleared(),
      bestCombo: state.bestCombo,
      hintsUsed: state.hintsUsed,
      questions: state.results
    };
    return res;
  };

  /* ============================================================
   *  LENCANA
   * ============================================================ */
  Game.checkBadges = function (res) {
    var DB = MG.db;
    var earned = [];
    function give(code) {
      var b = MG.badgeByCode(code);
      if (b && DB.awardBadge(code)) earned.push(b);
    }

    var ov = DB.getOverview();
    var cleared = ov.cleared;
    var correctTotal = ov.correct;

    if (res.cleared) give('first');
    if (res.stars === 3) give('perfect');
    if (res.bestCombo >= 5) give('combo5');
    if (cleared >= 5) give('level5');
    if (cleared >= 10) give('level10');
    if (DB.getClearedCount('sd') >= MG.CONFIG.LEVELS_COUNT) give('level20');
    if (correctTotal >= 50) give('scholar50');
    if (correctTotal >= 200) give('genius');
    if (ov.stars >= 25) give('stars25');
    if (ov.stars >= 50) give('stars50');
    if (res.cleared && res.heartsLeft >= MG.CONFIG.START_HEARTS) give('flawless');
    if (ov.daysPlayed >= 7) give('night');

    // "Serba bisa": sudah berani mencoba minimal 10 topik berbeda
    if (DB.getTopicStats().length >= 10) give('topicPro');

    // badge "jawab kilat": benar dalam 3 detik pada permainan ini
    for (var i = 0; i < res.questions.length; i++) {
      if (res.questions[i].isCorrect && res.questions[i].timeMs <= 3000) { give('fast'); break; }
    }

    return earned;
  };

})(window);
