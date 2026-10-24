/* ============================================================
 *  main.js  —  Titik masuk aplikasi.
 *  Menyalakan database, memuat pengaturan, lalu menyerahkan kontrol ke UI.
 * ============================================================ */
(function (global) {
  'use strict';

  var MG = global.MG;
  var U = MG.utils;
  var $ = U.$;

  /* ============================================================
   *  PESAN DARI MASCOT (acak, muncul satu kali saat aplikasi dibuka)
   * ============================================================ */
  var GREETINGS = [
    'Halo! Aku <b>Bobi</b>. Ayo belajar matematika sambil bermain! 🎉',
    'Siap jadi teman belajarmu? Pilih <b>Mulai Belajar</b> ya! 🚀',
    'Ada <b>20 level</b> menunggu. Mau coba yang mana? 🗺️',
    'Ingat: jawab sebelum waktu habis dapat bonus poin! ⏱️',
    'Sudah selesai tugas hari ini? Belajar 10 menit saja sudah cukup! 📚'
  ];

  /* ============================================================
   *  MUAT PENGATURAN DARI DATABASE
   *
   *  Satu perangkat bisa dipakai beberapa anak, jadi saat aplikasi
   *  dibuka kita kembali ke pemain yang terakhir dipakai. Kalau belum
   *  ada pemain sama sekali, buat satu dengan nama acak yang ramah.
   * ============================================================ */
  function loadSettings() {
    var player = MG.db.getPlayer();

    if (!player) {
      var namaAcak = ['Budi', 'Sari', 'Dodo', 'Lina', 'Riko', 'Maya'][Math.floor(Math.random() * 6)];
      player = MG.db.createPlayer(namaAcak,
        MG.CONFIG.AVATARS[Math.floor(Math.random() * 6)],
        1 + Math.floor(Math.random() * 6));
    }

    MG.ui.applyPlayerSettings();
    return player;
  }

  /* ============================================================
   *  NYALAKAN APLIKASI
   * ============================================================ */
  function boot() {
    var loaderText = $('#loader-text');
    var loaderMascot = $('#loader-mascot');
    if (loaderMascot) loaderMascot.innerHTML = MG.art.mascot('happy');

    // Efek suara baru boleh bunyi setelah pengguna berinteraksi
    var unlock = function () {
      MG.audio.unlock();
      if (MG.game.settings.music) MG.audio.startMusic();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);

    if (loaderText) loaderText.textContent = 'Menyiapkan database…';

    MG.db.init().then(function (ok) {
      if (!ok) {
        if (loaderText) loaderText.textContent = 'Gagal membuka database…';
        return;
      }
      if (loaderText) loaderText.textContent = 'Menyiapkan permainan…';

      var player = loadSettings();

      // Terapkan pengaturan ke modul suara
      MG.audio.sfxOn = MG.game.settings.sfx;
      MG.audio.musicOn = MG.game.settings.music;

      // Ikon tombol suara
      var btnSound = $('#btn-sound');
      if (btnSound) {
        btnSound.classList.toggle('off', !MG.game.settings.sfx);
        btnSound.querySelector('.ico').textContent = MG.game.settings.sfx ? '🔊' : '🔇';
      }

      // Efek visual (partikel confetti) dan pengaitkan tombol
      MG.ui.fx.init();
      MG.ui.bind();
      MG.ui.refreshHome();
      MG.ui.show('home');

      // Sembunyikan loader
      var loader = $('#loader');
      if (loader) {
        loader.classList.add('hide');
        setTimeout(function () { loader.style.display = 'none'; }, 500);
      }

      // Sapaan dari Bobi
      var greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      setTimeout(function () { MG.ui.showBubble(greeting, 5200); }, 620);

      // Sinkronkan dengan server bila game dijalankan lewat server.js
      MG.db.pullFromServer().then(function (changed) {
        if (changed) {
          MG.ui.applyPlayerSettings();
          MG.ui.refreshHome();
          U.toast('Progres diperbarui dari server ☁️');
        }
      });

      // Daftarkan ke papan peringkat online bila server tersedia
      MG.db.publishScore(true);

      // Simpan juga saat tab ditutup
      global.addEventListener('beforeunload', function () { MG.db.saveNow(); });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') MG.db.saveNow();
      });

      console.log('%cMatematika Ajaib', 'font-size:20px;font-weight:900;color:#5B4BE8',
        '\nPemain:', player.name + ' (kelas ' + (player.grade || 1) + ')',
        '\nJumlah pemain:', MG.db.playerCount(),
        '\nPenyimpanan:', MG.db.storageKind(),
        '\nLevel terbuka:', MG.db.getUnlockedLevel(),
        '\nMode server:', MG.db.serverSyncEnabled(),
        '\nLeaderboard online:', MG.db.onlineAvailable());
    });
  }

  /* ============================================================
   *  ERROR GLOBAL
   * ============================================================ */
  global.addEventListener('error', function (e) {
    console.error('[error]', e.error || e.message);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window);
