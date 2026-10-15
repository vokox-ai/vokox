"""
Product orbit: one item on a round plinth in a seamless studio; the camera flies one smooth full circle around it,
starting and ending side-on, slightly above. Replace the placeholder box with your product's rough shape.
  blender -b -P orbit.py -- <out_dir>
Env: SECONDS (4), ASPECT (9:16 | 16:9), SIZE "w,d,h" of the product in metres (0.30,0.11,0.12)
"""
import bpy, math, os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from common import setup, mat, box, cyl, camera, aim_rot, smoother, render

SECONDS = int(os.environ.get("SECONDS", 4))
RES = (720, 1280) if os.environ.get("ASPECT", "9:16") == "9:16" else (1280, 720)
W, D, H = (float(x) for x in os.environ.get("SIZE", "0.30,0.11,0.12").split(","))
scene, OUT, FRAMES = setup(SECONDS, res=RES)

box("Floor", (0, 0, -0.01), (8, 8, 0.02), mat("floor", (0.55, 0.38, 0.24)))
cyl("Cyclorama", (0, 0, 1.5), 3.2, 3.0, mat("backdrop", (0.70, 0.42, 0.30)), verts=64)   # backdrop all the way round
cyl("Plinth", (0, 0, 0.06), max(W, D) * 0.95, 0.12, mat("plinth", (0.82, 0.78, 0.70)), verts=48)
box("Product", (0, 0, 0.12 + H / 2), (D, W, H), mat("product", (0.62, 0.58, 0.52)))           # long side along Y

cam = camera(scene, 42)
R, Z = max(W, H) * 4.2, 0.12 + H * 2.6
for f in range(1, FRAMES + 1):
    t = (f - 1) / (FRAMES - 1)
    a = math.radians(-90 + 360 * smoother(t))          # eased start and stop, side profile at both ends
    cam.location = (R * math.cos(a), R * math.sin(a), Z)
    yaw = math.degrees(math.atan2(cam.location.x, -cam.location.y))
    cam.rotation_euler = aim_rot(-math.degrees(math.atan2(Z - 0.12 - H / 2, R)), yaw)
    cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_euler", frame=f)

render(scene, OUT, "orbit", sky=(0.70, 0.42, 0.30), light=(-0.4, -0.5, 0.8))
