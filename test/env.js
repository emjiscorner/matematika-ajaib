/* ============================================================
 *  env.js  —  Shim DOM/browser supaya modul game bisa dijalankan
 *  di Node.js. Cukup untuk menguji config, topics, game, dan db
 *  tanpa membuka browser.
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

/* ---------- Penyimpanan lokal sederhana ---------- */
function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
    get length() { return map.size; },
    _map: map
  };
}

/* ---------- Elemen DOM palsu ---------- */
function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    className: '',
    innerHTML: '',
    textContent: '',
    style: {},
    dataset: {},
    children: [],
    disabled: false,
    _handlers: {},
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle(c, on) { if (on === undefined) on = !this._s.has(c); on ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    },
    addEventListener(ev, fn) { (this._handlers[ev] = this._handlers[ev] || []).push(fn); },
    removeEventListener() { },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); },
    remove() { },
    setAttribute() { }, getAttribute() { return null; }, hasAttribute() { return false; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    focus() { }, click() { (this._handlers.click || []).forEach((f) => f.call(this)); },
    getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 20 }; },
    offsetWidth: 100
  };
  return el;
}

/* ---------- Objek window global ---------- */
const win = global;

win.innerWidth = 1280;
win.innerHeight = 800;
win.devicePixelRatio = 1;
win.scrollTo = () => { };
win.addEventListener = () => { };
win.removeEventListener = () => { };
win.requestAnimationFrame = () => 0;
win.cancelAnimationFrame = () => { };
win.performance = { now: () => Date.now() };
win.matchMedia = () => ({ matches: false, addListener() { }, removeListener() { } });
win.getComputedStyle = () => ({ getPropertyValue: () => '' });

win.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
win.atob = (s) => Buffer.from(s, 'base64').toString('binary');

win.localStorage = makeStorage();
// Sengaja TIDAK menyediakan indexedDB supaya db.js memakai localStorage
win.indexedDB = undefined;

win.location = { protocol: 'file:', href: 'file:///index.html', origin: 'null' };
win.fetch = undefined;

/* ---------- document palsu ---------- */
const doc = {
  readyState: 'complete',
  visibilityState: 'visible',
  body: { style: {} },
  documentElement: { style: {} },
  _els: new Map(),
  createElement: (t) => makeEl(t),
  createTextNode: (t) => ({ textContent: t }),
  addEventListener: () => { },
  removeEventListener: () => { },
  querySelector(sel) {
    if (!this._els.has(sel)) this._els.set(sel, makeEl('div'));
    return this._els.get(sel);
  },
  querySelectorAll() { return []; }
};
win.document = doc;

/* ---------- AudioContext palsu (supaya audio.js tidak error) ---------- */
function FakeParam() {
  return { value: 0, setValueAtTime() { return this; }, linearRampToValueAtTime() { return this; }, exponentialRampToValueAtTime() { return this; } };
}
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = 'running'; this.destination = {}; }
  createGain() { return { gain: FakeParam(), connect() { }, disconnect() { } }; }
  createOscillator() {
    return {
      type: 'sine', frequency: FakeParam(),
      connect() { }, start() { }, stop() { }, disconnect() { }
    };
  }
  createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
  createBufferSource() { return { buffer: null, connect() { }, start() { } }; }
  createBiquadFilter() { return { type: '', frequency: FakeParam(), Q: FakeParam(), connect() { } }; }
  resume() { return Promise.resolve(); }
}
win.AudioContext = FakeAudioContext;
win.webkitAudioContext = FakeAudioContext;

/* ---------- Muat modul game ---------- */
const ROOT = path.join(__dirname, '..');

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, 'assets/js', file), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('window', code)(win);
}

/** Muat skrip vendor (mis. sql.js) ke dalam window palsu. */
function loadVendor(file) {
  const code = fs.readFileSync(path.join(ROOT, 'assets/vendor', file), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('window', code)(win);
}

/**
 * Siapkan mesin sql.js persis seperti di browser:
 * WASM ditanam sebagai base64 supaya tidak perlu fetch sama sekali.
 */
function initSql() {
  if (typeof win.initSqlJs === 'function') return;
  loadVendor('sql-wasm-binary.js');
  win.initSqlJs = require(path.join(ROOT, 'assets/vendor/sql-wasm.js'));
}

function loadAll(opts) {
  const withDb = opts === true || (opts && opts.db);
  ['config.js', 'utils.js', 'art.js', 'audio.js', 'topics.js'].forEach(load);
  if (withDb) load('db.js');
  load('game.js');
  if (withDb) initSql();
}

module.exports = { win, doc, load, loadVendor, initSql, loadAll, ROOT, makeEl, makeStorage };
