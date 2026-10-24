#!/usr/bin/env node
/* ============================================================
 *  run-all.js  —  Jalankan seluruh uji, lalu rangkum hasilnya.
 *
 *  Uji yang dijalankan: topics (soal), db (SQLite), server (server.js),
 *  dan smoke (Chrome sungguhan). Semua harus lolos.
 *
 *  Jalankan:  npm test
 * ============================================================ */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const TESTS = [
  { name: 'topics', file: 'topics.test.js', args: ['300'], required: true },
  { name: 'db', file: 'db.test.js', args: [], required: true },
  { name: 'server', file: 'server.test.js', args: [], required: true },
  { name: 'smoke', file: 'smoke.js', args: [], required: true }
];

const results = [];

for (const t of TESTS) {
  console.log('\n' + '═'.repeat(60));
  console.log('  UJI: ' + t.name + (t.required ? '' : '   (opsional)'));
  console.log('═'.repeat(60));

  const r = spawnSync(process.execPath, [path.join(__dirname, t.file), ...t.args], {
    stdio: 'inherit',
    timeout: 180000
  });

  let status;
  if (r.error) status = 'LEWAT';
  else if (r.status === 0) status = 'LOLOS';
  else status = 'GAGAL';

  results.push({ ...t, status });
}

console.log('\n' + '═'.repeat(60));
console.log('  RANGKUMAN');
console.log('═'.repeat(60));
results.forEach((r) => {
  const mark = r.status === 'LOLOS' ? '✅' : r.status === 'LEWAT' ? '⏭️ ' : '❌';
  console.log('  ' + mark + '  ' + r.name.padEnd(8) + r.status);
});

const failed = results.filter((r) => r.required && r.status !== 'LOLOS');
const skipped = results.filter((r) => r.status === 'LEWAT');

console.log('');
if (skipped.length) {
  console.log('  ℹ️  ' + skipped.length + ' uji opsional dilewati (tidak-service / hang).');
}
if (failed.length) {
  console.log('  ❌ GAGAL: ' + failed.map((f) => f.name).join(', '));
  process.exit(1);
}
console.log('  ✅ Semua uji wajib lolos.');
process.exit(0);
