# Music and voice

## Music prompts (Lyria, Stable Audio)

`[genre] + [mood] + [tempo bpm] + [2–3 instruments] + [structure or energy arc] + "no vocals"`.
Example: "warm lo-fi hip hop, relaxed and optimistic, 88 bpm, soft electric piano, vinyl crackle,
light brushed drums, steady energy, no vocals". For ads keep the bed simple; the voice carries the
message. Ask for "ends cleanly" on 30 s tracks. Never name real artists or songs.
On Lyria write "instrumental" as well: it sings unless told not to (see Per-model notes).

## Voice scripts

- Write for the ear: short sentences, one idea each, contractions, a hook in the first 2 seconds.
- Pace: English 2.3–2.6 words/s, Russian 2.0–2.3 words/s. 15 s ≈ 35 EN words / 30 RU words.
- Numbers and names spelled the way they should sound ("тысяча девятьсот", "Ви-Пи-Эн" or "VPN").
- Punctuation drives prosody: commas for breaths, full stops for pauses, an exclamation only once.
- `eleven-v3` takes emotion tags in square brackets: `[excited]`, `[whispers]`, `[laughs]`.
  `minimax-tts` takes non-verbal cues in round brackets, `(laughs)`, `(sighs)`, and pauses as
  `<#0.5#>`. `kokoro` has no tags; direct emotion through wording and punctuation.

## Choosing a voice

`vokox models -c tts --json` lists the models; voice ids follow `<lang>-<gender>-<n>`. Default
Russian: `ru-female-1` (bright, explainer) or `ru-male-1` (calm, dependable). Keep one voice per
project. For a talking head, generate TTS first and pass the audio as a reference to the video
model for lip-sync. The full id map is under Per-model notes.

## Mixing (compose)

Voice at 1.0, music at 0.15–0.25 with `duck: true`, 1–1.5 s fade-out. Captions from the voice
track; which style fits which format (and the 9:16 safe zones) is in `captions.md`.

---

## 1. Decide who speaks before writing a prompt

Speech in a vokox piece comes from one of three places. Pick one per passage; it decides the
order of steps, the models and whether compose can duck the music.

| Source | How | Pick it when | Watch out |
| --- | --- | --- | --- |
| **TTS voice-over** | `tts` step → compose `voice` | the speaker is off screen: b-roll, product, explainer, montage | a `voice` track **mutes the clips' own sound unless `clipAudio.volume` is set** (0.2–0.4 keeps SFX under the voice), so SFX written into clip prompts is thrown away |
| **TTS + lip-sync** | `tts` step → `refs: ["@face", "@vN"]` on `seedance-2-fast` / `seedance-2` (or `minimax-h3`, which takes audio refs) | an on-camera presenter who must sound the same in every clip | one TTS step per clip; no compose `voice` track; captions via `text` |
| **Native dialogue** | quoted line in the prompt of an audio model (`veo-3.1*`, `seedance-2*`, `kling-3*`, `wan-2.5`, `ltx-2-fast`, `minimax-h3*`) | a single clip, a skit with several characters, dialogue woven with room sound | each generation invents the voice anew; across clips the same person drifts unless the model takes an audio reference |

Rules of thumb:
- One recurring speaker across several clips → TTS once, reuse the asset as a reference. Native
  dialogue on Veo has no audio reference, so repeat the voice description word for word in every
  prompt and accept some drift, or keep that character to one clip.
- Voice-over over pictures → do not spend prompt words on sound in those clips.
- Native audio is also the only way to get synced SFX and ambience (compose has no SFX track), so
  a sound-led piece without narration should use audio-capable clips and no `voice` track.

## 2. Writing for the ear

A script is heard once, at the speaker's speed, often on a phone speaker. Build it for that.

**Open with the payoff.** The first sentence carries the hook: the problem, the surprising
number, the result. No greetings, no brand intro before the reason to listen. "Your VPN drops
every time you board a train? This one doesn't." beats "Hi! Today I want to tell you about…".

