# Kit: talking head (UGC creator to camera)

Use with `seedance-2-fast` (default), `seedance-2`, or `seedance-2-mini` for drafts;
refs = `["@face", "@voice"]`. Make the face frame first with `kits/ugc-photo.md`, the voice with
TTS (ideally one TTS step per clip, cut on sentence ends), then this clip.

```
Vertical selfie-style video of the person in @image1 talking straight to the phone camera. Keep
@image1 as it is: same face, hair, clothes, room, light and framing. @audio1 is this person's voice
for this clip: they say exactly these words, in this order, lips matched to the audio, nothing more:
"{script for this clip}". Photoreal skin, steady hands, natural blinking. Keep it subtitle-free:
no captions, logos, stickers or any written words on screen.

INTENTION: {one sentence: to whom, about what, how she feels, e.g. "telling a friend about a
shortcut she is a little proud of, warm and quick"}.
ACCENT: {one physical beat on one quoted word, e.g. "at 'two minutes' she taps the table once and
grins" | none}.
GAZE: {"on the lens throughout" | "glances down at the product on '{word}', back to the lens for
the last line"}.
CAMERA: {"phone on a stand, slight natural sway" | "handheld selfie, arm moves a little" |
"locked, one slow push-in on the last line"}.
```

Slots: `{script}` (exact words of this clip), `{intention}`, `{accent}`, `{gaze}`, `{camera}`.
Rules:
- Duration = this clip's voice length rounded up to an allowed value (5, 8, 10 s; 15 s on
  `seedance-2`). Do not feed the whole ad's voice to a 5 s clip.
- Russian speech: the audio reference carries it (Russian is not in Seedance's official
  native-speech list); still quote the words so mouth shapes follow the script.
- Same `@face` and the same CAMERA line in every segment; vary only INTENTION and ACCENT as the
  argument moves (open → explain → land). Jump cuts between segments happen in `compose`.
- Energy presets for INTENTION: bright hook ("can't wait to tell you"), calm expert ("walking a
  client through it, unhurried"), playful ("teasing the viewer a little for not knowing yet"),
  serious ("pointing out a mistake that cost money, flat and sure").
