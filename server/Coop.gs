/**
 * Mochi Science Island 麻糬科學島 – co-op squads (part of the class server)
 * ----------------------------------------------------------------------------
 * Add this as a SECOND script file called "Coop" in the same Apps Script project
 * as Code.gs, then deploy a new version of the web app.
 *
 * - Students on the Users list make squads of 2–4 (any class) with a 6-letter invite code.
 * - Correct quiz answers become building materials (soft cap: 30 a day at full rate,
 *   then slower materials + bonus coins).
 * - Squad days (every member studied) build the island; missed days bring the Fog.
 * - Daily Blueprint puzzle (one part per member, teammates can rescue), repair quizzes,
 *   a weekly Murk Raid and three end-of-term Wonders.
 * Data lives in the tab "合作小隊 Coop Squads" (one row per squad, JSON in the last column).
 * Script property COOP_PAUSE = 1 pauses the Fog (holidays / exams); teachers can toggle it in the game.
 */
var COOP_SQ = '合作小隊 Coop Squads';
var COOP_HEAD = ['小隊編號 Squad ID', '小隊名稱 Squad name', '邀請碼 Invite code', '成員 Members', '更新時間 Updated', '資料 Data (do not edit)'];
var COOP_TZ = 'Asia/Hong_Kong';
var COOP_CAP = 30, COOP_SOFT = 45, COOP_COINS = 100, COOP_MAXN = 4, COOP_REPAIRS = 3;
var COOP_B = { safety: 1, water: 2, green: 3, cell: 4, power: 5, part: 6 };
var COOP_ROLES = { chem: [2, 6], bio: [3, 4], phys: [5, 1], eng: [] };
var COOP_DECO = { lamp: 3, flag: 2, bench: 2, tree: 3, statue: 5, fountain: 6 };
var COOP_STARS = [7, 14, 30, 60];
/* building plots: the 6 science buildings can stand on any of 9 plots (the game draws them at these island coordinates).
   Plots closer than COOP_NEAR are neighbours; neighbouring pairs below form synergies. */
var COOP_PLOTXY = [[78, 128], [150, 96], [244, 92], [320, 138], [112, 188], [290, 190], [256, 142], [140, 150], [200, 214]];
var COOP_NEAR = 105;
var COOP_DEFPLOT = { safety: 0, water: 1, green: 2, cell: 3, power: 4, part: 5 };
var COOP_SYN = [
  { id: 'irrig', a: 'water', b: 'green', mats: [2, 3] },            /* irrigation: water for the plants */
  { id: 'clinic', a: 'safety', b: 'cell', mats: [1, 4] },           /* a safe, clean lab next to the clinic */
  { id: 'energy', a: 'power', b: 'part', mats: [5, 6] },            /* energy to heat and cool the particle lab */
  { id: 'pumps', a: 'power', b: 'water', mats: [5, 2], cap: 1 },    /* pumps need energy: +1 drainage on rainy nights */
  { id: 'health', a: 'water', b: 'cell', mats: [2, 4], health: 1 }  /* clean water keeps people healthy: +1 health a night */
];
var COOP_SYNBONUS = 0.1;

/* ---------- Island 3.0 "Living Island": every world constant in one place (tune here) ----------
   The world simulation runs automatically (weather comes from the date; nights resolve lazily in coopRoll).
   It is ON unless a teacher switches it off (Script property COOP_WORLD = 0).
   It never removes coins, XP, pets or materials already earned: it only moves the island meters,
   adds at most +1 Fog a night from a system crisis, and switches perks on/off. */
var COOP_WORLD = {
  opsDay: 2, opsCarry: 4, opsMax: 8,             // Ops (island action points): +2 on a study day, unspent Ops carry over up to 4
  start: { water: 70, health: 75 },
  okGain: 10, strained: -10, crisis: -25,        // meter change by result (uniform formula)
  floor: 15, floorMissed: 20, sysFog: 1, sysFogMax: 5,         // meters never fall below 15 (20 on nights with absent members); a crisis adds +1 Fog, but never beyond 5 (Murk's theft at 9+ stays a missed-study thing)
  rain: { calm: 0, cloudy: 0, lrain: 2, hrain: 5, storm: 7 },
  soil: 1, drainCap: 1.5, pondCap: 2, greenPave: 0.15, nature: 1,   /* soil soaks up a little; nature slowly flushes 1 pollution a night */    // capacity per module level; each Greenhouse level absorbs 15% of the runoff
  use: 3, resGain: 2,                            // daily water use (each reservoir level saves 1); reservoir bonus on a good rain night
  polCap: 10, polWater: 3, polGerm: 1.5, polClean: 1, illness: 6, fluor: 1,
  calmWater: 6, calmHealth: 3, storeGain: 5, maxLoss: { water: 30, health: 12 },
  tasksDay: 3, taskOps: 1, taskWater: 3, treatTries: 2,
  tutorial: ['calm', 'lrain', 'hrain', 'calm', 'cloudy', 'lrain', 'calm'],
  /* month weights for [calm, cloudy, light rain, heavy rain] (Hong Kong: wet Jun–Sep, dry Nov–Feb) */
  season: [[50, 35, 13, 2], [45, 38, 15, 2], [40, 35, 20, 5], [35, 30, 25, 10], [25, 30, 28, 17], [20, 25, 30, 25],
           [25, 20, 28, 27], [22, 20, 30, 28], [30, 22, 26, 22], [45, 30, 18, 7], [50, 32, 15, 3], [55, 32, 11, 2]]
};
/* water modules: [unit, amount per level] costs (scaled by squad size like buildings) */
var COOP_MOD = { drain: { max: 3, c: [[2, 15], [1, 10]] }, pond: { max: 2, c: [[2, 25], [3, 10]] }, res: { max: 3, c: [[2, 20], [6, 10]] },
  settle: { max: 1, c: [[2, 20], [6, 10]] }, filter: { max: 1, c: [[2, 20], [1, 10]] }, chlor: { max: 1, c: [[2, 20], [1, 15]] }, fluor: { max: 1, c: [[2, 15], [4, 10]] } };
var COOP_STAGES = ['settle', 'filter', 'chlor', 'fluor'];   /* Hong Kong water treatment works order (S1 2.5) */
/* prep actions: Ops cost and the id of the scientifically right reason (texts live in the game) */
var COOP_PREP = { drains: { ops: 1, right: 'd1', why: ['d1', 'd2', 'd3'] }, pond: { ops: 2, right: 'p1', why: ['p1', 'p2', 'p3'] }, store: { ops: 1, right: 's1', why: ['s1', 's2', 's3'] } };
/* task templates (content lives in the game): id -> syllabus section */
var COOP_TPL = { o_treat: '2.5', o_cycle: '2.2', o_distil: '2.4', o_filter: '2.4', o_heat: '2.1', o_method: '1.2',
  s_pollute: '2.6', s_separate: '2.4', s_soluble: '2.3', s_states: '2.1', s_energy: '2.1', s_treat: '2.5' };

function cDay(t) { return Utilities.formatDate(t || new Date(), COOP_TZ, 'yyyy-MM-dd'); }
function cAdd(d, n) { var p = d.split('-'); return Utilities.formatDate(new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n, 12)), 'UTC', 'yyyy-MM-dd'); }
function cDow(d) { var p = d.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12)).getUTCDay(); }
function cDiff(a, b) { var p = a.split('-'), q = b.split('-'); return Math.round((Date.UTC(+q[0], +q[1] - 1, +q[2]) - Date.UTC(+p[0], +p[1] - 1, +p[2])) / 864e5); }

