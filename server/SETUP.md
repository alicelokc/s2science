# Class login setup (about 20 minutes, once)

Class sign-in needs three things: your **Google Sheet** (name list + records), a **Google Apps Script** (checks sign-ins, saves records), and a **Google OAuth Client ID** (shows the "Sign in with Google" button).

> 🔒 Student names and emails stay in **your private Google Sheet**. They are never put in the public website or GitHub repo.

---

## Step 1 · The Google Sheet
- Use the spreadsheet that already has your **`使用者 Users`** tab (same columns: Email · Role · Chinese Name · English Name · Class · Class No.).
- Copy its **Sheet ID** from the address bar: `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`
- The game creates two new tabs by itself: **`科學記錄 Science Records`** and **`科學進度 Science Progress`**. Your existing tabs are not touched.

## Step 2 · The Google Client ID
- If your maths game already has a Web **OAuth Client ID**, you can reuse it: open it in [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) and add this to **Authorised JavaScript origins**:
  `https://kcchamaa-sys.github.io`
- Otherwise: **Create credentials → OAuth client ID → Web application**, add the origin above, then save.
- Copy the **Client ID** (ends with `.apps.googleusercontent.com`).

## Step 3 · The Apps Script
- Go to [script.google.com](https://script.google.com) → **New project** → name it `Mochi Science Pals server`.
- Delete the sample code and paste everything from **`server/Code.gs`**.
- Click **＋ → Script**, name it `Coop`, and paste everything from **`server/Coop.gs`** (the co-op Island; it creates the `合作小隊 Coop Squads` tab by itself).
- **Project Settings (⚙️) → Script properties → Add**:
  | Property | Value |
  |---|---|
  | `SHEET_ID` | the Sheet ID from Step 1 |
  | `CLIENT_ID` | the Client ID from Step 2 |
  | `TEACHER_EMAILS` | *(optional)* e.g. `abc@school.edu.hk, def@school.edu.hk`. If you leave this empty, **every 教職員** in the Users tab can open the dashboard |

## Step 4 · Deploy it
- **Deploy → New deployment → ⚙️ Web app**
  - Execute as: **Me**
  - Who has access: **Anyone**
- Click **Deploy**, allow the permissions, and copy the **Web app URL** (ends with `/exec`).

## Step 5 · Connect the game
- Send me the **Client ID** and the **/exec URL**, or edit the top of `index.html` yourself:
  ```js
  window.S1_CONFIG={GOOGLE_CLIENT_ID:"…apps.googleusercontent.com",API_URL:"https://script.google.com/macros/s/…/exec"};
  ```

## Step 6 · Test
- Open the class website → **Sign in with Google** using your staff account → the **📊 Teacher** tab appears.
- Sign in once with a student test account → do one quiz → check that a row appears in `科學記錄 Science Records`.

---

### Good to know
- **Adding students later:** just add rows to `使用者 Users`. Changes apply within 5 minutes.
- **"Access blocked" for students:** your school's Google Workspace may block new apps. Ask IT to mark the Client ID as **Trusted** in Admin console → Security → API controls.
- **Updating Code.gs:** Deploy → **Manage deployments** → ✏️ → Version: **New version**. The /exec URL stays the same.
- **Guests** play without an account. Their progress stays on their own device and is not recorded.

## Updating the server later

When `Code.gs` changes (for example, the class leaderboard was added), replace ALL the code in the Apps Script editor, save, then choose **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The web app URL stays the same.

### Co-op Island (Coop.gs)
- Needs **both** `Code.gs` and `Coop.gs` in the same Apps Script project. After pasting, deploy a **New version** (see above).
- Squads are stored in the `合作小隊 Coop Squads` tab (one row per squad). Please don't edit the JSON column by hand.
- **Holiday mode:** on the Island tab, open *Teacher view* → **Holiday mode: pause the Fog**. While it is on, missed days don't add Fog or break squad streaks. (It sets the script property `COOP_PAUSE` to `1`.)
- A student who leaves a squad waits 7 days before joining another. A teacher can **Remove** a student from a squad with no wait.

### Living Island 3.0 (weather + water system)
- It is **on by default** and fully automatic (weather from the date; nights resolve when students open the game – no triggers to set up). To switch it off: Island tab → *Teacher view* → **World ON – switch off** (this sets the script property `COOP_WORLD` to `0`).
- **Gentle mode** halves the rain load (`COOP_MODE` = `gentle`; anything else = standard). You can switch it in the same place.
- Holiday mode (`COOP_PAUSE` = `1`) also freezes the weather and the island meters.
- Old squads keep working: their data is upgraded automatically the first time it is read. Nothing a student earned is ever removed by the weather.
- **Streak / sync fix (Code.gs):** `save` now rejects an older copy (`error: 'stale'`) and returns the newer progress; `login` also returns `act` (days with a finished activity from Science Records) so the game can repair a wrongly reset streak. Replace Code.gs and deploy a new version.
- **Daily incidents:** one science incident per squad per day (new action `coopInc`, graded on the server). Unsolved minion incidents add +1 pollution overnight when the world is on.
- **Free building + neighbour links:** squads choose a plot for each building and can move it later (1 Blueprint). Existing squads keep their buildings on the old default spots (upgraded automatically).
- After pasting the new `Coop.gs`, deploy a **New version** as usual.
- **Squad leave rules (Coop.gs ver 3):** no 7-day wait any more – anyone can leave and start or join another squad at once. A host who leaves with teammates must confirm *Delete squad* (all squad progress is lost); an older page without that confirm simply hands the squad to the next member. If students still see "wait 7 days", the old `Coop.gs` is still deployed: paste the new one, then **Deploy → Manage deployments → ✏️ → New version**.
- **Scoreboard fixes (Code.gs):** streaks now survive a Streak-Freeze day (new column U `連勝有效日 Streak alive day`, filled by the game), old date cells no longer break the streak check, the board cache is 60 s instead of 5 min, and each student's own row is always read fresh. After pasting the new `Code.gs`, deploy a **New version**. The game side already shows each student's own live XP / items / streak, even before the server is updated.
- **XP safety net (Code.gs):** a normal save can no longer lower a student's XP (an old/empty copy is refused and the cloud copy is sent back). Any blocked or forced overwrite that lowers XP is kept in the new tab `進度備份 Progress Backup` (email, old XP, new XP, the old data) so a teacher can restore it by pasting the old data back into column N of that student's row in `科學進度 Science Progress`.
- **Restore lost XP (`repairXp`):** in Apps Script choose the function `repairXp` and press **Run** once. It raises each student's *Total XP* back to the XP stored on their pals (every XP point is also saved on a pal), never lowers anything, and lists who was fixed in the tab `XP修復紀錄 XP Repair Log`.
- **Teacher tab speed + duplicates (Code.gs):** `stats` now sends only the last 190 days of records (or everything when *All time* is chosen) plus every student's last-active time, found by binary search instead of reading the whole sheet. A resend of the same records (lost reply) is ignored, so sessions and co-op materials are never counted twice.
- **Heavy players:** the game now stores the per-question memory compactly in the cloud copy, so the saved data stays far below the 50,000-character cell limit.
- **Server version 5 (Code.gs):** every reply now carries the server version, and the teacher dashboard shows a red warning while the deployed copy is older than the game needs. Board XP and collection can only go up; the board streak is rebuilt from Science Records + Streak-Freeze days (new column V `凍結日 Freeze days`), so one device's bad copy can no longer make it wrong.

