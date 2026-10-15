# Paste-ready prompt: new-subject pet-raising revision game

Copy everything below the line into a new Claude conversation. Fill in the **[brackets]** first and attach the files listed in "Attachments".

---

Build me a bilingual (English / 繁體中文) **pet-raising revision game** for Hong Kong **S[LEVEL] [SUBJECT]** students.

It must copy the format of my finished game **"Mochi Science Pals 麻糬科學小夥伴"**:

- Live: https://kcchamaa-sys.github.io/s1science/
- Repo: `kcchamaa-sys/s1science` (read `index.html`, `server/Code.gs`, `server/SETUP.md` and `README.md` as the reference build)

## My new subject

- Subject / level: **[e.g. S2 Science / S1 Integrated Humanities]**
- Units and sub-topics (from my textbook): **[list, e.g. 7.1 …, 7.2 …]**
- Calculations allowed? **[No / Yes, simple ones]**
- Key terms: **[paste, or "use the Key terms page of each textbook chapter"]**
- Hosting: **[new repo name, e.g. `s2science`]**, with the GitHub Pages branch `gh-pages`. I give permission to publish.
- Class login: **[reuse my existing Google Sheet + Apps Script + Client ID / set up new]**

## Attachments I will upload

- Textbook chapters (convert to Markdown before reading; skip images and repeated headers)
- The school revision-note PDF for each chapter (for picture style and key-term lists)
- The class name list (Google Sheet with tab `使用者 Users`: Email · Role 教職員/學生 · Chinese Name · English Name · Class · Class No.)

## Content

- Organise by **unit → sub-topic**. Every sub-topic gets:
  - 📖 study notes: 4–6 bilingual key points, key-term list, a picture gallery where useful, and a 💡 "Did you know?" fact
  - ✏️ a 15-question quiz in random order that skips the last 30 seen questions (★★★ = 14–15 correct)
- **18+ questions per sub-topic (45 for Unit 1, the same ideas asked in varied ways)**, tagged by Bloom level (Remember → Create), multiple choice and true/false, each with a bilingual explanation.
- **Context boxes** (📋 情境) for any question about an experiment, so questions are standalone. Never write a question that depends on a previous question.
- **Picture questions** wherever the textbook uses a diagram (apparatus, labelled parts, graphs, symbols). Use letters (A, B, P, Q, 1, 2…) as labels so the picture never gives the answer away.
- **Study-note pictures:** place each diagram directly under the note point it explains, with a caption and a letter key (EN + 中文) and tap-to-enlarge. Every label line must end in a dot ON the part it names – check each diagram visually.
- **Pictures:** draw my own SVG illustrations that look very similar to the textbook / revision-note style (same colours, layout and label style). **Never copy publisher images.** Use the school's version of symbols (e.g. the red / yellow / black-and-white hazard diamonds, not GHS).
- Only **append** new questions and items to the end of lists, so saved progress stays valid.

## Game

- **Science Pals (main characters, not called "pets"):** original Chiikawa × Sumikko-style SVG characters with Energy, Happiness and Level; moods (overjoyed, happy, sleepy, hungry, lonely, studying); 3 evolution stages; 15 pets.
- **Care loop:** feed snacks, Term Match mini-game (EN ↔ 中文), dress-up (1 per slot), room decoration in 6 groups (wallpaper / science corner / nature corner / cosy corner / science sticker / fun sticker) with 1 active item per group.
- **Pet chat card:** fun subject facts (with Hong Kong examples) and personal encouragement (streak, mistakes waiting, next sub-topic). It rotates every ~20 s and has 💡 Fun fact / 💪 Cheer me on buttons.
- **Rarity tiers:** Common / ✦ Rare / 💎 Epic / 👑 Legendary / 🌈 Mythic.
  - Mythic outfits (original, cartoon-inspired, no official names or logos) need 40–200-day streaks or huge challenges.
  - Rare sub-topic items need 3★ (5/5) in that quiz.
  - Epic unit rewards need 3★ in every sub-topic of a unit.
  - Legendary items and a legendary pet need very hard milestones (all 3★, 30-day streak, master 300 questions, clear 100 mistakes, spell 300 words, 20 perfect dictations, 20 trophies, 60 study days).
  - A 🎯 Quests tab shows progress bars.
- **Pets for the Science Pal:** 12 real cat / dog / butterfly species (many from Hong Kong) with background stories, unlocked only by dictation challenges and streaks.
- **Pet health:** a broken streak makes the pets hungry → cold → fever → very sick; students buy medicine (different prices) at a clinic; dress-up stays locked and the pet gives encouraging messages until they are cured.
- **Health tips** from the pet based on the device time (water, breakfast, exercise, sleep early on school nights, breaks after 40 minutes).
- **Class leaderboard** (signed-in only, server-side `board` action): top 20 for effort (XP), streak and collection; full names (visible only to signed-in students); own rank shown.
- **Epic unlock effects** for legendary (gold) and mythic (aurora + holographic rainbow) items, with a preview button and an aura on the pet when worn.
- Include a few **Hong Kong / Gen Z** items (e.g. pineapple-bun hat, egg-waffle cone, ding-ding tram, neon street wallpaper, 「好正！」 sticker).
- **Retention:** daily streak with multiplier (up to ×1.5) and shields; daily gift; ~24 trophies; collection gallery with tier counts; animated streak pop-ups (new day, reminder, shield, welcome back); special-item unlock pop-ups.
- **錯題本 Mistake Bank:** wrong answers are saved automatically; 2 correct in a row clears one (+6 🪙).
- **Anti-guessing:** a wrong answer in under 3 s → "Too quick!" and a 4 s wait.