/* ---------- storage ---------- */
function coopData() {
  var sh = sheet(COOP_SQ, COOP_HEAD), last = sh.getLastRow(), rows = [];
  if (last > 1) sh.getRange(2, 1, last - 1, COOP_HEAD.length).getValues().forEach(function (v, i) {
    if (!v[0]) return;
    var st; try { st = coopMigrate(JSON.parse(v[5])); } catch (e) { return; }
    rows.push({ r: i + 2, id: String(v[0]), name: String(v[1]), code: String(v[2]), st: st });
  });
  return { sh: sh, rows: rows };
}
function coopFind(D, email) { for (var i = 0; i < D.rows.length; i++) if (D.rows[i].st.m[email]) return D.rows[i]; return null; }
function coopWrite(D, row) {
  var mem = Object.keys(row.st.m).map(function (e) { var u = findUser(e); return u ? fullName(u.zh, u.en) : e; }).join('、');
  var vals = [[row.id, row.name, row.code, mem, new Date(), JSON.stringify(row.st)]];
  if (!row.r) { row.r = D.sh.getLastRow() + 1; D.rows.push(row); }
  D.sh.getRange(row.r, 1, 1, COOP_HEAD.length).setValues(vals);
}
function coopDelete(D, row) {
  D.sh.deleteRow(row.r);
  D.rows = D.rows.filter(function (x) { return x !== row; });
  D.rows.forEach(function (x) { if (x.r > row.r) x.r--; });
}
function coopProp(k, def) { try { return JSON.parse(PROPS.getProperty(k) || def); } catch (e) { return JSON.parse(def); } }
function coopPaused() { return PROPS.getProperty('COOP_PAUSE') === '1'; }

/* ---------- squad state ---------- */
function coopNewState() {
  var t = cDay();
  return { v: 2, w: coopWorldNew(), plot: {}, m: {}, mats: [0, 0, 0, 0, 0, 0, 0], bp: 0, spark: 0, crys: 0, star: 0,
    bld: { safety: 0, water: 0, green: 0, cell: 0, power: 0, part: 0, obs: 0, museum: 0, light: 0 },
    con: null, fog: 0, fogB: null, frz: 1, blk: false, streak: 0, best: 0, sg: [], day: cAdd(t, -1), wk: {}, puz: null, log: [], deco: {}, prize: false, created: t };
}
function coopMember(role) { return { role: role || '', joined: cDay(), days: [], dk: '', dm: 0, fr: 0, soft: 0, dc: 0, owe: 0, rep: { d: '', n: 0 }, tot: 0 }; }
function coopLog(st, k, x) { st.log.unshift({ d: cDay(), k: k, x: x || '' }); if (st.log.length > 25) st.log.length = 25; }
function coopMark(st, e, d) {
  var m = st.m[e], added = false; if (!m || !d) return false;
  if (m.days.indexOf(d) < 0) { m.days.push(d); m.days.sort(); if (m.days.length > 21) m.days = m.days.slice(-21); added = true; }
  if (coopOpsSync(st, e)) added = true;
  return added;
}
function coopFactor(st) { return Math.max(0.5, Object.keys(st.m).length / 4); }

/* building costs (materials scale with squad size; blueprints and stars do not) */
function coopCost(st, b, lv) {
  var f = coopFactor(st), c = { mats: [0, 0, 0, 0, 0, 0, 0], bp: 0, star: 0, spark: 0, crys: 0, need: 1 };
  function m(u, n) { c.mats[u] += Math.round(n * f); }
  if (COOP_B[b]) {
    var u = COOP_B[b], a = u % 6 + 1, z = (u + 1) % 6 + 1;
    if (lv === 1) { m(u, 40); c.bp = 1; c.need = 1; }
    if (lv === 2) { m(u, 120); m(a, 40); m(z, 40); c.bp = 3; c.need = 3; }
    if (lv === 3) { m(u, 250); m(a, 80); m(z, 80); c.bp = 5; c.star = 1; c.need = 5; }
    if (st.bld.power >= 2) c.need = Math.max(1, c.need - 1);
  } else if (b === 'obs') { c.bp = 3; c.spark = 10; c.need = 5; }
  else if (b === 'museum') { for (var k = 1; k <= 6; k++) m(k, 50); c.star = 2; c.need = 5; }
  else if (b === 'light') { c.star = 3; c.spark = 10; c.crys = 20; c.need = 7; }
  return c;
}
function coopReqOk(st, b) {
  var all = ['safety', 'water', 'green', 'cell', 'power', 'part'];
  if (b === 'obs' || b === 'museum') return all.every(function (k) { return st.bld[k] >= 2; });
  if (b === 'light') return all.every(function (k) { return st.bld[k] >= 3; });
  return true;
}

/* ---------- daily roll-over: squad days, Fog, freezes, construction, stars, Sunday raid ---------- */
function coopRoll(row) {
  var st = row.st, today = cDay(), changed = false, n = 0, paused = coopPaused();
  while (st.day < cAdd(today, -1) && n < 31) {
    var d = cAdd(st.day, 1); n++; changed = true; st.day = d;
    var mem = Object.keys(st.m).filter(function (e) { return st.m[e].joined <= d; });
    if (cDow(d) === 1) { st.frz = 1 + (st.bld.safety >= 3 ? 1 : 0); st.blk = false; }
    if (!mem.length || paused) continue;
    if (st.inc && st.inc.d === d && !st.inc.done && COOP_INC[st.inc.id] && COOP_INC[st.inc.id].m >= 0) {   /* the minion escapes */
      st.inc.esc = 1; coopLog(st, 'incesc', st.inc.id);
      if (coopWorldOn() && st.w) st.w.pol = Math.min(COOP_WORLD.polCap, st.w.pol + 1);
    }
    var absent = mem.filter(function (e) { return st.m[e].days.indexOf(d) < 0; });
    if (!absent.length) {
      st.streak++; st.best = Math.max(st.best, st.streak);
      COOP_STARS.forEach(function (s) { if (st.streak === s && st.sg.indexOf(s) < 0) { st.sg.push(s); st.star++; coopLog(st, 'star', s); } });
      if (st.con) { st.con.done++; if (st.con.done >= st.con.need) { st.bld[st.con.b] = st.con.lv; coopLog(st, 'built', st.con.b + ':' + st.con.lv); if (st.con.b === 'light') st.prize = true; st.con = null; } }
    } else {
      st.streak = 0;
      if (st.frz > 0) { st.frz--; coopLog(st, 'freeze', absent.length); }
      else {
        var hit = absent.length;
        if (st.bld.safety >= 2 && !st.blk) { st.blk = true; hit--; coopLog(st, 'block', ''); }
        if (hit > 0) { st.fog = Math.min(10, st.fog + hit); coopLog(st, 'fog', hit); }
      }
    }
    if (st.bld.water >= 1 && st.fog > 0 && absent.length === 0 && (!coopWorldOn() || st.w.water >= 30)) st.fog--;
    if (st.fog >= 9) { for (var u = 1; u <= 6; u++) st.mats[u] -= Math.floor(st.mats[u] * 0.05); coopLog(st, 'steal', ''); }
    if (cDow(d) === 0) {
      var c = 0; for (var k = 0; k < 7; k++) c += (st.wk[cAdd(d, -k)] || 0);
      var need = 120 * mem.length;
      if (c >= need) { st.crys += 3; coopLog(st, 'raidwin', c + '/' + need); }
      else { st.fog = Math.min(10, st.fog + 3); coopLog(st, 'raidlose', c + '/' + need); }
    }
    coopFogB(st);
    if (coopWorldOn()) coopWorldTick(st, d, absent.length);
  }
  Object.keys(st.wk).forEach(function (k) { if (cDiff(k, today) > 14) delete st.wk[k]; });
  return changed;
}
function coopFogB(st) {
  if (st.fog < 3) { st.fogB = null; return; }
  if (st.fogB && st.bld[st.fogB] > 0) return;
  var built = Object.keys(COOP_B).filter(function (k) { return st.bld[k] > 0; });
  st.fogB = built.length ? built[Math.floor(Math.random() * built.length)] : null;
}

