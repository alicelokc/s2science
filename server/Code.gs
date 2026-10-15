/**
 * Mochi Science Pals – class server (Google Apps Script web app)
 * ----------------------------------------------------------------
 * - Checks each Google sign-in (ID token) and looks the email up in the Users sheet.
 * - Saves quiz / study records and each student's game progress to the spreadsheet.
 * - Gives class statistics to staff accounts only.
 * - Co-op squads (Mochi Science Island) live in the second file, Coop.gs.
 *
 * Script Properties (Project Settings → Script properties):
 *   SHEET_ID        ID of the Google Sheet that holds the Users tab   (required)
 *   CLIENT_ID       Google OAuth Web client ID used by the game       (required)
 *   TEACHER_EMAILS  optional, comma-separated. If set, ONLY these emails can open the
 *                   teacher dashboard. If empty, every "教職員" user can.
 *   USERS_SHEET     optional, name of the users tab (default: 使用者 Users)
 */
var PROPS = PropertiesService.getScriptProperties();
var USERS_DEFAULT = '使用者 Users';
var REC = '科學記錄 Science Records';
var PROG = '科學進度 Science Progress';
var REC_HEAD = ['記錄時間 Timestamp', '練習編號 Session ID', '電郵 Email', '身分 Role', '班別 Class', '班號 Class No.',
  '中文姓名 Chinese Name', '英文姓名 English Name', '模式 Mode', '單元 Unit', '小節 Sub-topic', '已答題數 Answered',
  '答對題數 Correct', '準確率 Accuracy %', '星星 Stars', '用時(秒) Seconds', '狀態 Status', '語言 Language',
  '開始時間 Start', '結束時間 End', '題目 Question IDs', '答錯題目 Wrong IDs'];
var PROG_HEAD = ['電郵 Email', '更新時間 Updated', '連續日數 Streak', '最佳連續 Best streak', '星星 Stars', '寵物等級 Pet level',
  '金幣 Coins', '寵物 Pet', '測驗次數 Quizzes', '待清除錯題 Mistakes', '已清除錯題 Cleared', '獎盃 Trophies',
  '最後溫習日 Last study day', '進度資料 Data (do not edit)', '總經驗 Total XP', '收藏 Collection', '傳說 Legendary', '神話 Mythic',
  '諾貝爾火種 Nobel Sparks', '諾貝爾任務 Nobel tasks (per chapter)', '連勝有效日 Streak alive day', '凍結日 Freeze days'];
var DATA_COL = 14; // column N holds the saved game data
var MODES = { quiz: '測驗 Quiz', practice: '錯題練習 Mistake practice', study: '溫習筆記 Study notes', vocab: '詞彙跟讀 Vocab', match: '詞彙配對 Term Match',
  dict_listen: '默書（聽音）Dictation – listen', dict_meaning: '默書（看義／圖）Dictation – meaning/picture',
  speak: '朗讀 Read aloud', nobel: '諾貝爾大冒險 Nobel Quest' };
var STATUS = { done: '完成', quit: '中途結束' };

