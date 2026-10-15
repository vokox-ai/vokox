# Kit: UGC creator photo (first frame for a talking head or reaction)

Use `seedream-4.5` or `nano-banana-2` for 9:16 (`gpt-image-2` makes only 1:1, 3:2, 2:3); optional refs = `["file:./face.png"]` to keep a real person.

```
Paused frame from a casual phone video, not a photo shoot: mild sensor grain, natural skin with
pores and small imperfections, no retouching or plastic shine. Everything in the room stays in
focus, background included.
{person: "a woman in her early thirties, dark hair in a low bun, oversized grey hoodie, friendly
alert expression, well-proportioned shoulders"}, looking straight into the lens with a level head,
{holding: "a white ceramic mug" | nothing}.
{setting: "a bright kitchen with a window on the left, plants on the sill"}. Vertical 9:16,
phone held at chest height and tilted a touch, daylight from the window.
```

Slots: `{person}`, `{holding}`, `{setting}`. If a face reference is given: "the person is
@image1: keep identity exactly". Generate 2 variants (`n: 2`) and pick the one with the
cleanest eyes and hands. A level, lens-facing head animates and lip-syncs best; leave space
around the hands if the clip will have gestures.