/* ---------- materials from quizzes (called from the record action) ---------- */
function coopEarn(u, recs) {
  var ok = recs.filter(function (r) { return /^(quiz|practice|dict_listen|dict_meaning)$/.test(String(r.mode)) && /^[1-6]$/.test(String(r.unit)) && num(r.cor) > 0; });
  var today = cDay(), D = null, lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    D = coopData(); var row = coopFind(D, u.email);
    if (!row) return;
    coopRoll(row);
    var st = row.st;
    coopMark(st, u.email, today);
    if (ok.length) {
      var m = st.m[u.email];
      if (m.dk !== today) { m.dk = today; m.dm = 0; m.soft = 0; m.dc = 0; }
      var syn = coopSyn(st);
      ok.forEach(function (r) {
        var un = Number(r.unit), cor = Math.min(num(r.cor), 30), mul = (COOP_ROLES[m.role] && COOP_ROLES[m.role].indexOf(un) >= 0 ? 1.5 : m.role === 'eng' ? 1.2 : 1) * coopSynMul(syn, un);
        st.wk[today] = (st.wk[today] || 0) + cor;
        for (var i = 0; i < cor; i++) {
          if (m.dm < COOP_CAP) { m.fr += mul; var g = Math.floor(m.fr); m.fr -= g; st.mats[un] += g; m.dm += g; m.tot += g; }
          else {
            m.soft++;
            if (m.soft % 3 === 0 && m.dm < COOP_SOFT) { st.mats[un]++; m.dm++; m.tot++; }
            if (m.dc < COOP_COINS) { m.owe += 2; m.dc += 2; }
          }
        }
      });
    }
    coopWrite(D, row);
  } finally { lock.releaseLock(); }
}
/* a study day reported by the normal save also counts as a squad day for that member */
function coopTouch(email, lastDay) {
  if (!lastDay || lastDay !== cDay()) return;
  var cache = CacheService.getScriptCache(), key = 'ct_' + email + '_' + lastDay;
  if (cache.get(key)) return;
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var D = coopData(), row = coopFind(D, email);
    if (row) { coopRoll(row); coopMark(row.st, email, lastDay); coopWrite(D, row); }
    cache.put(key, '1', 21600);
  } finally { lock.releaseLock(); }
}

/* ---------- actions from the game ---------- */
function coopAction(u, b) {
  if (b.action === 'coopAll') { if (!u.teacher) return { ok: false, error: 'forbidden' }; return coopAll(); }
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var D = coopData(), row = coopFind(D, u.email), today = cDay(), err = null, extra = {};
    if (row && (coopRoll(row) | coopOpsSync(row.st, u.email) | (coopWorldOn() && coopTaskEnsure(row)) | coopIncEnsure(row))) coopWrite(D, row);
    var cool = 0; /* no time lock: anyone can leave and join/create a squad straight away */
    switch (b.action) {
      case 'coopGet': break;
      case 'coopCreate':
        if (row) { err = 'in_squad'; break; }
        var code; do { code = coopCode(); } while (D.rows.some(function (x) { return x.code === code; }));
        row = { id: 'S' + Date.now().toString(36), name: clean(b.name, 24) || 'Squad', code: code, st: coopNewState() };
        row.st.m[u.email] = coopMember(b.role); row.st.host = u.email; coopMark(row.st, u.email, b.studied ? today : '');
        coopLog(row.st, 'create', ''); coopWrite(D, row); break;
      case 'coopJoin':
        if (row) { err = 'in_squad'; break; }
        var c2 = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), t = null;
        D.rows.forEach(function (x) { if (x.code === c2) t = x; });
        if (!t) { err = 'no_code'; break; }
        if (Object.keys(t.st.m).length >= COOP_MAXN) { err = 'full'; break; }
        coopRoll(t); t.st.m[u.email] = coopMember(b.role); if (b.studied) coopMark(t.st, u.email, today);
        coopLog(t.st, 'join', fullName(u.zh, u.en)); coopWrite(D, t); row = t; break;
      case 'coopLeave':
        if (!row) break;
        /* host leaving = deleting the room (needs b.disband); a teammate just leaves and her squad progress stays here, never transfers */
        if (coopHost(row) === u.email && (b.disband || Object.keys(row.st.m).length <= 1)) { coopDelete(D, row); row = null; break; }
        /* a host on an older page (no disband flag) just hands the squad to the next member and leaves – nothing is lost */
        if (coopHost(row) === u.email) { delete row.st.m[u.email]; row.st.host = Object.keys(row.st.m)[0]; coopLog(row.st, 'leave', fullName(u.zh, u.en)); coopWrite(D, row); row = null; break; }
        delete row.st.m[u.email]; coopLog(row.st, 'leave', fullName(u.zh, u.en));
        if (!Object.keys(row.st.m).length) coopDelete(D, row); else coopWrite(D, row);
        row = null; break;
      case 'coopRole':
        if (!row || !COOP_ROLES[b.role]) { err = 'bad'; break; }
        row.st.m[u.email].role = b.role; coopWrite(D, row); break;
      case 'coopBuild': err = row ? coopBuild(row.st, String(b.b), b.plot) : 'no_squad'; if (!err) coopWrite(D, row); break;
      case 'coopMove': err = row ? coopMove(row.st, String(b.b), b.plot) : 'no_squad'; if (!err) coopWrite(D, row); break;
      case 'coopPuzzle': err = row ? coopPuzzle(row.st, u, b) : 'no_squad'; if (!err) coopWrite(D, row); break;
      case 'coopRepair': err = row ? coopRepair(row.st, u.email, b) : 'no_squad'; if (!err) coopWrite(D, row); break;
      case 'coopTrade': err = row ? coopTrade(row.st, b) : 'no_squad'; if (!err) coopWrite(D, row); break;
      case 'coopForge': err = row ? coopForge(row.st, b) : 'no_squad'; if (!err) coopWrite(D, row); break;
      case 'coopDeco': err = row ? coopDeco(row.st, b) : 'no_squad'; if (!err) coopWrite(D, row); break;
      case 'coopClaim':
        if (row) { extra.coins = row.st.m[u.email].owe || 0; row.st.m[u.email].owe = 0; coopWrite(D, row); } break;
      case 'coopPrep': err = row ? coopPrep(row.st, u.email, b, extra) : 'no_squad'; if (!err) coopWrite(D, row); break;
      case 'coopMod': err = row ? coopMod(row.st, String(b.m)) : 'no_squad'; if (!err) coopWrite(D, row); break;
      case 'coopTreat': err = row ? coopTreat(row.st, b, extra) : 'no_squad'; if (!err) coopWrite(D, row); break;
      case 'coopTask': err = row ? coopTask(row.st, u.email, b, extra) : 'no_squad'; if (!err) coopWrite(D, row); break;
      case 'coopInc': err = row ? coopInc(row.st, u.email, b, extra) : 'no_squad'; if (!err) coopWrite(D, row); break;
      case 'coopWorld':
        if (!u.teacher) { err = 'forbidden'; break; }
        PROPS.setProperty('COOP_WORLD', b.on ? '1' : '0'); break;
      case 'coopMode':
        if (!u.teacher) { err = 'forbidden'; break; }
        PROPS.setProperty('COOP_MODE', b.mode === 'gentle' ? 'gentle' : 'standard'); break;
      case 'coopPause':
        if (!u.teacher) { err = 'forbidden'; break; }
        PROPS.setProperty('COOP_PAUSE', b.on ? '1' : '0'); break;
      case 'coopKick':
        if (!u.teacher) { err = 'forbidden'; break; }
        D.rows.forEach(function (x) { if (x.id === b.id && x.st.m[b.email]) { delete x.st.m[b.email]; coopLog(x.st, 'kick', ''); if (Object.keys(x.st.m).length) coopWrite(D, x); else coopDelete(D, x); } });
        row = coopFind(D, u.email); break;
      default: err = 'unknown_action';
    }
    if (row && row.st && (coopPuzzleEnsure(row.st) | (coopWorldOn() && coopTaskEnsure(row)) | coopIncEnsure(row)) ) coopWrite(D, row);
    var res = coopView(u, row, cool);
    if (err) { res.ok = false; res.error = err; }
    for (var k in extra) res[k] = extra[k];
    return res;
  } finally { lock.releaseLock(); }
}
/* the squad's host: whoever created it (older squads: the first member) */
function coopHost(row) { var m = Object.keys(row.st.m); return row.st.host && row.st.m[row.st.host] ? row.st.host : m[0]; }
function coopCode() { var a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 6; i++) s += a.charAt(Math.floor(Math.random() * a.length)); return s; }
function coopPrune(left, today) { for (var e in left) if (cDiff(left[e], today) > 8) delete left[e]; return left; }

