# Kit: UGC creator photo (first frame for a talking head or reaction)

Use `gpt-image-2` or `seedream-4.5`; optional refs = `["file:./face.png"]` to keep a real person.

```
A photograph captured as a single frame from a video actually shot on an iPhone, with the texture
of real phone footage. It looks real, without an oily over-processed finish. The background is
clearly visible with no depth-of-field blur; natural fine skin texture.
{person: "a woman in her early thirties, dark hair in a low bun, oversized grey hoodie, friendly
alert expression, broad shoulders and good head-to-shoulder proportion"}, face pointed straight
at the lens, no head tilt, {holding: "a white ceramic mug" | nothing}.
{setting: "a bright kitchen with a window on the left, plants on the sill"}. Vertical 9:16,
slight handheld tilt, natural daylight.
```

Slots: `{person}`, `{holding}`, `{setting}`. If a face reference is given: "the person is
@image1: keep identity exactly". Generate 2 variants (`n: 2`) and pick the one with the
cleanest eyes and hands.