function doGet() {
  return out({ ok: true, app: 'Mochi Science Pals', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var v = verifyToken(body.token);
    if (!v.ok) return out(v);
    var user = findUser(v.email);
    if (!user) return out({ ok: false, error: 'not_listed' });
    switch (body.action) {
      case 'login': return out(loginResp(user));
      case 'save': return out(saveResp(user, body));
      case 'record':
        var fresh = newRecords(user, body.records || []); /* a resend after a lost reply must not count twice */
        var saved = appendRecords(user, fresh);
        try { coopEarn(user, fresh); } catch (e2) { }
        return out({ ok: true, saved: saved });
      case 'board': return out(board(user, body.scope === 'all' ? 'all' : 'class'));
      case 'stats':
        if (!user.teacher) return out({ ok: false, error: 'forbidden' });
        return out(stats(Number(body.days) || 0));
      default:
        if (/^coop[A-Z][a-zA-Z]*$/.test(String(body.action))) return out(coopAction(user, body));
        return out({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return out({ ok: false, error: 'server: ' + err });
  }
}

/* bump SERVER_VER whenever this file changes how data is saved or shown; the game warns teachers when the deployed copy is older */
var SERVER_VER = 5;
function out(o) { if (o && typeof o === 'object') o.sv = SERVER_VER; return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function book() { return SpreadsheetApp.openById(PROPS.getProperty('SHEET_ID')); }
function sheet(name, head) {
  var ss = book(), sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(head);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#FFF1C5');
  }
  return sh;
}
function clean(s, n) { return String(s == null ? '' : s).slice(0, n || 200).replace(/^[=+\-@\t\r]+/, ''); }
function num(x) { var n = Number(x); return isFinite(n) ? Math.max(0, Math.min(n, 10000000)) : 0; }
function when(s) { var d = new Date(s); return isNaN(d) ? '' : d; }

/** Verifies a Google ID token with Google and caches the result until it expires. */
function verifyToken(token) {
  if (!token) return { ok: false, error: 'no_token' };
  var cache = CacheService.getScriptCache();
  var key = 'tk_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 43);
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return { ok: false, error: 'expired' };
  var p = JSON.parse(r.getContentText());
  if (p.aud !== PROPS.getProperty('CLIENT_ID')) return { ok: false, error: 'bad_client' };
  if (String(p.email_verified) !== 'true') return { ok: false, error: 'unverified' };
  var left = Number(p.exp) - Math.floor(Date.now() / 1000);
  if (left <= 0) return { ok: false, error: 'expired' };
  var res = { ok: true, email: String(p.email).trim().toLowerCase() };
  cache.put(key, JSON.stringify(res), Math.max(1, Math.min(left, 3000)));
  return res;
}

function isStaffRole(role) { return /教職員|staff|teacher|老師/i.test(role); }
function findUser(email) {
  var cache = CacheService.getScriptCache(), c = cache.get('u_' + email);
  if (c) return JSON.parse(c);
  var sh = book().getSheetByName(PROPS.getProperty('USERS_SHEET') || USERS_DEFAULT);
  if (!sh) throw 'Users sheet not found';
  var v = sh.getDataRange().getValues();
  var teachers = (PROPS.getProperty('TEACHER_EMAILS') || '').toLowerCase().split(/[,\s]+/).filter(String);
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim().toLowerCase() !== email) continue;
    var role = String(v[i][1] || '');
    var u = {
      email: email, role: role, zh: String(v[i][2] || ''), en: String(v[i][3] || ''),
      cls: String(v[i][4] || ''), no: v[i][5] === '' || v[i][5] == null ? '' : String(v[i][5]),
      teacher: teachers.length ? teachers.indexOf(email) >= 0 : isStaffRole(role)
    };
    cache.put('u_' + email, JSON.stringify(u), 300);
    return u;
  }
  return null;
}

/* drop records this student already has (same session, mode, unit, sub-topic, start and end time) */
function recKey(session, mode, unit, sec, start, end) {
  var iso = function (v) { return v instanceof Date ? v.toISOString() : v ? new Date(v).toISOString() : ''; };
  try { return [String(session), String(mode), String(unit), String(sec), iso(start), iso(end)].join('|'); } catch (e) { return ''; }
}
function newRecords(u, recs) {
  if (!recs.length) return recs;
  var sh = book().getSheetByName(REC), seen = {};
  if (sh && sh.getLastRow() > 1) {
    var last = sh.getLastRow(), from = Math.max(2, last - 600);
    sh.getRange(from, 2, last - from + 1, 19).getValues().forEach(function (r) {
      if (String(r[1]).toLowerCase() === u.email) seen[recKey(r[0], r[7], r[8], r[9], r[17], r[18])] = 1;
    });
  }
  return recs.filter(function (r) {
    var k = recKey(clean(r.session, 40), MODES[r.mode] || clean(r.mode, 30), clean(r.unit, 10), clean(r.sec, 10), when(r.start), when(r.end));
    if (!k || seen[k]) return false;
    seen[k] = 1; return true;
  });
}
function appendRecords(u, recs) {
  if (!recs.length) return 0;
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = sheet(REC, REC_HEAD);
    var rows = recs.slice(0, 300).map(function (r) {
      var ans = num(r.ans), cor = Math.min(num(r.cor), ans || num(r.cor));
      return [new Date(), clean(r.session, 40), u.email, u.role, u.cls, u.no, u.zh, u.en,
        MODES[r.mode] || clean(r.mode, 30), clean(r.unit, 10), clean(r.sec, 10), ans, cor,
        ans ? Math.round(cor / ans * 100) : '', num(r.stars), num(r.secs), STATUS[r.status] || clean(r.status, 20),
        clean(r.lang, 12), when(r.start), when(r.end), clean(r.ids, 600), clean(r.wrong, 600)];
    });
    var start = sh.getLastRow() + 1;
    sh.getRange(start, 10, rows.length, 2).setNumberFormat('@'); // keep "1.1" as text
    sh.getRange(start, 1, rows.length, REC_HEAD.length).setValues(rows);
    return rows.length;
  } finally { lock.releaseLock(); }
}

function findRow(sh, email) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var col = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) if (String(col[i][0]).toLowerCase() === email) return i + 2;
  return -1;
}
/* every XP point is also added to a pal, so the pals' XP (and the saved xpTotal) is a floor for Total XP */
function stateXp(state) {
  try { var o = JSON.parse(state), n = 0; for (var id in (o.pets || {})) n += Number(o.pets[id] && o.pets[id].xp) || 0; return num(Math.max(n, Number(o.xpTotal) || 0)); } catch (e) { return 0; }
}
function saveProgress(u, state, s) {
  state = String(state || '');
  if (state.length > 49000) throw 'progress too large';
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = sheet(PROG, PROG_HEAD);
    if (sh.getLastColumn() < PROG_HEAD.length) {
      sh.getRange(1, 1, 1, PROG_HEAD.length).setValues([PROG_HEAD]).setFontWeight('bold').setBackground('#FFF1C5');
    }
    var r = findRow(sh, u.email), old = r > 0 ? sh.getRange(r, DATA_COL + 1, 1, 4).getValues()[0] : [0, 0, 0, 0];
    var frz = Array.isArray(s.frz) ? s.frz.map(function (d) { return clean(d, 10); }).filter(function (d) { return /^\d{4}-\d\d-\d\d$/.test(d); }).slice(-30).join(',') : '';
    var row = [u.email, new Date(), num(s.streak), num(s.best), num(s.stars), num(s.level), num(s.coins), clean(s.pet, 20),
      num(s.quizzes), num(s.mistakes), num(s.cleared), num(s.trophies), clean(s.lastDay, 12), state,
      Math.max(num(s.xp), stateXp(state), num(old[0])), Math.max(num(s.col), num(old[1])), Math.max(num(s.leg), num(old[2])), Math.max(num(s.myth), num(old[3])),
      num(s.sp), clean(s.nq, 40), clean(s.alive || s.lastDay, 12), frz];
    if (r < 0) r = sh.getLastRow() + 1;
    sh.getRange(r, 13).setNumberFormat('@');
    sh.getRange(r, DATA_COL + 6).setNumberFormat('@'); // keep "63,31,0,…" as text
    sh.getRange(r, DATA_COL + 7, 1, 2).setNumberFormat('@'); // keep the dates as text
    sh.getRange(r, 1, 1, row.length).setValues([row]);
  } finally { lock.releaseLock(); }
}
/* login: the saved progress + the days this student finished an activity (from Science Records),
   so the game can repair a streak that an old device overwrote */