function coopBuild(st, b, plot) {
  if (st.con) return 'busy';
  var lv = (st.bld[b] || 0) + 1, wonder = !COOP_B[b];
  if (st.bld[b] == null) return 'bad';
  if ((wonder && lv > 1) || lv > 3) return 'max';
  if (!coopReqOk(st, b)) return 'locked';
  var c = coopCost(st, b, lv);
  for (var u = 1; u <= 6; u++) if (st.mats[u] < c.mats[u]) return 'short';
  if (st.bp < c.bp || st.star < c.star || st.spark < c.spark || st.crys < c.crys) return 'short';
  if (COOP_B[b] && st.plot[b] == null) {
    var pl = plot == null || plot === '' ? coopFreePlot(st, b) : Number(plot);
    if (!(pl >= 0 && pl < COOP_PLOTXY.length) || coopPlotUsed(st, pl)) return 'plot';
    st.plot[b] = pl;
  }
  for (var k = 1; k <= 6; k++) st.mats[k] -= c.mats[k];
  st.bp -= c.bp; st.star -= c.star; st.spark -= c.spark; st.crys -= c.crys;
  st.con = { b: b, lv: lv, need: c.need, done: 0, since: cDay() };
  coopLog(st, 'start', b + ':' + lv); return null;
}
/* one Blueprint puzzle a day: one part per member (at least 2); a wrong part can be rescued by a teammate */
function coopPuzzleEnsure(st) {
  var today = cDay();
  if (st.puz && st.puz.day === today) return coopPuzzleShare(st);
  var mem = Object.keys(st.m), n = Math.max(2, mem.length), u = st.con && COOP_B[st.con.b] ? COOP_B[st.con.b] : (cDiff('2026-01-05', today) % 6 + 6) % 6 + 1;
  var parts = []; for (var i = 0; i < n; i++) parts.push({ e: mem[i % mem.length], ok: null, by: '', tried: [] });
  st.puz = { day: today, u: u, seed: Math.floor(Math.random() * 100000), parts: parts, done: false };
  return true;
}
/* members who joined (or left) after today's puzzle was made: give every member one part */
function coopPuzzleShare(st) {
  var p = st.puz, mem = Object.keys(st.m), changed = false;
  if (p.done) return false;
  var count = function (e) { return p.parts.filter(function (x) { return x.e === e; }).length; };
  p.parts.forEach(function (x) { if (x.ok === null && !st.m[x.e]) { x.e = mem.filter(function (e) { return !count(e); })[0] || mem[0]; changed = true; } });
  mem.forEach(function (e) {
    if (count(e)) return;
    var spare = p.parts.filter(function (x) { return x.ok === null && count(x.e) > 1; })[0];
    if (spare) spare.e = e; else p.parts.push({ e: e, ok: null, by: '', tried: [] });
    changed = true;
  });
  return changed;
}
function coopPuzzle(st, u, b) {
  coopPuzzleEnsure(st);
  var p = st.puz.parts[Number(b.i)], ok = !!b.ok;
  if (!p) return 'bad';
  if (!b.rescue) {
    if (p.e !== u.email || p.ok !== null) return 'bad';
    p.ok = ok;
  } else {
    if (p.ok !== false || p.e === u.email || p.tried.indexOf(u.email) >= 0) return 'bad';
    p.tried.push(u.email);
    if (ok) { p.ok = true; p.by = fullName(u.zh, u.en); st.spark++; coopLog(st, 'rescue', p.by); }
  }
  coopMark(st, u.email, cDay());
  if (!st.puz.done && st.puz.parts.every(function (x) { return x.ok === true; })) { st.puz.done = true; st.bp++; coopLog(st, 'blueprint', ''); }
  return null;
}
function coopRepair(st, email, b) {
  var m = st.m[email], today = cDay();
  if (st.fog <= 0) return 'no_fog';
  if (m.rep.d !== today) m.rep = { d: today, n: 0 };
  if (m.rep.n >= COOP_REPAIRS) return 'limit';
  var need = st.bld.safety >= 1 ? 4 : 5, cor = num(b.cor);
  m.rep.n++;
  if (cor < need - 1) return null;
  var clear = (st.bld.water >= 2 ? 4 : 2) + (m.role === 'eng' ? 1 : 0);
  st.fog = Math.max(0, st.fog - clear); st.crys += 1 + (st.bld.water >= 3 ? 1 : 0);
  coopFogB(st); coopLog(st, 'repair', clear); return null;
}
function coopTrade(st, b) {
  if (st.bld.part < 1) return 'locked';
  var f = Number(b.from), t = Number(b.to), n = Math.max(1, Math.min(50, Math.floor(num(b.n)))), rate = st.bld.part >= 2 ? 2 : 3;
  if (!(f >= 1 && f <= 6 && t >= 1 && t <= 6) || f === t) return 'bad';
  if (st.mats[f] < rate * n) return 'short';
  st.mats[f] -= rate * n; st.mats[t] += n; return null;
}
function coopForge(st, b) {
  if (st.bld.part < 3) return 'locked';
  var f = Number(b.from); if (!(f >= 1 && f <= 6)) return 'bad';
  if (st.mats[f] < 60) return 'short';
  st.mats[f] -= 60; st.bp++; coopLog(st, 'forge', ''); return null;
}
function coopDeco(st, b) {
  var it = String(b.item), slot = Math.floor(num(b.slot));
  if (!COOP_DECO[it] || slot > 5) return 'bad';
  if (st.crys < COOP_DECO[it]) return 'short';
  st.crys -= COOP_DECO[it]; st.deco[slot] = it; return null;
}

