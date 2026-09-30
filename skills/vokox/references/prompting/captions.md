# Captions

Burned-in captions are part of the picture: they decide whether a muted viewer gets the message
and whether the frame still looks designed. Compose draws them in the final render; never ask a
video model to draw subtitles (it misspells them and they cannot be fixed later).

## What compose can do (and what it cannot)

```json
"captions": { "from": "@voice", "language": "ru", "style": "center-pop" }
"captions": { "text": ["Line one", "Line two"], "style": "bold-bottom" }
```

| Field | Behaviour |
| --- | --- |
| `from` | transcribes that audio asset with word timings and shows it **three words per cue**, each cue on screen from its first word to its last word; nothing is shown during pauses. Timing is relative to the start of that asset |
| `text` | your own lines, shown one after another, **each for an equal share of the whole video** (10 lines on a 20 s video = 2 s each), regardless of when they are spoken |
| `language` | hint for the transcription (`ru`, `en`, …); always set it |
| `style` | `bold-bottom`, `center-pop`, `minimal-top` (below) |

All styles: bold sans-serif (Arial or DejaVu Bold), white with a black outline, centred, auto-wrapped
at the frame width. A newline inside a `text` line becomes a space, so you cannot force a line
break: to control breaks, make each entry short enough to fit one line. Inside `text` lines a SRT
colour tag works for emphasis: `"Only <font color=\"#FFD400\">today</font>"`.

Not available: per-word karaoke highlight, custom font, size or position, a box behind the text,
animation, separate styles per speaker or per passage, captions that start mid-video, captions
transcribed from the clips' own audio or from several voice files. Do not promise these to the user.

## Styles and where they land

Intended placement on the canvas (text height is about 1/22 of the frame height for `bold-bottom`):

| Style | Position | Line fits (9:16, 1080 px wide) | Good for |
| --- | --- | --- | --- |
| `bold-bottom` | bottom centre: 30 % above the bottom edge on 9:16 (clear of the platform UI), 10 % on other shapes | ≈ 20 characters | the default for most pieces: Reels, TikTok, Shorts, feeds, YouTube |
| `center-pop` | middle of the frame, larger text | ≈ 16 characters | 9:16 Reels, TikTok, Shorts, Stories |
| `minimal-top` | top centre, smaller, not bold: 15 % below the top on 9:16, 7 % on other shapes | ≈ 30 characters | 16:9 product demos and explainers where the bottom is busy |

On 16:9 a line holds about three times as many characters. Longer text wraps to a second line;
never let a cue need three.

## Safe zones on vertical platforms

Platform UI sits on top of a 9:16 video. Meta's guidance for Reels and Stories ads: keep the top
14 %, the bottom 35 % and 6 % on each side free of text and key elements (on 1080×1920: about 270 px
top, 670 px bottom, 65 px sides). TikTok's safe area depends on the orientation, the ad caption length
and any extra ad formats attached (a longer caption shrinks it) and sits beside a column of buttons on the right;
check it in the Ads Manager preview.

What that means for our styles on 9:16:
- `bold-bottom` sits at the lower edge of the safe area (30 % up), just above the caption and
  username block. Keep faces and products out of the band from about 25 % to 40 % up.
- `minimal-top` sits just under the top 14 % band, clear of the profile row.
- `center-pop` crosses the middle of the frame, so frame the shots for it: presenter's head in the upper third ("head and shoulders in the upper
  third of the frame, space below the chin"), products above or below the centre line, or wide
  shots where the middle band is background.

## When to caption

Caption by default when there is speech and the piece goes to social feeds (assume sound-off
viewing), for talking heads, UGC and voice-over ads, and whenever the language differs from the
viewer's. Skip or keep minimal for music-only mood pieces, product loops and GIF stickers, shots
that already carry on-screen text, and briefs that ask for a clean picture. A title, price or CTA
card is not a caption: captions follow speech; a static line that is not spoken belongs in the
picture (generated key frame) or in a separate delivery.

## Choosing `from` or `text`

| Use `from: "@voice"` | Use `text` |
| --- | --- |
| a single TTS voice-over track | speech lives inside the clips (lip-sync segments, native dialogue) |
| the words must be in sync with speech | brand names, prices, numbers must be spelled exactly |
| the script is long or fast | you want one emphasised word per line |
| | there is no voice at all (a silent explainer, on-screen story) |

