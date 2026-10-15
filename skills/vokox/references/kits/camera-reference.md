# Kit: camera reference (borrow a camera move from a clip)

Only models that take a video reference: `seedance-2-mini` (2 refs: 1 image + 1 video),
`seedance-2-fast`, `seedance-2`, `minimax-h3`. refs = `["@subject", "file:./move.mp4"]`.
The reference seconds are billed on top of the output: cut the clip to the move itself (3–6 s,
Seedance takes at most 15 s of reference video in total).

```
The {subject: "runner"} from @image1, with the same face, clothes and build, in {setting: "an
empty stadium at dawn" | "the setting of @image1"}. Follow only the camera of @video1: its
framing, height, lens feel, path and speed ({one-line description of the move, e.g. "starts low
behind the heels, rises and swings round to a front medium shot"}). Do not take the person, pose,
body motion or place from @video1. The {subject} simply {natural action that suits the move:
"jogs forward at an easy pace"}. Keep it subtitle-free.
```

Slots: `{subject}`, `{setting}`, `{move description}`, `{action}`.
Describing the move in words as well helps the model find what to copy. Pick an action whose
rhythm fits the move (a slow orbit wants a slow action). Price: output seconds + reference seconds
at the "video ref" rate (`vokox gen … --estimate`).