/* ---------- what the game sees ---------- */
function coopView(u, row, cool) {
  var res = { ok: true, ver: 3, pause: coopPaused(), cool: cool || 0, today: cDay(), squad: null, wOn: coopWorldOn(), wMode: coopMode() };
  if (!row) return res;
  var st = row.st, pets = coopPets(), mem = Object.keys(st.m), idx = {};
  mem.forEach(function (e, i) { idx[e] = i; });
  var today = cDay(), sun = cAdd(today, (7 - cDow(today)) % 7), wc = 0;
  for (var k = 0; k < 7; k++) { var d = cAdd(sun, -k); if (d <= today) wc += (st.wk[d] || 0); }
  var me = st.m[u.email] || {};
  res.squad = {
    id: row.id, name: row.name, code: row.code, n: mem.length, host: coopHost(row) === u.email,
    members: mem.map(function (e) { var x = findUser(e) || {}, m = st.m[e]; return { n: fullName(x.zh, x.en), c: x.cls || '', p: pets[e] || 'mochi', role: m.role, today: m.days.indexOf(today) >= 0, me: e === u.email, tot: m.tot }; }),
    mats: st.mats, bp: st.bp, spark: st.spark, crys: st.crys, star: st.star, bld: st.bld, con: st.con, fog: st.fog, fogB: st.fogB,
    frz: st.frz, streak: st.streak, best: st.best, log: st.log, deco: st.deco, prize: st.prize,
    wk: { c: wc, need: 120 * mem.length, left: cDiff(today, sun) },
    puz: st.puz ? { day: st.puz.day, u: st.puz.u, seed: st.puz.seed, done: st.puz.done, parts: st.puz.parts.map(function (p) { return { who: idx[p.e], mine: p.e === u.email, ok: p.ok, by: p.by, tried: p.tried.indexOf(u.email) >= 0 }; }) } : null,
    me: { dm: me.dk === today ? me.dm : 0, dc: me.dk === today ? me.dc : 0, owe: me.owe || 0, rep: me.rep && me.rep.d === today ? me.rep.n : 0, role: me.role || '' },
    costs: coopCosts(st), plot: st.plot || {}, syn: coopSyn(st).map(function (y) { return y.id; }),
    inc: coopIncView(st, u.email, idx), mon: st.mon || {}
  };
  if (res.wOn) res.squad.world = coopWorldView(row, u.email);
  return res;
}
function coopCosts(st) {
  var out = {};
  Object.keys(st.bld).forEach(function (b) { var lv = st.bld[b] + 1; if ((COOP_B[b] && lv <= 3) || (!COOP_B[b] && lv === 1)) { out[b] = coopCost(st, b, lv); out[b].req = coopReqOk(st, b); } });
  return out;
}
function coopPets() {
  var p = {}; try { boardRows().forEach(function (r) { p[r.e] = r.p; }); } catch (e) { }
  return p;
}
function coopAll() {
  var D = coopData();
  return { ok: true, pause: coopPaused(), wOn: coopWorldOn(), wMode: coopMode(), today: cDay(), squads: D.rows.map(function (row) {
    var st = row.st, w = st.w || {}, r0 = (w.rep || [])[0];
    return { id: row.id, name: row.name, code: row.code, streak: st.streak, best: st.best, fog: st.fog, bld: st.bld, con: st.con, prize: st.prize,
      water: w.water, health: w.health, crisis: !!(r0 && r0.res === 'crisis' && r0.d === cAdd(cDay(), -1)),
      members: Object.keys(st.m).map(function (e) { var x = findUser(e) || {}; return { e: e, n: fullName(x.zh, x.en), c: x.cls || '', role: st.m[e].role, tot: st.m[e].tot, days: st.m[e].days.length, last: st.m[e].days[st.m[e].days.length - 1] || '' }; }) };
  }) };
}

/* =====================================================================================
   Island 3.0 "Living Island" – Phase 1: shared weather + the water system
   ===================================================================================== */
function coopWorldOn() { return PROPS.getProperty('COOP_WORLD') !== '0'; }   /* on by default; a teacher can switch it off (COOP_WORLD = 0) */
function coopMode() { return PROPS.getProperty('COOP_MODE') === 'gentle' ? 'gentle' : 'standard'; }
function coopWorldNew() {
  return { t0: '', water: COOP_WORLD.start.water, health: COOP_WORLD.start.health, pol: 0, miss: 0, rec: '',
    mod: { drain: 1, pond: 0, res: 0, settle: 0, filter: 0, chlor: 0, fluor: 0 }, eff: 0.5, ord: null, tv: 0, tdone: -1, tt: { d: '', n: 0 },
    prep: null, rep: [], cdx: [], task: null, seen: {}, cm: {} };
}
/* old squads (v1) get the world defaults; nothing else changes */
function coopMigrate(st) {
  if (!st.w) st.w = coopWorldNew();
  if (!st.plot) { st.plot = {}; for (var k in COOP_B) if (st.bld[k] > 0 || (st.con && st.con.b === k)) st.plot[k] = COOP_DEFPLOT[k]; }
  if (!st.v || st.v < 2) st.v = 2;
  return st;
}
function cAddF(d, n) { var p = d.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n, 12)).toISOString().slice(0, 10); }
function coopHash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h = (h ^ s.charCodeAt(i)) >>> 0; h = Math.imul(h, 16777619) >>> 0; } h = (h ^ (h >>> 13)) >>> 0; h = Math.imul(h, 2246822519) >>> 0; h = (h ^ (h >>> 16)) >>> 0; return h / 4294967296; }   /* always 0 ≤ x < 1 */

