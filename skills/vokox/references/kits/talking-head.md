# Kit: talking head (UGC creator to camera)

Use with `seedance-2-fast` (default) or `seedance-2`; refs = `["@face", "@voice"]`.
Generate the face frame first with `kits/ugc-photo.md`, the voice with TTS, then this clip.

```
Create a realistic vertical phone-shot talking-head video. @image1 is the visible speaker and
scene reference: preserve the person's identity, face, outfit, setting, lighting, lens feel and
composition. @audio1 is the speech to deliver: the visible person speaks every line with clear
lip-sync; do not add, remove or reorder words. Keep face, hands, skin texture, lighting and motion
photoreal and stable. No subtitles, captions, labels, logos or on-screen text.

PERFORMANCE: {attitude, e.g. "sharing a discovery with a friend, eager and a little amused; at
the key claim the eyebrows rise and one hand opens toward the lens; ends with a small nod"}.
CAMERA: {"locked-off phone on a stand, slight natural sway" | "handheld selfie, gentle movement"}.
```

Slots: `{attitude}` (one sentence of intention + one physical accent), `{camera}`.
Duration = voice length rounded up to the model's allowed values (8 or 10 s segments).
Split long scripts into 8–10 s segments cut on sentence ends; same refs in every segment.
