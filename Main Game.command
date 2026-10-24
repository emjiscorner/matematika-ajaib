#!/bin/bash
# ============================================================
#  Main Game.command  —  Peluncur untuk macOS
#
#  Klik 2x berkas ini untuk membuka Matematika Ajaib di browser.
#  Kalau Node.js tersedia, server lokal ikut dijalankan supaya
#  progres tersimpan di data/game.sqlite.
#  Kalau tidak ada Node.js, game tetap dibuka langsung dari
#  berkas index.html (mode portable).
# ============================================================

cd "$(dirname "$0")" || exit 1
export PORT

# PORT boleh diganti dari luar, misalnya:  PORT=9000 open "Main Game.command"
PORT="${PORT:-8080}"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║        MATEMATIKA AJAIB                 ║"
echo "  ║      game edukasi matematika SD 1-6      ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# --- cek apakah sudah ada server yang jalan di port ini ---
if curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/api/info"; then
  echo "  ℹ️  Server sudah berjalan. Membuka di browser…"
  open "http://localhost:$PORT"
  exit 0
fi

# --- pakai Node.js kalau ada ---
if command -v node >/dev/null 2>&1; then
  echo "  ✓ Node.js ditemukan: $(node -v)"
  # ${PORT} ditulis dengan kurung kurawal: pada bash 3.2 bawaan macOS,
  # $PORT yang langsung diikuti tanda baca non-ASCII bisa ikut tersedot.
  echo "  ▶️  Menjalankan server lokal di port ${PORT}…"
  echo "  💡  Untuk menghentikan server: tekan Ctrl + C di jendela ini."
  echo ""
  node server.js &
  SERVER_PID=$!
  sleep 1.5

  if curl -s -o /dev/null --max-time 2 "http://localhost:$PORT/api/info"; then
    open "http://localhost:$PORT"
    echo "  ✅ Game terbuka di browser."
    echo "  📁 Progres tersimpan di: data/game.sqlite"
    echo ""
    wait $SERVER_PID
    kill $SERVER_PID 2>/dev/null
    exit 0
  else
    echo "  ⚠️  Server gagal start, membuka berkas secara langsung…"
    kill $SERVER_PID 2>/dev/null
  fi
fi

# --- cadangkan: buka berkas langsung (mode portable) ---
echo "  ▶️  Membuka index.html langsung (mode portable)…"
open "index.html"
echo "  ✅ Game terbuka."
echo ""
echo "  ℹ️  Tips: pasang Node.js (https://nodejs.org) lalu jalankan ulang"
echo "     berkas ini untuk mengaktifkan penyimpanan di server."
echo ""
echo "  Tekan Enter untuk menutup jendela ini."
read -r
