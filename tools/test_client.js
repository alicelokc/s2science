/* Game data tests: run `node tools/test_client.js` (needs Playwright + Chromium; CI installs them).
 * Opens index.html in a headless browser with a fake server and checks what the game sends and shows. */
const path = require('path'), { execSync } = require('child_process');
let pw;
try { pw = require('playwright'); } catch (e) { try { pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } catch (e2) { console.log('SKIP: Playwright is not installed'); process.exit(0); } }
const FILE = 'file://' + path.join(__dirname, '..', 'index.html');
let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  FAIL: ' + m); } }

(async () => {
  let browser;
  try { browser = await pw.chromium.launch(); } catch (e) { browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); }
  async function open(server) {
    const pg = await browser.newPage({ viewport: { width: 430, height: 900 } }), errs = [], sent = [];
    pg.on('pageerror', e => errs.push(e.message));
    await pg.route('**/*', r => {
      if (r.request().method() !== 'POST') return r.continue();
      let b = {}; try { b = JSON.parse(r.request().postData()); } catch (e) { }
      sent.push(b);
      const res = (server && server(b)) || { ok: true, sv: 5 };
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(res) });
    });
    await pg.goto(FILE); await pg.waitForTimeout(1200);
    return { pg, errs, sent };
  }
  const signIn = (pg, teacher) => pg.evaluate(t => { const g = window.__game; g.S.started = true; g.AUTH.mode = 'google'; g.AUTH.user = { email: 'a@s', zh: '你', en: 'A', guest: false, cls: '1A', teacher: t }; g.AUTH.token = 'x'; g.AUTH.exp = Date.now() + 1e8; g.render(); }, !!teacher);
  console.log('Game data tests');

  { // 1. what the game sends on save
    const { pg, errs, sent } = await open();
    await signIn(pg);
    const loc = await pg.evaluate(async () => {
      const g = window.__game, S = g.S;
      S.pets.mochi.xp = 500; S.xpTotal = 120;                     // an old save whose total started late
      S.streak = 6; S.shields = 2; S.lastDay = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      g.leg.gain(10, 20);                                         // real reward path
      const after = { xp: S.xpTotal, pet: S.pets.mochi.xp };
      g.dev.cloudSave(); await new Promise(r => setTimeout(r, 500));
      return after;
    });
    const s = sent.filter(b => b.action === 'save').pop();
    ok(!!s, 'the game sends a save');
    const sum = s && s.summary || {};
    ok(isFinite(loc.xp) && loc.xp > 120 && isFinite(loc.pet) && loc.pet > 500, 'a reward raises XP and stays a real number');
    ok(sum.xp >= loc.pet, 'saved XP is never below the pal XP (' + sum.xp + ' >= ' + loc.pet + ')');
    ['xp', 'col', 'leg', 'myth', 'streak', 'best', 'level'].forEach(k => ok(typeof sum[k] === 'number' && isFinite(sum[k]), 'summary.' + k + ' is a number'));
    ok(/^\d{4}-\d\d-\d\d$/.test(sum.lastDay || ''), 'summary.lastDay is a date');
    ok(sum.alive >= sum.lastDay, 'streak alive day counts the Streak Freezes left (' + sum.alive + ')');
    ok(Array.isArray(sum.frz), 'freeze days are sent');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await pg.close();
  }
  { // 2. heavy players stay under the 50,000-character cell limit, and nothing is lost on the way back
    const { pg, sent } = await open();
    await signIn(pg);
    const before = await pg.evaluate(async () => {
      const g = window.__game, S = g.S;
      for (let u = 1; u <= 6; u++) for (let s = 1; s <= 9; s++) for (let q = 0; q < 50; q++) S.q[u + '.' + s + '#' + q] = q % 7 ? 1 : 0;
      for (let u = 1; u <= 6; u++) for (let s = 1; s <= 9; s++) S.seen[u + '.' + s] = Array.from({ length: 30 }, (_, i) => i);
      for (let i = 0; i < 400; i++) S.owned['item_' + i] = 1;
      for (let i = 0; i < 40; i++) S.pets['pal' + i] = { xp: 100 + i, stage: 2, energy: 80, happy: 80, eq: { hat: null, glasses: null, acc: null, hand: null } };
      const q = JSON.stringify(Object.entries(S.q).sort()), len = JSON.stringify(S).length;
      g.dev.cloudSave(); await new Promise(r => setTimeout(r, 500)); return { q, len };
    });
    const s = sent.filter(b => b.action === 'save').pop();
    ok(s && s.state.length < 49000, 'heavy save fits the cell (' + before.len + ' -> ' + (s && s.state.length) + ' chars)');
    const back = await pg.evaluate(st => JSON.stringify(Object.entries(window.__game.dev.upgrade(JSON.parse(st)).q).sort()), s.state);
    ok(back === before.q, 'every question result comes back exactly');
    await pg.close();
  }
  { // 3. the class board shows the student's own live numbers and re-ranks
    const row = (n, v, me) => ({ n, c: '1A', p: 'mochi', lv: 3, v, me: !!me });
    const boardRes = { ok: true, sv: 5, scope: 'class', cats: { xp: { top: [row('甲', 900), row('乙', 600), row('你', 100, 1)], me: { rank: 3, v: 100 } }, streak: { top: [row('甲', 9), row('你', 2, 1)], me: { rank: 2, v: 2 } }, col: { top: [row('甲', 30), row('你', 5, 1)], me: { rank: 2, v: 5 } } } };
    const { pg } = await open(b => b.action === 'board' ? boardRes : null);
    await pg.evaluate(() => { const S = window.__game.S; S.xpTotal = 700; S.streak = 6; S.lastDay = new Date().toISOString().slice(0, 10); });
    await signIn(pg); await pg.waitForTimeout(800);
    const t = await pg.evaluate(() => { const el = document.getElementById('lbBox'); return el ? el.textContent : ''; });
    ok(t.indexOf('700 XP') >= 0, 'own XP on the board is the live value');
    ok(t.indexOf('700') < t.indexOf('600 XP'), 'the board re-ranks with the live value');
    await pg.close();
  }
  { // 4. teachers are warned when the deployed server is older than the game needs
    const statsRes = sv => ({ ok: true, sv, students: [], records: [], progress: {}, seen: {} });
    for (const sv of [3, 5]) {
      const { pg } = await open(b => b.action === 'stats' ? statsRes(sv) : { ok: true, sv });
      await signIn(pg, true);
      await pg.evaluate(() => document.querySelector('[data-nav=teacher]').click()); await pg.waitForTimeout(800);
      const warned = await pg.evaluate(() => !!document.getElementById('srvWarn'));
      ok(warned === (sv < 5), sv < 5 ? 'old server (v' + sv + ') shows a warning' : 'current server shows no warning');
      await pg.close();
    }
  }
  { // 5. shop: no tier badge row on item tabs, badges never cut off, cards in a row equally tall
    const { pg } = await open();
    await pg.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif!important}.item{content-visibility:visible!important}' }); // a wide font, like the real web font
    await pg.setViewportSize({ width: 360, height: 900 });
    await pg.evaluate(() => { const g = window.__game; g.S.started = true; g.S.lang = 'en'; g.AUTH.mode = 'guest'; g.AUTH.user = { email: 'g@s', guest: true }; g.render(); });
    await pg.evaluate(() => document.querySelector('[data-nav=shop]').click()); await pg.waitForTimeout(400);
    for (const tab of ['pets', 'food', 'wear', 'room', 'quests']) {
      await pg.evaluate(t => document.querySelector('[data-shop=' + t + ']').click(), tab); await pg.waitForTimeout(500);
      await pg.evaluate(() => document.querySelectorAll('details.fold,details:not(.nutri)').forEach(d => d.open = true)); await pg.waitForTimeout(300);
      const r = await pg.evaluate(() => {
        const cut = [...document.querySelectorAll('.item .tier')].filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim());
        const rows = {}; document.querySelectorAll('.items').forEach((g, gi) => [...g.children].forEach(it => { if (!it.offsetParent) return; const b = it.getBoundingClientRect(); (rows[gi + '|' + Math.round(b.top)] = rows[gi + '|' + Math.round(b.top)] || []).push(b.height); }));
        const uneven = Object.values(rows).filter(h => Math.max(...h) - Math.min(...h) > 6).length;
        return { cut, uneven, legend: !!document.querySelector('.tlegend') };
      });
      ok(r.cut.length === 0, tab + ': no tier badge is cut off (' + r.cut.slice(0, 3).join(', ') + ')');
      ok(r.uneven === 0, tab + ': cards in each row are the same height');
      if (tab !== 'pets' && tab !== 'food') ok(!r.legend, tab + ': no tier badge row');
    }
    await pg.close();
  }
  { // bottom bar never clumps on a 360 px phone (teacher = 8 tabs) + teachers can switch the Nobel quest to the student view
    const { pg, errs } = await open();
    await pg.setViewportSize({ width: 360, height: 780 });
    await signIn(pg, true);
    const r = await pg.evaluate(async () => {
      const bs = [...document.querySelectorAll('.nav button')];
      const over = bs.filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.dataset.nav);
      let touch = 0; bs.forEach((b, i) => { if (i) { const a = bs[i - 1].querySelector('.ni').getBoundingClientRect(), c = b.querySelector('.ni').getBoundingClientRect(); if (a.right > c.left) touch++; } });
      document.querySelector('[data-nav="nobel"]').click();
      const open = () => [...document.querySelectorAll('.nq-card')].filter(c => !c.classList.contains('locked')).length;
      const pre = open(); document.querySelector('[data-nqview="s"]').click(); const stu = open();
      document.querySelector('[data-nqview="t"]').click();
      return { n: bs.length, over, touch, pre, stu };
    });
    ok(r.over.length === 0 && r.touch === 0, 'bottom bar (' + r.n + ' tabs at 360 px): no clumped labels or icons ' + JSON.stringify(r.over));
    ok(r.pre === 6 && r.stu === 1, 'teacher: Nobel preview opens all 6 chapters, Student view shows the real locks (' + r.pre + ' / ' + r.stu + ')');
    ok(errs.length === 0, 'nav + teacher view: no page errors ' + errs.join(' | '));
    await pg.close();
  }
  { // fast answers: quick + right earns in full; quick + wrong (under 3 s) is a reckless guess that costs coins
    const { pg, errs } = await open();
    await signIn(pg);
    const r = await pg.evaluate(async () => {
      const g = window.__game, S = g.S; S.coins = 50;
      document.querySelector('[data-nav="study"]').click(); await new Promise(z => setTimeout(z, 300));
      document.querySelector('[data-quizsec="1.1"]').click(); await new Promise(z => setTimeout(z, 400));
      const k = g.qok(); g.qans(k === 0 ? 1 : 0);
      const lost = 50 - S.coins, wait = (document.querySelector('#bNext') || {}).disabled;
      return { lost, wait };
    });
    ok(r.lost === 5 && r.wait, 'a wrong answer in under 3 s costs 5 coins and adds a pause (lost ' + r.lost + ')');
    ok(errs.length === 0, 'fast answers: no page errors ' + errs.join(' | '));
    await pg.close();
  }
  { // Nobel Grand Battles guard the two rescue rewards
    const { pg, errs } = await open();
    await signIn(pg);
    const r = await pg.evaluate(() => {
      const g = window.__game, S = g.S; S.nobel = S.nobel || { t: {}, seen: {}, perk: {} };
      ['curie', 'fleming', 'kao'].forEach(id => { S.nobel.t[id] = 255; });
      g.dev.unlock(); g.render();
      const before = !!S.pets.petal || !!S.owned.h_virtue;
      document.querySelector('[data-nav="nobel"]').click();
      const cards = [...document.querySelectorAll('.gbcard')].map(c => /ready/.test(c.className) ? 'R' : /locked/.test(c.className) ? 'L' : 'W').join('');
      S.nobel.gb = { 1: '2026-10-14' }; g.dev.unlock();
      return { before, cards, after: !!S.pets.petal };
    });
    ok(!r.before, 'Nobel: 3 Sparks alone no longer give Petal or her outfit');
    ok(r.cards === 'RL', 'Nobel: Grand Battle I is ready at 3 Sparks, Grand Battle II stays locked (' + r.cards + ')');
    ok(r.after, 'Nobel: winning Grand Battle I unlocks Petal');
    ok(errs.length === 0, 'Nobel grand battles: no page errors ' + errs.join(' | '));
    await pg.close();
  }
  { // Collection: trophy cards are grouped by card tier, lowest first
    const { pg, errs } = await open();
    await signIn(pg);
    await pg.evaluate(() => { document.querySelector('[data-nav="col"]').click(); });
    await pg.waitForTimeout(300);
    await pg.evaluate(() => document.querySelector('[data-col="trophies"]').click());
    await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => [...document.querySelectorAll('.foldtro')].map(f => [...new Set([...f.querySelectorAll('.tcard')].map(c => [...c.classList].find(k => /^tr\d$/.test(k))))]));
    ok(r.length >= 3 && r.every((t, i) => t.length === 1 && (i === 0 || +t[0].slice(2) > +r[i - 1][0].slice(2))), 'trophies: one fold per card tier, Bronze first (' + JSON.stringify(r) + ')');
    ok(errs.length === 0, 'trophies: no page errors ' + errs.join(' | '));
    await pg.close();
  }
  { // Nobel Time Quest: always on; chapter 1 open, later chapters open with unit quiz stars + dictation words
    const { pg, errs } = await open();
    await signIn(pg);
    const r = await pg.evaluate(() => {
      const g = window.__game, S = g.S, q = g.nq, out = {};
      out.fresh = [0, 1, 2, 3, 4, 5].map(i => q.open(i) ? 'O' : 'L').join('');
      CHAPTERS[0].sections.forEach(s => { S.secs[s.id] = { stars: 2, best: 80, plays: 1 }; });
      out.starsOnly = q.open(1);
      S.dict.m = S.dict.m || {}; let n = 0;
      CHAPTERS[0].sections.forEach(s => s.terms.forEach(t => { if (n < 10) { S.dict.m[t[0].toLowerCase()] = [2, '2026-10-01']; n++; } }));
      out.both = q.open(1);
      out.ch3 = q.open(2);
      S.nobel.t.rutherford = 1; out.started = q.open(4);
      out.goals = q.goals(5).length;
      return out;
    });
    ok(r.fresh === 'OLLLLL', 'Nobel: a new student has chapter 1 open and 2-6 locked (' + r.fresh + ')');
    ok(!r.starsOnly && r.both, 'Nobel: chapter 2 needs Unit 1 quiz stars AND 10 mastered dictation words');
    ok(!r.ch3, 'Nobel: chapter 3 still needs Unit 2 progress');
    ok(r.started, 'Nobel: a chapter the student already started never locks again');
    ok(r.goals === 4, 'Nobel: chapter 6 asks for Units 5 and 6');
    ok(errs.length === 0, 'Nobel: no page errors ' + errs.join(' | '));
    await pg.close();
  }
  { // question bank: the right answer must not give itself away by being the longest option
    const { pg } = await open();
    const r = await pg.evaluate(() => {
      const out = {};
      [0, 1].forEach(k => {
        let n = 0, lg = 0, sh = 0; const unit = {};
        CHAPTERS.forEach(c => c.sections.forEach(s => s.qs.forEach(q => {
          if (q.t !== 'mc') return;
          const L = q.o.map(o => o[k].length), mx = Math.max(...L), mn = Math.min(...L);
          if (mx <= 2) return;
          const u = unit[c.id] = unit[c.id] || [0, 0], long = L[0] === mx && L.filter(x => x === mx).length === 1;
          n++; u[0]++; if (long) { lg++; u[1]++; } if (L[0] === mn && L.filter(x => x === mn).length === 1) sh++;
        })));
        const worst = Object.entries(unit).map(([id, u]) => [id, Math.round(100 * u[1] / u[0])]).sort((a, b) => b[1] - a[1])[0];
        out[k ? 'zh' : 'en'] = { n, lg: Math.round(100 * lg / n), sh: Math.round(100 * sh / n), worst };
      });
      return out;
    });
    ok(r.en.n > 1000, 'question bank loads (' + r.en.n + ' multiple-choice questions)');
    ok(r.en.lg <= 30, 'EN: right answer is the longest option in only ' + r.en.lg + '% of questions (max 30%)');
    ok(r.zh.lg <= 30, 'ZH: right answer is the longest option in only ' + r.zh.lg + '% of questions (max 30%)');
    ['en', 'zh'].forEach(l => ok(r[l].worst[1] <= 30, l.toUpperCase() + ': in every unit the right answer is the longest in at most 30% (worst: Unit ' + r[l].worst[0] + ' ' + r[l].worst[1] + '%)'));
    ok(r.en.sh >= 10, 'EN: right answer is sometimes the shortest (' + r.en.sh + '%, min 10%)');
    await pg.close();
  }
  { // Science Pals: corny memory jokes (question, then tap to reveal punchline + core idea) and varied cheers
    const { pg, errs } = await open();
    await signIn(pg);
    const r = await pg.evaluate(() => {
      const out = {}, units = {};
      SJOKES.forEach(j => { units[j[0]] = (units[j[0]] || 0) + 1; });
      out.n = SJOKES.length; out.units = Object.keys(units).length; out.full = SJOKES.every(j => j.length === 7 && j.slice(1).every(t => t && t.length > 1));
      window.__game.render(); document.querySelector('[data-nav="home"]').click();
      const f = document.querySelector('[data-fold=h_chat]'); if (f) f.open = true;
      document.querySelector('#bJoke').click();
      out.q = document.querySelector('#chatText').innerText; out.btn = !!document.querySelector('[data-jkrev]');
      document.querySelector('[data-jkrev]').click();
      out.a = document.querySelector('#chatText').innerText;
      const c = new Set(); for (let i = 0; i < 40; i++) { document.querySelector('#bCheer').click(); c.add(document.querySelector('#chatText').innerText); }
      out.cheers = c.size;
      return out;
    });
    ok(r.n >= 40 && r.units >= 6 && r.full, 'jokes: ' + r.n + ' bilingual jokes covering ' + r.units + ' units, every field filled');
    ok(/Q:|問：/.test(r.q) && r.btn && !/Core idea|核心概念/.test(r.q), 'jokes: the pal asks the question first and hides the answer');
    ok(/A:|答：/.test(r.a) && /Core idea|核心概念/.test(r.a), 'jokes: tapping reveals the punchline and the core idea');
    ok(r.cheers >= 15, 'cheers: 40 taps give ' + r.cheers + ' different lines (min 15)');
    ok(errs.length === 0, 'jokes: no page errors ' + errs.join(' | '));
    await pg.close();
  }
  { // one art style: every emoji written in the game has an original icon (no phone-specific emoji)
    const { pg, errs } = await open();
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
    const found = [...new Set((src.match(/\p{Extended_Pictographic}\uFE0F?(\u200D\p{Extended_Pictographic}\uFE0F?)*/gu) || []).map(e => e.replace(/\uFE0F/g, '')))];
    const miss = await pg.evaluate(ks => ks.filter(k => k !== '🪙' && !window.__emoIcon(k)), found);
    ok(found.length > 150 && miss.length === 0, 'icons: all ' + found.length + ' emoji used in the game have an original icon' + (miss.length ? ' (missing: ' + miss.join(' ') + ')' : ''));
    ok(errs.length === 0, 'icons: no page errors ' + errs.join(' | '));
    await pg.close();
  }
  { // 1.5 drawing skill: a sub-topic after 1.4 with a working drawing studio; it does not tighten the Nobel locks
    const { pg, errs } = await open();
    await signIn(pg);
    const r = await pg.evaluate(() => {
      const u1 = CHAPTERS[0].sections, i = u1.findIndex(s => s.id === '1.5'), s = u1[i], out = {};
      out.after = i > 0 && u1[i - 1].id === '1.4'; out.qs = s ? s.qs.length : 0; out.pics = s ? s.qs.filter(q => q.fig || q.tap).length : 0;
      const g = window.__game; document.querySelector('[data-nav="study"]').click(); document.querySelector('[data-studysec="1.5"]').click();
      out.tabs = document.querySelectorAll('#ds .ds-tab').length;
      ['watch', 'real', 'trace', 'spot', 'label'].forEach(t => { document.querySelector('[data-dstab="' + t + '"]').click(); out[t] = !!document.querySelector('#dsBody svg'); });
      u1.forEach(x => { g.S.secs[x.id] = { stars: ['1.1', '1.2'].includes(x.id) ? 3 : 0, best: 100, plays: 1 }; });
      out.slant = []; for (const k in DRW.A) DRW.A[k].s.forEach(st => { for (let i = 1; i < st.length; i++) { const dx = Math.abs(st[i][0] - st[i - 1][0]), dy = Math.abs(st[i][1] - st[i - 1][1]); if (dy > 40 && dx > 2 && dx < 12) out.slant.push(k); } });
      out.nq = g.nq.goals(1)[0]; return out;
    });
    ok(r.after && r.qs >= 45 && r.pics >= 15, 'drawing skill: 1.5 sits after 1.4 with ' + r.qs + ' questions (' + r.pics + ' with diagrams)');
    ok(r.tabs === 5 && r.watch && r.real && r.trace && r.spot && r.label, 'drawing skill: all 5 studio activities open in the 1.5 notes');
    ok(r.slant.length === 0, 'drawing skill: apparatus sides are straight, not accidentally slanted ' + r.slant.join(','));
    ok(r.nq && r.nq.have >= r.nq.need, 'drawing skill: the new sub-topic does not make Nobel chapter 2 harder to unlock');
    ok(errs.length === 0, 'drawing skill: no page errors ' + errs.join(' | '));
    await pg.close();
  }
  { // Halloween hat for mastering 1.5, and save codes made before 1.5 existed still read correctly
    const { pg, errs } = await open();
    await signIn(pg);
    const V17 = '5GVEF84SEE2P9NTPDJH8AQMBD1F5MS6XSXDJVZDSZ0B2G8C3FP5VFWWZNA1JE1EWVJBX4VXFHG4GH4VZKYW0JQRR8KXBJY7ECF85W0QNTD9C59162GV3QG150JNXX5T9EYVCKS7GZZZZYE36T58SW7PYRTJSJF2VEZE1B2MXCJJDWVBCA9B8V6E74KXT42NB2MFG70A0REYN82VPX5T27P3HECR376KA8C4RCMDGCTHBSGFHEKCXMK8NMVC8Z84386ZR72PNGMDNP9HGGRYY6S3SH8777WDM4YAP504ZA0RCPCR9A1WM5FTNCYFRWTT0S196ZANWK52';
    const r = await pg.evaluate(code => {
      const g = window.__game, S = g.S, out = {}, o = g.unpack(code);
      out.old = o && o.coins === 321 && o.stars['1.4'] === 3 && o.stars['2.1'] === 2 && o.stars['3.2'] === 3 && o.stars['6.5'] === 1 && !o.stars['1.5'] && o.owned.h_nobel && o.owned.s3_hat_detective && !o.owned.h_pumpkinwitch;
      S.draw = { t: { tube: 3, beaker: 3, flask: 3, funnel: 3, dropper: 3, stand: 3, filter: 3, heat: 2 }, s: { filter: 3, heat: 3 }, l: { filter: 3, heat: 3 }, w: {} };
      S.secs['1.5'] = { stars: 3, best: 100, plays: 1 }; g.check(); out.almost = !!S.owned.h_pumpkinwitch;
      S.draw.t.heat = 3; g.check(); out.done = !!S.owned.h_pumpkinwitch;
      const n = g.unpack(g.packState()); out.rt = n.stars['1.5'] === 3 && !!n.owned.h_pumpkinwitch;
      return out;
    }, V17);
    ok(r.old, 'save codes: a code made before 1.5 was added still reads the right stars, coins and items');
    ok(!r.almost && r.done, 'Halloween hat: needs every drawing activity at 3 stars plus 3 stars in the 1.5 quiz');
    ok(r.rt, 'save codes: new codes keep 1.5 stars and the hat');
    ok(errs.length === 0, 'Halloween hat: no page errors ' + errs.join(' | '));
    await pg.close();
  }
  { // 1.5 quiz: 10 of every 15 questions are real drawing tasks; other sub-topics never get them
    const { pg, errs } = await open();
    await signIn(pg);
    const r = await pg.evaluate(() => {
      const g = window.__game, u1 = CHAPTERS[0].sections, sk = u1.find(s => s.id === '1.5'), out = { runs: [] };
      for (let k = 0; k < 4; k++) { const ids = g.pick(sk); out.runs.push([ids.length, ids.filter(i => /#d\d/.test(i)).length, new Set(ids).size]); }
      out.other = CHAPTERS.flatMap(c => c.sections).filter(s => !s.skill).some(s => g.pick(s).some(i => /#d/.test(i)));
      out.inQs = sk.qs.some(q => q.t === 'draw');
      g.quiz(['1.5#d0', '1.5#d12', '1.5#d18']); out.pad = !!document.querySelector('#dqPad canvas') && document.querySelector('#opts').style.display === 'none';
      return out;
    });
    ok(r.runs.every(x => x[0] === 15 && x[1] === 10 && x[2] === 15), 'drawing quiz: every 1.5 quiz has 10 drawing questions out of 15 ' + JSON.stringify(r.runs));
    ok(!r.other && !r.inQs, 'drawing quiz: drawing questions stay out of other sub-topics and the shared question list (bosses, island, co-op)');
    ok(r.pad, 'drawing quiz: a drawing question shows a drawing pad instead of options');
    ok(errs.length === 0, 'drawing quiz: no page errors ' + errs.join(' | '));
    await pg.close();
  }
  await browser.close();
  console.log((fail ? 'FAILED ' : 'OK ') + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERROR', e.message); process.exit(1); });