**Rhythm.** Alternate short and medium sentences; one clause per breath. Put the key word at the
end of the sentence, where the voice lands. Cut subordinate clauses and parentheses; spoken
language has no brackets. Read the script aloud at the target pace before generating: every
place you stumble, the TTS will too.

**Word budget per duration** (speech window = clip length minus about 0.5 s of air):

| Length | English words | Russian words | Typical use |
| --- | --- | --- | --- |
| 4–5 s clip | 9–10 | 8–9 | one native line in a Veo / Seedance clip |
| 8 s clip | 16–18 | 14–16 | a full thought, Veo max |
| 10 s clip | 21–23 | 18–20 | talking-head segment |
| 15 s spot | 32–36 | 28–32 | short ad voice-over |
| 30 s spot | 67–75 | 58–67 | full ad, explainer |

Dense copy delivered faster than this sounds like a disclaimer. If the script does not fit, cut
words, do not speed the voice.

**Spell it the way it is said.** TTS reads characters; your script is the pronunciation.
Expand everything the model could read in two ways, and keep the same expansion in every step of
the plan (each step is a separate generation).

| Written | Russian TTS text | Written | English TTS text |
| --- | --- | --- | --- |
| 2 990 ₽ | две тысячи девятьсот девяносто рублей | $1,299 | twelve ninety-nine |
| −30 % | минус тридцать процентов | 3x faster | three times faster |
| 1.10 | первого октября | 2026 | twenty twenty-six |
| т. е., и т. д. | то есть, и так далее | Dr., Ave. | Doctor, Avenue |
| VPN, iOS | ви-пи-эн, ай-о-эс | SQL | sequel (or S-Q-L; choose one) |
| shop.ai | шоп точка эй-ай | shop.ai | shop dot A I |
| 24/7 | круглосуточно | 24/7 | twenty-four seven |

Russian specifics: always write **ё** where it belongs (все/всё, небо/нёбо change meaning); for
stress homographs (за́мок/замо́к, мука́/му́ка) rephrase rather than hope. Latin brand names inside
Russian speech are read unpredictably; write them in Cyrillic as the brand pronounces them, or
test one sentence first. Units, degrees and percent signs always as words.

**Punctuation as direction.** Comma = short breath. Full stop = pause and pitch drop. Ellipsis =
hesitation or weight (strongest on `eleven-v3`). Question mark lifts the end; use it for real
questions only. Dash = a beat before the punchline. Explicit pauses: `<#0.4#>` on `minimax-tts`,
`[short pause]` / `[long pause]` on `eleven-v3`.

**Before generating, check:** hook in sentence one; every number, abbreviation and brand written
as sound; no sentence longer than about 15 words; one CTA at the end, said once; word count within
the budget above.

## 3. Casting a voice through its sound

Decide who is talking and to whom before picking an id. A voice is a handful of audible choices:

- **Age and presence**: early twenties, thirties, fifties; how the gender reads.
- **Weight and pitch**: light and high, rounded mid, deep and heavy.
- **Texture**: clean, breathy, husky, gravelly, bright, warm, nasal.
- **Pace and energy**: brisk, measured, unhurried; lively or restrained. Pitch and pace are separate
  knobs: a deep voice can still speak quickly.
