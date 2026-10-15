---
name: game-motion-fx
description: Animation and visual-effects recipes for browser games and learning apps using only CSS, inline SVG and the Web Animations API – level-up and unlock ceremonies, impact frames, shockwaves, reward/coin "pops" flying into an inventory, gacha/capsule machines, boss-battle intros and hit effects, fog/smoke/ink, weather (rain), parallax, idle "life", cut-scenes and storybook films. Use this whenever the user asks for animation, juice, game feel, effects, a celebration, a "cinematic" or "anime" moment, a reveal, transitions, or says something feels flat, boring or not satisfying – and whenever motion must stay phone-friendly and accessible.
---

# Game motion & FX (CSS + SVG + Web Animations, no libraries)

Good game motion **explains what changed**: something was earned, broken, cleared or unlocked. Treat every effect as a message, with a clear start, peak and settle, lasting 0.3–1.5 s for feedback and up to about 5 s for rare ceremonies.

## Detect change, then animate it

Don't animate on every render. Keep a "last seen" snapshot per entity in `localStorage`, for example `{level, fog, materials}`, and diff it after each server refresh:
- level went up → ceremony;
- meter went down → shockwave;
- meter went up → creep;
- stock increased → pops.

On the very first view, store the snapshot without playing anything, so effects never replay on reload. Queue big ceremonies so they play one at a time.

## Recipes

**1. Level-up / unlock ceremony** (full-screen overlay, tap to skip)
1. *Charge-up* (about 1 s): the object is darkened and shaking slightly; 12–14 glowing particles converge (CSS `rotate(var(--a)) translateX(170px) → 0`).
2. *Impact frames*: **two single frames** (about 42 ms each). First a white background with a black silhouette (`filter:brightness(0)`), then the inverse (`brightness(0) invert(1)`).
3. *Reveal*: a shockwave ring scales 0 → 34 and fades; fog blobs fly outward; the object pops in (`scale .82 → 1`, springy cubic-bezier); a glow burst plays via a `filter` keyframe. The title slams in from `scale(1.8) skewX(-12deg)`.
- **Light sweep:** use a brightness/drop-shadow keyframe on the SVG. A gradient bar in `::after` showed as an ugly rectangle.

**2. Reward pops into the inventory** (Web Animations API)
- Spawn a fixed chip at the source.
- Keyframes: pop up and over-scale (blur → sharp), hover, then fly to the target slot with `scale .55 skewX(-14deg)` and fade.
- Add 2 ghost clones 45 ms behind as a motion trail. Bump the target when it lands.
- Clamp targets to the viewport. **Skip while a modal is open.**

**3. Shockwave + repair flash:** a bordered ring with a cyan glow scales 0 → 16 over about 0.9 s, plus a 1-frame white/black flash on the panel. Push the "bad" layer back (scale .7 → 1).

**4. Fog / ink smoke:**
- Build the fog from dark blobs plus tapered, curling tentacle paths.
- Run them through an `feTurbulence` + `feDisplacementMap` filter, with slow SMIL animation of `baseFrequency`.
- Fog creep = tentacles `scaleX(0 → 1)` from their base (`transform-box:fill-box; transform-origin:0 50%`), plus a desaturate pulse and a brief scanline "static" overlay.
- "Corroded" state = a grayscale filter with animated noise composited only onto the object's alpha.

**5. Gacha / capsule:** crank shake, capsule drop with bounce, rarity *upgrade* teases (colour steps), burst, prize card. Keep the prize layout inside the stage, using a separate "revealed" layout.

**6. Boss battle:** VS intro (portraits slide in, clash, flash), HUD **above** the arena (never overlapping), projectiles, hit bursts, damage numbers and combos, enraged-phase recolour, victory/defeat screens. Give each attack a name and a distinct shape language.

**7. Ambient life:** drifting dust motes, clouds, birds and a boat on loops of different lengths; gentle bobbing on floating things; parallax on scroll via `requestAnimationFrame`. Add film grain only with an **effects on/off switch**.

**8. Weather:** rain is two repeating-linear-gradient streak layers moving diagonally, with a cool tint overlay; heavy rain is denser and faster. Make it steady, never flickering.

**9. Storybook / cut-scene films:** about 6 beats on a lighting ramp. Use letterboxing, camera push, tilt and Ken Burns. The light source moves from the villain to the heroes as the story turns. Write the beat table first (see the anime-art-direction skill).

## Safety and performance (learned the hard way)

- **Photosensitivity:** never more than 3 flashes a second. Impact frames are 2 frames, once. Under `prefers-reduced-motion`, skip flashes and movement, show the final state and keep the text.
- **Phones:**
  - Displacement filters and many blurred glows are expensive. Use one shared `<defs>` per screen (glow, hatch, ink and grey filters), referenced by every SVG via `url(#id)`.
  - Offer a "lite effects" class that drops grain, parallax and filters.
  - Bake static complex art to images.
- **Unique ids:** `clipPath` and gradient ids generated per render need random suffixes, or several gauges will share one clip.
- **Animating buttons can't be clicked by test robots** (Playwright waits for stability), so trigger clicks with `element.click()` in `evaluate`.

## Verify like an animator

Take screenshots at key times (charge, impact +1 frame, reveal +500 ms) and look at them. Check that the overlay closes, the queue drains, nothing is left in the DOM, and there's no page error. Test with reduced motion too.

## How to brief this skill (for the user)

> "When [event] happens, I want it to feel [epic / cosy / funny], like [reference vibe]. About [N] seconds, skippable, on phones."

Naming the *event* and the *feeling* matters more than naming techniques.
