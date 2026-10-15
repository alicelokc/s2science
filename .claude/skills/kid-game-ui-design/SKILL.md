---
name: kid-game-ui-design
description: Picture-first UI design for learning games and apps aimed at children and teens (about 10–15), especially single-file HTML games played on phones. Use this whenever the user asks to design, redesign, declutter or "make less text-heavy / more visual / easier to understand" any game screen, menu, dashboard, tutorial, onboarding, how-to-play guide, quest/task list, shop, inventory or teacher view, or complains that an interface is confusing, wordy, ugly or hard to use on a phone, even if they don't say "UI".
---

# Kid game UI: picture-first, one next step

Young players don't read paragraphs, and they decide in about 3 seconds whether a screen is "for them". A screen works when a student can answer, at a glance:
1. **What is this?**
2. **What do I do next?**
3. **Am I winning?**

Everything below serves those three questions.

## The core moves (apply in this order)

1. **Cut the scroll into tabs.** If a screen holds more than about 5 cards, split it into 3–5 icon tabs, for example Today / Build / Water / Squad.
   - Put the default tab on "what to do today".
   - Remember the last tab in `localStorage`.
   - Make the tab bar sticky.
2. **One highlighted next step.** Add a quest bar: 3–5 round icons joined by a line. Done steps turn green with a white tick, and only the next step pulses.
   - Give it exactly **one** call-to-action button that names the action ("Read the report ›", not "Continue").
   - Never use guilt copy for skipped steps.
3. **Tiles, not paragraphs.** Each job becomes a tile:
   - a coloured icon blob;
   - a title of up to 3 words;
   - **one big number** (12/30, a ring, a gauge);
   - one button.

   Move the explanation into a "?" sheet, a `<details>` "More", or the guide.
4. **Show quantities as pictures.**

   | Quantity | Show it as |
   |---|---|
   | Percentages and health | A shape that fills: a drop for water, a heart for health (SVG clipPath + rect) |
   | Counts out of 10 | 10 dots |
   | Comparisons | Two bars side by side ("rain vs drains") |
   | Progress | A ring |
   | Levels | Dots (●●○) |
5. **Show systems as diagrams.** A process or chain (water treatment, energy chain, a crafting tree) should be a **tap-to-build flow diagram**.
   - Nodes are buttons with an icon, a short name and level dots.
   - Unbuilt nodes are dashed with a "+" badge (orange when affordable).
   - Pipes between nodes show flow.
   - Keep at most 4 nodes per row at phone width; put the final output on its own strip.
6. **Reports are picture + key line + "More".** Lead with a visual (bars or icons) and **one** bold key line ("Overflow → pollution"), then the deltas (−30 💧 +3 ❤). The full what/why/next sits under `<details>`.
7. **Guides are picture stories.** A how-to-play guide is 5–7 cards, each with:
   - one illustration built from the game's own art (pals, buildings, icons);
   - a title of up to 5 words;
   - one short line.

   Add dots, Back/Next and swipe. Make the guide button glow until the student opens it once, and start it at card 1 every time it opens.
8. **Use faces, not names.** Children's names often share a first character (學生甲 / 學生乙), so use each member's avatar or pal face on chips and progress markers. Keep the name in `title`/`aria-label`.

## Copy rules

- Keep labels to 1–3 words. Choose verbs over nouns ("Prepare", "Do a task").
- Write numbers as digits with units ("12/30 today"), not sentences.
- For bilingual UIs, write both languages with the same brevity: `L('Study','溫習')`. Chinese lines run longer visually, so test both.
- Remove a sentence if the picture already says it. If a rule needs a paragraph, it belongs in the guide.

## Phone-first checks (the bugs we actually hit)

- **No sideways scroll at 360 px.** Assert `document.documentElement.scrollWidth <= 360` in an automated test, in both languages.
- **Hidden inputs** (`position:absolute; opacity:0` radios) need a positioned parent (`position:relative`). Otherwise they leak and widen the page.
- **Generic class names collide.** A new `.good` or `.ok` class picked up an old global `.good{display:flex}` rule and broke the layout. Prefix new classes (`cw-`, `co-`), or check for existing rules first.
- **Re-rendering a modal replays its opening animation**, so every tap flickers. Update the modal body in place when it is already open.
- **Fixed-position FX** (flying chips, toasts) fly over open dialogs. Skip them while a modal is open.
- Wrap rows of buttons with `flex-wrap`. Set `min-width:0` on flex children that hold text. Make tap targets at least 44 px.
- A sticky bottom nav covers content, so leave room at the end of the page.

## Accessibility (cheap wins)

- Colour must never be the only signal: add a tick, an icon or a number.
- Use real `<button>`s with `aria-label` for icon-only controls, and `role="tab"`/`aria-selected` on tabs.
- Ordering tasks need ▲▼ buttons, not drag-only; keep focus on the moved item.
- Respect `prefers-reduced-motion`: turn off pulses and slides.

## Process that works

1. Screenshot the current screen at 360 px and list every text block. Ask "can a picture or a number replace this?"
2. Restructure: tabs → quest bar → tiles → diagrams. Keep every existing `data-*` action hook so game logic and tests keep working.
3. Re-screenshot and actually look. Crop full-page shots into 1–2 viewport chunks, and look for clipping, overlap, empty tiles and wrapped rows.
4. Run the end-to-end test in both languages and at 360 px. Update tests that target moved elements (for example, switch tabs first).

## How to brief this skill (for the user)

The fastest prompt names the screen, the audience, the device and the feeling:
> "Redesign the [Island] screen for S1 students on phones. It feels [text-heavy / confusing]. Keep all the features. I want them to see [what to do next] in 3 seconds."

Attach a screenshot when you can. Pointing at the part that feels wrong beats describing it.