function loginResp(user) {
  var r = { ok: true, user: user, progress: getProgress(user.email) };
  try { r.act = activeDays(user.email); } catch (e) { r.act = []; }
  return r;
}
/* save: never let an older copy (an old tab on another device) overwrite newer progress.
   "Newer" = later last-study day, then more active days. A restored save code sends force. */
function progMeta(s) { try { var o = JSON.parse(s); return { d: String(o.lastDay || ''), n: Number(o.days) || 0, xp: Number(o.xpTotal) || 0 }; } catch (e) { return null; } }
/* every time a save would lower a student's XP, the old copy is kept here so it can be restored by hand */
var BACKUP = '進度備份 Progress Backup', BACKUP_HEAD = ['時間 Time', '電郵 Email', '原因 Reason', '舊XP Old XP', '新XP New XP', '舊進度資料 Old data'];
function backupProgress(email, oldState, why, oldXp, newXp) {
  try {
    var sh = sheet(BACKUP, BACKUP_HEAD), keep = 3000;
    sh.appendRow([new Date(), email, why, oldXp, newXp, String(oldState).slice(0, 49000)]);
    var n = sh.getLastRow(); if (n > keep + 1) sh.deleteRows(2, n - keep - 1);
  } catch (e) { }
}
function saveResp(user, body) {
  var cur = getProgress(user.email);
  if (cur && !body.force) {
    var a = progMeta(cur), b = progMeta(String(body.state || ''));
    if (a && b && (a.d > b.d || (a.d === b.d && a.n > b.n))) return { ok: false, error: 'stale', progress: cur };
    /* XP only ever goes up: a copy with less XP is an old or empty copy – keep the cloud one and hand it back */
    if (a && b && b.xp < a.xp) { backupProgress(user.email, String(body.state || ''), 'blocked: lower XP', a.xp, b.xp); return { ok: false, error: 'stale', progress: cur }; }
  } else if (cur) {
    var a2 = progMeta(cur), b2 = progMeta(String(body.state || ''));
    if (a2 && b2 && b2.xp < a2.xp) backupProgress(user.email, cur, 'overwritten by forced save', a2.xp, b2.xp);
  }
  saveProgress(user, body.state, body.summary || {});
  try { coopTouch(user.email, String((body.summary || {}).lastDay || '')); } catch (e1) { }
  return { ok: true };
}
function activeDays(email) {
  var sh = book().getSheetByName(REC); if (!sh) return [];
  var last = sh.getLastRow(); if (last < 2) return [];
  var from = Math.max(2, last - 40000), n = last - from + 1, tz = Session.getScriptTimeZone() || 'Asia/Hong_Kong';
  var ts = sh.getRange(from, 1, n, 1).getValues(), em = sh.getRange(from, 3, n, 1).getValues(), stt = sh.getRange(from, 17, n, 1).getValues();
  var seen = {}, cut = new Date(Date.now() - 400 * 864e5);
  for (var i = 0; i < n; i++) {
    if (String(em[i][0]).toLowerCase() !== email || stt[i][0] !== STATUS.done) continue;
    var t = ts[i][0]; if (!(t instanceof Date)) t = new Date(t);
    if (isNaN(t.getTime()) || t < cut) continue;
    seen[Utilities.formatDate(t, tz, 'yyyy-MM-dd')] = 1;
  }
  return Object.keys(seen).sort();
}
function getProgress(email) {
  var sh = book().getSheetByName(PROG);
  if (!sh) return null;
  var r = findRow(sh, email);
  return r < 0 ? null : String(sh.getRange(r, DATA_COL).getValue() || '') || null;
}