- **Attitude to the listener**: confiding, teasing, coaching, reporting, selling, reassuring.
- **Language and accent**: say it explicitly for native dialogue ("speaks Russian", "American
  English").

Choose three or four that make this person worth listening to; a list of ten adjectives averages
out into nothing. Compress them into one or two sentences. That sentence is what goes into a
video prompt next to the quoted line, and it is the yardstick for picking a TTS id.

Examples:
- "A woman in her late twenties with a light, clear voice and quick, amused delivery, like someone
  about to show a friend a trick she just learned."
- "A man in his fifties, low and unhurried with a slight rasp, explaining something he has done a
  thousand times; calm, certain, a little dry."
- "A teenage boy, bright and slightly nasal, talking fast and interrupting himself, over-excited
  about a game."

Match the brief: trust and money → measured, clear articulation, lower pace; lifestyle and UGC →
conversational, smiling, quicker; luxury → slow, soft, lots of air; kids' product → bright, playful.
Keep the attitude in each passage's direction, not in the voice choice: the same voice can tease
in the hook and turn serious at the price.

## 4. Performance and emotion, per model

| Model | How to steer delivery | Limits |
| --- | --- | --- |
| `eleven-v3` | Inline tags before the words they colour: `[excited]`, `[curious]`, `[sarcastic]`, `[whispers]`, `[sighs]`, `[laughs]`, `[chuckles]`, `[clears throat]`, `[short pause]`, `[long pause]`. Ellipses add weight; CAPITALS stress a word. `params.speed` 0.7–1.2, `params.style` 0–1 | a tag must suit the voice: a soft voice will not shout. Two or three tags per paragraph; tags on every line sound acted |
| `minimax-tts` | Emotion is inferred from the wording, so write the feeling into the sentence. Non-verbal cues in round brackets: `(laughs)`, `(sighs)`, `(breath)`, `(gasps)`, `(chuckle)`, `(inhale)`, `(exhale)`, `(clear-throat)`, `(emm)`. Pauses `<#0.6#>` | explicit emotion, speed and pitch are not reachable through vokox today; bracket cues are understood only by speech-2.8 (our primary route), so listen for stray words if a fallback served the job |
| `kokoro` | wording and punctuation only | no tags, no emotion control |
| audio video models | describe the delivery in prose next to the quoted line: "she says it dryly, half-smiling", "he whispers, glancing at the door" | one or two short lines per clip; long speech drifts out of lip-sync |

Direct attitude, not acting instructions. "Annoyed at how long this took, then relieved" gives the
model a reason; "[angry] … [happy]" gives it a switch.

## 5. Let the voice set the clock

Compose facts that drive timing:
- Output length = sum of clip lengths (after `trim`) minus 0.4 s for every `fade` transition.
- The voice is laid from `voice.start`; anything past the end of the picture is cut off.
- Music is looped or trimmed to the picture and faded over `fadeOut` seconds.

So the order is: script → voice → measure → clips → trims.

1. Generate the TTS step first (cents, not dollars) and read its length `D` from the file.
2. Program length `P = voice.start + D + tail`, with `voice.start` 0.2–0.3 s and a tail of 0.5–1 s so
   the last word is not clipped and the music can fade.
3. Pick clip durations from each model's allowed values so they sum to at least `P`, one shot per
   sentence or idea. The hook shot is the shortest.
4. Trim clips (`trim.end`) so the total equals `P` and cuts land between sentences. Estimate a cut
   time as `voice.start + words spoken so far ÷ words per second`, then confirm by watching.
5. Lip-synced segments: one TTS per segment, clip duration = the next allowed value above the segment
   length; trim each clip to segment length + about 0.3 s so the gaps between segments stay alive.

Native dialogue works the other way: the clip duration is fixed by the model (4/6/8 s Veo,
5/8/10 s Seedance), so size the line to the word budget in section 2.

## 6. Music that serves the cut

**Brief it like a composer.** `[function] + [genre and era] + [precise mood] + [tempo] +
[lead instrument, support, rhythm, texture] + [energy arc] + [production feel] + instrumental`.
Precise adjectives beat generic ones: "euphoric" over "happy", "tense and metallic" over "dark".
A functional phrase ("bed for a product reveal", "under a calm explainer") steers arrangement.

Tempo by job (a starting point, not a law):

| Job | Tempo | Palette |
| --- | --- | --- |
| calm explainer, finance, health | 70–90 bpm | soft piano, warm pads, light pulse |
| lifestyle, UGC, food | 95–115 bpm | plucks, acoustic guitar, claps, lo-fi drums |
| product hype, tech launch, sport | 120–140 bpm | punchy drums, synth bass, risers |
| luxury, fashion | 80–100 bpm | deep bass, sparse keys, airy textures |

**Energy arc.** Short ads have no time for an intro: ask for a track that "starts immediately at
full groove" or "enters on the first beat". State one lift ("builds slightly into the second half")
and a clean ending ("resolves and ends cleanly"). The music model cannot see the cut, so do not
promise a hit at 7.5 s; if a beat must land on a cut, trim the clip after hearing the track.

**Under speech.** Words live in the mid-range; keep a busy lead out of it. Prefer pads, soft keys,
plucks, bass and light percussion; avoid sung vocals, vocal chops, sax or guitar solos and dense
hi-hats. Always "instrumental, no vocals" when a voice will sit on top.

**Levels** (compose `music.volume`; `duck` works only against the `voice` track):

| Situation | `music.volume` | `duck` |
| --- | --- | --- |
| TTS voice-over on top | 0.15–0.25 (busy track 0.12–0.18) | `true` |
| speech is inside the clips (no `voice` track) | 0.08–0.15, or no music | has no effect |
| clips with native SFX/ambience, no speech | 0.25–0.4 | – |
| music-only piece | 0.6–1.0 | – |

Ducking is a fixed sidechain: music dips as soon as the voice starts and swells back about 0.4 s
after it stops. Long pauses in the script therefore make the bed "breathe"; if that pumps, lower
the music rather than relying on the duck.

**Length.** Generate music at least as long as the program: a short track loops and the seam is
audible. `lyria-3.5` currently returns 30 s; for anything longer use `stable-audio-2.5` (60/90/180).

## 7. Sound design inside audio-capable video prompts

Only for clips whose own audio reaches the final mix (no compose `voice` track), on a model with
`caps.audio`, with `audio: true`. Sound is under-directed by default: if you do not name it, the
model guesses, and often adds a score.

- **Tie each sound to something visible**: "the cap clicks as she twists it", "ice cracks as the
  soda pours". Name source and surface: heels on marble, sneakers on wet asphalt.
- **Two or three sounds plus one bed** is enough: an action sound, a detail sound, an ambience.
- **Say what stays quiet**: "no music", "no crowd", "quiet office hum only".
- **Dialogue**: speaker, the line in quotes, how it is said. Keep it to one or two short lines.

Syntax that works:
- Veo 3.1: `The barista says: "Oat or regular?"`, `SFX: steam wand hisses, cup set on the counter`,
  `Ambient noise: low café chatter, espresso machine`. Time-coded parts are allowed:
  `[00:00-00:03] …` `[00:03-00:06] …`. Multi-person exchanges work inside one clip.
- Seedance 2.0: quoted line plus a delivery note ("plays it dry and a little proud"); name the
  diegetic sounds; write "no music" or it tends to score the clip; split long speeches into short
  lines across shots.
- Kling, Wan 2.5, LTX-2, MiniMax H3: same plain prose. Ambience and simple effects are reliable;
  treat dialogue as best-effort unless the model notes say lip-sync.

## 8. Mix checklist (before delivery)

- [ ] Every word is clear on a phone speaker at low volume. If one gets lost, drop music by 0.05.
- [ ] Music is instrumental under speech and never louder than the voice in the gaps.
- [ ] One TTS model and voice for the whole piece; compose does not level loudness, so different
      voices or native-audio clips from different generations will jump. Retake the odd one out.
- [ ] No clipping: compose sums tracks without normalising. Keep `voice.volume` ≤ 1 and music ≤ 0.3
      under a voice; listen to the loudest moment.
- [ ] The first syllable is intact (`voice.start` 0.2–0.3 s) and the last word has 0.5–1 s of tail.
- [ ] Music ends on the fade (`fadeOut` 1–2 s); it has no fade-in, so choose a track that starts
      at full body.
- [ ] Clips that carry native speech are joined with `cut` where possible; a `fade` crossfades
      picture and sound together over 0.4 s, which blurs a word if it falls inside the fade.
- [ ] A GIF output has no audio at all.

## Per-model notes

**`lyria-3.5`** (13 credits, music). Prompt with genre and style, mood, instrumentation, tempo
(bpm or a feel such as "slow, swaying"), and "Instrumental" to exclude vocals; without it the model
may sing. It refuses to imitate real artists, so describe the sound, not the name. Sung lyrics are
possible (lyrics in quotes; supported languages English, German, Spanish, French, Hindi, Japanese,
Korean, Portuguese; Russian is not on the list). The current provider returns a 30 s track.

**`stable-audio-2.5`** (45 credits, 30/60/90/180 s). Lead with the three essentials: genre or
subgenre, tempo in bpm, and a precise mood word. Then layer: lead instrument, supporting parts,
rhythm, texture (pads, reverb tails), production ("studio-clean", "lo-fi bedroom"). Place or era
cues ("80s gated reverb", "Ibiza") and a use case ("for opening credits") steer the arrangement.
No negative prompt: state what you want, not what to avoid. `params.guidance_scale` raises
adherence to the prompt if it is being ignored. Good for longer beds, ambience and textural loops.

**`kokoro`** (5 credits / 1k chars). Our ids map to American English voices: `en-female-1` →
af_heart (the best-rated Kokoro voice), `en-female-2` → af_bella, `en-male-1` → am_michael,
`en-male-2` → am_fenrir (both male voices are rated noticeably lower; for a quality English male
voice use `minimax-tts`). Most stable on passages of roughly 100–200 tokens; one-line snippets can
sound odd and very long passages rush, so split long scripts into several steps. No tags, no
emotion control, no Russian.

**`minimax-tts`** (12 credits / 1k chars, default `auto:tts`). Runs MiniMax speech-2.8-turbo, with
speech-2.6-turbo as fallback. Voice ids: `ru-female-1` Russian_BrightHeroine, `ru-female-2`
Russian_AmbitiousWoman, `ru-male-1` Russian_ReliableMan, `ru-male-2` Russian_AttractiveGuy,
`en-female-1` English_expressive_narrator, `en-female-2` English_CalmWoman, `en-male-1`
English_Trustworth_Man, `en-male-2` English_magnetic_voiced_man; any other MiniMax system voice id
is passed through. `language: "ru"` switches on the Russian language boost. Emotion is picked from
the text automatically. Pauses `<#x#>` (0.01–99.99 s) go between spoken words, never two in a row.
Bracket interjections `(laughs)` etc. are speech-2.8 only. Digit reading is not normalised: spell
numbers out. Limit 5 000 characters per step.

**`eleven-v3`** (19 credits / 1k chars). The most expressive option; square-bracket audio tags for
emotion, reactions and a few effects (`[applause]`, `[gulps]`), plus experimental `[strong X accent]`
and `[sings]`. Tags respond best at the provider's default stability; pick a voice whose natural
range contains the emotion you tag. Punctuation matters more than on other models: ellipses for
weight, capitals for stress. `params.speed` 0.7–1.2, `params.style` 0–1. The provider normalises
numbers automatically, but spelling them out is still safer for Russian. The `voice` value is sent
to the provider as is (the `<lang>-<gender>-<n>` ids are mapped for `minimax-tts` and `kokoro`), so
confirm the voice with a one-sentence test before a long script.

## Sources

- ElevenLabs, Eleven v3 prompting best practices: https://elevenlabs.io/docs/best-practices/prompting/eleven-v3
- fal, ElevenLabs Eleven v3 TTS API: https://fal.ai/models/fal-ai/elevenlabs/tts/eleven-v3/api
- MiniMax, T2A (speech) HTTP API: https://platform.minimax.io/docs/api-reference/speech-t2a-http
- Kokoro-82M voices and grades: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
- Google Cloud, Ultimate prompting guide for Lyria 3 Pro: https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-lyria-3-pro
- fal, Lyria 3 API: https://fal.ai/models/fal-ai/lyria3/api
- Stability AI, Stable Audio 2.5 prompt guide: https://kb.stability.ai/knowledge-base/stable-audio-2.5-prompt-guide
- fal, Stable Audio 2.5 API: https://fal.ai/models/fal-ai/stable-audio-25/text-to-audio/api
- Google Cloud, Ultimate prompting guide for Veo 3.1: https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1
- fal, Seedance 2.0 prompting guide: https://fal.ai/learn/tools/seedance-2-0-prompting-guide
