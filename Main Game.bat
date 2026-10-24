@echo off
rem ================================================================
rem   Main Game.bat  -  Peluncur untuk Windows
rem
rem   Klik 2x berkas ini untuk membuka Matematika Ajaib di browser.
rem   Kalau Node.js tersedia, server lokal ikut dijalankan supaya
rem   progres tersimpan di data/game.sqlite dan papan peringkat
rem   daring bisa dipakai.
rem   Kalau tidak ada Node.js, game tetap dibuka langsung dari
rem   berkas index.html (mode portable).
rem
rem   CATATAN: berkas ini sengaja memakai huruf ASCII semua supaya
rem   tidak rusak di cmd.exe yang memakai kode halaman lain.
rem ================================================================

setlocal
cd /d "%~dp0"

rem PORT boleh diganti dari luar, misalnya: set PORT=9000 lalu jalankan lagi
if "%PORT%"=="" set "PORT=8080"

set "URL=http://localhost:%PORT%"

echo.
echo   ============================================
echo             M A T E M A T I K A   A J A I B
echo           game edukasi matematika SD 1-6
echo   ============================================
echo.

rem ---------- 1. sudah ada server yang jalan? ----------
call :tunggu_server
if "%DIJUMPET%"=="1" goto :sudah_jalan

rem ---------- 2. cari Node.js ----------
where node >nul 2>&1
if errorlevel 1 goto :portable

for /f "delims=" %%v in ('node -v') do set "NODEVER=%%v"
echo   [+] Node.js ditemukan: %NODEVER%
echo   [i] Menjalankan server lokal di port %PORT%...

rem Server dijalankan di jendela terpisah yang diperkecil supaya jendela
rem ini tidak ikut terblokir. Cara menghentikan: tutup jendela kecil itu.
start "Matematika Ajaib - Server" /min node server.js

call :tunggu_server
if not "%DIJUMPET%"=="1" goto :gagal_start

start "" "%URL%"
echo   [OK] Game terbuka di browser.
echo.
echo   Progres tersimpan di : data\game.sqlite
echo   Papan peringkat daring: %URL%
echo.
echo   Untuk menghentikan server: tutup jendela kecil berwarna hitam
echo   berjudul "Matematika Ajaib - Server", atau klik kanan ikon
echo   Node.js di Task Manager lalu pilih End task.
echo.
echo   Catatan: kalau Windows Firewall muncul di kali pertama, pilih
echo   "Allow access" untuk jaringan Private (rumah atau sekolah).
echo   Pilih "Cancel" kalau tidak ingin dibuka dari HP lain - game
echo   tetap jalan normal di komputer ini.
echo.
echo   Tekan Enter untuk menutup jendela ini.
pause >nul
endlocal
exit /b 0

rem ---------- server sudah jalan dari sebelumnya ----------
:sudah_jalan
echo   [i] Server sudah berjalan. Membuka di browser...
start "" "%URL%"
echo.
echo   Tekan Enter untuk menutup jendela ini.
pause >nul
endlocal
exit /b 0

rem ---------- Node.js ada tapi server gagal menyala ----------
:gagal_start
echo   [X] Server gagal start. Membuka berkas secara langsung...
echo.
goto :portable

rem ---------- cadangan: mode portable ----------
:portable
echo   [i] Membuka index.html langsung (mode portable)...
start "" "%~dp0index.html"
echo   [OK] Game terbuka.
echo.
echo   Tips: pasang Node.js dari https://nodejs.org lalu jalankan ulang
echo   berkas ini untuk mengaktifkan penyimpanan di server dan papan
echo   peringkat daring.
echo.
echo   Tekan Enter untuk menutup jendela ini.
pause >nul
endlocal
exit /b 0

rem ================================================================
rem   :tunggu_server
rem   Mengecek apakah server di port %PORT% sudah siap, maksimal
rem   sekitar 30 detik (tiap percobaan: 1 detik time-out + 0,5 detik
rem   jeda). Mengisi DIJUMPET=1 kalau sudah merespons endpoint
rem   /api/info, selain itu DIJUMPET=0.
rem
rem   Semua pemeriksaan dilakukan dalam satu pemanggilan PowerShell
rem   supaya tidak lambat seperti memanggilnya berulang kali.
rem ================================================================
:tunggu_server
set "DIJUMPET=0"
powershell -NoProfile -Command "$ok=$false; foreach($i in 1..20){ try{ $null=Invoke-WebRequest -Uri '%URL%/api/info' -TimeoutSec 1 -UseBasicParsing; $ok=$true; break }catch{ Start-Sleep -Milliseconds 500 } }; if($ok){exit 0}else{exit 1}" >nul 2>&1
if not errorlevel 1 set "DIJUMPET=1"
goto :eof