/* days > 0: send only the records of the last `days` days (the sheet is appended in time order, so the start is found
   by binary search) – far less to read, send and draw. `seen` always carries every student's last activity time. */
function stats(days) {
  var ss = book();
  var uv = ss.getSheetByName(PROPS.getProperty('USERS_SHEET') || USERS_DEFAULT).getDataRange().getValues();
  var students = [];
  for (var i = 1; i < uv.length; i++) {
    if (!uv[i][0] || isStaffRole(String(uv[i][1] || ''))) continue;
    students.push({ email: String(uv[i][0]).trim().toLowerCase(), zh: String(uv[i][2] || ''), en: String(uv[i][3] || ''),
      cls: String(uv[i][4] || ''), no: uv[i][5] === '' || uv[i][5] == null ? '' : String(uv[i][5]) });
  }
  var rev = {}; for (var k in MODES) rev[MODES[k]] = k;
  var records = [], seen = {}, rs = ss.getSheetByName(REC);
  if (rs && rs.getLastRow() > 1) {
    var lastRow = rs.getLastRow(), first = 2, meta = rs.getRange(2, 1, lastRow - 1, 3).getValues();
    var ms = function (v) { return v instanceof Date ? v.getTime() : Date.parse(v) || 0; };
    meta.forEach(function (m) { var e = String(m[2]).toLowerCase(), t = ms(m[0]); if (t && (!seen[e] || t > seen[e])) seen[e] = t; });
    if (days > 0) {
      var cut = Date.now() - days * 864e5, lo = 0, hi = meta.length;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (ms(meta[mid][0]) < cut) lo = mid + 1; else hi = mid; }
      first = Math.max(2, 2 + lo - 300); /* small safety margin for rows that were uploaded a little late */
    }
    if (first <= lastRow) rs.getRange(first, 1, lastRow - first + 1, REC_HEAD.length).getValues().forEach(function (r) {
      var t = r[0] instanceof Date ? r[0].toISOString() : String(r[0]);
      records.push({ t: t, email: String(r[2]).toLowerCase(), mode: rev[r[8]] || String(r[8]), unit: String(r[9]), sec: String(r[10]),
        ans: r[11], cor: r[12], stars: r[14], secs: r[15], status: r[16] === STATUS.quit ? 'quit' : 'done', lang: r[17],
        ids: String(r[20] || ''), wrong: String(r[21] || '') });
    });
  }
  var progress = {}, ps = ss.getSheetByName(PROG);
  if (ps && ps.getLastRow() > 1) {
    var xs = ps.getLastColumn() > DATA_COL ? ps.getRange(2, DATA_COL + 1, ps.getLastRow() - 1, 2).getValues() : [];
    ps.getRange(2, 1, ps.getLastRow() - 1, DATA_COL - 1).getValues().forEach(function (r, i) {
      progress[String(r[0]).toLowerCase()] = { xp: Number(xs[i] && xs[i][0]) || 0, colN: Number(xs[i] && xs[i][1]) || 0, upd: r[1] instanceof Date ? r[1].toISOString() : '', streak: r[2], best: r[3], stars: r[4],
        level: r[5], coins: r[6], pet: r[7], quizzes: r[8], mistakes: r[9], cleared: r[10], trophies: r[11], lastDay: String(r[12] || '') };
    });
    try { boardRows().forEach(function (b) { if (progress[b.e]) { progress[b.e].streakNow = b.st; progress[b.e].xp = Math.max(progress[b.e].xp, b.xp); } }); } catch (e3) { }
    // Nobel Time Quest columns (S, T): Sparks and task bit-masks per chapter, e.g. "63,31,0,0,0,0"
    if (ps.getLastColumn() >= DATA_COL + 6) {
      var em = ps.getRange(2, 1, ps.getLastRow() - 1, 1).getValues();
      ps.getRange(2, DATA_COL + 5, ps.getLastRow() - 1, 2).getValues().forEach(function (r, i) {
        var p = progress[String(em[i][0]).toLowerCase()];
        if (p) { p.nqsp = num(r[0]); p.nq = String(r[1] || ''); }
      });
    }
  }
  var seenIso = {}; for (var se in seen) seenIso[se] = new Date(seen[se]).toISOString();
  return { ok: true, students: students, records: records, progress: progress, seen: seenIso, days: days || 0 };
}

