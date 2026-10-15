"""
Legs-only walk or run (hips down) with real gait timing: each stance foot stays locked to the ground, heel -> flat ->
toe, the hips bob. Camera either locked low on the ground (the person crosses the frame) or tracking alongside.
  blender -b -P walk.py -- <out_dir>
Env: GAIT (walk | run), CAMERA (locked | track), ASPECT (9:16 | 16:9), SECONDS (5)
"""
import math, os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from common import setup, mat, box, camera, aim_rot, render
from legs import Legs, gait

GAIT = os.environ.get("GAIT", "walk"); CAM = os.environ.get("CAMERA", "track")
RES = (720, 1280) if os.environ.get("ASPECT", "9:16") == "9:16" else (1280, 720)
scene, OUT, FRAMES = setup(int(os.environ.get("SECONDS", 5)), res=RES)
FPS = 24
box("Ground", (4, 0.5, -0.01), (30, 6, 0.02), mat("ground", (0.30, 0.30, 0.31)))
for i in range(16): box("Backdrop", (-6 + i * 2.6, 3.0, 1.6), (2.4, 0.3, 3.2), mat(f"bd{i % 2}", (0.62, 0.55, 0.48) if i % 2 else (0.52, 0.47, 0.42)))
legs = Legs(scene, mat("trousers", (0.20, 0.30, 0.48)))
# walk: 1.3 m/s, 1.05 s cycle, 62 % on the ground; run: 3.6 m/s, 0.70 s, 36 % (with a flight phase)
speed, cycle, duty, lift, base, bob = (1.3, 1.05, 0.62, 0.07, 0.93, 0.02) if GAIT == "walk" else (3.6, 0.70, 0.36, 0.20, 0.90, -0.035)
x0 = -1.75 if CAM == "locked" else -0.5
cam = camera(scene, 35)
for f in range(1, FRAMES + 1):
    t = (f - 1) / FPS
    hx = x0 + speed * t
    hz = base + bob * math.cos(2 * math.pi * 2 * (t / cycle - duty / 2))
    legs.pose(f, hx, hz, [gait(t, speed, cycle, duty, lift, 0.0, x0), gait(t, speed, cycle, duty, lift, 0.5, x0)])
    if CAM == "locked": cam.location = (0, -1.9, 0.12); cam.rotation_euler = aim_rot(7, 0)
    else: cam.location = (hx + 0.12, -1.6, 0.35); cam.rotation_euler = aim_rot(2, 0)
    cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_euler", frame=f)
render(scene, OUT, f"{GAIT}_{CAM}", sky=(0.70, 0.74, 0.78), light=(-0.4, -0.5, 0.8))