### Season event (optional)
- A separate tab for a time-limited story event, e.g. six famous scientists over six months, with one chapter unlocked per month by device date. Each chapter has a story, a long reading with quick checks, a timeline, a word match, a boss battle and a link to a textbook quiz. Every 3 chapters unlocks a reward pack (Science Pal + pet + outfit + decor). Give it its own intense art style and music.

## Language and pronunciation

- 🌐 EN / 繁中 toggle everywhere.
- 🇬🇧 **British pronunciation** for every key term: 🔊 normal and 🐢 slow (Web Speech API, en-GB voice), plus British IPA. Include a per-unit Listen & Repeat list.
- 🎤 **Read aloud (朗讀):** Duolingo-style speaking practice with the Web Speech API (`SpeechRecognition`, en-GB, 5 alternatives, fuzzy match); self-rating fallback when there is no microphone. Tell management that the browser sends the audio to Google / Apple for recognition; the game stores no audio.
- ✍️ **Dictation (默書):** two modes – 🔊 listen & spell, and 🖼️ meaning / picture.
  - Choose a unit, a sub-topic or "My missed words".
  - Show a 📋 word list (with 🔊, IPA and 中文) in the setup screen.
  - 2 tries per word, letter-count boxes, hint (中文 + first letters), a "so close" message for near-misses.

## Class login and teacher dashboard

- Google sign-in (Google Identity Services) for students on the name list; guest mode kept for everyone else.
- **Apps Script server** (`server/Code.gs`) verifies each Google ID token, checks the email against `使用者 Users`, saves records to a `…記錄 Records` tab and progress to a `…進度 Progress` tab, and gives class stats to staff only (optional `TEACHER_EMAILS`).
- 📊 **Teacher dashboard:** class and period filters; summary tiles; sortable student table (accuracy, dictation, stars, streak, weakest sub-topic); sub-topic table; most-missed questions; most-misspelled words; student detail; **Excel export** (SheetJS) with Summary, Students, Sub-topics, Student×Sub-topic matrix, Most missed, Misspelled and Records sheets.
- Keep all student names and emails **out of the public repo and website**.
- Write a short privacy brief I can give to school management.

## Style

- Palette: cream #FFFDF6, matcha #D8E2DC, pink #FFE5EC / #E8AEB7, butter #FFF1C5, sky #D8F3DC.
- Rounded cards (20px+), soft shadows, spring animations; mobile-first; 48px tap targets; no sideways scroll at 390px; respect `prefers-reduced-motion`.
- Web Audio sound effects and optional soft music.
- Original characters only, with a fan-inspired disclaimer.

## Saving

- Auto-save to `localStorage` with a NEW key for this game; a separate key per signed-in student.
- 💾 Save code (Crockford base32, scrambled, checksummed) with preview. **Version the code format** and keep reading older versions whenever pets, items or trophies are added.

## Lessons from the Science build (avoid these bugs)

- `confirm()`, `alert()` and `print()` don't work in the Claude artifact viewer. Build confirmations into the page.
- Google sign-in cannot run inside a Claude artifact. The artifact copy is guest-only; students use the github.io link.
- A CSS `url("data:…")` placed inside a `style="…"` attribute breaks the page. Use single quotes inside.
- Append new trophies, items and pets at the **end** of their lists; changing the order breaks save codes.
- Wait for pop-ups before starting the next quiz in tests (pop-ups arrive about 1 s after a result).
- Apps Script setup gotchas:
  - An uploaded `.xlsx` name list must be saved as a **Google Sheet** first.
  - Replace ALL sample code: line 1 of `Code.gs` must start with `/**`, not `function myFunction() {`.
  - Run `doGet` once to grant permissions, then deploy a **new version**.
  - Web app access must be **Anyone** (sign-in checks happen inside the script).
  - OAuth consent: choose **Internal** so only school accounts can sign in.
- Test with Playwright at 390px and 1200px: mock Google sign-in and the API, and check that save codes from the previous version still load.

## Deploy

- Commit to the dev branch, then copy `index.html` and `img/` to the `gh-pages` branch (with `.nojekyll`).
- Give me the github.io link, and also publish a Claude artifact copy (guest only).

## How to talk to me

I'm an INFP with ADHD tendencies:

- Scannable replies: bullets, **bold key points**, white space.
- One "next right step" at a time, as micro-steps. No giant plans.
- Link tasks to meaning (my students' learning); give gentle nudges.
- When teaching me setup steps, give one step per message and wait for "done".
- Never put model names in commits or repo files.
