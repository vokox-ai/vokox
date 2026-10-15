import { clipCount, FACE_WORDS, moveInfo, normalizeMoves, parseMovesRules, type Dir, type MoveStep } from "./moves.js";
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
export type Shot = "route" | "above" | "orbit" | "rise";
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
export type Setup = { still: string; video: string; resolution: string; durations: number[]; /** images the still model takes (qwen-image: 1) */ stillRefs?: number };
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
  /** The flight as camera moves (from the user's words or a move preset); see moves.ts. */
  moves?: MoveStep[];
};
type Step = { id: string; type: "image" | "video" | "compose"; model?: string; prompt?: string; refs?: string[]; aspectRatio?: string; duration?: number; resolution?: string; audio?: boolean; timeline?: Record<string, unknown> };

// The prompts never say "drone": models then draw one into the shot. The camera is the point of view, nothing more.
export const NO_RIG = "The picture is what the flying camera itself sees: no drone, quadcopter, aircraft, helicopter, camera or rig appears anywhere in the frame.";
const KEEP = `It is the same place at the same moment: every building, object and person stays exactly where it is and looks the same (same faces, clothes and poses); only the viewpoint changes. Add nothing new. Realistic photo, sharp, natural. ${NO_RIG}`;
const FLY = "One continuous aerial camera move, a single take with no cuts. Smooth and stable, realistic parallax. The scene and everyone in it stay where they are and look the same; nothing new appears. Only the camera moves: people keep exactly the pose, gaze and expression they have in the first frame and never turn their head toward the camera. The camera flies only through open space, never through walls, pillars, trees or objects. The footage is the flying camera's own view: no drone, quadcopter, aircraft or camera rig ever appears in the frame.";

/**
 * An orbit as the camera's own travel around a subject fixed in the world. Spelled out because a short "orbit
 * around them, keeping them centered" lets video models fake it as a turntable: the person rotates on the spot and
 * the background stays put. What gives a real orbit away is the world moving: the ground and the background behind
 * the subject change all the time, and the subject's body keeps facing the same way in the world.
 */
export function orbitWords(target: string, dir?: "left" | "right"): string {
  return `Orbit shot: the camera physically travels along a wide circular path around ${target}, about 180 degrees${dir ? `, moving to the ${dir}` : ""}, at the same height, turning as it goes to keep them in the middle of the frame. ` +
    `They are a fixed point in the world and stand completely still, like a statue: their feet stay planted and their body, shoulders and head keep facing the same direction in the world the whole time, so the camera sees them from a steadily changing side. ` +
    `Because the camera is moving and they are not, the whole surroundings sweep across the frame: the ground under them and the background behind them change continuously, parts of the place that were behind the camera come into view, with strong parallax between near and far.`;
}

/**
 * The key frame an orbit ends on: the same subject from the far side (or from the front when the user asked to end
 * on a face), told through the background so the image model can't just turn the person to the camera: what was
 * behind the photographer is now behind the subject.
 */
export function orbitEndWords(target: string, side: "opposite" | "front" | "front-of-object"): string {
  const view = side === "opposite"
    ? "to the opposite side of them, at the same height and distance, with the same lens. They are now seen from the opposite side (if image 1 shows their front, this shows their back; if it shows their back, this shows their face and front; if it shows their left side, this shows their right side)"
    : side === "front"
      ? "round to their front, at the same height and distance, with the same lens, so their face is seen from the front"
      : "round to the front of it, at the same height and distance, with the same lens, so it is seen from the front";
  return `Image 1 is a photo. Create the photo taken after the photographer has walked around ${target}, ${view}. ` +
    `They have not moved, turned or changed pose at all: the same spot, stance, clothes and expression; only the photographer moved. ` +
    `Because the camera is now on another side, the background behind them is the part of the place that was behind the photographer in image 1, in the same style, light and weather; what was behind them in image 1 is now behind the camera and out of view. ` +
    `Nothing new is added. Realistic photo, sharp, natural. ${NO_RIG}`;
}

