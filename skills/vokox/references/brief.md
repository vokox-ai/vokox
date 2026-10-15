# Brief first, credits second

Most wasted credits trace back to one fact nobody wrote down before the first render: the clip
came out 16:9 for a Reels account, the label was invented because no product photo was asked
for, the voice spoke English to a Russian audience, the price was guessed. A brief is cheap
insurance. Build it before any paid step, keep it in `brief.md`, and let it steer every prompt.

## What a brief must answer

| Field | Why it changes the work | Default when the user is silent |
| --- | --- | --- |
| Goal | What the viewer should do or feel at the end decides the hook and the last shot | Infer from the request; state your reading in one line |
| Viewer | Age, niche and awareness change casting, tone and wording | The obvious buyer of the product |
| Platform, aspect | Crop, caption position, pacing | Reels/TikTok/Shorts → 9:16; YouTube/site → 16:9; feed → 4:5; marketplace card → 1:1 |
| Length | Shot count and voice script length | 15–20 s social, 6 s bumper; never over 30 s unasked |
| Speech | Language, voice or no voice, captions | User's language, one voice, captions on |
| Supplied material | Anything with an identity: face, exact product, logo, UI, voice sample, brand colours | Nothing; cast and design it yourself, and say so |
| Hard facts | Product name, volume, price, offer, claim, CTA wording, URL | None. Leave out, never invent |
| Must-have vs taste | Must-haves are acceptance criteria; taste is where you have freedom | Everything is taste until the user marks it |
| Budget | Tier, drafts, number of retakes | Propose a range, get a number |
| Variants, deadline | Parallel versions multiply cost | One version |
| Off-limits | Looks, words, competitors, faces the user refuses | — |

## Identity comes from files, not adjectives

A model can invent a pleasant generic creator or a plausible bottle. It cannot reproduce *this*
person, *this* label or *this* app screen from a description. When the result has to be
recognisable, ask for the file: a frontal, well-lit face photo; the product on a plain
background, front and side; the logo as PNG/SVG; screenshots of the UI. When the user has none,
tell them the trade-off in one sentence ("Without a photo of the jar I'll design a neutral one;
your real label won't appear") and record it under *Supplied*.

## Ask little, decide a lot

Ask only what you cannot reasonably guess and what would change the output: platform, language,
real facts, supplied files, budget. Batch at most three questions into one message, and pair each
with the default you will use if they skip it: "I'll make it 9:16 for Reels with a Russian female
voice unless you say otherwise."

Worth asking:
- "Is the price 1 490 ₽ in the ad, or should the price stay out?"
- "Do you have a photo of the actual bottle? A generated one will not match your label."
- "Who is this for: first-time buyers or people who already know the brand?"

Decide yourself and mention in passing: lens, light, music genre when the mood is obvious,
caption style, shot order, casting details, model choice within the agreed tier.

## Money is part of the brief

Before anything paid, agree three numbers and write them down:

1. **Draft round** — storyboard stills and a cheap motion test (see the draft ladder in
   `workflow.md`), typically 10–100 credits for a 20 s piece.
2. **Final round** — the deliverable at the agreed tier, from `vokox run plan.json --estimate`.
3. **Retake reserve** — about 20–30 % of the final estimate for fixing shots that fail review.

Keep the distinction explicit in `brief.md`: an *estimate* is your number; an *approval* is the
user's "yes" to a described scope; a *ceiling* is the cap passed as `--max-credits`. An approval
covers what was described. A new clip, a higher tier, a second variant or retakes beyond the
reserve are new scope and need a new yes. Credits are charged per job; taste-based redos are not
refunded, so the user should know that before they approve.

## Brief versus treatment

Two different documents, two different owners, one file.

- **Brief** = the user's intent and the facts only they can provide. Quote their words where a
  paraphrase could shift meaning. It changes only when *they* change their mind or supply a new fact.
- **Treatment** = your creative answer to the brief: the idea, the hook, the beat structure, who
  is on screen and how they behave, the look, the sound, what carries identity from shot to shot.
  It changes when you find a better answer or when review shows the idea does not play.
- **plan.json** = the implementation: prompts, models, refs, durations. A prompt fix that keeps
  the same idea edits the plan, not the treatment.

| What changed | Edit |
| --- | --- |
| User wants a different CTA, a new fact, a new budget | Brief (and Money) |
| The shot logic or concept does not work on screen | Treatment, then plan |
| A clip failed for technical reasons, same idea | plan.json only |
| New insight from a reference clip | `ref/<name>/study.md`, then Treatment if it changes the idea |

Show the treatment to the user as 4–6 plain lines before the paid round. They approve the idea,
not the prompts.

## brief.md template

Rewrite sections as the truth changes; this is a current snapshot, not a diary.

```md
# spring-serum — brief

## Brief (user's goal)
Goal: get skincare beginners to tap "shop" on the serum
Platform: Instagram Reels, 9:16, 20 s
Speech: Russian, warm female voice, captions on
Must be true: "Aqua Serum 30 ml", price 1 490 ₽, CTA "ссылка в профиле"
Supplied: ./in/bottle-front.jpg, ./in/bottle-side.jpg, ./in/logo.png (no face: cast a creator)
Must-have: label readable in at least one shot
Taste: morning bathroom light, calm
Not wanted: before/after skin comparisons

## Money
Draft round: ≤ 90 credits — approved 27.09
Final: estimate 430, ceiling 480 — waiting for approval
Retake reserve: 100
Spent: 64

## Treatment (our answer)
Hook: close-up, the dropper already above a fingertip; her thumb squeezes the bulb and one drop falls (cause visible in frame). Voice asks a question in the first second.
Beats: hook → creator applies it in the mirror → label beauty shot → creator's verdict + CTA.
Casting: woman, late twenties, bare face, oversized cream tee; same key frame for both creator shots.
Look: phone-captured, soft window light from the left; one look sentence shared by all prompts.
Sound: voice carries the message, lo-fi bed at 0.18 with ducking.

## Status
Done: storyboard (z-image), motion test 480p approved except shot 3 (label warps on turn).
Next: redesign shot 3 as a slow push-in, then final run.
Open: user to confirm the price line.
```

## Resuming

A new session starts by reading `brief.md`, `plan.json` and `<out>/manifest.json`, then looking
at the files already downloaded. Finished steps are already paid for; never regenerate them just
because the conversation was lost.
