# Kit: video-call look (phone call screen, one or two people)

For "my friend called me about…" skits and call-style testimonials. Use `seedance-2-fast`
(image + voice refs) or `seedance-2` for two voices in one clip. Draw a generic call layout,
not a real app's interface or logo.

Step 1, the call frame (image, `nano-banana-2` or `gpt-image-2`, refs = the face images):
```
Vertical phone screenshot of a video call in progress. Main full-screen tile: {person A: "the
woman from the reference, at her kitchen table, laptop-webcam angle from slightly below"}. Small
rounded tile in the top-right corner: {person B: "a man in a parked car, phone held at arm's
length"}. Thin generic call controls along the bottom (mute, camera, red end-call button), no
app name, no logos, no readable text. Webcam image quality: slight noise, soft focus, mixed indoor
light.
```
Make a second frame with the tiles swapped when B also speaks.

Step 2, the clip (refs = `["@callA", "@voiceA"]`):
```
The video call from @image1 stays exactly as laid out: same tiles, borders, controls and
positions. Both tiles are live. The person in the main tile speaks with @audio1, lips matched:
"{line}". {intention: "telling him the news, trying not to laugh"}. The person in the small tile
stays silent and reacts: {reaction: "leans closer to his phone, eyebrows up, then grins"}. Webcam
feel, small natural movements, no camera moves inside the tiles. Keep it subtitle-free.
```

Slots: `{person A}`, `{person B}`, `{line}`, `{intention}`, `{reaction}`.
Turn-taking: one speaker per clip and cut between `@callA` and `@callB` clips in `compose` (the
speaker always owns the big tile). For a quick exchange in one clip on `seedance-2`: refs
`["@callA", "@callB", "@voiceA", "@voiceB"]`, write the lines as `A: "…" B: "…"`, say that A speaks
only with @audio1 and appears in @image1's big tile, B speaks only with @audio2 and appears in
@image2's big tile, and that the view switches to the speaker's layout on each line.
