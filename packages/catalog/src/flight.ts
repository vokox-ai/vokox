/**
 * Drone shot geometry, kept free of React so tests can run it directly: a drawn route (points as fractions of the
 * photo, y growing downward) turned into the camera words the image and video models get.
 */
export type Pt = { x: number; y: number };
export type Height = "low" | "same" | "high" | "top";

/**
 * The line redrawn as points an even `step` apart (fractions of the photo). Hand-drawn lines have jitter and a small
 * hook where the finger lifts; on the raw points those tiny segments swing the heading and read as a big turn.
 */
export function resample(points: Pt[], step = 0.04): Pt[] {
  if (points.length < 2) return points.slice();
  const out: Pt[] = [points[0]];
  let left = step;
  for (let i = 1; i < points.length; i++) {
    let a = points[i - 1];
    const b = points[i];
    let seg = Math.hypot(b.x - a.x, b.y - a.y);
    while (seg >= left) {
      const t = left / seg;
      a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      out.push(a); seg -= left; left = step;
    }
    left -= seg;
  }
  const last = points[points.length - 1], tail = out[out.length - 1];
  if (Math.hypot(last.x - tail.x, last.y - tail.y) > step / 2) out.push(last);
  return out;
}

/**
 * The drawn line in plain camera words, said in terms of the photo itself (up, down, left, right on the picture),
 * plus where the arrow ends. Never "forward into the scene": on a portrait, "up the photo" is the sky behind the
 * person, not the distance, and reading it as depth sent the camera off to the background.
 */
/** How much the evened line turns, in degrees (y grows downward, so positive is a right turn, clockwise on screen). */
export function turnOf(raw: Pt[]): number {
  const points = resample(raw);
  let turn = 0;
  for (let i = 2; i < points.length; i++) {
    const h1 = Math.atan2(points[i - 1].y - points[i - 2].y, points[i - 1].x - points[i - 2].x);
    const h2 = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
    let d = h2 - h1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    turn += d;
  }
  return (turn * 180) / Math.PI;
}