/* ---------- deterministic class-wide weather (same for every squad on the same Hong Kong date) ---------- */
var COOP_WX0 = '2026-01-01', COOP_WXM = {};
function coopWxRaw(d) {
  var wt = COOP_WORLD.season[+d.slice(5, 7) - 1], r = coopHash('wx' + d) * 100, t = ['calm', 'cloudy', 'lrain', 'hrain'], i = 0, a = 0;
  for (i = 0; i < 4; i++) { a += wt[i]; if (r < a) break; }
  var type = t[Math.min(i, 3)], wet = +d.slice(5, 7) >= 6 && +d.slice(5, 7) <= 9;
  return { t: type, sev: type === 'hrain' ? (coopHash('sv' + d) < (wet ? 0.35 : 0.15) ? 3 : 2) : type === 'lrain' ? 1 : 0 };
}
/* mercy: never two severe days in a row, at most 2 severe days in any 7 */
function coopWx(d) {
  if (COOP_WXM[d]) return COOP_WXM[d];
  if (d < COOP_WX0) { var r0 = coopWxRaw(d); return r0.sev >= 2 ? { t: 'lrain', sev: 1 } : r0; }
  var x = COOP_WX0, hist = [];
  for (var guard = 0; guard < 4000; guard++) {
    var w = COOP_WXM[x];
    if (!w) {
      w = coopWxRaw(x);
      var c6 = hist.slice(-6).filter(Boolean).length;
      if (w.sev >= 2 && (hist[hist.length - 1] || c6 >= 2)) w = { t: 'lrain', sev: 1 };
      COOP_WXM[x] = w;
    }
    hist.push(w.sev >= 2);
    if (x === d) return w;
    x = cAddF(x, 1);
  }
  return { t: 'calm', sev: 0 };
}
/* what a squad actually gets: 7-day tutorial for new worlds, a recovery day after a crisis */
function coopSqWx(st, d) {
  var w = st.w, t0 = w.t0 || cDay(), i = cDiff(t0, d);
  var x = i >= 0 && i < 7 ? { t: COOP_WORLD.tutorial[i], tut: i + 1 } : coopWx(d);
  if (x.tut) x.sev = x.t === 'hrain' ? 2 : x.t === 'lrain' ? 1 : 0;
  if (w.rec === d && x.sev >= 1) return { t: 'cloudy', sev: 0, rec: 1 };
  return x;
}
function coopRain(x) { var R = COOP_WORLD.rain; return x.t === 'hrain' ? (x.sev >= 3 ? R.storm : R.hrain) : (R[x.t] || 0); }
function coopCdx(w, id) { if (w.cdx.indexOf(id) < 0 && w.cdx.length < 80) { w.cdx.push(id); return true; } return false; }
function coopClamp(v, lo) { return Math.max(lo, Math.min(100, Math.round(v))); }

/* ---------- the night tick for day d (inside coopRoll, so it is lazy and covers missed days) ---------- */
function coopWorldTick(st, d, absentN) {
  var W = COOP_WORLD, w = st.w;
  if (!w.t0) w.t0 = d;
  var wx = coopSqWx(st, d), gentle = coopMode() === 'gentle';
  var pave = Math.max(0.4, 1 - W.greenPave * (st.bld.green || 0));
  var load = coopRain(wx) * pave * (gentle ? 0.5 : 1);
  var prep = w.prep && w.prep.d === d ? w.prep.a : {};
  var fogPen = st.fog >= 6 ? 1 : st.fog >= 3 ? 0.5 : 0;
  var syn = coopSyn(st), synCap = 0, synH = 0; syn.forEach(function (y) { synCap += y.cap || 0; synH += y.health || 0; });
  var cap = Math.max(0, synCap + W.soil + (w.mod.drain + (prep.drains || 0)) * W.drainCap + (w.mod.pond + (prep.pond || 0)) * W.pondCap - fogPen);
  var half = absentN > 0 ? 0.5 : 1, dW = 0, dH = 0, res = 'calm', excess = 0, fogAdd = 0;
  if (load > 0) {
    var ratio = cap / load;
    res = ratio >= 1 ? 'ok' : ratio >= 0.6 ? 'strained' : 'crisis';
    excess = Math.max(0, load - cap);
    dW += res === 'ok' ? W.okGain + w.mod.res * W.resGain : res === 'strained' ? W.strained : W.crisis;
    coopCdx(w, 'cycle'); if (wx.t === 'hrain') coopCdx(w, 'runoff');
  } else { dW += W.calmWater; dH += W.calmHealth; }
  dW -= Math.max(0, W.use - w.mod.res);
  if (prep.store) dW += W.storeGain * prep.store;
  /* overflow becomes sewage pollution; the treatment chain removes it (order matters) */
  var add = Math.ceil(excess - 1e-9); if (add > 0) coopCdx(w, 'sewage');
  w.pol = Math.min(W.polCap, w.pol + add);
  var solids = (w.mod.settle ? 1.5 : 0) + (w.mod.filter ? 1.5 : 0), rm = Math.min(w.pol, Math.round(solids * w.eff + 0.5 * (st.bld.water || 0)) + W.nature);
  w.pol -= rm;
  var ill = false;
  if (w.pol > 0) {
    dW -= w.pol * W.polWater;
    if (w.mod.chlor) dH -= w.pol * W.polClean;
    else { dH -= w.pol * W.polGerm; if (w.pol >= 3) { dH -= W.illness; ill = true; coopCdx(w, 'chlorine'); } }
  } else if (w.water >= 50) dH += W.calmHealth;
  if (w.mod.fluor && w.mod.chlor) dH += W.fluor;
  dH += synH;
  if (res === 'crisis') { w.rec = cAddF(d, 1); if (absentN === 0 && !wx.tut && st.fog < W.sysFogMax) {   /* no Fog from systems on absent days or tutorial nights */
     fogAdd = W.sysFog; st.fog = Math.min(W.sysFogMax, st.fog + fogAdd); } coopLog(st, 'wcrisis', wx.t); }
  dW = Math.max(-W.maxLoss.water, dW); dH = Math.max(-W.maxLoss.health, dH);   /* one bad night can only do so much */
  if (dW < 0) dW *= half; if (dH < 0) dH *= half;
  w.miss = absentN > 0 ? (w.miss || 0) + 1 : 0;
  var lo = absentN > 0 ? W.floorMissed : W.floor, w0 = w.water, h0 = w.health;   /* a missed day never pushes a meter below 20 */
  w.water = coopClamp(w.water + dW, Math.min(lo, w.water));
  w.health = coopClamp(w.health + dH, Math.min(lo, w.health));
  w.rep.unshift({ d: d, t: wx.t, sev: wx.sev, tut: wx.tut || 0, rec: wx.rec || 0, res: res, load: Math.round(load * 10) / 10, cap: Math.round(cap * 10) / 10,
    ex: add, rm: rm, pol: w.pol, ill: ill ? 1 : 0, dw: w.water - w0, dh: w.health - h0, half: half < 1 ? 1 : 0, fog: fogAdd,
    pr: Object.keys(prep).join(','), gm: gentle ? 1 : 0 });
  if (w.rep.length > 3) w.rep.length = 3;
  w.prep = null;
}

/* ---------- Ops: +2 on a day the member studies (only while the world is on) ---------- */
function coopOpsSync(st, e) {
  var m = st.m[e], t = cDay();
  if (!m || !coopWorldOn() || m.days.indexOf(t) < 0 || m.opsD === t) return false;
  m.ops = Math.min(m.ops || 0, COOP_WORLD.opsCarry) + COOP_WORLD.opsDay; m.opsD = t; return true;
}

