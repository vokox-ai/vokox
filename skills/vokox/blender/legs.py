"""
Rig for walking/running legs (hips down) with planted feet. Use it for WALK and RUN blockouts only: in tests, full-leg
stair climbs and jumps still came out unnatural after generation; shoot those as tight foot-level close-ups instead.

A pair of human legs with planted feet: thigh + shin per leg solved by two-bone IK in the side plane (knees bend forward),
the sneaker rolling heel -> flat -> toe. Gaits come from real timing, so every stance foot stays locked to the ground
(no sliding, no floating). Travel is along +X; the legs sit at y = side * HIP_W.
"""
import math
from common import box, cyl, empty, mat

def shoe(parent):
    """A plain shoe block (toe toward +Y): sole, upper, toe cap. Only its size and contact points matter to the model."""
    box("Sole", (0, 0, 0.02), (0.11, 0.30, 0.04), mat("sole", (0.90, 0.86, 0.76)), parent)
    box("Upper", (0, -0.04, 0.085), (0.095, 0.20, 0.09), mat("upper", (0.62, 0.58, 0.52)), parent)
    box("ToeCap", (0, 0.10, 0.065), (0.09, 0.09, 0.05), mat("upper", (0.62, 0.58, 0.52)), parent)

THIGH, SHIN = 0.46, 0.45          # metres
ANK = (-0.05, 0.085)               # ankle in shoe coordinates: (along the toe, up), from the sole centre
HEEL, TOE = -0.12, 0.13            # contact points along the shoe
HIP_W = 0.10

def _segment(o, a, b):
    o.location = ((a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2)
    o.rotation_euler = (0, math.atan2(b[0] - a[0], b[2] - a[2]), 0)

def _knee(hip, ank):
    dx, dz = ank[0] - hip[0], ank[2] - hip[2]
    d = max(1e-4, min(math.hypot(dx, dz), THIGH + SHIN - 1e-4))
    a = math.atan2(dz, dx)
    t = math.acos(max(-1.0, min(1.0, (THIGH ** 2 + d ** 2 - SHIN ** 2) / (2 * THIGH * d))))
    return (hip[0] + THIGH * math.cos(a + t), hip[1], hip[2] + THIGH * math.sin(a + t))   # knee ahead of the line

class Legs:
    def __init__(self, scene, trousers):
        self.parts = []
        for side in (-1, 1):
            sh_ = empty(scene, "Shoe"); shoe(sh_); sh_.rotation_mode = "XYZ"
            th = cyl("Thigh", (0, 0, 0), 0.078, THIGH, trousers, verts=16)
            sh = cyl("Shin", (0, 0, 0), 0.062, SHIN, trousers, verts=16)
            self.parts.append((side, sh_, th, sh))

    def pose(self, f, hip_x, hip_z, feet):
        """feet: per leg (-1 then +1) (x, z, pitch_deg, pivot). pivot 'heel'/'toe': x,z is that contact point on the
        ground and the shoe rolls about it; 'flat': x,z is the sole centre. pitch > 0 lifts the toe."""
        for (side, shoe, th, sh), (x, z, pitch, pivot) in zip(self.parts, feet):
            y = side * HIP_W; p = math.radians(pitch)
            px = {"heel": HEEL, "toe": TOE, "flat": 0.0}[pivot]
            ox, oz = x - px * math.cos(p), z - px * math.sin(p)
            shoe.location = (ox, y, oz)
            shoe.rotation_euler = (p, 0, math.radians(-90))     # pitch about the shoe's own axis, then toe to +X
            ank = (ox + ANK[0] * math.cos(p) - ANK[1] * math.sin(p), y, oz + ANK[0] * math.sin(p) + ANK[1] * math.cos(p))
            hip = (hip_x, y, hip_z)
            knee = _knee(hip, ank)
            _segment(th, hip, knee); _segment(sh, knee, ank)
            for o in (shoe, th, sh):
                o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f)

def smooth(u):
    u = min(1.0, max(0.0, u)); return u * u * (3 - 2 * u)

def gait(t, speed, cycle, duty, lift, phase, x0=0.0, ground=lambda x: 0.0, roll=(14, -30)):
    """One foot: stance (heel strike -> flat -> heel off, locked to the ground under the moving hip) and swing.
    Returns (x, z, pitch, pivot) for Legs.pose. ground(x) gives the floor height (stairs)."""
    stride = speed * cycle
    tau = t / cycle + phase; k = math.floor(tau); c = tau - k
    plant = x0 + stride * (k - phase + duty / 2)        # the foot lands under the hip at mid-stance
    up, down = roll
    if c < duty:
        u = c / duty
        g = ground(plant)
        if u < 0.12: return plant + HEEL, g, up * (1 - u / 0.12), "heel"
        if u < 0.68: return plant, g, 0.0, "flat"
        return plant + TOE, g, down * (u - 0.68) / 0.32, "toe"
    u = (c - duty) / (1 - duty)
    nxt = plant + stride
    x = plant + (nxt - plant) * smooth(u)
    g0, g1 = ground(plant), ground(nxt)
    z = g0 + (g1 - g0) * smooth(u) + lift * math.sin(math.pi * u)
    pitch = down * (1 - smooth(u / 0.5)) + up * smooth((u - 0.65) / 0.35)
    pr = math.radians(pitch)
    z += max(0.0, -TOE * math.sin(pr), -HEEL * math.sin(pr))     # keep the toe / heel above the floor while the shoe is tilted
    return x, z, pitch, "flat"
