"""
Physics hook: many items rain into a studio and pile up (rigid bodies, convex hulls). The camera looks down into the
pile and pushes in slowly; the shot starts mid-simulation so the heap is already there and more keep landing.
  blender -b -P rain_pile.py -- <out_dir>
Env: N (70 items), ITEM "w,d,h" metres (0.30,0.11,0.12 = a shoe-sized box), ASPECT (9:16 | 16:9)
"""
import bpy, bmesh, math, random, os, sys
from mathutils import Matrix, Vector
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from common import setup, mat, box, camera, aim_rot, smoother, render

N = int(os.environ.get("N", 70))
IW, ID, IH = (float(x) for x in os.environ.get("ITEM", "0.30,0.11,0.12").split(","))
RES = (720, 1280) if os.environ.get("ASPECT", "9:16") == "9:16" else (1280, 720)
scene, OUT, FRAMES = setup(5, res=RES)
START = 49                     # rendered frames START..FRAMES (3 s); the pile forms before the shot begins
random.seed(21)
COLOURS = [(0.92, 0.92, 0.90), (0.12, 0.12, 0.13), (0.75, 0.15, 0.12), (0.15, 0.30, 0.60), (0.30, 0.45, 0.30),
           (0.85, 0.75, 0.55), (0.55, 0.55, 0.58), (0.95, 0.85, 0.80), (0.20, 0.22, 0.30)]

box("Floor", (0, 0.5, -0.05), (6, 6, 0.1), mat("floor", (0.62, 0.40, 0.28)))
box("Wall", (0, 2.2, 1.5), (6, 0.1, 3.2), mat("wall", (0.70, 0.42, 0.30)))
bpy.ops.rigidbody.world_add()
rw = scene.rigidbody_world
rw.point_cache.frame_start, rw.point_cache.frame_end = 1, FRAMES
rw.substeps_per_frame = 20; rw.solver_iterations = 20
for name in ("Floor", "Wall"):
    o = bpy.data.objects[name]; bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.rigidbody.object_add(); o.rigid_body.type = "PASSIVE"; o.rigid_body.friction = 0.9; o.select_set(False)

def item(i):
    """Two stacked blocks in two colours (a body and a sole/cap): reads as an object, keeps a convex hull cheap."""
    me = bpy.data.meshes.new(f"Item{i}"); bm = bmesh.new()
    for c, s, mi in (((0, 0, IH * 0.15), (ID, IW, IH * 0.3), 1), ((0, -IW * 0.05, IH * 0.62), (ID * 0.92, IW * 0.85, IH * 0.65), 0)):
        r = bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(Vector(c)) @ Matrix.Diagonal(Vector((*s, 1.0))))
        for v in r["verts"]:
            for f in v.link_faces: f.material_index = mi
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(f"Item{i}", me); scene.collection.objects.link(o)
    o.data.materials.append(mat(f"c{i}a", random.choice(COLOURS))); o.data.materials.append(mat(f"c{i}b", random.choice(COLOURS)))
    return o

for i in range(N):
    o = item(i)
    o.location = (random.gauss(0, 0.13), random.gauss(0.18, 0.10), random.uniform(1.1, 1.35))   # just above the frame
    o.rotation_euler = (random.uniform(0, 6.3), random.uniform(0, 6.3), random.uniform(0, 6.3))
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.rigidbody.object_add()
    rb = o.rigid_body; rb.type = "ACTIVE"; rb.collision_shape = "CONVEX_HULL"; rb.mass = 0.45
    rb.friction = 0.9; rb.restitution = 0.04; rb.linear_damping = 0.25; rb.angular_damping = 0.45   # no bouncing away
    # Held above the frame, then released: a quick first pile, then a steady rain through the shot.
    first = int(N * 0.35)
    rel = 1 + int(i * 20 / first) if i < first else 22 + int((i - first) * 92 / (N - first)) + random.randint(0, 2)
    rb.kinematic = True; rb.keyframe_insert("kinematic", frame=1)
    if rel > 1: rb.keyframe_insert("kinematic", frame=rel - 1)
    rb.kinematic = False; rb.keyframe_insert("kinematic", frame=rel)
    o.select_set(False)

cam = camera(scene, 30)
for f in range(1, FRAMES + 1):
    t = max(0.0, (f - START) / (FRAMES - START))
    cam.location = (0.0, -0.55 + 0.08 * smoother(t), 1.0 - 0.12 * smoother(t)); cam.rotation_euler = aim_rot(-55, 0)
    cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_euler", frame=f)

with bpy.context.temp_override(scene=scene, point_cache=rw.point_cache):
    bpy.ops.ptcache.bake(bake=True)
scene.frame_start = START
render(scene, OUT, "rain_pile", sky=(0.70, 0.42, 0.30), light=(-0.4, -0.5, 0.8))