Things to know about `from`:
- Point it at the same asset that is the compose `voice`. Another asset gives timings that belong to
  a different recording.
- When `from` is the compose `voice`, captions follow `voice.start` automatically.
- The display text is the transcription, not your script. TTS text written as sound ("две тысячи
  девятьсот девяносто рублей", "ви-пи-эн") may come back as words or digits; unusual brand names may
  come back misspelled. When exact spelling matters, switch to `text`.

Things to know about `text`:
- Lines are spread evenly over the whole output, including the tail after the last word. Write
  lines of similar spoken length so they stay near their words; for lip-synced segments of equal
  length, give each segment the same number of lines.
- Line count ≈ video length ÷ 2–3.5 s. A 15 s ad takes 5–8 lines; a 30 s talking head 9–15.

## Reading speed and cue size

Subtitling standards (Netflix) cap reading speed at about 20 characters per second for English and
17 for Russian (adult audiences), a cue at 5/6 s minimum and 7 s maximum, and two lines at most,
preferring one. Social captions are shorter and faster-changing than film subtitles: aim for one
line of 2–5 words per cue.

Check every `text` line: `characters ÷ seconds on screen` must stay under 20 (EN) / 17 (RU), and the
line should fit the style's one-line width above. Example: 20 s video, 10 lines → 2 s each → up to
40 EN / 34 RU characters by speed, but `center-pop` fits about 16 per line, so write short lines
and use more of them, or accept a second line.

Where to break the text (between entries): after punctuation, before conjunctions ("and", "but",
"и", "но") and before prepositional phrases. Keep together: a number and its unit ("30 %", "2 990 ₽"),
first and last names, a negation and its verb ("не работает", "doesn't stop"), an article or
preposition and its noun, an adjective and its noun.

Written form on screen: digits for prices, percentages, dates and anything above ten; words for
small numbers in running text. On screen show "2 990 ₽" even though the TTS text says it in words.

## Emphasis

One highlighted word per line at most, and not on every line: the payoff number, the product name,
the verb of the promise. In `text` use the colour tag with the brand accent or a high-contrast
yellow (`#FFD400`), or write the word in capitals. `from` captions cannot be emphasised. Colouring
half the words means nothing stands out.

## Language

Set `language` to the spoken language. Russian lines run longer than English for the same thought,
so plan fewer words per line. For a translated version, rewrite the lines for reading rather than
transcribing a literal translation.

## Plan snippets

Voice-over ad, vertical, for Reels/TikTok:
```json
"captions": { "from": "@voice", "language": "ru", "style": "center-pop" }
```

Talking head from three lip-synced 10 s segments, exact spelling and one highlight:
```json
"captions": { "style": "center-pop", "text": [
  "Три месяца искал", "нормальный VPN.", "Этот держит", "даже в поезде.",
  "Скорость <font color=\"#FFD400\">как дома</font>", "без обрывов.",
  "Первый месяц", "за 1 ₽.", "Ссылка в профиле." ] }
```

YouTube explainer, 16:9:
```json
"captions": { "from": "@voice", "language": "en", "style": "bold-bottom" }
```

## Review after compose

Open the final video and look at frames at the start, middle and end, then watch once with sound:
- [ ] text size and position match the table above; if it lands elsewhere or wraps to three or more
      lines, shorten the lines or switch style before delivering;
- [ ] no cue covers a face, the product or a platform UI zone;
- [ ] at most two lines, readable at a glance; nothing flickers faster than about 0.8 s;
- [ ] brand names, prices and numbers are spelled right;
- [ ] the first cue appears with the first spoken word, and cues follow the voice to the end.

## Sources

- Meta Business Help Centre, text overlays and the safe zone for ads in Stories and Reels: https://www.facebook.com/business/help/980593475366490/
- TikTok Ads Manager help, in-feed ad specifications and safe zone: https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads
- Netflix, Timed Text Style Guide, general requirements: https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements
- Netflix, English (USA) Timed Text Style Guide: https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide
- Netflix, Russian Timed Text Style Guide: https://partnerhelp.netflixstudios.com/hc/en-us/articles/215346638-Russian-Timed-Text-Style-Guide
- fal, Whisper (word-level transcription used for `from`): https://fal.ai/models/fal-ai/whisper
