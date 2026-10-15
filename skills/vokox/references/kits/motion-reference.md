# Kit: motion reference (copy a body movement: dance, gesture, sport)

Only models that take a video reference: `seedance-2-mini`, `seedance-2-fast`, `seedance-2`,
`minimax-h3`. refs = `["@subject", "file:./dance.mp4"]`. Trim the reference to the whole
movement plus its wind-up and settle (typically 3–8 s; Seedance accepts up to 15 s in total).

```
The {subject: "woman"} from @image1, same identity, hair and outfit, in {setting: "her kitchen
from @image1" | "a sunlit rooftop"}. She performs the movement of the dancer in @video1: same
steps, arm paths, timing and weight shifts, beat for beat. Take nothing else from @video1: not the
person, clothes, place or camera. Camera: {"locked medium-wide, full body in frame" | "slow
handheld follow"}. {sound: "upbeat pop with a clear beat" | "no music, sneaker squeaks only"}.
Keep it subtitle-free.
```

Slots: `{subject}`, `{setting}`, `{camera}`, `{sound}`.
Tips: pick a reference where the whole body stays in frame and the performer faces roughly the
same way as the subject in @image1; frame the subject image wide enough for the movement (arms
out of frame in the image means arms out of frame in the video). One performer per reference;
more than one person makes the copy unreliable. For a camera move instead of a body move use
`kits/camera-reference.md`.