/* ---------- player actions ---------- */
function coopPrep(st, email, b, extra) {
  if (!coopWorldOn()) return 'world_off';
  var P = COOP_PREP[b.a], m = st.m[email], w = st.w, t = cDay();
  if (!P) return 'bad';
  if (!w.prep || w.prep.d !== t) w.prep = { d: t, a: {}, by: {} };
  if (w.prep.a[b.a]) return 'done';
  if ((m.ops || 0) < P.ops) return 'no_ops';
  if (P.why.indexOf(String(b.why)) < 0) return 'bad';
  var right = String(b.why) === P.right;
  m.ops -= P.ops; w.prep.a[b.a] = right ? 2 : 1; w.prep.by[b.a] = email;
  extra.prep = { a: b.a, right: right }; return null;
}
function coopModCost(st, k) {
  var M = COOP_MOD[k], lv = (st.w.mod[k] || 0) + 1, f = coopFactor(st), c = [0, 0, 0, 0, 0, 0, 0];
  M.c.forEach(function (x) { c[x[0]] += Math.round(x[1] * lv * f); });
  return c;
}
function coopModMax(st, k) { return k === 'res' ? Math.min(3, 1 + (st.bld.water || 0)) : COOP_MOD[k].max; }
function coopMod(st, k) {
  if (!coopWorldOn()) return 'world_off';
  if (!COOP_MOD[k]) return 'bad';
  if ((st.w.mod[k] || 0) >= coopModMax(st, k)) return 'max';
  var c = coopModCost(st, k);
  for (var u = 1; u <= 6; u++) if (st.mats[u] < c[u]) return 'short';
  for (var v = 1; v <= 6; v++) st.mats[v] -= c[v];
  st.w.mod[k] = (st.w.mod[k] || 0) + 1;
  if (COOP_STAGES.indexOf(k) >= 0) { st.w.tv++; st.w.eff = 0.5; }    /* a new stage: re-arrange the plant to run it at full power */
  if (k === 'res') coopCdx(st.w, 'reservoir');
  if (k === 'chlor') coopCdx(st.w, 'chlorine');
  coopLog(st, 'mod', k + ':' + st.w.mod[k]); return null;
}
/* Treatment Plant puzzle: the squad arranges its built stages; the server grades the order */
function coopTreat(st, b, extra) {
  if (!coopWorldOn()) return 'world_off';
  var w = st.w, t = cDay(), built = COOP_STAGES.filter(function (k) { return w.mod[k] > 0; });
  if (built.length < 2) return 'locked';
  if (w.tdone === w.tv) return 'done';
  if (w.tt.d !== t || w.tt.v !== w.tv) w.tt = { d: t, v: w.tv, n: 0 };   /* 2 tries a day for each plant layout */
  if (w.tt.n >= COOP_WORLD.treatTries) return 'limit';
  var ord = (b.ord || []).map(String);
  if (ord.length !== built.length || built.some(function (k) { return ord.indexOf(k) < 0; })) return 'bad';
  w.tt.n++;
  var wrong = ord.filter(function (k, i) { return k !== built[i]; }), ok = !wrong.length;
  w.ord = ord;
  if (ok) { w.eff = 1; w.tdone = w.tv; coopCdx(w, 'treat'); coopLog(st, 'treat', ''); } else w.eff = 0.5;
  extra.treat = { ok: ok, wrong: wrong, left: COOP_WORLD.treatTries - w.tt.n }; return null;
}
/* daily task board: 3 squad tasks issued by the server (template + seed), so tasks cannot be re-rolled */
function coopTaskEnsure(row) {
  var st = row.st, w = st.w, t = cDay();
  if (w.task && w.task.d === t) return false;
  var ids = Object.keys(COOP_TPL), ord = ids.filter(function (k) { return k[0] === 'o'; }), srt = ids.filter(function (k) { return k[0] === 's'; });
  var fresh = function (k) { return !w.seen[k] || cDiff(w.seen[k], t) >= 7; };
  var pick = function (list, salt, not) { var c = list.filter(function (k) { return fresh(k) && not.indexOf(k) < 0; }); if (!c.length) c = list.filter(function (k) { return not.indexOf(k) < 0; }); return c[Math.floor(coopHash(row.id + t + salt) * c.length)]; };
  var a = pick(ord, 'a', []), b2 = pick(srt, 'b', []), c3 = pick(ids, 'c', [a, b2]);
  w.task = { d: t, list: [a, b2, c3].map(function (k, i) { return { k: k, seed: Math.floor(coopHash(row.id + t + k + i) * 1e6), by: '', s: null }; }) };
  Object.keys(w.seen).forEach(function (k) { if (cDiff(w.seen[k], t) > 14) delete w.seen[k]; });
  return true;
}
function coopTask(st, email, b, extra) {
  if (!coopWorldOn()) return 'world_off';
  var w = st.w, t = cDay(), T = w.task && w.task.d === t ? w.task.list[Number(b.i)] : null;
  if (!T) return 'bad';
  if (T.k !== String(b.k) || T.seed !== Number(b.seed)) return 'stale';
  if (T.by) return 'done';
  var sc = Number(b.score), m = st.m[email]; sc = sc >= 1 ? 1 : sc >= 0.5 ? 0.5 : 0;
  var repeat = w.seen[T.k] && cDiff(w.seen[T.k], t) < 7;
  T.by = email; T.s = sc; w.seen[T.k] = t;
  var got = { ops: 0, water: 0, cdx: '' };
  if (!repeat) {
    if (sc >= 0.5) { m.ops = Math.min(COOP_WORLD.opsMax, (m.ops || 0) + COOP_WORLD.taskOps); got.ops = COOP_WORLD.taskOps; }
    if (sc >= 1) { w.water = Math.min(100, w.water + COOP_WORLD.taskWater); got.water = COOP_WORLD.taskWater; if (T.k === 'o_treat' && coopCdx(w, 'treat')) got.cdx = 'treat'; if (T.k === 'o_cycle' && coopCdx(w, 'cycle')) got.cdx = 'cycle'; }
  }
  if (sc < 1) { var sec = COOP_TPL[T.k]; if (Object.keys(w.cm).length < 40 || w.cm[sec]) w.cm[sec] = (w.cm[sec] || 0) + 1; }
  extra.task = { k: T.k, s: sc, repeat: !!repeat, got: got }; return null;
}

/* ---------- what the game sees of the world (never the right reasons) ---------- */
function coopWorldView(row, email) {
  var st = row.st, w = st.w, t = cDay(), m = st.m[email] || {}, tn = coopSqWx(st, t), nx = coopSqWx(st, cAddF(t, 1));
  var h = coopHash('fc' + t), chance = nx.tut ? null : Math.round(nx.sev >= 1 ? 55 + h * 30 : 8 + h * 27);
  var built = COOP_STAGES.filter(function (k) { return w.mod[k] > 0; });
  var mods = {}; Object.keys(COOP_MOD).forEach(function (k) { var c = coopModCost(st, k), ok = true; for (var u = 1; u <= 6; u++) if (st.mats[u] < c[u]) ok = false; mods[k] = { lv: w.mod[k] || 0, max: coopModMax(st, k), cost: c, ok: ok }; });
  var prep = w.prep && w.prep.d === t ? w.prep : { a: {}, by: {} }, mem = Object.keys(st.m);
  return { tonight: tn, next: { t: nx.tut ? nx.t : null, chance: chance }, water: w.water, health: w.health, pol: w.pol, eff: w.eff, mode: coopMode(),
    mods: mods, stages: built, ord: w.ord, treat: built.length >= 2 && w.tdone !== w.tv ? { left: COOP_WORLD.treatTries - (w.tt.d === t && w.tt.v === w.tv ? w.tt.n : 0) } : null,
    ops: m.ops || 0, opsToday: m.opsD === t, prep: Object.keys(prep.a).map(function (k) { return { a: k, x: prep.a[k], me: prep.by[k] === email }; }),
    rep: w.rep[0] || null, cdx: w.cdx, rec: w.rec === t,
    tasks: w.task && w.task.d === t ? w.task.list.map(function (T) { return { k: T.k, seed: T.seed, done: !!T.by, mine: T.by === email, who: T.by ? mem.indexOf(T.by) : -1, s: T.s }; }) : [],
    costs: { drains: COOP_PREP.drains.ops, pond: COOP_PREP.pond.ops, store: COOP_PREP.store.ops } };
}