export function describeFlight(raw: Pt[], height: Height): { move: string; place: string } {
  const points = resample(raw);
  const a = points[0], b = points[points.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const deg = turnOf(raw);
  const parts: string[] = [];
  if (Math.abs(deg) > 140) parts.push(`circles ${deg > 0 ? "to the right" : "to the left"} around the main subject, keeping it in view`);
  else {
    const v = dy < -0.12 ? "up" : dy > 0.12 ? "down" : "";
    const h = dx > 0.12 ? "to the right" : dx < -0.12 ? "to the left" : "";
    const dir = [v === "up" ? "top" : v === "down" ? "bottom" : "", h === "to the right" ? "right" : h === "to the left" ? "left" : ""].filter(Boolean).join(" ");
    parts.push(dir ? `flies toward the ${dir} of the view` : "flies in toward the center of the view");
    if (Math.abs(deg) > 45) parts.push(`along a smooth curve bending ${deg > 0 ? "right" : "left"}`);
  }
  parts.push({ low: "lowering its height", same: "at the same height", high: "rising higher", top: "rising high and tilting down until it looks straight down" }[height]);
  // Where the arrow ends, in thirds of the photo: "the top left part", "the center", "the bottom part".
  const col = b.x < 0.34 ? "left" : b.x > 0.66 ? "right" : "";
  const row = b.y < 0.34 ? "top" : b.y > 0.66 ? "bottom" : "";
  const where = !row && !col ? "the center" : `the ${[row, col].filter(Boolean).join(" ")} part`;
  return { move: parts.join(", "), place: `${where} of the photo` };
}

/* ------------------------------------------------------------------ the flight as a server plan */

/**
 * A flight is a chain of key frames: each segment is one clip pinned at both ends (first and last frame), so the
 * camera lands exactly where it should; segments are then joined into one video. Key frames are the user's photos
 * or stills we generate from the main photo (the view at a route point, from high above, from orbit).
 */
export type Shot = "route" | "above" | "orbit";
export type Speed = "calm" | "normal" | "fast" | "rush";
/**
 * How fast the camera flies. Two levers: the words in the video prompt (how much ground the model covers) and the
 * playback rate at the join (video models drift slowly even when asked to hurry, so fast flights are also sped up).
 */
export const SPEEDS: Record<Speed, { label: string; rate: number; words: string }> = {
  calm: { label: "Calm", rate: 1, words: "The camera glides slowly and gently, an unhurried cinematic move." },
  normal: { label: "Normal", rate: 1, words: "The camera moves at a steady, confident pace, never drifting or hesitating." },
  fast: { label: "Fast", rate: 1.5, words: "The camera moves fast and with energy, no slow drifting." },
  rush: { label: "Very fast", rate: 2, words: "The camera moves at high speed with strong motion and parallax, no slow drifting." },
};
/**
 * A clip pinned at both ends has a fixed distance to cover: asked to "cover a lot of ground" there, models invent a
 * detour (a dive to the grass, a swing away from the subject) and snap back at the end. Pinned clips get the direct
 * path; the playback rate makes them fast.
 */
const DIRECT = "The camera takes the most direct path from the first frame to the last frame at a constant speed: no detours, no dips toward the ground, no swinging away from the subject.";
/** Seconds of the finished video: the clips, played at the speed's rate. */
export const finalSeconds = (clips: number[], speed: Speed = "normal") => Math.round((clips.reduce((a, b) => a + b, 0) / SPEEDS[speed].rate) * 10) / 10;
export type Setup = { still: string; video: string; resolution: string; durations: number[] };
export type FlightInput = {
  photos: string[]; // asset ids, in flight order; the first is the main photo
  shot: Shot;
  points: Pt[]; // the drawn route (route shot, one photo)
  height: Height;
  words: string[]; // stops described in words, one per line (one photo); replaces the drawn route
  subject: string; // what the camera ends on, optional
  length: number; // seconds asked for
  aspect: string;
  setup: Setup;
  /** How fast the camera flies; "normal" when unset. */
  speed?: Speed;
  /** An uploaded copy of the main photo with the route drawn on it, shown to the still model (route shot). */
  guide?: string;
};
type Step = { id: string; type: "image" | "video" | "compose"; model?: string; prompt?: string; refs?: string[]; aspectRatio?: string; duration?: number; resolution?: string; audio?: boolean; timeline?: Record<string, unknown> };

// The prompts never say "drone": models then draw one into the shot. The camera is the point of view, nothing more.
export const NO_RIG = "The picture is what the flying camera itself sees: no drone, quadcopter, aircraft, helicopter, camera or rig appears anywhere in the frame.";
const KEEP = `It is the same place at the same moment: every building, object and person stays exactly where it is and looks the same (same faces, clothes and poses); only the viewpoint changes. Add nothing new. Realistic photo, sharp, natural. ${NO_RIG}`;
const FLY = "One continuous aerial camera move, a single take with no cuts. Smooth and stable, realistic parallax. The scene and everyone in it stay where they are and look the same; nothing new appears. Only the camera moves: people keep exactly the pose, gaze and expression they have in the first frame and never turn their head toward the camera. The camera flies only through open space, never through walls, pillars, trees or objects. The footage is the flying camera's own view: no drone, quadcopter, aircraft or camera rig ever appears in the frame.";

/** Words that mean "go around the subject" (English and Russian). */
const AROUND = /\b(?:orbit|circle|circling|around|360)\b|круг|облет|облёт|вокруг|обле[тч]/iu;
/** Words that ask to end facing someone. */
const FACE = /\bfaces?\b|лиц[оаеу]|в глаза|анфас/iu;
/** Words that ask to end on the front of the subject (a car, a house), not on a face. */
const FRONT = /\bfront\b|спереди|фронт|с переди/iu;

/**
 * People write "the drone flies around the man" in their own words; passed on as is, the word makes the model draw a
 * drone into the shot. In user text it becomes "camera" (English and Russian forms).
 */
export function cameraWords(text: string): string {
  return text
    .replace(/\b(?:quad[- ]?copters?|drones?)\b/giu, "camera")
    .replace(/(?<![\p{L}])(?:квадрокоптер|дрон)(?:а|у|ом|е|ы|ов|ам|ами|ах)?(?![\p{L}])/giu, "камера");
}

/**
 * The user's route words as the video model should get them: the drone words become camera, prompt-engineering junk
 * (4k, masterpiece…), emoji and shouting are dropped, and the whole route is kept short enough not to drown the rules.
 */
export function routeWords(lines: string[]): string[] {
  const junk = /\b(?:\d{1,2}k|uhd|hdr|ultra[- ]?realistic|hyper[- ]?realistic|photo[- ]?realistic|masterpiece|best quality|high quality|highly detailed|trending on \w+|octane render|unreal engine)\b/giu;
  const out = lines.map((l) => cameraWords(l)
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(junk, "")
    .replace(/([!?.])\1+/gu, "$1")
    .replace(/\s*,(?:\s*,)+/gu, ",").replace(/,\s*([.!?]|$)/gu, "$1")
    .replace(/\s+([,.!?])/gu, "$1").replace(/\s{2,}/gu, " ").trim()).filter(Boolean);
  let left = 600;
  return out.map((l) => { const cut = l.slice(0, Math.max(0, left)); left -= cut.length; return cut.length < l.length ? cut.replace(/\s+\S*$/u, "") + "…" : cut; }).filter((l) => l && l !== "…");
}

/**
 * Flights made as one continuous clip straight from the photo, with no generated end frame: going around the subject
 * (a circle can't be pinned to an end view — the image model "solves" it by turning the person's head to the camera)
 * and a route described in words (it's a motion, not a place to draw).
 */
export function freeFlight(f: Pick<FlightInput, "photos" | "shot" | "words"> & { points?: Pt[] }): "around" | "words" | null {
  if (f.photos.length > 1) return null;
  if (f.words.length) return f.words.some((w) => AROUND.test(w)) ? "around" : "words";
  if (f.shot === "route" && f.points && f.points.length >= 3 && Math.abs(turnOf(f.points)) > 140) return "around";
  return null;
}

/** How many clips a flight has before the length is spread over them; at most 4. */
export function segmentsFor(f: Pick<FlightInput, "photos" | "shot" | "words" | "length"> & { points?: Pt[] }): number {
  const many = Math.ceil(f.length / 10);
  if (f.photos.length > 1) return Math.min(4, f.photos.length - 1);
  if (freeFlight(f)) return 1;
  if (f.shot === "orbit") return Math.min(3, Math.max(2, many));
  return Math.min(2, Math.max(1, many));
}

/** Clip lengths the model makes that add up closest to the length asked for (each clip 5 s or more). */
export function splitLength(total: number, n: number, allowed: number[]): number[] {
  const each = total / n;
  const pick = allowed.reduce((a, b) => (Math.abs(b - each) < Math.abs(a - each) ? b : a));
  const out = Array.from({ length: n }, () => pick);
  // Nudge single clips up or down a step while that brings the sum closer to what was asked.
  for (let guard = 0; guard < 8; guard++) {
    const sum = out.reduce((s, d) => s + d, 0);
    if (sum === total) break;
    const up = sum < total;
    const i = out.findIndex((d) => allowed.includes(d) && (up ? allowed.some((a) => a > d) : allowed.some((a) => a < d)));
    if (i < 0) break;
    const next = up ? Math.min(...allowed.filter((a) => a > out[i])) : Math.max(...allowed.filter((a) => a < out[i]));
    if (Math.abs(sum - out[i] + next - total) >= Math.abs(sum - total)) break;
    out[i] = next;
  }
  return out;
}

/** Shortest and longest flight this setup can make, in seconds. */
export function lengthRange(f: Pick<FlightInput, "photos" | "shot" | "words"> & { points?: Pt[] }, allowed: number[]): { min: number; max: number } {
  const lo = Math.min(...allowed), hi = Math.max(...allowed);
  if (f.photos.length <= 1 && freeFlight(f)) return { min: lo, max: hi }; // one continuous clip
  const fixed = f.photos.length > 1;
  const minN = fixed ? segmentsFor({ ...f, length: 0 }) : f.shot === "orbit" ? 2 : 1;
  const maxN = fixed ? minN : f.shot === "orbit" ? 3 : 2;
  return { min: minN * lo, max: maxN * hi };
}

/** The server plan for a flight: stills for the key frames we make, one pinned clip per segment, then the join. */
export function buildFlightPlan(f: FlightInput): { name: string; steps: Step[]; clips: number[] } {
  const [main] = f.photos;
  f = { ...f, subject: cameraWords(f.subject).replace(/\s+/gu, " ").trim().slice(0, 200), words: routeWords(f.words) };
  const n = segmentsFor(f);
  const clips = splitLength(Math.max(f.length, n * Math.min(...f.setup.durations)), n, f.setup.durations);
  const subject = f.subject.trim();
  const end = subject ? ` The shot ends on ${subject}.` : "";
  const still = (id: string, prompt: string): Step => ({ id, type: "image", model: f.setup.still, prompt, refs: [main], aspectRatio: f.aspect });
  const pace = SPEEDS[f.speed ?? "normal"];
  const clip = (i: number, from: string, to: string, prompt: string): Step => ({ id: `fly${i + 1}`, type: "video", model: f.setup.video, prompt: `${FLY} ${prompt} ${DIRECT} Arrive exactly at the view of the last frame.`, refs: [from, to], aspectRatio: f.aspect, duration: clips[i], resolution: f.setup.resolution, audio: false });
  const steps: Step[] = [];

  const free = freeFlight(f);
  if (free) {
    // One continuous clip from the photo, nothing pinned at the end: the camera does the move, the scene holds still.
    // "Main subject" sometimes holds a motion ("the camera flies around the man"): then it's part of the route, not the target.
    const motionInSubject = AROUND.test(subject);
    const target = subject && !motionInSubject ? subject : "the person or main subject in the center of the photo";
    const route = [...f.words, ...(motionInSubject ? [subject] : [])];
    const said = route.length ? ` The route, in the user's own words (any language): «${route.join(" → ")}». The shot starts exactly on the first frame and the camera flies from there in one unbroken move: if these words describe another starting point, the camera flies to it, it never cuts. They describe only the camera's path: anything they ask to add or change in the scene (animals, people, effects, a different look) is left out.` : "";
    const asked = `${f.words.join(" ")} ${subject}`;
    const faceEnd = FACE.test(asked) ? " It ends in front of them, seeing their face, because the camera has travelled around to the front, not because they turned."
      : FRONT.test(asked) ? " It ends looking at the front of the subject because the camera has travelled around to it; the subject itself never moves or turns." : "";
    const deg = f.words.length ? 0 : turnOf(f.points);
    const prompt = free === "around"
      ? `The camera orbits around ${target} in one smooth continuous arc of about 180 degrees at the same height${deg > 0 ? ", moving to the right" : deg < 0 ? ", moving to the left" : ""}, keeping them centered and in focus the whole time while the background swings past with natural parallax.${faceEnd}${said}`
      : `The camera follows this route.${said}${faceEnd}${motionInSubject ? "" : end}`;
    steps.push({ id: "fly1", type: "video", model: f.setup.video, prompt: `${FLY} ${prompt} ${pace.words}`, refs: [main], aspectRatio: f.aspect, duration: clips[0], resolution: f.setup.resolution, audio: false });
    clips.length = 1;
  } else if (f.photos.length > 1) {
    // Several photos: fly from each one to the next, no generated frames.
    for (let i = 0; i < n; i++) steps.push(clip(i, f.photos[i], f.photos[i + 1], `The camera flies from the place in the first frame to the place in the last frame as one smooth move.${i === n - 1 ? end : ""}`));
  } else if (f.shot === "above") {
    // From high above down to the photo: the photo is the last frame.
    const target = subject || "the main subject of the photo";
    steps.push(still("high", `The same place as the reference photo in an aerial view from high above, about 150 m up, looking down at a steep angle at the surroundings, streets and skyline; the spot where the reference was taken is in the center of the frame. Same time of day, light and weather; people too small to see at this distance. Realistic aerial photo. ${NO_RIG}`));
    if (n === 2) steps.push(still("mid", `The same place as the reference photo in an aerial view about 40 m up and closer, looking down at ${target}, which is small but clearly in the center of the frame. Same time of day, light and weather. Realistic aerial photo. ${NO_RIG}`));
    const last = n === 2 ? "@mid" : "@high";
    if (n === 2) steps.push(clip(0, "@high", "@mid", `The camera descends from high above and flies in toward ${target}.`));
    steps.push(clip(n - 1, last, main, `The camera descends and flies in toward ${target}, ending on the exact framing of the last frame.`));
  } else if (f.shot === "orbit") {
    // From orbit: the planet, then the area from high altitude (and lower if long), then the photo.
    const target = subject || "the main subject of the photo";
    steps.push(still("orbit", `Planet Earth photographed from orbit, the region where the reference photo was taken in the center of the frame, curved horizon, thin blue atmosphere, clouds; day or night to match the reference (city lights at night). Realistic satellite photography. No spacecraft or satellite in the frame.`));
    steps.push(still("air", `The city or area where the reference photo was taken, seen straight down from about 3 km up, the spot of the reference in the center of the frame. Same time of day and light as the reference. Realistic aerial photo. ${NO_RIG}`));
    if (n === 3) steps.push(still("low", `The same place as the reference photo in an aerial view about 120 m up, looking down at a steep angle, the spot of the reference in the center. Same time of day, light and weather. Realistic aerial photo. ${NO_RIG}`));
    steps.push(clip(0, "@orbit", "@air", "The camera zooms straight down from orbit through the atmosphere and clouds toward the center of the frame."));
    if (n === 3) steps.push(clip(1, "@air", "@low", "The camera keeps diving down toward the spot in the center of the frame."));
    steps.push(clip(n - 1, n === 3 ? "@low" : "@air", main, `The camera dives down and flies in toward ${target}.`));
  } else {
    // A drawn route from the photo: one clip, or two with a key frame at the middle of the route.
    const route = resample(f.points);
    const halves = n === 2 && route.length >= 4 ? [route.slice(0, Math.ceil(route.length / 2)), route.slice(Math.ceil(route.length / 2) - 1)] : [route];
    const midHeight: Height = f.height === "top" ? "high" : f.height;
    halves.forEach((part, i) => {
      const last = i === halves.length - 1;
      const upTo = last ? route : part;
      const h = last ? f.height : midHeight;
      const d = describeFlight(upTo, h);
      const look = last && f.height === "top" ? "pointing straight down" : "looking at the scene in front of it";
      const climb = { low: " It ends lower than where it started.", same: "", high: " It ends higher than where it started.", top: " It ends high above, looking straight down." }[h];
      const prompt = f.guide
        // The model sees the line itself (image 2): far clearer than any description of it.
        ? `Image 1 is the original photo. Image 2 is the same photo with the planned camera path drawn on it: a dotted line from the purple dot (where the camera starts) to the pink arrowhead (where it stops). The line is a path through the real place: the camera physically flies along it, over the ground and toward whatever is under the arrowhead. Create the photo the camera takes ${last ? "at the arrowhead, after flying the whole path" : "halfway along that path"}, ${look}. The camera is now ${last ? "right at the spot under the arrowhead, so what was there is much closer and much larger than in image 1" : "halfway there, so what is under the arrowhead is clearly closer and larger than in image 1"}; things the path passed are now beside or behind the camera.${climb}${last ? end : ""} Do not draw the line, the dot or the arrow. ${KEEP}`
        : `The same place as the reference photo, seen from a new camera position after the camera ${d.move}; it now looks toward ${d.place}, ${look}.${last ? end : ""} ${KEEP}`;
      const st = still(last ? "end" : "mid", prompt);
      if (f.guide) st.refs = [main, f.guide];
      steps.push(st);
    });
    halves.forEach((part, i) => {
      const d = describeFlight(part, i === halves.length - 1 ? f.height : midHeight);
      steps.push(clip(i, i === 0 ? main : "@mid", i === halves.length - 1 ? "@end" : "@mid", `The camera ${d.move}.${i === halves.length - 1 ? end : ""}`));
    });
    clips.length = halves.length;
  }

  const videos = steps.filter((s) => s.type === "video");
  // Joined (or, for one clip, sped up) at the end; the rate is applied to every clip there.
  if (videos.length > 1 || pace.rate !== 1) steps.push({ id: "join", type: "compose", timeline: { aspectRatio: f.aspect, clips: videos.map((v) => ({ asset: `@${v.id}`, transition: "cut", ...(pace.rate !== 1 ? { speed: pace.rate } : {}) })), clipAudio: { volume: 0 } } });
  return { name: "drone-shot", steps, clips: videos.map((v) => v.duration ?? 5) };
}

/* ------------------------------------------------------------------ one flight from a few choices (site, CLI, MCP) */

/** The plan name the API stores as the job's model; History titles these "Drone shot". */
export const DRONE_MODEL = "plan:drone-shot";
export const DRONE_MAX_PHOTOS = 4;
/** Free credits are 100: a trial flight stays short enough to fit them. */
export const DRONE_TRIAL_MAX_SECONDS = 8;
export type DroneTier = "standard" | "premium";
/** Trial accounts fly on what free credits cover (Qwen-Image stills, Seedance 480p, the join); Premium on Kling 3 Pro 1080p. */
export const DRONE_SETUPS = {
  trial: { still: "qwen-image", video: "seedance-2-fast", resolution: "480p" },
  standard: { still: "nano-banana-2", video: "seedance-2-fast", resolution: "720p" },
  premium: { still: "nano-banana-2", video: "kling-3-pro", resolution: "1080p" },
} as const;

const arc = (cx: number, cy: number, r: number, from: number, to: number): Pt[] =>
  Array.from({ length: 13 }, (_, i) => { const a = from + ((to - from) * i) / 12; return { x: cx + r * Math.cos(a), y: cy + r * 0.55 * Math.sin(a) }; });
export type DronePreset = { id: string; label: string; hint: string; shot: Shot; points?: Pt[]; height?: Height };
/** One-click flights. Route ones fill in a line over the photo; "From above" and "From orbit" end on the photo itself. */
export const DRONE_PRESETS: DronePreset[] = [
  { id: "in", label: "Fly in", hint: "Straight toward the subject", shot: "route", points: [{ x: 0.5, y: 0.92 }, { x: 0.5, y: 0.65 }, { x: 0.5, y: 0.4 }], height: "same" },
  { id: "circle", label: "Circle around", hint: "Goes around the subject in one continuous shot; the person stays as in the photo", shot: "route", points: arc(0.5, 0.55, 0.3, Math.PI * 0.5, Math.PI * 1.5), height: "same" },
  { id: "reveal", label: "Rise & reveal", hint: "Climb up and show the surroundings", shot: "route", points: [{ x: 0.5, y: 0.95 }, { x: 0.5, y: 0.7 }, { x: 0.5, y: 0.5 }], height: "high" },
  { id: "top", label: "Over the top", hint: "Fly over and look straight down", shot: "route", points: [{ x: 0.5, y: 0.9 }, { x: 0.5, y: 0.6 }, { x: 0.5, y: 0.45 }], height: "top" },
  { id: "above", label: "From above", hint: "Start high in the sky, come down to your photo", shot: "above" },
  { id: "orbit", label: "From orbit 🌍", hint: "Start with the planet from space, dive down to your photo", shot: "orbit" },
];

/** "1. high above the marina" / "- between the towers" → the stop itself; empty lines dropped; at most 4 stops. */
export const stopsOf = (text: string) => text.split("\n").map((l) => l.replace(/^\s*(?:\d+[.)]|[-–•*])\s*/u, "").trim()).filter(Boolean).slice(0, 4);

