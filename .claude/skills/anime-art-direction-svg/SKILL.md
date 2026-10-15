---
name: anime-art-direction-svg
description: Turning an art-direction brief (anime studio look, "MAPPA / Ghibli / watercolour storybook / dark fantasy / cosy pastel" mood boards, Midjourney/Niji prompts) into original inline-SVG game art – scenes, buildings with upgrade stages, day/night lighting, villains vs heroes colour language, and light vs dark themes. Use this whenever the user shares a style brief, mood board, AI image prompts or a reference studio and wants the game, a screen, a map, an island, a boss or a cut-scene to "look like that", or asks to restyle, re-theme or make the art more cinematic, atmospheric or consistent.
---

# Anime-inspired art direction → original SVG art

An AI-image prompt or studio reference is a **mood**, not a spec. The job is to translate it into a small set of **pillars**, then into reusable SVG building blocks, while keeping all art original. Copy qualities (line weight, lighting logic, colour contrast), never characters, logos or frames.

## Step 1: turn the brief into 3–4 pillars

Write them down before drawing anything. Example from "dark cinematic action anime":

| Pillar | Translation into SVG |
|---|---|
| Heavy hand-drawn linework + hatching | Thick ink outline (`stroke-linejoin:round`); a 45° hatch `<pattern>` on shadow sides; cross-hatch on cliffs and undersides |
| Split lighting: cold gloom vs warm/electric tech | Desaturated purples and greys for the threat; amber, cyan and neon green **only** on the heroes' tech, with a glow filter |
| Living villain smoke | Dark blobs + tapered tentacles through a turbulence displacement filter |
| Impact moments | Impact frames + shockwave (see the game-motion-fx skill) |

Write a **contrast rule** in one sentence, for example: "Murk's magic is heavy ink and shadow; the heroes' energy is gilded and full of life." Every later choice is checked against it.

## Step 2: shared defs, small primitives

- Put one `<defs>` block per screen: sky and sea gradients, light rays, a vignette, hatch patterns, `glow` and `glow2` filters, an ink filter, a corroded-grey filter, and radial "reclaimed light pool" gradients per accent colour.
- Use helper functions so style stays consistent:
  - `cS(w)`: the ink stroke;
  - `cG(svg, big)`: glow;
  - `cH(path)`: hatch overlay;
  - `cPipe(d, colour)`: an ink-outlined pipe.

## Step 3: buildings and props with growth stages

Every upgradeable thing tells a story in **3 stages**: hut → workshop → landmark. Examples:
- shed + beaker → copper-pipe lab → glass-dome lab;
- hand pump → filter tower → aqueduct with glowing falls;
- tent + microscope → clinic → DNA-ring spire.

Rules:
- Fit everything in one viewBox (for example `-45 -70 90 90`) so cards, the map and ceremonies all reuse it.
- Shade the right side with hatching.
- Keep glows only on "science energy" parts (vats, crystals, coils), which is what makes the tech read as alive.
- Under construction: show the next stage greyed out, with scaffolding and blinking lamps. Fogged or corroded: grey filter, noise and wrapping tentacles. Not built: a dashed plot with "?".

## Step 4: the scene

Build the scene in layers, back to front:
1. Sky gradient (moon/sun, stars at night).
2. Light rays, whose opacity tracks how safe the world is.
3. Cloud band.
4. Sea with ink wave strokes and glints.
5. Cliff underside with cross-hatch.
6. Ground and rim.
7. Reclaimed light pools and energy lines from a central sigil to each built building.
8. Buildings and decor sorted by y (depth).
9. Characters.
10. Villain layer.
11. Motes, then the vignette.

**Lighting ramps** read better than flat themes:
- a real-clock day/night sky (key light, rim light, lamp bloom at night);
- or a story ramp (golden hour → dusk → eclipse → sunrise).

As the heroes win, move the light source from the villain to the heroes.

## Step 5: light vs dark theme

Dark cinematic looks dramatic but can feel heavy for young players, and the teacher may switch to a light theme.

Keep **structure and contrast logic separate from palette**:
- Put colours in CSS variables (`--ink`, `--panel`, `--accent-*`) and in one ink constant in JS.
- A light re-theme then keeps the hatching and glows, but lifts the backgrounds (lavender and cream) and softens the ink to plum.
- Re-check text contrast after any re-theme.

## Process

1. Read the brief and write the pillars and contrast rule. Confirm them in 3–4 bullets.
2. Draw a **gallery page**: every building at every stage, plus empty, construction and fogged states, all in one screenshot grid. Fix the art there before touching the live screen.
3. Render the scene at 3 states (calm, medium threat, heavy threat) and look at each.
4. Only then wire it in, and re-test at 360 px with reduced motion.

## Originality and content

- Never reproduce studio frames, characters, logos, or official signals (for example Hong Kong Observatory warning icons). Use words and generic icons instead.
- Keep it age-appropriate: tentacles curl and drift, villains are dramatic but not gory.

## How to brief this skill (for the user)

> "Here's my style brief/mood board [paste]. Apply it to [screen]. Keep [what must stay]. The mood: [villain] vs [heroes]."

Pasting AI image prompts is fine; they get translated into pillars, not copied.
