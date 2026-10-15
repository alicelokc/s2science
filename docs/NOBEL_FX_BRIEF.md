# Nobel Time Quest — Painterly Storybook FX Brief

**Look:** Painterly Storybook Adventure.
- **Backgrounds:** soft watercolour.
- **Characters:** crisp, hand-drawn lines.
- **Depth:** multiplane parallax.
- **Light:** warm golden hour → dramatic dusk → heroic sunrise.
- **Contrast rule:** Murk's magic is **heavy dark ink, shattering glass and deep shadow**. The heroes' energy is **bright, gilded, heroic and full of natural life**.

This brief describes the in-game **Finale** ("Watch the finale" / after the Chapter 6 fog battle). The **Prologue** uses the same engine, lighting ramp and layers.

---

## 1. Scene concept & lighting shift

**Setting:** a watercolour valley at the edge of Hong Kong.
- **Far:** lavender hills painted in soft washes.
- **Middle:** a little domed Science Pals' lab, drawn in crisp ink lines, and a pale watercolour skyline.
- **Front:** long grass that sways in the wind.
- **Air:** spirit pollen drifts through volumetric dust beams.

| Beat | Lighting | Palette | Air & particles | Camera |
|---|---|---|---|---|
| **1. Desperate struggle** | The sun has sunk below the hills. A deep **dusk multiply wash** covers the frame. A heavy **ink vignette** crushes the edges. | Bruised violet, ink black, cold rose | Pollen turns into **falling ink rain**. Ink-wash tendrils creep in from every edge. | Hand-held sway, slightly low angle looking up at Murk |
| **2. Boss ultimate** | Light is **drained**. The whole painting desaturates to about 30 %. The only colour is Murk's **red corona** around a black sun. | Near-monochrome ink + one crimson rim | **Shattering shadow-glass** orbits and bursts outward | Slow ominous drift and dutch tilt (±0.6°) |
| **3. Hope returns** | A thin **golden rim light** returns from behind the hero. Warm haze seeps in from the left side of the frame. | Ink + first gold highlights | Pollen **reverses direction** and turns gold. The six Nobel winners appear as a **constellation** linked by dotted star lines. | Hold; soft bokeh breathing |
| **4. Heroic breakthrough** | **Golden-hour key light** floods back. The dusk wash thins. Wind lines turn gold. | Honey gold, cream, spring green | A **gilded brushstroke** paints across the sky; wind vector lines streak. | Dynamic push-in (1.0 → 1.14) |
| **5. Final impact** | A **white-gold flash**, then a sunrise. The sun rises and blooms to 1.3× scale. | Cream-white burst → apricot sunrise | **Watercolour splash** impact frame; the black sun cracks into glass shards | Impact punch-zoom (1.24×) with 1 px blur, then settle |
| **6. Aftermath** | Soft golden morning; beams pulse gently | Warm pastel | Pollen drifts lazily. Murk is now a tiny sleepy **puff of mist**. | Gentle push, Ken Burns |

**Rule of thumb:** as the fight turns, the *light source moves from Murk to the heroes*. At first Murk's corona is the brightest thing on screen. By the breakthrough, the gilded stroke is brighter than the sun.

---

## 2. Three key FX sequences

### A. Boss ultimate — "Eclipse of Forgetting" (遺忘日蝕)

1. **Wind-up (0.0–0.7 s):** Murk rears up to 1.25× scale. His horns glow red.
   - **Camera:** a slow drift in with a slight dutch tilt.
   - **Background:** saturation drains to about 30 %.
   - **Ink tendrils:** fully drawn and "boiling". An animated turbulence filter re-seeds every 0.4 s.
2. **The black sun (0.7–2.4 s):** a disc of **ink** condenses above his head. Its core is `#05030C` and its **crimson corona** is dotted like cracked enamel. It pulses 1.0 → 1.15.
   - **Brushwork:** heavy, wet ink. The edges bleed and wobble through a displacement map; there are no clean circles.
3. **Shadow-glass burst (from 0.7 s):** about 34 angular shards of **dark stained glass** burst out from the sun (violet-to-black gradient, faint lilac edge glow). Each one spins up to ±360° while it flies and fades within 1.5 s.
4. **Screen language:** the vignette closes to 90 % ink. Only the hero's outline is left with any warmth.

### B. Hero counter-attack — "Gilded Brushstroke of Curiosity" (好奇之筆)

1. **Constellation call (beat 3):** the six Nobel winners fade in along a dotted star line, one after another, 0.28 s apart. Each has a soft gold halo.
   - The pollen reverses direction and turns gold, as if the wind itself has changed sides.
2. **Charge (0.0–0.5 s):** the hero, Petal and Riccio rise 6 px with **luminous rim lighting** (a double gold drop-shadow).
   - **Camera:** starts a push-in.
   - **Wind lines:** turn honey-gold and speed up.
