---
name: cute-mascot-characters
description: Designing original cute mascot / pet / companion characters as inline SVG for games and learning apps – chubby "mochi bean" pals, rarity tiers, evolutions, colour variants, outfits, trading-card art and custom icons that replace emoji. Use this whenever the user wants new pets, pals, mascots, creatures, NPC portraits, scientist or teacher cartoons, character redesigns, a "kawaii" or "Chiikawa-like / Sanrio-like" look, collectible characters, trophy or trading cards, or asks to replace emoji with original icons – and especially when they reference an existing franchise style, since the result must stay original.
---

# Cute mascot characters (original, SVG, game-ready)

The aim is a **recognisable house style**: every character feels like part of one family, reads at 34 px and at 300 px, and is legally **original**.

## The house style ("mochi bean")

- **Silhouette first.** Use a soft, chubby bean or egg body: wider at the bottom, no neck, short stubby limbs. Squint test: the shape alone should read as "cute blob".
- **Line:** a thick, warm **chocolate / plum outline** (about 3–4 px at a 200 px viewBox) with round caps and joins. Avoid pure black; it looks harsh next to pastels.
- **Two-tone shading:** a base fill, plus one darker shade crescent on the lower or right side. Add a soft white sheen on the upper left, clipped to the body. Two tones are enough.
- **Face:** big, low-set eyes (on or below the body's midline) with 1–2 white highlights, a tiny mouth, and blush ovals. Moods (joy, sleepy, sad) change only the eyes and mouth.
- **Species markings** carry the identity, not anatomy: ears, a horn, spots, a leaf sprout, a tail tip, a tummy symbol. One strong marking beats five small ones.
- **Palette:** pastel bodies (cream, mint, peach, lavender, sky) with one saturated accent per character. Check that two pals standing side by side are still distinct.
- **Humans in the same world** (scientists, teachers): keep them human, but use the same outline colour, two-tone shading and big eyes, so they sit next to the pals without clashing.

## Make it data-driven

Define characters as data, so new ones are cheap:
```
{ id, en, zh, body, belly, ears:'lighthouse', tier:'mythic', price, cond:{k:'coopPrize', n:1}, desc:[en,zh] }
```
- One `petSVG(id, mood, opts)` renders everything. Special parts plug into an art map (`LEG_ART[ears] = {back(), front()}`) for layers behind and in front of the body.
- **Rarity tiers** (common → rare → epic → legendary → mythic) change the aura, the frame and the unlock route, never the art quality. Every pal should be lovable.
- **Evolution and variants:** 3 stages (small → grown → final with accessory), plus colour routes (for example Scholar / Ocean / secret Galaxy, shown as a silhouette until unlocked).
- **Special pals** belong to a special place (capsule-only, co-op-only, quest reward). Show *where* to get them on the collection page with a call-to-action button.

## Collectible cards and trophies

- **Card anatomy:** a rarity frame (bronze matte, silver reverse-holo, gold, rainbow), a title bar, the scene, a reward corner, and a stamp or progress bar.
- **Scenes:** two pals in a small funny incident (a lab mishap, a eureka moment). Pair characters by contrast or complement.
- **Performance:** bake each complex card SVG into a cached image (canvas → data URL) for grids. Dozens of live SVGs with filters make scrolling stutter.
- **Progressive reveal:** locked cards show a "mystery foil" silhouette, partial progress shows a partial reveal, and a full unlock gets a short ceremony.

## Replacing emoji with original icons

Emoji render differently on every device and look generic.
- Keep a map of about 200 small 24 px icons in the house style (2 tones, same outline colour).
- Use a swapper that converts emoji inside rendered text, and skip SVG and `<option>` text.
- Rewrite a node only when it contains a mapped emoji, so a MutationObserver doesn't loop forever.
- **Gotcha:** generic CSS like `.card svg{width:100%}` also hits the inline icons. Give icons their own class with fixed sizes.

## Originality rules (non-negotiable)

- "Inspired by" a franchise means borrowing **qualities**: chubby, pastel, big eyes, thick outline. Never borrow recognisable characters, names, logos, signature markings or official artwork.
- Change silhouette, markings and colour enough that a fan would not say "that's X". When unsure, push further away.
- No official logos (also school crests, government icons, weather-warning graphics); use words and generic icons instead.
- Keep personal data (student names) out of character content and repos.

## Process

1. Write the cast as a table: id, name EN/中, species idea, signature marking, palette, tier and unlock route.
2. Draw one hero character fully and screenshot it at 34 px and at 200 px, then derive the rest from it.
3. Put the whole cast in a single test grid and check family resemblance plus distinctness.
4. Check save/load. Adding pals can change save-code layouts (bit widths, list lengths), so version the format and test old codes.

## How to brief this skill (for the user)

> "Make [N] new pals for [theme/unit], [tier], unlocked by [how]. Style: our mochi pals. Each needs a clear marking linked to [science idea]."

A rough sketch, a photo of a real animal or object, or one sentence of personality per character gives the strongest results.