/** Words that chain several moves into one route: "then", "after that", "потом", "затем"… */
const SEQUENCE = /\b(?:then|after(?:wards| that)?|next|finally|before)\b|потом|затем|после|далее|дальше|в конце|наконец|сначала|→/iu;
/** Obstacles in the plural: "облёт деревьев / домов / колонн" is weaving through them, not an orbit. */
const PLURAL_OBSTACLES = /деревь|стволов|домов|зданий|колонн|столбов|скал|камней|\btrees\b|\btrunks\b|\bbuildings\b|\bpillars\b|\brocks\b/iu;

/**
 * An orbit is one move round one subject: "облети его", "круг вокруг дома", "orbit the statue". A route of several
 * moves ("low along the path, weaving round the trees, then up through the canopy") is a route in words even when a
 * word like "облёт" or "around" turns up in it: an orbit there pinned the flight to "the far side of the subject in
 * the middle of the photo", which in a forest is nothing.
 */
export function isOrbitRequest(lines: string[]): boolean {
  const text = lines.join(" ");
  if (!AROUND.test(text)) return false;
  if (lines.length > 1 || SEQUENCE.test(text)) return false;
  if (PLURAL_OBSTACLES.test(text) && !/вокруг|кругом|по кругу|orbit|circle/iu.test(text)) return false;
  return true;
}

/** Words that mean "go around the subject" (English and Russian); "круг", "кружит", not "круглая" or "окружение". */
const AROUND = /\b(?:orbit|circle|circling|around|360)\b|(?<!\p{L})(?:круг(?!л|озор)|круж(?!к|ев))|облет|облёт|вокруг|обле[тч]/iu;
/**
 * A motion typed into "Main subject" ("вокруг мужчины летит дрон", "the camera flies around him"). Stricter than
 * AROUND: a subject like "круглая башня" or "the house around the corner" names a thing, not a flight.
 */
const SUBJECT_MOTION = /(?<!\p{L})(?:вокруг|облет\p{L}*|облёт\p{L}*|облеч\p{L}*|кружит\p{L}*|кружа\p{L}*|лет(?:ит|ает|ят|ают)|пролет\p{L}*|пролёт\p{L}*)(?!\p{L})|\b(?:orbit(?:s|ing)?|circl(?:es|ing)|fl(?:y|ies|ying))\b/iu;
export const motionInSubject = (subject: string) => SUBJECT_MOTION.test(subject);
/** Words that ask to end facing someone. */
const FACE = FACE_WORDS;
/** Words that ask to end on the front of the subject (a car, a house), not on a face. */
const FRONT = /\bfront\b|спереди|фронт|с переди/iu;

/**
 * People write "the drone flies around the man" in their own words; passed on as is, the word makes the model draw a
 * drone into the shot. In user text it becomes "camera" (English and Russian forms).
 */
