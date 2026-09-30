# Format: two-person podcast clip

**For:** expert-vs-skeptic takes, founder + host conversations, myth-busting, product mentions
inside a conversation, "clip from our podcast" series. **Why it works:** a doubt voiced by one host
is the viewer's own doubt; the other host's answer lands harder than a monologue. The relationship
between the two drives the cuts. Sound mode: **clip sound**.

## Beats (≈ 30 s, three 10 s clips)

| Clip | Job | Cut pattern |
| --- | --- | --- |
| 1 | the strongest claim first, mid-conversation; B reacts in disbelief | on the speaker, one reaction cut |
| 2 | B pushes back with the viewer's objection; A gives the concrete proof | speaker cuts, compact handoffs |
| 3 | payoff: B concedes or adds a twist; a line that invites comments | end on a reaction or a laugh |

Each clip ≈ 22–25 EN / 20 RU words across both hosts, 3–4 turns. Listeners stay alive (a nod, eyes
dropping to the table and returning, a half-smile) and silent.

## The pair of views

1. **Host A view** (`seedream-4.5`): A at a studio mic arm, turned toward the partner off-frame,
   face readable, the room behind (acoustic panels, lamp, plant; one brand-colored object if wanted).
2. **Host B view** (`nano-banana-2`, ref = A view): the complementary camera: B on the opposite screen
   side, gaze back across the same axis, mic arm from the other side, a different part of the same room.
3. Optional prop views: each host's view edited to hold the product (`nano-banana-2`, refs = that
   view + `file:./product.png`). A handoff = A offers toward the frame edge, B's next shot already
   holds it; later shots respect who has it.

Derive every new view from its closest parent (one hop), not from each other in a chain.

## Models

| Step | Draft | Final |
| --- | --- | --- |
| views | `seedream-4.5`, `nano-banana-2` | same |
| dialogue clips | `seedance-2-fast` 480p (10/s) | `seedance-2-fast` 720p (4 refs: viewA, viewB, voiceA, voiceB) |
| cheaper blocking | `seedance-2-mini` with a split top/bottom frame of both hosts (1 image) and voices described in words | |

## Plan skeleton

```json
{
  "name": "podcast", "budget": { "maxCredits": 750 }, "defaults": { "aspectRatio": "9:16" },
  "steps": [
    { "id": "viewA", "type": "image", "model": "seedream-4.5", "n": 2, "prompt": "{host A: …} at a podcast mic on an arm, turned toward a partner off-frame at the right, face readable; {studio details}; warm key light, vertical phone-video realism" },
    { "id": "viewB", "type": "image", "model": "nano-banana-2", "refs": ["@viewA"], "prompt": "the same studio from the reverse camera: {host B: …} on the left side of frame looking back toward the right, mic arm from the left, another corner of the room; same light" },
    { "id": "voiceA", "type": "tts", "model": "minimax-tts", "language": "{en}", "voice": "{en-female-1}", "text": "{two relaxed sentences}" },
    { "id": "voiceB", "type": "tts", "model": "minimax-tts", "language": "{en}", "voice": "{en-male-2}", "text": "{two relaxed sentences}" },
    { "id": "p1", "type": "video", "model": "seedance-2-fast", "duration": 10, "refs": ["@viewA", "@viewB", "@voiceA", "@voiceB"],
      "prompt": "Realistic vertical two-person podcast clip. @image1 is Host A's camera, @image2 Host B's; keep both people, outfits, studio, mics and camera sides. A speaks only A: lines with the voice of @audio1, B only B: lines with @audio2; the listener's mouth stays closed. Stay on the speaker; one brief cut to B's skeptical reaction during A's longest line. Clean room sound, no music, no on-screen text. A: \"{claim}\" B: \"{doubt}\" A: \"{proof}\" ACTION: {A amused and certain, B playful disbelief}" },
    { "id": "p2", "type": "video", "model": "seedance-2-fast", "duration": 10, "refs": ["@viewA", "@viewB", "@voiceA", "@voiceB"], "prompt": "{p1 contract; B's objection, A's proof; ACTION}" },
    { "id": "p3", "type": "video", "model": "seedance-2-fast", "duration": 10, "refs": ["@viewA", "@viewB", "@voiceA", "@voiceB"], "prompt": "{p1 contract; payoff and closing line; end on a laugh}" },
    { "id": "music", "type": "music", "duration": 30, "prompt": "{soft lo-fi bed, 85 bpm, no vocals}" },
    { "id": "cut", "type": "compose", "timeline": { "clips": [{ "asset": "@p1" }, { "asset": "@p2" }, { "asset": "@p3" }], "music": { "asset": "@music", "volume": 0.06 } } },
    { "id": "final", "type": "compose", "timeline": { "clips": [{ "asset": "@cut" }], "captions": { "from": "@cut", "style": "center-pop", "language": "{en}" } } }
  ]
}
```

Keep the ref order identical in every clip; only the turns and ACTION change.

## Credits

views 16 + 13 = 29 · voice samples 24 · clips 3×10 s×21 = 630 · music 13 · compose 7 + 6 →
**≈ 709** ($7.09). Draft at 480p: 300 → **≈ 379**. 20 s cut (two clips): ≈ 498.

## Typical failures

| Symptom | Fix |
| --- | --- |
| hosts face the same way | B's view must mirror A's: opposite side, gaze back across the axis |
| lines given to the wrong host | `A:`/`B:` on every turn; "speaks only A: lines"; max 4 turns per clip |
| frozen listener | ask for one listener action: eyes to the table and back, nod, lean |
| product teleports between hands | a separate prop view per state; mention who holds it in ACTION |
| music under dialogue muddy | 0.06 or none; clip audio is not ducked |
