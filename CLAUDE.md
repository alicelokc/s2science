# Mochi Science Pals (s1science)

Part of a **three-repo family** that shares knowledge. Read [`docs/SHARED_KNOWLEDGE.md` in biology](https://github.com/kcchamaa-sys/biology/blob/claude/wonderful-turing-8ehr7a/docs/SHARED_KNOWLEDGE.md) (or `/home/user/biology/docs/SHARED_KNOWLEDGE.md` if the repo is cloned in this session) before designing or porting a feature.

Siblings: `kcchamaa-sys/biology` (hub), `kcchamaa-sys/s1science`, `kcchamaa-sys/s3science`. If a task would benefit from a sibling and it isn't in the session, attach it with `add_repo`.

## This repo
- S1 Science pet-raising revision game, bilingual EN / 繁中. Single hand-edited `index.html`; teacher/class-login server code in `server/`. Reference build for new subjects: see `docs/NEXT_GAME_PROMPT.md`.

## Working agreements
- Keep this repo standalone: no runtime dependency on the siblings.
- When you build or change something reusable, add a line to the cross-project log in the hub's `docs/SHARED_KNOWLEDGE.md`.
- Never commit student names or other personal data.
- No official logos, artwork or music from existing franchises.

## Student data safety (read before changing saves, XP, streaks, the class board or server/*.gs)
- Run `sh tools/test_all.sh` before every push to the main branch and before every deploy to `gh-pages`. Do not deploy if it fails. GitHub runs the same tests on every push (`.github/workflows/data-tests.yml`).
- If you change what is saved or how the board/teacher view reads it, bump `SERVER_VER` in `server/Code.gs` **and** `NEED_SERVER` in `index.html` together (a test enforces this), add a test for the new rule in `tools/test_server.js` or `tools/test_client.js`, and tell the teacher to redeploy Apps Script. Teachers see a warning while the deployed server is older.
- Rules the tests protect: Total XP and collection on the board never go down; XP is never below the pals' XP; an older or lower-XP copy can't overwrite newer progress; the saved row matches `PROG_HEAD` column-for-column; dates stay text; board streak = max(game streak if still alive incl. Streak Freezes, streak rebuilt from Science Records + freeze days); a student's own row is always fresh; resent records are ignored; a heavy save stays under the 50,000-character cell limit.

