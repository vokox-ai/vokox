# Music and voice

## Music prompts (Lyria, Stable Audio)

`[genre] + [mood] + [tempo bpm] + [2–3 instruments] + [structure or energy arc] + "no vocals"`.
Example: "warm lo-fi hip hop, relaxed and optimistic, 88 bpm, soft electric piano, vinyl crackle,
light brushed drums, steady energy, no vocals". For ads keep the bed simple; the voice carries the
message. Ask for "ends cleanly" on 30 s tracks. Never name real artists or songs.

## Voice scripts

- Write for the ear: short sentences, one idea each, contractions, a hook in the first 2 seconds.
- Pace: English 2.3–2.6 words/s, Russian 2.0–2.3 words/s. 15 s ≈ 35 EN words / 30 RU words.
- Numbers and names spelled the way they should sound ("тысяча девятьсот", "Ви-Пи-Эн" or "VPN").
- Punctuation drives prosody: commas for breaths, full stops for pauses, an exclamation only once.
- `eleven-v3` accepts emotion tags in square brackets: `[excited]`, `[whispers]`, `[laughs]`.
  Other models ignore tags; direct emotion through wording instead.

## Choosing a voice

`vokox models -c tts --json` lists voices under `caps.voices`. Default Russian: `ru-female-1`
(warm, explainer) or `ru-male-1` (calm authority). Keep one voice per project. For a talking
head, generate TTS first and pass the audio as a reference to the video model for lip-sync.

## Mixing (compose)

Voice at 1.0, music at 0.15–0.25 with `duck: true`, 1–1.5 s fade-out. Captions from the voice
track; `bold-bottom` for vertical social, `minimal-top` for product demos.
