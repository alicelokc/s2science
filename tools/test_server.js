/* Server data tests: run `node tools/test_server.js` (no installs needed).
 * Loads server/Code.gs in a fake Google Sheets (which turns "2026-10-05" into a Date, like real Sheets)
 * and checks every rule that keeps XP, streaks, collections and class-board data correct. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('  FAIL: ' + msg); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }

/* ---------- a tiny fake of SpreadsheetApp ---------- */
class Sheet {
  constructor(name) { this.name = name; this.d = []; this.fmt = {}; }
  getLastRow() { return this.d.length; }
  getLastColumn() { return this.d.reduce((m, r) => Math.max(m, r.length), 0); }
  getRange(r, c, nr = 1, nc = 1) {
    const sh = this;
    return {
      getValues() { const o = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) { const v = (sh.d[r - 1 + i] || [])[c - 1 + j]; row.push(v === undefined ? '' : v); } o.push(row); } return o; },
      getValue() { return this.getValues()[0][0]; },
      setValues(vals) { vals.forEach((row, i) => row.forEach((v, j) => { const R = r - 1 + i, C = c - 1 + j; sh.d[R] = sh.d[R] || []; if (typeof v === 'string' && !sh.fmt[C + 1] && /^\d{4}-\d\d-\d\d$/.test(v)) v = new Date(v + 'T00:00:00+08:00'); sh.d[R][C] = v; })); return this; },
      setValue(v) { return this.setValues([[v]]); },
      setNumberFormat(f) { for (let j = 0; j < nc; j++) sh.fmt[c + j] = f === '@'; return this; },
      setFontWeight() { return this; }, setBackground() { return this; }
    };
  }
  getDataRange() { return this.getRange(1, 1, this.d.length, this.getLastColumn()); }
  appendRow(r) { this.d.push(r); } deleteRows(a, n) { this.d.splice(a - 1, n); } setFrozenRows() { }
}
function makeServer() {
  const sheets = {}, store = {};
  const book = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet(n)) };
  const ctx = {
    console, Date, JSON, Math, Number, String, Object, Array, parseInt, isNaN, isFinite, Logger: { log() { } },
    CacheService: { getScriptCache: () => ({ get: k => store[k] || null, put: (k, v) => { store[k] = v; }, remove: k => { delete store[k]; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() { } }) },
    LockService: { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) },
    Session: { getScriptTimeZone: () => 'Asia/Hong_Kong' },
    Utilities: { formatDate: d => new Date(d.getTime() + 8 * 3600e3).toISOString().slice(0, 10) },
    SpreadsheetApp: { openById: () => book }, ContentService: { createTextOutput: t => ({ text: t, setMimeType() { return this; } }), MimeType: { JSON: 1 } }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'server/Code.gs'), 'utf8'), ctx);
  const run = c => vm.runInContext(c, ctx);
  ctx.__book = book;
  run("book=function(){return __book};sheet=function(n,h){var s=__book.getSheetByName(n);if(!s){s=__book.insertSheet(n);s.appendRow(h);}return s;};");
  const users = new Sheet('Users');
  users.d = [['email', 'role', 'zh', 'en', 'cls', 'no'], ['a@s', 'student', '甲', 'A', '1A', 1], ['b@s', 'student', '乙', 'B', '1A', 2], ['c@s', 'student', '丙', 'C', '1B', 3], ['t@s', 'teacher', '師', 'T', '', '']];
  sheets[run('USERS_DEFAULT')] = users;
  const U = e => ({ email: e, zh: { 'a@s': '甲', 'b@s': '乙', 'c@s': '丙' }[e] || e, en: e, cls: e === 'c@s' ? '1B' : '1A', teacher: e === 't@s' });
  const call = (fn, ...args) => { ctx.__a = args; return JSON.parse(run('JSON.stringify(' + fn + '.apply(null,__a))')); };
  return { sheets, store, run, call, U, clearCache: () => { for (const k in store) delete store[k]; } };
}
const day = o => new Date(Date.now() + o * 864e5 + 8 * 3600e3).toISOString().slice(0, 10);
const st = (o) => JSON.stringify(Object.assign({ lastDay: day(0), days: 5, xpTotal: 0, pets: { mochi: { xp: 0 } } }, o));
function save(S, e, state, summary, force) { return S.call('saveResp', S.U(e), { state, summary, force: !!force }); }
function rec(S, e, daysAgo, mode) {
  const R = S.run('sheet(REC,REC_HEAD)') && S.sheets[S.run('REC')];
  const t = new Date(Date.now() - daysAgo * 864e5);
  R.d.push([t, 'sess' + daysAgo, e, 'student', '1A', 1, '', '', S.run('MODES')[mode || 'quiz'], '1', '1.1', 10, 8, 80, 2, 60, S.run('STATUS.done'), 'zh', t, t, '1.1#1', '']);
}
const board = (S, e, scope) => { S.clearCache(); return S.call('board', S.U(e), scope || 'class'); };
const top = (b, cat) => b.cats[cat].top.map(r => [r.n, r.v]);