3. **The stroke (0.5–2.1 s):** a single **hand-painted gilded stroke** sweeps from the hero's paws in an S-curve up to the black sun. It is drawn like a calligraphy brush (stroke-dash animation, 1.6 s, ease-out).
   - **Two layers:** a 30 px gold gradient body, plus an 8 px cream-white "wet" core.
   - **Dry-brush texture:** a directional turbulence displacement (0.9 × 0.08) gives the dry-brush edge, then a soft bloom.
4. **Light shift:** the gold overlay rises to 70 %, and the dusk wash drops to 35 %.

### C. Final impact frame — "Sunrise Splash" (朝陽水花)

1. **Contact (0.0–0.6 s):** the stroke is fully drawn. The black sun flares **2.5× bright**, then implodes to 0.2× scale.
2. **Impact frame (0.55 s):**
   - A **full-screen cream-white flash** (0 → 100 % → 0 over 1.6 s).
   - At the same moment, a **watercolour splash** blooms: five overlapping discs in cream, honey and gold, with wet displaced edges. They scale 0.2 → 1.5× and fade.
   - **Camera:** punch-zoom to 1.24× with a 1 px motion blur, then settles to 1.04×.
3. **Glass shatters (0.65 s):** 44 **dark ink shards**, followed 0.25 s later by 30 **gold shards**, burst out from the sun's position. Darkness literally breaks into light.
4. **Murk breaks:** Murk over-exposes to 2.5× brightness, then lifts, scales up and blurs away like ink dropped into water.
5. **Sunrise:** the sun rises and blooms and the dust beams return. The title **"Victory / 勝利"** is painted in with a gilded brush reveal (clip-path wipe with a skew). The paper-grain texture comes forward, so the moment looks like a page in a picture book.

---

## 3. AI video / image generator prompts

**1 · Boss ultimate — Eclipse of Forgetting**
```
painterly storybook illustration, a towering ink-wash fog monster with glowing yellow eyes and dark horns summons a black sun with a cracked crimson corona above a watercolor valley at dusk, shattering dark stained-glass shards spiralling outward, ink-wash shadow tendrils creeping from the frame edges, a tiny round white hero creature standing brave in the foreground with faint luminous rim lighting, desaturated violet and ink-black palette with a single crimson accent, heavy wet ink bleeding edges, dramatic low angle, dutch tilt, multiplane depth of field, twilight bokeh, visible watercolor paper texture, hand-drawn crisp character linework, cinematic, highly detailed --ar 16:9 --style raw --stylize 400
```
*(Runway: "slow ominous push-in with a slight dutch tilt, shards spin outward, ink tendrils writhe, 4 s")*

**2 · Hero counter-attack — Gilded Brushstroke of Curiosity**
```
painterly storybook illustration, three cute round creatures (a white bear-like hero, a sky-blue fawn with white blossom antlers, a maroon pangolin in a sports headband) raising their paws together as a single gilded calligraphy brushstroke of golden light sweeps across the sky toward a dark ink monster, glowing stardust trails, constellation of six scientist portraits shining in the sky, golden-hour volumetric sunbeams returning through dusk clouds, floating spirit pollen, stylized wind vector lines, luminous rim lighting, dry-brush gold texture, warm atmospheric haze, watercolor background with crisp hand-drawn character lines, dynamic camera push-in, multiplane parallax, highly detailed --ar 16:9 --stylize 500
```
*(Runway: "fast push-in, golden brushstroke paints itself left to right, pollen swirls against the wind, 4 s")*

**3 · Final impact frame — Sunrise Splash**
```
painterly storybook impact frame, a golden brushstroke of light strikes a black ink sun which shatters into dark glass and gold crystalline shards, a huge cream-and-honey watercolor splash explodes across the frame, white-gold flash, the ink monster dissolving like ink dropped in water, a sunrise blooming over a watercolor valley with a small domed laboratory and a pastel Hong Kong skyline, painterly light-leaks, volumetric golden sunbeams, glowing stardust, soft ethereal glow, paper grain texture, hand-painted magic arcs, dynamic punch-zoom, freeze-frame composition, highly detailed --ar 16:9 --stylize 600
```
*(Runway: "impact freeze-frame: flash, splash blooms outward, shards burst and slow down, camera settles into a golden sunrise, 5 s")*

---

### Essential storybook VFX keywords
- **Lighting & atmosphere:** volumetric golden-hour sunbeams, soft ethereal glow, painterly light-leaks, twilight bokeh, luminous rim lighting, warm atmospheric haze.
- **Energy & magic:** gilded brushstroke energy, glowing stardust trails, hand-painted magic arcs, constellation particle effects, ink-wash shadow tendrils.
- **Impact & motion:** watercolour splash impact frames, stylized wind vector lines, shattering crystalline shadows, dynamic camera push-in, multiplane depth of field.
