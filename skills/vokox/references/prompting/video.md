# Directing video

## Structure of a prompt (60–110 words, present tense, prose, no lists)

1. **Shot and camera**: close-up / medium / wide; static, slow dolly in, handheld follow, orbit,
   crane up, whip pan. Name the lens feel when it matters (35mm wide, 85mm portrait, macro).
2. **Subject** with 2–4 concrete details (age bracket, wardrobe, material, colour).
3. **One action** with direction and speed ("turns the cup slowly toward camera", "walks left to
   right at a relaxed pace"). One action per clip. Two actions produce a morph.
4. **Setting and time of day**, **light** (golden hour, soft window light, rim light, neon).
5. **Style**: "shot on iPhone, natural colours" for UGC; "35mm film, shallow depth of field" for cinematic.
6. **What stays still** ("background static, camera locked off") when calm is wanted.
7. Optional audio, only on audio models: dialogue in quotes, `SFX: …`, `Ambient: …`.

Avoid: "4K, masterpiece, trending, cinematic lighting" filler; negatives phrased as "no X"
(describe the wanted state instead); numbers of people above three; text on screen (add captions
in compose instead); scene changes or "then".

## Image-to-video

The reference already defines who and where. Describe **only** motion, camera and atmosphere:
"Camera pushes in slowly; she lifts the cup, smiles at the lens, steam rises; soft window light,
gentle handheld sway." Re-describing the subject fights the image and drifts identity.

## Per model

- **Seedance 2.0 / 2.0 Fast** (`seedance-2`, `seedance-2-fast`): likes a short narrative with
  cause and effect; supports several references — order them in the prompt as `@image1`,
  `@audio1`, `@video1` matching the `refs` order. Timestamps work for multi-shot on `seedance-2`:
  `[0-3s] … [3-6s] …`. Lip-sync when an audio ref is present: say "delivers the supplied audio
  with clear lip-sync; only the visible speaker moves their mouth". 720p is the sweet spot.
- **Kling 3.0** (`kling-3-std`, `kling-3-pro`): explicit camera is mandatory or it stays static;
  one motion per clip; "what stays still" helps; excels at people and fabric; multi-shot prompts
  up to 6 shots on Pro. Native audio is decent for ambience, weak for dialogue.
- **Veo 3.1** (`veo-3.1-fast`, `veo-3.1`): best dialogue and SFX. Put lines in quotes with the
  speaker: `She says: "…"`. Describe ambience: `Ambient: rain on glass`. Keep the language of the
  dialogue explicit ("speaks Russian"). 8 s max.
- **Wan 2.2 / 2.5** (`wan-2.2-fast*`, `wan-2.5`): fast and stable for simple motion, product
  turns, nature; keep prompts short (40–70 words); avoid crowds and fast sport.
- **LTX-2 Fast**: long clips (10 s) with sound at low cost; good for b-roll and ambience,
  weaker on faces in close-up.
- **Hailuo 2.3**: physics and dynamic motion (pours, jumps, cloth); 6 or 10 s.

## Durations and rhythm

Vertical social: 3–5 s per shot, first shot carries the hook. Product turns: 5 s. Talking head:
8–10 s segments cut on breaths. Keep total under 25 s unless asked.

## Performance direction (talking head, UGC)

Give the attitude, not choreography: "venting to a friend with affectionate exasperation; at the
price her eyebrows rise and an open palm turns up; the last compliment lands with a teasing smile".
One revealing reaction per passage beats a gesture on every phrase. Stable framing leaves room for
the face to act.

## Negative prompt defaults

`blurry, low quality, distorted face, extra limbs, text, watermark, flicker, morphing`.