/** Class leaderboard: top 20 students for effort (XP), current streak and collection.
 *  Shows each student's full name (Chinese name, or English name if blank). */
function fullName(zh, en) {
  zh = String(zh || '').trim();
  return zh || String(en || '').trim() || '?';
}
/* a Sheets date cell comes back as a Date object: always turn it into yyyy-MM-dd text before comparing days */
function dayText(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  return String(v || '').slice(0, 10);
}
function boardRowFrom(r, x, u, yest, tz, act) {
  x = x || [];
  var last = dayText(r[12], tz), alive = dayText(x[6], tz) || last;
  if (last > alive) alive = last;
  var game = alive >= yest ? Number(r[2]) || 0 : 0, rec = recStreak(act, String(x[7] || ''), alive, yest);
  return { e: String(r[0]).toLowerCase(), n: u.n, c: u.c, p: String(r[7] || ''), lv: Number(r[5]) || 0, xp: Number(x[0]) || 0,
    st: Math.max(game, rec), sr: rec, col: Number(x[1]) || 0, g: Number(x[2]) || 0, m: Number(x[3]) || 0 };
}
/* days with a finished activity, per student, from the Science Records tab (the record the game cannot overwrite) */
function actMap(tz) {
  var sh = book().getSheetByName(REC), A = {};
  if (!sh || sh.getLastRow() < 2) return A;
  var last = sh.getLastRow(), from = Math.max(2, last - 60000), n = last - from + 1;
  var ts = sh.getRange(from, 1, n, 1).getValues(), em = sh.getRange(from, 3, n, 1).getValues(), st = sh.getRange(from, 17, n, 1).getValues();
  for (var i = 0; i < n; i++) {
    if (st[i][0] !== STATUS.done) continue;
    var t = ts[i][0]; if (!(t instanceof Date)) t = new Date(t); if (isNaN(t.getTime())) continue;
    var e = String(em[i][0]).toLowerCase(); (A[e] || (A[e] = {}))[Utilities.formatDate(t, tz, 'yyyy-MM-dd')] = 1;
  }
  return A;
}
function prevDay(d) { var t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); }
/* same rule as the game: study days count, Streak-Freeze days bridge a gap but do not count */
function recStreak(days, frz, alive, yest) {
  if (!days) return 0;
  var ks = Object.keys(days).sort(), last = ks[ks.length - 1]; if (!last) return 0;
  if ((alive > last ? alive : last) < yest) return 0;
  var F = {}; String(frz || '').split(',').forEach(function (d) { if (d) F[d] = 1; });
  var n = 0, d = last;
  for (var g = 0; g < 800; g++) { if (days[d]) n++; else if (!F[d]) break; d = prevDay(d); }
  return n;
}
function boardYest(tz) { return Utilities.formatDate(new Date(Date.now() - 864e5), tz, 'yyyy-MM-dd'); }
function boardRows() {
  var cache = CacheService.getScriptCache(), hit = cache.get('board_rows5');
  if (hit) return JSON.parse(hit);
  var ss = book(), rows = [];
  var uv = ss.getSheetByName(PROPS.getProperty('USERS_SHEET') || USERS_DEFAULT).getDataRange().getValues();
  var info = {};
  for (var i = 1; i < uv.length; i++) {
    if (!uv[i][0] || isStaffRole(String(uv[i][1] || ''))) continue;
    info[String(uv[i][0]).trim().toLowerCase()] = { n: fullName(uv[i][2], uv[i][3]), c: String(uv[i][4] || '') };
  }
  var ps = ss.getSheetByName(PROG);
  if (ps && ps.getLastRow() > 1) {
    var n = ps.getLastRow() - 1;
    var a = ps.getRange(2, 1, n, DATA_COL - 1).getValues();
    var b = ps.getLastColumn() > DATA_COL ? ps.getRange(2, DATA_COL + 1, n, 8).getValues() : [];
    var tz = Session.getScriptTimeZone() || 'Asia/Hong_Kong', yest = boardYest(tz), A = {};
    try { A = actMap(tz); } catch (e) { }
    a.forEach(function (r, k) {
      var e = String(r[0]).toLowerCase(), u = info[e];
      if (u) rows.push(boardRowFrom(r, b[k], u, yest, tz, A[e]));
    });
  }
  cache.put('board_rows5', JSON.stringify(rows), 60);
  return rows;
}
/* the asking student's own row is always read fresh, so their own XP / items / streak never lag behind the cache */
function freshBoardRow(user) {
  try {
    var ps = book().getSheetByName(PROG); if (!ps) return null;
    var r = findRow(ps, user.email); if (r < 0) return null;
    var tz = Session.getScriptTimeZone() || 'Asia/Hong_Kong';
    var a = ps.getRange(r, 1, 1, DATA_COL - 1).getValues()[0], b = ps.getLastColumn() > DATA_COL ? ps.getRange(r, DATA_COL + 1, 1, 8).getValues()[0] : [];
    return boardRowFrom(a, b, { n: fullName(user.zh, user.en), c: String(user.cls || '') }, boardYest(tz), tz);
  } catch (e) { return null; }
}
function board(user, scope) {
  var all = boardRows(), mine = freshBoardRow(user);
  if (mine) { var at = -1; all.forEach(function (r, i) { if (r.e === mine.e) at = i; }); all = all.slice(); if (at >= 0) { mine.sr = all[at].sr || 0; mine.st = Math.max(mine.st, mine.sr); all[at] = mine; } else all.push(mine); }
  var rows = all.filter(function (r) { return scope === 'all' || r.c === user.cls; });
  function cat(key, extra) {
    var list = rows.filter(function (r) { return r[key] > 0; }).sort(function (x, y) { return y[key] - x[key] || y.xp - x.xp; });
    var top = list.slice(0, 20).map(function (r) {
      var o = { n: r.n, c: r.c, p: r.p, lv: r.lv, v: r[key], me: r.e === user.email };
      if (extra) { o.g = r.g; o.m = r.m; }
      return o;
    });
    var me = null;
    for (var i = 0; i < list.length; i++) if (list[i].e === user.email) { me = { rank: i + 1, v: list[i][key] }; break; }
    return { top: top, me: me };
  }
  return { ok: true, scope: scope, cats: { xp: cat('xp'), streak: cat('st'), col: cat('col', true) } };
}

