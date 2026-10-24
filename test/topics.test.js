/* Uji ketat semua generator soal: jalankan ribuan kali per level,
   pastikan jawaban benar selalu ada di pilihan dan tepat 4 pilihan unik. */
global.window = global;
require('../assets/js/config.js');
require('../assets/js/utils.js');
require('../assets/js/art.js');
require('../assets/js/topics.js');

var MG = global.MG;
var problems = [];
var stats = { total: 0, byLevel: {}, byTopic: {}, dupText: {} };

// stub sederhana untuk menguji art
MG.art.render = function (a) { return a ? ('<svg data-kind="' + a.kind + '"></svg>') : ''; };

function check(q, label, seed) {
  var tag = label + ' seed' + seed;
  if (!q) { problems.push(tag + ': generator return null'); return; }
  if (typeof q.text !== 'string' || !q.text.length) problems.push(tag + ' (' + q.topic + '): teks kosong');
  if (/undefined|NaN|\[object/.test(q.text)) problems.push(tag + ' (' + q.topic + '): teks rusak -> ' + q.text);
  if (!Array.isArray(q.answers)) { problems.push(tag + ' (' + q.topic + '): answers bukan array'); return; }
  if (q.answers.length !== 4) problems.push(tag + ' (' + q.topic + '): jumlah pilihan ' + q.answers.length);
  var uniq = new Set(q.answers.map(String));
  if (uniq.size !== q.answers.length) problems.push(tag + ' (' + q.topic + '): pilihan duplikat ' + JSON.stringify(q.answers));
  if (q.answerIndex == null || q.answerIndex < 0 || q.answerIndex > 3) problems.push(tag + ' (' + q.topic + '): answerIndex tidak valid ' + q.answerIndex);
  else {
    var given = String(q.answers[q.answerIndex]);
    var want = String(q.answer);
    if (given !== want) problems.push(tag + ' (' + q.topic + '): pilihan[' + q.answerIndex + ']="' + given + '" tapi jawaban="'+want+'"  soal="' + q.text.replace(/<[^>]+>/g,'') + '"');
    for (var i = 0; i < 4; i++) {
      if (/undefined|NaN|\[object|null/.test(String(q.answers[i]))) problems.push(tag + ' (' + q.topic + '): opsi[' + i + '] rusak = ' + q.answers[i]);
    }
  }
  if (q.art) {
    var artHtml = MG.art.render(q.art);
    if (/undefined|NaN/.test(artHtml)) problems.push(tag + ' (' + q.topic + '): art rusak ' + JSON.stringify(q.art));
  }
}

var RUNS = parseInt(process.argv[2] || '60', 10);

function runTrack(track, levels) {
  levels.forEach(function (L) {
    var label = (track === 'tk' ? 'TK' : 'L') + L.n;
    for (var run = 0; run < RUNS; run++) {
      var seed = (track === 'tk' ? 900000 : 0) + L.n * 100000 + run * 7919 + 13;
      var rng = MG.utils.seeded(seed);
      // bangun set soal 10 seperti game nyata
      var seen = {};
      for (var i = 0; i < 10; i++) {
        var topic = MG.utils.pick(rng, L.topics);
        var fn = MG.topics[topic];
        if (!fn) { problems.push(label + ': topic "' + topic + '" tidak ada di topics.js'); continue; }
        var q;
        try { q = fn(rng, L); } catch (e) { problems.push(label + ' topic ' + topic + ' ERROR: ' + e.message + '\n' + e.stack.split('\n')[1]); continue; }
        check(q, label, seed);
        stats.total++;
        stats.byLevel[label] = (stats.byLevel[label] || 0) + 1;
        stats.byTopic[q.topic] = (stats.byTopic[q.topic] || 0) + 1;
        var plain = q.text.replace(/<[^>]+>/g, '');
        seen[plain] = (seen[plain] || 0) + 1;
      }
    }
  });
}

runTrack('sd', MG.CONFIG.LEVELS);
runTrack('tk', MG.CONFIG.TK_LEVELS);

// cek nama topik yang dipakai config tapi tidak terdaftar di NAMES
var known = new Set(Object.keys(MG.topics.NAMES));
MG.CONFIG.LEVELS.concat(MG.CONFIG.TK_LEVELS).forEach(function (L) {
  L.topics.forEach(function (t) { if (!known.has(t)) problems.push('Level ' + L.n + ': topic "' + t + '" tidak dikenal'); });
});

// ringkasan
var topicsUsed = new Set();
MG.CONFIG.LEVELS.concat(MG.CONFIG.TK_LEVELS).forEach(function (L) { L.topics.forEach(function (t) { topicsUsed.add(t); }); });
var unused = Object.keys(MG.topics.NAMES).filter(function (t) { return !topicsUsed.has(t); });

console.log('Total soal diuji:', stats.total);
console.log('Per level    :', Object.entries(stats.byLevel).map(function (e) { return e[0] + '=' + e[1]; }).join(' '));
console.log('Topik dipakai:', Object.keys(stats.byTopic).length, Object.keys(stats.byTopic).sort().join(', '));
console.log('Topik tak dipakai di config:', unused.length ? unused.join(', ') : '(tidak ada)');
console.log('');
if (problems.length) {
  // kelompokkan pesan unik
  var byMsg = {};
  problems.forEach(function (p) { var k = p.replace(/seed\d+/, 'seedX'); byMsg[k] = (byMsg[k] || 0) + 1; });
  var keys = Object.keys(byMsg);
  console.log('!! MASALAH: ' + problems.length + ' (' + keys.length + ' jenis)');
  keys.slice(0, 60).forEach(function (k) { console.log('  [' + byMsg[k] + 'x] ' + k); });
  if (keys.length > 60) console.log('  ... dan ' + (keys.length - 60) + ' jenis lain');
  process.exit(1);
} else {
  console.log('OK — semua soal valid.');
}
