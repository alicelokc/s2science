Live site: https://alicelokc.github.io/s2science/

# Mochi Science Pals — S2 (Unit 8 electricity demo)

This folder is a **fork** of the S1 Mochi Science Pals game shell, retargeted for **Hong Kong Junior Science S2 — Unit 8: Making use of electricity / 電的使用** (sub-topics 8.1–8.7).

## What stayed the same
- Mochi pet UI, shop, collectibles, quizzes/dictation UX, bilingual EN/ZH shell
- Save format shape (localStorage), but a **new key** so S1 progress is not overwritten: `s2SciencePals_v1`

## What changed
- Study content (`var CHAPTERS`) is a single unit **id:8** with sections **8.1–8.7**
- Notes, key terms, and quiz items are **original** bilingual writing for this demo
- Branding strings refer to S2 / electricity; cloud app tag `s2sci`

## Curriculum sources
Junior Science Unit 8 student book / workbook PDFs were used **only as a topic checklist** (what ideas belong in 8.1–8.7).  
**No textbook sentences, paragraphs, or publisher diagrams were copied into the game.**

## Run locally
```bash
cd /workspace/s2-mochi/s2science
python3 -m http.server 8765
# open http://127.0.0.1:8765/
```

## Known stubs / leftovers from S1
- Nobel Time Quest chap unlocks remapped to Unit 8 progress (`NQ_REQ` uses `8`)
- Town quests that indexed old `CHAPTERS[1]`…`[5]` are soft-disabled via a guarded `unitRatio`
- Legendary unit pets / co-op materials tied to old units 1–6 mostly stay locked; Unit 8 has a `Copper Wire` material slot
- Some Nobel story text still mentions S1 separation methods in historical flavour text

## Next steps (for Alice)
- Playtest Study → 8.1–8.7 notes, terms, quizzes
- Optionally prune or rewrite Nobel / town / co-op for electricity only
- Publish to GitHub Pages when ready (do not commit secrets)