export function cameraWords(text: string): string {
  return text
    .replace(/\b(?:(?:DJI\s+)?Mavic|quad(?:ro)?[- ]?copters?|copters?|drones?|UAVs?)\b/giu, "camera")
    .replace(/(?<!\p{L})(?:(?:DJI\s+)?мавик|квадрокоптер|коптер|квадрик|беспилотник|дрончик|дрон)(?:а|у|ом|е|ы|и|ов|ам|ами|ах)?(?!\p{L})|(?<!\p{L})БПЛА(?!\p{L})/giu, "камера");
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
 * The route-in-words box as stops the flight uses: numbered lines, cleaned (routeWords), lines with no letters left
 * dropped. "4k" or "🚁" alone is no route: the flight then falls back to a preset instead of an empty route.
 */
export const flightWords = (text: string) => routeWords(stopsOf(text)).filter((l) => /\p{L}/u.test(l));

/**
 * Flights made as one continuous clip straight from the photo, with no generated end frame: going around the subject
 * (a circle can't be pinned to an end view — the image model "solves" it by turning the person's head to the camera)
 * and a route described in words (it's a motion, not a place to draw).
 */
export function freeFlight(f: Pick<FlightInput, "photos" | "shot" | "words"> & { points?: Pt[]; moves?: MoveStep[] }): "around" | "words" | null {
  if (f.photos.length > 1) return null;
  if (f.moves?.length) return chained(f.moves) ? null : "words";
  if (f.words.length) return isOrbitRequest(f.words) ? "around" : "words";
  if (f.shot === "route" && f.points && f.points.length >= 3 && Math.abs(turnOf(f.points)) > 140) return "around";
  return null;
}

/** A drawn line too short to cut in two (fewer than 4 evened points) makes one clip whatever the length. */
const shortLine = (points?: Pt[]) => Boolean(points && points.length >= 2 && resample(points).length < 4);

/** How many clips a flight has before the length is spread over them; at most 4. */
export function segmentsFor(f: Pick<FlightInput, "photos" | "shot" | "words" | "length"> & { points?: Pt[]; moves?: MoveStep[] }): number {
  const many = Math.ceil(f.length / 10);
  if (f.photos.length > 1) return Math.min(4, f.photos.length - 1);
  if (f.moves?.length && chained(f.moves)) return clipCount(f.moves);
  if (freeFlight(f)) return 1;
  if (f.shot === "orbit") return Math.min(3, Math.max(2, many));
  if (f.shot === "route" && shortLine(f.points)) return 1;
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
export function lengthRange(f: Pick<FlightInput, "photos" | "shot" | "words"> & { points?: Pt[]; moves?: MoveStep[] }, allowed: number[]): { min: number; max: number } {
  const lo = Math.min(...allowed), hi = Math.max(...allowed);
  if (f.photos.length <= 1 && f.moves?.length && chained(f.moves)) { const n = clipCount(f.moves); return { min: n * lo, max: n * hi }; }
  if (f.photos.length <= 1 && freeFlight(f)) return { min: lo, max: hi }; // one continuous clip
  const fixed = f.photos.length > 1;
  const minN = fixed ? segmentsFor({ ...f, length: 0 }) : f.shot === "orbit" ? 2 : 1;
  const maxN = fixed ? minN : f.shot === "orbit" ? 3 : f.shot === "route" && shortLine(f.points) ? 1 : 2;
  return { min: minN * lo, max: maxN * hi };
}

/** The server plan for a flight: stills for the key frames we make, one pinned clip per segment, then the join. */
export function buildFlightPlan(f: FlightInput): { name: string; steps: Step[]; clips: number[] } {
  const [main] = f.photos;
  // Every user word that reaches a prompt is cleaned: the subject, the route, and each move's own words and target.
  const moves = f.moves?.flatMap((m): MoveStep[] => {
    const step: MoveStep = { ...m, text: m.text && routeWords([m.text])[0], target: m.target && cameraWords(m.target).replace(/\s+/gu, " ").trim() };
    if (!step.text) delete step.text;
    if (!step.target) delete step.target;
    return step.move === "custom" && !step.text ? [] : [step];
  });
  // A route with no line to follow (an empty or one-point drawing) flies the "Fly in" line rather than failing.
  const points = (f.points ?? []).length >= 2 ? f.points : DRONE_PRESETS[0].points!;
  f = { ...f, points, moves, subject: cameraWords(f.subject).replace(/\s+/gu, " ").trim().slice(0, 200), words: routeWords(f.words) };
  const n = segmentsFor(f);
  const clips = splitLength(Math.max(f.length, n * Math.min(...f.setup.durations)), n, f.setup.durations);
  const subject = f.subject.trim();
  const end = subject ? ` The shot ends on ${subject}.` : "";
  const still = (id: string, prompt: string): Step => ({ id, type: "image", model: f.setup.still, prompt, refs: [main], aspectRatio: f.aspect });
  const pace = SPEEDS[f.speed ?? "normal"];
  const clip = (i: number, from: string, to: string, prompt: string): Step => ({ id: `fly${i + 1}`, type: "video", model: f.setup.video, prompt: `${FLY} ${prompt} ${DIRECT} Arrive exactly at the view of the last frame.`, refs: [from, to], aspectRatio: f.aspect, duration: clips[i], resolution: f.setup.resolution, audio: false });
  const steps: Step[] = [];

  const free = freeFlight(f);
  if (f.moves?.length && f.photos.length === 1 && chained(f.moves)) {
    steps.push(...movesChain(f, f.moves, clips, still, subject));
    clips.length = steps.filter((s) => s.type === "video").length;
  } else if (free) {
    // One continuous clip from the photo, nothing pinned at the end: the camera does the move, the scene holds still.
    // "Main subject" sometimes holds a motion ("the camera flies around the man"): then it's part of the route, not the target.
    const motion = motionInSubject(subject);
    const target = subject && !motion ? subject : "the person or main subject in the center of the photo";
    const route = [...f.words, ...(motion ? [subject] : [])];
    const said = route.length ? ` The route, in the user's own words (any language): «${route.join(" → ")}». The shot starts exactly on the first frame and the camera flies from there in one unbroken move: if these words describe another starting point, the camera flies to it, it never cuts. They describe only the camera's path: anything they ask to add or change in the scene (animals, people, effects, a different look) is left out.` : "";
    const asked = `${f.words.join(" ")} ${subject}`;
    const faceEnd = FACE.test(asked) ? " It ends in front of them, seeing their face, because the camera has travelled around to the front, not because they turned."
      : FRONT.test(asked) ? " It ends looking at the front of the subject because the camera has travelled around to it; the subject itself never moves or turns." : "";
    const deg = f.words.length ? 0 : turnOf(f.points);
    const prompt = free === "around"
      ? orbitWords(target, deg > 0 ? "right" : deg < 0 ? "left" : undefined) + faceEnd + said
      : `The camera follows this route.${said}${f.moves?.length ? ` In camera terms: ${f.moves.map((m) => moveClipWords(m, m.target || target)).join(" Then ")}` : ""}${faceEnd}${motion ? "" : end} As the camera travels deeper into the place, what it reaches continues naturally in the same style, light and weather; no new people, animals or vehicles are added.`;
    if (free === "around") {
      // Pinned at both ends. From the photo alone, video models fake an orbit (tested 09.10 on 5 photos): the person
      // turns with the camera like a turntable while the background slides, or turns to face the camera. A key frame
      // from the far side of the subject, with the background that was behind the photographer, rules both out; the
      // clip can only reach it by travelling round them. 3 of 3 real orbits on the same photos.
      const side = faceEnd ? (FACE.test(asked) ? "front" : "front-of-object") : "opposite";
      steps.push(still("end", orbitEndWords(target, side) + (said ? ` (The user described the flight as: «${route.join(" → ")}».)` : "")));
      steps.push({ id: "fly1", type: "video", model: f.setup.video, refs: [main, "@end"], aspectRatio: f.aspect, duration: clips[0], resolution: f.setup.resolution, audio: false,
        prompt: `${prompt} The shot starts on the first frame and arrives exactly at the last frame, which shows them from ${side === "opposite" ? "the opposite side" : "the front"}: the camera gets there by travelling around them, never through them and never by cutting. ${FLY} ${pace.words}` });
    } else {
      steps.push({ id: "fly1", type: "video", model: f.setup.video, prompt: `${FLY} ${prompt} ${pace.words}`, refs: [main], aspectRatio: f.aspect, duration: clips[0], resolution: f.setup.resolution, audio: false });
    }
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
  } else if (f.shot === "rise") {
    // Straight up from the photo to a view over the surroundings. As a short drawn line marked "higher" the end frame
    // came out a metre above the photo: in a forest (09.10) the camera barely moved. The high view is said outright.
    const high = `The same place as the reference photo, seen from high above it: the camera has risen straight up about 60 m from where the photo was taken, well above the tops of the trees and the roofs, and looks out and slightly down over the surroundings to the horizon. The spot of the photo is directly below, at the bottom of the frame. Same time of day, light and weather; people too small to see. Realistic aerial photo.${end} ${NO_RIG}`;
    steps.push(still("high", high));
    if (n === 2) steps.push(still("mid", `The same place as the reference photo, seen from just above the tops of the trees and the roofs, about 20 m above where the photo was taken, looking out over the nearby surroundings. Same time of day, light and weather. Realistic aerial photo. ${NO_RIG}`));
    if (n === 2) steps.push(clip(0, main, "@mid", "The camera rises straight up from where the photo was taken, past the trunks, walls and branches, until it clears the tree tops and roofs."));
    steps.push(clip(n - 1, n === 2 ? "@mid" : main, "@high", `The camera rises straight up${n === 2 ? " higher" : " from where the photo was taken, past the trunks, walls and branches, clearing the tree tops and roofs"}, tilting gently to look out over the surroundings, which open up wider and wider toward the horizon.${end}`));
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

/* ------------------------------------------------------------------ a flight as a chain of camera moves */

/**
 * Moves a video model fakes from the photo alone, so they need a key frame to land on: an orbit or spiral (the
 * person turns instead), pulling back and looking straight down (a zoom instead of travel), and the openers that end
 * on the photo. A chain with any of these is built move by move; one with only travelling moves (along, past, toward,
 * up, down, the user's own words) stays one continuous clip with the user's words, which flew best through a forest
 * and a city (09.10).
 */
const HARD = new Set(["orbit", "spiral", "pull_back", "top_down", "from_above", "from_space", "spin"]);
export const chained = (moves: MoveStep[]) => moves.some((m) => HARD.has(m.move));

/** What the camera does in one move, for the video model. `t` is what the move is about. */
export function moveClipWords(m: MoveStep, t: string): string {
  const dir = m.dir ?? "right";
  // The user's own words for a move ("влетает в окно", "под арку") ride along: the move name alone loses them.
  const said = m.text && !["custom", "along", "flyby"].includes(m.move) ? ` In the user's words: «${m.text}».` : "";
  return moveTemplate(m, t, dir) + said;
}
function moveTemplate(m: MoveStep, t: string, dir: Dir): string {
  switch (m.move) {
    case "push_in": return `The camera flies straight forward toward ${t}, getting much closer.`;
    case "pull_back": return `The camera flies backward and upward, away from ${t}, which stays in the middle of the frame and grows smaller while more and more of the place opens up around it.`;
    case "orbit": return orbitWords(t, m.dir);
    case "spiral": return `${orbitWords(t, m.dir)} At the same time the camera climbs steadily, so the circle becomes a rising spiral and it ends looking down at them from above.`;
    case "rise": return "The camera rises straight up, past trunks, walls and branches, clearing the tree tops and roofs, tilting gently to look out over the surroundings, which open up toward the horizon.";
    case "descend": return `The camera drops smoothly down toward ${t}, ending low, close to the ground.`;
    case "top_down": return `The camera rises and flies over ${t}, tilting down until it looks straight down at it from above.`;
    case "spin": return `The camera stays at the same point in the air and turns around its own vertical axis, panning to the ${dir} through about 180 degrees, so the view sweeps across the surroundings. The camera does not travel, and nothing in the scene moves or turns; what comes into view is the rest of the same place, in the same style, light and weather.`;
    case "flyby": return `The camera glides sideways to the ${dir} past ${t}, at the same height and distance, like a tracking shot on a rail: ${t} slides across the frame while the background moves more slowly behind it.${m.text ? ` In the user's words: «${m.text}».` : ""}`;
    case "along": return `The camera flies forward along ${m.text ? `the route the user described («${m.text}»)` : "the street, path or shore in the photo"}${m.low ? ", skimming just above the ground or water" : ""}, steady and continuous; what lies ahead comes closer and new parts of the place appear naturally.`;
    case "custom": return `The camera does this, in the user's words (any language): «${m.text ?? ""}».`;
    case "from_above": return `The camera descends from high above and flies in toward ${t}.`;
    case "from_space": return `The camera dives from orbit down toward ${t}.`;
  }
}

/** The key frame a move ends on, described from the view it starts at (image 1). */
function moveEndWords(m: MoveStep, t: string, fromPhoto: boolean, withPhoto: boolean): string {
  const src = fromPhoto ? "Image 1 is the photo." : `Image 1 is the current view of a camera flight.${withPhoto ? " Image 2 is the original photo: people and places look exactly as there." : ""}`;
  const keep = `Everything and everyone keeps exactly the same place, look and pose; only the viewpoint changes. Nothing new is added: no new people, vehicles or animals. Realistic photo, sharp, natural. ${NO_RIG}`;
  const dir = m.dir ?? "right", opp = dir === "right" ? "left" : "right";
  switch (m.move) {
    case "push_in": return `${src} Create the view after the camera has flown straight toward ${t} and stopped much closer: ${t} now fills a large part of the frame, seen from the same side and height; what the camera passed is now behind it. ${keep}`;
    case "pull_back": return `${src} Create the view after the camera has flown about 30 m backward and 15 m up, away from ${t}, still facing it: ${t} is now small in the middle of the frame and much more of the place is visible on every side; what lay outside the edges of image 1 continues naturally in the same style, light and weather. ${keep}`;
    case "orbit": return orbitEndWords(t, m.end === "face" ? "front" : m.end === "front" ? "front-of-object" : "opposite").replace("Image 1 is a photo.", src);
    case "spiral": return `${orbitEndWords(t, m.end === "face" ? "front" : m.end === "front" ? "front-of-object" : "opposite").replace("Image 1 is a photo.", src)} The camera is also about 25 m higher now and looks down at them at a steep angle.`;
    case "rise": return `${src} Create the view after the camera has risen straight up about 60 m, well above the tops of the trees and the roofs, looking out and slightly down over the surroundings to the horizon; the spot it rose from is directly below, at the bottom of the frame. People too small to see. ${keep}`;
    case "descend": return `${src} Create the view after the camera has dropped down low, about 1.5 m above the ground, and come closer to ${t}, looking at it from low down. ${keep}`;
    case "top_down": return `${src} Create the view after the camera has flown up and over ${t} and now points straight down at it from about 30 m above: ${t} is in the center, seen from directly above, with the ground around it like a map. ${keep}`;
    case "spin": return `${src} Create the view from exactly the same spot after the camera has turned around 180 degrees: it now looks the opposite way, at the part of the place that was behind the camera in image 1, in the same style, light and weather. ${keep}`;
    case "flyby": return `${src} Create the view after the camera has moved about 15 m sideways to the ${dir}, at the same height and still facing the same way: ${t} has shifted toward the ${opp} edge of the frame and the next part of the place has come into view on the ${dir}. ${keep}`;
    case "along": return `${src} Create the view after the camera has flown about 40 m forward along ${m.text ? `the route «${m.text}»` : "the street, path or shore"}${m.low ? ", just above the ground or water" : ""}: it is now further along, and what was far away is closer. ${keep}`;
    case "custom": return `${src} Create the view the camera has after this move, in the user's words (any language): «${m.text ?? ""}». ${keep}`;
    case "from_above": case "from_space": return `${src} ${keep}`; // never used: openers end on the photo
  }
}

function movesChain(f: FlightInput, moves: MoveStep[], clips: number[], still: (id: string, prompt: string) => Step, subject: string): Step[] {
  const [main] = f.photos;
  const out: Step[] = [];
  const pace = SPEEDS[f.speed ?? "normal"];
  const withPhoto = (f.setup.stillRefs ?? 2) >= 2;
  // "Main subject" sometimes holds a motion ("вокруг мужчины летит дрон"): not a name for the target then.
  const named = subject && !motionInSubject(subject) ? subject : "";
  const T = (m: MoveStep) => m.target || named || "the person or main subject in the center of the photo";
  let cur = main, k = 0, c = 0;
  const clip = (from: string, to: string | undefined, words: string, travelRound = false): Step => {
    const i = c++;
    const prompt = to
      ? (travelRound
        ? `${words} The shot starts on the first frame and arrives exactly at the last frame: the camera gets there by travelling around them, never through them and never by cutting. ${FLY} ${pace.words}`
        : `${FLY} ${words} ${DIRECT} Arrive exactly at the view of the last frame.`)
      : `${FLY} ${words} As the camera travels, what it reaches continues naturally in the same style, light and weather; no new people, animals or vehicles are added. ${pace.words}`;
    return { id: `fly${i + 1}`, type: "video", model: f.setup.video, prompt, refs: to ? [from, to] : [from], aspectRatio: f.aspect, duration: clips[i] ?? clips[clips.length - 1], resolution: f.setup.resolution, audio: false };
  };
  moves.forEach((m, idx) => {
    const t = T(m), last = idx === moves.length - 1;
    if (m.move === "from_above") {
      out.push(still("sky", `The same place as the reference photo in an aerial view from high above, about 150 m up, looking down at a steep angle at the surroundings; the spot where the reference was taken is in the center of the frame. Same time of day, light and weather; people too small to see at this distance. Realistic aerial photo. ${NO_RIG}`));
      out.push(clip("@sky", main, `The camera descends from high above and flies in toward ${t}, ending on the exact framing of the last frame.`));
      return;
    }
    if (m.move === "from_space") {
      out.push(still("space", "Planet Earth photographed from orbit, the region where the reference photo was taken in the center of the frame, curved horizon, thin blue atmosphere, clouds; day or night to match the reference. Realistic satellite photography. No spacecraft or satellite in the frame."));
      out.push(still("air", `The city or area where the reference photo was taken, seen straight down from about 3 km up, the spot of the reference in the center of the frame. Same time of day and light as the reference. Realistic aerial photo. ${NO_RIG}`));
      out.push(clip("@space", "@air", "The camera zooms straight down from orbit through the atmosphere and clouds toward the center of the frame."));
      out.push(clip("@air", main, `The camera dives down and flies in toward ${t}, ending on the exact framing of the last frame.`));
      return;
    }
    const info = moveInfo(m.move);
    if (!info.pinned && last) { out.push(clip(cur, undefined, moveClipWords(m, t))); return; }
    const id = `k${++k}`;
    const st = still(id, moveEndWords(m, t, cur === main, withPhoto));
    st.refs = cur === main ? [main] : withPhoto ? [cur, main] : [cur];
    out.push(st);
    out.push(clip(cur, `@${id}`, moveClipWords(m, t), m.move === "orbit" || m.move === "spiral"));
    cur = `@${id}`;
  });
  return out;
}

/* ------------------------------------------------------------------ one flight from a few choices (site, CLI, MCP) */

/** The plan name the API stores as the job's model; History titles these "Drone shot". */
export const DRONE_MODEL = "plan:drone-shot";
export const DRONE_MAX_PHOTOS = 4;
/** Free credits are 100: a trial flight stays short enough to fit them. */
export const DRONE_TRIAL_MAX_SECONDS = 8;
/** Flights whose shortest length is over the trial limit (From orbit, 3–4 photos, several moves) need paid credits. */
export const trialTooLong = (range: { min: number }) => range.min > DRONE_TRIAL_MAX_SECONDS;
export type DroneTier = "standard" | "premium";
/** Trial accounts fly on what free credits cover (Qwen-Image stills, Seedance 480p, the join); Premium on Kling 3 Pro 1080p. */
export const DRONE_SETUPS = {
  trial: { still: "qwen-image", video: "seedance-2-fast", resolution: "480p", stillRefs: 1 },
  standard: { still: "nano-banana-2", video: "seedance-2-fast", resolution: "720p", stillRefs: 3 },
  premium: { still: "nano-banana-2", video: "kling-3-pro", resolution: "1080p", stillRefs: 3 },
} as const;

const arc = (cx: number, cy: number, r: number, from: number, to: number): Pt[] =>
  Array.from({ length: 13 }, (_, i) => { const a = from + ((to - from) * i) / 12; return { x: cx + r * Math.cos(a), y: cy + r * 0.55 * Math.sin(a) }; });
export type DronePreset = { id: string; label: string; hint: string; shot: Shot; points?: Pt[]; height?: Height; moves?: MoveStep[] };
/** One-click flights. Route ones fill in a line over the photo; "From above" and "From orbit" end on the photo itself. */
export const DRONE_PRESETS: DronePreset[] = [
  { id: "in", label: "Fly in", hint: "Straight toward the subject", shot: "route", points: [{ x: 0.5, y: 0.92 }, { x: 0.5, y: 0.65 }, { x: 0.5, y: 0.4 }], height: "same" },
  { id: "circle", label: "Circle around", hint: "Goes around the subject in one continuous shot; the person stays as in the photo", shot: "route", points: arc(0.5, 0.55, 0.3, Math.PI * 0.5, Math.PI * 1.5), height: "same" },
  { id: "reveal", label: "Rise & reveal", hint: "Climb straight up above the trees and roofs and show the surroundings", shot: "rise" },
  { id: "top", label: "Over the top", hint: "Fly over and look straight down", shot: "route", points: [{ x: 0.5, y: 0.9 }, { x: 0.5, y: 0.6 }, { x: 0.5, y: 0.45 }], height: "top" },
  { id: "above", label: "From above", hint: "Start high in the sky, come down to your photo", shot: "above" },
  { id: "orbit", label: "From orbit 🌍", hint: "Start with the planet from space, dive down to your photo", shot: "orbit" },
  { id: "pull", label: "Pull back", hint: "Fly back and up: the subject gets small and the place opens up around it", shot: "route", moves: [{ move: "pull_back" }] },
  { id: "spin", label: "Spin 180°", hint: "Stay in the air and turn around: a panorama of the place", shot: "route", moves: [{ move: "spin" }] },
  { id: "spiral", label: "Spiral up", hint: "Go round the subject while climbing", shot: "route", moves: [{ move: "spiral" }] },
  { id: "past", label: "Fly past", hint: "Glide sideways past the subject, like a rail shot", shot: "route", moves: [{ move: "flyby" }] },
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
  /** The words already read into moves (the language model on the server); read by keyword rules when absent. */
  moves?: MoveStep[];
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
export function droneShot(r: DroneRequest, durations: (video: string) => number[]): { plan: { name: string; steps: unknown[] }; clips: number[]; seconds: number; setup: Setup; free: "around" | "words" | null; moves: MoveStep[]; words: string[] } {
  if (!r.photos.length) throw new Error("drone shot needs a photo");
  const photos = r.photos.slice(0, DRONE_MAX_PHOTOS);
  const preset = r.preset ? DRONE_PRESETS.find((p) => p.id === r.preset) : undefined;
  if (r.preset && !preset) throw new Error(`unknown preset ${r.preset}; one of ${DRONE_PRESETS.map((p) => p.id).join(", ")}`);
  // Cleaned once, before anything is decided from them: words that clean down to nothing ("4k") mean no words.
  const words = photos.length > 1 ? [] : flightWords(r.words ?? "");
  // Words become moves (the server's language model, or keyword rules); a move preset is one move.
  const moves = photos.length > 1 ? [] : words.length ? (r.moves?.length ? normalizeMoves(r.moves) : parseMovesRules(words.join("\n"))) : r.points?.length ? [] : preset?.moves ?? normalizeMoves(r.moves ?? []);
  const shot: Shot = photos.length > 1 || words.length || moves.length ? "route" : preset?.shot ?? "route";
  const points = moves.length ? [] : r.points?.length ? r.points : preset?.points ?? (shot === "route" && !words.length && photos.length === 1 ? DRONE_PRESETS[0].points! : []);
  const s = r.trial && (r.tier ?? "standard") === "standard" ? DRONE_SETUPS.trial : DRONE_SETUPS[r.tier ?? "standard"];
  const setup: Setup = { ...s, durations: durations(s.video) };
  const base = { photos, shot, points, words, moves };
  const range = lengthRange(base, setup.durations);
  if (r.trial && trialTooLong(range)) throw new Error(`this flight is at least ${range.min} s and free credits cover flights up to ${DRONE_TRIAL_MAX_SECONDS} s: top up, or pick a shorter flight (one photo, one move)`);
  const max = r.trial ? Math.max(range.min, Math.min(range.max, DRONE_TRIAL_MAX_SECONDS)) : range.max;
  const length = Math.min(Math.max(r.length ?? range.min, range.min), max);
  const built = buildFlightPlan({ photos, shot, points, height: r.height ?? preset?.height ?? "same", words, subject: r.subject ?? "", length, aspect: r.aspect ?? "16:9", setup, speed: r.speed, guide: r.guide, moves });
  return { plan: { name: built.name, steps: built.steps }, clips: built.clips, seconds: finalSeconds(built.clips, r.speed), setup, free: freeFlight(base), moves, words };
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
export { describeMoves, MOVES, parseMovesRules, readInterpretAnswer, INTERPRET_SYSTEM, normalizeMoves, type MoveStep, type MoveId } from "./moves.js";