/* ------------------------------------------------------------------------------------------------
 *  repairXp  –  run once from the Apps Script editor (select repairXp, press Run).
 *  Every XP point a student earns is also added to one of their pals, so a student's real XP is
 *  never less than the sum of their pals' XP stored in the saved game data (column N).
 *  For every student this raises "Total XP" (column O) and the saved xpTotal to that value if it is
 *  lower. It never lowers anything. The list of changes is written to the log and to the tab
 *  `XP修復紀錄 XP Repair Log` so you can see who was fixed.
 * ---------------------------------------------------------------------------------------------- */
function repairXp() {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var sh = book().getSheetByName(PROG);
    if (!sh || sh.getLastRow() < 2) { Logger.log('No progress rows.'); return; }
    var n = sh.getLastRow() - 1, emails = sh.getRange(2, 1, n, 1).getValues(), states = sh.getRange(2, DATA_COL, n, 2).getValues(), fixed = [];
    for (var i = 0; i < n; i++) {
      var raw = String(states[i][0] || ''), cur = Number(states[i][1]) || 0, o;
      if (!raw) continue;
      try { o = JSON.parse(raw); } catch (e) { continue; }
      var pets = o.pets || {}, sum = 0;
      for (var id in pets) sum += Number(pets[id] && pets[id].xp) || 0;
      var best = Math.max(sum, Number(o.xpTotal) || 0);
      if (best <= cur && (Number(o.xpTotal) || 0) >= best) continue;
      if (best > cur) sh.getRange(i + 2, DATA_COL + 1).setValue(best);
      if ((Number(o.xpTotal) || 0) < best) { o.xpTotal = best; var js = JSON.stringify(o); if (js.length <= 49000) sh.getRange(i + 2, DATA_COL).setValue(js); }
      fixed.push([new Date(), String(emails[i][0]), cur, best]);
    }
    if (fixed.length) {
      var lg = sheet('XP修復紀錄 XP Repair Log', ['時間 Time', '電郵 Email', '原本XP Before', '修復後XP After']);
      lg.getRange(lg.getLastRow() + 1, 1, fixed.length, 4).setValues(fixed);
    }
    CacheService.getScriptCache().remove('board_rows5');
    Logger.log('XP repaired for ' + fixed.length + ' student(s).');
  } finally { lock.releaseLock(); }
}