/** Photo shape → the closest video shape the models make. */
export const droneAspect = (w?: number, h?: number) => (!w || !h ? "16:9" : w > h * 1.15 ? "16:9" : h > w * 1.15 ? "9:16" : "1:1");

export type DroneRequest = {
  photos: string[]; // asset ids, in flight order
  preset?: string; // a DRONE_PRESETS id; ignored with several photos or words
  points?: Pt[]; // a drawn route instead of a preset
  height?: Height;
  words?: string; // the route in the user's words, one stop per line
  subject?: string;
  length?: number;
  speed?: Speed;
  tier?: DroneTier;
  trial?: boolean; // the account has only free credits: the trial setup, at most 8 s
  aspect?: string;
  guide?: string;
};

/**
 * The same flight the site builds, from the choices an agent can name: a preset or words, length, speed, tier.
 * `durations` are the video model's clip lengths (from the catalog). Throws on a request that can't fly.
 */
export function droneShot(r: DroneRequest, durations: (video: string) => number[]): { plan: { name: string; steps: unknown[] }; clips: number[]; seconds: number; setup: Setup; free: "around" | "words" | null } {
  if (!r.photos.length) throw new Error("drone shot needs a photo");
  const photos = r.photos.slice(0, DRONE_MAX_PHOTOS);
  const preset = r.preset ? DRONE_PRESETS.find((p) => p.id === r.preset) : undefined;
  if (r.preset && !preset) throw new Error(`unknown preset ${r.preset}; one of ${DRONE_PRESETS.map((p) => p.id).join(", ")}`);
  const words = photos.length > 1 ? [] : stopsOf(r.words ?? "");
  const shot: Shot = photos.length > 1 || words.length ? "route" : preset?.shot ?? "route";
  const points = r.points?.length ? r.points : preset?.points ?? (shot === "route" && !words.length && photos.length === 1 ? DRONE_PRESETS[0].points! : []);
  const s = r.trial && (r.tier ?? "standard") === "standard" ? DRONE_SETUPS.trial : DRONE_SETUPS[r.tier ?? "standard"];
  const setup: Setup = { ...s, durations: durations(s.video) };
  const base = { photos, shot, points, words };
  const range = lengthRange(base, setup.durations);
  const max = r.trial ? Math.max(range.min, Math.min(range.max, DRONE_TRIAL_MAX_SECONDS)) : range.max;
  const length = Math.min(Math.max(r.length ?? range.min, range.min), max);
  const built = buildFlightPlan({ photos, shot, points, height: r.height ?? preset?.height ?? "same", words, subject: r.subject ?? "", length, aspect: r.aspect ?? "16:9", setup, speed: r.speed, guide: r.guide });
  return { plan: { name: built.name, steps: built.steps }, clips: built.clips, seconds: finalSeconds(built.clips, r.speed), setup, free: freeFlight(base) };
}

/** Width and height from a PNG, JPEG or WebP header (the CLI and the server have no browser to ask). */
export function imageSize(b: Uint8Array): { w: number; h: number } | undefined {
  const u32 = (i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  const u16 = (i: number) => (b[i] << 8) | b[i + 1];
  const le16 = (i: number) => b[i] | (b[i + 1] << 8);
  const le24 = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { w: u32(16), h: u32(20) };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: u16(i + 5), w: u16(i + 7) };
      i += 2 + u16(i + 2);
    }
    return undefined;
  }
  if (b.length > 30 && b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) { // RIFF…WEBP
    const kind = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (kind === "VP8 ") return { w: le16(26) & 0x3fff, h: le16(28) & 0x3fff };
    if (kind === "VP8L") { const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { w: (v & 0x3fff) + 1, h: ((v >>> 14) & 0x3fff) + 1 }; }
    if (kind === "VP8X") return { w: le24(24) + 1, h: le24(27) + 1 };
  }
  return undefined;
}