/* =====================================================================================
   Building placement + neighbour synergies
   ===================================================================================== */
function coopPlotUsed(st, pl) { for (var k in st.plot) if (st.plot[k] === pl) return k; return null; }
function coopFreePlot(st, b) { var d = COOP_DEFPLOT[b]; if (d != null && !coopPlotUsed(st, d)) return d; for (var i = 0; i < COOP_PLOTXY.length; i++) if (!coopPlotUsed(st, i)) return i; return -1; }
function coopNear(p, q) { var a = COOP_PLOTXY[p], c = COOP_PLOTXY[q]; return p !== q && Math.sqrt((a[0] - c[0]) * (a[0] - c[0]) + (a[1] - c[1]) * (a[1] - c[1])) <= COOP_NEAR; }
/* a synergy is active when both buildings are built, stand on neighbouring plots and neither is fogged */
function coopSyn(st) {
  var plot = st.plot || {};
  return COOP_SYN.filter(function (y) {
    return st.bld[y.a] > 0 && st.bld[y.b] > 0 && plot[y.a] != null && plot[y.b] != null && coopNear(plot[y.a], plot[y.b]) && st.fogB !== y.a && st.fogB !== y.b;
  });
}
function coopSynMul(syn, unit) { var n = 0; syn.forEach(function (y) { if (y.mats.indexOf(unit) >= 0) n++; }); return 1 + COOP_SYNBONUS * n; }
/* move a finished building to another free plot: costs 1 Blueprint, so a new layout is a real decision */
function coopMove(st, b, plot) {
  if (!COOP_B[b]) return 'bad';
  if (!(st.bld[b] > 0) || st.plot[b] == null) return 'locked';
  if (st.con && st.con.b === b) return 'busy';
  var pl = Number(plot);
  if (!(pl >= 0 && pl < COOP_PLOTXY.length) || pl === st.plot[b] || coopPlotUsed(st, pl)) return 'plot';
  if (st.bp < 1) return 'short';
  st.bp--; st.plot[b] = pl; coopLog(st, 'move', b); return null;
}

/* =====================================================================================
   Island incidents: one a day per squad. 20 are caused by Murk's ten minions (bad lab habits
   and attitudes), 10 are lucky discoveries. Each member gets one answer; the first right answer
   solves it (squad bonus, minion caught). An unsolved minion escapes at night: +1 pollution
   (world on only). Never takes coins, XP or materials. Right answers (r) stay on the server.
   ===================================================================================== */
var COOP_INC = {
 i01: { m: 0, u: 1, e: 'mat', r: 0 },
 i02: { m: 0, u: 1, e: 'fog', r: 1 },
 i03: { m: 1, u: 1, e: 'health', r: 2 },
 i04: { m: 1, u: 1, e: 'mat', r: 0 },
 i05: { m: 2, u: 1, e: 'ops', r: 1 },
 i06: { m: 2, u: 1, e: 'mat', r: 2 },
 i07: { m: 3, u: 1, e: 'fog', r: 0 },
 i08: { m: 3, u: 5, e: 'ops', r: 1 },
 i09: { m: 4, u: 1, e: 'health', r: 2 },
 i10: { m: 4, u: 2, e: 'water', r: 0 },
 i11: { m: 5, u: 1, e: 'mat', r: 1 },
 i12: { m: 5, u: 3, e: 'health', r: 2 },
 i13: { m: 6, u: 2, e: 'water', r: 0 },
 i14: { m: 6, u: 3, e: 'mat', r: 1 },
 i15: { m: 7, u: 6, e: 'mat', r: 2 },
 i16: { m: 7, u: 5, e: 'ops', r: 0 },
 i17: { m: 8, u: 2, e: 'water', r: 1 },
 i18: { m: 8, u: 5, e: 'fog', r: 2 },
 i19: { m: 9, u: 3, e: 'health', r: 0 },
 i20: { m: 9, u: 2, e: 'ops', r: 1 },
 i21: { m: -1, u: 2, e: 'water', r: 2 },
 i22: { m: -1, u: 3, e: 'health', r: 0 },
 i23: { m: -1, u: 5, e: 'ops', r: 1 },
 i24: { m: -1, u: 6, e: 'mat', r: 2 },
 i25: { m: -1, u: 2, e: 'water', r: 0 },
 i26: { m: -1, u: 4, e: 'health', r: 1 },
 i27: { m: -1, u: 1, e: 'fog', r: 2 },
 i28: { m: -1, u: 5, e: 'mat', r: 0 },
 i29: { m: -1, u: 3, e: 'mat', r: 1 },
 i30: { m: -1, u: 6, e: 'ops', r: 2 }
};
function coopIncEnsure(row) {
  var st = row.st, t = cDay();
  if (st.inc && st.inc.d === t) return false;
  var h = st.incH || [], ids = Object.keys(COOP_INC), c = ids.filter(function (k) { return h.indexOf(k) < 0; });
  if (!c.length) c = ids;
  var id = c[Math.floor(coopHash(row.id + 'inc' + t) * c.length)];
  st.inc = { d: t, id: id, by: {}, done: '', esc: 0 };
  h.push(id); if (h.length > 12) h.shift(); st.incH = h;
  return true;
}
function coopInc(st, email, b, extra) {
  var I = st.inc, t = cDay();
  if (!I || I.d !== t || !COOP_INC[I.id]) return 'bad';
  if (String(b.id) !== I.id) return 'stale';
  if (I.by[email] != null) return 'done';
  var X = COOP_INC[I.id], ok = Number(b.pick) === X.r, got = { mats: 0, u: X.u, e: '', n: 0, first: false };
  I.by[email] = ok ? 1 : 0;
  if (ok) {
    st.mats[X.u] += 2; got.mats = 2;
    if (!I.done) {
      I.done = email; got.first = true;
      var w = st.w, on = coopWorldOn() && w;
      if (X.e === 'water' && on) { w.water = Math.min(100, w.water + 4); got.e = 'water'; got.n = 4; }
      else if (X.e === 'health' && on) { w.health = Math.min(100, w.health + 4); got.e = 'health'; got.n = 4; }
      else if (X.e === 'ops' && on) { var m = st.m[email]; m.ops = Math.min(COOP_WORLD.opsMax, (m.ops || 0) + 1); got.e = 'ops'; got.n = 1; }
      else if (X.e === 'fog' && st.fog > 0) { st.fog--; coopFogB(st); got.e = 'fog'; got.n = 1; }
      else { st.mats[X.u] += 4; got.e = 'mat'; got.n = 4; }
      if (X.m >= 0) { st.mon = st.mon || {}; st.mon[X.m] = (st.mon[X.m] || 0) + 1; }
      coopLog(st, X.m >= 0 ? 'inccatch' : 'incgood', I.id);
    }
  }
  extra.inc = { ok: ok, r: X.r, got: got }; return null;
}
function coopIncView(st, email, idx) {
  var I = st.inc; if (!I || I.d !== cDay() || !COOP_INC[I.id]) return null;
  return { id: I.id, done: !!I.done, who: I.done ? idx[I.done] : -1, mine: I.by[email] == null ? null : I.by[email], n: Object.keys(I.by).length, r: I.by[email] != null ? COOP_INC[I.id].r : null };
}