console.log('Server data tests');
{ const S = makeServer();
  // contract: the row written must match the header, or every column after the gap shifts
  ok(S.run('PROG_HEAD.length') === 22, 'progress header has 22 columns');
  save(S, 'a@s', st({ xpTotal: 300, pets: { mochi: { xp: 300 } } }), { streak: 5, lastDay: day(0), xp: 300, col: 12, leg: 1 });
  const row = S.sheets[S.run('PROG')].d[1];
  eq(row.length, S.run('PROG_HEAD.length'), 'saved row length equals header length');
  eq(typeof row[12], 'string', 'last study day stays text (not a Date)');
  const b = board(S, 'a@s');
  eq(top(b, 'xp'), [['甲', 300]], 'XP shows on the board');
  eq(top(b, 'streak'), [['甲', 5]], 'streak shows on the board');
  eq(top(b, 'col'), [['甲', 12]], 'collection shows on the board');
  const v = S.run("JSON.parse(out({ok:true}).text).sv");
  ok(v === S.run('SERVER_VER'), 'every reply carries the server version');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), m = html.match(/var NEED_SERVER=(\d+)/);
  ok(m && +m[1] === S.run('SERVER_VER'), 'game NEED_SERVER (' + (m && m[1]) + ') equals server SERVER_VER (' + S.run('SERVER_VER') + ') – bump both together');
}
{ const S = makeServer();
  save(S, 'a@s', st({ xpTotal: 650, pets: { mochi: { xp: 650 } } }), { xp: 650, col: 9, lastDay: day(0) });
  const r = save(S, 'a@s', st({ xpTotal: 0, pets: { mochi: { xp: 0 } } }), { xp: 0, col: 0, lastDay: day(0) });
  ok(!r.ok && r.error === 'stale' && JSON.parse(r.progress).xpTotal === 650, 'a copy with less XP is refused and the cloud copy is sent back');
  ok(S.sheets[S.run('BACKUP')] && S.sheets[S.run('BACKUP')].d.length === 2, 'the refused copy is kept in the backup tab');
  const r2 = save(S, 'a@s', st({ lastDay: day(-3), xpTotal: 900 }), { xp: 900, lastDay: day(-3) });
  ok(!r2.ok && r2.error === 'stale', 'an older copy (earlier study day) cannot overwrite newer progress');
  save(S, 'a@s', st({ xpTotal: 100, pets: { mochi: { xp: 100 } } }), { xp: 100, col: 3, lastDay: day(0) }, true);
  const b = board(S, 'a@s');
  eq(top(b, 'xp'), [['甲', 650]], 'board XP never goes down, even after a forced restore');
  eq(top(b, 'col'), [['甲', 9]], 'board collection never goes down');
  save(S, 'b@s', st({ xpTotal: 0, pets: { mochi: { xp: 1700 }, sakura: { xp: 40 } } }), { xp: 0, lastDay: day(0) });
  eq(top(board(S, 'b@s'), 'xp').find(x => x[0] === '乙'), ['乙', 1740], 'Total XP is never below the XP held by the pals');
}
{ const S = makeServer();
  save(S, 'a@s', st({ lastDay: day(-1) }), { streak: 5, lastDay: day(-1), xp: 1 });            // studied yesterday
  save(S, 'b@s', st({ lastDay: day(-3) }), { streak: 9, lastDay: day(-3), alive: day(-1), xp: 1 }); // 2 Streak Freezes left
  save(S, 'c@s', st({ lastDay: day(-4) }), { streak: 7, lastDay: day(-4), xp: 1 });            // broken
  const b = board(S, 'a@s', 'all');
  eq(top(b, 'streak'), [['乙', 9], ['甲', 5]], 'live streaks show, a Streak-Freeze streak stays, a broken one is hidden');
  const P = S.sheets[S.run('PROG')];
  P.d.push(['c@s', new Date(), 8, 8, 0, 1, 0, 'mochi', 0, 0, 0, 0, new Date(day(-6) + 'T00:00:00+08:00'), '{}', 77, 5, 0, 0, 0, '', '', '']);
  ok(!top(board(S, 'a@s', 'all'), 'streak').some(x => x[0] === '丙' && x[1] === 8), 'an old row whose study day became a Date still hides a broken streak');
}
{ const S = makeServer();
  // records say 4 days in a row (one bridged by a freeze day) even though the game copy says 1
  [0, 1, 3, 4].forEach(d => rec(S, 'a@s', d)); rec(S, 'a@s', 9);
  save(S, 'a@s', st(), { streak: 1, lastDay: day(0), xp: 5, frz: [day(-2)] });
  eq(top(board(S, 'a@s'), 'streak'), [['甲', 4]], 'streak is rebuilt from Science Records + freeze days when the game copy is too low');
  const sv = S.call('stats', 0);
  eq(sv.progress['a@s'].streakNow, 4, 'teacher card shows the same streak as the class board');
}
{ const S = makeServer();
  save(S, 'a@s', st({ xpTotal: 300 }), { streak: 6, lastDay: day(0), xp: 300, col: 12 });
  S.run('boardRows()'); // warm the 60-second cache
  save(S, 'a@s', st({ xpTotal: 450 }), { streak: 6, lastDay: day(0), xp: 450, col: 13 });
  const b = S.call('board', S.U('a@s'), 'class');
  eq(b.cats.xp.top.find(r => r.me).v, 450, "a student's own row is fresh even while the board cache is old");
}
{ const S = makeServer();
  const t = new Date(), r = [{ session: 'S1', mode: 'quiz', unit: '1', sec: '1.1', ans: 10, cor: 8, stars: 2, secs: 60, status: 'done', start: new Date(t - 60000).toISOString(), end: t.toISOString(), ids: '1.1#1', wrong: '' }];
  eq(S.call('newRecords', S.U('a@s'), r).length, 1, 'new records are accepted');
  S.call('appendRecords', S.U('a@s'), r);
  eq(S.call('newRecords', S.U('a@s'), r).length, 0, 'the same records sent again are ignored (no double counting)');
}
{ const S = makeServer();
  for (let i = 0; i < 1500; i++) rec(S, 'a@s', 400 - i * 0.001); for (let i = 0; i < 40; i++) rec(S, 'a@s', 20 - i * 0.4);
  const all = S.call('stats', 0), w = S.call('stats', 30);
  ok(all.records.length === 1540 && w.records.length < 400, 'teacher stats send only the recent window (' + w.records.length + ' of ' + all.records.length + ')');
  ok(w.seen['a@s'] && w.records.length > 0, 'last-active time is always complete');
}
{ const S = makeServer();
  const P = S.run('sheet(PROG,PROG_HEAD)') && S.sheets[S.run('PROG')];
  P.d.push(['a@s', new Date(), 8, 8, 22, 9, 0, 'mochi', 0, 0, 0, 0, day(0), JSON.stringify({ xpTotal: 0, pets: { mochi: { xp: 1700 }, sakura: { xp: 40 } } }), 0, 3, 0, 0, 0, '', '', '']);
  S.run('repairXp()');
  eq([P.d[1][14], JSON.parse(P.d[1][13]).xpTotal], [1740, 1740], 'repairXp restores Total XP from the pals');
}
console.log((fail ? 'FAILED ' : 'OK ') + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
