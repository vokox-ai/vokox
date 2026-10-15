# Blender blockout: control the camera and the physics, let the model paint

When a shot depends on an exact camera move, timing, layout or physics (an orbit, a reveal, a pass-by, a pile of
products falling, a tracking shot), don't ask a video model to invent them from words. Build a 3–5 s gray-box
version in Blender, then let the model paint reality over it. Words alone give random framing, jumps and floating
objects; a blockout fixes them before a credit is spent.

Use it for: camera moves (orbit, chase, reveal, parallel tracking), product showcases (turntable, a hero rising from a
box), physics (things falling, piling, bouncing), anything where *where* and *when* matter. Skip it for a still camera
on a simple action, talking heads, and anything a single image-to-video prompt already nails.

## Setup (ask first)

Blender is free but ~400 MB: ask the user before installing. macOS `brew install --cask blender`
(binary `/Applications/Blender.app/Contents/MacOS/Blender`), Linux `apt install blender` or the official tarball.
Everything runs headless: `blender -b -P scene.py -- <out_dir>`. Starter scenes ship with this skill in `blender/`:

| script | what it gives you | knobs (env vars) |
| --- | --- | --- |
| `orbit.py` | product on a plinth, one eased full circle, seamless studio | `SECONDS`, `ASPECT`, `SIZE` |
| `rain_pile.py` | items rain into a studio and pile up (rigid-body physics), top-down push-in | `N`, `ITEM`, `ASPECT` |
| `walk.py` + `legs.py` | legs-only walk or run with planted feet (two-bone IK, heel-to-toe roll) | `GAIT`, `CAMERA`, `ASPECT` |
| `common.py` | reset, flat materials, primitives, camera aim, Blender 5 f-curves, Workbench render | `STILLS=1,40,96` |

Copy a script next to the project, edit the scene (sizes in metres, toe/forward along +Y or +X as commented), run it.

## The pipeline

1. **Block it out.** Primitives only (boxes, cylinders, spheres), real-world sizes, flat colours that match the
   intended look (colours carry into the result: a red block becomes a red car). Render with Workbench (fast, no
   GPU needed), 24 fps, the final aspect. **No text, no logos, no gizmos** in the render: letters and helper lines leak
   into the footage. Keep it 3–5 s: the reference is billed per second on top of the output.
2. **Check stills before the full render.** `STILLS=1,30,60,90,120` renders only those frames. Look at them: the
   subject in frame and big enough, nothing hidden behind a wall, nothing cut by the frame edge at the key moment,
   the reveal not visible too early. Most first blockouts fail this; fix the camera, not the prompt.
3. **Turn one frame into a photo.** Pick the frame that shows the look best (for motion: a frame where weight is on a
   planted foot, never mid-air). Image model with refs `[blockout frame, product photo]`: "Image 1 is a gray 3D layout:
   repaint it as a real photograph keeping the exact camera angle, framing and the position of every object; the
   gray blocks are …". Name what each block is. For people add an anatomy line (exactly one person, exactly two legs,
   each shoe on its own leg, normal proportions) and use `nano-banana-pro`; generate 2 and pick.
4. **Generate the video from both.** `seedance-2` (or `seedance-2-fast`) with refs `["@photo", "file:./blockout.mp4"]`:
   - "Video 1 is a gray blockout that gives the exact camera move, timing and the motion of every object: copy it
     exactly. Image 1 shows the real look of this shot." Then describe materials, light, sound; one camera
     instruction at most (the reference already carries it).
   - Name the physics you want kept: "real gravity, real-time speed, no slow motion, no floating, objects keep their
     shape".
   - Constraints inline: "Keep without subtitles, no text, no logos; avoid jitter, flicker and warping."
   - Price: output seconds + reference seconds at the video-ref rate (`vokox gen … --estimate`).
5. **Check every clip frame by frame** (contact sheet at 3–8 fps) for jumps, morphing, extra limbs, sliding feet,
   objects changing shape. Retake or re-cut; never hand over unchecked.
6. **Text goes on in compose**, never in the generation: hooks, captions, prices, CTAs (`vokox compose` titles and
   captions, or your own overlay).

## Choosing the video model for a blocked-out shot

| need | use |
| --- | --- |
| the camera must follow the blockout exactly (orbit, tracking, reveal, physics) | `seedance-2` with the blockout as Video 1 |
| maximum realism of nature (water, fur, foliage) and the move is simple | `veo-3.1-fast` from the photo **first frame only**, the move in words ("single continuous shot, constant speed") |
| short tight close-up, natural motion | `kling-3-pro` from the photo |

Never give a model a first **and** last frame that differ a lot (e.g. a 90° orbit): it morphs between them and the
skyline or the subject jumps. Use the first frame only, or the blockout as a video reference.

## Lessons that cost credits

- **Big objects need distance.** A city across the water that fills the frame looks like a wall: put it 800 m–1 km
  away with sky above. A 9:16 frame is narrow: pull the camera back or the subject gets cut.
- **Start the shot where the action already is.** For a hook, begin mid-simulation (a pile already lying, more
  falling) or mid-move; an empty first second loses the viewer.
- **Hidden starts.** An object that starts behind a wall or outside the frame never shows its motion. Start it in
  frame (top corner, deep in the scene).
- **People:** full legs climbing stairs or jumping still come out unnatural, even from a correct blockout. Walk and
  run (with `walk.py`) work; for stairs, jumps and landings shoot a tight close-up at foot level (shoes and trouser
  hems only, one step or one hop). Start frames with a planted foot, never both feet in the air.
- **Physics sims:** low bounce (restitution ≈ 0.05) and some damping, or items scatter out of frame; aim the drop at
  one spot; a top-down camera keeps strays out of shot.
- **Flat colour is information.** A dark sea block gives dark water; grey towers give grey towers. Choose blockout
  colours on purpose, and describe the real look in the prompt so the model does not copy the boxes ("render real
  objects, not their simple shapes").
- **Recognisable landmarks sneak in** (a supertall with a spire becomes One World Trade Center): say "a generic
  city, no recognisable landmark buildings".
- **Blender 5:** actions are layered (`act.layers → strips → channelbags → fcurves`, see `common.fcurves`); bake
  rigid bodies with `bpy.context.temp_override(scene=…, point_cache=…)` + `bpy.ops.ptcache.bake(bake=True)`.
