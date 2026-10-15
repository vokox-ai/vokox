"""
Shared helpers for VokoX blockout scenes: reset, flat materials, primitives, Blender 5 f-curves, Workbench render.
Every scene script takes: blender -b -P scene.py -- <out_dir> [args]; STILLS=1,40,96 renders only those frames.
"""
import bpy, math, os, sys

FPS = 24

def setup(seconds, res=(1280, 720)):
    out = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/blockout"
    os.makedirs(out, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = 1, FPS * seconds
    scene.render.resolution_x, scene.render.resolution_y = res
    return scene, out, FPS * seconds

_mats = {}
def mat(name, rgb):
    if name in _mats: return _mats[name]
    m = bpy.data.materials.new(name); m.diffuse_color = (*rgb, 1.0); _mats[name] = m
    return m

def _finish(o, name, m, parent):
    o.name = name
    if m: o.data.materials.append(m)
    if parent: o.parent = parent
    return o

def box(name, loc, size, m, parent=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.scale = size
    return _finish(o, name, m, parent)

def cyl(name, loc, r, depth, m, parent=None, rot=(0, 0, 0), verts=24):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    return _finish(bpy.context.object, name, m, parent)

def ball(name, loc, scale, m, parent=None, segs=16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=loc, segments=segs, ring_count=max(8, segs // 2))
    o = bpy.context.object; o.scale = scale
    return _finish(o, name, m, parent)

def cone(name, loc, r1, r2, depth, m, parent=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=16)
    return _finish(bpy.context.object, name, m, parent)

def empty(scene, name, parent=None):
    o = bpy.data.objects.new(name, None); scene.collection.objects.link(o)
    if parent: o.parent = parent
    return o

def camera(scene, lens):
    d = bpy.data.cameras.new("Cam"); d.lens = lens; d.clip_end = 8000
    c = bpy.data.objects.new("Camera", d); scene.collection.objects.link(c); scene.camera = c
    return c

def aim_rot(pitch_deg, yaw_deg, roll_deg=0):
    """Camera rotation looking along yaw (0 = +Y, -90 = +X) with pitch (negative = down)."""
    return (math.radians(90 + pitch_deg), math.radians(roll_deg), math.radians(yaw_deg))

def fcurves(obj):
    act = obj.animation_data.action
    if hasattr(act, "fcurves"): return list(act.fcurves)
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            for bag in strip.channelbags: out += list(bag.fcurves)
    return out

def linear(obj):
    for fc in fcurves(obj):
        for k in fc.keyframe_points: k.interpolation = "LINEAR"

def smoother(u):
    u = min(1.0, max(0.0, u)); return u * u * u * (u * (u * 6 - 15) + 10)

def render(scene, out, name, sky=(0.62, 0.74, 0.86), light=(0.4, -0.5, 0.75)):
    w = bpy.data.worlds.new("Sky"); w.color = sky; scene.world = w
    scene.render.engine = "BLENDER_WORKBENCH"
    sh = scene.display.shading
    sh.light = "STUDIO"; sh.color_type = "MATERIAL"
    sh.show_shadows = True; sh.show_cavity = True; sh.show_object_outline = True
    scene.display.light_direction = light
    scene.render.image_settings.file_format = "PNG"
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, f"{name}.blend"))
    if os.environ.get("STILLS"):
        for f in [int(x) for x in os.environ["STILLS"].split(",")]:
            scene.frame_set(f); scene.render.filepath = os.path.join(out, f"still_{f:03d}.png")
            bpy.ops.render.render(write_still=True)
    else:
        scene.render.filepath = os.path.join(out, "f_")
        bpy.ops.render.render(animation=True)
    print("DONE", out)
